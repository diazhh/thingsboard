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

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.thingsboard.server.common.data.exception.ThingsboardException;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.controller.BaseController;
import org.thingsboard.server.dao.gdt.audit.model.AuditEvent;
import org.thingsboard.server.dao.gdt.audit.model.EventCategory;
import org.thingsboard.server.dao.gdt.audit.model.EventSeverity;
import org.thingsboard.server.dao.gdt.audit.service.EventLoggerService;
import org.thingsboard.server.queue.util.TbCoreComponent;

import java.util.List;
import java.util.Map;

/**
 * Audit Event REST Controller
 * Handles REST API endpoints for audit event management
 */
@RestController
@RequestMapping("/api/gdt/audit/events")
@Slf4j
@TbCoreComponent
public class AuditEventController extends BaseController {

    @Autowired
    private EventLoggerService eventLoggerService;

    /**
     * Get audit events for current tenant
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<AuditEvent>> getAuditEvents(
            @RequestParam(required = false, defaultValue = "86400000") long timeRange,
            @RequestParam(required = false, defaultValue = "1000") int limit) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        long endTs = System.currentTimeMillis();
        long startTs = endTs - timeRange;

        List<AuditEvent> events = eventLoggerService.getAuditEvents(tenantId, startTs, endTs, limit);
        return ResponseEntity.ok(events);
    }

    /**
     * Get audit events by category
     */
    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<AuditEvent>> getEventsByCategory(
            @PathVariable String category,
            @RequestParam(required = false, defaultValue = "86400000") long timeRange) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        EventCategory eventCategory = EventCategory.valueOf(category.toUpperCase());
        long endTs = System.currentTimeMillis();
        long startTs = endTs - timeRange;

        List<AuditEvent> events = eventLoggerService.getEventsByCategory(tenantId, eventCategory, startTs, endTs);
        return ResponseEntity.ok(events);
    }

    /**
     * Get audit events by severity
     */
    @GetMapping("/severity/{severity}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<AuditEvent>> getEventsBySeverity(
            @PathVariable String severity,
            @RequestParam(required = false, defaultValue = "86400000") long timeRange) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        EventSeverity eventSeverity = EventSeverity.valueOf(severity.toUpperCase());
        long endTs = System.currentTimeMillis();
        long startTs = endTs - timeRange;

        List<AuditEvent> events = eventLoggerService.getEventsBySeverity(tenantId, eventSeverity, startTs, endTs);
        return ResponseEntity.ok(events);
    }

    /**
     * Get audit events by entity
     */
    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<AuditEvent>> getEventsByEntity(
            @PathVariable String entityType,
            @PathVariable String entityId,
            @RequestParam(required = false, defaultValue = "2592000000") long timeRange) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        long endTs = System.currentTimeMillis();
        long startTs = endTs - timeRange;

        List<AuditEvent> events = eventLoggerService.getEventsByEntity(tenantId, entityType, entityId, startTs, endTs);
        return ResponseEntity.ok(events);
    }

    /**
     * Get audit events by user
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<AuditEvent>> getEventsByUser(
            @PathVariable String userId,
            @RequestParam(required = false, defaultValue = "2592000000") long timeRange) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        long endTs = System.currentTimeMillis();
        long startTs = endTs - timeRange;

        List<AuditEvent> events = eventLoggerService.getEventsByUser(tenantId, userId, startTs, endTs);
        return ResponseEntity.ok(events);
    }

    /**
     * Search audit events
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<AuditEvent>> searchEvents(
            @RequestParam String query,
            @RequestParam(required = false, defaultValue = "2592000000") long timeRange,
            @RequestParam(required = false, defaultValue = "1000") int limit) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        long endTs = System.currentTimeMillis();
        long startTs = endTs - timeRange;

        List<AuditEvent> events = eventLoggerService.searchEvents(tenantId, query, startTs, endTs, limit);
        return ResponseEntity.ok(events);
    }

    /**
     * Get audit event by ID
     */
    @GetMapping("/{eventId}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<AuditEvent> getEventById(@PathVariable String eventId) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        AuditEvent event = eventLoggerService.getEventById(eventId, tenantId);

        if (event == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(event);
    }

    /**
     * Log a configuration change event
     */
    @PostMapping("/config-change")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN')")
    public ResponseEntity<AuditEvent> logConfigChange(
            @RequestBody Map<String, String> request) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        String userId = getCurrentUserId();
        String userName = getCurrentUserName();

        AuditEvent event = eventLoggerService.logConfigChange(
                userId,
                userName,
                request.get("entityType"),
                request.get("entityId"),
                request.get("entityName"),
                request.get("oldValue"),
                request.get("newValue"),
                tenantId
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(event);
    }

    /**
     * Log a batch operation event
     */
    @PostMapping("/batch-operation")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<AuditEvent> logBatchOperation(
            @RequestBody Map<String, Object> request) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        String userId = getCurrentUserId();
        String userName = getCurrentUserName();

        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) request.get("metadata");

        AuditEvent event = eventLoggerService.logBatchOperation(
                userId,
                userName,
                (String) request.get("operationType"),
                (String) request.get("batchId"),
                (String) request.get("batchName"),
                metadata,
                tenantId
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(event);
    }

    /**
     * Log a manual data entry event
     */
    @PostMapping("/manual-entry")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<AuditEvent> logManualDataEntry(
            @RequestBody Map<String, String> request) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        String userId = getCurrentUserId();
        String userName = getCurrentUserName();

        AuditEvent event = eventLoggerService.logManualDataEntry(
                userId,
                userName,
                request.get("dataType"),
                request.get("tankId"),
                request.get("tankName"),
                request.get("value"),
                tenantId
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(event);
    }

    /**
     * Export audit events to CSV
     */
    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN')")
    public ResponseEntity<byte[]> exportToCSV(
            @RequestParam(required = false, defaultValue = "2592000000") long timeRange) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        long endTs = System.currentTimeMillis();
        long startTs = endTs - timeRange;

        byte[] csvData = eventLoggerService.exportEvents(tenantId, startTs, endTs, "CSV");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.setContentDispositionFormData("attachment", "audit_events_" + System.currentTimeMillis() + ".csv");

        return new ResponseEntity<>(csvData, headers, HttpStatus.OK);
    }

    /**
     * Export audit events to JSON
     */
    @GetMapping("/export/json")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN')")
    public ResponseEntity<byte[]> exportToJSON(
            @RequestParam(required = false, defaultValue = "2592000000") long timeRange) throws ThingsboardException {

        TenantId tenantId = getTenantId();
        long endTs = System.currentTimeMillis();
        long startTs = endTs - timeRange;

        byte[] jsonData = eventLoggerService.exportEvents(tenantId, startTs, endTs, "JSON");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setContentDispositionFormData("attachment", "audit_events_" + System.currentTimeMillis() + ".json");

        return new ResponseEntity<>(jsonData, headers, HttpStatus.OK);
    }

    /**
     * Get current user ID
     */
    private String getCurrentUserId() {
        try {
            return getCurrentUser().getId().toString();
        } catch (ThingsboardException e) {
            log.error("Error getting current user ID", e);
            return "unknown-user";
        }
    }

    /**
     * Get current user name
     */
    private String getCurrentUserName() {
        try {
            return getCurrentUser().getName();
        } catch (ThingsboardException e) {
            log.error("Error getting current user name", e);
            return "Unknown User";
        }
    }
}
