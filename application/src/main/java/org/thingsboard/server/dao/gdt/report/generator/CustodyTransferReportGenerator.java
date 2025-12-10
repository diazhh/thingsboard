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
package org.thingsboard.server.dao.gdt.report.generator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.thingsboard.server.common.data.asset.Asset;
import org.thingsboard.server.common.data.id.AssetId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.kv.Aggregation;
import org.thingsboard.server.common.data.kv.BaseReadTsKvQuery;
import org.thingsboard.server.common.data.kv.ReadTsKvQuery;
import org.thingsboard.server.common.data.kv.TsKvEntry;
import org.thingsboard.server.dao.asset.AssetService;
import org.thingsboard.server.dao.gdt.report.model.ReportRequest;
import org.thingsboard.server.dao.gdt.report.model.ReportType;
import org.thingsboard.server.dao.gdt.report.model.report.BatchHistoryReportData;
import org.thingsboard.server.dao.gdt.report.model.report.DailyInventoryReportData;
import org.thingsboard.server.dao.gdt.report.service.ReportService;
import org.thingsboard.server.dao.timeseries.TimeseriesService;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

/**
 * Custody Transfer Report Generator
 * Handles: BATCH_TRANSFER, BATCH_HISTORY, TRANSFER_RECONCILIATION
 * Note: MASS_BALANCE is handled by MassBalanceReportGenerator
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CustodyTransferReportGenerator implements ReportGenerator {

    private final AssetService assetService;
    private final TimeseriesService timeseriesService;
    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    @Override
    public boolean supports(ReportType reportType) {
        return reportType == ReportType.BATCH_TRANSFER ||
               reportType == ReportType.BATCH_HISTORY ||
               reportType == ReportType.TRANSFER_RECONCILIATION;
    }

    @Override
    public Object generateReportData(
            ReportRequest request,
            TenantId tenantId,
            ReportService reportService) {

        log.info("[{}] Generating custody transfer report: {}", tenantId, request.getReportType());

        switch (request.getReportType()) {
            case BATCH_TRANSFER:
                return generateBatchTransfer(request, tenantId, reportService);
            case BATCH_HISTORY:
                return generateBatchHistory(request, tenantId, reportService);
            case TRANSFER_RECONCILIATION:
                return generateTransferReconciliation(request, tenantId, reportService);
            default:
                throw new IllegalArgumentException(
                    "Unsupported report type: " + request.getReportType());
        }
    }

    /**
     * Generate Batch Transfer Report
     * Shows active batch transfers with opening/closing volumes
     */
    private DailyInventoryReportData generateBatchTransfer(
            ReportRequest request,
            TenantId tenantId,
            ReportService reportService) {

        log.info("[{}] Generating batch transfer report", tenantId);

        // TODO: Implement proper batch transfer data retrieval
        // Should query batch transfer events and calculate volumes
        // Include: batch number, start/end time, volumes, temperatures

        return DailyInventoryReportData.builder()
                .reportDate(System.currentTimeMillis())
                .generatedAt(System.currentTimeMillis())
                .tanks(new java.util.ArrayList<>())
                .build();
    }

    /**
     * Generate Batch History Report
     * Shows historical batch transfers with full details
     */
    private BatchHistoryReportData generateBatchHistory(
            ReportRequest request,
            TenantId tenantId,
            ReportService reportService) {

        log.info("[{}] Generating batch history report", tenantId);

        Long startTimeParam = request.getParameterAsLong("startTime");
        Long endTimeParam = request.getParameterAsLong("endTime");
        
        final long startTime = startTimeParam != null ? startTimeParam : System.currentTimeMillis() - 86400000L; // 24 hours ago
        final long endTime = endTimeParam != null ? endTimeParam : System.currentTimeMillis();

        List<BatchHistoryReportData.BatchTransfer> batches = new ArrayList<>();
        
        try {
            // Get all tanks
            List<Asset> tanks = assetService.findAssetsByTenantIdAndType(tenantId, "tank", null).getData();
            
            log.info("[{}] Found {} tanks for batch history", tenantId, tanks.size());
            
            // Query batch transfer data from telemetry
            for (Asset tank : tanks) {
                try {
                    AssetId assetId = tank.getId();
                    
                    // Query batch-related telemetry keys
                    List<String> keys = Arrays.asList(
                        "batch_number", "batch_status", "batch_start_time", "batch_end_time",
                        "batch_volume", "batch_destination", "batch_operator"
                    );
                    
                    List<ReadTsKvQuery> queries = keys.stream()
                        .map(key -> new BaseReadTsKvQuery(key, startTime, endTime, 0, 1000, Aggregation.NONE))
                        .collect(Collectors.toList());
                    
                    List<TsKvEntry> tsData = timeseriesService.findAll(tenantId, assetId, queries).get();
                    
                    // Group by batch_number to create batch records
                    Map<String, List<TsKvEntry>> batchGroups = tsData.stream()
                        .filter(entry -> entry.getKey().equals("batch_number") && entry.getValueAsString() != null)
                        .collect(Collectors.groupingBy(TsKvEntry::getValueAsString));
                    
                    for (Map.Entry<String, List<TsKvEntry>> batchGroup : batchGroups.entrySet()) {
                        String batchNumber = batchGroup.getKey();
                        long batchTimestamp = batchGroup.getValue().get(0).getTs();
                        
                        // Get batch details at this timestamp
                        BatchHistoryReportData.BatchTransfer batch = createBatchFromTelemetry(
                            tank, batchNumber, batchTimestamp, tsData
                        );
                        
                        batches.add(batch);
                    }
                } catch (Exception e) {
                    log.warn("[{}] Error processing batch data for tank {}: {}", 
                        tenantId, tank.getName(), e.getMessage());
                }
            }
            
        } catch (Exception e) {
            log.error("[{}] Error generating batch history report: {}", tenantId, e.getMessage(), e);
        }
        
        // Calculate statistics
        BatchHistoryReportData.BatchStatistics statistics = calculateBatchStatistics(batches);
        
        return BatchHistoryReportData.builder()
                .reportTitle("Batch History Report")
                .reportPeriod(formatDateRange(startTime, endTime))
                .startTimestamp(startTime)
                .endTimestamp(endTime)
                .generatedAt(System.currentTimeMillis())
                .batches(batches)
                .statistics(statistics)
                .build();
    }
    
    private BatchHistoryReportData.BatchTransfer createBatchFromTelemetry(
            Asset tank, String batchNumber, long timestamp, List<TsKvEntry> allData) {
        
        // Helper to find telemetry value at specific timestamp
        java.util.function.Function<String, Optional<TsKvEntry>> findValue = (key) -> allData.stream()
            .filter(e -> e.getKey().equals(key) && Math.abs(e.getTs() - timestamp) < 60000) // Within 1 minute
            .findFirst();
        
        String status = findValue.apply("batch_status")
            .map(TsKvEntry::getValueAsString)
            .orElse("COMPLETED");
        
        Double volume = findValue.apply("batch_volume")
            .map(e -> e.getDoubleValue().orElse(0.0))
            .orElse(0.0);
        
        String destination = findValue.apply("batch_destination")
            .map(TsKvEntry::getValueAsString)
            .orElse("Unknown");
        
        String operator = findValue.apply("batch_operator")
            .map(TsKvEntry::getValueAsString)
            .orElse("System");
        
        return BatchHistoryReportData.BatchTransfer.builder()
                .batchNumber(batchNumber)
                .tankName(tank.getName())
                .product(tank.getLabel() != null ? tank.getLabel() : "Unknown")
                .startTime(timestamp)
                .endTime(timestamp + 3600000) // Assume 1 hour duration if not specified
                .startDateTime(DATE_FORMAT.format(new Date(timestamp)))
                .endDateTime(DATE_FORMAT.format(new Date(timestamp + 3600000)))
                .openingVolume(volume)
                .closingVolume(0.0)
                .transferredVolume(volume)
                .openingTemperature(20.0)
                .closingTemperature(20.0)
                .avgTemperature(20.0)
                .destination(destination)
                .status(status)
                .operator(operator)
                .notes("Batch transfer completed")
                .build();
    }
    
    private BatchHistoryReportData.BatchStatistics calculateBatchStatistics(
            List<BatchHistoryReportData.BatchTransfer> batches) {
        
        if (batches.isEmpty()) {
            return BatchHistoryReportData.BatchStatistics.builder()
                    .totalBatches(0)
                    .completedBatches(0)
                    .inProgressBatches(0)
                    .cancelledBatches(0)
                    .totalVolumeTransferred(0.0)
                    .avgBatchVolume(0.0)
                    .minBatchVolume(0.0)
                    .maxBatchVolume(0.0)
                    .avgBatchDuration(0L)
                    .build();
        }
        
        int completed = (int) batches.stream()
            .filter(b -> "COMPLETED".equals(b.getStatus()))
            .count();
        
        int inProgress = (int) batches.stream()
            .filter(b -> "IN_PROGRESS".equals(b.getStatus()))
            .count();
        
        int cancelled = (int) batches.stream()
            .filter(b -> "CANCELLED".equals(b.getStatus()))
            .count();
        
        double totalVolume = batches.stream()
            .mapToDouble(b -> b.getTransferredVolume() != null ? b.getTransferredVolume() : 0.0)
            .sum();
        
        double avgVolume = totalVolume / batches.size();
        
        double minVolume = batches.stream()
            .mapToDouble(b -> b.getTransferredVolume() != null ? b.getTransferredVolume() : 0.0)
            .min()
            .orElse(0.0);
        
        double maxVolume = batches.stream()
            .mapToDouble(b -> b.getTransferredVolume() != null ? b.getTransferredVolume() : 0.0)
            .max()
            .orElse(0.0);
        
        long avgDuration = (long) batches.stream()
            .mapToLong(b -> b.getEndTime() - b.getStartTime())
            .average()
            .orElse(0.0);
        
        return BatchHistoryReportData.BatchStatistics.builder()
                .totalBatches(batches.size())
                .completedBatches(completed)
                .inProgressBatches(inProgress)
                .cancelledBatches(cancelled)
                .totalVolumeTransferred(totalVolume)
                .avgBatchVolume(avgVolume)
                .minBatchVolume(minVolume)
                .maxBatchVolume(maxVolume)
                .avgBatchDuration(avgDuration)
                .build();
    }
    
    private String formatDateRange(long startTime, long endTime) {
        return DATE_FORMAT.format(new Date(startTime)) + " - " + DATE_FORMAT.format(new Date(endTime));
    }

    /**
     * Generate Transfer Reconciliation Report
     * Compares expected vs actual volumes in transfers
     */
    private DailyInventoryReportData generateTransferReconciliation(
            ReportRequest request,
            TenantId tenantId,
            ReportService reportService) {

        log.info("[{}] Generating transfer reconciliation report", tenantId);

        // TODO: Implement transfer reconciliation logic
        // Should compare planned vs actual transfer volumes
        // Calculate discrepancies and flag issues

        return DailyInventoryReportData.builder()
                .reportDate(System.currentTimeMillis())
                .generatedAt(System.currentTimeMillis())
                .tanks(new java.util.ArrayList<>())
                .build();
    }
}
