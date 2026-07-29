package com.footballverse.news.clustering;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class ClusterScorerTest {
    private final ClusterScorer scorer = new ClusterScorer(new ClusterConfiguration());
    private final RuleBasedEventClassifier eventClassifier = new RuleBasedEventClassifier();
    private final EntityFingerprintExtractor entityExtractor = new EntityFingerprintExtractor();

    @Test
    void classifiesTransferAndInjuryEventsCorrectly() {
        assertThat(eventClassifier.classify("Manchester United sign João Neves", "Agreement reached"))
                .isEqualTo(EventFamily.TRANSFER_OFFICIAL);

        assertThat(eventClassifier.classify("Arsenal star ruled out with knee injury", "Fitness update"))
                .isEqualTo(EventFamily.INJURY);
    }

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
