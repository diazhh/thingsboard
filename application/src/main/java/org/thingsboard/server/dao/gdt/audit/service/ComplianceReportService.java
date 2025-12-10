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

import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.dao.gdt.audit.model.ComplianceReport;

import java.util.Date;
import java.util.List;

/**
 * Compliance Report Service Interface
 * Handles generation and management of OIML R85 compliance reports
 */
public interface ComplianceReportService {
    
    /**
     * Generate OIML R85 compliance report
     */
    ComplianceReport generateOIMLR85Report(
        TenantId tenantId,
        Date periodStart,
        Date periodEnd
    );
    
    /**
     * Generate audit summary report
     */
    ComplianceReport generateAuditSummaryReport(
        TenantId tenantId,
        Date periodStart,
        Date periodEnd
    );
    
    /**
     * Get compliance report by ID
     */
    ComplianceReport getReportById(String reportId, TenantId tenantId);
    
    /**
     * Get all compliance reports for a tenant
     */
    List<ComplianceReport> getReports(TenantId tenantId, int limit);
    
    /**
     * Get compliance reports for a date range
     */
    List<ComplianceReport> getReportsByDateRange(
        TenantId tenantId,
        Date startDate,
        Date endDate
    );
    
    /**
     * Export compliance report to PDF
     */
    byte[] exportReportToPDF(String reportId, TenantId tenantId);
    
    /**
     * Export compliance report to CSV
     */
    byte[] exportReportToCSV(String reportId, TenantId tenantId);
    
    /**
     * Get compliance score for a tenant
     */
    double getComplianceScore(TenantId tenantId);
    
    /**
     * Get compliance trend (last N reports)
     */
    List<ComplianceReport> getComplianceTrend(TenantId tenantId, int numberOfReports);
    
    /**
     * Verify report integrity
     */
    boolean verifyReportIntegrity(String reportId, TenantId tenantId);
}
