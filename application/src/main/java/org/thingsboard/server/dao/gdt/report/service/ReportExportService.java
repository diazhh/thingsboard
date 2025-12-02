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

    /**
     * Export report to requested format
     */
    public byte[] exportReport(
            Object reportData, 
            ReportType reportType, 
            ReportFormat format) {

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
                    exportDailyInventoryToPDF(contentStream, (DailyInventoryReportData) reportData);
                } else {
                    // Generic export
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA, 12);
                    contentStream.newLineAtOffset(50, 700);
                    contentStream.showText("Report data: " + reportData.toString());
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
        
        // Headers
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText("Tank Inventory Summary");
        contentStream.endText();
        
        yPosition -= 30;
        
        // Table headers
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
        contentStream.newLineAtOffset(50, yPosition);
        contentStream.showText("Tank");
        contentStream.newLineAtOffset(100, 0);
        contentStream.showText("Level (mm)");
        contentStream.newLineAtOffset(100, 0);
        contentStream.showText("Volume (L)");
        contentStream.newLineAtOffset(100, 0);
        contentStream.showText("Temp (C)");
        contentStream.endText();
        
        yPosition -= 20;
        
        // Data rows
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        for (DailyInventoryReportData.TankInventoryData tank : data.getTanks()) {
            contentStream.beginText();
            contentStream.newLineAtOffset(50, yPosition);
            contentStream.showText(tank.getTankName() != null ? tank.getTankName() : "N/A");
            contentStream.newLineAtOffset(100, 0);
            contentStream.showText(String.format("%.2f", tank.getLevel()));
            contentStream.newLineAtOffset(100, 0);
            contentStream.showText(String.format("%.2f", tank.getTov()));
            contentStream.newLineAtOffset(100, 0);
            contentStream.showText(String.format("%.2f", tank.getTemperature()));
            contentStream.endText();
            
            yPosition -= 20;
            
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
            default:
                return "Report";
        }
    }

    /**
     * Export to Excel
     * TODO: Implement with Apache POI
     */
    private byte[] exportToExcel(Object reportData, ReportType reportType) {
        log.warn("Excel export not yet implemented");
        throw new UnsupportedOperationException(
            "Excel export requires Apache POI dependency. " +
            "Add to pom.xml: org.apache.poi:poi-ooxml:5.2.3"
        );
    }
}
