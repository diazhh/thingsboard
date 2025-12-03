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
package org.thingsboard.server.dao.gdt.report.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thingsboard.server.dao.gdt.report.model.report.MassBalanceReportData;

import java.util.ArrayList;
import java.util.List;

/**
 * Mass Balance Calculation Engine
 * 
 * Implements mass balance calculations according to API MPMS Chapter 13.1
 * Formula: Opening Stock + Receipts - Deliveries = Closing Stock ± Discrepancy
 */
@Service
@Slf4j
public class MassBalanceCalculationEngine {
    
    // API MPMS Chapter 13.1 Thresholds
    private static final double ACCEPTABLE_DISCREPANCY_PERCENT = 0.3; // 0.3%
    private static final double WARNING_DISCREPANCY_PERCENT = 0.5; // 0.5%
    private static final double CRITICAL_DISCREPANCY_PERCENT = 1.0; // 1.0%
    
    /**
     * Calculate mass balance for a tank
     */
    public MassBalanceReportData.TankMassBalance calculateTankBalance(
            String tankId,
            String tankName,
            String productType,
            double openingVolume,
            double openingMass,
            long openingTimestamp,
            List<MassBalanceReportData.Transaction> receipts,
            List<MassBalanceReportData.Transaction> deliveries,
            double closingVolume,
            double closingMass,
            long closingTimestamp) {
        
        log.debug("[{}] Calculating mass balance for tank {}", tankId, tankName);
        
        // Calculate total receipts
        double totalReceiptsVolume = receipts.stream()
            .mapToDouble(MassBalanceReportData.Transaction::getVolume)
            .sum();
        double totalReceiptsMass = receipts.stream()
            .mapToDouble(MassBalanceReportData.Transaction::getMass)
            .sum();
        
        // Calculate total deliveries
        double totalDeliveriesVolume = deliveries.stream()
            .mapToDouble(MassBalanceReportData.Transaction::getVolume)
            .sum();
        double totalDeliveriesMass = deliveries.stream()
            .mapToDouble(MassBalanceReportData.Transaction::getMass)
            .sum();
        
        // Calculate expected closing stock
        double expectedClosingVolume = openingVolume + totalReceiptsVolume - totalDeliveriesVolume;
        double expectedClosingMass = openingMass + totalReceiptsMass - totalDeliveriesMass;
        
        // Calculate discrepancy
        double volumeDiscrepancy = closingVolume - expectedClosingVolume;
        double massDiscrepancy = closingMass - expectedClosingMass;
        
        // Calculate discrepancy percentage
        double volumeDiscrepancyPercent = expectedClosingVolume > 0 
            ? (Math.abs(volumeDiscrepancy) / expectedClosingVolume) * 100 
            : 0;
        double massDiscrepancyPercent = expectedClosingMass > 0 
            ? (Math.abs(massDiscrepancy) / expectedClosingMass) * 100 
            : 0;
        
        // Determine discrepancy status
        String discrepancyStatus = determineDiscrepancyStatus(
            volumeDiscrepancyPercent, 
            massDiscrepancyPercent
        );
        
        // Analyze discrepancy reason
        String discrepancyReason = analyzeDiscrepancyReason(
            volumeDiscrepancy,
            massDiscrepancy,
            volumeDiscrepancyPercent,
            massDiscrepancyPercent,
            receipts.size(),
            deliveries.size()
        );
        
        log.info("[{}] Tank {} balance: Opening={}, Receipts={}, Deliveries={}, Expected={}, Actual={}, Discrepancy={}% ({})",
                tankId, tankName, openingVolume, totalReceiptsVolume, totalDeliveriesVolume,
                expectedClosingVolume, closingVolume, volumeDiscrepancyPercent, discrepancyStatus);
        
        return MassBalanceReportData.TankMassBalance.builder()
            .tankId(tankId)
            .tankName(tankName)
            .productType(productType)
            .openingVolume(openingVolume)
            .openingMass(openingMass)
            .openingTimestamp(openingTimestamp)
            .openingDateTime(formatTimestamp(openingTimestamp))
            .totalReceiptsVolume(totalReceiptsVolume)
            .totalReceiptsMass(totalReceiptsMass)
            .receiptsCount(receipts.size())
            .receipts(receipts)
            .totalDeliveriesVolume(totalDeliveriesVolume)
            .totalDeliveriesMass(totalDeliveriesMass)
            .deliveriesCount(deliveries.size())
            .deliveries(deliveries)
            .closingVolume(closingVolume)
            .closingMass(closingMass)
            .closingTimestamp(closingTimestamp)
            .closingDateTime(formatTimestamp(closingTimestamp))
            .expectedClosingVolume(expectedClosingVolume)
            .expectedClosingMass(expectedClosingMass)
            .volumeDiscrepancy(volumeDiscrepancy)
            .massDiscrepancy(massDiscrepancy)
            .volumeDiscrepancyPercent(volumeDiscrepancyPercent)
            .massDiscrepancyPercent(massDiscrepancyPercent)
            .discrepancyStatus(discrepancyStatus)
            .discrepancyReason(discrepancyReason)
            .acceptableDiscrepancyPercent(ACCEPTABLE_DISCREPANCY_PERCENT)
            .warningDiscrepancyPercent(WARNING_DISCREPANCY_PERCENT)
            .criticalDiscrepancyPercent(CRITICAL_DISCREPANCY_PERCENT)
            .build();
    }
    
