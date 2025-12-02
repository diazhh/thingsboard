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
import org.springframework.stereotype.Service;
import org.thingsboard.server.common.data.id.DeviceId;
import org.thingsboard.server.common.data.id.EntityId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.kv.Aggregation;
import org.thingsboard.server.common.data.kv.BaseReadTsKvQuery;
import org.thingsboard.server.common.data.kv.ReadTsKvQuery;
import org.thingsboard.server.common.data.kv.TsKvEntry;
import org.thingsboard.server.dao.gdt.report.generator.ReportGeneratorFactory;
import org.thingsboard.server.dao.gdt.report.model.ReportFormat;
import org.thingsboard.server.dao.gdt.report.model.ReportRequest;
import org.thingsboard.server.dao.gdt.report.model.ReportResponse;
import org.thingsboard.server.dao.gdt.report.model.ReportStatus;
import org.thingsboard.server.dao.timeseries.TimeseriesService;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

/**
 * Report Service Implementation
 */
@Service
@Slf4j
public class ReportServiceImpl implements ReportService {

    private final TimeseriesService timeseriesService;
    private final ReportGeneratorFactory generatorFactory;
    private final ReportExportService exportService;

    public ReportServiceImpl(TimeseriesService timeseriesService,
                            ReportGeneratorFactory generatorFactory,
                            ReportExportService exportService) {
        this.timeseriesService = timeseriesService;
        this.generatorFactory = generatorFactory;
        this.exportService = exportService;
        log.info("ReportServiceImpl initialized successfully");
    }

    @Override
    public ReportResponse generateReport(ReportRequest request, TenantId tenantId) {
        log.info("[{}] Generating report: {}", tenantId, request.getReportType());

        try {
            // 1. Get appropriate generator
            var generator = generatorFactory.getGenerator(request.getReportType());
            
            if (generator == null) {
                throw new IllegalArgumentException(
                    "No generator found for report type: " + request.getReportType());
            }

            // 2. Generate report data
            Object reportData = generator.generateReportData(request, tenantId, this);

            // 3. Export to requested format
            byte[] fileData = exportService.exportReport(
                reportData, 
                request.getReportType(), 
                request.getFormat()
            );

            // 4. Generate file name
            String reportId = UUID.randomUUID().toString();
            SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd_HHmmss");
            String timestamp = sdf.format(new Date());
            String extension = getFileExtension(request.getFormat());
            String fileName = request.getReportType().name().toLowerCase() + "_" + timestamp + "." + extension;
            
            // 5. Encode file content to Base64
            String fileContent = Base64.getEncoder().encodeToString(fileData);

            // 6. Create response
            return ReportResponse.builder()
                .reportId(reportId)
                .reportType(request.getReportType())
                .format(request.getFormat())
                .status(ReportStatus.COMPLETED)
                .generatedAt(System.currentTimeMillis())
                .fileName(fileName)
                .fileContent(fileContent)
                .fileSize(fileData.length)
                .build();

        } catch (Exception e) {
            log.error("[{}] Error generating report", tenantId, e);
            return ReportResponse.builder()
                .reportType(request.getReportType())
                .format(request.getFormat())
                .status(ReportStatus.FAILED)
                .errorMessage(e.getMessage())
                .generatedAt(System.currentTimeMillis())
                .build();
        }
    }

    @Override
    public ReportResponse getReport(String reportId, TenantId tenantId) {
        // TODO: Implement report retrieval from storage
        log.warn("[{}] Report retrieval not yet implemented: {}", tenantId, reportId);
        return null;
    }
    
    /**
     * Get file extension based on format
     */
    private String getFileExtension(ReportFormat format) {
        switch (format) {
            case PDF:
                return "pdf";
            case EXCEL:
                return "xlsx";
            case CSV:
                return "csv";
            default:
                return "txt";
        }
    }

    @Override
    public Map<String, Object> getLatestTelemetry(EntityId entityId, List<String> keys) {
        try {
            List<TsKvEntry> entries = timeseriesService.findLatest(
                TenantId.SYS_TENANT_ID, 
                entityId, 
                keys
            ).get();

            return entries.stream()
                .filter(entry -> {
                    // Filter out entries with no value
                    return entry.getDoubleValue().isPresent() || 
                           entry.getLongValue().isPresent() || 
                           entry.getStrValue().isPresent() ||
                           entry.getBooleanValue().isPresent();
                })
                .collect(Collectors.toMap(
                    TsKvEntry::getKey,
                    entry -> {
                        if (entry.getDoubleValue().isPresent()) {
                            return entry.getDoubleValue().get();
                        } else if (entry.getLongValue().isPresent()) {
                            return entry.getLongValue().get();
                        } else if (entry.getStrValue().isPresent()) {
                            return entry.getStrValue().get();
                        } else if (entry.getBooleanValue().isPresent()) {
                            return entry.getBooleanValue().get();
                        }
                        return 0.0; // Default value (should never reach here due to filter)
                    }
                ));
        } catch (InterruptedException | ExecutionException e) {
            log.error("Error getting latest telemetry for entity: {}", entityId, e);
            return Map.of();
        }
    }

    @Override
    public List<TsKvEntry> getHistoricalTelemetry(
            DeviceId deviceId, 
            List<String> keys, 
            long startTs, 
            long endTs) {
        
        try {
            // Create a query for each key
            List<ReadTsKvQuery> queries = keys.stream()
                .map(key -> (ReadTsKvQuery) new BaseReadTsKvQuery(key, startTs, endTs, 0, 10000, Aggregation.NONE))
                .collect(Collectors.toList());
            
            return timeseriesService.findAll(
                TenantId.SYS_TENANT_ID,
                deviceId,
                queries
            ).get();
        } catch (InterruptedException | ExecutionException e) {
            log.error("Error getting historical telemetry for device: {}", deviceId, e);
            return List.of();
        }
    }
}
