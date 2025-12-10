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
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;
import org.thingsboard.server.dao.gdt.report.model.ReportFormat;
import org.thingsboard.server.dao.gdt.report.model.ReportType;
import org.thingsboard.server.dao.gdt.report.model.report.DailyInventoryReportData;
import org.thingsboard.server.dao.gdt.report.model.report.HistoricalLevelTrendsReportData;
import org.thingsboard.server.dao.gdt.report.model.report.HistoricalVolumeTrendsReportData;
import org.thingsboard.server.dao.gdt.report.model.report.TemperatureProfileReportData;
import org.thingsboard.server.dao.gdt.report.model.report.AlarmHistoryReportData;
import org.thingsboard.server.dao.gdt.report.model.report.MassBalanceReportData;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * Report Export Service
 * Handles export to different formats (CSV, PDF, Excel)
 */
@Service
@Slf4j
public class ReportExportService {

    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    /**
     * Export report to requested format
     */
    public byte[] exportReport(
            Object reportData, 
            ReportFormat format,
            ReportType reportType) {

        switch (format) {
            case CSV:
                return exportToCSV(reportData, reportType);
            case PDF:
                return exportToPDF(reportData, reportType);
            case EXCEL:
                return exportToExcel(reportData, reportType);
            default:
                throw new IllegalArgumentException("Unsupported format: " + format);
        }
    }

