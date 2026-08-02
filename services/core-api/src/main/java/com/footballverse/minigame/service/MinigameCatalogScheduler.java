package com.footballverse.minigame.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.minigame.model.MinigamePlayer;
import com.footballverse.minigame.repository.MinigamePlayerRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@Slf4j
public class MinigameCatalogScheduler {
    private static final String PROVIDER = "ESPN";
    private static final int INITIAL_PLAYER_TARGET = 1_000;
    private static final int REFRESH_PLAYER_LISTS = 8;
    private static final List<League> LEAGUES = List.of(
            new League("Premier League", "eng.1"), new League("La Liga", "esp.1"),
            new League("Serie A", "ita.1"), new League("Bundesliga", "ger.1"), new League("Ligue 1", "fra.1"));
    private final EspnClient espn;
    private final TheSportsDbClient sportsDb;
    private final MinigamePlayerRepository players;
    private final ObjectMapper mapper;
    private final DailyMinigameService games;

    public MinigameCatalogScheduler(EspnClient espn, TheSportsDbClient sportsDb, MinigamePlayerRepository players,
                                    ObjectMapper mapper, DailyMinigameService games) {
        this.espn = espn;
        this.sportsDb = sportsDb;
        this.players = players;
        this.mapper = mapper;
        this.games = games;
    }

    @Scheduled(initialDelay = 30_000, fixedDelay = 120_000)
    public void bootstrap() {
        if (players.countByProvider(PROVIDER) < INITIAL_PLAYER_TARGET) refresh();
        else games.ensureBuffer();
    }

    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    public void refresh() {
        long knownPlayers = players.countByProvider(PROVIDER);
        boolean bootstrap = knownPlayers < INITIAL_PLAYER_TARGET;
        int imported = importPlayers(bootstrap, knownPlayers);
        if (sportsDb.configured() && !sportsDb.rateLimited()) {
            for (MinigamePlayer player : players.findTop20ByProviderOrderByRefreshedAtAsc(PROVIDER)) {
                enrich(player);
                if (sportsDb.rateLimited()) break;
            }
        }
        games.ensureBuffer();
        log.info("ESPN minigame catalog sync imported {} new player records", imported);
    }

    private int importPlayers(boolean bootstrap, long knownPlayers) {
        int imported = 0;
        int playerLists = 0;
        int target = bootstrap ? Math.toIntExact(INITIAL_PLAYER_TARGET - knownPlayers) : Integer.MAX_VALUE;
        for (League league : LEAGUES) {
            JsonNode teams = espn.get("/" + league.code() + "/teams").path("sports").path(0).path("leagues").path(0).path("teams");
            if (!teams.isArray()) continue;
            for (JsonNode entry : teams) {
                if ((!bootstrap && playerLists >= REFRESH_PLAYER_LISTS) || imported >= target) return imported;
                JsonNode team = entry.path("team");
                long teamId = team.path("id").asLong();
                String teamName = team.path("displayName").asText("");
                if (teamId == 0 || teamName.isBlank() || players.countByProviderAndCurrentClub(PROVIDER, teamName) >= 15) continue;
                imported += importRoster(espn.get("/" + league.code() + "/teams/" + teamId + "/roster"), teamName, league.name());
                playerLists++;
            }
        }
        return imported;
    }

    private int importRoster(JsonNode payload, String teamName, String leagueName) {
        JsonNode entries = payload.path("athletes");
        if (!entries.isArray()) return 0;
        int imported = 0;
        for (JsonNode profile : entries) {
            long providerId = profile.path("id").asLong();
            String name = profile.path("displayName").asText("");
            String position = profile.path("position").path("name").asText("");
            if (providerId == 0 || name.isBlank() || position.isBlank()) continue;
            MinigamePlayer player = players.findByProviderAndProviderPlayerId(PROVIDER, providerId).orElseGet(MinigamePlayer::new);
            boolean newPlayer = player.getId() == null;
            player.setProvider(PROVIDER);
            player.setProviderPlayerId(providerId);
            player.setName(name);
            player.setNormalizedName(DailyMinigameService.normalize(name));
            player.setNationality(blankToNull(profile.path("citizenship").asText()));
            player.setPosition(blankToNull(position));
            String birth = profile.path("dateOfBirth").asText("");
            player.setBirthYear(birth.matches("\\d{4}-.*") ? Integer.parseInt(birth.substring(0, 4)) : null);
            player.setCurrentClub(teamName);
            player.setCurrentLeague(leagueName);
            player.setSeasonLabel(leagueName + " " + currentSeason());
            if (player.getCareerClubs().equals("[]")) player.setCareerClubs(json(List.of(teamName)));
            if (newPlayer) player.setRefreshedAt(Instant.EPOCH);
            players.save(player);
            if (newPlayer) imported++;
        }
        return imported;
    }

