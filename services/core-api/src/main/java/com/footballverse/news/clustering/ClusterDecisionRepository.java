package com.footballverse.news.clustering;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ClusterDecisionRepository extends JpaRepository<ClusterDecision, Long> {
    List<ClusterDecision> findByRawItemId(Long rawItemId);
    List<ClusterDecision> findBySelectedStoryId(Long selectedStoryId);
}
