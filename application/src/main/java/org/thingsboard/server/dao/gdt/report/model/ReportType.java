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
package org.thingsboard.server.dao.gdt.report.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Report types
 */
public enum ReportType {
    // Inventory Reports (7)
    DAILY_INVENTORY,
    TANK_INVENTORY_SUMMARY,
    PRODUCT_INVENTORY_BY_GROUP,
    TANK_STATUS,
    CAPACITY_UTILIZATION,
    LOW_STOCK_ALERT,
    OVERFILL_RISK,
    
    // Custody Transfer Reports (4)
    BATCH_TRANSFER,
    BATCH_HISTORY,
    MASS_BALANCE,
    TRANSFER_RECONCILIATION,
    
    // Analysis Reports (5)
    LABORATORY_ANALYSIS,
    MANUAL_GAUGING,
    DEVIATION_ANALYSIS,
    TEMPERATURE_PROFILE,
    DENSITY_VARIATION,
    
    // Historical Reports (6)
    HISTORICAL_LEVEL_TRENDS,
    HISTORICAL_VOLUME_TRENDS,
    ALARM_HISTORY,
    EVENT_LOG,
    CONFIGURATION_CHANGE_HISTORY,
    PERFORMANCE_METRICS,
    
    // Compliance Reports (3)
    OIML_R85_COMPLIANCE,
    API_MPMS_COMPLIANCE,
    AUDIT_TRAIL;
    
    /**
     * Convert enum to snake_case for JSON serialization
     */
    @JsonValue
    public String toValue() {
        return this.name().toLowerCase();
    }
    
    /**
     * Convert from snake_case or UPPER_CASE string to enum
     */
    @JsonCreator
    public static ReportType fromValue(String value) {
        if (value == null) {
            return null;
        }
        
        // Try direct match first (UPPER_CASE)
        try {
            return ReportType.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            // If that fails, try converting from snake_case
            String upperValue = value.toUpperCase().replace("-", "_");
            return ReportType.valueOf(upperValue);
        }
    }
}
