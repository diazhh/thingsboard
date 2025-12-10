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
 * Mass Balance Report Data
 * 
 * Implements mass balance calculation according to API MPMS Chapter 13.1
 * Formula: Opening Stock + Receipts - Deliveries = Closing Stock ± Discrepancy
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MassBalanceReportData {
    
    private String reportTitle;
    private String reportPeriod;
    private Long startTimestamp;
    private Long endTimestamp;
    private List<TankMassBalance> tankBalances;
    private GlobalMassBalance globalBalance;
    private List<Discrepancy> discrepancies;
    private MassBalanceStatistics statistics;
    
    /**
     * Mass balance for a single tank
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TankMassBalance {
        private String tankId;
        private String tankName;
        private String productType;
        
        // Opening Stock
        private Double openingVolume; // liters
        private Double openingMass; // kg
        private Long openingTimestamp;
        private String openingDateTime;
        
        // Receipts (Inflows)
        private Double totalReceiptsVolume; // liters
        private Double totalReceiptsMass; // kg
        private Integer receiptsCount;
        private List<Transaction> receipts;
        
        // Deliveries (Outflows)
        private Double totalDeliveriesVolume; // liters
        private Double totalDeliveriesMass; // kg
        private Integer deliveriesCount;
        private List<Transaction> deliveries;
        
        // Closing Stock
        private Double closingVolume; // liters
        private Double closingMass; // kg
        private Long closingTimestamp;
        private String closingDateTime;
        
        // Calculated Balance
        private Double expectedClosingVolume; // Opening + Receipts - Deliveries
        private Double expectedClosingMass;
        
        // Discrepancy
        private Double volumeDiscrepancy; // Actual - Expected
        private Double massDiscrepancy;
        private Double volumeDiscrepancyPercent;
        private Double massDiscrepancyPercent;
        private String discrepancyStatus; // "acceptable", "warning", "critical"
        private String discrepancyReason;
        
        // Thresholds
        private Double acceptableDiscrepancyPercent; // Default: 0.3% (API MPMS)
        private Double warningDiscrepancyPercent; // Default: 0.5%
        private Double criticalDiscrepancyPercent; // Default: 1.0%
    }
    
    /**
     * Transaction (Receipt or Delivery)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Transaction {
        private String transactionId;
        private String type; // "receipt" or "delivery"
        private Long timestamp;
        private String dateTime;
        private Double volume; // liters
        private Double mass; // kg
        private Double temperature; // °C
        private Double density; // kg/m³
        private String batchNumber;
        private String reference;
        private String notes;
    }
    
    /**
     * Global mass balance across all tanks
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GlobalMassBalance {
        private Integer totalTanks;
        
        // Opening Stock
        private Double totalOpeningVolume;
        private Double totalOpeningMass;
        
        // Receipts
        private Double totalReceiptsVolume;
        private Double totalReceiptsMass;
        private Integer totalReceiptsCount;
        
        // Deliveries
        private Double totalDeliveriesVolume;
        private Double totalDeliveriesMass;
        private Integer totalDeliveriesCount;
        
        // Closing Stock
        private Double totalClosingVolume;
        private Double totalClosingMass;
        
        // Expected vs Actual
        private Double expectedClosingVolume;
        private Double expectedClosingMass;
        private Double totalVolumeDiscrepancy;
        private Double totalMassDiscrepancy;
        private Double totalVolumeDiscrepancyPercent;
        private Double totalMassDiscrepancyPercent;
        
        // Balance Status
        private String balanceStatus; // "balanced", "warning", "critical"
    }
    
    /**
     * Discrepancy record with analysis
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Discrepancy {
        private String tankId;
        private String tankName;
        private String severity; // "acceptable", "warning", "critical"
        private String type; // "volume", "mass", "both"
        private Double volumeDiscrepancy;
        private Double massDiscrepancy;
        private Double volumeDiscrepancyPercent;
        private Double massDiscrepancyPercent;
        private List<String> possibleCauses;
        private String recommendation;
        private Boolean requiresInvestigation;
    }
    
    /**
     * Statistical analysis of mass balance
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MassBalanceStatistics {
        private Integer totalTanks;
        private Integer tanksBalanced; // Within acceptable limits
        private Integer tanksWithWarning;
        private Integer tanksWithCriticalDiscrepancy;
        
        // Discrepancy Analysis
        private Double avgVolumeDiscrepancyPercent;
        private Double maxVolumeDiscrepancyPercent;
        private Double avgMassDiscrepancyPercent;
        private Double maxMassDiscrepancyPercent;
        
        // Transaction Summary
        private Integer totalTransactions;
        private Integer totalReceipts;
        private Integer totalDeliveries;
        
        // Volume Summary
        private Double totalVolumeIn;
        private Double totalVolumeOut;
        private Double netVolumeChange;
        
        // Mass Summary
        private Double totalMassIn;
        private Double totalMassOut;
        private Double netMassChange;
        
        // Compliance
        private Boolean compliantWithAPIMPMS; // < 0.3% discrepancy
        private String complianceNotes;
    }
}
