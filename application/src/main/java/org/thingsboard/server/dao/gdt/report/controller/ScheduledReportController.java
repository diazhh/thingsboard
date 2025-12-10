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
package org.thingsboard.server.dao.gdt.report.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.dao.gdt.report.model.ScheduledReportConfig;
import org.thingsboard.server.dao.gdt.report.model.ScheduledReportExecution;
import org.thingsboard.server.dao.gdt.report.service.ReportSchedulerService;
import org.thingsboard.server.service.security.model.SecurityUser;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/gdt/reports/scheduled")
public class ScheduledReportController {

    @Autowired
    private ReportSchedulerService reportSchedulerService;

    /**
     * Get current tenant ID from security context
     */
    private String getCurrentTenantId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof SecurityUser) {
                SecurityUser user = (SecurityUser) authentication.getPrincipal();
                TenantId tenantId = user.getTenantId();
                return tenantId != null ? tenantId.getId().toString() : "default-tenant";
            }
        } catch (Exception e) {
            log.warn("Could not get tenant ID from security context", e);
        }
        return "default-tenant";
    }

    /**
     * Get all scheduled reports for the current tenant
     */
    @GetMapping
    public ResponseEntity<List<ScheduledReportConfig>> getScheduledReports() {
        try {
            String tenantId = getCurrentTenantId();
            log.info("Getting scheduled reports for tenant: {}", tenantId);
            List<ScheduledReportConfig> reports = reportSchedulerService.getScheduledReportsByTenant(tenantId);
            log.info("Found {} scheduled reports for tenant: {}", reports.size(), tenantId);
            return ResponseEntity.ok(reports != null ? reports : new ArrayList<>());
        } catch (Exception e) {
            log.error("Error getting scheduled reports", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get a specific scheduled report by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ScheduledReportConfig> getScheduledReport(@PathVariable String id) {
        try {
            ScheduledReportConfig report = reportSchedulerService.getScheduledReport(id);
            if (report != null) {
                return ResponseEntity.ok(report);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create a new scheduled report
     */
    @PostMapping
    public ResponseEntity<ScheduledReportConfig> createScheduledReport(@RequestBody ScheduledReportConfig config) {
        try {
            String tenantId = getCurrentTenantId();
            config.setTenantId(tenantId);
            log.info("Creating scheduled report for tenant: {}", tenantId);
            ScheduledReportConfig created = reportSchedulerService.scheduleReport(config);
            log.info("Scheduled report created: {}", created.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception e) {
            log.error("Error creating scheduled report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update an existing scheduled report
     */
    @PutMapping("/{id}")
    public ResponseEntity<ScheduledReportConfig> updateScheduledReport(
            @PathVariable String id,
            @RequestBody ScheduledReportConfig config) {
        try {
            String tenantId = getCurrentTenantId();
            config.setTenantId(tenantId);
            log.info("Updating scheduled report: {} for tenant: {}", id, tenantId);
            ScheduledReportConfig updated = reportSchedulerService.updateScheduledReport(id, config);
            log.info("Scheduled report updated: {}", id);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Error updating scheduled report: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete a scheduled report
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteScheduledReport(@PathVariable String id) {
        try {
            log.info("Deleting scheduled report: {}", id);
            reportSchedulerService.deleteScheduledReport(id);
            log.info("Scheduled report deleted: {}", id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting scheduled report: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Enable a scheduled report
     */
    @PostMapping("/{id}/enable")
    public ResponseEntity<Void> enableScheduledReport(@PathVariable String id) {
        try {
            log.info("Enabling scheduled report: {}", id);
            reportSchedulerService.enableScheduledReport(id);
            log.info("Scheduled report enabled: {}", id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error enabling scheduled report: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Disable a scheduled report
     */
    @PostMapping("/{id}/disable")
    public ResponseEntity<Void> disableScheduledReport(@PathVariable String id) {
        try {
            log.info("Disabling scheduled report: {}", id);
            reportSchedulerService.disableScheduledReport(id);
            log.info("Scheduled report disabled: {}", id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error disabling scheduled report: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Execute a scheduled report immediately
     */
    @PostMapping("/{id}/execute")
    public ResponseEntity<ScheduledReportExecution> executeScheduledReportNow(@PathVariable String id) {
        try {
            log.info("Executing scheduled report immediately: {}", id);
            ScheduledReportExecution execution = reportSchedulerService.executeNow(id);
            log.info("Scheduled report executed: {}", id);
            return ResponseEntity.ok(execution);
        } catch (Exception e) {
            log.error("Error executing scheduled report: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get execution history for a scheduled report
     */
    @GetMapping("/{id}/executions")
    public ResponseEntity<List<ScheduledReportExecution>> getExecutionHistory(
            @PathVariable String id,
            @RequestParam(defaultValue = "10") int limit) {
        try {
            log.info("Getting execution history for scheduled report: {} (limit: {})", id, limit);
            List<ScheduledReportExecution> history = reportSchedulerService.getExecutionHistory(id, limit);
            log.info("Found {} executions for scheduled report: {}", history.size(), id);
            return ResponseEntity.ok(history != null ? history : new ArrayList<>());
        } catch (Exception e) {
            log.error("Error getting execution history for scheduled report: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get execution details (returns execution history for the report)
     */
    @GetMapping("/{id}/executions/{executionId}")
    public ResponseEntity<ScheduledReportExecution> getExecutionDetails(
            @PathVariable String id,
            @PathVariable String executionId) {
        try {
            log.info("Getting execution details for scheduled report: {} execution: {}", id, executionId);
            List<ScheduledReportExecution> history = reportSchedulerService.getExecutionHistory(id, 100);
            ScheduledReportExecution execution = history.stream()
                    .filter(e -> e.getId().equals(executionId))
                    .findFirst()
                    .orElse(null);
            
            if (execution != null) {
                log.info("Found execution details for scheduled report: {} execution: {}", id, executionId);
                return ResponseEntity.ok(execution);
            } else {
                log.warn("Execution not found for scheduled report: {} execution: {}", id, executionId);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error getting execution details for scheduled report: {} execution: {}", id, executionId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
