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
 * Temperature Profile Report Data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemperatureProfileReportData {
    
    private String reportTitle;
    private String reportPeriod;
    private Long startTimestamp;
    private Long endTimestamp;
    private List<TankTemperatureProfile> tankProfiles;
    private TemperatureStatistics statistics;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TankTemperatureProfile {
        private String tankId;
        private String tankName;
        private String productType;
        private List<TemperatureDataPoint> dataPoints;
        private TemperatureMetrics metrics;
        private List<TemperatureAnomaly> anomalies;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemperatureDataPoint {
        private Long timestamp;
        private String dateTime;
        private Double temperature; // °C
        private Double minTemperature; // °C (for aggregated data)
        private Double maxTemperature; // °C (for aggregated data)
        private Double avgTemperature; // °C (for aggregated data)
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemperatureMetrics {
        private Double minTemperature;
        private Double maxTemperature;
        private Double avgTemperature;
        private Double temperatureRange;
        private Double temperatureVariation; // Standard deviation
        private Integer exceedingUpperLimit;
        private Integer exceedingLowerLimit;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemperatureAnomaly {
        private Long timestamp;
        private String dateTime;
        private Double temperature;
        private String anomalyType; // "high", "low", "rapid_change"
        private String description;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemperatureStatistics {
        private Integer totalTanks;
        private Integer totalDataPoints;
        private Integer totalAnomalies;
        private Double avgTemperatureAllTanks;
        private Double minTemperatureAllTanks;
        private Double maxTemperatureAllTanks;
    }
}
