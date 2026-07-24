package com.footballverse.game.career;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.game.persistence.CareerOperationRequestEntity;
import com.footballverse.game.persistence.CareerOperationRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;
import java.util.function.Supplier;

@Service
public class CareerMutationLedgerService {
    private static final Logger LOG = LoggerFactory.getLogger(CareerMutationLedgerService.class);

    private final CareerOperationRequestRepository requests;
    private final ObjectMapper json;
    private final TransactionTemplate required;
    private final TransactionTemplate requiresNew;

    public CareerMutationLedgerService(CareerOperationRequestRepository requests, ObjectMapper json,
                                       PlatformTransactionManager transactionManager) {
        this.requests = requests;
        this.json = json;
        this.required = new TransactionTemplate(transactionManager);
        this.requiresNew = new TransactionTemplate(transactionManager);
        this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public <T> T execute(Long ownerUserId, UUID careerId, UUID requestId, String action,
                         Class<T> responseType, Supplier<T> operation) {
        if (requestId == null) throw new IllegalArgumentException("X-Request-ID is required");
        reserve(ownerUserId, careerId, requestId, action);
        return required.execute(status -> {
            var stored = requests.lockByRequestId(requestId).orElseThrow();
            verify(stored, ownerUserId, careerId, action);
            if ("COMPLETED".equals(stored.getState())) {
                LOG.info("career_operation replay action={} career={} request={}", action, careerId, requestId);
                return read(stored.getResponseSnapshot(), responseType);
            }
            var response = operation.get();
            stored.complete(write(response));
            requests.saveAndFlush(stored);
            return response;
        });
    }

    public OperationStatus status(Long ownerUserId, UUID careerId, UUID requestId) {
        var stored = requests.findByRequestIdAndOwnerUserId(requestId, ownerUserId).orElse(null);
        if (stored == null || !careerId.equals(stored.getCareerSaveId())) {
            return new OperationStatus(requestId, null, "UNKNOWN", null);
        }
        var response = stored.getResponseSnapshot() == null ? null : readTree(stored.getResponseSnapshot());
        return new OperationStatus(requestId, stored.getAction(), stored.getState(), response);
    }

    private void reserve(Long ownerUserId, UUID careerId, UUID requestId, String action) {
        try {
            requiresNew.executeWithoutResult(status -> {
                var existing = requests.findById(requestId).orElse(null);
                if (existing != null) {
                    verify(existing, ownerUserId, careerId, action);
                    return;
                }
                requests.saveAndFlush(new CareerOperationRequestEntity(requestId, careerId, ownerUserId, action));
            });
        } catch (DataIntegrityViolationException exception) {
            // Concurrent first deliveries can race on the request-id primary key. The
            // winning reservation is authoritative; ownership/action are verified
            // again under the row lock in execute().
            if (!requests.existsById(requestId)) throw exception;
        }
    }

    private static void verify(CareerOperationRequestEntity stored, Long ownerUserId, UUID careerId, String action) {
        if (!ownerUserId.equals(stored.getOwnerUserId()) || !careerId.equals(stored.getCareerSaveId())
            || !action.equals(stored.getAction())) {
            throw new InteractiveMatchService.Conflict(ownerUserId, careerId, null, "Request ID is already used");
        }
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Mutation response cannot be serialized", exception);
        }
    }

    private <T> T read(String value, Class<T> responseType) {
        try {
            return json.readValue(value, responseType);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored mutation response is invalid", exception);
        }
    }

    private JsonNode readTree(String value) {
        try {
            return json.readTree(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored mutation response is invalid", exception);
        }
    }

    public record OperationStatus(UUID requestId, String action, String state, JsonNode response) {}
}
