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
import org.thingsboard.server.common.data.alarm.Alarm;
import org.thingsboard.server.common.data.alarm.AlarmInfo;
import org.thingsboard.server.common.data.alarm.AlarmQuery;
import org.thingsboard.server.common.data.alarm.AlarmSearchStatus;
import org.thingsboard.server.common.data.alarm.AlarmSeverity;
import org.thingsboard.server.common.data.alarm.AlarmStatus;
import org.thingsboard.server.common.data.asset.Asset;
import org.thingsboard.server.common.data.id.AssetId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.kv.Aggregation;
import org.thingsboard.server.common.data.kv.BaseReadTsKvQuery;
import org.thingsboard.server.common.data.kv.ReadTsKvQuery;
import org.thingsboard.server.common.data.kv.TsKvEntry;
import org.thingsboard.server.common.data.page.PageLink;
import org.thingsboard.server.common.data.page.TimePageLink;
import org.thingsboard.server.dao.alarm.AlarmService;
import org.thingsboard.server.dao.asset.AssetService;
import org.thingsboard.server.dao.gdt.report.model.ReportRequest;
import org.thingsboard.server.dao.gdt.report.model.ReportType;
import org.thingsboard.server.dao.gdt.report.model.report.AlarmHistoryReportData;
import org.thingsboard.server.dao.gdt.report.model.report.HistoricalLevelTrendsReportData;
import org.thingsboard.server.dao.gdt.report.model.report.HistoricalVolumeTrendsReportData;
import org.thingsboard.server.dao.gdt.report.model.report.TemperatureProfileReportData;
import org.thingsboard.server.dao.gdt.report.service.ReportService;
import org.thingsboard.server.dao.timeseries.TimeseriesService;

import java.text.SimpleDateFormat;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