    /**
     * Calculate global mass balance across all tanks
     */
    public MassBalanceReportData.GlobalMassBalance calculateGlobalBalance(
            List<MassBalanceReportData.TankMassBalance> tankBalances) {
        
        log.debug("Calculating global mass balance for {} tanks", tankBalances.size());
        
        double totalOpeningVolume = 0;
        double totalOpeningMass = 0;
        double totalReceiptsVolume = 0;
        double totalReceiptsMass = 0;
        int totalReceiptsCount = 0;
        double totalDeliveriesVolume = 0;
        double totalDeliveriesMass = 0;
        int totalDeliveriesCount = 0;
        double totalClosingVolume = 0;
        double totalClosingMass = 0;
        
        for (MassBalanceReportData.TankMassBalance balance : tankBalances) {
            totalOpeningVolume += balance.getOpeningVolume();
            totalOpeningMass += balance.getOpeningMass();
            totalReceiptsVolume += balance.getTotalReceiptsVolume();
            totalReceiptsMass += balance.getTotalReceiptsMass();
            totalReceiptsCount += balance.getReceiptsCount();
            totalDeliveriesVolume += balance.getTotalDeliveriesVolume();
            totalDeliveriesMass += balance.getTotalDeliveriesMass();
            totalDeliveriesCount += balance.getDeliveriesCount();
            totalClosingVolume += balance.getClosingVolume();
            totalClosingMass += balance.getClosingMass();
        }
        
        // Calculate expected closing stock
        double expectedClosingVolume = totalOpeningVolume + totalReceiptsVolume - totalDeliveriesVolume;
        double expectedClosingMass = totalOpeningMass + totalReceiptsMass - totalDeliveriesMass;
        
        // Calculate total discrepancy
        double totalVolumeDiscrepancy = totalClosingVolume - expectedClosingVolume;
        double totalMassDiscrepancy = totalClosingMass - expectedClosingMass;
        
        double totalVolumeDiscrepancyPercent = expectedClosingVolume > 0 
            ? (Math.abs(totalVolumeDiscrepancy) / expectedClosingVolume) * 100 
            : 0;
        double totalMassDiscrepancyPercent = expectedClosingMass > 0 
            ? (Math.abs(totalMassDiscrepancy) / expectedClosingMass) * 100 
            : 0;
        
        // Determine overall balance status
        String balanceStatus = determineDiscrepancyStatus(
            totalVolumeDiscrepancyPercent,
            totalMassDiscrepancyPercent
        );
        
        log.info("Global balance: Total discrepancy = {}% volume, {}% mass ({})",
                totalVolumeDiscrepancyPercent, totalMassDiscrepancyPercent, balanceStatus);
        
        return MassBalanceReportData.GlobalMassBalance.builder()
            .totalTanks(tankBalances.size())
            .totalOpeningVolume(totalOpeningVolume)
            .totalOpeningMass(totalOpeningMass)
            .totalReceiptsVolume(totalReceiptsVolume)
            .totalReceiptsMass(totalReceiptsMass)
            .totalReceiptsCount(totalReceiptsCount)
            .totalDeliveriesVolume(totalDeliveriesVolume)
            .totalDeliveriesMass(totalDeliveriesMass)
            .totalDeliveriesCount(totalDeliveriesCount)
            .totalClosingVolume(totalClosingVolume)
            .totalClosingMass(totalClosingMass)
            .expectedClosingVolume(expectedClosingVolume)
            .expectedClosingMass(expectedClosingMass)
            .totalVolumeDiscrepancy(totalVolumeDiscrepancy)
            .totalMassDiscrepancy(totalMassDiscrepancy)
            .totalVolumeDiscrepancyPercent(totalVolumeDiscrepancyPercent)
            .totalMassDiscrepancyPercent(totalMassDiscrepancyPercent)
            .balanceStatus(balanceStatus)
            .build();
    }
    
