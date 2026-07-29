package com.footballverse.user.repository;

import com.footballverse.user.model.FollowTargetType;
import com.footballverse.user.model.UserFollowTarget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserFollowTargetRepository extends JpaRepository<UserFollowTarget, Long> {
    List<UserFollowTarget> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<UserFollowTarget> findByUserIdAndTargetTypeAndTargetKey(Long userId, FollowTargetType targetType, String targetKey);
}
