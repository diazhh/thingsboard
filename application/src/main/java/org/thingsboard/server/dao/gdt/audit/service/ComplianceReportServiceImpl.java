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
package org.thingsboard.server.dao.gdt.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.dao.gdt.audit.model.ComplianceReport;
import org.thingsboard.server.dao.gdt.audit.model.EventCategory;
import org.thingsboard.server.dao.gdt.audit.model.EventSeverity;
import org.thingsboard.server.dao.gdt.audit.model.AuditEvent;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Compliance Report Service Implementation
 * Handles generation and management of OIML R85 compliance reports
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ComplianceReportServiceImpl implements ComplianceReportService {
    
    private final EventLoggerService eventLoggerService;
    private final SealManagementService sealManagementService;
    private final DigitalSignatureService digitalSignatureService;
    
    // In-memory storage (should be replaced with database)
    private final Map<String, ComplianceReport> reportsByTenant = new ConcurrentHashMap<>();
    
    @Override
    public ComplianceReport generateOIMLR85Report(
            TenantId tenantId,
            Date periodStart,
            Date periodEnd) {
        
        try {
            log.info("[{}] Generating OIML R85 compliance report for period: {} - {}", 
                    tenantId, periodStart, periodEnd);
            
            // Get audit events for the period
            List<AuditEvent> auditEvents = eventLoggerService.getAuditEvents(
                    tenantId, 
                    periodStart.getTime(), 
                    periodEnd.getTime(), 
                    Integer.MAX_VALUE
            );
            
            // Calculate compliance metrics
            ComplianceReport report = ComplianceReport.builder()
                    .reportId(UUID.randomUUID().toString())
                    .tenantId(tenantId.toString())
                    .generatedAt(new Date())
                    .periodStart(periodStart)
                    .periodEnd(periodEnd)
                    .totalAuditEvents(auditEvents.size())
                    .build();
            
            // Analyze events
            analyzeAuditEvents(report, auditEvents, tenantId);
            
            // Analyze seal status
            analyzeSealStatus(report, tenantId);
            
            // Calculate compliance percentage
            calculateCompliancePercentage(report);
            
            // Determine overall status
            determineOverallStatus(report);
            
            // Generate findings and recommendations
            generateFindingsAndRecommendations(report);
            
            // Generate digital signature
            String signature = digitalSignatureService.generateSignatureForString(
                    report.getReportId() + "|" + report.getGeneratedAt() + "|" + report.getCompliancePercentage()
            );
            report.setReportSignature(signature);
            report.setSignatureTimestamp(new Date());
            
            // Store report
            reportsByTenant.put(report.getReportId(), report);
            
            log.info("[{}] OIML R85 compliance report generated: {} ({}%)", 
                    tenantId, report.getReportId(), report.getCompliancePercentage());
            
            return report;
            
        } catch (Exception e) {
            log.error("[{}] Error generating OIML R85 compliance report", tenantId, e);
            throw new RuntimeException("Failed to generate compliance report", e);
        }
    }
    
    @Override
    public ComplianceReport generateAuditSummaryReport(
            TenantId tenantId,
            Date periodStart,
            Date periodEnd) {
        
        try {
            log.info("[{}] Generating audit summary report for period: {} - {}", 
                    tenantId, periodStart, periodEnd);
            
            // Get audit events for the period
            List<AuditEvent> auditEvents = eventLoggerService.getAuditEvents(
                    tenantId, 
                    periodStart.getTime(), 
                    periodEnd.getTime(), 
                    Integer.MAX_VALUE
            );
            
            // Create summary report
            ComplianceReport report = ComplianceReport.builder()
                    .reportId(UUID.randomUUID().toString())
                    .tenantId(tenantId.toString())
                    .generatedAt(new Date())
                    .periodStart(periodStart)
                    .periodEnd(periodEnd)
                    .totalAuditEvents(auditEvents.size())
                    .build();
            
            // Analyze events
            analyzeAuditEvents(report, auditEvents, tenantId);
            
            // Generate digital signature
            String signature = digitalSignatureService.generateSignatureForString(
                    report.getReportId() + "|" + report.getGeneratedAt()
            );
            report.setReportSignature(signature);
            report.setSignatureTimestamp(new Date());
            
            // Store report
            reportsByTenant.put(report.getReportId(), report);
            
            log.info("[{}] Audit summary report generated: {}", tenantId, report.getReportId());
            
            return report;
            
        } catch (Exception e) {
            log.error("[{}] Error generating audit summary report", tenantId, e);
            throw new RuntimeException("Failed to generate audit summary report", e);
        }
    }
    
    @Override
    public ComplianceReport getReportById(String reportId, TenantId tenantId) {
        return reportsByTenant.get(reportId);
    }
    
    @Override
    public List<ComplianceReport> getReports(TenantId tenantId, int limit) {
        return reportsByTenant.values().stream()
                .filter(r -> tenantId.toString().equals(r.getTenantId()))
                .sorted((a, b) -> b.getGeneratedAt().compareTo(a.getGeneratedAt()))
                .limit(limit)
                .collect(Collectors.toList());
    }
    
    @Override
    public List<ComplianceReport> getReportsByDateRange(
            TenantId tenantId,
            Date startDate,
            Date endDate) {
        
        return reportsByTenant.values().stream()
                .filter(r -> tenantId.toString().equals(r.getTenantId()))
                .filter(r -> r.getGeneratedAt().after(startDate) && r.getGeneratedAt().before(endDate))
                .sorted((a, b) -> b.getGeneratedAt().compareTo(a.getGeneratedAt()))
                .collect(Collectors.toList());
    }
    
    @Override
    public byte[] exportReportToPDF(String reportId, TenantId tenantId) {
        ComplianceReport report = getReportById(reportId, tenantId);
        if (report == null) {
            throw new IllegalArgumentException("Report not found");
        }
        
        // TODO: Implement PDF export using Apache PDFBox
        String pdfContent = generatePDFContent(report);
        return pdfContent.getBytes(StandardCharsets.UTF_8);
    }
    
    @Override
    public byte[] exportReportToCSV(String reportId, TenantId tenantId) {
        ComplianceReport report = getReportById(reportId, tenantId);
        if (report == null) {
            throw new IllegalArgumentException("Report not found");
        }
        
        StringBuilder csv = new StringBuilder();
        csv.append("OIML R85 Compliance Report\n");
        csv.append("Report ID,").append(report.getReportId()).append("\n");
        csv.append("Generated At,").append(report.getGeneratedAt()).append("\n");
        csv.append("Period,").append(report.getPeriodStart()).append(" - ").append(report.getPeriodEnd()).append("\n");
        csv.append("Overall Status,").append(report.getOverallStatus().getDisplayName()).append("\n");
        csv.append("Compliance Percentage,").append(report.getCompliancePercentage()).append("%\n");
        csv.append("\nMetrics\n");
        csv.append("Total Audit Events,").append(report.getTotalAuditEvents()).append("\n");
        csv.append("Sealed Devices,").append(report.getSealedDevices()).append("\n");
        csv.append("Unsealed Devices,").append(report.getUnsealedDevices()).append("\n");
        csv.append("Broken Seals,").append(report.getBrokenSeals()).append("\n");
        csv.append("Configuration Changes,").append(report.getConfigurationChanges()).append("\n");
        csv.append("Data Modifications,").append(report.getDataModifications()).append("\n");
        csv.append("Unauthorized Attempts,").append(report.getUnauthorizedAttempts()).append("\n");
        csv.append("Critical Events,").append(report.getCriticalEvents()).append("\n");
        
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }
    
    @Override
    public double getComplianceScore(TenantId tenantId) {
        List<ComplianceReport> reports = getReports(tenantId, 10);
        if (reports.isEmpty()) {
            return 100.0;
        }
        
        return reports.stream()
                .mapToDouble(ComplianceReport::getCompliancePercentage)
                .average()
                .orElse(100.0);
    }
    
    @Override
    public List<ComplianceReport> getComplianceTrend(TenantId tenantId, int numberOfReports) {
        return getReports(tenantId, numberOfReports);
    }
    
    @Override
    public boolean verifyReportIntegrity(String reportId, TenantId tenantId) {
        ComplianceReport report = getReportById(reportId, tenantId);
        if (report == null) {
            return false;
        }
        
        String expectedSignature = digitalSignatureService.generateSignatureForString(
                report.getReportId() + "|" + report.getGeneratedAt() + "|" + report.getCompliancePercentage()
        );
        
        return expectedSignature.equals(report.getReportSignature());
    }
    
    /**
     * Analyze audit events
     */
    private void analyzeAuditEvents(ComplianceReport report, List<AuditEvent> events, TenantId tenantId) {
        Map<String, Integer> eventSummary = new HashMap<>();
        
        for (AuditEvent event : events) {
            String category = event.getCategory().name();
            eventSummary.put(category, eventSummary.getOrDefault(category, 0) + 1);
            
            if (event.getSeverity() == EventSeverity.CRITICAL) {
                report.setCriticalEvents(report.getCriticalEvents() + 1);
            }
            
            if (event.getCategory() == EventCategory.UNAUTHORIZED_ACCESS_ATTEMPT) {
                report.setUnauthorizedAttempts(report.getUnauthorizedAttempts() + 1);
            }
        }
        
        report.setEventSummary(eventSummary);
    }
    
    /**
     * Analyze seal status
     */
    private void analyzeSealStatus(ComplianceReport report, TenantId tenantId) {
        // TODO: Integrate with SealManagementService
        // For now, use placeholder values
        report.setSealedDevices(1);
        report.setUnsealedDevices(2);
        report.setBrokenSeals(0);
    }
    
    /**
     * Calculate compliance percentage
     */
    private void calculateCompliancePercentage(ComplianceReport report) {
        double score = 100.0;
        
        // Deduct points for issues
        score -= report.getUnauthorizedAttempts() * 5;
        score -= report.getCriticalEvents() * 3;
        score -= report.getBrokenSeals() * 10;
        score -= report.getConfigurationChanges() * 2;
        score -= report.getDataModifications() * 2;
        
        // Ensure score is between 0 and 100
        score = Math.max(0, Math.min(100, score));
        
        report.setCompliancePercentage(score);
    }
    
    /**
     * Determine overall compliance status
     */
    private void determineOverallStatus(ComplianceReport report) {
        double percentage = report.getCompliancePercentage();
        
        if (percentage >= 95) {
            report.setOverallStatus(ComplianceReport.ComplianceStatus.FULLY_COMPLIANT);
        } else if (percentage >= 80) {
            report.setOverallStatus(ComplianceReport.ComplianceStatus.COMPLIANT);
        } else if (percentage >= 60) {
            report.setOverallStatus(ComplianceReport.ComplianceStatus.PARTIALLY_COMPLIANT);
        } else {
            report.setOverallStatus(ComplianceReport.ComplianceStatus.NON_COMPLIANT);
        }
    }
    
    /**
     * Generate findings and recommendations
     */
    private void generateFindingsAndRecommendations(ComplianceReport report) {
        List<String> recommendations = new ArrayList<>();
        
        if (report.getUnauthorizedAttempts() > 0) {
            recommendations.add("Investigate unauthorized access attempts and strengthen security measures");
        }
        
        if (report.getCriticalEvents() > 0) {
            recommendations.add("Review and address critical events immediately");
        }
        
        if (report.getBrokenSeals() > 0) {
            recommendations.add("Investigate broken seals and verify device integrity");
        }
        
        if (report.getConfigurationChanges() > 0) {
            recommendations.add("Document all configuration changes and verify compliance");
        }
        
        if (report.getCompliancePercentage() < 80) {
            recommendations.add("Schedule a comprehensive compliance audit");
        }
        
        report.setRecommendations(recommendations);
    }
    
    /**
     * Generate PDF content
     */
    private String generatePDFContent(ComplianceReport report) {
        return "OIML R85 Compliance Report\n" +
                "Report ID: " + report.getReportId() + "\n" +
                "Generated: " + report.getGeneratedAt() + "\n" +
                "Period: " + report.getPeriodStart() + " - " + report.getPeriodEnd() + "\n" +
                "Overall Status: " + report.getOverallStatus().getDisplayName() + "\n" +
                "Compliance: " + report.getCompliancePercentage() + "%\n";
    }
}