    /**
     * Detect and analyze discrepancies
     */
    public List<MassBalanceReportData.Discrepancy> detectDiscrepancies(
            List<MassBalanceReportData.TankMassBalance> tankBalances) {
        
        List<MassBalanceReportData.Discrepancy> discrepancies = new ArrayList<>();
        
        for (MassBalanceReportData.TankMassBalance balance : tankBalances) {
            // Only report discrepancies that exceed acceptable threshold
            if (balance.getVolumeDiscrepancyPercent() > ACCEPTABLE_DISCREPANCY_PERCENT ||
                balance.getMassDiscrepancyPercent() > ACCEPTABLE_DISCREPANCY_PERCENT) {
                
                String severity = balance.getDiscrepancyStatus();
                String type = determineDiscrepancyType(
                    balance.getVolumeDiscrepancyPercent(),
                    balance.getMassDiscrepancyPercent()
                );
                
                List<String> possibleCauses = identifyPossibleCauses(
                    balance.getVolumeDiscrepancy(),
                    balance.getMassDiscrepancy(),
                    balance.getVolumeDiscrepancyPercent(),
                    balance.getMassDiscrepancyPercent(),
                    balance.getReceiptsCount(),
                    balance.getDeliveriesCount()
                );
                
                String recommendation = generateRecommendation(severity, possibleCauses);
                
                boolean requiresInvestigation = 
                    balance.getVolumeDiscrepancyPercent() > WARNING_DISCREPANCY_PERCENT ||
                    balance.getMassDiscrepancyPercent() > WARNING_DISCREPANCY_PERCENT;
                
                MassBalanceReportData.Discrepancy discrepancy = MassBalanceReportData.Discrepancy.builder()
                    .tankId(balance.getTankId())
                    .tankName(balance.getTankName())
                    .severity(severity)
                    .type(type)
                    .volumeDiscrepancy(balance.getVolumeDiscrepancy())
                    .massDiscrepancy(balance.getMassDiscrepancy())
                    .volumeDiscrepancyPercent(balance.getVolumeDiscrepancyPercent())
                    .massDiscrepancyPercent(balance.getMassDiscrepancyPercent())
                    .possibleCauses(possibleCauses)
                    .recommendation(recommendation)
                    .requiresInvestigation(requiresInvestigation)
                    .build();
                
                discrepancies.add(discrepancy);
                
                log.warn("[{}] Discrepancy detected in tank {}: {}% volume, {}% mass - {}",
                        balance.getTankId(), balance.getTankName(),
                        balance.getVolumeDiscrepancyPercent(),
                        balance.getMassDiscrepancyPercent(),
                        severity);
            }
        }
        
        return discrepancies;
    }
    