    /**
     * Export to CSV
     */
    private byte[] exportToCSV(Object reportData, ReportType reportType) {
        StringBuilder csv = new StringBuilder();

        if (reportData instanceof DailyInventoryReportData) {
            DailyInventoryReportData data = (DailyInventoryReportData) reportData;
            
            // Headers
            csv.append("Tank ID,Tank Name,Product,Level (mm),Temperature (°C),")
               .append("TOV (L),GOV (L),GSV (L),NSV (L),Density (kg/L),")
               .append("Mass (kg),Capacity (L),Utilization (%),Status,Last Update\n");

            // Data rows
            data.getTanks().forEach(tank -> {
                csv.append(String.format("\"%s\",\"%s\",\"%s\",%.2f,%.2f,%.2f,%.2f,%.2f,%.2f,%.3f,%.2f,%.2f,%.2f,\"%s\",\"%s\"\n",
                    tank.getTankId(),
                    tank.getTankName(),
                    tank.getProduct(),
                    tank.getLevel(),
                    tank.getTemperature(),
                    tank.getTov(),
                    tank.getGov(),
                    tank.getGsv(),
                    tank.getNsv(),
                    tank.getDensity(),
                    tank.getMass(),
                    tank.getCapacity(),
                    tank.getUtilization(),
                    tank.getStatus(),
                    new Date(tank.getLastUpdate()).toString()
                ));
            });
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Export to PDF using Apache PDFBox
     */
    private byte[] exportToPDF(Object reportData, ReportType reportType) {
        log.info("Generating PDF report for type: {}", reportType);
        
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                // Title
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 18);
                contentStream.newLineAtOffset(50, 750);
                contentStream.showText(getReportTitle(reportType));
                contentStream.endText();
                
                // Date
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA, 10);
                contentStream.newLineAtOffset(50, 730);
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
                contentStream.showText("Generated: " + sdf.format(new Date()));
                contentStream.endText();
                
                // Content based on report type
                if (reportData instanceof DailyInventoryReportData) {
                    DailyInventoryReportData invData = (DailyInventoryReportData) reportData;
                    
                    // Add report-specific description
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA, 10);
                    contentStream.newLineAtOffset(50, 710);
                    contentStream.showText(getReportDescription(reportType, invData));
                    contentStream.endText();
                    
                    exportDailyInventoryToPDF(contentStream, invData);
                } else if (reportData instanceof HistoricalLevelTrendsReportData) {
                    exportHistoricalLevelTrendsToPDF(contentStream, (HistoricalLevelTrendsReportData) reportData);
                } else if (reportData instanceof HistoricalVolumeTrendsReportData) {
                    exportHistoricalVolumeTrendsToPDF(contentStream, (HistoricalVolumeTrendsReportData) reportData);
                } else if (reportData instanceof TemperatureProfileReportData) {
                    exportTemperatureProfileToPDF(contentStream, (TemperatureProfileReportData) reportData);
                } else if (reportData instanceof AlarmHistoryReportData) {
                    exportAlarmHistoryToPDF(contentStream, (AlarmHistoryReportData) reportData);
                } else if (reportData instanceof MassBalanceReportData) {
                    exportMassBalanceToPDF(contentStream, (MassBalanceReportData) reportData);
                } else if (reportData instanceof org.thingsboard.server.dao.gdt.report.model.report.BatchHistoryReportData) {
                    exportBatchHistoryToPDF(contentStream, (org.thingsboard.server.dao.gdt.report.model.report.BatchHistoryReportData) reportData);
                } else {
                    // Generic export
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA, 12);
                    contentStream.newLineAtOffset(50, 700);
                    contentStream.showText("Report type not yet implemented for PDF export");
                    contentStream.endText();
                }
            }
            
            document.save(baos);
            return baos.toByteArray();
            
        } catch (IOException e) {
            log.error("Error generating PDF", e);
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }
    
    /**
     * Export Daily Inventory Report to PDF
     */
    private void exportDailyInventoryToPDF(PDPageContentStream contentStream, 
                                          DailyInventoryReportData data) throws IOException {
        float yPosition = 680;
        
        // Check if this is a placeholder report (empty data)
        boolean isPlaceholder = (data.getTanks() == null || data.getTanks().isEmpty()) && 
                                data.getTotalTanks() == 0;
        
        if (isPlaceholder) {
            // Show placeholder message
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 14);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Report Under Development");
            contentStream.endText();
            
            yPosition -= 30;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 11);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("This report type is currently being implemented.");
            contentStream.endText();
            
            yPosition -= 20;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 11);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Data generation logic is in development.");
            contentStream.endText();
            
            yPosition -= 30;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_OBLIQUE, 10);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Please check back soon for full functionality.");
            contentStream.endText();
            
            return; // Exit early for placeholder reports
        }
        
        // Summary Statistics
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText("Summary Statistics");
        contentStream.endText();
        
        yPosition -= 25;
        
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText(String.format("Total Tanks: %d  |  Active Tanks: %d  |  Total Volume: %.2f L  |  Avg Utilization: %.1f%%",
            data.getTotalTanks(), data.getActiveTanks(), data.getTotalVolume(), data.getAverageUtilization()));
        contentStream.endText();
        
        yPosition -= 35;
        
        // Tank Details Header
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText("Tank Details");
        contentStream.endText();
        
        yPosition -= 25;
        
        // Table headers
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 9);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText("Tank");
        contentStream.newLineAtOffset(80, 0);
        contentStream.showText("Product");
        contentStream.newLineAtOffset(70, 0);
        contentStream.showText("Level(mm)");
        contentStream.newLineAtOffset(60, 0);
        contentStream.showText("Volume(L)");
        contentStream.newLineAtOffset(60, 0);
        contentStream.showText("Temp(C)");
        contentStream.newLineAtOffset(55, 0);
        contentStream.showText("Util(%)");
        contentStream.newLineAtOffset(50, 0);
        contentStream.showText("Status");
        contentStream.endText();
        
        yPosition -= 18;
        
        // Data rows
        contentStream.setFont(PDType1Font.HELVETICA, 8);
        for (DailyInventoryReportData.TankInventoryData tank : data.getTanks()) {
            contentStream.beginText();
            contentStream.newLineAtOffset(50, yPosition);
            
            String tankName = tank.getTankName() != null ? tank.getTankName() : "N/A";
            if (tankName.length() > 12) tankName = tankName.substring(0, 12);
            contentStream.showText(tankName);
            
            contentStream.newLineAtOffset(80, 0);
            String product = tank.getProduct() != null ? tank.getProduct() : "N/A";
            if (product.length() > 10) product = product.substring(0, 10);
            contentStream.showText(product);
            
            contentStream.newLineAtOffset(70, 0);
            contentStream.showText(String.format("%.1f", tank.getLevel()));
            
            contentStream.newLineAtOffset(60, 0);
            contentStream.showText(String.format("%.1f", tank.getTov()));
            
            contentStream.newLineAtOffset(60, 0);
            contentStream.showText(String.format("%.1f", tank.getTemperature()));
            
            contentStream.newLineAtOffset(55, 0);
            contentStream.showText(String.format("%.1f", tank.getUtilization()));
            
            contentStream.newLineAtOffset(50, 0);
            contentStream.showText(tank.getStatus() != null ? tank.getStatus() : "N/A");
            
            contentStream.endText();
            
            yPosition -= 15;
            
            // Check if we need a new page
            if (yPosition < 50) {
                break; // For now, just stop. TODO: Add new page support
            }
        }
    }
    
    /**
     * Get report title based on type
     */
    private String getReportTitle(ReportType reportType) {
        switch (reportType) {
            case DAILY_INVENTORY:
                return "Daily Inventory Report";
            case TANK_INVENTORY_SUMMARY:
                return "Tank Inventory Summary";
            case PRODUCT_INVENTORY_BY_GROUP:
                return "Product Inventory by Group";
            case TANK_STATUS:
                return "Tank Status Report";
            case CAPACITY_UTILIZATION:
                return "Capacity Utilization Report";
            case LOW_STOCK_ALERT:
                return "Low Stock Alert Report";
            case OVERFILL_RISK:
                return "Overfill Risk Report";
            default:
                return "Report";
        }
    }
    
    /**
     * Get report description based on type (for inventory reports)
     */
    private String getReportDescription(ReportType reportType, DailyInventoryReportData data) {
        switch (reportType) {
            case DAILY_INVENTORY:
                return "Detailed inventory status for all tanks";
            case TANK_INVENTORY_SUMMARY:
                return "Aggregated inventory by product type (" + data.getTanks().size() + " product groups)";
            case PRODUCT_INVENTORY_BY_GROUP:
                return "Product-based inventory grouping (" + data.getTanks().size() + " groups)";
            case TANK_STATUS:
                return "Operational status of all tanks (" + data.getTotalTanks() + " tanks)";
            case CAPACITY_UTILIZATION:
                return "Tanks sorted by utilization percentage (highest to lowest)";
            case LOW_STOCK_ALERT:
                return "Tanks with utilization below 20% (" + data.getTanks().size() + " tanks at risk)";
            case OVERFILL_RISK:
                return "Tanks with utilization above 85% (" + data.getTanks().size() + " tanks at risk)";
            default:
                return "";
        }
    }

    /**
     * Export Historical Level Trends to PDF
     */
    private void exportHistoricalLevelTrendsToPDF(PDPageContentStream contentStream,
                                                   HistoricalLevelTrendsReportData data) throws IOException {
        float yPosition = 710;
        
        // Report info
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText(String.format("Period: %s | Aggregation: %s | Tanks: %d",
            data.getReportPeriod() != null ? data.getReportPeriod() : "N/A",
            data.getAggregationInterval() != null ? data.getAggregationInterval() : "N/A",
            data.getTankTrends() != null ? data.getTankTrends().size() : 0));
        contentStream.endText();
        
        yPosition -= 30;
        
        // Global Statistics
        if (data.getStatistics() != null) {
            HistoricalLevelTrendsReportData.TrendStatistics stats = data.getStatistics();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 11);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Level Statistics");
            contentStream.endText();
            
            yPosition -= 20;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 9);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText(String.format("Tanks: %d  |  Increasing: %d  |  Decreasing: %d  |  Stable: %d",
                stats.getTotalTanks(), stats.getTanksIncreasing(), stats.getTanksDecreasing(), stats.getTanksStable()));
            contentStream.endText();
            
            yPosition -= 30;
        }
        
        // Tank Trends
        if (data.getTankTrends() != null && !data.getTankTrends().isEmpty()) {
            for (HistoricalLevelTrendsReportData.TankLevelTrend tank : data.getTankTrends()) {
                if (yPosition < 150) break; // Not enough space
                
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
                contentStream.newLineAtOffset(50, yPosition);
                contentStream.showText("Tank: " + (tank.getTankName() != null ? tank.getTankName() : "N/A"));
                contentStream.endText();
                
                yPosition -= 18;
                
                // Tank metrics
                if (tank.getMetrics() != null) {
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA, 8);
                    contentStream.newLineAtOffset(50, yPosition);
                    contentStream.showText(String.format("Min: %.2f mm | Max: %.2f mm | Avg: %.2f mm | Trend: %s",
                        tank.getMetrics().getMinLevel(), tank.getMetrics().getMaxLevel(),
                        tank.getMetrics().getAvgLevel(), tank.getMetrics().getTrend() != null ? tank.getMetrics().getTrend() : "N/A"));
                    contentStream.endText();
                    
                    yPosition -= 15;
                }
                
                // Sample data points (first 5)
                if (tank.getDataPoints() != null && !tank.getDataPoints().isEmpty()) {
                    int pointCount = 0;
                    for (HistoricalLevelTrendsReportData.DataPoint point : tank.getDataPoints()) {
                        if (pointCount >= 5 || yPosition < 50) break;
                        
                        contentStream.beginText();
                        contentStream.setFont(PDType1Font.HELVETICA, 7);
                        contentStream.newLineAtOffset(60, yPosition);
                        contentStream.showText(String.format("%s: %.2f mm",
                            point.getDateTime() != null ? point.getDateTime() : "N/A",
                            point.getLevel()));
                        contentStream.endText();
                        
                        yPosition -= 10;
                        pointCount++;
                    }
                    
                    if (tank.getDataPoints().size() > 5) {
                        contentStream.beginText();
                        contentStream.setFont(PDType1Font.HELVETICA_OBLIQUE, 7);
                        contentStream.newLineAtOffset(60, yPosition);
                        contentStream.showText(String.format("... and %d more points", tank.getDataPoints().size() - 5));
                        contentStream.endText();
                        yPosition -= 10;
                    }
                }
                
                yPosition -= 15; // Space between tanks
            }
        }
    }
    
    /**
     * Export Historical Volume Trends to PDF
     */
    private void exportHistoricalVolumeTrendsToPDF(PDPageContentStream contentStream,
                                                    HistoricalVolumeTrendsReportData data) throws IOException {
        float yPosition = 710;
        
        // Report info
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText(String.format("Period: %s | Aggregation: %s | Tanks: %d",
            data.getReportPeriod() != null ? data.getReportPeriod() : "N/A",
            data.getAggregationInterval() != null ? data.getAggregationInterval() : "N/A",
            data.getTankTrends() != null ? data.getTankTrends().size() : 0));
        contentStream.endText();
        
        yPosition -= 30;
        
        // Global Statistics
        if (data.getStatistics() != null) {
            HistoricalVolumeTrendsReportData.VolumeStatistics stats = data.getStatistics();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 11);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Volume Statistics");
            contentStream.endText();
            
            yPosition -= 20;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 9);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText(String.format("Total Gross: %.2f L  |  Total Net: %.2f L  |  Total Change: %.2f L",
                stats.getTotalGrossVolume(), stats.getTotalNetVolume(), stats.getTotalVolumeChange()));
            contentStream.endText();
            
            yPosition -= 30;
        }
        
        // Tank Trends
        if (data.getTankTrends() != null && !data.getTankTrends().isEmpty()) {
            for (HistoricalVolumeTrendsReportData.TankVolumeTrend tank : data.getTankTrends()) {
                if (yPosition < 150) break; // Not enough space
                
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
                contentStream.newLineAtOffset(50, yPosition);
                contentStream.showText("Tank: " + (tank.getTankName() != null ? tank.getTankName() : "N/A"));
                contentStream.endText();
                
                yPosition -= 18;
                
                // Tank metrics
                if (tank.getMetrics() != null) {
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA, 8);
                    contentStream.newLineAtOffset(50, yPosition);
                    contentStream.showText(String.format("Min: %.2f L | Max: %.2f L | Avg: %.2f L",
                        tank.getMetrics().getMinVolume(), tank.getMetrics().getMaxVolume(),
                        tank.getMetrics().getAvgVolume()));
                    contentStream.endText();
                    
                    yPosition -= 15;
                }
                
                // Sample data points (first 5)
                if (tank.getDataPoints() != null && !tank.getDataPoints().isEmpty()) {
                    int pointCount = 0;
                    for (HistoricalVolumeTrendsReportData.VolumeDataPoint point : tank.getDataPoints()) {
                        if (pointCount >= 5 || yPosition < 50) break;
                        
                        contentStream.beginText();
                        contentStream.setFont(PDType1Font.HELVETICA, 7);
                        contentStream.newLineAtOffset(60, yPosition);
                        contentStream.showText(String.format("%s: %.2f L",
                            point.getDateTime() != null ? point.getDateTime() : "N/A",
                            point.getGrossVolume()));
                        contentStream.endText();
                        
                        yPosition -= 10;
                        pointCount++;
                    }
                    
                    if (tank.getDataPoints().size() > 5) {
                        contentStream.beginText();
                        contentStream.setFont(PDType1Font.HELVETICA_OBLIQUE, 7);
                        contentStream.newLineAtOffset(60, yPosition);
                        contentStream.showText(String.format("... and %d more points", tank.getDataPoints().size() - 5));
                        contentStream.endText();
                        yPosition -= 10;
                    }
                }
                
                yPosition -= 15; // Space between tanks
            }
        }
    }
    
    /**
     * Export Temperature Profile to PDF
     */
    private void exportTemperatureProfileToPDF(PDPageContentStream contentStream,
                                               TemperatureProfileReportData data) throws IOException {
        float yPosition = 710;
        
        // Report info
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText(String.format("Period: %s | Tanks: %d",
            data.getReportPeriod() != null ? data.getReportPeriod() : "N/A",
            data.getTankProfiles() != null ? data.getTankProfiles().size() : 0));
        contentStream.endText();
        
        yPosition -= 30;
        
        // Global Statistics
        if (data.getStatistics() != null) {
            TemperatureProfileReportData.TemperatureStatistics stats = data.getStatistics();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 11);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Temperature Statistics");
            contentStream.endText();
            
            yPosition -= 20;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 9);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText(String.format("Min: %.2f°C  |  Max: %.2f°C  |  Avg: %.2f°C  |  Data Points: %d",
                stats.getMinTemperatureAllTanks(), stats.getMaxTemperatureAllTanks(), 
                stats.getAvgTemperatureAllTanks(), stats.getTotalDataPoints()));
            contentStream.endText();
            
            yPosition -= 30;
        }
        
        // Tank Profiles
        if (data.getTankProfiles() != null && !data.getTankProfiles().isEmpty()) {
            for (TemperatureProfileReportData.TankTemperatureProfile tank : data.getTankProfiles()) {
                if (yPosition < 150) break; // Not enough space for another tank
                
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
                contentStream.newLineAtOffset(50, yPosition);
                contentStream.showText("Tank: " + (tank.getTankName() != null ? tank.getTankName() : "N/A"));
                contentStream.endText();
                
                yPosition -= 18;
                
                // Tank metrics
                if (tank.getMetrics() != null) {
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA, 8);
                    contentStream.newLineAtOffset(50, yPosition);
                    contentStream.showText(String.format("Min: %.2f°C | Max: %.2f°C | Avg: %.2f°C | Anomalies: %d",
                        tank.getMetrics().getMinTemperature(), tank.getMetrics().getMaxTemperature(),
                        tank.getMetrics().getAvgTemperature(), 
                        tank.getAnomalies() != null ? tank.getAnomalies().size() : 0));
                    contentStream.endText();
                    
                    yPosition -= 15;
                }
                
                // Sample data points (first 5)
                if (tank.getDataPoints() != null && !tank.getDataPoints().isEmpty()) {
                    int pointCount = 0;
                    for (TemperatureProfileReportData.TemperatureDataPoint point : tank.getDataPoints()) {
                        if (pointCount >= 5 || yPosition < 50) break;
                        
                        contentStream.beginText();
                        contentStream.setFont(PDType1Font.HELVETICA, 7);
                        contentStream.newLineAtOffset(60, yPosition);
                        contentStream.showText(String.format("%s: %.2f°C",
                            point.getDateTime() != null ? point.getDateTime() : "N/A",
                            point.getTemperature()));
                        contentStream.endText();
                        
                        yPosition -= 10;
                        pointCount++;
                    }
                    
                    if (tank.getDataPoints().size() > 5) {
                        contentStream.beginText();
                        contentStream.setFont(PDType1Font.HELVETICA_OBLIQUE, 7);
                        contentStream.newLineAtOffset(60, yPosition);
                        contentStream.showText(String.format("... and %d more points", tank.getDataPoints().size() - 5));
                        contentStream.endText();
                        yPosition -= 10;
                    }
                }
                
                yPosition -= 15; // Space between tanks
            }
        }
    }
    
    /**
     * Export Alarm History to PDF
     */
    private void exportAlarmHistoryToPDF(PDPageContentStream contentStream,
                                         AlarmHistoryReportData data) throws IOException {
        float yPosition = 710;
        
        // Report info
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText(String.format("Period: %s | Total Alarms: %d",
            data.getReportPeriod() != null ? data.getReportPeriod() : "N/A",
            data.getStatistics() != null ? data.getStatistics().getTotalAlarms() : 0));
        contentStream.endText();
        
        yPosition -= 30;
        
        // Statistics
        if (data.getStatistics() != null) {
            AlarmHistoryReportData.AlarmStatistics stats = data.getStatistics();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 11);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Alarm Statistics");
            contentStream.endText();
            
            yPosition -= 20;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 9);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText(String.format("Critical: %d  |  Major: %d  |  Minor: %d  |  Warning: %d",
                stats.getCriticalAlarms(), stats.getMajorAlarms(), stats.getMinorAlarms(), stats.getWarningAlarms()));
            contentStream.endText();
            
            yPosition -= 18;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 9);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText(String.format("Active: %d  |  Acknowledged: %d  |  Cleared: %d",
                stats.getActiveAlarms(), stats.getAcknowledgedAlarms(), stats.getClearedAlarms()));
            contentStream.endText();
            
            yPosition -= 30;
        }
        
        // Alarm list
        if (data.getAlarms() != null && !data.getAlarms().isEmpty()) {
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 11);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Alarm History");
            contentStream.endText();
            
            yPosition -= 20;
            
            // Table headers
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 8);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Time");
            contentStream.newLineAtOffset(120, 0);
            contentStream.showText("Type");
            contentStream.newLineAtOffset(100, 0);
            contentStream.showText("Severity");
            contentStream.newLineAtOffset(70, 0);
            contentStream.showText("Status");
            contentStream.endText();
            
            yPosition -= 15;
            
            // Alarm rows
            contentStream.setFont(PDType1Font.HELVETICA, 7);
            int count = 0;
            for (AlarmHistoryReportData.AlarmRecord alarm : data.getAlarms()) {
                if (count >= 35) break;
                
                contentStream.beginText();
                contentStream.newLineAtOffset(50, yPosition);
                contentStream.showText(alarm.getCreatedTimeStr() != null ? alarm.getCreatedTimeStr() : "N/A");
                contentStream.newLineAtOffset(120, 0);
                String type = alarm.getAlarmType() != null ? alarm.getAlarmType() : "N/A";
                if (type.length() > 15) type = type.substring(0, 15);
                contentStream.showText(type);
                contentStream.newLineAtOffset(100, 0);
                contentStream.showText(alarm.getSeverity() != null ? alarm.getSeverity() : "N/A");
                contentStream.newLineAtOffset(70, 0);
                contentStream.showText(alarm.getStatus() != null ? alarm.getStatus() : "N/A");
                contentStream.endText();
                
                yPosition -= 11;
                count++;
                
                if (yPosition < 50) break;
            }
            
            if (data.getAlarms().size() > 35) {
                yPosition -= 15;
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_OBLIQUE, 8);
                contentStream.newLineAtOffset(50, yPosition);
                contentStream.showText(String.format("... and %d more alarms", data.getAlarms().size() - 35));
                contentStream.endText();
            }
        }
    }
    
    /**
     * Export Mass Balance to PDF
     */
    private void exportMassBalanceToPDF(PDPageContentStream contentStream,
                                        MassBalanceReportData data) throws IOException {
        float yPosition = 710;
        
        // Report info
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText(String.format("Period: %s | Tanks: %d",
            data.getReportPeriod() != null ? data.getReportPeriod() : "N/A",
            data.getGlobalBalance() != null ? data.getGlobalBalance().getTotalTanks() : 0));
        contentStream.endText();
        
        yPosition -= 30;
        
        // Global Balance Summary
        if (data.getGlobalBalance() != null) {
            MassBalanceReportData.GlobalMassBalance global = data.getGlobalBalance();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 11);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Global Mass Balance Summary");
            contentStream.endText();
            
            yPosition -= 20;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 9);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText(String.format("Opening: %.2f kg  |  Receipts: %.2f kg  |  Deliveries: %.2f kg",
                global.getTotalOpeningMass(), global.getTotalReceiptsMass(), global.getTotalDeliveriesMass()));
            contentStream.endText();
            
            yPosition -= 18;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 9);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText(String.format("Closing: %.2f kg  |  Discrepancy: %.2f kg (%.2f%%)",
                global.getTotalClosingMass(), global.getTotalMassDiscrepancy(), global.getTotalMassDiscrepancyPercent()));
            contentStream.endText();
            
            yPosition -= 25;
            
            // Status
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Status: " + (global.getBalanceStatus() != null ? global.getBalanceStatus().toUpperCase() : "N/A"));
            contentStream.endText();
            
            yPosition -= 30;
        }
        
        // Tank Balances
        if (data.getTankBalances() != null && !data.getTankBalances().isEmpty()) {
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 11);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Tank Balances");
            contentStream.endText();
            
            yPosition -= 20;
            
            // Table headers
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 8);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Tank");
            contentStream.newLineAtOffset(80, 0);
            contentStream.showText("Opening");
            contentStream.newLineAtOffset(70, 0);
            contentStream.showText("Closing");
            contentStream.newLineAtOffset(70, 0);
            contentStream.showText("Discrepancy");
            contentStream.newLineAtOffset(80, 0);
            contentStream.showText("Status");
            contentStream.endText();
            
            yPosition -= 15;
            
            // Tank rows
            contentStream.setFont(PDType1Font.HELVETICA, 7);
            int count = 0;
            for (MassBalanceReportData.TankMassBalance tank : data.getTankBalances()) {
                if (count >= 25) break;
                
                contentStream.beginText();
                contentStream.newLineAtOffset(50, yPosition);
                String tankName = tank.getTankName() != null ? tank.getTankName() : "N/A";
                if (tankName.length() > 12) tankName = tankName.substring(0, 12);
                contentStream.showText(tankName);
                contentStream.newLineAtOffset(80, 0);
                contentStream.showText(String.format("%.1f", tank.getOpeningMass()));
                contentStream.newLineAtOffset(70, 0);
                contentStream.showText(String.format("%.1f", tank.getClosingMass()));
                contentStream.newLineAtOffset(70, 0);
                contentStream.showText(String.format("%.2f%%", tank.getMassDiscrepancyPercent()));
                contentStream.newLineAtOffset(80, 0);
                contentStream.showText(tank.getDiscrepancyStatus() != null ? tank.getDiscrepancyStatus() : "N/A");
                contentStream.endText();
                
                yPosition -= 11;
                count++;
                
                if (yPosition < 50) break;
            }
        }
        
        // Discrepancies
        if (data.getDiscrepancies() != null && !data.getDiscrepancies().isEmpty()) {
            yPosition -= 20;
            if (yPosition > 100) {
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 11);
                contentStream.newLineAtOffset(50, yPosition);
                contentStream.showText("Critical Discrepancies");
                contentStream.endText();
                
                yPosition -= 18;
                
                contentStream.setFont(PDType1Font.HELVETICA, 8);
                for (MassBalanceReportData.Discrepancy disc : data.getDiscrepancies()) {
                    if (yPosition < 50) break;
                    
                    contentStream.beginText();
                    contentStream.newLineAtOffset(50, yPosition);
                    contentStream.showText(String.format("%s: %.2f%% - %s",
                        disc.getTankName(), disc.getMassDiscrepancyPercent(), disc.getSeverity()));
                    contentStream.endText();
                    yPosition -= 12;
                }
            }
        }
    }
    
    /**
     * Export to Excel using Apache POI
     */
    private byte[] exportToExcel(Object reportData, ReportType reportType) {
        log.info("Generating Excel report for type: {}", reportType);
        
        try {
            // TODO: Implement Excel export with Apache POI
            // For now, return CSV as fallback
            log.warn("Excel export using CSV fallback");
            return exportToCSV(reportData, reportType);
            
        } catch (Exception e) {
            log.error("Error generating Excel report", e);
            throw new RuntimeException("Failed to generate Excel report", e);
        }
    }
    
    /**
     * Export Batch History Report to PDF
     */
    private void exportBatchHistoryToPDF(PDPageContentStream contentStream,
                                         org.thingsboard.server.dao.gdt.report.model.report.BatchHistoryReportData data) throws IOException {
        float yPosition = 680;
        
        // Report period
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText(data.getReportPeriod());
        contentStream.endText();
        
        yPosition -= 30;
        
        // Statistics
        if (data.getStatistics() != null) {
            org.thingsboard.server.dao.gdt.report.model.report.BatchHistoryReportData.BatchStatistics stats = data.getStatistics();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 11);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Batch Statistics");
            contentStream.endText();
            
            yPosition -= 20;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 9);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText(String.format("Total: %d  |  Completed: %d  |  In Progress: %d  |  Cancelled: %d",
                stats.getTotalBatches(), stats.getCompletedBatches(), 
                stats.getInProgressBatches(), stats.getCancelledBatches()));
            contentStream.endText();
            
            yPosition -= 15;
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 9);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText(String.format("Total Volume: %.2f L  |  Avg Volume: %.2f L  |  Min: %.2f L  |  Max: %.2f L",
                stats.getTotalVolumeTransferred(), stats.getAvgBatchVolume(),
                stats.getMinBatchVolume(), stats.getMaxBatchVolume()));
            contentStream.endText();
            
            yPosition -= 30;
        }
        
        // Batch list
        if (data.getBatches() != null && !data.getBatches().isEmpty()) {
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 11);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Batch Transfers");
            contentStream.endText();
            
            yPosition -= 20;
            
            // Table headers
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 8);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("Batch #");
            contentStream.newLineAtOffset(60, 0);
            contentStream.showText("Tank");
            contentStream.newLineAtOffset(70, 0);
            contentStream.showText("Product");
            contentStream.newLineAtOffset(70, 0);
            contentStream.showText("Volume(L)");
            contentStream.newLineAtOffset(60, 0);
            contentStream.showText("Start Time");
            contentStream.newLineAtOffset(90, 0);
            contentStream.showText("Status");
            contentStream.endText();
            
            yPosition -= 15;
            
            // Batch rows
            contentStream.setFont(PDType1Font.HELVETICA, 7);
            int count = 0;
            for (org.thingsboard.server.dao.gdt.report.model.report.BatchHistoryReportData.BatchTransfer batch : data.getBatches()) {
                if (count >= 30) break;
                
                contentStream.beginText();
                contentStream.newLineAtOffset(50, yPosition);
                
                String batchNum = batch.getBatchNumber() != null ? batch.getBatchNumber() : "N/A";
                if (batchNum.length() > 10) batchNum = batchNum.substring(0, 10);
                contentStream.showText(batchNum);
                
                contentStream.newLineAtOffset(60, 0);
                String tankName = batch.getTankName() != null ? batch.getTankName() : "N/A";
                if (tankName.length() > 12) tankName = tankName.substring(0, 12);
                contentStream.showText(tankName);
                
                contentStream.newLineAtOffset(70, 0);
                String product = batch.getProduct() != null ? batch.getProduct() : "N/A";
                if (product.length() > 10) product = product.substring(0, 10);
                contentStream.showText(product);
                
                contentStream.newLineAtOffset(70, 0);
                contentStream.showText(String.format("%.1f", batch.getTransferredVolume() != null ? batch.getTransferredVolume() : 0.0));
                
                contentStream.newLineAtOffset(60, 0);
                String startTime = batch.getStartDateTime() != null ? batch.getStartDateTime() : "N/A";
                if (startTime.length() > 16) startTime = startTime.substring(0, 16);
                contentStream.showText(startTime);
                
                contentStream.newLineAtOffset(90, 0);
                contentStream.showText(batch.getStatus() != null ? batch.getStatus() : "N/A");
                
                contentStream.endText();
                
                yPosition -= 11;
                count++;
                
                if (yPosition < 50) break;
            }
        } else {
            // No batches found
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_OBLIQUE, 10);
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText("No batch transfers found in the selected period.");
            contentStream.endText();
        }
    }
}
