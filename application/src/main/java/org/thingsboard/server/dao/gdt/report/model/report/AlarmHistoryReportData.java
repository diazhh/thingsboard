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
import java.util.Map;

/**
 * Alarm History Report Data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlarmHistoryReportData {
    
    private String reportTitle;
    private String reportPeriod;
    private Long startTimestamp;
    private Long endTimestamp;
    private List<AlarmRecord> alarms;
    private AlarmStatistics statistics;
    private List<AlarmSummaryByType> summaryByType;
    private List<AlarmSummaryByTank> summaryByTank;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AlarmRecord {
        private String alarmId;
        private String alarmType;
        private String severity; // CRITICAL, MAJOR, MINOR, WARNING, INDETERMINATE
        private String tankId;
        private String tankName;
        private Long createdTime;
        private String createdTimeStr;
        private Long acknowledgedTime;
        private String acknowledgedTimeStr;
        private Long clearedTime;
        private String clearedTimeStr;
        private String status; // ACTIVE_UNACK, ACTIVE_ACK, CLEARED_UNACK, CLEARED_ACK
        private Long durationMs;
        private String durationStr;
        private String acknowledgedBy;
        private String clearedBy;
        private String details;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AlarmStatistics {
        private Integer totalAlarms;
        private Integer activeAlarms;
        private Integer acknowledgedAlarms;
        private Integer clearedAlarms;
        private Integer criticalAlarms;
        private Integer majorAlarms;
        private Integer minorAlarms;
        private Integer warningAlarms;
        private Long avgAcknowledgementTimeMs;
        private String avgAcknowledgementTimeStr;
        private Long avgClearanceTimeMs;
        private String avgClearanceTimeStr;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AlarmSummaryByType {
        private String alarmType;
        private Integer count;
        private Integer active;
        private Integer cleared;
        private Long avgDurationMs;
        private String avgDurationStr;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AlarmSummaryByTank {
        private String tankId;
        private String tankName;
        private Integer totalAlarms;
        private Integer activeAlarms;
        private Integer criticalAlarms;
        private Map<String, Integer> alarmsByType;
    }
}
