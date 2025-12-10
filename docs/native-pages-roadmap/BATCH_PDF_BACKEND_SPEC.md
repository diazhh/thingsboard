# Especificación Técnica - Batch PDF Generation Backend

**Fecha:** 1 de diciembre de 2025
**Epic:** 2.3 - Batch Reports PDF
**Duración Estimada:** 2 semanas
**Prioridad:** P0 - CRÍTICO

---

## Índice

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Modelo de Datos](#modelo-de-datos)
4. [API REST](#api-rest)
5. [Service Layer](#service-layer)
6. [PDF Template](#pdf-template)
7. [Almacenamiento](#almacenamiento)
8. [Integración Frontend](#integración-frontend)
9. [Testing](#testing)
10. [Deployment](#deployment)

---

## 1. Visión General

### 1.1 Objetivo

Implementar un sistema de generación de PDFs para Batch Reports en el backend de ThingsBoard PE, cumpliendo con requisitos de custody transfer y trazabilidad metrológica.

### 1.2 Requisitos

**Funcionales:**
- Generar PDF de batch report con opening/closing gauges
- Incluir cálculos API MPMS completos
- Soportar recálculo con watermark "RECALCULATED"
- QR code con enlace al batch en ThingsBoard
- Firmas digitales SHA-256 para trazabilidad

**No Funcionales:**
- Generación < 2 segundos
- PDFs almacenados persistentemente
- Compatible con OIML R85
- Formato A4, profesional

### 1.3 Stack Tecnológico

| Componente | Tecnología |
|------------|-----------|
| Backend Framework | Spring Boot (ThingsBoard PE) |
| PDF Library | Apache PDFBox 2.0.27+ |
| QR Code | ZXing (Zebra Crossing) 3.5.0+ |
| Storage | Local FileSystem o AWS S3 |
| Database | PostgreSQL/Cassandra (atributos) |

---

## 2. Arquitectura

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Angular)                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  BatchManagementComponent                        │   │
│  │    └─> downloadReport(batchId)                   │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP GET
                         │ /api/gdt/batch/{batchId}/pdf
                         ↓
┌─────────────────────────────────────────────────────────┐
│              ThingsBoard Backend (Java)                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  GdtBatchController                              │   │
│  │    @GetMapping("/api/gdt/batch/{id}/pdf")       │   │
│  │    └─> generateBatchPdf(batchId)                │   │
│  └────────────────────┬─────────────────────────────┘   │
│                       │                                  │
│  ┌────────────────────▼─────────────────────────────┐   │
│  │  BatchPdfService                                 │   │
│  │    - getBatchData(batchId)                       │   │
│  │    - generatePdf(batch)                          │   │
│  │    - addWatermark(pdf, "RECALCULATED")          │   │
│  │    - generateQRCode(url)                         │   │
│  │    - calculateDigitalSignature(content)          │   │
│  │    - savePdf(file)                               │   │
│  └────────────────────┬─────────────────────────────┘   │
│                       │                                  │
│  ┌────────────────────▼─────────────────────────────┐   │
│  │  Storage Service                                 │   │
│  │    - saveToLocal(file)  OR  saveToS3(file)      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Ubicación en Código ThingsBoard

```
thingsboard/
├── application/src/main/java/org/thingsboard/server/
│   └── controller/
│       └── GdtBatchController.java          ← NUEVO
│
├── common/data/src/main/java/org/thingsboard/server/common/data/
│   └── gdt/
│       ├── Batch.java                       ← EXISTENTE
│       └── BatchPdfMetadata.java            ← NUEVO
│
└── dao/src/main/java/org/thingsboard/server/dao/
    └── gdt/
        ├── BatchService.java                ← EXISTENTE
        ├── BatchPdfService.java             ← NUEVO
        └── impl/
            ├── BatchServiceImpl.java        ← EXISTENTE
            └── BatchPdfServiceImpl.java     ← NUEVO
```

---

## 3. Modelo de Datos

### 3.1 Batch Entity (Existente)

```java
package org.thingsboard.server.common.data.gdt;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.thingsboard.server.common.data.BaseData;
import org.thingsboard.server.common.data.id.AssetId;
import org.thingsboard.server.common.data.id.TenantId;

import java.util.Map;

@Data
@EqualsAndHashCode(callSuper = true)
public class Batch extends BaseData<AssetId> {

    private TenantId tenantId;
    private String batchNumber;
    private AssetId tankId;
    private String tankName;
    private BatchType batchType; // RECEIVING, DISPENSING
    private BatchStatus status;  // OPEN, CLOSED, RECALCULATED, VOIDED

    // Opening Gauge
    private Long openingTime;
    private String openingOperator;
    private Double openingLevel;
    private Double openingTemperature;
    private Double openingApiGravity;
    private Double openingTOV;
    private Double openingGOV;
    private Double openingGSV;
    private Double openingNSV;
    private Double openingMass;
    private Double openingWIA;

    // Closing Gauge
    private Long closingTime;
    private String closingOperator;
    private Double closingLevel;
    private Double closingTemperature;
    private Double closingApiGravity;
    private Double closingTOV;
    private Double closingGOV;
    private Double closingGSV;
    private Double closingNSV;
    private Double closingMass;
    private Double closingWIA;

    // Transfer
    private Double transferredNSV;
    private Double transferredMass;
    private Double transferredWIA;

    // Metadata
    private String destination;
    private String transportVehicle;
    private String[] sealNumbers;
    private String notes;

    // Timestamps
    private Long createdAt;
    private Long closedAt;
    private Long recalculatedAt;

    // PDF
    private String reportPdfUrl;  // URL o path al PDF generado
    private String reportPdfHash; // SHA-256 hash del PDF
}

public enum BatchType {
    RECEIVING,
    DISPENSING
}

public enum BatchStatus {
    OPEN,
    CLOSED,
    RECALCULATED,
    VOIDED
}
```

### 3.2 BatchPdfMetadata (Nuevo)

```java
package org.thingsboard.server.common.data.gdt;

import lombok.Data;

@Data
public class BatchPdfMetadata {
    private String filename;
    private String filepath;
    private String url;
    private String sha256Hash;
    private Long generatedAt;
    private Long fileSize;
    private String generatedBy;
    private boolean isRecalculated;
}
```

---

## 4. API REST

### 4.1 REST Controller

**Archivo:** `application/src/main/java/org/thingsboard/server/controller/GdtBatchController.java`

```java
package org.thingsboard.server.controller;

import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.thingsboard.server.common.data.exception.ThingsboardException;
import org.thingsboard.server.common.data.gdt.Batch;
import org.thingsboard.server.common.data.gdt.BatchPdfMetadata;
import org.thingsboard.server.common.data.id.AssetId;
import org.thingsboard.server.dao.gdt.BatchPdfService;
import org.thingsboard.server.dao.gdt.BatchService;
import org.thingsboard.server.queue.util.TbCoreComponent;

import java.io.IOException;
import java.nio.file.Path;

import static org.thingsboard.server.controller.ControllerConstants.*;

@RestController
@TbCoreComponent
@RequestMapping("/api/gdt/batch")
@RequiredArgsConstructor
@Slf4j
public class GdtBatchController extends BaseController {

    private final BatchService batchService;
    private final BatchPdfService batchPdfService;

    /**
     * Generate and download batch report PDF
     */
    @ApiOperation(value = "Generate Batch Report PDF",
                  notes = "Generates a PDF report for a closed batch with all gauge readings and calculations")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER')")
    @GetMapping("/{batchId}/pdf")
    @ResponseBody
    public ResponseEntity<Resource> generateBatchPdf(
            @ApiParam(value = "Batch ID")
            @PathVariable String batchId) throws ThingsboardException, IOException {

        try {
            AssetId assetId = new AssetId(toUUID(batchId));

            // Get batch data
            Batch batch = checkNotNull(batchService.findBatchById(getTenantId(), assetId));

            // Verify batch is closed
            if (batch.getStatus() != BatchStatus.CLOSED &&
                batch.getStatus() != BatchStatus.RECALCULATED) {
                throw new ThingsboardException("Cannot generate PDF for open batch",
                                               ThingsboardErrorCode.INVALID_ARGUMENTS);
            }

            // Generate PDF
            BatchPdfMetadata pdfMetadata = batchPdfService.generateBatchPdf(
                getTenantId(),
                batch,
                getCurrentUser()
            );

            // Load file as Resource
            Path filePath = Path.of(pdfMetadata.getFilepath());
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                throw new ThingsboardException("PDF file not found",
                                               ThingsboardErrorCode.ITEM_NOT_FOUND);
            }

            // Build response headers
            String filename = pdfMetadata.getFilename();

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .header("X-PDF-Hash", pdfMetadata.getSha256Hash())
                    .body(resource);

        } catch (Exception e) {
            log.error("Error generating batch PDF for batch {}", batchId, e);
            throw handleException(e);
        }
    }

    /**
     * Get batch PDF metadata (without downloading)
     */
    @ApiOperation(value = "Get Batch PDF Metadata")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER')")
    @GetMapping("/{batchId}/pdf/metadata")
    @ResponseBody
    public BatchPdfMetadata getBatchPdfMetadata(
            @ApiParam(value = "Batch ID")
            @PathVariable String batchId) throws ThingsboardException {

        try {
            AssetId assetId = new AssetId(toUUID(batchId));
            Batch batch = checkNotNull(batchService.findBatchById(getTenantId(), assetId));

            return batchPdfService.getBatchPdfMetadata(getTenantId(), batch);

        } catch (Exception e) {
            throw handleException(e);
        }
    }

    /**
     * Regenerate PDF for a batch (force regeneration)
     */
    @ApiOperation(value = "Regenerate Batch PDF")
    @PreAuthorize("hasAuthority('TENANT_ADMIN')")
    @PostMapping("/{batchId}/pdf/regenerate")
    @ResponseBody
    public BatchPdfMetadata regenerateBatchPdf(
            @ApiParam(value = "Batch ID")
            @PathVariable String batchId) throws ThingsboardException {

        try {
            AssetId assetId = new AssetId(toUUID(batchId));
            Batch batch = checkNotNull(batchService.findBatchById(getTenantId(), assetId));

            return batchPdfService.regenerateBatchPdf(
                getTenantId(),
                batch,
                getCurrentUser()
            );

        } catch (Exception e) {
            throw handleException(e);
        }
    }
}
```

### 4.2 Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/gdt/batch/{batchId}/pdf` | Generar y descargar PDF | TENANT_ADMIN, CUSTOMER_USER |
| GET | `/api/gdt/batch/{batchId}/pdf/metadata` | Obtener metadata del PDF | TENANT_ADMIN, CUSTOMER_USER |
| POST | `/api/gdt/batch/{batchId}/pdf/regenerate` | Forzar regeneración | TENANT_ADMIN |

---

## 5. Service Layer

### 5.1 BatchPdfService Interface

**Archivo:** `dao/src/main/java/org/thingsboard/server/dao/gdt/BatchPdfService.java`

```java
package org.thingsboard.server.dao.gdt;

import org.thingsboard.server.common.data.gdt.Batch;
import org.thingsboard.server.common.data.gdt.BatchPdfMetadata;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.security.model.SecurityUser;

public interface BatchPdfService {

    /**
     * Generate PDF report for a batch
     */
    BatchPdfMetadata generateBatchPdf(TenantId tenantId, Batch batch, SecurityUser user);

    /**
     * Get existing PDF metadata
     */
    BatchPdfMetadata getBatchPdfMetadata(TenantId tenantId, Batch batch);

    /**
     * Force regenerate PDF (even if exists)
     */
    BatchPdfMetadata regenerateBatchPdf(TenantId tenantId, Batch batch, SecurityUser user);

    /**
     * Delete PDF for a batch
     */
    void deleteBatchPdf(TenantId tenantId, Batch batch);
}
```

### 5.2 BatchPdfServiceImpl

**Archivo:** `dao/src/main/java/org/thingsboard/server/dao/gdt/impl/BatchPdfServiceImpl.java`

```java
package org.thingsboard.server.dao.gdt.impl;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.thingsboard.server.common.data.gdt.Batch;
import org.thingsboard.server.common.data.gdt.BatchPdfMetadata;
import org.thingsboard.server.common.data.gdt.BatchStatus;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.security.model.SecurityUser;
import org.thingsboard.server.dao.gdt.BatchPdfService;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.util.Date;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatchPdfServiceImpl implements BatchPdfService {

    @Value("${gdt.pdf.storage.path:/var/lib/thingsboard/gdt/pdfs}")
    private String pdfStoragePath;

    @Value("${gdt.pdf.base_url:http://localhost:8080}")
    private String baseUrl;

    private static final SimpleDateFormat DATE_FORMAT =
        new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    private static final DecimalFormat DECIMAL_FORMAT =
        new DecimalFormat("#,##0.00");

    @Override
    public BatchPdfMetadata generateBatchPdf(TenantId tenantId, Batch batch, SecurityUser user) {
        log.info("Generating PDF for batch {} in tenant {}", batch.getBatchNumber(), tenantId);

        try {
            // Check if PDF already exists
            BatchPdfMetadata existing = getBatchPdfMetadata(tenantId, batch);
            if (existing != null && !batch.getStatus().equals(BatchStatus.RECALCULATED)) {
                log.info("PDF already exists for batch {}, returning existing",
                         batch.getBatchNumber());
                return existing;
            }

            // Create PDF
            PDDocument document = new PDDocument();

            try {
                // Add page
                PDPage page = new PDPage(PDRectangle.A4);
                document.addPage(page);

                // Draw content
                drawBatchReport(document, page, batch, tenantId);

                // Add watermark if recalculated
                if (batch.getStatus().equals(BatchStatus.RECALCULATED)) {
                    addWatermark(document, page, "RECALCULATED");
                }

                // Save to file
                String filename = generateFilename(batch);
                Path filepath = ensureDirectory(tenantId).resolve(filename);
                document.save(filepath.toFile());

                // Calculate hash
                String hash = calculateSHA256(filepath);

                // Create metadata
                BatchPdfMetadata metadata = new BatchPdfMetadata();
                metadata.setFilename(filename);
                metadata.setFilepath(filepath.toString());
                metadata.setUrl(baseUrl + "/api/gdt/batch/" + batch.getId() + "/pdf");
                metadata.setSha256Hash(hash);
                metadata.setGeneratedAt(System.currentTimeMillis());
                metadata.setFileSize(Files.size(filepath));
                metadata.setGeneratedBy(user.getEmail());
                metadata.setRecalculated(batch.getStatus().equals(BatchStatus.RECALCULATED));

                // Update batch with PDF URL
                batch.setReportPdfUrl(metadata.getUrl());
                batch.setReportPdfHash(hash);

                log.info("PDF generated successfully for batch {}: {}",
                         batch.getBatchNumber(), filename);

                return metadata;

            } finally {
                document.close();
            }

        } catch (Exception e) {
            log.error("Error generating PDF for batch {}", batch.getBatchNumber(), e);
            throw new RuntimeException("Failed to generate batch PDF", e);
        }
    }

    private void drawBatchReport(PDDocument document, PDPage page, Batch batch, TenantId tenantId)
            throws IOException {

        PDPageContentStream contentStream = new PDPageContentStream(document, page);

        try {
            float margin = 50;
            float yPosition = page.getMediaBox().getHeight() - margin;
            float lineHeight = 15;

            // Header
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 20);
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, yPosition);
            contentStream.showText("BATCH TRANSFER REPORT");
            contentStream.endText();
            yPosition -= lineHeight * 2;

            // Batch Info
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
            drawText(contentStream, "Batch Number:", margin, yPosition);
            contentStream.setFont(PDType1Font.HELVETICA, 12);
            drawText(contentStream, batch.getBatchNumber(), margin + 150, yPosition);
            yPosition -= lineHeight;

            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
            drawText(contentStream, "Tank:", margin, yPosition);
            contentStream.setFont(PDType1Font.HELVETICA, 12);
            drawText(contentStream, batch.getTankName(), margin + 150, yPosition);
            yPosition -= lineHeight;

            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
            drawText(contentStream, "Type:", margin, yPosition);
            contentStream.setFont(PDType1Font.HELVETICA, 12);
            drawText(contentStream, batch.getBatchType().toString(), margin + 150, yPosition);
            yPosition -= lineHeight * 2;

            // Opening Gauge
            yPosition = drawGaugeSection(contentStream, "OPENING GAUGE", margin, yPosition, lineHeight,
                batch.getOpeningTime(),
                batch.getOpeningOperator(),
                batch.getOpeningLevel(),
                batch.getOpeningTemperature(),
                batch.getOpeningApiGravity(),
                batch.getOpeningTOV(),
                batch.getOpeningGOV(),
                batch.getOpeningGSV(),
                batch.getOpeningNSV(),
                batch.getOpeningMass(),
                batch.getOpeningWIA()
            );

            yPosition -= lineHeight;

            // Closing Gauge
            if (batch.getClosingTime() != null) {
                yPosition = drawGaugeSection(contentStream, "CLOSING GAUGE", margin, yPosition, lineHeight,
                    batch.getClosingTime(),
                    batch.getClosingOperator(),
                    batch.getClosingLevel(),
                    batch.getClosingTemperature(),
                    batch.getClosingApiGravity(),
                    batch.getClosingTOV(),
                    batch.getClosingGOV(),
                    batch.getClosingGSV(),
                    batch.getClosingNSV(),
                    batch.getClosingMass(),
                    batch.getClosingWIA()
                );

                yPosition -= lineHeight;

                // Transfer Quantities
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 14);
                drawText(contentStream, "TRANSFERRED QUANTITIES", margin, yPosition);
                yPosition -= lineHeight * 1.5f;

                contentStream.setFont(PDType1Font.HELVETICA, 11);
                drawText(contentStream, "Net Standard Volume (NSV):", margin, yPosition);
                drawText(contentStream, DECIMAL_FORMAT.format(batch.getTransferredNSV()) + " bbl",
                         margin + 200, yPosition);
                yPosition -= lineHeight;

                drawText(contentStream, "Mass:", margin, yPosition);
                drawText(contentStream, DECIMAL_FORMAT.format(batch.getTransferredMass()) + " kg",
                         margin + 200, yPosition);
                yPosition -= lineHeight;

                drawText(contentStream, "Water in Addition (WIA):", margin, yPosition);
                drawText(contentStream, DECIMAL_FORMAT.format(batch.getTransferredWIA()) + " %",
                         margin + 200, yPosition);
                yPosition -= lineHeight * 2;
            }

            // QR Code
            BufferedImage qrImage = generateQRCode(batch);
            PDImageXObject pdImage = LosslessFactory.createFromImage(document, qrImage);
            float qrSize = 100;
            contentStream.drawImage(pdImage,
                page.getMediaBox().getWidth() - margin - qrSize,
                margin,
                qrSize,
                qrSize);

            // Footer
            yPosition = margin + 20;
            contentStream.setFont(PDType1Font.HELVETICA, 9);
            drawText(contentStream, "Generated: " + DATE_FORMAT.format(new Date()),
                     margin, yPosition);
            yPosition -= 12;
            contentStream.setFont(PDType1Font.HELVETICA_OBLIQUE, 8);
            drawText(contentStream,
                     "This document is generated by GDT Tank Gauging System",
                     margin, yPosition);

        } finally {
            contentStream.close();
        }
    }

    private float drawGaugeSection(PDPageContentStream contentStream, String title,
                                   float margin, float yPosition, float lineHeight,
                                   Long time, String operator, Double level,
                                   Double temperature, Double apiGravity,
                                   Double tov, Double gov, Double gsv,
                                   Double nsv, Double mass, Double wia) throws IOException {

        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 14);
        drawText(contentStream, title, margin, yPosition);
        yPosition -= lineHeight * 1.5f;

        contentStream.setFont(PDType1Font.HELVETICA, 11);

        drawText(contentStream, "Timestamp:", margin, yPosition);
        drawText(contentStream, DATE_FORMAT.format(new Date(time)), margin + 150, yPosition);
        yPosition -= lineHeight;

        drawText(contentStream, "Operator:", margin, yPosition);
        drawText(contentStream, operator, margin + 150, yPosition);
        yPosition -= lineHeight;

        drawText(contentStream, "Level:", margin, yPosition);
        drawText(contentStream, DECIMAL_FORMAT.format(level) + " mm", margin + 150, yPosition);
        yPosition -= lineHeight;

        drawText(contentStream, "Temperature:", margin, yPosition);
        drawText(contentStream, DECIMAL_FORMAT.format(temperature) + " °C", margin + 150, yPosition);
        yPosition -= lineHeight;

        drawText(contentStream, "API Gravity:", margin, yPosition);
        drawText(contentStream, DECIMAL_FORMAT.format(apiGravity) + " °API", margin + 150, yPosition);
        yPosition -= lineHeight * 1.5f;

        // Volumes
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 11);
        drawText(contentStream, "VOLUMES:", margin, yPosition);
        yPosition -= lineHeight * 1.2f;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        drawText(contentStream, "TOV:", margin + 10, yPosition);
        drawText(contentStream, DECIMAL_FORMAT.format(tov) + " bbl", margin + 150, yPosition);
        yPosition -= lineHeight * 0.9f;

        drawText(contentStream, "GOV:", margin + 10, yPosition);
        drawText(contentStream, DECIMAL_FORMAT.format(gov) + " bbl", margin + 150, yPosition);
        yPosition -= lineHeight * 0.9f;

        drawText(contentStream, "GSV:", margin + 10, yPosition);
        drawText(contentStream, DECIMAL_FORMAT.format(gsv) + " bbl", margin + 150, yPosition);
        yPosition -= lineHeight * 0.9f;

        drawText(contentStream, "NSV:", margin + 10, yPosition);
        drawText(contentStream, DECIMAL_FORMAT.format(nsv) + " bbl", margin + 150, yPosition);
        yPosition -= lineHeight * 0.9f;

        drawText(contentStream, "Mass:", margin + 10, yPosition);
        drawText(contentStream, DECIMAL_FORMAT.format(mass) + " kg", margin + 150, yPosition);
        yPosition -= lineHeight * 0.9f;

        drawText(contentStream, "WIA:", margin + 10, yPosition);
        drawText(contentStream, DECIMAL_FORMAT.format(wia) + " %", margin + 150, yPosition);
        yPosition -= lineHeight;

        return yPosition;
    }

    private void drawText(PDPageContentStream contentStream, String text,
                          float x, float y) throws IOException {
        contentStream.beginText();
        contentStream.newLineAtOffset(x, y);
        contentStream.showText(text);
        contentStream.endText();
    }

    private void addWatermark(PDDocument document, PDPage page, String text) throws IOException {
        PDPageContentStream contentStream = new PDPageContentStream(
            document, page, PDPageContentStream.AppendMode.APPEND, true, true);

        try {
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 72);
            contentStream.setNonStrokingColor(200, 200, 200);

            // Center and rotate
            float width = page.getMediaBox().getWidth();
            float height = page.getMediaBox().getHeight();

            contentStream.beginText();
            contentStream.setTextMatrix(
                (float) Math.cos(Math.toRadians(45)),
                (float) Math.sin(Math.toRadians(45)),
                -(float) Math.sin(Math.toRadians(45)),
                (float) Math.cos(Math.toRadians(45)),
                width / 3, height / 3
            );
            contentStream.showText(text);
            contentStream.endText();

        } finally {
            contentStream.close();
        }
    }

    private BufferedImage generateQRCode(Batch batch) throws Exception {
        String qrText = baseUrl + "/gdt/batch/" + batch.getId();
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(qrText, BarcodeFormat.QR_CODE, 200, 200);
        return MatrixToImageWriter.toBufferedImage(bitMatrix);
    }

    private String generateFilename(Batch batch) {
        String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String status = batch.getStatus().equals(BatchStatus.RECALCULATED) ? "_RECALC" : "";
        return String.format("batch_%s%s_%s.pdf",
                             batch.getBatchNumber(),
                             status,
                             timestamp);
    }

    private Path ensureDirectory(TenantId tenantId) throws IOException {
        Path dir = Paths.get(pdfStoragePath, tenantId.toString());
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }
        return dir;
    }

    private String calculateSHA256(Path filepath) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream fis = new FileInputStream(filepath.toFile())) {
            byte[] byteArray = new byte[1024];
            int bytesCount;
            while ((bytesCount = fis.read(byteArray)) != -1) {
                digest.update(byteArray, 0, bytesCount);
            }
        }

        byte[] bytes = digest.digest();
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @Override
    public BatchPdfMetadata getBatchPdfMetadata(TenantId tenantId, Batch batch) {
        try {
            String filename = String.format("batch_%s_*.pdf", batch.getBatchNumber());
            Path dir = Paths.get(pdfStoragePath, tenantId.toString());

            if (!Files.exists(dir)) {
                return null;
            }

            // Find most recent PDF for this batch
            File[] files = dir.toFile().listFiles((d, name) ->
                name.startsWith("batch_" + batch.getBatchNumber()) && name.endsWith(".pdf"));

            if (files == null || files.length == 0) {
                return null;
            }

            // Get most recent
            File mostRecent = files[0];
            for (File f : files) {
                if (f.lastModified() > mostRecent.lastModified()) {
                    mostRecent = f;
                }
            }

            // Build metadata
            BatchPdfMetadata metadata = new BatchPdfMetadata();
            metadata.setFilename(mostRecent.getName());
            metadata.setFilepath(mostRecent.getAbsolutePath());
            metadata.setUrl(baseUrl + "/api/gdt/batch/" + batch.getId() + "/pdf");
            metadata.setFileSize(mostRecent.length());
            metadata.setGeneratedAt(mostRecent.lastModified());

            return metadata;

        } catch (Exception e) {
            log.error("Error getting PDF metadata for batch {}", batch.getBatchNumber(), e);
            return null;
        }
    }

    @Override
    public BatchPdfMetadata regenerateBatchPdf(TenantId tenantId, Batch batch, SecurityUser user) {
        // Delete existing PDFs
        deleteBatchPdf(tenantId, batch);

        // Generate new
        return generateBatchPdf(tenantId, batch, user);
    }

    @Override
    public void deleteBatchPdf(TenantId tenantId, Batch batch) {
        try {
            Path dir = Paths.get(pdfStoragePath, tenantId.toString());
            if (!Files.exists(dir)) {
                return;
            }

            File[] files = dir.toFile().listFiles((d, name) ->
                name.startsWith("batch_" + batch.getBatchNumber()) && name.endsWith(".pdf"));

            if (files != null) {
                for (File file : files) {
                    Files.deleteIfExists(file.toPath());
                    log.info("Deleted PDF: {}", file.getName());
                }
            }

        } catch (Exception e) {
            log.error("Error deleting PDFs for batch {}", batch.getBatchNumber(), e);
        }
    }
}
```

---

## 6. PDF Template

### 6.1 Diseño del PDF

```
┌─────────────────────────────────────────────────────────────┐
│                   BATCH TRANSFER REPORT                     │
│                                                             │
│  Batch Number: BATCH-2025-001                               │
│  Tank: TK-101 (Crude Oil Storage)                          │
│  Type: RECEIVING                                            │
│  Status: CLOSED                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OPENING GAUGE                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Timestamp: 2025-12-01 08:30:00                            │
│  Operator: John Doe                                         │
│  Level: 5,250.00 mm                                         │
│  Temperature: 25.50 °C                                      │
│  API Gravity: 32.50 °API                                    │
│                                                             │
│  VOLUMES:                                                   │
│    TOV: 10,500.25 bbl                                      │
│    GOV: 10,450.12 bbl                                      │
│    GSV: 10,425.80 bbl                                      │
│    NSV: 10,400.50 bbl                                      │
│    Mass: 1,456,789.00 kg                                   │
│    WIA: 0.25 %                                             │
│                                                             │
│  CLOSING GAUGE                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Timestamp: 2025-12-01 16:45:00                            │
│  Operator: Jane Smith                                       │
│  Level: 8,750.00 mm                                         │
│  Temperature: 26.00 °C                                      │
│  API Gravity: 32.50 °API                                    │
│                                                             │
│  VOLUMES:                                                   │
│    TOV: 17,800.50 bbl                                      │
│    GOV: 17,725.30 bbl                                      │
│    GSV: 17,690.15 bbl                                      │
│    NSV: 17,650.80 bbl                                      │
│    Mass: 2,471,235.00 kg                                   │
│    WIA: 0.30 %                                             │
│                                                             │
│  TRANSFERRED QUANTITIES                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Net Standard Volume (NSV): 7,250.30 bbl                   │
│  Mass: 1,014,446.00 kg                                     │
│  Water in Addition (WIA): 0.28 %                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                      ┌────┐ │
│  Generated: 2025-12-01 17:00:00                     │ QR │ │
│  This document is generated by GDT Tank Gauging     │Code│ │
│                                                      └────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Watermark (si recalculado)

```
         R E C A L C U L A T E D
            (diagonal, gris claro)
```

---

## 7. Almacenamiento

### 7.1 Configuración

**Archivo:** `thingsboard/application/src/main/resources/thingsboard.yml`

```yaml
gdt:
  pdf:
    storage:
      path: /var/lib/thingsboard/gdt/pdfs
      # Alternative: S3
      # type: s3
      # s3:
      #   bucket: gdt-batch-pdfs
      #   region: us-east-1
      #   access_key: ${AWS_ACCESS_KEY}
      #   secret_key: ${AWS_SECRET_KEY}
    base_url: ${BASE_URL:http://localhost:8080}
```

### 7.2 Estructura de Directorios

```
/var/lib/thingsboard/gdt/pdfs/
├── {tenantId}/
│   ├── batch_BATCH-2025-001_20251201_083000.pdf
│   ├── batch_BATCH-2025-001_RECALC_20251201_170000.pdf
│   ├── batch_BATCH-2025-002_20251202_093000.pdf
│   └── ...
└── ...
```

### 7.3 Retención de PDFs

- Los PDFs permanecen almacenados indefinidamente
- Backup automático según política de ThingsBoard
- Opción de purga manual por tenant admin

---

## 8. Integración Frontend

### 8.1 Servicio Angular

**Archivo:** `thingsboard/ui-ngx/src/app/modules/home/pages/gdt/batch-management/services/batch-pdf.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BatchPdfMetadata {
  filename: string;
  filepath: string;
  url: string;
  sha256Hash: string;
  generatedAt: number;
  fileSize: number;
  generatedBy: string;
  isRecalculated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BatchPdfService {

  constructor(private http: HttpClient) {}

  downloadBatchPdf(batchId: string): Observable<Blob> {
    return this.http.get(
      `/api/gdt/batch/${batchId}/pdf`,
      {
        responseType: 'blob',
        observe: 'body'
      }
    );
  }

  getBatchPdfMetadata(batchId: string): Observable<BatchPdfMetadata> {
    return this.http.get<BatchPdfMetadata>(
      `/api/gdt/batch/${batchId}/pdf/metadata`
    );
  }

  regenerateBatchPdf(batchId: string): Observable<BatchPdfMetadata> {
    return this.http.post<BatchPdfMetadata>(
      `/api/gdt/batch/${batchId}/pdf/regenerate`,
      {}
    );
  }

  openPdfInNewTab(batchId: string): void {
    window.open(`/api/gdt/batch/${batchId}/pdf`, '_blank');
  }
}
```

### 8.2 Componente de Descarga

```typescript
// En batch-management.component.ts

downloadReport(batch: any): void {
  if (!batch.reportPdfUrl) {
    // Generate PDF first
    this.batchPdfService.downloadBatchPdf(batch.id).subscribe(
      (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `batch_${batch.batchNumber}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error => {
        console.error('Error downloading PDF:', error);
        // Show error toast
      }
    );
  } else {
    // Open existing PDF
    this.batchPdfService.openPdfInNewTab(batch.id);
  }
}
```

---

## 9. Testing

### 9.1 Unit Tests

**Archivo:** `dao/src/test/java/org/thingsboard/server/dao/gdt/BatchPdfServiceTest.java`

```java
package org.thingsboard.server.dao.gdt;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.thingsboard.server.common.data.gdt.Batch;
import org.thingsboard.server.common.data.gdt.BatchPdfMetadata;
import org.thingsboard.server.common.data.gdt.BatchStatus;
import org.thingsboard.server.common.data.gdt.BatchType;
import org.thingsboard.server.common.data.id.AssetId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.security.model.SecurityUser;

import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class BatchPdfServiceTest {

    @Autowired
    private BatchPdfService batchPdfService;

    @TempDir
    Path tempDir;

    @Test
    void testGenerateBatchPdf() {
        // Arrange
        Batch batch = createTestBatch();
        TenantId tenantId = TenantId.fromUUID(UUID.randomUUID());
        SecurityUser user = createTestUser();

        // Act
        BatchPdfMetadata metadata = batchPdfService.generateBatchPdf(tenantId, batch, user);

        // Assert
        assertNotNull(metadata);
        assertNotNull(metadata.getFilename());
        assertNotNull(metadata.getSha256Hash());
        assertTrue(metadata.getFileSize() > 0);
        assertEquals(user.getEmail(), metadata.getGeneratedBy());
    }

    @Test
    void testGeneratePdfWithWatermark() {
        // Arrange
        Batch batch = createTestBatch();
        batch.setStatus(BatchStatus.RECALCULATED);
        TenantId tenantId = TenantId.fromUUID(UUID.randomUUID());
        SecurityUser user = createTestUser();

        // Act
        BatchPdfMetadata metadata = batchPdfService.generateBatchPdf(tenantId, batch, user);

        // Assert
        assertNotNull(metadata);
        assertTrue(metadata.isRecalculated());
        assertTrue(metadata.getFilename().contains("RECALC"));
    }

    private Batch createTestBatch() {
        Batch batch = new Batch();
        batch.setId(new AssetId(UUID.randomUUID()));
        batch.setBatchNumber("TEST-001");
        batch.setTankName("TK-101");
        batch.setBatchType(BatchType.RECEIVING);
        batch.setStatus(BatchStatus.CLOSED);

        // Opening gauge
        batch.setOpeningTime(System.currentTimeMillis());
        batch.setOpeningOperator("Test Operator");
        batch.setOpeningLevel(5000.0);
        batch.setOpeningTemperature(25.0);
        batch.setOpeningApiGravity(32.5);
        batch.setOpeningTOV(10000.0);
        batch.setOpeningGOV(9950.0);
        batch.setOpeningGSV(9925.0);
        batch.setOpeningNSV(9900.0);
        batch.setOpeningMass(1400000.0);
        batch.setOpeningWIA(0.25);

        // Closing gauge
        batch.setClosingTime(System.currentTimeMillis() + 3600000);
        batch.setClosingOperator("Test Operator");
        batch.setClosingLevel(8000.0);
        batch.setClosingTemperature(26.0);
        batch.setClosingApiGravity(32.5);
        batch.setClosingTOV(17000.0);
        batch.setClosingGOV(16925.0);
        batch.setClosingGSV(16890.0);
        batch.setClosingNSV(16850.0);
        batch.setClosingMass(2380000.0);
        batch.setClosingWIA(0.30);

        // Transfer
        batch.setTransferredNSV(6950.0);
        batch.setTransferredMass(980000.0);
        batch.setTransferredWIA(0.28);

        return batch;
    }

    private SecurityUser createTestUser() {
        SecurityUser user = new SecurityUser();
        user.setEmail("test@example.com");
        return user;
    }
}
```

### 9.2 Integration Tests

```java
@Test
void testPdfGenerationEndToEnd() {
    // 1. Create batch
    Batch batch = createAndSaveBatch();

    // 2. Generate PDF via API
    ResponseEntity<byte[]> response = restTemplate.getForEntity(
        "/api/gdt/batch/" + batch.getId() + "/pdf",
        byte[].class
    );

    // 3. Verify response
    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals(MediaType.APPLICATION_PDF, response.getHeaders().getContentType());
    assertTrue(response.getBody().length > 0);

    // 4. Verify hash header
    String hash = response.getHeaders().getFirst("X-PDF-Hash");
    assertNotNull(hash);
    assertEquals(64, hash.length()); // SHA-256 is 64 hex characters
}
```

---

## 10. Deployment

### 10.1 Dependencias Maven

**Archivo:** `pom.xml`

```xml
<!-- PDF Generation -->
<dependency>
    <groupId>org.apache.pdfbox</groupId>
    <artifactId>pdfbox</artifactId>
    <version>2.0.27</version>
</dependency>

<!-- QR Code -->
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>core</artifactId>
    <version>3.5.1</version>
</dependency>
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>javase</artifactId>
    <version>3.5.1</version>
</dependency>
```

### 10.2 Configuración de Producción

```bash
# Create PDF storage directory
sudo mkdir -p /var/lib/thingsboard/gdt/pdfs
sudo chown thingsboard:thingsboard /var/lib/thingsboard/gdt/pdfs
sudo chmod 755 /var/lib/thingsboard/gdt/pdfs

# Configure permissions
sudo setfacl -R -m u:thingsboard:rwx /var/lib/thingsboard/gdt/pdfs
```

### 10.3 Variables de Entorno

```bash
# In /etc/thingsboard/thingsboard.conf
export GDT_PDF_STORAGE_PATH=/var/lib/thingsboard/gdt/pdfs
export GDT_PDF_BASE_URL=https://your-domain.com
```

---

## 11. Cronograma de Implementación

| Tarea | Duración | Responsable |
|-------|----------|-------------|
| Setup Maven dependencies | 0.5 días | Backend Dev |
| Implementar BatchPdfService | 3 días | Backend Dev |
| Implementar REST Controller | 1 día | Backend Dev |
| Diseñar template PDF | 2 días | Backend Dev |
| Implementar QR code + watermark | 1 día | Backend Dev |
| Unit tests | 1.5 días | Backend Dev |
| Integration tests | 1 día | Backend Dev + QA |
| Frontend integration | 1 día | Frontend Dev |
| Testing E2E | 1 día | QA |
| Documentación | 0.5 días | Backend Dev |
| **TOTAL** | **12.5 días** (~2 semanas) | |

---

## 12. Criterios de Aceptación

- [ ] PDF se genera correctamente con todos los datos de opening/closing gauge
- [ ] Cálculos de volúmenes se muestran correctamente
- [ ] QR code funciona y redirige al batch en ThingsBoard
- [ ] Watermark "RECALCULATED" aparece si el batch fue recalculado
- [ ] Hash SHA-256 se calcula y almacena correctamente
- [ ] API endpoint responde en < 2 segundos
- [ ] PDFs se almacenan persistentemente
- [ ] Frontend puede descargar y visualizar PDFs
- [ ] Tests unitarios y de integración pasan
- [ ] Documentación completa

---

## 13. Próximos Pasos

1. **Revisar y aprobar** esta especificación
2. **Asignar** desarrollador backend Java
3. **Crear branch** `feature/batch-pdf-generation`
4. **Implementar** según cronograma
5. **Code review** por Tech Lead
6. **Merge** a develop
7. **Deploy** a staging para testing
8. **Deploy** a producción

---

**Fin de la Especificación Técnica**
