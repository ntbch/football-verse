package com.footballverse.news.repository;

import com.footballverse.news.model.RawItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RawItemRepository extends JpaRepository<RawItem, Long> {
    Optional<RawItem> findByIdentityKey(String identityKey);
    boolean existsByConnectorId(Long connectorId);
}
