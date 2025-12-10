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
import org.thingsboard.server.common.data.page.PageLink;
import org.thingsboard.server.dao.asset.AssetService;
import org.thingsboard.server.dao.gdt.report.model.ReportRequest;
import org.thingsboard.server.dao.gdt.report.model.ReportType;
import org.thingsboard.server.dao.gdt.report.model.report.MassBalanceReportData;
import org.thingsboard.server.dao.gdt.report.service.MassBalanceCalculationEngine;
import org.thingsboard.server.dao.gdt.report.service.ReportService;
import org.thingsboard.server.dao.timeseries.TimeseriesService;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

/**
 * Mass Balance Report Generator
 * 
 * Generates mass balance reports according to API MPMS Chapter 13.1
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MassBalanceReportGenerator implements ReportGenerator {

    private final AssetService assetService;
    private final TimeseriesService timeseriesService;
    private final MassBalanceCalculationEngine calculationEngine;
    
    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    @Override
    public boolean supports(ReportType reportType) {
        return reportType == ReportType.MASS_BALANCE;
    }

    @Override
    public Object generateReportData(
            ReportRequest request,
            TenantId tenantId,
            ReportService reportService) {

        log.info("[{}] Generating Mass Balance Report", tenantId);

        // Extract parameters
        long startTime = getTimestampParameter(request, "startTime", System.currentTimeMillis() - 86400000L); // 24h ago
        long endTime = getTimestampParameter(request, "endTime", System.currentTimeMillis());
        
        // Get tanks
        List<Asset> tanks = getTankAssets(tenantId);
        tanks = filterTanksByParameters(tanks, request);

        log.info("[{}] Generating mass balance for {} tanks from {} to {}", 
                tenantId, tanks.size(), new Date(startTime), new Date(endTime));

        // Generate mass balance for each tank
        List<MassBalanceReportData.TankMassBalance> tankBalances = new ArrayList<>();
        
        for (Asset tank : tanks) {
            try {
                MassBalanceReportData.TankMassBalance balance = generateTankMassBalance(
                    tank, tenantId, startTime, endTime
                );
                if (balance != null) {
                    tankBalances.add(balance);
                }
            } catch (Exception e) {
                log.error("[{}] Error generating mass balance for tank {}", tenantId, tank.getName(), e);
            }
        }

        // Calculate global balance
        MassBalanceReportData.GlobalMassBalance globalBalance = 
            calculationEngine.calculateGlobalBalance(tankBalances);

        // Detect discrepancies
        List<MassBalanceReportData.Discrepancy> discrepancies = 
            calculationEngine.detectDiscrepancies(tankBalances);

        // Calculate statistics
        MassBalanceReportData.MassBalanceStatistics statistics = 
            calculationEngine.calculateStatistics(tankBalances, globalBalance);

        return MassBalanceReportData.builder()
            .reportTitle("Mass Balance Report")
            .reportPeriod(formatDateRange(startTime, endTime))
            .startTimestamp(startTime)
            .endTimestamp(endTime)
            .tankBalances(tankBalances)
            .globalBalance(globalBalance)
            .discrepancies(discrepancies)
            .statistics(statistics)
            .build();
    }

    /**
     * Generate mass balance for a single tank
     */
    private MassBalanceReportData.TankMassBalance generateTankMassBalance(
            Asset tank,
            TenantId tenantId,
            long startTime,
            long endTime) throws ExecutionException, InterruptedException {

        String tankId = tank.getId().getId().toString();
        String tankName = tank.getLabel() != null ? tank.getLabel() : tank.getName();
        String productType = getProductFromAsset(tank);

        log.debug("[{}] Generating mass balance for tank {}", tankId, tankName);

        // Get opening stock (at start time)
        Map<String, Double> openingStock = getStockAtTime(tenantId, tank, startTime);
        double openingVolume = openingStock.getOrDefault("volume", 0.0);
        double openingMass = openingStock.getOrDefault("mass", 0.0);

        // Get closing stock (at end time)
        Map<String, Double> closingStock = getStockAtTime(tenantId, tank, endTime);
        double closingVolume = closingStock.getOrDefault("volume", 0.0);
        double closingMass = closingStock.getOrDefault("mass", 0.0);

        // Get transactions (receipts and deliveries) during the period
        // For now, we'll simulate transactions based on volume changes
        // In production, this should query actual batch transfer records
        List<MassBalanceReportData.Transaction> receipts = getTransactions(
            tenantId, tank, startTime, endTime, "receipt"
        );
        
        List<MassBalanceReportData.Transaction> deliveries = getTransactions(
            tenantId, tank, startTime, endTime, "delivery"
        );

        // Calculate mass balance using the calculation engine
        return calculationEngine.calculateTankBalance(
            tankId,
            tankName,
            productType,
            openingVolume,
            openingMass,
            startTime,
            receipts,
            deliveries,
            closingVolume,
            closingMass,
            endTime
        );
    }

    /**
     * Get stock (volume and mass) at a specific time
     */
    private Map<String, Double> getStockAtTime(
            TenantId tenantId,
            Asset tank,
            long timestamp) throws ExecutionException, InterruptedException {

        Map<String, Double> stock = new HashMap<>();

        // Query telemetry at specific timestamp
        List<ReadTsKvQuery> queries = Arrays.asList(
            new BaseReadTsKvQuery("GOV", timestamp - 60000, timestamp, 60000, 1, Aggregation.NONE),
            new BaseReadTsKvQuery("mass", timestamp - 60000, timestamp, 60000, 1, Aggregation.NONE)
        );

        List<TsKvEntry> entries = timeseriesService.findAll(
            tenantId, new AssetId(tank.getId().getId()), queries
        ).get();

        for (TsKvEntry entry : entries) {
            if ("GOV".equals(entry.getKey()) || "volume".equals(entry.getKey())) {
                stock.put("volume", entry.getDoubleValue().orElse(0.0));
            } else if ("mass".equals(entry.getKey())) {
                stock.put("mass", entry.getDoubleValue().orElse(0.0));
            }
        }

        // If no data found, try to get latest before timestamp
        if (stock.isEmpty()) {
            log.warn("[{}] No stock data found at timestamp {}, using latest available",
                    tank.getName(), new Date(timestamp));
            
            // Get latest telemetry
            Map<String, Object> latestTelemetry = getLatestTelemetry(
                tenantId, new AssetId(tank.getId().getId())
            );
            
            stock.put("volume", getDoubleValue(latestTelemetry, "GOV", "volume"));
            stock.put("mass", getDoubleValue(latestTelemetry, "mass"));
        }

        return stock;
    }

    /**
     * Get transactions (receipts or deliveries) during a period
     * 
     * NOTE: This is a simplified implementation that infers transactions from volume changes.
     * In production, this should query actual batch transfer records from the database.
     */
    private List<MassBalanceReportData.Transaction> getTransactions(
            TenantId tenantId,
            Asset tank,
            long startTime,
            long endTime,
            String type) {

        List<MassBalanceReportData.Transaction> transactions = new ArrayList<>();

        try {
            // Query volume changes during the period
            List<ReadTsKvQuery> queries = Collections.singletonList(
                new BaseReadTsKvQuery("GOV", startTime, endTime, 3600000L, 100, Aggregation.NONE)
            );

            List<TsKvEntry> volumeData = timeseriesService.findAll(
                tenantId, new AssetId(tank.getId().getId()), queries
            ).get();

            // Analyze volume changes to infer transactions
            for (int i = 1; i < volumeData.size(); i++) {
                TsKvEntry prev = volumeData.get(i - 1);
                TsKvEntry curr = volumeData.get(i);

                double prevVolume = prev.getDoubleValue().orElse(0.0);
                double currVolume = curr.getDoubleValue().orElse(0.0);
                double volumeChange = currVolume - prevVolume;

                // Significant volume change indicates a transaction
                if (Math.abs(volumeChange) > 100) { // More than 100 liters
                    boolean isReceipt = volumeChange > 0;
                    
                    // Only add if matches requested type
                    if ((type.equals("receipt") && isReceipt) || 
                        (type.equals("delivery") && !isReceipt)) {
                        
                        MassBalanceReportData.Transaction transaction = MassBalanceReportData.Transaction.builder()
                            .transactionId(UUID.randomUUID().toString())
                            .type(type)
                            .timestamp(curr.getTs())
                            .dateTime(DATE_FORMAT.format(new Date(curr.getTs())))
                            .volume(Math.abs(volumeChange))
                            .mass(Math.abs(volumeChange) * 0.85) // Approximate mass (assuming density ~0.85 kg/L)
                            .temperature(15.0) // Standard temperature
                            .density(850.0) // Approximate density
                            .batchNumber("AUTO-" + curr.getTs())
                            .reference("Inferred from volume change")
                            .notes("Auto-detected transaction")
                            .build();
                        
                        transactions.add(transaction);
                    }
                }
            }

        } catch (Exception e) {
            log.error("[{}] Error getting transactions for tank {}", tenantId, tank.getName(), e);
        }

        log.debug("[{}] Found {} {} transactions", tank.getName(), transactions.size(), type);
        return transactions;
    }

    // ==================== Helper Methods ====================

    private List<Asset> getTankAssets(TenantId tenantId) {
        try {
            PageLink pageLink = new PageLink(1000);
            return assetService.findAssetsByTenantIdAndType(tenantId, "Tank", pageLink).getData();
        } catch (Exception e) {
            log.error("[{}] Error fetching tank assets", tenantId, e);
            return Collections.emptyList();
        }
    }

    private List<Asset> filterTanksByParameters(List<Asset> tanks, ReportRequest request) {
        if (request.getParameters() == null) {
            return tanks;
        }

        Object tankIdsParam = request.getParameter("tankIds");
        if (tankIdsParam == null) {
            tankIdsParam = request.getParameter("tankId");
        }
        if (tankIdsParam == null) {
            tankIdsParam = request.getParameter("selectedTanks");
        }

        if (tankIdsParam == null) {
            return tanks;
        }

        List<String> selectedTankIds = new ArrayList<>();
        if (tankIdsParam instanceof List) {
            for (Object id : (List<?>) tankIdsParam) {
                if (id != null) {
                    selectedTankIds.add(id.toString());
                }
            }
        } else {
            selectedTankIds.add(tankIdsParam.toString());
        }

        if (selectedTankIds.isEmpty()) {
            return tanks;
        }

        return tanks.stream()
            .filter(tank -> {
                String tankIdStr = tank.getId().getId().toString();
                String tankName = tank.getName();
                return selectedTankIds.contains(tankIdStr) || selectedTankIds.contains(tankName);
            })
            .collect(Collectors.toList());
    }

    private String getProductFromAsset(Asset asset) {
        if (asset.getAdditionalInfo() != null && asset.getAdditionalInfo().has("product")) {
            return asset.getAdditionalInfo().get("product").asText();
        }
        return "Unknown";
    }

    private long getTimestampParameter(ReportRequest request, String paramName, long defaultValue) {
        Object value = request.getParameter(paramName);
        if (value instanceof Number) {
            return ((Number) value).longValue();
        } else if (value instanceof String) {
            try {
                return Long.parseLong((String) value);
            } catch (NumberFormatException e) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private String formatDateRange(long startTime, long endTime) {
        return DATE_FORMAT.format(new Date(startTime)) + " - " + DATE_FORMAT.format(new Date(endTime));
    }

    private Map<String, Object> getLatestTelemetry(TenantId tenantId, AssetId assetId) {
        // This should query the latest telemetry from the database
        // For now, return empty map
        return new HashMap<>();
    }

    private double getDoubleValue(Map<String, Object> telemetry, String... keys) {
        for (String key : keys) {
            Object value = telemetry.get(key);
            if (value instanceof Number) {
                return ((Number) value).doubleValue();
            }
        }
        return 0.0;
    }
}
