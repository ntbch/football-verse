package com.footballverse.news.clustering;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class ClusterScorerTest {
    private final ClusterScorer scorer = new ClusterScorer(new ClusterConfiguration());
    private final RuleBasedEventClassifier eventClassifier = new RuleBasedEventClassifier();
    private final EntityFingerprintExtractor entityExtractor = new EntityFingerprintExtractor();

    @Test
    void classifiesTransferAndInjuryEventsCorrectly() {
        Stream.of(
                new ClassificationCase("Manchester United sign João Neves", "Agreement reached", EventFamily.TRANSFER_OFFICIAL),
                new ClassificationCase("Manchester United reach an agreement for João Neves", "Talks continue", EventFamily.TRANSFER_AGREEMENT),
                new ClassificationCase("Manchester United linked with João Neves", "He has signed for the club", EventFamily.TRANSFER_RUMOUR),
                new ClassificationCase("Manchester United", "João Neves has signed for the club", EventFamily.TRANSFER_OFFICIAL),
                new ClassificationCase("Arsenal star ruled out with knee injury", "Fitness update", EventFamily.INJURY),
                new ClassificationCase("Player injury update", "", EventFamily.INJURY_UPDATE),
                new ClassificationCase(null, null, EventFamily.GENERAL)
        ).forEach(testCase -> assertThat(eventClassifier.classify(testCase.title(), testCase.summary()))
                .as("%s / %s", testCase.title(), testCase.summary())
                .isEqualTo(testCase.expected()));
    }

    private record ClassificationCase(String title, String summary, EventFamily expected) { }

    @Test
    void extractsClubsAndCalculatesEntitySimilarity() {
        var fp1 = entityExtractor.extract("Manchester United lead race for Benfica midfielder", "Talks ongoing");
        var fp2 = entityExtractor.extract("Benfica midfielder targeted by Manchester United", "Offer prepared");

        double similarity = fp1.calculateSimilarity(fp2);
        assertThat(similarity).isGreaterThan(0.5);
    }

    @Test
    void calculatesHybridScoreWithTimeDecay() {
        Instant now = Instant.now();
        double scoreRecent = scorer.calculateHybridScore(0.90, 0.50, 0.80, now, now);
        double scoreOld = scorer.calculateHybridScore(0.90, 0.50, 0.80, now, now.minusSeconds(86400 * 3));

        assertThat(scoreRecent).isGreaterThan(scoreOld);
    }
}
