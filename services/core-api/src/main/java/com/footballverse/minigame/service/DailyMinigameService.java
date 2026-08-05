package com.footballverse.minigame.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.minigame.dto.MinigameDtos;
import com.footballverse.minigame.model.MinigameAttempt;
import com.footballverse.minigame.model.MinigameAttemptMode;
import com.footballverse.minigame.model.MinigameAttemptStatus;
import com.footballverse.minigame.model.MinigameChallenge;
import com.footballverse.minigame.model.MinigamePlayer;
import com.footballverse.minigame.model.MinigameType;
import com.footballverse.minigame.repository.MinigameAttemptRepository;
import com.footballverse.minigame.repository.MinigameChallengeRepository;
import com.footballverse.minigame.repository.MinigamePlayerRepository;
import com.footballverse.user.model.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyMinigameService {
    private static final ZoneId GAME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String MINIGAME_PROVIDER = "ESPN";
    private static final String OFFICIAL_KEY = "official";
    private final MinigamePlayerRepository players;
    private final MinigameChallengeRepository challenges;
    private final MinigameAttemptRepository attempts;
    private final ObjectMapper mapper;

    @Transactional
    public MinigameDtos.DailyResponse daily(UserAccount user) {
        return daily(user, null);
    }

    @Transactional
    public MinigameDtos.DailyResponse daily(UserAccount user, String guestToken) {
        LocalDate date = LocalDate.now(GAME_ZONE);
        String guestHash = guestHash(guestToken);
        return new MinigameDtos.DailyResponse(date.toString(), List.of(game(date, MinigameType.WHO_AM_I, user, guestHash), game(date, MinigameType.GRID, user, guestHash)));
    }

    @Transactional
    public MinigameDtos.AttemptResponse start(UserAccount user, MinigameType type, boolean practice) {
        return start(user, null, type, practice);
    }

    @Transactional
    public MinigameDtos.AttemptResponse start(UserAccount user, String guestToken, MinigameType type, boolean practice) {
        if (user == null && practice) throw new BadRequestException("Sign in before starting practice.");
        String guestHash = guestHash(guestToken);
        if (user == null && guestHash == null) throw new BadRequestException("A guest token is required.");
        LocalDate date = LocalDate.now(GAME_ZONE);
        MinigameChallenge challenge = challenge(date, type)
                .orElseThrow(() -> new ResourceNotFoundException("Today's game is being prepared. Please try again shortly."));
        if (!practice && type == MinigameType.GRID) {
            MinigameChallenge evidence = challenge(date, MinigameType.WHO_AM_I)
                    .orElseThrow(() -> new ResourceNotFoundException("Today's evidence room is being prepared. Please try again shortly."));
            MinigameAttempt evidenceAttempt = existingAttempt(user, guestHash, evidence.getId(), OFFICIAL_KEY)
                    .orElseThrow(() -> new BadRequestException("Finish Who Am I? before opening Scout Board."));
            if (hasExpired(evidenceAttempt)) {
                expireIfNeeded(evidenceAttempt);
                throw new BadRequestException("Your daily run has expired.");
            }
            if (evidenceAttempt.getStatus() == MinigameAttemptStatus.ACTIVE) throw new BadRequestException("Finish Who Am I? before opening Scout Board.");
        }
        Optional<MinigameAttempt> official = existingAttempt(user, guestHash, challenge.getId(), OFFICIAL_KEY);
        if (!practice && official.isPresent()) {
            expireIfNeeded(official.get());
            return response(official.get());
        }
        if (practice && (official.isEmpty() || official.get().getStatus() == MinigameAttemptStatus.ACTIVE)) {
            throw new BadRequestException("Finish your official attempt before starting practice.");
        }
        if (!practice && user != null) {
            attempts.insertOfficialIfAbsent(user.getId(), challenge.getId(), write(AttemptState.empty()), Instant.now());
            return response(attempts.findByUserIdAndChallengeIdAndAttemptKey(user.getId(), challenge.getId(), OFFICIAL_KEY)
                    .orElseThrow(() -> new IllegalStateException("Could not start official minigame attempt.")));
        }
        MinigameAttempt attempt = new MinigameAttempt();
        attempt.setUser(user);
        attempt.setGuestTokenHash(guestHash);
        attempt.setChallenge(challenge);
        attempt.setAttemptKey(practice ? "practice-" + UUID.randomUUID() : OFFICIAL_KEY);
        attempt.setMode(practice ? MinigameAttemptMode.PRACTICE : MinigameAttemptMode.OFFICIAL);
        attempt.setStatePayload(write(AttemptState.empty()));
        return response(attempts.saveAndFlush(attempt));
    }

    @Transactional
    public MinigameDtos.AttemptResponse reveal(UserAccount user, Long attemptId, int version) { return reveal(user, null, attemptId, version); }

    @Transactional
    public MinigameDtos.AttemptResponse reveal(UserAccount user, String guestToken, Long attemptId, int version) {
        MinigameAttempt attempt = activeAttempt(user, guestHash(guestToken), attemptId, version);
        if (attempt.getChallenge().getGameType() != MinigameType.WHO_AM_I) throw new BadRequestException("Only Who Am I? has revealable clues.");
        if (attempt.getRevealedClues() >= 3) throw new BadRequestException("All optional clues are already visible.");
        attempt.setRevealedClues(attempt.getRevealedClues() + 1);
        touch(attempt);
        return response(attempts.saveAndFlush(attempt));
    }

    @Transactional
    public MinigameDtos.AttemptResponse guess(UserAccount user, Long attemptId, MinigameDtos.GuessRequest request) { return guess(user, null, attemptId, request); }

    @Transactional
    public MinigameDtos.AttemptResponse guess(UserAccount user, String guestToken, Long attemptId, MinigameDtos.GuessRequest request) {
        MinigameAttempt attempt = activeAttempt(user, guestHash(guestToken), attemptId, request.version());
        MinigamePlayer player = players.findById(request.playerId()).orElseThrow(() -> new BadRequestException("Choose a player from the suggestions."));
        if (!MINIGAME_PROVIDER.equals(player.getProvider())) throw new BadRequestException("Choose a player from the suggestions.");
        return attempt.getChallenge().getGameType() == MinigameType.WHO_AM_I
                ? whoAmIGuess(attempt, player) : gridGuess(attempt, player, request.cell());
    }

    @Transactional(readOnly = true)
    public List<MinigameDtos.PlayerOption> searchPlayers(String query) {
        String normalized = normalize(query);
        if (normalized.length() < 2) return List.of();
        return players.findByProviderAndNormalizedNameContainingOrderByNameAsc(MINIGAME_PROVIDER, normalized, PageRequest.of(0, 8)).stream()
                .map(player -> new MinigameDtos.PlayerOption(player.getId(), player.getName())).toList();
    }

    @Transactional(readOnly = true)
    public MinigameDtos.LeaderboardResponse leaderboard(String requestedScope, UserAccount user) {
        String scope = requestedScope == null ? "combined" : requestedScope.toLowerCase(Locale.ROOT);
        LocalDate date = LocalDate.now(GAME_ZONE);
        List<Ranked> ranked = switch (scope) {
            case "who-am-i" -> ranksFor(challenges.findByPlayDateAndGameType(date, MinigameType.WHO_AM_I).orElse(null));
            case "grid" -> ranksFor(challenges.findByPlayDateAndGameType(date, MinigameType.GRID).orElse(null));
            case "combined" -> combinedRanks(date);
            default -> throw new BadRequestException("Unsupported leaderboard scope.");
        };
        Integer yourRank = user == null ? null : rankOf(ranked, user.getId());
        List<MinigameDtos.LeaderboardEntry> entries = ranked.stream().limit(100).map(rank -> new MinigameDtos.LeaderboardEntry(
                rank.rank(), rank.username(), rank.username(), null, rank.score(), rank.completedAt())).toList();
        return new MinigameDtos.LeaderboardResponse(scope, entries, yourRank);
    }

    @Transactional
    public void ensureBuffer() {
        LocalDate first = LocalDate.now(GAME_ZONE);
        for (int offset = 0; offset < 7; offset++) for (MinigameType type : MinigameType.values()) challenge(first.plusDays(offset), type);
    }

    @Transactional
    public void claim(UserAccount user, String guestToken) {
        String guestHash = guestHash(guestToken);
        if (guestHash == null) return;
        for (MinigameAttempt attempt : attempts.findByGuestTokenHash(guestHash)) {
            if (existingAttempt(user, null, attempt.getChallenge().getId(), attempt.getAttemptKey()).isPresent()) continue;
            attempt.setUser(user);
            attempt.setGuestTokenHash(null);
            attempts.save(attempt);
        }
    }

    private MinigameDtos.GameResponse game(LocalDate date, MinigameType type, UserAccount user, String guestHash) {
        Optional<MinigameChallenge> maybeChallenge = challenges.findByPlayDateAndGameType(date, type);
        if (maybeChallenge.isEmpty()) return new MinigameDtos.GameResponse(type, false, null, Map.of(), null);
        MinigameChallenge challenge = maybeChallenge.get();
        MinigameDtos.AttemptResponse attempt = existingAttempt(user, guestHash, challenge.getId(), OFFICIAL_KEY)
                .map(existing -> { expireIfNeeded(existing); return response(existing); }).orElse(null);
        return new MinigameDtos.GameResponse(type, true, challenge.getId(), map(challenge.getPublicPayload()), attempt);
    }

    private Optional<MinigameChallenge> challenge(LocalDate date, MinigameType type) {
        Optional<MinigameChallenge> existing = challenges.findByPlayDateAndGameType(date, type);
        if (existing.isPresent()) return existing;
        Optional<ChallengePayload> payload = type == MinigameType.WHO_AM_I ? createWhoAmI(date) : createGrid();
        if (payload.isEmpty()) return Optional.empty();
        challenges.insertIfAbsent(date, type.name(), write(payload.get().publicPayload()), write(payload.get().answerPayload()), Instant.now());
        return challenges.findByPlayDateAndGameType(date, type);
    }

    private Optional<ChallengePayload> createWhoAmI(LocalDate date) {
        List<MinigamePlayer> candidates = players.findByProvider(MINIGAME_PROVIDER).stream().filter(this::whoEligible).sorted(Comparator.comparing(MinigamePlayer::getProviderPlayerId)).toList();
        if (candidates.isEmpty()) return Optional.empty();
        MinigamePlayer player = candidates.get(Math.floorMod(date.hashCode(), candidates.size()));
        List<String> clubs = clubs(player);
        List<String> clues = List.of(
                "I represent " + player.getNationality() + " and play as a " + player.getPosition() + ".",
                "My career has included " + clubs.get(0) + " and " + clubs.get(1) + ".",
                "My current league season is " + player.getSeasonLabel() + ".",
                seasonClue(player),
                "I have " + player.getTrophyCount() + " recorded trophy wins.",
                "I have played for " + clubs.size() + " clubs in this catalog."
        );
        if (clues.stream().anyMatch(clue -> normalize(clue).contains(player.getNormalizedName()))) return Optional.empty();
        Map<String, Object> publicPayload = Map.of("kind", "who-am-i", "maxGuesses", 3, "initialClues", 2, "clues", clues.subList(0, 5));
        Map<String, Object> comparison = Map.of(
                "nationality", player.getNationality(), "position", player.getPosition(), "currentClub", optional(player.getCurrentClub()),
                "currentLeague", optional(player.getCurrentLeague()), "birthYear", optional(player.getBirthYear()),
                "careerClubCount", clubs.size(), "trophyCount", player.getTrophyCount());
        Map<String, Object> answer = Map.of("answerId", player.getId(), "answerName", player.getName(), "comparison", comparison);
        return Optional.of(new ChallengePayload(publicPayload, answer));
    }

    private Optional<ChallengePayload> createGrid() {
        List<MinigamePlayer> catalog = players.findByProvider(MINIGAME_PROVIDER).stream().filter(this::gridEligible).toList();
        Map<String, Map<String, List<Long>>> byCountryClub = new HashMap<>();
        for (MinigamePlayer player : catalog) for (String club : clubs(player))
            byCountryClub.computeIfAbsent(player.getNationality(), ignored -> new HashMap<>())
                    .computeIfAbsent(club, ignored -> new ArrayList<>()).add(player.getId());
        List<String> countries = byCountryClub.keySet().stream().sorted().toList();
        for (int a = 0; a < countries.size(); a++) for (int b = a + 1; b < countries.size(); b++) for (int c = b + 1; c < countries.size(); c++)
            {
                List<String> rows = List.of(countries.get(a), countries.get(b), countries.get(c));
                Set<String> commonClubs = new HashSet<>(byCountryClub.get(rows.get(0)).keySet());
                commonClubs.retainAll(byCountryClub.get(rows.get(1)).keySet());
                commonClubs.retainAll(byCountryClub.get(rows.get(2)).keySet());
                List<String> clubs = commonClubs.stream().sorted().toList();
                for (int x = 0; x < clubs.size(); x++) for (int y = x + 1; y < clubs.size(); y++) for (int z = y + 1; z < clubs.size(); z++) {
                    List<String> columns = List.of(clubs.get(x), clubs.get(y), clubs.get(z));
                    Map<String, List<Long>> valid = new LinkedHashMap<>();
                    for (String row : rows) for (String column : columns)
                        valid.put(cell(row, column), byCountryClub.get(row).get(column).stream().limit(40).toList());
                if (valid.size() == 9 && hasDistinctGridSolution(valid)) {
                    return Optional.of(new ChallengePayload(Map.of("kind", "grid", "rows", rows, "columns", columns, "maxGuesses", 9),
                            Map.of("validByCell", valid)));
                }
            }
            }
        return Optional.empty();
    }

    public static boolean hasDistinctGridSolution(Map<String, List<Long>> valid) {
        return solve(new ArrayList<>(valid.entrySet()), 0, new HashSet<>(), new HashMap<>());
    }

    private static boolean solve(List<Map.Entry<String, List<Long>>> entries, int index, Set<Long> used, Map<String, Long> solution) {
        if (index == entries.size()) return true;
        Map.Entry<String, List<Long>> current = entries.get(index);
        for (Long candidate : current.getValue()) if (used.add(candidate)) {
            solution.put(current.getKey(), candidate);
            if (solve(entries, index + 1, used, solution)) return true;
            solution.remove(current.getKey()); used.remove(candidate);
        }
        return false;
    }

    private MinigameDtos.AttemptResponse whoAmIGuess(MinigameAttempt attempt, MinigamePlayer player) {
        AttemptState state = state(attempt);
        if (state.guesses().stream().anyMatch(guess -> guess.playerId() == player.getId())) return response(attempt);
        Map<String, Object> answer = map(attempt.getChallenge().getAnswerPayload());
        long answerId = ((Number) answer.get("answerId")).longValue();
        List<GuessState> guesses = new ArrayList<>(state.guesses());
        if (player.getId().equals(answerId)) {
            guesses.add(new GuessState(player.getId(), player.getName(), true, Map.of()));
            attempt.setStatus(MinigameAttemptStatus.WON);
            attempt.setScore(whoAmIScore(attempt.getRevealedClues(), attempt.getWrongGuesses()));
            attempt.setCompletedAt(Instant.now());
        } else {
            guesses.add(new GuessState(player.getId(), player.getName(), false, comparison(player, map(answer.get("comparison")))));
            attempt.setWrongGuesses(attempt.getWrongGuesses() + 1);
            if (attempt.getWrongGuesses() >= 3) { attempt.setStatus(MinigameAttemptStatus.LOST); attempt.setCompletedAt(Instant.now()); }
        }
        attempt.setStatePayload(write(new AttemptState(guesses, state.gridCells()))); touch(attempt);
        return response(attempts.saveAndFlush(attempt));
    }

    private MinigameDtos.AttemptResponse gridGuess(MinigameAttempt attempt, MinigamePlayer player, String cell) {
        if (cell == null || cell.isBlank()) throw new BadRequestException("Choose a grid cell.");
        AttemptState state = state(attempt);
        if (state.gridCells().containsKey(cell)) return response(attempt);
        Map<String, Object> answer = map(attempt.getChallenge().getAnswerPayload());
        Map<String, List<Integer>> valid = mapper.convertValue(answer.get("validByCell"), new TypeReference<>() { });
        List<Integer> validIds = valid.get(cell);
        if (validIds == null) throw new BadRequestException("That cell is not part of today's grid.");
        boolean alreadyUsed = state.gridCells().values().stream().anyMatch(entry -> entry.playerId() == player.getId());
        boolean correct = !alreadyUsed && validIds.stream().anyMatch(id -> id.longValue() == player.getId());
        Map<String, GridCell> grid = new LinkedHashMap<>(state.gridCells());
        grid.put(cell, new GridCell(player.getId(), player.getName(), correct));
        if (correct) attempt.setScore(attempt.getScore() + 5);
        if (grid.size() == 9) { attempt.setStatus(attempt.getScore() == 45 ? MinigameAttemptStatus.WON : MinigameAttemptStatus.LOST); attempt.setCompletedAt(Instant.now()); }
        attempt.setStatePayload(write(new AttemptState(state.guesses(), grid))); touch(attempt);
        return response(attempts.saveAndFlush(attempt));
    }

    private List<Ranked> ranksFor(MinigameChallenge challenge) {
        if (challenge == null) return List.of();
        return attempts.completed(challenge.getId(), MinigameAttemptMode.OFFICIAL, PageRequest.of(0, 10_000)).stream()
                .map(attempt -> new Ranked(attempt.getUser().getId(), attempt.getUser().getUsername(), attempt.getScore(), attempt.getCompletedAt(), 0, 0))
                .sorted(rankOrder()).collect(Collectors.collectingAndThen(Collectors.toList(), this::withRanks));
    }

    private List<Ranked> combinedRanks(LocalDate date) {
        List<Long> ids = List.of(MinigameType.WHO_AM_I, MinigameType.GRID).stream()
                .map(type -> challenges.findByPlayDateAndGameType(date, type).map(MinigameChallenge::getId)).flatMap(Optional::stream).toList();
        if (ids.isEmpty()) return List.of();
        Map<Long, List<MinigameAttempt>> byUser = attempts.completedForChallenges(ids, MinigameAttemptMode.OFFICIAL).stream()
                .collect(Collectors.groupingBy(attempt -> attempt.getUser().getId()));
        List<Ranked> totals = byUser.values().stream().filter(entries -> entries.size() == ids.size()).map(entries -> {
            MinigameAttempt last = entries.stream().max(Comparator.comparing(MinigameAttempt::getCompletedAt)).orElseThrow();
            Instant started = entries.stream().map(MinigameAttempt::getCreatedAt).min(Comparator.naturalOrder()).orElse(last.getCreatedAt());
            long duration = Math.max(0, Duration.between(started, last.getCompletedAt()).toMillis());
            return new Ranked(last.getUser().getId(), last.getUser().getUsername(), entries.stream().mapToInt(MinigameAttempt::getScore).sum(), last.getCompletedAt(), duration, 0);
        }).toList();
        return withRanks(totals.stream().sorted(rankOrder()).toList());
    }

    private Comparator<Ranked> rankOrder() { return Comparator.comparingInt(Ranked::score).reversed().thenComparingLong(Ranked::durationMillis).thenComparingLong(Ranked::userId); }
    private List<Ranked> withRanks(List<Ranked> entries) {
        List<Ranked> ranked = new ArrayList<>();
        for (int index = 0; index < entries.size(); index++) {
            Ranked entry = entries.get(index);
            ranked.add(new Ranked(entry.userId(), entry.username(), entry.score(), entry.completedAt(), entry.durationMillis(), index + 1));
        }
        return ranked;
    }
    private Integer rankOf(List<Ranked> ranked, Long userId) { return ranked.stream().filter(item -> item.userId() == userId).map(Ranked::rank).findFirst().orElse(null); }
    private Optional<MinigameAttempt> existingAttempt(UserAccount user, String guestHash, Long challengeId, String key) {
        return user != null ? attempts.findByUserIdAndChallengeIdAndAttemptKey(user.getId(), challengeId, key)
                : guestHash == null ? Optional.empty() : attempts.findByGuestTokenHashAndChallengeIdAndAttemptKey(guestHash, challengeId, key);
    }
    private MinigameAttempt activeAttempt(UserAccount user, String guestHash, Long id, int version) {
        MinigameAttempt attempt = user != null ? attempts.findByIdAndUserId(id, user.getId()).orElseThrow(() -> new ResourceNotFoundException("Game attempt not found."))
                : guestHash == null ? null : attempts.findByIdAndGuestTokenHash(id, guestHash).orElseThrow(() -> new ResourceNotFoundException("Game attempt not found."));
        if (attempt == null) throw new ResourceNotFoundException("Game attempt not found.");
        expireIfNeeded(attempt);
        if (attempt.getStatus() != MinigameAttemptStatus.ACTIVE) throw new BadRequestException("This attempt is complete.");
        if (attempt.getVersion() != version) throw new BadRequestException("Game state changed. Refresh and try again.");
        return attempt;
    }
    private boolean hasExpired(MinigameAttempt attempt) {
        Instant startedAt = runStartedAt(attempt);
        return attempt.getMode() == MinigameAttemptMode.OFFICIAL && startedAt != null && !startedAt.plus(Duration.ofMinutes(5)).isAfter(Instant.now());
    }
    private void expireIfNeeded(MinigameAttempt attempt) {
        if (attempt.getStatus() == MinigameAttemptStatus.ACTIVE && hasExpired(attempt)) {
            attempt.setStatus(MinigameAttemptStatus.LOST);
            attempt.setCompletedAt(Instant.now());
            touch(attempt);
            attempts.saveAndFlush(attempt);
        }
    }
    private Instant runStartedAt(MinigameAttempt attempt) {
        if (attempt.getChallenge().getGameType() != MinigameType.GRID) return attempt.getCreatedAt();
        return challenge(attempt.getChallenge().getPlayDate(), MinigameType.WHO_AM_I)
                .flatMap(evidence -> existingAttempt(attempt.getUser(), attempt.getGuestTokenHash(), evidence.getId(), OFFICIAL_KEY))
                .map(MinigameAttempt::getCreatedAt).orElse(attempt.getCreatedAt());
    }
    private MinigameDtos.AttemptResponse response(MinigameAttempt attempt) { return new MinigameDtos.AttemptResponse(attempt.getId(), attempt.getMode(), attempt.getStatus(), Math.toIntExact(attempt.getVersion()), attempt.getWrongGuesses(), attempt.getRevealedClues(), attempt.getScore(), publicState(state(attempt)), result(attempt), runStartedAt(attempt), attempt.getCompletedAt()); }
    private Map<String, Object> result(MinigameAttempt attempt) {
        if (attempt.getStatus() == MinigameAttemptStatus.ACTIVE || attempt.getChallenge().getGameType() != MinigameType.WHO_AM_I) return Map.of();
        Map<String, Object> answer = map(attempt.getChallenge().getAnswerPayload());
        return Map.of("answerName", answer.get("answerName"), "comparison", answer.get("comparison"));
    }
    private Map<String, Object> publicState(AttemptState state) { return Map.of("guesses", state.guesses(), "gridCells", state.gridCells()); }
    private AttemptState state(MinigameAttempt attempt) { try { return mapper.readValue(attempt.getStatePayload(), AttemptState.class); } catch (Exception exception) { throw new IllegalStateException("Invalid minigame attempt state", exception); } }
    private Map<String, Object> map(String payload) { try { return mapper.readValue(payload, new TypeReference<>() { }); } catch (Exception exception) { throw new IllegalStateException("Invalid minigame payload", exception); } }
    private Map<String, Object> map(Object payload) { return mapper.convertValue(payload, new TypeReference<>() { }); }
    private String write(Object value) { try { return mapper.writeValueAsString(value); } catch (Exception exception) { throw new IllegalStateException("Could not serialize minigame state", exception); } }
    private List<String> clubs(MinigamePlayer player) { try { return mapper.readValue(player.getCareerClubs(), new TypeReference<>() { }); } catch (Exception ignored) { return List.of(); } }
    private String seasonClue(MinigamePlayer player) {
        if (player.getSeasonAppearances() == null || player.getSeasonGoals() == null || player.getSeasonAssists() == null)
            return "I am registered with " + optional(player.getCurrentClub()) + " in that season.";
        return "That season I made " + player.getSeasonAppearances() + " appearances, scored " + player.getSeasonGoals() + " goals and made " + player.getSeasonAssists() + " assists.";
    }
    private boolean whoEligible(MinigamePlayer player) { return has(player.getNationality()) && has(player.getPosition()) && clubs(player).size() >= 2 && has(player.getSeasonLabel()) && player.getTrophyCount() > 0; }
    private boolean gridEligible(MinigamePlayer player) { return has(player.getNationality()) && !clubs(player).isEmpty(); }
    private boolean has(String value) { return value != null && !value.isBlank(); }
    private Object optional(Object value) { return value == null ? "Unknown" : value; }
    private Map<String, String> comparison(MinigamePlayer guess, Map<String, Object> answer) {
        return Map.of(
                "nationality", equalsFact(guess.getNationality(), answer.get("nationality")),
                "position", equalsFact(guess.getPosition(), answer.get("position")),
                "club", equalsFact(guess.getCurrentClub(), answer.get("currentClub")),
                "league", equalsFact(guess.getCurrentLeague(), answer.get("currentLeague")),
                "birthYear", direction(guess.getBirthYear(), answer.get("birthYear")),
                "careerClubs", direction(clubs(guess).size(), answer.get("careerClubCount")),
                "trophies", direction(guess.getTrophyCount(), answer.get("trophyCount"))
        );
    }
    private String equalsFact(Object actual, Object target) { return actual != null && actual.toString().equalsIgnoreCase(String.valueOf(target)) ? "match" : "different"; }
    private String direction(Integer actual, Object target) {
        if (!(target instanceof Number number) || actual == null) return "unknown";
        return actual.intValue() == number.intValue() ? "match" : actual.intValue() < number.intValue() ? "higher" : "lower";
    }
    private String cell(String row, String column) { return row + "|" + column; }
    private void touch(MinigameAttempt attempt) { attempt.setUpdatedAt(Instant.now()); }
    public static String normalize(String value) { return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim(); }
    private String guestHash(String token) {
        if (token == null || token.isBlank()) return null;
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception exception) { throw new IllegalStateException("Could not secure guest token", exception); }
    }
    public static int whoAmIScore(int revealedClues, int wrongGuesses) { return Math.max(0, 30 - 5 * revealedClues - 5 * wrongGuesses); }

    private record ChallengePayload(Map<String, Object> publicPayload, Map<String, Object> answerPayload) { }
    private record GridCell(long playerId, String playerName, boolean correct) { }
    private record GuessState(long playerId, String playerName, boolean correct, Map<String, String> comparison) { }
    private record AttemptState(List<GuessState> guesses, Map<String, GridCell> gridCells) {
        static AttemptState empty() { return new AttemptState(List.of(), Map.of()); }
    }
    private record Ranked(long userId, String username, int score, Instant completedAt, long durationMillis, int rank) { }
}
