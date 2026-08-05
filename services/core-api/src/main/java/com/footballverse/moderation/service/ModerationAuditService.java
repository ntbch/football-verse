package com.footballverse.moderation.service;

import com.footballverse.common.pagination.PageResponse;
import com.footballverse.moderation.dto.ModerationAuditLogResponse;
import com.footballverse.moderation.model.ModerationAuditLog;
import com.footballverse.moderation.repository.ModerationAuditLogRepository;
import com.footballverse.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ModerationAuditService {
    private final ModerationAuditLogRepository logs;
    private final CurrentUser currentUser;

    @Transactional
    public void record(String action, String targetType, Long targetId, String reason) {
        logs.save(new ModerationAuditLog(currentUser.get().getId(), action, targetType, targetId, reason));
    }

    @Transactional(readOnly = true)
    public PageResponse<ModerationAuditLogResponse> page(int page, int size) {
        var result = logs.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        return PageResponse.from(result.map(log -> new ModerationAuditLogResponse(
                log.getId(), log.getActorId(), log.getAction(), log.getTargetType(), log.getTargetId(), log.getReason(), log.getCreatedAt()
        )));
    }
}
