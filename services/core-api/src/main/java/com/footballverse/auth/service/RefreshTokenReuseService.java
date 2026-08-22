package com.footballverse.auth.service;

import com.footballverse.auth.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Records refresh-token theft signals. Runs in its own committed transaction
 * because callers reject the request with an exception afterwards, which
 * would otherwise roll the family-wide revocation back.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenReuseService {
    private final RefreshTokenRepository refreshTokens;

    /**
     * Revokes every still-active token of the compromised session family.
     * Commits independently of the caller's transaction so the revocation
     * survives the rejection that follows.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int revokeActiveFamilyTokens(UUID familyId) {
        int revoked = refreshTokens.revokeActiveByFamilyId(familyId, java.time.Instant.now());
        if (revoked > 0) {
            log.warn("Refresh token reuse detected; revoked {} active session(s) of family {}", revoked, familyId);
        }
        return revoked;
    }
}
