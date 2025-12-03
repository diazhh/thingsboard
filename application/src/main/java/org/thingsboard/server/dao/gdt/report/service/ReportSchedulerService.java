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
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.dao.gdt.report.model.*;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

/**
 * Report Scheduler Service
 * 
 * Manages scheduled report generation and execution using Spring Task Scheduler
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportSchedulerService {

    private final TaskScheduler taskScheduler;
    private final ReportService reportService;
    private final ReportExportService reportExportService;
    private final ReportNotificationService notificationService;
    
    // Map of scheduled report ID to ScheduledFuture
    private final Map<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();
    
    // In-memory storage for scheduled report configs (should be replaced with database)
    private final Map<String, ScheduledReportConfig> scheduledReports = new ConcurrentHashMap<>();
    
    // Execution history (should be replaced with database)
    private final Map<String, List<ScheduledReportExecution>> executionHistory = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        log.info("Initializing Report Scheduler Service");
        // Load scheduled reports from database and schedule them
        loadAndScheduleReports();
    }

    @PreDestroy
    public void destroy() {
        log.info("Shutting down Report Scheduler Service");
        // Cancel all scheduled tasks
        cancelAllScheduledReports();
    }

    /**
     * Schedule a report for automatic generation
     */
    public ScheduledReportConfig scheduleReport(ScheduledReportConfig config) {
        log.info("[{}] Scheduling report: {} ({})", config.getTenantId(), config.getName(), config.getCronExpression());
        
        // Validate configuration
        if (!config.isReadyForExecution()) {
            throw new IllegalArgumentException("Invalid report configuration");
        }
        
        // Generate ID if not present
        if (config.getId() == null) {
            config.setId(UUID.randomUUID().toString());
        }
        
        // Set metadata
        long now = System.currentTimeMillis();
        if (config.getCreatedTime() == null) {
            config.setCreatedTime(now);
        }
        config.setLastModifiedTime(now);
        config.setExecutionCount(0);
        
        // Save configuration
        scheduledReports.put(config.getId(), config);
        
        // Schedule the task
        if (config.isEnabled()) {
            scheduleTask(config);
        }
        
        log.info("[{}] Report scheduled successfully: {}", config.getTenantId(), config.getId());
        return config;
    }

    /**
     * Update scheduled report configuration
     */
    public ScheduledReportConfig updateScheduledReport(String reportId, ScheduledReportConfig config) {
        log.info("Updating scheduled report: {}", reportId);
        
        ScheduledReportConfig existing = scheduledReports.get(reportId);
        if (existing == null) {
            throw new IllegalArgumentException("Scheduled report not found: " + reportId);
        }
        
        // Cancel existing task
        cancelScheduledReport(reportId);
        
        // Update configuration
        config.setId(reportId);
        config.setCreatedTime(existing.getCreatedTime());
        config.setCreatedBy(existing.getCreatedBy());
        config.setLastModifiedTime(System.currentTimeMillis());
        config.setExecutionCount(existing.getExecutionCount());
        
        scheduledReports.put(reportId, config);
        
        // Reschedule if enabled
        if (config.isEnabled()) {
            scheduleTask(config);
        }
        
        log.info("Scheduled report updated: {}", reportId);
        return config;
    }

    /**
     * Delete scheduled report
     */
    public void deleteScheduledReport(String reportId) {
        log.info("Deleting scheduled report: {}", reportId);
        
        // Cancel task
        cancelScheduledReport(reportId);
        
        // Remove configuration
        scheduledReports.remove(reportId);
        
        // Remove execution history
        executionHistory.remove(reportId);
        
        log.info("Scheduled report deleted: {}", reportId);
    }

    /**
     * Enable scheduled report
     */
    public void enableScheduledReport(String reportId) {
        log.info("Enabling scheduled report: {}", reportId);
        
        ScheduledReportConfig config = scheduledReports.get(reportId);
        if (config == null) {
            throw new IllegalArgumentException("Scheduled report not found: " + reportId);
        }
        
        config.setEnabled(true);
        config.setLastModifiedTime(System.currentTimeMillis());
        
        scheduleTask(config);
        
        log.info("Scheduled report enabled: {}", reportId);
    }

    /**
     * Disable scheduled report
     */
    public void disableScheduledReport(String reportId) {
        log.info("Disabling scheduled report: {}", reportId);
        
        ScheduledReportConfig config = scheduledReports.get(reportId);
        if (config == null) {
            throw new IllegalArgumentException("Scheduled report not found: " + reportId);
        }
        
        config.setEnabled(false);
        config.setLastModifiedTime(System.currentTimeMillis());
        
        cancelScheduledReport(reportId);
        
        log.info("Scheduled report disabled: {}", reportId);
    }

    /**
     * Execute scheduled report immediately (manual trigger)
     */
    public ScheduledReportExecution executeNow(String reportId) {
        log.info("Executing scheduled report immediately: {}", reportId);
        
        ScheduledReportConfig config = scheduledReports.get(reportId);
        if (config == null) {
            throw new IllegalArgumentException("Scheduled report not found: " + reportId);
        }
        
        return executeScheduledReport(config);
    }

    /**
     * Get scheduled report configuration
     */
    public ScheduledReportConfig getScheduledReport(String reportId) {
        return scheduledReports.get(reportId);
    }

    /**
     * Get all scheduled reports for a tenant
     */
    public List<ScheduledReportConfig> getScheduledReportsByTenant(String tenantId) {
        return scheduledReports.values().stream()
            .filter(config -> config.getTenantId().equals(tenantId))
            .toList();
    }

    /**
     * Get execution history for a scheduled report
     */
    public List<ScheduledReportExecution> getExecutionHistory(String reportId, int limit) {
        List<ScheduledReportExecution> history = executionHistory.getOrDefault(reportId, new ArrayList<>());
        return history.stream()
            .sorted((a, b) -> Long.compare(b.getStartTime(), a.getStartTime()))
            .limit(limit)
            .toList();
    }

    // ==================== Private Methods ====================

    /**
     * Load scheduled reports from database and schedule them
     */
    private void loadAndScheduleReports() {
        log.info("Loading scheduled reports from database");
        
        // TODO: Load from database
        // For now, using in-memory storage
        
        int scheduledCount = 0;
        for (ScheduledReportConfig config : scheduledReports.values()) {
            if (config.isEnabled() && config.isReadyForExecution()) {
                scheduleTask(config);
                scheduledCount++;
            }
        }
        
        log.info("Loaded and scheduled {} reports", scheduledCount);
    }

    /**
     * Schedule a task using cron expression
     */
    private void scheduleTask(ScheduledReportConfig config) {
        try {
            // Create cron trigger
            ZoneId zoneId = config.getTimezone() != null 
                ? ZoneId.of(config.getTimezone()) 
                : ZoneId.systemDefault();
            
            CronTrigger trigger = new CronTrigger(config.getCronExpression(), zoneId);
            
            // Schedule task
            ScheduledFuture<?> future = taskScheduler.schedule(
                () -> executeScheduledReport(config),
                trigger
            );
            
            // Store scheduled future
            scheduledTasks.put(config.getId(), future);
            
            log.info("[{}] Task scheduled: {} with cron: {}", 
                    config.getTenantId(), config.getName(), config.getCronExpression());
            
        } catch (Exception e) {
            log.error("[{}] Error scheduling task: {}", config.getTenantId(), config.getName(), e);
            throw new RuntimeException("Failed to schedule report: " + e.getMessage(), e);
        }
    }

    /**
     * Cancel scheduled report
     */
    private void cancelScheduledReport(String reportId) {
        ScheduledFuture<?> future = scheduledTasks.remove(reportId);
        if (future != null) {
            future.cancel(false);
            log.info("Cancelled scheduled task: {}", reportId);
        }
    }

    /**
     * Cancel all scheduled reports
     */
    private void cancelAllScheduledReports() {
        log.info("Cancelling all scheduled tasks");
        
        for (Map.Entry<String, ScheduledFuture<?>> entry : scheduledTasks.entrySet()) {
            entry.getValue().cancel(false);
        }
        
        scheduledTasks.clear();
        log.info("All scheduled tasks cancelled");
    }

    /**
     * Execute scheduled report
     */
    private ScheduledReportExecution executeScheduledReport(ScheduledReportConfig config) {
        String executionId = UUID.randomUUID().toString();
        long startTime = System.currentTimeMillis();
        
        log.info("[{}] Executing scheduled report: {} (execution: {})", 
                config.getTenantId(), config.getName(), executionId);
        
        // Create execution record
        ScheduledReportExecution execution = ScheduledReportExecution.builder()
            .id(executionId)
            .scheduledReportId(config.getId())
            .tenantId(config.getTenantId())
            .startTime(startTime)
            .status(ScheduledReportExecution.ExecutionStatus.RUNNING)
            .reportType(config.getReportType())
            .exportResults(new ArrayList<>())
            .build();
        
        try {
            // Update status: Generating report
            execution.setStatus(ScheduledReportExecution.ExecutionStatus.GENERATING_REPORT);
            
            // Generate report
            ReportRequest request = ReportRequest.builder()
                .reportType(config.getReportType())
                .format(ReportFormat.CSV) // Default format for generation
                .parameters(config.getReportParameters())
                .build();
            
            TenantId tenantId = TenantId.fromUUID(UUID.fromString(config.getTenantId()));
            ReportResponse response = reportService.generateReport(request, tenantId);
            
            execution.setReportId(response.getReportId());
            
            // Update status: Exporting
            execution.setStatus(ScheduledReportExecution.ExecutionStatus.EXPORTING);
            
            // Export to configured formats
            if (config.isAutoExport() && config.getExportFormats() != null) {
                for (ReportFormat format : config.getExportFormats()) {
                    try {
                        byte[] exportData = reportExportService.exportReport(
                            response.getData(), 
                            format, 
                            config.getReportType()
                        );
                        
                        // Save to file system if path is configured
                        String fileName = generateFileName(config, format);
                        String filePath = config.getExportPath() != null 
                            ? config.getExportPath() + "/" + fileName 
                            : fileName;
                        
                        // TODO: Save to file system or cloud storage
                        
                        ScheduledReportExecution.ExportResult exportResult = 
                            ScheduledReportExecution.ExportResult.builder()
                                .format(format)
                                .filePath(filePath)
                                .fileName(fileName)
                                .fileSize((long) exportData.length)
                                .success(true)
                                .exportTime(System.currentTimeMillis())
                                .build();
                        
                        execution.getExportResults().add(exportResult);
                        
                        log.info("[{}] Exported report to {}: {}", 
                                config.getTenantId(), format, fileName);
                        
                    } catch (Exception e) {
                        log.error("[{}] Error exporting report to {}", 
                                config.getTenantId(), format, e);
                        
                        ScheduledReportExecution.ExportResult exportResult = 
                            ScheduledReportExecution.ExportResult.builder()
                                .format(format)
                                .success(false)
                                .errorMessage(e.getMessage())
                                .exportTime(System.currentTimeMillis())
                                .build();
                        
                        execution.getExportResults().add(exportResult);
                    }
                }
            }
            
            // Update status: Notifying
            if (config.isNotifyOnCompletion()) {
                execution.setStatus(ScheduledReportExecution.ExecutionStatus.NOTIFYING);
                
                try {
                    notificationService.sendReportCompletionNotification(
                        config, 
                        execution
                    );
                    
                    execution.setNotificationSent(true);
                    execution.setNotificationTime(System.currentTimeMillis());
                    execution.setNotificationStatus("SUCCESS");
                    
                } catch (Exception e) {
                    log.error("[{}] Error sending notification", config.getTenantId(), e);
                    execution.setNotificationStatus("FAILED: " + e.getMessage());
                }
            }
            
            // Update status: Success
            execution.setStatus(ScheduledReportExecution.ExecutionStatus.SUCCESS);
            execution.setEndTime(System.currentTimeMillis());
            
            // Update config
            config.setLastExecutionTime(startTime);
            config.setLastExecutionStatus("SUCCESS");
            config.setLastExecutionError(null);
            config.setExecutionCount(config.getExecutionCount() + 1);
            
            log.info("[{}] Scheduled report executed successfully: {} (duration: {}ms)", 
                    config.getTenantId(), config.getName(), execution.getDuration());
            
        } catch (Exception e) {
            log.error("[{}] Error executing scheduled report: {}", 
                    config.getTenantId(), config.getName(), e);
            
            // Update execution status
            execution.setStatus(ScheduledReportExecution.ExecutionStatus.FAILED);
            execution.setEndTime(System.currentTimeMillis());
            execution.setErrorMessage(e.getMessage());
            execution.setErrorStackTrace(getStackTrace(e));
            
            // Update config
            config.setLastExecutionTime(startTime);
            config.setLastExecutionStatus("FAILED");
            config.setLastExecutionError(e.getMessage());
            
            // Send error notification if configured
            if (config.isNotifyOnError()) {
                try {
                    notificationService.sendReportErrorNotification(config, execution);
                } catch (Exception ne) {
                    log.error("[{}] Error sending error notification", config.getTenantId(), ne);
                }
            }
        }
        
        // Save execution history
        executionHistory.computeIfAbsent(config.getId(), k -> new ArrayList<>()).add(execution);
        
        return execution;
    }

    /**
     * Generate file name for export
     */
    private String generateFileName(ScheduledReportConfig config, ReportFormat format) {
        String timestamp = new java.text.SimpleDateFormat("yyyyMMdd_HHmmss")
            .format(new Date());
        String reportName = config.getName().replaceAll("[^a-zA-Z0-9]", "_");
        return String.format("%s_%s.%s", reportName, timestamp, format.name().toLowerCase());
    }

    /**
     * Get stack trace as string
     */
    private String getStackTrace(Exception e) {
        java.io.StringWriter sw = new java.io.StringWriter();
        java.io.PrintWriter pw = new java.io.PrintWriter(sw);
        e.printStackTrace(pw);
        return sw.toString();
    }

    /**
     * Cleanup old execution history (runs daily at 2 AM)
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupOldExecutions() {
        log.info("Cleaning up old execution history");
        
        long cutoffTime = System.currentTimeMillis() - (30L * 24 * 60 * 60 * 1000); // 30 days
        
        for (Map.Entry<String, List<ScheduledReportExecution>> entry : executionHistory.entrySet()) {
            List<ScheduledReportExecution> history = entry.getValue();
            history.removeIf(execution -> execution.getStartTime() < cutoffTime);
        }
        
        log.info("Cleanup completed");
    }
}
