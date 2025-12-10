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
package org.thingsboard.server.dao.gdt.report.model;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Scheduled Report Configuration
 * 
 * Configuration for automated report generation and export
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledReportConfig {
    
    private String id;
    private String tenantId;
    private String name;
    private String description;
    private boolean enabled;
    
    // Report Configuration
    private ReportType reportType;
    private Map<String, Object> reportParameters;
    
    // Schedule Configuration (Cron expression)
    private String cronExpression; // e.g., "0 0 8 * * ?" = Daily at 8:00 AM
    private String timezone; // e.g., "America/Bogota"
    
    // Export Configuration
    private List<ReportFormat> exportFormats; // CSV, PDF, Excel
    private String exportPath; // Optional: file system path
    private boolean autoExport;
    
    // Notification Configuration
    private boolean notifyOnCompletion;
    private boolean notifyOnError;
    private List<String> notificationEmails;
    private List<String> notificationUserIds;
    private NotificationMethod notificationMethod; // EMAIL, SMS, PUSH
    
    // Retention Configuration
    private Integer retentionDays; // How long to keep generated reports
    private boolean autoCleanup;
    
    // Metadata
    private Long createdTime;
    private String createdBy;
    private Long lastModifiedTime;
    private String lastModifiedBy;
    private Long lastExecutionTime;
    private String lastExecutionStatus; // SUCCESS, FAILED, RUNNING
    private String lastExecutionError;
    private Integer executionCount;
    
    // Additional Configuration
    private JsonNode additionalConfig;
    
    /**
     * Notification method enum
     */
    public enum NotificationMethod {
        EMAIL,
        SMS,
        PUSH,
        WEBHOOK
    }
    
    /**
     * Validate cron expression
     */
    public boolean isValidCronExpression() {
        if (cronExpression == null || cronExpression.trim().isEmpty()) {
            return false;
        }
        // Basic validation - should be enhanced with proper cron validator
        String[] parts = cronExpression.trim().split("\\s+");
        return parts.length == 6 || parts.length == 7;
    }
    
    /**
     * Check if configuration is ready for execution
     */
    public boolean isReadyForExecution() {
        return enabled &&
               reportType != null &&
               cronExpression != null &&
               isValidCronExpression() &&
               (exportFormats != null && !exportFormats.isEmpty());
    }
}
