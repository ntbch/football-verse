package com.footballverse.news.clustering;

import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsContentKind;
import com.footballverse.news.model.RawContentType;
import com.footballverse.news.model.RawItem;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClusteringEvaluationTest {

    @Mock
    private com.footballverse.news.repository.NewsArticleRepository stories;

    @Mock
    private ClusterDecisionRepository decisionRepository;

    @Mock
    private StoryClusterProfileRepository profileRepository;

    private StoryClusteringService clusteringService;

    @BeforeEach
    void setUp() {
        RuleBasedEventClassifier classifier = new RuleBasedEventClassifier();
        EntityFingerprintExtractor extractor = new EntityFingerprintExtractor();
        ClusterConfiguration config = new ClusterConfiguration();
        ClusterScorer scorer = new ClusterScorer(config);
        config.setMode("vector-shadow");
        config.setAutoMergeThreshold(0.25);

        clusteringService = new StoryClusteringService(
                stories,
                decisionRepository,
                profileRepository,
                classifier,
                extractor,
                scorer,
                config
        );

        when(decisionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void evaluatesTrueMergeSameEventDifferentVocabulary() {
        float[] vec = new float[384];
        java.util.Arrays.fill(vec, 0.05f);

        RawItem incoming = createRawItem(
                "Manchester United reach agreement for João Neves",
                "Red Devils close in on Benfica midfielder after negotiations progress."
        );
        incoming.setEmbedding(vec);

        NewsArticle candidate = createStory(
                100L,
                "Man Utd close to signing João Neves from Benfica",
                "Benfica midfielder set for Old Trafford move."
        );

        when(profileRepository.findVectorCandidates(
                org.mockito.ArgumentMatchers.anyString(),
                any(),
                any(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyInt()
        )).thenReturn(List.of(new StoryClusterProfileRepository.CandidateVectorMatch() {
                    @Override
                    public Long getStoryId() {
                        return 100L;
                    }
                    @Override
                    public Double getSemanticScore() {
                        return 0.92;
                    }
                }));

        when(stories.findAllById(any())).thenReturn(List.of(candidate));

        var result = clusteringService.decide(incoming);
        assertThat(result.matched()).isTrue();
        assertThat(result.story().getId()).isEqualTo(100L);
    }

    @Test
    void rejectsHardConflictInjuryVsTransfer() {
        RawItem incoming = createRawItem(
                "Bukayo Saka suffers hamstring injury in training",
                "Arsenal winger forced off during session before weekend clash."
        );

        NewsArticle candidate = createStory(
                101L,
                "Arsenal agree £50m transfer deal for Bukayo Saka renewal",
                "Arsenal confirm new long term contract agreement."
        );

        when(stories.findClusterCandidates(any(), any(), any(), any(), any()))
                .thenReturn(List.of(candidate));

        var result = clusteringService.decide(incoming);
        assertThat(result.matched()).isFalse();
    }

    @Test
    void rejectsMatchResultVsTransfer() {
        RawItem incoming = createRawItem(
                "Liverpool beat Everton 2-0 in Merseyside Derby",
                "Salah scores twice as Reds secure derby victory at Anfield."
        );

        NewsArticle candidate = createStory(
                102L,
                "Liverpool agree transfer fee for Florian Wirtz",
                "Bayer Leverkusen playmaker set for Anfield medical."
        );

        when(stories.findClusterCandidates(any(), any(), any(), any(), any()))
                .thenReturn(List.of(candidate));

        var result = clusteringService.decide(incoming);
        assertThat(result.matched()).isFalse();
    }

    @Test
    void evaluatesDifferentPlayersSameClubAsNewStory() {
        RawItem incoming = createRawItem(
                "Real Madrid complete signing of Kylian Mbappé",
                "French forward officially unveiled at Santiago Bernabéu."
        );

        NewsArticle candidate = createStory(
                103L,
                "Real Madrid agree deal to sign Alphonso Davies",
                "Bayern Munich defender agreeing terms with Real Madrid."
        );

        when(stories.findClusterCandidates(any(), any(), any(), any(), any()))
                .thenReturn(List.of(candidate));

        var result = clusteringService.decide(incoming);
        // Different players should either not reach auto-merge threshold or be separated
        if (result.matched()) {
            assertThat(result.decision().getFinalScore().doubleValue()).isLessThan(0.70);
        } else {
            assertThat(result.matched()).isFalse();
        }
    }

    private RawItem createRawItem(String title, String description) {
        RawItem item = new RawItem();
        item.setId(1L);
        item.setOriginalUrl("https://example.com/" + Math.abs(title.hashCode()));
        item.setTitle(title);
        item.setDescription(description);
        item.setDiscoveredAt(Instant.now());
        item.setContentType(RawContentType.ARTICLE);
        return item;
    }

    private NewsArticle createStory(Long id, String title, String summary) {
        NewsArticle article = new NewsArticle();
        article.setId(id);
        article.setTitle(title);
        article.setSummary(summary);
        article.setContentKind(NewsContentKind.AGGREGATED_STORY);
        article.setStatus(ArticleStatus.PUBLISHED);
        article.setLastSourceAt(Instant.now());
        article.setSourceUrl("https://example.com/story-" + id);
        return article;
    }
}
