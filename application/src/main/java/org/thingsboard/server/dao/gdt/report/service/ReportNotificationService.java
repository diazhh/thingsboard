/**
 * Copyright © 2016-2025 The Thingsboard Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.thingsboard.server.dao.gdt.report.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.thingsboard.rule.engine.api.MailService;
import org.thingsboard.rule.engine.api.TbEmail;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.dao.gdt.report.model.ScheduledReportConfig;
import org.thingsboard.server.dao.gdt.report.model.ScheduledReportExecution;

import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * Report Notification Service
 * 
 * Handles notifications for scheduled report execution
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportNotificationService {

    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    
    @Autowired(required = false)
    private MailService mailService;

    /**
     * Send notification when report generation completes successfully
     */
    public void sendReportCompletionNotification(
            ScheduledReportConfig config,
            ScheduledReportExecution execution) {
        
        log.info("[{}] Sending completion notification for report: {}", 
                config.getTenantId(), config.getName());
        
        try {
            String subject = String.format("Report Generated: %s", config.getName());
            String body = buildCompletionNotificationBody(config, execution);
            
            // Send notifications based on configured method
            if (config.getNotificationMethod() == ScheduledReportConfig.NotificationMethod.EMAIL) {
                sendEmailNotification(config, subject, body);
            } else if (config.getNotificationMethod() == ScheduledReportConfig.NotificationMethod.SMS) {
                sendSmsNotification(config, body);
            } else if (config.getNotificationMethod() == ScheduledReportConfig.NotificationMethod.PUSH) {
                sendPushNotification(config, subject, body);
            }
            
            log.info("[{}] Completion notification sent successfully", config.getTenantId());
            
        } catch (Exception e) {
            log.error("[{}] Error sending completion notification", config.getTenantId(), e);
            throw new RuntimeException("Failed to send notification", e);
        }
    }

    /**
     * Send notification when report generation fails
     */
    public void sendReportErrorNotification(
            ScheduledReportConfig config,
            ScheduledReportExecution execution) {
        
        log.info("[{}] Sending error notification for report: {}", 
                config.getTenantId(), config.getName());
        
        try {
            String subject = String.format("Report Generation Failed: %s", config.getName());
            String body = buildErrorNotificationBody(config, execution);
            
            // Send notifications based on configured method
            if (config.getNotificationMethod() == ScheduledReportConfig.NotificationMethod.EMAIL) {
                sendEmailNotification(config, subject, body);
            } else if (config.getNotificationMethod() == ScheduledReportConfig.NotificationMethod.SMS) {
                sendSmsNotification(config, body);
            } else if (config.getNotificationMethod() == ScheduledReportConfig.NotificationMethod.PUSH) {
                sendPushNotification(config, subject, body);
            }
            
            log.info("[{}] Error notification sent successfully", config.getTenantId());
            
        } catch (Exception e) {
            log.error("[{}] Error sending error notification", config.getTenantId(), e);
            throw new RuntimeException("Failed to send error notification", e);
        }
    }

    // ==================== Private Methods ====================

    /**
     * Build notification body for successful completion
     */
    private String buildCompletionNotificationBody(
            ScheduledReportConfig config,
            ScheduledReportExecution execution) {
        
        StringBuilder body = new StringBuilder();
        body.append("Report Generation Completed\n\n");
        body.append("Report Name: ").append(config.getName()).append("\n");
        body.append("Report Type: ").append(config.getReportType()).append("\n");
        body.append("Execution Time: ").append(DATE_FORMAT.format(new Date(execution.getStartTime()))).append("\n");
        body.append("Duration: ").append(formatDuration(execution.getDuration())).append("\n");
        body.append("Status: SUCCESS\n\n");
        
        // Export results
        if (execution.getExportResults() != null && !execution.getExportResults().isEmpty()) {
            body.append("Exported Files:\n");
            for (ScheduledReportExecution.ExportResult result : execution.getExportResults()) {
                if (result.isSuccess()) {
                    body.append("  - ").append(result.getFormat())
                        .append(": ").append(result.getFileName())
                        .append(" (").append(formatFileSize(result.getFileSize())).append(")\n");
                }
            }
        }
        
        body.append("\n");
        body.append("This is an automated notification from GDT Tank Gauging System.\n");
        
        return body.toString();
    }

    /**
     * Build notification body for error
     */
    private String buildErrorNotificationBody(
            ScheduledReportConfig config,
            ScheduledReportExecution execution) {
        
        StringBuilder body = new StringBuilder();
        body.append("Report Generation Failed\n\n");
        body.append("Report Name: ").append(config.getName()).append("\n");
        body.append("Report Type: ").append(config.getReportType()).append("\n");
        body.append("Execution Time: ").append(DATE_FORMAT.format(new Date(execution.getStartTime()))).append("\n");
        body.append("Duration: ").append(formatDuration(execution.getDuration())).append("\n");
        body.append("Status: FAILED\n\n");
        
        // Error details
        body.append("Error Message:\n");
        body.append(execution.getErrorMessage()).append("\n\n");
        
        // Export results (if any succeeded before failure)
        if (execution.getExportResults() != null && !execution.getExportResults().isEmpty()) {
            boolean hasFailures = execution.getExportResults().stream()
                .anyMatch(r -> !r.isSuccess());
            
            if (hasFailures) {
                body.append("Export Failures:\n");
                for (ScheduledReportExecution.ExportResult result : execution.getExportResults()) {
                    if (!result.isSuccess()) {
                        body.append("  - ").append(result.getFormat())
                            .append(": ").append(result.getErrorMessage()).append("\n");
                    }
                }
                body.append("\n");
            }
        }
        
        body.append("Please check the system logs for more details.\n\n");
        body.append("This is an automated notification from GDT Tank Gauging System.\n");
        
        return body.toString();
    }

    /**
     * Send email notification
     */
    private void sendEmailNotification(ScheduledReportConfig config, String subject, String body) {
        log.info("[{}] Sending email notification", config.getTenantId());
        
        if (config.getNotificationEmails() != null && !config.getNotificationEmails().isEmpty()) {
            for (String email : config.getNotificationEmails()) {
                try {
                    if (mailService != null) {
                        log.info("[{}] Sending email to: {} with subject: {}", config.getTenantId(), email, subject);
                        
                        // Create TbEmail object for ThingsBoard mail service using builder
                        TbEmail tbEmail = TbEmail.builder()
                                .to(email)
                                .subject(subject)
                                .body(body)
                                .html(false)
                                .build();
                        
                        // Send email using ThingsBoard mail service
                        TenantId tenantId = TenantId.fromUUID(java.util.UUID.fromString(config.getTenantId()));
                        mailService.send(tenantId, null, tbEmail);
                        
                        log.info("[{}] Email sent successfully to: {}", config.getTenantId(), email);
                    } else {
                        log.warn("[{}] MailService not available. Email notification not sent to: {}", config.getTenantId(), email);
                    }
                } catch (Exception e) {
                    log.error("[{}] Failed to send email to: {}", config.getTenantId(), email, e);
                }
            }
        } else {
            log.warn("[{}] No notification emails configured", config.getTenantId());
        }
    }

    /**
     * Send SMS notification
     */
    private void sendSmsNotification(ScheduledReportConfig config, String body) {
        log.info("[{}] Sending SMS notification", config.getTenantId());
        
        // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
        // For now, just log the notification
        
        log.debug("SMS Body: {}", body);
        
        // TODO: Actual SMS sending
        // smsService.sendSms(phoneNumber, body);
    }

    /**
     * Send push notification
     */
    private void sendPushNotification(ScheduledReportConfig config, String title, String body) {
        log.info("[{}] Sending push notification", config.getTenantId());
        
        // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
        // For now, just log the notification
        
        if (config.getNotificationUserIds() != null && !config.getNotificationUserIds().isEmpty()) {
            for (String userId : config.getNotificationUserIds()) {
                log.info("[{}] Push notification to user: {}", config.getTenantId(), userId);
                log.debug("Title: {}", title);
                log.debug("Body: {}", body);
                
                // TODO: Actual push notification
                // pushService.sendPush(userId, title, body);
            }
        }
    }

    /**
     * Format duration in human-readable format
     */
    private String formatDuration(Long durationMs) {
        if (durationMs == null) {
            return "N/A";
        }
        
        long seconds = durationMs / 1000;
        long minutes = seconds / 60;
        long hours = minutes / 60;
        
        if (hours > 0) {
            return String.format("%dh %dm %ds", hours, minutes % 60, seconds % 60);
        } else if (minutes > 0) {
            return String.format("%dm %ds", minutes, seconds % 60);
        } else {
            return String.format("%ds", seconds);
        }
    }

    /**
     * Format file size in human-readable format
     */
    private String formatFileSize(Long bytes) {
        if (bytes == null) {
            return "N/A";
        }
        
        if (bytes < 1024) {
            return bytes + " B";
        } else if (bytes < 1024 * 1024) {
            return String.format("%.2f KB", bytes / 1024.0);
        } else if (bytes < 1024 * 1024 * 1024) {
            return String.format("%.2f MB", bytes / (1024.0 * 1024));
        } else {
            return String.format("%.2f GB", bytes / (1024.0 * 1024 * 1024));
        }
    }
}
