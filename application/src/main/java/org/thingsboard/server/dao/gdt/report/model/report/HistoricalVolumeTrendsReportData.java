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
package org.thingsboard.server.dao.gdt.report.model.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Historical Volume Trends Report Data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoricalVolumeTrendsReportData {
    
    private String reportTitle;
    private String reportPeriod;
    private Long startTimestamp;
    private Long endTimestamp;
    private String aggregationInterval; // hourly, daily, weekly
    private List<TankVolumeTrend> tankTrends;
    private VolumeStatistics statistics;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TankVolumeTrend {
        private String tankId;
        private String tankName;
        private String productType;
        private List<VolumeDataPoint> dataPoints;
        private VolumeTrendMetrics metrics;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VolumeDataPoint {
        private Long timestamp;
        private String dateTime;
        private Double grossVolume; // liters
        private Double netVolume; // liters
        private Double minVolume; // liters (for aggregated data)
        private Double maxVolume; // liters (for aggregated data)
        private Double avgVolume; // liters (for aggregated data)
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VolumeTrendMetrics {
        private Double minVolume;
        private Double maxVolume;
        private Double avgVolume;
        private Double volumeChange; // Change from start to end
        private Double volumeChangePercent;
        private String trend; // "increasing", "decreasing", "stable"
        private Double totalInflow; // Sum of positive changes
        private Double totalOutflow; // Sum of negative changes
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VolumeStatistics {
        private Integer totalTanks;
        private Integer totalDataPoints;
        private Double totalGrossVolume;
        private Double totalNetVolume;
        private Double totalVolumeChange;
        private Double totalInflow;
        private Double totalOutflow;
    }
}
