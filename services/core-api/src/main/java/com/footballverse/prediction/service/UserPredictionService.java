package com.footballverse.prediction.service;

import com.footballverse.common.exception.BadRequestException;
import com.footballverse.prediction.dto.FixtureResponse;
import com.footballverse.prediction.dto.PredictionRequest;
import com.footballverse.prediction.dto.PredictionResponse;
import com.footballverse.prediction.model.Fixture;
import com.footballverse.prediction.model.UserPrediction;
import com.footballverse.prediction.repository.FixtureRepository;
import com.footballverse.prediction.repository.UserPredictionRepository;
import com.footballverse.user.model.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserPredictionService {

    private final FixtureRepository fixtureRepo;
    private final UserPredictionRepository predictionRepo;
    private final FixtureService fixtureService;

    @Transactional(readOnly = true)
    public List<FixtureResponse> getFixturesWithPredictions(String leagueSlug, UserAccount currentUser) {
        List<Fixture> fixtures = fixtureRepo.findByLeagueSlugAndStatusOrderByKickoffAsc(leagueSlug, "upcoming");
        if (fixtures.isEmpty()) {
            fixtureService.syncFixtures(leagueSlug);
            fixtures = fixtureRepo.findByLeagueSlugAndStatusOrderByKickoffAsc(leagueSlug, "upcoming");
        }

        Long userId = currentUser != null ? currentUser.getId() : null;
        Map<Long, UserPrediction> predictionByFixtureId = Collections.emptyMap();
        if (userId != null && !fixtures.isEmpty()) {
            List<Long> fixtureIds = fixtures.stream().map(Fixture::getId).collect(Collectors.toList());
            predictionByFixtureId = predictionRepo.findByUserIdAndFixtureIdIn(userId, fixtureIds)
                    .stream()
                    .collect(Collectors.toMap(p -> p.getFixture().getId(), p -> p, (a, b) -> a));
        }

        final Map<Long, UserPrediction> lookup = predictionByFixtureId;
        return fixtures.stream()
                .map(f -> toFixtureResponse(f, lookup.get(f.getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PredictionResponse> myPredictions(Long userId, String leagueSlug) {
        return predictionRepo.findByUserIdAndFixtureLeagueSlug(userId, leagueSlug)
                .stream()
                .map(this::toPredictionResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PredictionResponse submitPrediction(UserAccount user, Long fixtureId, PredictionRequest request) {
        Fixture fixture = fixtureRepo.findById(fixtureId)
                .orElseThrow(() -> new BadRequestException("Fixture not found"));

        if (fixture.getKickoff().isBefore(Instant.now())) {
            throw new BadRequestException("PREDICTION_CLOSED");
        }
        if (!"upcoming".equals(fixture.getStatus())) {
            throw new BadRequestException("PREDICTION_CLOSED");
        }
        if (request.homeScore() != null && (request.homeScore() < 0 || request.homeScore() > 20)) {
            throw new BadRequestException("Invalid home score");
        }
        if (request.awayScore() != null && (request.awayScore() < 0 || request.awayScore() > 20)) {
            throw new BadRequestException("Invalid away score");
        }

        UserPrediction pred = predictionRepo.findByUserIdAndFixtureId(user.getId(), fixtureId)
                .orElseGet(UserPrediction::new);

        if (pred.getId() != null && fixture.isScored()) {
            throw new BadRequestException("Match already scored, cannot edit prediction");
        }

        pred.setUser(user);
        pred.setFixture(fixture);
        pred.setPick(request.pick());
        pred.setHomeScore(request.homeScore());
        pred.setAwayScore(request.awayScore());
        pred.setPickOu25(request.pickOu25());
        pred.setPickBtts(request.pickBtts());
        pred.setPoints(0);
        pred.setCorrect(false);

        predictionRepo.save(pred);
        return toPredictionResponse(pred);
    }

    private FixtureResponse toFixtureResponse(Fixture f, UserPrediction userPred) {
        PredictionResponse predResp = userPred != null ? toPredictionResponse(userPred) : null;

        return new FixtureResponse(
                f.getId(),
                f.getFixtureId(),
                f.getLeagueSlug(),
                f.getRound(),
                f.getHomeTeam(),
                f.getAwayTeam(),
                f.getKickoff().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
                f.getHomeScore(),
                f.getAwayScore(),
                f.getStatus(),
                predResp
        );
    }

    public PredictionResponse toPredictionResponse(UserPrediction p) {
        return new PredictionResponse(
                p.getId(),
                p.getFixture().getId(),
                p.getPick(),
                p.getHomeScore(),
                p.getAwayScore(),
                p.getPoints(),
                p.isCorrect(),
                p.getCorrectOutcome(),
                p.getCorrectExactScore(),
                p.getCorrectOu25(),
                p.getCorrectBtts(),
                p.getPickOu25(),
                p.getPickBtts()
        );
    }
}
