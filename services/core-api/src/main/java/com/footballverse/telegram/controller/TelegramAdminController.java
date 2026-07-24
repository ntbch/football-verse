package com.footballverse.telegram.controller;

import com.footballverse.telegram.scheduler.TelegramDigestScheduler;
import com.footballverse.telegram.service.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/internal/telegram")
@RequiredArgsConstructor
public class TelegramAdminController {

    private final TelegramNotificationService telegramNotificationService;
    private final TelegramDigestScheduler telegramDigestScheduler;

    @PostMapping("/test-message")
    public ResponseEntity<Map<String, Object>> sendTestMessage(
            @RequestParam(required = false) String chatId,
            @RequestParam(defaultValue = "🔥 <b>FootballVerse Telegram Bot Connected!</b>\n\nHệ thống thông báo tin tức bóng đá đã hoạt động thành công.") String message
    ) {
        boolean success;
        if (chatId != null && !chatId.isBlank()) {
            success = telegramNotificationService.sendHtmlMessageToChat(chatId, message);
        } else {
            success = telegramNotificationService.sendHtmlMessage(message);
        }

        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", success ? "Test message sent successfully." : "Failed to send test message. Check server logs."
        ));
    }

    @PostMapping("/test-digest")
    public ResponseEntity<Map<String, Object>> triggerTestDigest() {
        boolean success = telegramDigestScheduler.publishDigestForPeriod("Thử nghiệm", 48);
        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", success ? "Digest sent successfully." : "No articles found or failed to send digest."
        ));
    }
}
