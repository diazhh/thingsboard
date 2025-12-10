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

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Scheduled Report Execution Record
 * 
 * Tracks execution history of scheduled reports
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledReportExecution {
    
    private String id;
    private String scheduledReportId;
    private String tenantId;
    
    // Execution Info
    private Long startTime;
    private Long endTime;
    private Long duration; // milliseconds
    private ExecutionStatus status;
    private String errorMessage;
    private String errorStackTrace;
    
    // Report Info
    private ReportType reportType;
    private String reportId;
    
    // Export Info
    private List<ExportResult> exportResults;
    
    // Notification Info
    private boolean notificationSent;
    private Long notificationTime;
    private String notificationStatus;
    
    /**
     * Execution status enum
     */
    public enum ExecutionStatus {
        SCHEDULED,
        RUNNING,
        GENERATING_REPORT,
        EXPORTING,
        NOTIFYING,
        SUCCESS,
        FAILED,
        CANCELLED
    }
    
    /**
     * Export result for a specific format
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExportResult {
        private ReportFormat format;
        private String filePath;
        private String fileName;
        private Long fileSize; // bytes
        private boolean success;
        private String errorMessage;
        private Long exportTime;
    }
    
    /**
     * Calculate duration if not set
     */
    public Long getDuration() {
        if (duration != null) {
            return duration;
        }
        if (startTime != null && endTime != null) {
            return endTime - startTime;
        }
        return null;
    }
    
    /**
     * Check if execution was successful
     */
    public boolean isSuccessful() {
        return status == ExecutionStatus.SUCCESS;
    }
    
    /**
     * Check if execution failed
     */
    public boolean isFailed() {
        return status == ExecutionStatus.FAILED;
    }
    
    /**
     * Check if execution is in progress
     */
    public boolean isInProgress() {
        return status == ExecutionStatus.RUNNING ||
               status == ExecutionStatus.GENERATING_REPORT ||
               status == ExecutionStatus.EXPORTING ||
               status == ExecutionStatus.NOTIFYING;
    }
}
