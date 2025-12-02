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
import org.thingsboard.server.common.data.Device;
import org.thingsboard.server.common.data.asset.Asset;
import org.thingsboard.server.common.data.id.AssetId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.page.PageLink;
import org.thingsboard.server.dao.asset.AssetService;
import org.thingsboard.server.dao.device.DeviceService;
import org.thingsboard.server.dao.gdt.report.model.ReportRequest;
import org.thingsboard.server.dao.gdt.report.model.ReportType;
import org.thingsboard.server.dao.gdt.report.model.report.DailyInventoryReportData;
import org.thingsboard.server.dao.gdt.report.service.ReportService;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Inventory Report Generator
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryReportGenerator implements ReportGenerator {

    private final DeviceService deviceService;
    private final AssetService assetService;

    @Override
    public boolean supports(ReportType reportType) {
        return reportType == ReportType.DAILY_INVENTORY ||
               reportType == ReportType.TANK_INVENTORY_SUMMARY ||
               reportType == ReportType.PRODUCT_INVENTORY_BY_GROUP ||
               reportType == ReportType.TANK_STATUS ||
               reportType == ReportType.CAPACITY_UTILIZATION ||
               reportType == ReportType.LOW_STOCK_ALERT ||
               reportType == ReportType.OVERFILL_RISK;
    }

    @Override
    public Object generateReportData(
            ReportRequest request, 
            TenantId tenantId, 
            ReportService reportService) {

        switch (request.getReportType()) {
            case DAILY_INVENTORY:
                return generateDailyInventory(request, tenantId, reportService);
            case TANK_INVENTORY_SUMMARY:
                return generateTankInventorySummary(request, tenantId, reportService);
            // TODO: Implement other report types
            default:
                throw new IllegalArgumentException(
                    "Unsupported report type: " + request.getReportType());
        }
    }

    /**
     * Generate Daily Inventory Report
     */
    private DailyInventoryReportData generateDailyInventory(
            ReportRequest request, 
            TenantId tenantId, 
            ReportService reportService) {

        log.info("[{}] Generating Daily Inventory Report", tenantId);
        log.info("[{}] Request parameters: {}", tenantId, request.getParameters());

        // 1. Get all tank assets
        List<Asset> allTanks = getTankAssets(tenantId);
        log.info("[{}] Found {} tank assets", tenantId, allTanks.size());

        // 2. Filter by selected tanks if specified in parameters
        List<Asset> tanks = filterTanksByParameters(allTanks, request);
        log.info("[{}] After filtering: {} tank assets", tenantId, tanks.size());

        // 2. Collect data from each tank
        List<DailyInventoryReportData.TankInventoryData> tankDataList = tanks.stream()
            .map(tank -> {
                // Get telemetry from asset (already calculated by Rule Chain)
                Map<String, Object> telemetry = reportService.getLatestTelemetry(
                    new AssetId(tank.getId().getId()),
                    Arrays.asList("level", "BTemprise", "TOV", "GOV", "GSV", 
                                "NSV", "density", "mass", "capacity", "volume",
                                "bsw_manual", "level_rate")
                );

                log.info("[{}] Tank {} telemetry keys: {}", tenantId, tank.getName(), telemetry.keySet());
                log.info("[{}] Tank {} telemetry values: {}", tenantId, tank.getName(), telemetry);

                // Try both uppercase and lowercase keys for compatibility
                double level = getDoubleValueCaseInsensitive(telemetry, "level");
                double temperature = getDoubleValueCaseInsensitive(telemetry, "BTemprise");
                double tov = getDoubleValueCaseInsensitive(telemetry, "TOV", "volume");
                double gov = getDoubleValueCaseInsensitive(telemetry, "GOV");
                double gsv = getDoubleValueCaseInsensitive(telemetry, "GSV");
                double nsv = getDoubleValueCaseInsensitive(telemetry, "NSV");

                return DailyInventoryReportData.TankInventoryData.builder()
                    .tankId(tank.getName())
                    .tankName(tank.getLabel() != null ? tank.getLabel() : tank.getName())
                    .product(getProductFromAsset(tank))
                    .level(level)
                    .temperature(temperature)
                    .tov(tov)
                    .gov(gov)
                    .gsv(gsv)
                    .nsv(nsv)
                    .density(getDoubleValue(telemetry, "density"))
                    .mass(getDoubleValue(telemetry, "mass"))
                    .capacity(getDoubleValue(telemetry, "capacity"))
                    .utilization(calculateUtilization(telemetry))
                    .status(determineStatus(telemetry))
                    .lastUpdate(System.currentTimeMillis())
                    .build();
            })
            .collect(Collectors.toList());

        // 3. Calculate totals
        double totalVolume = tankDataList.stream()
            .mapToDouble(DailyInventoryReportData.TankInventoryData::getTov)
            .sum();

        double totalCapacity = tankDataList.stream()
            .mapToDouble(DailyInventoryReportData.TankInventoryData::getCapacity)
            .sum();

        double averageUtilization = totalCapacity > 0 
            ? (totalVolume / totalCapacity) * 100 
            : 0;

        long activeTanks = tankDataList.stream()
            .filter(t -> "ACTIVE".equals(t.getStatus()))
            .count();

        // 4. Build response
        return DailyInventoryReportData.builder()
            .reportDate(System.currentTimeMillis())
            .generatedAt(System.currentTimeMillis())
            .totalTanks(tanks.size())
            .activeTanks((int) activeTanks)
            .totalVolume(totalVolume)
            .totalCapacity(totalCapacity)
            .averageUtilization(averageUtilization)
            .tanks(tankDataList)
            .summary(generateSummary(tankDataList))
            .build();
    }

    /**
     * Generate Tank Inventory Summary
     */
    private DailyInventoryReportData generateTankInventorySummary(
            ReportRequest request, 
            TenantId tenantId, 
            ReportService reportService) {
        
        // For now, use same logic as Daily Inventory
        return generateDailyInventory(request, tenantId, reportService);
    }

    // ==================== Helper Methods ====================

    /**
     * Filter tanks by request parameters
     */
    private List<Asset> filterTanksByParameters(List<Asset> tanks, ReportRequest request) {
        if (request.getParameters() == null) {
            log.info("No parameters provided, returning all tanks");
            return tanks;
        }

        // Check for tankIds parameter (array or single value)
        Object tankIdsParam = request.getParameter("tankIds");
        if (tankIdsParam == null) {
            tankIdsParam = request.getParameter("tankId");
        }
        if (tankIdsParam == null) {
            tankIdsParam = request.getParameter("selectedTanks");
        }

        if (tankIdsParam == null) {
            log.info("No tank filter specified, returning all tanks");
            return tanks;
        }

        // Convert to list of IDs
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
            log.info("Empty tank filter, returning all tanks");
            return tanks;
        }

        log.info("Filtering tanks by {} IDs: {}", selectedTankIds.size(), selectedTankIds);

        // Filter tanks by ID
        List<Asset> filtered = tanks.stream()
            .filter(tank -> {
                String tankIdStr = tank.getId().getId().toString();
                String tankName = tank.getName();
                boolean matches = selectedTankIds.contains(tankIdStr) || 
                                selectedTankIds.contains(tankName);
                log.info("Tank {} (ID: {}): {}", tankName, tankIdStr, matches ? "INCLUDED" : "EXCLUDED");
                return matches;
            })
            .collect(Collectors.toList());

        log.info("Filtered result: {} tanks", filtered.size());
        return filtered;
    }

    /**
     * Get all tank assets for tenant
     */
    private List<Asset> getTankAssets(TenantId tenantId) {
        try {
            // Get assets with type "Tank"
            return assetService.findAssetsByTenantId(tenantId, new PageLink(1000))
                .getData()
                .stream()
                .filter(asset -> asset.getType().equals("Tank"))
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("[{}] Error getting tank assets", tenantId, e);
            return List.of();
        }
    }

    /**
     * Get all tank devices for tenant (legacy method, kept for compatibility)
     */
    private List<Device> getTankDevices(TenantId tenantId) {
        try {
            // Get devices with type "Radar_TRL2" (radar gauges)
            return deviceService.findDevicesByTenantId(tenantId, new PageLink(1000))
                .getData()
                .stream()
                .filter(device -> device.getType().equals("Radar_TRL2") || 
                                device.getType().equals("Tank") ||
                                device.getType().equals("default"))
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("[{}] Error getting tank devices", tenantId, e);
            return List.of();
        }
    }

    /**
     * Get product from asset attributes
     */
    private String getProductFromAsset(Asset asset) {
        // TODO: Get from asset attributes
        return "Diesel";
    }

    /**
     * Get product from device attributes (legacy method)
     */
    private String getProductFromDevice(Device device) {
        // TODO: Get from device attributes
        return "Crude Oil";
    }

    /**
     * Get double value from telemetry map
     */
    private double getDoubleValue(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return 0.0;
    }

    /**
     * Get double value from telemetry map (case-insensitive, with fallback keys)
     */
    private double getDoubleValueCaseInsensitive(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            // Try exact match first
            Object value = data.get(key);
            if (value instanceof Number) {
                return ((Number) value).doubleValue();
            }
            
            // Try case-insensitive match
            for (Map.Entry<String, Object> entry : data.entrySet()) {
                if (entry.getKey().equalsIgnoreCase(key) && entry.getValue() instanceof Number) {
                    return ((Number) entry.getValue()).doubleValue();
                }
            }
        }
        return 0.0;
    }

    /**
     * Calculate utilization percentage
     */
    private double calculateUtilization(Map<String, Object> telemetry) {
        double tov = getDoubleValue(telemetry, "tov");
        double capacity = getDoubleValue(telemetry, "capacity");
        return capacity > 0 ? (tov / capacity) * 100 : 0;
    }

    /**
     * Determine tank status
     */
    private String determineStatus(Map<String, Object> telemetry) {
        double utilization = calculateUtilization(telemetry);
        if (utilization > 90) {
            return "HIGH";
        } else if (utilization < 10) {
            return "LOW";
        }
        return "ACTIVE";
    }

    /**
     * Generate summary by product and status
     */
    private Map<String, Object> generateSummary(
            List<DailyInventoryReportData.TankInventoryData> tanks) {
        
        Map<String, Object> summary = new HashMap<>();
        
        // Group by product
        Map<String, Double> byProduct = tanks.stream()
            .collect(Collectors.groupingBy(
                DailyInventoryReportData.TankInventoryData::getProduct,
                Collectors.summingDouble(DailyInventoryReportData.TankInventoryData::getTov)
            ));
        summary.put("byProduct", byProduct);
        
        // Group by status
        Map<String, Long> byStatus = tanks.stream()
            .collect(Collectors.groupingBy(
                DailyInventoryReportData.TankInventoryData::getStatus,
                Collectors.counting()
            ));
        summary.put("byStatus", byStatus);
        
        return summary;
    }
}
