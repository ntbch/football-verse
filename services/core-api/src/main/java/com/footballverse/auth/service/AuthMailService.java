package com.footballverse.auth.service;

import com.footballverse.auth.model.AuthMailOutbox;
import com.footballverse.auth.model.AuthTokenPurpose;
import com.footballverse.auth.repository.AuthMailOutboxRepository;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.user.model.UserAccount;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthMailService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_ATTEMPTS = 5;

    private final AuthMailOutboxRepository outbox;
    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean enabled;

    @Value("${app.mail.from}")
    private String from;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${app.mail.encryption-key:}")
    private String encryptionKey;

    @Value("${app.auth.public-url}")
    private String publicUrl;

    @Value("${app.environment:development}")
    private String environment;

    private SecretKey key;

    @PostConstruct
    void validateConfiguration() {
        if (!enabled) {
            return;
        }
        if (from.isBlank() || smtpUsername.isBlank() || encryptionKey.isBlank()) {
            throw new IllegalArgumentException("Email delivery requires SMTP_USERNAME, MAIL_FROM, and APP_MAIL_ENCRYPTION_KEY");
        }
        if (!from.equalsIgnoreCase(smtpUsername)) {
            throw new IllegalArgumentException("MAIL_FROM must match SMTP_USERNAME for Gmail SMTP");
        }
        if ("production".equalsIgnoreCase(environment) && !publicUrl.startsWith("https://")) {
            throw new IllegalArgumentException("APP_PUBLIC_URL must use HTTPS in production");
        }
        try {
            byte[] bytes = Base64.getDecoder().decode(encryptionKey);
            if (bytes.length != 32) {
                throw new IllegalArgumentException("APP_MAIL_ENCRYPTION_KEY must contain 32 bytes");
            }
            key = new SecretKeySpec(bytes, "AES");
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("APP_MAIL_ENCRYPTION_KEY must be base64-encoded 32 random bytes", exception);
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    @Transactional
    public void queue(UserAccount recipient, AuthTokenPurpose purpose, String rawToken) {
        if (!enabled) {
            throw new BadRequestException("Email verification is temporarily unavailable");
        }
        outbox.save(new AuthMailOutbox(recipient, purpose, encrypt(rawToken)));
    }

    @Scheduled(fixedDelayString = "${app.mail.outbox-poll-ms:30000}")
    @Transactional
    public void deliverPending() {
        if (!enabled) {
            return;
        }
        Instant now = Instant.now();
        for (AuthMailOutbox message : outbox.findPendingForUpdate(now, PageRequest.of(0, 20))) {
            try {
                mailSender.send(toMessage(message, decrypt(message.getEncryptedPayload())));
                message.setSentAt(now);
                message.setLastError(null);
            } catch (Exception exception) {
                int attempts = message.getAttempts() + 1;
                message.setAttempts(attempts);
                message.setLastError(exception.getClass().getSimpleName());
                if (attempts >= MAX_ATTEMPTS) {
                    message.setFailedAt(now);
                    log.error("Auth email permanently failed after {} attempts for user {}", attempts, message.getRecipient().getId());
                } else {
                    message.setNextAttemptAt(now.plus(attempts, ChronoUnit.MINUTES));
                    log.warn("Auth email delivery failed for user {}; retrying", message.getRecipient().getId());
                }
            }
        }
    }

    private SimpleMailMessage toMessage(AuthMailOutbox item, String token) {
        String destination = publicUrl.replaceFirst("/+$", "")
                + (item.getPurpose() == AuthTokenPurpose.VERIFY_EMAIL ? "/verify-email#token=" : "/reset-password#token=")
                + token;
        String action = item.getPurpose() == AuthTokenPurpose.VERIFY_EMAIL ? "verify your email" : "reset your password";
        String expiry = item.getPurpose() == AuthTokenPurpose.VERIFY_EMAIL ? "24 hours" : "30 minutes";
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(item.getRecipient().getEmail());
        message.setSubject("Football Verse: " + (item.getPurpose() == AuthTokenPurpose.VERIFY_EMAIL ? "verify your email" : "reset your password"));
        message.setText("Use this link to " + action + ":\n\n" + destination
                + "\n\nIt expires in " + expiry + ". Only the newest link works. If you did not request this, you can ignore this email.");
        return message;
    }

    private String encrypt(String value) {
        try {
            byte[] nonce = new byte[12];
            RANDOM.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, nonce));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[nonce.length + encrypted.length];
            System.arraycopy(nonce, 0, payload, 0, nonce.length);
            System.arraycopy(encrypted, 0, payload, nonce.length, encrypted.length);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(payload);
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot encrypt auth email", exception);
        }
    }

    private String decrypt(String value) {
        try {
            byte[] payload = Base64.getUrlDecoder().decode(value);
            byte[] nonce = java.util.Arrays.copyOfRange(payload, 0, 12);
            byte[] encrypted = java.util.Arrays.copyOfRange(payload, 12, payload.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, nonce));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot decrypt auth email", exception);
        }
    }
}
