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
package org.thingsboard.server.controller.gdt;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.thingsboard.server.common.data.exception.ThingsboardException;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.controller.BaseController;
import org.thingsboard.server.dao.gdt.audit.model.ComplianceReport;
import org.thingsboard.server.dao.gdt.audit.service.ComplianceReportService;
import org.thingsboard.server.queue.util.TbCoreComponent;

import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * Compliance Report REST Controller
 * Handles REST API endpoints for compliance report management
 */
@RestController
@RequestMapping("/api/gdt/compliance")
@Slf4j
@TbCoreComponent
public class ComplianceReportController extends BaseController {

    @Autowired
    private ComplianceReportService complianceReportService;

    /**
     * Generate OIML R85 compliance report
     */
    @PostMapping("/oiml-r85/generate")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN')")
    public ResponseEntity<ComplianceReport> generateOIMLR85Report(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Date periodStart,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Date periodEnd) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        ComplianceReport report = complianceReportService.generateOIMLR85Report(tenantId, periodStart, periodEnd);
        return ResponseEntity.status(HttpStatus.CREATED).body(report);
    }

    /**
     * Generate audit summary report
     */
    @PostMapping("/audit-summary/generate")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN')")
    public ResponseEntity<ComplianceReport> generateAuditSummaryReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Date periodStart,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Date periodEnd) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        ComplianceReport report = complianceReportService.generateAuditSummaryReport(tenantId, periodStart, periodEnd);
        return ResponseEntity.status(HttpStatus.CREATED).body(report);
    }

    /**
     * Get compliance report by ID
     */
    @GetMapping("/{reportId}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<ComplianceReport> getReportById(@PathVariable String reportId) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        ComplianceReport report = complianceReportService.getReportById(reportId, tenantId);

        if (report == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(report);
    }

    /**
     * Get all compliance reports
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<ComplianceReport>> getReports(
            @RequestParam(required = false, defaultValue = "100") int limit) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        List<ComplianceReport> reports = complianceReportService.getReports(tenantId, limit);
        return ResponseEntity.ok(reports);
    }

    /**
     * Get compliance reports by date range
     */
    @GetMapping("/date-range")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<ComplianceReport>> getReportsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Date startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Date endDate) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        List<ComplianceReport> reports = complianceReportService.getReportsByDateRange(tenantId, startDate, endDate);
        return ResponseEntity.ok(reports);
    }

    /**
     * Export compliance report to PDF
     */
    @GetMapping("/{reportId}/export/pdf")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN')")
    public ResponseEntity<byte[]> exportReportToPDF(@PathVariable String reportId) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        byte[] pdfData = complianceReportService.exportReportToPDF(reportId, tenantId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "compliance_report_" + reportId + ".pdf");

        return new ResponseEntity<>(pdfData, headers, HttpStatus.OK);
    }

    /**
     * Export compliance report to CSV
     */
    @GetMapping("/{reportId}/export/csv")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN')")
    public ResponseEntity<byte[]> exportReportToCSV(@PathVariable String reportId) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        byte[] csvData = complianceReportService.exportReportToCSV(reportId, tenantId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.setContentDispositionFormData("attachment", "compliance_report_" + reportId + ".csv");

        return new ResponseEntity<>(csvData, headers, HttpStatus.OK);
    }

    /**
     * Get compliance score
     */
    @GetMapping("/score")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<Map<String, Object>> getComplianceScore() throws ThingsboardException {
        TenantId tenantId = getTenantId();
        double score = complianceReportService.getComplianceScore(tenantId);

        return ResponseEntity.ok(Map.of(
                "tenantId", tenantId.toString(),
                "complianceScore", score,
                "timestamp", System.currentTimeMillis()
        ));
    }

    /**
     * Get compliance trend
     */
    @GetMapping("/trend")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<ComplianceReport>> getComplianceTrend(
            @RequestParam(required = false, defaultValue = "10") int numberOfReports) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        List<ComplianceReport> trend = complianceReportService.getComplianceTrend(tenantId, numberOfReports);
        return ResponseEntity.ok(trend);
    }

    /**
     * Verify report integrity
     */
    @PostMapping("/{reportId}/verify")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN')")
    public ResponseEntity<Map<String, Object>> verifyReportIntegrity(@PathVariable String reportId) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        boolean isValid = complianceReportService.verifyReportIntegrity(reportId, tenantId);

        return ResponseEntity.ok(Map.of(
                "reportId", reportId,
                "isValid", isValid,
                "timestamp", System.currentTimeMillis()
        ));
    }

}
