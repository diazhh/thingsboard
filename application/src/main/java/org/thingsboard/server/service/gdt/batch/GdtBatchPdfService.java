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
package org.thingsboard.server.service.gdt.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.dao.attributes.AttributesService;
import org.thingsboard.server.dao.asset.AssetService;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.client.j2se.MatrixToImageWriter;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * GDT Batch PDF Service
 *
 * Service for generating custody transfer batch reports in PDF format.
 * Uses Apache PDFBox for PDF generation and ZXing for QR code generation.
 *
 * Features:
 * - Professional PDF layout with company branding
 * - Opening and closing gauge data
 * - Calculated volumes (TOV, GOV, GSV, NSV, Mass, WIA)
 * - QR code for verification
 * - SHA-256 digital signature
 * - OIML R85 compliance ready
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GdtBatchPdfService {

    private final AttributesService attributesService;
    private final AssetService assetService;

    private static final float MARGIN = 50f;
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
    private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();

    // Colors (RGB)
    private static final float[] PRIMARY_COLOR = {13f/255f, 115f/255f, 119f/255f}; // #0d7377
    private static final float[] GRAY_LIGHT = {0.95f, 0.95f, 0.95f};
    private static final float[] GRAY_MEDIUM = {0.7f, 0.7f, 0.7f};

    /**
     * Generate batch PDF report
     *
     * @param batchId Batch identifier
     * @param tenantId Tenant identifier
     * @return PDF as byte array
     * @throws Exception if generation fails
     */
    public byte[] generateBatchPdf(String batchId, TenantId tenantId) throws Exception {
        log.info("[GdtBatchPdfService] Generating PDF for batch: {}, tenant: {}", batchId, tenantId);

        // Load batch data from attributes
        Map<String, Object> batchData = getBatchData(batchId, tenantId);

        // Create PDF document
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                float yPosition = PAGE_HEIGHT - MARGIN;

                // Header
                yPosition = addHeader(contentStream, batchData, yPosition);

                // Batch Information
                yPosition = addSection(contentStream, "BATCH INFORMATION", yPosition - 20);
                yPosition = addBatchInfo(contentStream, batchData, yPosition - 10);

                // Opening Gauge
                yPosition = addSection(contentStream, "OPENING GAUGE", yPosition - 20);
                yPosition = addGaugeData(contentStream, (Map<String, Object>) batchData.get("opening"), yPosition - 10);

                // Closing Gauge (if available)
                if (batchData.containsKey("closing") && batchData.get("closing") != null) {
                    yPosition = addSection(contentStream, "CLOSING GAUGE", yPosition - 20);
                    yPosition = addGaugeData(contentStream, (Map<String, Object>) batchData.get("closing"), yPosition - 10);
                }

                // Transferred Quantities (if available)
                String status = (String) batchData.get("status");
                if ("closed".equals(status) || "recalculated".equals(status)) {
                    yPosition = addSection(contentStream, "TRANSFERRED QUANTITIES", yPosition - 20);
                    yPosition = addTransferredQuantities(contentStream, batchData, yPosition - 10);
                }

                // Generate QR code and add to PDF
                String qrData = generateQRData(batchData);
                BufferedImage qrImage = generateQRCode(qrData);
                addQRCode(document, page, qrImage, yPosition);

                // Add footer
                addFooter(contentStream, batchData);
            }

            // Save to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            byte[] pdfBytes = outputStream.toByteArray();

            log.info("[GdtBatchPdfService] PDF generated successfully. Size: {} bytes", pdfBytes.length);
            return pdfBytes;

        } catch (IOException e) {
            log.error("[GdtBatchPdfService] Error generating PDF for batch: {}", batchId, e);
            throw new Exception("Failed to generate PDF: " + e.getMessage(), e);
        }
    }

    /**
     * Get batch data from ThingsBoard attributes
     */
    public Map<String, Object> getBatchData(String batchId, TenantId tenantId) throws Exception {
        // TODO: Implement actual attribute retrieval from ThingsBoard
        // For now, return mock data structure
        log.warn("[GdtBatchPdfService] Using mock batch data - implement attribute retrieval");

        Map<String, Object> batchData = new HashMap<>();
        batchData.put("id", batchId);
        batchData.put("batchNumber", "BATCH-2025-001");
        batchData.put("tankName", "Tank T-101");
        batchData.put("batchType", "receiving");
        batchData.put("status", "closed");
        batchData.put("createdAt", System.currentTimeMillis());
        batchData.put("createdBy", "Operator 1");

        // Opening gauge
        Map<String, Object> opening = new HashMap<>();
        opening.put("timestamp", System.currentTimeMillis() - 3600000);
        opening.put("operator", "Operator 1");
        opening.put("level", 1500.5);
        opening.put("temperature", 25.3);
        opening.put("apiGravity", 35.2);
        opening.put("bsw", 0.5);
        opening.put("tov", 1250.75);
        opening.put("gov", 1248.5);
        opening.put("gsv", 1237.2);
        opening.put("nsv", 1231.05);
        opening.put("mass", 100890.5);
        opening.put("wia", 0.3);
        batchData.put("opening", opening);

        // Closing gauge
        Map<String, Object> closing = new HashMap<>();
        closing.put("timestamp", System.currentTimeMillis());
        closing.put("operator", "Operator 2");
        closing.put("level", 2100.8);
        closing.put("temperature", 26.1);
        closing.put("apiGravity", 35.3);
        closing.put("bsw", 0.4);
        closing.put("tov", 1750.25);
        closing.put("gov", 1747.9);
        closing.put("gsv", 1735.8);
        closing.put("nsv", 1729.15);
        closing.put("mass", 141250.2);
        closing.put("wia", 0.25);
        batchData.put("closing", closing);

        // Transferred quantities
        batchData.put("transferredNSV", 498.1);
        batchData.put("transferredMass", 40359.7);
        batchData.put("transferredWIA", 0.05);

        return batchData;
    }

    /**
     * Verify batch signature
     */
    public boolean verifySignature(String batchId, String signature, TenantId tenantId) throws Exception {
        Map<String, Object> batchData = getBatchData(batchId, tenantId);
        String calculatedHash = generateHash(batchData);
        return calculatedHash.equals(signature);
    }

    /**
     * Add header to PDF
     */
    private float addHeader(PDPageContentStream contentStream, Map<String, Object> batchData, float y) throws IOException {
        // Company name
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 20);
        contentStream.setNonStrokingColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, y);
        contentStream.showText("GDT TANK GAUGING SYSTEM");
        contentStream.endText();

        y -= 25;

        // Document title
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 16);
        contentStream.setNonStrokingColor(0, 0, 0);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, y);
        contentStream.showText("CUSTODY TRANSFER BATCH REPORT");
        contentStream.endText();

        y -= 5;

        // Line separator
        contentStream.setStrokingColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
        contentStream.setLineWidth(2);
        contentStream.moveTo(MARGIN, y);
        contentStream.lineTo(PAGE_WIDTH - MARGIN, y);
        contentStream.stroke();

        return y - 10;
    }

    /**
     * Add section title
     */
    private float addSection(PDPageContentStream contentStream, String title, float y) throws IOException {
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
        contentStream.setNonStrokingColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, y);
        contentStream.showText(title);
        contentStream.endText();

        return y - 5;
    }

    /**
     * Add batch information table
     */
    private float addBatchInfo(PDPageContentStream contentStream, Map<String, Object> batchData, float y) throws IOException {
        y = addKeyValue(contentStream, "Batch Number", (String) batchData.get("batchNumber"), y);
        y = addKeyValue(contentStream, "Tank", (String) batchData.get("tankName"), y);
        y = addKeyValue(contentStream, "Type", formatBatchType((String) batchData.get("batchType")), y);
        y = addKeyValue(contentStream, "Status", ((String) batchData.get("status")).toUpperCase(), y);
        y = addKeyValue(contentStream, "Created At", formatDateTime((Long) batchData.get("createdAt")), y);
        y = addKeyValue(contentStream, "Created By", (String) batchData.get("createdBy"), y);

        return y - 5;
    }

    /**
     * Add gauge data table
     */
    private float addGaugeData(PDPageContentStream contentStream, Map<String, Object> gauge, float y) throws IOException {
        y = addKeyValue(contentStream, "Timestamp", formatDateTime(((Number) gauge.get("timestamp")).longValue()), y);
        y = addKeyValue(contentStream, "Operator", (String) gauge.get("operator"), y);
        y = addKeyValue(contentStream, "Level (mm)", formatNumber((Number) gauge.get("level"), 2), y);
        y = addKeyValue(contentStream, "Temperature (°C)", formatNumber((Number) gauge.get("temperature"), 2), y);
        y = addKeyValue(contentStream, "API Gravity", formatNumber((Number) gauge.get("apiGravity"), 2), y);
        y = addKeyValue(contentStream, "BS&W (%)", formatNumber((Number) gauge.get("bsw"), 2), y);

        if (gauge.containsKey("tov")) {
            y = addKeyValue(contentStream, "TOV (bbl)", formatNumber((Number) gauge.get("tov"), 3), y);
            y = addKeyValue(contentStream, "GOV (bbl)", formatNumber((Number) gauge.get("gov"), 3), y);
            y = addKeyValue(contentStream, "GSV (bbl)", formatNumber((Number) gauge.get("gsv"), 3), y);
            y = addKeyValue(contentStream, "NSV (bbl)", formatNumber((Number) gauge.get("nsv"), 3), y);
            y = addKeyValue(contentStream, "Mass (kg)", formatNumber((Number) gauge.get("mass"), 2), y);
            y = addKeyValue(contentStream, "WIA (%)", formatNumber((Number) gauge.get("wia"), 2), y);
        }

        return y - 5;
    }

    /**
     * Add transferred quantities
     */
    private float addTransferredQuantities(PDPageContentStream contentStream, Map<String, Object> batchData, float y) throws IOException {
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 10);
        y = addKeyValue(contentStream, "Net Standard Volume (NSV)", formatNumber((Number) batchData.get("transferredNSV"), 3) + " bbl", y);
        y = addKeyValue(contentStream, "Mass", formatNumber((Number) batchData.get("transferredMass"), 2) + " kg", y);
        y = addKeyValue(contentStream, "Water in Air (WIA)", formatNumber((Number) batchData.get("transferredWIA"), 2) + " %", y);

        return y - 5;
    }

    /**
     * Add key-value pair to PDF
     */
    private float addKeyValue(PDPageContentStream contentStream, String key, String value, float y) throws IOException {
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
        contentStream.setNonStrokingColor(0, 0, 0);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN + 10, y);
        contentStream.showText(key + ":");
        contentStream.endText();

        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN + 150, y);
        contentStream.showText(value);
        contentStream.endText();

        return y - 15;
    }

    /**
     * Add QR code to PDF
     */
    private void addQRCode(PDDocument document, PDPage page, BufferedImage qrImage, float y) throws IOException {
        // Convert BufferedImage to PDImageXObject
        PDImageXObject pdImage = org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory.createFromImage(document, qrImage);

        try (PDPageContentStream contentStream = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true)) {
            float qrSize = 80f;
            float qrX = PAGE_WIDTH - MARGIN - qrSize;
            float qrY = MARGIN + 20;

            contentStream.drawImage(pdImage, qrX, qrY, qrSize, qrSize);
        }
    }

    /**
     * Add footer to PDF
     */
    private void addFooter(PDPageContentStream contentStream, Map<String, Object> batchData) throws IOException {
        float footerY = 30;

        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
        contentStream.setNonStrokingColor(GRAY_MEDIUM[0], GRAY_MEDIUM[1], GRAY_MEDIUM[2]);

        // Left side - generation date
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, footerY);
        contentStream.showText("Generated on " + formatDateTime(System.currentTimeMillis()));
        contentStream.endText();

        // Right side - page number
        contentStream.beginText();
        contentStream.newLineAtOffset(PAGE_WIDTH - MARGIN - 50, footerY);
        contentStream.showText("Page 1 of 1");
        contentStream.endText();

        // Line above footer
        contentStream.setStrokingColor(GRAY_LIGHT[0], GRAY_LIGHT[1], GRAY_LIGHT[2]);
        contentStream.setLineWidth(0.5f);
        contentStream.moveTo(MARGIN, footerY + 10);
        contentStream.lineTo(PAGE_WIDTH - MARGIN, footerY + 10);
        contentStream.stroke();
    }

    /**
     * Generate QR code
     */
    private BufferedImage generateQRCode(String data) throws Exception {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        Map<EncodeHintType, Object> hints = new HashMap<>();
        hints.put(EncodeHintType.MARGIN, 1);

        BitMatrix bitMatrix = qrCodeWriter.encode(data, BarcodeFormat.QR_CODE, 200, 200, hints);
        return MatrixToImageWriter.toBufferedImage(bitMatrix);
    }

    /**
     * Generate QR code data
     */
    private String generateQRData(Map<String, Object> batchData) throws Exception {
        Map<String, Object> qrData = new HashMap<>();
        qrData.put("batchId", batchData.get("id"));
        qrData.put("batchNumber", batchData.get("batchNumber"));
        qrData.put("hash", generateHash(batchData).substring(0, 16));

        return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(qrData);
    }

    /**
     * Generate SHA-256 hash
     */
    private String generateHash(Map<String, Object> batchData) throws NoSuchAlgorithmException {
        String dataString = String.format("%s|%s|%s|%s",
                batchData.get("id"),
                batchData.get("batchNumber"),
                batchData.get("createdAt"),
                batchData.get("transferredNSV")
        );

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(dataString.getBytes(StandardCharsets.UTF_8));

        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }

        return hexString.toString();
    }

    /**
     * Format date and time
     */
    private String formatDateTime(long timestamp) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        return sdf.format(new Date(timestamp));
    }

    /**
     * Format number with decimals
     */
    private String formatNumber(Number value, int decimals) {
        DecimalFormat df = new DecimalFormat();
        df.setMinimumFractionDigits(decimals);
        df.setMaximumFractionDigits(decimals);
        return df.format(value.doubleValue());
    }

    /**
     * Format batch type
     */
    private String formatBatchType(String type) {
        return type.substring(0, 1).toUpperCase() + type.substring(1);
    }
}
