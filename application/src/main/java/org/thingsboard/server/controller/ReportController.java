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
package org.thingsboard.server.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.async.DeferredResult;
import org.thingsboard.server.common.data.exception.ThingsboardErrorCode;
import org.thingsboard.server.common.data.exception.ThingsboardException;
import org.thingsboard.server.dao.gdt.report.model.ReportRequest;
import org.thingsboard.server.dao.gdt.report.model.ReportResponse;
import org.thingsboard.server.dao.gdt.report.service.ReportService;
import org.thingsboard.server.queue.util.TbCoreComponent;
import org.thingsboard.server.service.security.model.SecurityUser;

import java.util.concurrent.CompletableFuture;

import static org.thingsboard.server.controller.ControllerConstants.*;

/**
 * Report Controller - REST API for report generation
 */
@RestController
@TbCoreComponent
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Slf4j
public class ReportController extends BaseController {

    private final ReportService reportService;

    /**
     * Generate a report
     * POST /api/reports/generate
     */
    @PostMapping("/generate")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER')")
    public DeferredResult<ResponseEntity> generateReport(
            @RequestBody ReportRequest request) throws ThingsboardException {
        
        SecurityUser user = getCurrentUser();
        
        log.info("[{}] Generating report: {} in format: {}", 
            user.getTenantId(), request.getReportType(), request.getFormat());
        
        // Validate request
        if (request.getReportType() == null) {
            throw new ThingsboardException("Report type is required", 
                ThingsboardErrorCode.BAD_REQUEST_PARAMS);
        }
        
        if (request.getFormat() == null) {
            throw new ThingsboardException("Report format is required", 
                ThingsboardErrorCode.BAD_REQUEST_PARAMS);
        }
        
        // Generate report asynchronously
        DeferredResult<ResponseEntity> result = new DeferredResult<>(30000L);
        
        CompletableFuture.supplyAsync(() -> 
            reportService.generateReport(request, user.getTenantId())
        ).thenAccept(reportResponse -> {
            log.info("[{}] Report generated successfully: {}", 
                user.getTenantId(), reportResponse.getReportId());
            result.setResult(ResponseEntity.ok(reportResponse));
        }).exceptionally(e -> {
            log.error("[{}] Error generating report", user.getTenantId(), e);
            result.setErrorResult(
                ResponseEntity.status(500)
                    .body(new ErrorResponse(e.getMessage()))
            );
            return null;
        });
        
        return result;
    }

    /**
     * Get report by ID
     * GET /api/reports/{reportId}
     */
    @GetMapping("/{reportId}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER')")
    public ResponseEntity<ReportResponse> getReport(
            @PathVariable String reportId) throws ThingsboardException {
        
        SecurityUser user = getCurrentUser();
        
        log.info("[{}] Getting report: {}", user.getTenantId(), reportId);
        
        ReportResponse report = reportService.getReport(reportId, user.getTenantId());
        
        if (report == null) {
            throw new ThingsboardException("Report not found: " + reportId, 
                ThingsboardErrorCode.ITEM_NOT_FOUND);
        }
        
        return ResponseEntity.ok(report);
    }

    /**
     * Get report history
     * GET /api/reports/history
     */
    @GetMapping("/history")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER')")
    public ResponseEntity<?> getReportHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int pageSize) throws ThingsboardException {
        
        SecurityUser user = getCurrentUser();
        
        log.info("[{}] Getting report history: page={}, pageSize={}", 
            user.getTenantId(), page, pageSize);
        
        // TODO: Implement report history storage and retrieval
        // For now, return empty list
        return ResponseEntity.ok(java.util.Collections.emptyList());
    }

    /**
     * Error response class
     */
    @lombok.Data
    @lombok.AllArgsConstructor
    private static class ErrorResponse {
        private String message;
    }
}