/**
 * Historical Report Generator
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HistoricalReportGenerator implements ReportGenerator {

    private final AssetService assetService;
    private final TimeseriesService timeseriesService;
    private final AlarmService alarmService;
    
    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    @Override
    public boolean supports(ReportType reportType) {
        return reportType == ReportType.HISTORICAL_LEVEL_TRENDS ||
               reportType == ReportType.HISTORICAL_VOLUME_TRENDS ||
               reportType == ReportType.TEMPERATURE_PROFILE ||
               reportType == ReportType.ALARM_HISTORY ||
               reportType == ReportType.EVENT_LOG ||
               reportType == ReportType.CONFIGURATION_CHANGE_HISTORY ||
               reportType == ReportType.PERFORMANCE_METRICS;
    }

    @Override
    public Object generateReportData(
            ReportRequest request,
            TenantId tenantId,
            ReportService reportService) {

        switch (request.getReportType()) {
            case HISTORICAL_LEVEL_TRENDS:
                return generateHistoricalLevelTrends(request, tenantId);
            case HISTORICAL_VOLUME_TRENDS:
                return generateHistoricalVolumeTrends(request, tenantId);
            case TEMPERATURE_PROFILE:
                return generateTemperatureProfile(request, tenantId);
            case ALARM_HISTORY:
                return generateAlarmHistory(request, tenantId);
            case EVENT_LOG:
                return generateEventLog(request, tenantId);
            case CONFIGURATION_CHANGE_HISTORY:
                return generateConfigurationChangeHistory(request, tenantId);
            case PERFORMANCE_METRICS:
                return generatePerformanceMetrics(request, tenantId);
            default:
                throw new IllegalArgumentException(
                    "Unsupported report type: " + request.getReportType());
        }
    }

    /**
     * Generate Historical Level Trends Report
     */
    private HistoricalLevelTrendsReportData generateHistoricalLevelTrends(
            ReportRequest request,
            TenantId tenantId) {

        log.info("[{}] Generating Historical Level Trends Report", tenantId);

        // Extract parameters
        long startTime = getTimestampParameter(request, "startTime", System.currentTimeMillis() - 86400000L); // 24h ago
        long endTime = getTimestampParameter(request, "endTime", System.currentTimeMillis());
        String interval = getStringParameter(request, "interval", "hourly");
        
        // Get tanks
        List<Asset> tanks = getTankAssets(tenantId);
        tanks = filterTanksByParameters(tanks, request);

        log.info("[{}] Generating level trends for {} tanks from {} to {}", 
                tenantId, tanks.size(), new Date(startTime), new Date(endTime));

        // Generate trends for each tank
        List<HistoricalLevelTrendsReportData.TankLevelTrend> tankTrends = tanks.stream()
            .map(tank -> generateTankLevelTrend(tank, tenantId, startTime, endTime, interval))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        // Calculate statistics
        HistoricalLevelTrendsReportData.TrendStatistics statistics = calculateLevelTrendStatistics(tankTrends);

        return HistoricalLevelTrendsReportData.builder()
            .reportTitle("Historical Level Trends Report")
            .reportPeriod(formatDateRange(startTime, endTime))
            .startTimestamp(startTime)
            .endTimestamp(endTime)
            .aggregationInterval(interval)
            .tankTrends(tankTrends)
            .statistics(statistics)
            .build();
    }

    /**
     * Generate level trend for a single tank
     */
    private HistoricalLevelTrendsReportData.TankLevelTrend generateTankLevelTrend(
            Asset tank,
            TenantId tenantId,
            long startTime,
            long endTime,
            String interval) {

        try {
            // Query historical level data
            List<ReadTsKvQuery> queries = Collections.singletonList(
                new BaseReadTsKvQuery("level", startTime, endTime, 
                    getAggregationInterval(interval), 1000, getAggregation(interval))
            );

            List<TsKvEntry> levelData = timeseriesService.findAll(
                tenantId, new AssetId(tank.getId().getId()), queries
            ).get();

            if (levelData.isEmpty()) {
                log.warn("[{}] No level data found for tank {}", tenantId, tank.getName());
                return null;
            }

            // Convert to data points
            List<HistoricalLevelTrendsReportData.DataPoint> dataPoints = levelData.stream()
                .map(entry -> HistoricalLevelTrendsReportData.DataPoint.builder()
                    .timestamp(entry.getTs())
                    .dateTime(DATE_FORMAT.format(new Date(entry.getTs())))
                    .level(entry.getDoubleValue().orElse(0.0))
                    .avgLevel(entry.getDoubleValue().orElse(0.0))
                    .build())
                .collect(Collectors.toList());

            // Calculate metrics
            HistoricalLevelTrendsReportData.TrendMetrics metrics = calculateLevelMetrics(dataPoints);

            return HistoricalLevelTrendsReportData.TankLevelTrend.builder()
                .tankId(tank.getId().getId().toString())
                .tankName(tank.getLabel() != null ? tank.getLabel() : tank.getName())
                .productType(getProductFromAsset(tank))
                .dataPoints(dataPoints)
                .metrics(metrics)
                .build();

        } catch (InterruptedException | ExecutionException e) {
            log.error("[{}] Error generating level trend for tank {}", tenantId, tank.getName(), e);
            return null;
        }
    }

    /**
     * Generate Historical Volume Trends Report
     */
    private HistoricalVolumeTrendsReportData generateHistoricalVolumeTrends(
            ReportRequest request,
            TenantId tenantId) {

        log.info("[{}] Generating Historical Volume Trends Report", tenantId);

        long startTime = getTimestampParameter(request, "startTime", System.currentTimeMillis() - 86400000L);
        long endTime = getTimestampParameter(request, "endTime", System.currentTimeMillis());
        String interval = getStringParameter(request, "interval", "hourly");
        
        List<Asset> tanks = getTankAssets(tenantId);
        tanks = filterTanksByParameters(tanks, request);

        List<HistoricalVolumeTrendsReportData.TankVolumeTrend> tankTrends = tanks.stream()
            .map(tank -> generateTankVolumeTrend(tank, tenantId, startTime, endTime, interval))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        HistoricalVolumeTrendsReportData.VolumeStatistics statistics = calculateVolumeTrendStatistics(tankTrends);

        return HistoricalVolumeTrendsReportData.builder()
            .reportTitle("Historical Volume Trends Report")
            .reportPeriod(formatDateRange(startTime, endTime))
            .startTimestamp(startTime)
            .endTimestamp(endTime)
            .aggregationInterval(interval)
            .tankTrends(tankTrends)
            .statistics(statistics)
            .build();
    }

    /**
     * Generate volume trend for a single tank
     */
    private HistoricalVolumeTrendsReportData.TankVolumeTrend generateTankVolumeTrend(
            Asset tank,
            TenantId tenantId,
            long startTime,
            long endTime,
            String interval) {

        try {
            List<ReadTsKvQuery> queries = Arrays.asList(
                new BaseReadTsKvQuery("GOV", startTime, endTime, 
                    getAggregationInterval(interval), 1000, getAggregation(interval)),
                new BaseReadTsKvQuery("NSV", startTime, endTime, 
                    getAggregationInterval(interval), 1000, getAggregation(interval))
            );

            List<TsKvEntry> volumeData = timeseriesService.findAll(
                tenantId, new AssetId(tank.getId().getId()), queries
            ).get();

            if (volumeData.isEmpty()) {
                log.warn("[{}] No volume data found for tank {}", tenantId, tank.getName());
                return null;
            }

            // Group by timestamp
            Map<Long, Map<String, Double>> dataByTimestamp = new HashMap<>();
            for (TsKvEntry entry : volumeData) {
                dataByTimestamp.computeIfAbsent(entry.getTs(), k -> new HashMap<>())
                    .put(entry.getKey(), entry.getDoubleValue().orElse(0.0));
            }

            List<HistoricalVolumeTrendsReportData.VolumeDataPoint> dataPoints = dataByTimestamp.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> HistoricalVolumeTrendsReportData.VolumeDataPoint.builder()
                    .timestamp(entry.getKey())
                    .dateTime(DATE_FORMAT.format(new Date(entry.getKey())))
                    .grossVolume(entry.getValue().getOrDefault("GOV", 0.0))
                    .netVolume(entry.getValue().getOrDefault("NSV", 0.0))
                    .avgVolume(entry.getValue().getOrDefault("GOV", 0.0))
                    .build())
                .collect(Collectors.toList());

            HistoricalVolumeTrendsReportData.VolumeTrendMetrics metrics = calculateVolumeMetrics(dataPoints);

            return HistoricalVolumeTrendsReportData.TankVolumeTrend.builder()
                .tankId(tank.getId().getId().toString())
                .tankName(tank.getLabel() != null ? tank.getLabel() : tank.getName())
                .productType(getProductFromAsset(tank))
                .dataPoints(dataPoints)
                .metrics(metrics)
                .build();

        } catch (InterruptedException | ExecutionException e) {
            log.error("[{}] Error generating volume trend for tank {}", tenantId, tank.getName(), e);
            return null;
        }
    }

    /**
     * Generate Temperature Profile Report
     */
    private TemperatureProfileReportData generateTemperatureProfile(
            ReportRequest request,
            TenantId tenantId) {

        log.info("[{}] Generating Temperature Profile Report", tenantId);

        long startTime = getTimestampParameter(request, "startTime", System.currentTimeMillis() - 86400000L);
        long endTime = getTimestampParameter(request, "endTime", System.currentTimeMillis());
        
        List<Asset> tanks = getTankAssets(tenantId);
        tanks = filterTanksByParameters(tanks, request);

        List<TemperatureProfileReportData.TankTemperatureProfile> tankProfiles = tanks.stream()
            .map(tank -> generateTankTemperatureProfile(tank, tenantId, startTime, endTime))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        TemperatureProfileReportData.TemperatureStatistics statistics = calculateTemperatureStatistics(tankProfiles);

        return TemperatureProfileReportData.builder()
            .reportTitle("Temperature Profile Report")
            .reportPeriod(formatDateRange(startTime, endTime))
            .startTimestamp(startTime)
            .endTimestamp(endTime)
            .tankProfiles(tankProfiles)
            .statistics(statistics)
            .build();
    }

    /**
     * Generate temperature profile for a single tank
     */
    private TemperatureProfileReportData.TankTemperatureProfile generateTankTemperatureProfile(
            Asset tank,
            TenantId tenantId,
            long startTime,
            long endTime) {

        try {
            List<ReadTsKvQuery> queries = Collections.singletonList(
                new BaseReadTsKvQuery("BTemprise", startTime, endTime, 3600000L, 1000, Aggregation.AVG)
            );

            List<TsKvEntry> tempData = timeseriesService.findAll(
                tenantId, new AssetId(tank.getId().getId()), queries
            ).get();

            if (tempData.isEmpty()) {
                log.warn("[{}] No temperature data found for tank {}", tenantId, tank.getName());
                return null;
            }

            List<TemperatureProfileReportData.TemperatureDataPoint> dataPoints = tempData.stream()
                .map(entry -> TemperatureProfileReportData.TemperatureDataPoint.builder()
                    .timestamp(entry.getTs())
                    .dateTime(DATE_FORMAT.format(new Date(entry.getTs())))
                    .temperature(entry.getDoubleValue().orElse(0.0))
                    .avgTemperature(entry.getDoubleValue().orElse(0.0))
                    .build())
                .collect(Collectors.toList());

            TemperatureProfileReportData.TemperatureMetrics metrics = calculateTemperatureMetrics(dataPoints);
            List<TemperatureProfileReportData.TemperatureAnomaly> anomalies = detectTemperatureAnomalies(dataPoints);

            return TemperatureProfileReportData.TankTemperatureProfile.builder()
                .tankId(tank.getId().getId().toString())
                .tankName(tank.getLabel() != null ? tank.getLabel() : tank.getName())
                .productType(getProductFromAsset(tank))
                .dataPoints(dataPoints)
                .metrics(metrics)
                .anomalies(anomalies)
                .build();

        } catch (InterruptedException | ExecutionException e) {
            log.error("[{}] Error generating temperature profile for tank {}", tenantId, tank.getName(), e);
            return null;
        }
    }

    /**
     * Generate Alarm History Report
     */
    private AlarmHistoryReportData generateAlarmHistory(
            ReportRequest request,
            TenantId tenantId) {

        log.info("[{}] Generating Alarm History Report", tenantId);

        long startTime = getTimestampParameter(request, "startTime", System.currentTimeMillis() - 86400000L);
        long endTime = getTimestampParameter(request, "endTime", System.currentTimeMillis());
        
        List<Asset> tanks = getTankAssets(tenantId);
        tanks = filterTanksByParameters(tanks, request);

        // Collect alarms from all tanks
        List<AlarmHistoryReportData.AlarmRecord> allAlarms = new ArrayList<>();
        Map<String, List<AlarmHistoryReportData.AlarmRecord>> alarmsByTank = new HashMap<>();

        for (Asset tank : tanks) {
            try {
                // Build AlarmQuery for the tank
                TimePageLink pageLink = new TimePageLink(1000, 0, null, null, startTime, endTime);
                AlarmQuery alarmQuery = AlarmQuery.builder()
                    .affectedEntityId(new AssetId(tank.getId().getId()))
                    .pageLink(pageLink)
                    .searchStatus(null)
                    .status(null)
                    .assigneeId(null)
                    .fetchOriginator(true)
                    .build();
                
                List<AlarmInfo> alarmInfos = alarmService.findAlarms(tenantId, alarmQuery).getData();
                List<Alarm> alarms = alarmInfos.stream()
                    .map(alarmInfo -> (Alarm) alarmInfo)
                    .collect(Collectors.toList());

                List<AlarmHistoryReportData.AlarmRecord> tankAlarms = alarms.stream()
                    .map(alarm -> convertAlarmToRecord(alarm, tank))
                    .collect(Collectors.toList());

                allAlarms.addAll(tankAlarms);
                alarmsByTank.put(tank.getId().getId().toString(), tankAlarms);

            } catch (Exception e) {
                log.error("[{}] Error fetching alarms for tank {}", tenantId, tank.getName(), e);
            }
        }

        // Sort by creation time (newest first)
        allAlarms.sort((a, b) -> Long.compare(b.getCreatedTime(), a.getCreatedTime()));

        // Calculate statistics
        AlarmHistoryReportData.AlarmStatistics statistics = calculateAlarmStatistics(allAlarms);
        List<AlarmHistoryReportData.AlarmSummaryByType> summaryByType = calculateAlarmSummaryByType(allAlarms);
        List<AlarmHistoryReportData.AlarmSummaryByTank> summaryByTank = calculateAlarmSummaryByTank(tanks, alarmsByTank);

        return AlarmHistoryReportData.builder()
            .reportTitle("Alarm History Report")
            .reportPeriod(formatDateRange(startTime, endTime))
            .startTimestamp(startTime)
            .endTimestamp(endTime)
            .alarms(allAlarms)
            .statistics(statistics)
            .summaryByType(summaryByType)
            .summaryByTank(summaryByTank)
            .build();
    }

    // ==================== Helper Methods ====================

    private AlarmHistoryReportData.AlarmRecord convertAlarmToRecord(Alarm alarm, Asset tank) {
        long duration = 0;
        if (alarm.getClearTs() > 0) {
            duration = alarm.getClearTs() - alarm.getCreatedTime();
        } else if (alarm.getAckTs() > 0) {
            duration = System.currentTimeMillis() - alarm.getCreatedTime();
        }

        return AlarmHistoryReportData.AlarmRecord.builder()
            .alarmId(alarm.getId().getId().toString())
            .alarmType(alarm.getType())
            .severity(alarm.getSeverity().name())
            .tankId(tank.getId().getId().toString())
            .tankName(tank.getLabel() != null ? tank.getLabel() : tank.getName())
            .createdTime(alarm.getCreatedTime())
            .createdTimeStr(DATE_FORMAT.format(new Date(alarm.getCreatedTime())))
            .acknowledgedTime(alarm.getAckTs() > 0 ? alarm.getAckTs() : null)
            .acknowledgedTimeStr(alarm.getAckTs() > 0 ? DATE_FORMAT.format(new Date(alarm.getAckTs())) : null)
            .clearedTime(alarm.getClearTs() > 0 ? alarm.getClearTs() : null)
            .clearedTimeStr(alarm.getClearTs() > 0 ? DATE_FORMAT.format(new Date(alarm.getClearTs())) : null)
            .status(alarm.getStatus().name())
            .durationMs(duration)
            .durationStr(formatDuration(duration))
            .details(alarm.getDetails() != null ? alarm.getDetails().toString() : "")
            .build();
    }

    private HistoricalLevelTrendsReportData.TrendMetrics calculateLevelMetrics(
            List<HistoricalLevelTrendsReportData.DataPoint> dataPoints) {
        
        if (dataPoints.isEmpty()) {
            return HistoricalLevelTrendsReportData.TrendMetrics.builder()
                .trend("unknown")
                .build();
        }

        double min = dataPoints.stream().mapToDouble(HistoricalLevelTrendsReportData.DataPoint::getLevel).min().orElse(0);
        double max = dataPoints.stream().mapToDouble(HistoricalLevelTrendsReportData.DataPoint::getLevel).max().orElse(0);
        double avg = dataPoints.stream().mapToDouble(HistoricalLevelTrendsReportData.DataPoint::getLevel).average().orElse(0);
        
        double firstLevel = dataPoints.get(0).getLevel();
        double lastLevel = dataPoints.get(dataPoints.size() - 1).getLevel();
        double change = lastLevel - firstLevel;
        double changePercent = firstLevel > 0 ? (change / firstLevel) * 100 : 0;
        
        String trend = "stable";
        if (Math.abs(changePercent) > 5) {
            trend = changePercent > 0 ? "increasing" : "decreasing";
        }

        return HistoricalLevelTrendsReportData.TrendMetrics.builder()
            .minLevel(min)
            .maxLevel(max)
            .avgLevel(avg)
            .levelChange(change)
            .levelChangePercent(changePercent)
            .trend(trend)
            .build();
    }

    private HistoricalVolumeTrendsReportData.VolumeTrendMetrics calculateVolumeMetrics(
            List<HistoricalVolumeTrendsReportData.VolumeDataPoint> dataPoints) {
        
        if (dataPoints.isEmpty()) {
            return HistoricalVolumeTrendsReportData.VolumeTrendMetrics.builder()
                .trend("unknown")
                .build();
        }

        double min = dataPoints.stream().mapToDouble(HistoricalVolumeTrendsReportData.VolumeDataPoint::getGrossVolume).min().orElse(0);
        double max = dataPoints.stream().mapToDouble(HistoricalVolumeTrendsReportData.VolumeDataPoint::getGrossVolume).max().orElse(0);
        double avg = dataPoints.stream().mapToDouble(HistoricalVolumeTrendsReportData.VolumeDataPoint::getGrossVolume).average().orElse(0);
        
        double firstVolume = dataPoints.get(0).getGrossVolume();
        double lastVolume = dataPoints.get(dataPoints.size() - 1).getGrossVolume();
        double change = lastVolume - firstVolume;
        double changePercent = firstVolume > 0 ? (change / firstVolume) * 100 : 0;
        
        // Calculate inflow/outflow
        double totalInflow = 0;
        double totalOutflow = 0;
        for (int i = 1; i < dataPoints.size(); i++) {
            double diff = dataPoints.get(i).getGrossVolume() - dataPoints.get(i - 1).getGrossVolume();
            if (diff > 0) {
                totalInflow += diff;
            } else {
                totalOutflow += Math.abs(diff);
            }
        }
        
        String trend = "stable";
        if (Math.abs(changePercent) > 5) {
            trend = changePercent > 0 ? "increasing" : "decreasing";
        }

        return HistoricalVolumeTrendsReportData.VolumeTrendMetrics.builder()
            .minVolume(min)
            .maxVolume(max)
            .avgVolume(avg)
            .volumeChange(change)
            .volumeChangePercent(changePercent)
            .trend(trend)
            .totalInflow(totalInflow)
            .totalOutflow(totalOutflow)
            .build();
    }

    private TemperatureProfileReportData.TemperatureMetrics calculateTemperatureMetrics(
            List<TemperatureProfileReportData.TemperatureDataPoint> dataPoints) {
        
        if (dataPoints.isEmpty()) {
            return TemperatureProfileReportData.TemperatureMetrics.builder().build();
        }

        double min = dataPoints.stream().mapToDouble(TemperatureProfileReportData.TemperatureDataPoint::getTemperature).min().orElse(0);
        double max = dataPoints.stream().mapToDouble(TemperatureProfileReportData.TemperatureDataPoint::getTemperature).max().orElse(0);
        double avg = dataPoints.stream().mapToDouble(TemperatureProfileReportData.TemperatureDataPoint::getTemperature).average().orElse(0);
        
        // Calculate standard deviation
        double variance = dataPoints.stream()
            .mapToDouble(dp -> Math.pow(dp.getTemperature() - avg, 2))
            .average()
            .orElse(0);
        double stdDev = Math.sqrt(variance);

        return TemperatureProfileReportData.TemperatureMetrics.builder()
            .minTemperature(min)
            .maxTemperature(max)
            .avgTemperature(avg)
            .temperatureRange(max - min)
            .temperatureVariation(stdDev)
            .exceedingUpperLimit(0) // TODO: Implement threshold checking
            .exceedingLowerLimit(0)
            .build();
    }

    private List<TemperatureProfileReportData.TemperatureAnomaly> detectTemperatureAnomalies(
            List<TemperatureProfileReportData.TemperatureDataPoint> dataPoints) {
        
        List<TemperatureProfileReportData.TemperatureAnomaly> anomalies = new ArrayList<>();
        
        // Simple anomaly detection: rapid temperature changes
        for (int i = 1; i < dataPoints.size(); i++) {
            double prevTemp = dataPoints.get(i - 1).getTemperature();
            double currTemp = dataPoints.get(i).getTemperature();
            double change = Math.abs(currTemp - prevTemp);
            
            if (change > 5.0) { // More than 5°C change
                anomalies.add(TemperatureProfileReportData.TemperatureAnomaly.builder()
                    .timestamp(dataPoints.get(i).getTimestamp())
                    .dateTime(dataPoints.get(i).getDateTime())
                    .temperature(currTemp)
                    .anomalyType("rapid_change")
                    .description(String.format("Rapid temperature change: %.2f°C", change))
                    .build());
            }
        }
        
        return anomalies;
    }

    private HistoricalLevelTrendsReportData.TrendStatistics calculateLevelTrendStatistics(
            List<HistoricalLevelTrendsReportData.TankLevelTrend> trends) {
        
        int increasing = 0;
        int decreasing = 0;
        int stable = 0;
        int totalDataPoints = 0;
        
        for (HistoricalLevelTrendsReportData.TankLevelTrend trend : trends) {
            totalDataPoints += trend.getDataPoints().size();
            String trendType = trend.getMetrics().getTrend();
            if ("increasing".equals(trendType)) increasing++;
            else if ("decreasing".equals(trendType)) decreasing++;
            else stable++;
        }
        
        return HistoricalLevelTrendsReportData.TrendStatistics.builder()
            .totalTanks(trends.size())
            .totalDataPoints(totalDataPoints)
            .tanksIncreasing(increasing)
            .tanksDecreasing(decreasing)
            .tanksStable(stable)
            .build();
    }

    private HistoricalVolumeTrendsReportData.VolumeStatistics calculateVolumeTrendStatistics(
            List<HistoricalVolumeTrendsReportData.TankVolumeTrend> trends) {
        
        int totalDataPoints = 0;
        double totalGross = 0;
        double totalNet = 0;
        double totalChange = 0;
        double totalInflow = 0;
        double totalOutflow = 0;
        
        for (HistoricalVolumeTrendsReportData.TankVolumeTrend trend : trends) {
            totalDataPoints += trend.getDataPoints().size();
            if (!trend.getDataPoints().isEmpty()) {
                totalGross += trend.getDataPoints().get(trend.getDataPoints().size() - 1).getGrossVolume();
                totalNet += trend.getDataPoints().get(trend.getDataPoints().size() - 1).getNetVolume();
            }
            totalChange += trend.getMetrics().getVolumeChange();
            totalInflow += trend.getMetrics().getTotalInflow();
            totalOutflow += trend.getMetrics().getTotalOutflow();
        }
        
        return HistoricalVolumeTrendsReportData.VolumeStatistics.builder()
            .totalTanks(trends.size())
            .totalDataPoints(totalDataPoints)
            .totalGrossVolume(totalGross)
            .totalNetVolume(totalNet)
            .totalVolumeChange(totalChange)
            .totalInflow(totalInflow)
            .totalOutflow(totalOutflow)
            .build();
    }

    private TemperatureProfileReportData.TemperatureStatistics calculateTemperatureStatistics(
            List<TemperatureProfileReportData.TankTemperatureProfile> profiles) {
        
        int totalDataPoints = 0;
        int totalAnomalies = 0;
        double sumAvg = 0;
        double globalMin = Double.MAX_VALUE;
        double globalMax = Double.MIN_VALUE;
        
        for (TemperatureProfileReportData.TankTemperatureProfile profile : profiles) {
            totalDataPoints += profile.getDataPoints().size();
            totalAnomalies += profile.getAnomalies().size();
            sumAvg += profile.getMetrics().getAvgTemperature();
            globalMin = Math.min(globalMin, profile.getMetrics().getMinTemperature());
            globalMax = Math.max(globalMax, profile.getMetrics().getMaxTemperature());
        }
        
        return TemperatureProfileReportData.TemperatureStatistics.builder()
            .totalTanks(profiles.size())
            .totalDataPoints(totalDataPoints)
            .totalAnomalies(totalAnomalies)
            .avgTemperatureAllTanks(profiles.isEmpty() ? 0 : sumAvg / profiles.size())
            .minTemperatureAllTanks(globalMin == Double.MAX_VALUE ? 0 : globalMin)
            .maxTemperatureAllTanks(globalMax == Double.MIN_VALUE ? 0 : globalMax)
            .build();
    }

    private AlarmHistoryReportData.AlarmStatistics calculateAlarmStatistics(
            List<AlarmHistoryReportData.AlarmRecord> alarms) {
        
        int active = 0;
        int acknowledged = 0;
        int cleared = 0;
        int critical = 0;
        int major = 0;
        int minor = 0;
        int warning = 0;
        long totalAckTime = 0;
        int ackCount = 0;
        long totalClearTime = 0;
        int clearCount = 0;
        
        for (AlarmHistoryReportData.AlarmRecord alarm : alarms) {
            if (alarm.getStatus().contains("ACTIVE")) active++;
            if (alarm.getAcknowledgedTime() != null) {
                acknowledged++;
                totalAckTime += (alarm.getAcknowledgedTime() - alarm.getCreatedTime());
                ackCount++;
            }
            if (alarm.getClearedTime() != null) {
                cleared++;
                totalClearTime += (alarm.getClearedTime() - alarm.getCreatedTime());
                clearCount++;
            }
            
            switch (alarm.getSeverity()) {
                case "CRITICAL": critical++; break;
                case "MAJOR": major++; break;
                case "MINOR": minor++; break;
                case "WARNING": warning++; break;
            }
        }
        
        long avgAckTime = ackCount > 0 ? totalAckTime / ackCount : 0;
        long avgClearTime = clearCount > 0 ? totalClearTime / clearCount : 0;
        
        return AlarmHistoryReportData.AlarmStatistics.builder()
            .totalAlarms(alarms.size())
            .activeAlarms(active)
            .acknowledgedAlarms(acknowledged)
            .clearedAlarms(cleared)
            .criticalAlarms(critical)
            .majorAlarms(major)
            .minorAlarms(minor)
            .warningAlarms(warning)
            .avgAcknowledgementTimeMs(avgAckTime)
            .avgAcknowledgementTimeStr(formatDuration(avgAckTime))
            .avgClearanceTimeMs(avgClearTime)
            .avgClearanceTimeStr(formatDuration(avgClearTime))
            .build();
    }

    private List<AlarmHistoryReportData.AlarmSummaryByType> calculateAlarmSummaryByType(
            List<AlarmHistoryReportData.AlarmRecord> alarms) {
        
        Map<String, List<AlarmHistoryReportData.AlarmRecord>> byType = alarms.stream()
            .collect(Collectors.groupingBy(AlarmHistoryReportData.AlarmRecord::getAlarmType));
        
        return byType.entrySet().stream()
            .map(entry -> {
                List<AlarmHistoryReportData.AlarmRecord> typeAlarms = entry.getValue();
                int active = (int) typeAlarms.stream().filter(a -> a.getStatus().contains("ACTIVE")).count();
                int cleared = (int) typeAlarms.stream().filter(a -> a.getClearedTime() != null).count();
                double avgDurationDouble = typeAlarms.stream()
                    .mapToLong(AlarmHistoryReportData.AlarmRecord::getDurationMs)
                    .average()
                    .orElse(0);
                long avgDuration = (long) avgDurationDouble;
                
                return AlarmHistoryReportData.AlarmSummaryByType.builder()
                    .alarmType(entry.getKey())
                    .count(typeAlarms.size())
                    .active(active)
                    .cleared(cleared)
                    .avgDurationMs(avgDuration)
                    .avgDurationStr(formatDuration((long) avgDuration))
                    .build();
            })
            .sorted((a, b) -> Integer.compare(b.getCount(), a.getCount()))
            .collect(Collectors.toList());
    }

    private List<AlarmHistoryReportData.AlarmSummaryByTank> calculateAlarmSummaryByTank(
            List<Asset> tanks,
            Map<String, List<AlarmHistoryReportData.AlarmRecord>> alarmsByTank) {
        
        return tanks.stream()
            .map(tank -> {
                String tankId = tank.getId().getId().toString();
                List<AlarmHistoryReportData.AlarmRecord> tankAlarms = alarmsByTank.getOrDefault(tankId, Collections.emptyList());
                
                int active = (int) tankAlarms.stream().filter(a -> a.getStatus().contains("ACTIVE")).count();
                int critical = (int) tankAlarms.stream().filter(a -> "CRITICAL".equals(a.getSeverity())).count();
                
                Map<String, Integer> byType = tankAlarms.stream()
                    .collect(Collectors.groupingBy(
                        AlarmHistoryReportData.AlarmRecord::getAlarmType,
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                    ));
                
                return AlarmHistoryReportData.AlarmSummaryByTank.builder()
                    .tankId(tankId)
                    .tankName(tank.getLabel() != null ? tank.getLabel() : tank.getName())
                    .totalAlarms(tankAlarms.size())
                    .activeAlarms(active)
                    .criticalAlarms(critical)
                    .alarmsByType(byType)
                    .build();
            })
            .filter(summary -> summary.getTotalAlarms() > 0)
            .sorted((a, b) -> Integer.compare(b.getTotalAlarms(), a.getTotalAlarms()))
            .collect(Collectors.toList());
    }

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

    private String getStringParameter(ReportRequest request, String paramName, String defaultValue) {
        Object value = request.getParameter(paramName);
        return value != null ? value.toString() : defaultValue;
    }

    private long getAggregationInterval(String interval) {
        switch (interval.toLowerCase()) {
            case "hourly": return 3600000L; // 1 hour
            case "daily": return 86400000L; // 24 hours
            case "weekly": return 604800000L; // 7 days
            default: return 3600000L;
        }
    }

    private Aggregation getAggregation(String interval) {
        return Aggregation.AVG; // Use average for all intervals
    }

    private String formatDateRange(long startTime, long endTime) {
        return DATE_FORMAT.format(new Date(startTime)) + " - " + DATE_FORMAT.format(new Date(endTime));
    }

    /**
     * Generate Event Log Report
     * Shows system events, user actions, and operational events
     */
    private AlarmHistoryReportData generateEventLog(
            ReportRequest request,
            TenantId tenantId) {

        log.info("[{}] Generating event log report", tenantId);

        // TODO: Implement event log retrieval
        // Should query system events, user actions, operational events
        // For now, return placeholder using AlarmHistoryReportData structure

        Long startTime = request.getParameterAsLong("startTime");
        Long endTime = request.getParameterAsLong("endTime");
        
        return AlarmHistoryReportData.builder()
                .reportTitle("Event Log Report")
                .reportPeriod(formatDateRange(startTime != null ? startTime : 0, endTime != null ? endTime : 0))
                .startTimestamp(startTime != null ? startTime : 0)
                .endTimestamp(endTime != null ? endTime : 0)
                .alarms(new ArrayList<>())
                .statistics(AlarmHistoryReportData.AlarmStatistics.builder()
                        .totalAlarms(0)
                        .activeAlarms(0)
                        .acknowledgedAlarms(0)
                        .clearedAlarms(0)
                        .criticalAlarms(0)
                        .majorAlarms(0)
                        .minorAlarms(0)
                        .warningAlarms(0)
                        .build())
                .build();
    }

    /**
     * Generate Configuration Change History Report
     * Shows all configuration changes made to the system
     */
    private AlarmHistoryReportData generateConfigurationChangeHistory(
            ReportRequest request,
            TenantId tenantId) {

        log.info("[{}] Generating configuration change history report", tenantId);

        // TODO: Implement configuration change history retrieval
        // Should query configuration changes from audit log
        // Track: tank settings, alarm thresholds, user permissions, etc.

        Long startTime = request.getParameterAsLong("startTime");
        Long endTime = request.getParameterAsLong("endTime");
        
        return AlarmHistoryReportData.builder()
                .reportTitle("Configuration Change History Report")
                .reportPeriod(formatDateRange(startTime != null ? startTime : 0, endTime != null ? endTime : 0))
                .startTimestamp(startTime != null ? startTime : 0)
                .endTimestamp(endTime != null ? endTime : 0)
                .alarms(new ArrayList<>())
                .statistics(AlarmHistoryReportData.AlarmStatistics.builder()
                        .totalAlarms(0)
                        .activeAlarms(0)
                        .acknowledgedAlarms(0)
                        .clearedAlarms(0)
                        .criticalAlarms(0)
                        .majorAlarms(0)
                        .minorAlarms(0)
                        .warningAlarms(0)
                        .build())
                .build();
    }

    /**
     * Generate Performance Metrics Report
     * Shows system performance metrics: response times, throughput, etc.
     */
    private AlarmHistoryReportData generatePerformanceMetrics(
            ReportRequest request,
            TenantId tenantId) {

        log.info("[{}] Generating performance metrics report", tenantId);

        // TODO: Implement performance metrics retrieval
        // Should track: API response times, data processing rates,
        // database query performance, system resource usage

        Long startTime = request.getParameterAsLong("startTime");
        Long endTime = request.getParameterAsLong("endTime");
        
        return AlarmHistoryReportData.builder()
                .reportTitle("Performance Metrics Report")
                .reportPeriod(formatDateRange(startTime != null ? startTime : 0, endTime != null ? endTime : 0))
                .startTimestamp(startTime != null ? startTime : 0)
                .endTimestamp(endTime != null ? endTime : 0)
                .alarms(new ArrayList<>())
                .statistics(AlarmHistoryReportData.AlarmStatistics.builder()
                        .totalAlarms(0)
                        .activeAlarms(0)
                        .acknowledgedAlarms(0)
                        .clearedAlarms(0)
                        .criticalAlarms(0)
                        .majorAlarms(0)
                        .minorAlarms(0)
                        .warningAlarms(0)
                        .build())
                .build();
    }

    private String formatDuration(long durationMs) {
        if (durationMs == 0) return "N/A";
        
        long hours = durationMs / 3600000;
        long minutes = (durationMs % 3600000) / 60000;
        
        if (hours > 24) {
            long days = hours / 24;
            hours = hours % 24;
            return String.format("%dd %dh %dm", days, hours, minutes);
        } else if (hours > 0) {
            return String.format("%dh %dm", hours, minutes);
        } else {
            return String.format("%dm", minutes);
        }
    }
}
