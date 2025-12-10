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
 * Batch History Report Data
 * Contains historical batch transfer information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchHistoryReportData {
    
    private String reportTitle;
    private String reportPeriod;
    private long startTimestamp;
    private long endTimestamp;
    private long generatedAt;
    
    private List<BatchTransfer> batches;
    private BatchStatistics statistics;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchTransfer {
        private String batchNumber;
        private String tankName;
        private String product;
        private long startTime;
        private long endTime;
        private String startDateTime;
        private String endDateTime;
        private Double openingVolume;    // liters
        private Double closingVolume;    // liters
        private Double transferredVolume; // liters
        private Double openingTemperature; // °C
        private Double closingTemperature; // °C
        private Double avgTemperature;    // °C
        private String destination;
        private String status; // COMPLETED, IN_PROGRESS, CANCELLED
        private String operator;
        private String notes;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchStatistics {
        private Integer totalBatches;
        private Integer completedBatches;
        private Integer inProgressBatches;
        private Integer cancelledBatches;
        private Double totalVolumeTransferred; // liters
        private Double avgBatchVolume;         // liters
        private Double minBatchVolume;         // liters
        private Double maxBatchVolume;         // liters
        private Long avgBatchDuration;         // milliseconds
    }
}
