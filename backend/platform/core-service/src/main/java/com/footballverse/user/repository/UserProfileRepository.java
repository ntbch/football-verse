package com.footballverse.user.repository;
import com.footballverse.user.model.UserProfile;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    Optional<UserProfile> findByUserId(Long userId);
    List<UserProfile> findByUserIdIn(Collection<Long> userIds);
}