    /**
     * Calculate statistics for mass balance report
     */
    public MassBalanceReportData.MassBalanceStatistics calculateStatistics(
            List<MassBalanceReportData.TankMassBalance> tankBalances,
            MassBalanceReportData.GlobalMassBalance globalBalance) {
        
        int tanksBalanced = 0;
        int tanksWithWarning = 0;
        int tanksWithCritical = 0;
        
        double sumVolumeDiscrepancyPercent = 0;
        double maxVolumeDiscrepancyPercent = 0;
        double sumMassDiscrepancyPercent = 0;
        double maxMassDiscrepancyPercent = 0;
        
        for (MassBalanceReportData.TankMassBalance balance : tankBalances) {
            String status = balance.getDiscrepancyStatus();
            switch (status) {
                case "acceptable":
                    tanksBalanced++;
                    break;
                case "warning":
                    tanksWithWarning++;
                    break;
                case "critical":
                    tanksWithCritical++;
                    break;
            }
            
            sumVolumeDiscrepancyPercent += balance.getVolumeDiscrepancyPercent();
            sumMassDiscrepancyPercent += balance.getMassDiscrepancyPercent();
            
            maxVolumeDiscrepancyPercent = Math.max(maxVolumeDiscrepancyPercent, 
                balance.getVolumeDiscrepancyPercent());
            maxMassDiscrepancyPercent = Math.max(maxMassDiscrepancyPercent, 
                balance.getMassDiscrepancyPercent());
        }
        
        double avgVolumeDiscrepancyPercent = tankBalances.isEmpty() ? 0 
            : sumVolumeDiscrepancyPercent / tankBalances.size();
        double avgMassDiscrepancyPercent = tankBalances.isEmpty() ? 0 
            : sumMassDiscrepancyPercent / tankBalances.size();
        
        // Check API MPMS compliance (< 0.3% discrepancy)
        boolean compliant = maxVolumeDiscrepancyPercent <= ACCEPTABLE_DISCREPANCY_PERCENT &&
                           maxMassDiscrepancyPercent <= ACCEPTABLE_DISCREPANCY_PERCENT;
        
        String complianceNotes = compliant 
            ? "All tanks within API MPMS Chapter 13.1 acceptable limits (±0.3%)"
            : String.format("Compliance issue: Max discrepancy %.2f%% volume, %.2f%% mass",
                maxVolumeDiscrepancyPercent, maxMassDiscrepancyPercent);
        
        return MassBalanceReportData.MassBalanceStatistics.builder()
            .totalTanks(tankBalances.size())
            .tanksBalanced(tanksBalanced)
            .tanksWithWarning(tanksWithWarning)
            .tanksWithCriticalDiscrepancy(tanksWithCritical)
            .avgVolumeDiscrepancyPercent(avgVolumeDiscrepancyPercent)
            .maxVolumeDiscrepancyPercent(maxVolumeDiscrepancyPercent)
            .avgMassDiscrepancyPercent(avgMassDiscrepancyPercent)
            .maxMassDiscrepancyPercent(maxMassDiscrepancyPercent)
            .totalTransactions(globalBalance.getTotalReceiptsCount() + globalBalance.getTotalDeliveriesCount())
            .totalReceipts(globalBalance.getTotalReceiptsCount())
            .totalDeliveries(globalBalance.getTotalDeliveriesCount())
            .totalVolumeIn(globalBalance.getTotalReceiptsVolume())
            .totalVolumeOut(globalBalance.getTotalDeliveriesVolume())
            .netVolumeChange(globalBalance.getTotalReceiptsVolume() - globalBalance.getTotalDeliveriesVolume())
            .totalMassIn(globalBalance.getTotalReceiptsMass())
            .totalMassOut(globalBalance.getTotalDeliveriesMass())
            .netMassChange(globalBalance.getTotalReceiptsMass() - globalBalance.getTotalDeliveriesMass())
            .compliantWithAPIMPMS(compliant)
            .complianceNotes(complianceNotes)
            .build();
    }
    
    // ==================== Helper Methods ====================
    
    /**
     * Determine discrepancy status based on thresholds
     */
    private String determineDiscrepancyStatus(double volumeDiscrepancyPercent, double massDiscrepancyPercent) {
        double maxDiscrepancy = Math.max(volumeDiscrepancyPercent, massDiscrepancyPercent);
        
        if (maxDiscrepancy <= ACCEPTABLE_DISCREPANCY_PERCENT) {
            return "acceptable";
        } else if (maxDiscrepancy <= WARNING_DISCREPANCY_PERCENT) {
            return "warning";
        } else {
            return "critical";
        }
    }
    
    /**
     * Determine type of discrepancy
     */
    private String determineDiscrepancyType(double volumeDiscrepancyPercent, double massDiscrepancyPercent) {
        boolean volumeIssue = volumeDiscrepancyPercent > ACCEPTABLE_DISCREPANCY_PERCENT;
        boolean massIssue = massDiscrepancyPercent > ACCEPTABLE_DISCREPANCY_PERCENT;
        
        if (volumeIssue && massIssue) {
            return "both";
        } else if (volumeIssue) {
            return "volume";
        } else if (massIssue) {
            return "mass";
        } else {
            return "none";
        }
    }
    