    private void enrich(MinigamePlayer player) {
        JsonNode match = sportsDb.searchPlayers(player.getName()).path("player");
        JsonNode profile = bestMatch(match, player);
        if (profile == null) {
            player.setRefreshedAt(Instant.now());
            players.save(player);
            return;
        }
        long sportsDbId = profile.path("idPlayer").asLong();
        Set<String> clubs = new LinkedHashSet<>(clubs(player.getCareerClubs()));
        JsonNode formerTeams = sportsDb.get("/lookupformerteams.php?id=" + sportsDbId).path("formerteams");
        if (formerTeams.isArray()) for (JsonNode team : formerTeams) add(clubs, team.path("strFormerTeam").asText());
        add(clubs, player.getCurrentClub());
        player.setCareerClubs(json(clubs));

        JsonNode honours = sportsDb.get("/lookuphonours.php?id=" + sportsDbId).path("honours");
        player.setTrophyCount(honours.isArray() ? honours.size() : 0);
        applyLatestStats(player, sportsDb.get("/lookupplayerstats.php?id=" + sportsDbId).path("playerstats"));
        player.setRefreshedAt(Instant.now());
        players.save(player);
    }

    private JsonNode bestMatch(JsonNode entries, MinigamePlayer player) {
        if (!entries.isArray()) return null;
        return stream(entries).stream().filter(candidate -> DailyMinigameService.normalize(candidate.path("strPlayer").asText()).equals(player.getNormalizedName()))
                .filter(candidate -> player.getNationality() == null || player.getNationality().equalsIgnoreCase(candidate.path("strNationality").asText()))
                .findFirst().orElse(null);
    }

    private List<JsonNode> stream(JsonNode entries) { List<JsonNode> result = new ArrayList<>(); entries.forEach(result::add); return result; }
    private void applyLatestStats(MinigamePlayer player, JsonNode entries) {
        if (!entries.isArray() || entries.isEmpty()) return;
        List<JsonNode> stats = stream(entries);
        String latestSeason = stats.stream().map(item -> item.path("strSeason").asText("")).filter(value -> !value.isBlank()).max(Comparator.naturalOrder()).orElse("");
        if (latestSeason.isBlank()) return;
        List<JsonNode> latest = stats.stream().filter(item -> latestSeason.equals(item.path("strSeason").asText())).toList();
        String league = latest.stream().map(item -> item.path("strLeague").asText("")).filter(value -> !value.isBlank()).findFirst().orElse(player.getCurrentLeague());
        player.setSeasonLabel((league == null ? "Season" : league) + " " + latestSeason);
        player.setSeasonAppearances(statistic(latest, "Appearances"));
        player.setSeasonGoals(statistic(latest, "Goals"));
        player.setSeasonAssists(statistic(latest, "Assists"));
    }

    private Integer statistic(List<JsonNode> stats, String name) {
        return stats.stream().filter(item -> name.equalsIgnoreCase(item.path("strStatistic").asText()))
                .map(item -> integer(item.path("strValue").asText())).filter(value -> value != null).findFirst().orElse(0);
    }
    private String currentSeason() { int year = LocalDate.now().getYear() - (LocalDate.now().getMonthValue() < 7 ? 1 : 0); return year + "/" + (year + 1); }
    private Integer integer(String value) { try { return Integer.parseInt(value); } catch (Exception ignored) { return null; } }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value; }
    private void add(Set<String> values, String value) { if (value != null && !value.isBlank()) values.add(value); }
    private List<String> clubs(String value) { try { return mapper.readValue(value, mapper.getTypeFactory().constructCollectionType(List.class, String.class)); } catch (Exception ignored) { return List.of(); } }
    private String json(Object value) { try { return mapper.writeValueAsString(value); } catch (Exception exception) { throw new IllegalStateException(exception); } }
    private record League(String name, String code) { }
}
