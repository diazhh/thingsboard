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
 * Historical Level Trends Report Data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoricalLevelTrendsReportData {
    
    private String reportTitle;
    private String reportPeriod;
    private Long startTimestamp;
    private Long endTimestamp;
    private String aggregationInterval; // hourly, daily, weekly
    private List<TankLevelTrend> tankTrends;
    private TrendStatistics statistics;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TankLevelTrend {
        private String tankId;
        private String tankName;
        private String productType;
        private List<DataPoint> dataPoints;
        private TrendMetrics metrics;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataPoint {
        private Long timestamp;
        private String dateTime;
        private Double level; // mm
        private Double minLevel; // mm (for aggregated data)
        private Double maxLevel; // mm (for aggregated data)
        private Double avgLevel; // mm (for aggregated data)
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendMetrics {
        private Double minLevel;
        private Double maxLevel;
        private Double avgLevel;
        private Double levelChange; // Change from start to end
        private Double levelChangePercent;
        private String trend; // "increasing", "decreasing", "stable"
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendStatistics {
        private Integer totalTanks;
        private Integer totalDataPoints;
        private Integer tanksIncreasing;
        private Integer tanksDecreasing;
        private Integer tanksStable;
    }
}