    /**
     * Analyze possible reasons for discrepancy
     */
    private String analyzeDiscrepancyReason(
            double volumeDiscrepancy,
            double massDiscrepancy,
            double volumeDiscrepancyPercent,
            double massDiscrepancyPercent,
            int receiptsCount,
            int deliveriesCount) {
        
        if (volumeDiscrepancyPercent <= ACCEPTABLE_DISCREPANCY_PERCENT &&
            massDiscrepancyPercent <= ACCEPTABLE_DISCREPANCY_PERCENT) {
            return "Within acceptable limits";
        }
        
        List<String> reasons = new ArrayList<>();
        
        // Analyze direction of discrepancy
        if (volumeDiscrepancy > 0) {
            reasons.add("Actual volume higher than expected (possible gain)");
        } else if (volumeDiscrepancy < 0) {
            reasons.add("Actual volume lower than expected (possible loss)");
        }
        
        // Check for measurement errors
        if (receiptsCount + deliveriesCount > 10) {
            reasons.add("High transaction count may accumulate measurement errors");
        }
        
        // Check for temperature effects
        if (Math.abs(volumeDiscrepancyPercent - massDiscrepancyPercent) > 0.2) {
            reasons.add("Significant difference between volume and mass discrepancy suggests temperature effects");
        }
        
        return reasons.isEmpty() ? "Unknown cause" : String.join("; ", reasons);
    }
    
    /**
     * Identify possible causes of discrepancy
     */
    private List<String> identifyPossibleCauses(
            double volumeDiscrepancy,
            double massDiscrepancy,
            double volumeDiscrepancyPercent,
            double massDiscrepancyPercent,
            int receiptsCount,
            int deliveriesCount) {
        
        List<String> causes = new ArrayList<>();
        
        // 1. Measurement errors
        if (receiptsCount + deliveriesCount > 5) {
            causes.add("Cumulative measurement errors from multiple transactions");
        }
        
        // 2. Temperature variations
        if (Math.abs(volumeDiscrepancyPercent - massDiscrepancyPercent) > 0.2) {
            causes.add("Temperature variations affecting volume measurements");
        }
        
        // 3. Evaporation or leakage
        if (volumeDiscrepancy < 0 && massDiscrepancy < 0) {
            causes.add("Possible evaporation or product loss");
        }
        
        // 4. Calibration issues
        if (volumeDiscrepancyPercent > WARNING_DISCREPANCY_PERCENT) {
            causes.add("Tank gauging system may require calibration");
        }
        
        // 5. Unrecorded transactions
        if (Math.abs(volumeDiscrepancy) > 1000) { // More than 1000 liters
            causes.add("Possible unrecorded receipts or deliveries");
        }
        
        // 6. Density variations
        if (massDiscrepancyPercent > volumeDiscrepancyPercent * 1.5) {
            causes.add("Product density variations");
        }
        
        // 7. Tank strapping table accuracy
        causes.add("Tank strapping table accuracy");
        
        return causes;
    }
    
    /**
     * Generate recommendation based on severity and causes
     */
    private String generateRecommendation(String severity, List<String> possibleCauses) {
        StringBuilder recommendation = new StringBuilder();
        
        switch (severity) {
            case "critical":
                recommendation.append("URGENT: Immediate investigation required. ");
                recommendation.append("Stop operations and verify: ");
                break;
            case "warning":
                recommendation.append("Investigation recommended. ");
                recommendation.append("Review: ");
                break;
            default:
                recommendation.append("Monitor closely. ");
                recommendation.append("Consider checking: ");
                break;
        }
        
        // Add specific recommendations based on causes
        if (possibleCauses.contains("Tank gauging system may require calibration")) {
            recommendation.append("1) Calibrate tank gauging system. ");
        }
        if (possibleCauses.contains("Possible evaporation or product loss")) {
            recommendation.append("2) Inspect tank for leaks. ");
        }
        if (possibleCauses.contains("Temperature variations affecting volume measurements")) {
            recommendation.append("3) Review temperature compensation calculations. ");
        }
        if (possibleCauses.contains("Possible unrecorded receipts or deliveries")) {
            recommendation.append("4) Audit transaction records. ");
        }
        
        return recommendation.toString();
    }
    
    /**
     * Format timestamp to readable string
     */
    private String formatTimestamp(long timestamp) {
        return new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
            .format(new java.util.Date(timestamp));
    }
}
