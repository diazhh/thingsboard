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
package org.thingsboard.server.controller.gdt;

import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.thingsboard.server.common.data.exception.ThingsboardException;
import org.thingsboard.server.common.data.exception.ThingsboardErrorCode;
import org.thingsboard.server.common.data.id.AssetId;
import org.thingsboard.server.config.annotations.ApiOperation;
import org.thingsboard.server.controller.BaseController;
import org.thingsboard.server.queue.util.TbCoreComponent;
import org.thingsboard.server.service.gdt.batch.GdtBatchPdfService;
import org.thingsboard.server.service.security.permission.Operation;
import org.springframework.util.StringUtils;

import java.util.Map;

/**
 * GDT Batch Management Controller
 *
 * REST API for GDT Custody Transfer Batch operations including:
 * - PDF report generation
 * - Batch data retrieval
 * - Signature verification
 */
@Slf4j
@RestController
@TbCoreComponent
@RequiredArgsConstructor
@RequestMapping("/api/gdt/batch")
public class GdtBatchController extends BaseController {

    private final GdtBatchPdfService batchPdfService;

    public static final String BATCH_ID_PARAM = "batchId";
    public static final String BATCH_ID_PARAM_DESCRIPTION = "Batch identifier (UUID)";

    /**
     * Generate and download batch PDF report
     *
     * @param batchId Batch identifier
     * @return PDF file as byte stream
     * @throws ThingsboardException if batch not found or PDF generation fails
     */
    @ApiOperation(value = "Generate Batch PDF Report",
            notes = "Generates a custody transfer batch report in PDF format with QR code and digital signature.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN', 'CUSTOMER_USER')")
    @GetMapping(value = "/{batchId}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @ResponseBody
    public ResponseEntity<Resource> generateBatchPdf(
            @Parameter(description = BATCH_ID_PARAM_DESCRIPTION)
            @PathVariable(BATCH_ID_PARAM) String batchId) throws ThingsboardException {

        try {
            log.info("[GdtBatchController] Generating PDF for batch: {}", batchId);

            // Validate batch ID
            if (!StringUtils.hasText(batchId)) {
                throw new ThingsboardException("Batch ID is required", ThingsboardErrorCode.BAD_REQUEST_PARAMS);
            }

            // Generate PDF
            byte[] pdfBytes = batchPdfService.generateBatchPdf(batchId, getCurrentUser().getTenantId());

            // Create resource
            ByteArrayResource resource = new ByteArrayResource(pdfBytes);

            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=batch-" + batchId + ".pdf");
            headers.add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE);
            headers.add(HttpHeaders.CONTENT_LENGTH, String.valueOf(pdfBytes.length));

            log.info("[GdtBatchController] PDF generated successfully. Size: {} bytes", pdfBytes.length);

            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentLength(pdfBytes.length)
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(resource);

        } catch (ThingsboardException e) {
            throw e;
        } catch (Exception e) {
            log.error("[GdtBatchController] Error generating PDF for batch: {}", batchId, e);
            throw new ThingsboardException("Error generating PDF for batch: " + e.getMessage(),
                    ThingsboardErrorCode.GENERAL);
        }
    }

    /**
     * Get batch data as JSON
     *
     * @param batchId Batch identifier
     * @return Batch data
     * @throws ThingsboardException if batch not found
     */
    @ApiOperation(value = "Get Batch Data",
            notes = "Retrieves batch data including opening/closing gauges and calculated volumes.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN', 'CUSTOMER_USER')")
    @GetMapping(value = "/{batchId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getBatchData(
            @Parameter(description = BATCH_ID_PARAM_DESCRIPTION)
            @PathVariable(BATCH_ID_PARAM) String batchId) throws ThingsboardException {

        try {
            log.info("[GdtBatchController] Getting data for batch: {}", batchId);

            // Validate batch ID
            if (!StringUtils.hasText(batchId)) {
                throw new ThingsboardException("Batch ID is required", ThingsboardErrorCode.BAD_REQUEST_PARAMS);
            }

            Map<String, Object> batchData = batchPdfService.getBatchData(batchId, getCurrentUser().getTenantId());

            return ResponseEntity.ok(batchData);

        } catch (ThingsboardException e) {
            throw e;
        } catch (Exception e) {
            log.error("[GdtBatchController] Error getting data for batch: {}", batchId, e);
            throw new ThingsboardException("Error processing request: " + e.getMessage(),
                    ThingsboardErrorCode.GENERAL);
        }
    }

    /**
     * Verify batch PDF signature
     *
     * @param batchId Batch identifier
     * @param signature Signature hash to verify
     * @return Verification result
     * @throws ThingsboardException if verification fails
     */
    @ApiOperation(value = "Verify Batch PDF Signature",
            notes = "Verifies the digital signature of a batch PDF report.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN', 'CUSTOMER_USER')")
    @PostMapping(value = "/{batchId}/verify")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> verifyBatchSignature(
            @Parameter(description = BATCH_ID_PARAM_DESCRIPTION)
            @PathVariable(BATCH_ID_PARAM) String batchId,
            @RequestBody Map<String, String> request) throws ThingsboardException {

        try {
            log.info("[GdtBatchController] Verifying signature for batch: {}", batchId);

            if (!StringUtils.hasText(batchId)) {
                throw new ThingsboardException("Batch ID is required", ThingsboardErrorCode.BAD_REQUEST_PARAMS);
            }
            String signature = request.get("signature");
            if (!StringUtils.hasText(signature)) {
                throw new ThingsboardException("Signature is required", ThingsboardErrorCode.BAD_REQUEST_PARAMS);
            }

            boolean isValid = batchPdfService.verifySignature(batchId, signature, getCurrentUser().getTenantId());

            return ResponseEntity.ok(Map.of(
                    "batchId", batchId,
                    "valid", isValid,
                    "timestamp", System.currentTimeMillis()
            ));

        } catch (Exception e) {
            log.error("[GdtBatchController] Error verifying signature for batch: {}", batchId, e);
            throw new ThingsboardException("Error processing request: " + e.getMessage(),
                    ThingsboardErrorCode.GENERAL);
        }
    }
}
