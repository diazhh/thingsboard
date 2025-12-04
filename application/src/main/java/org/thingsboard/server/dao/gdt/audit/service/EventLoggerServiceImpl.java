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
package org.thingsboard.server.dao.gdt.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.dao.gdt.audit.model.AuditEvent;
import org.thingsboard.server.dao.gdt.audit.model.EventCategory;
import org.thingsboard.server.dao.gdt.audit.model.EventSeverity;
import org.thingsboard.server.dao.gdt.audit.model.EventStatus;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Event Logger Service Implementation
 * Handles audit event logging for OIML R85 compliance
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EventLoggerServiceImpl implements EventLoggerService {
    
    private final DigitalSignatureService digitalSignatureService;
    
    // In-memory storage (should be replaced with database)
    private final Map<String, List<AuditEvent>> auditEventsByTenant = new ConcurrentHashMap<>();
    
    @Override
    public AuditEvent logEvent(AuditEvent event, TenantId tenantId) {
        try {
            // Set event ID if not present
            if (event.getEventId() == null) {
                event.setEventId(UUID.randomUUID().toString());
            }
            
            // Set tenant ID
            event.setTenantId(tenantId.toString());
            
            // Set timestamp if not present
            if (event.getTimestamp() == null) {
                event.setTimestamp(new Date());
            }
            
            // Set default severity if not present
            if (event.getSeverity() == null) {
                event.setSeverity(EventSeverity.INFO);
            }
            
            // Set default status
            event.setStatus(EventStatus.RECORDED);
            
            // Generate digital signature
            String signature = digitalSignatureService.generateSignature(event);
            event.setDigitalSignature(signature);
            event.setSignatureTimestamp(new Date());
            event.setStatus(EventStatus.SIGNED);
            
            // Store event
            auditEventsByTenant.computeIfAbsent(tenantId.toString(), k -> new ArrayList<>()).add(event);
            
            log.info("[{}] Audit event logged: {} - {}", tenantId, event.getCategory(), event.getDescription());
            
            return event;
            
        } catch (Exception e) {
            log.error("[{}] Error logging audit event", tenantId, e);
            throw new RuntimeException("Failed to log audit event", e);
        }
    }
    
    @Override
    public AuditEvent logConfigChange(
            String userId,
            String userName,
            String entityType,
            String entityId,
            String entityName,
            String oldValue,
            String newValue,
            TenantId tenantId) {
        
        AuditEvent event = AuditEvent.builder()
                .category(EventCategory.CONFIG_CHANGE)
                .severity(EventSeverity.WARNING)
                .userId(userId)
                .userName(userName)
                .description(String.format("Configuration changed: %s", entityName))
                .entityType(entityType)
                .entityId(entityId)
                .entityName(entityName)
                .oldValue(oldValue)
                .newValue(newValue)
                .build();
        
        return logEvent(event, tenantId);
    }
    
    @Override
    public AuditEvent logBatchOperation(
            String userId,
            String userName,
            String operationType,
            String batchId,
            String batchName,
            Map<String, Object> metadata,
            TenantId tenantId) {
        
        EventCategory category = EventCategory.BATCH_CREATED;
        if ("TRANSFERRED".equalsIgnoreCase(operationType)) {
            category = EventCategory.BATCH_TRANSFERRED;
        } else if ("CLOSED".equalsIgnoreCase(operationType)) {
            category = EventCategory.BATCH_CLOSED;
        } else if ("RECONCILED".equalsIgnoreCase(operationType)) {
            category = EventCategory.BATCH_RECONCILED;
        }
        
        AuditEvent event = AuditEvent.builder()
                .category(category)
                .severity(EventSeverity.INFO)
                .userId(userId)
                .userName(userName)
                .description(String.format("Batch %s: %s", operationType.toLowerCase(), batchName))
                .entityType("BATCH")
                .entityId(batchId)
                .entityName(batchName)
                .metadata(metadata)
                .build();
        
        return logEvent(event, tenantId);
    }
    
    @Override
    public AuditEvent logManualDataEntry(
            String userId,
            String userName,
            String dataType,
            String tankId,
            String tankName,
            String value,
            TenantId tenantId) {
        
        EventCategory category = EventCategory.MANUAL_LEVEL_ENTRY;
        if ("TEMPERATURE".equalsIgnoreCase(dataType)) {
            category = EventCategory.MANUAL_TEMPERATURE_ENTRY;
        } else if ("LABORATORY".equalsIgnoreCase(dataType)) {
            category = EventCategory.LABORATORY_ANALYSIS_ENTRY;
        }
        
        AuditEvent event = AuditEvent.builder()
                .category(category)
                .severity(EventSeverity.INFO)
                .userId(userId)
                .userName(userName)
                .description(String.format("Manual %s entry for tank %s", dataType.toLowerCase(), tankName))
                .entityType("TANK")
                .entityId(tankId)
                .entityName(tankName)
                .newValue(value)
                .build();
        
        return logEvent(event, tenantId);
    }
    
    @Override
    public List<AuditEvent> getAuditEvents(TenantId tenantId, long startTime, long endTime, int limit) {
        List<AuditEvent> events = auditEventsByTenant.getOrDefault(tenantId.toString(), new ArrayList<>());
        
        return events.stream()
                .filter(e -> e.getTimestamp().getTime() >= startTime && e.getTimestamp().getTime() <= endTime)
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .limit(limit)
                .collect(Collectors.toList());
    }
    
    @Override
    public List<AuditEvent> getEventsByCategory(TenantId tenantId, EventCategory category, long startTime, long endTime) {
        List<AuditEvent> events = auditEventsByTenant.getOrDefault(tenantId.toString(), new ArrayList<>());
        
        return events.stream()
                .filter(e -> e.getCategory() == category)
                .filter(e -> e.getTimestamp().getTime() >= startTime && e.getTimestamp().getTime() <= endTime)
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .collect(Collectors.toList());
    }
    
    @Override
    public List<AuditEvent> getEventsBySeverity(TenantId tenantId, EventSeverity severity, long startTime, long endTime) {
        List<AuditEvent> events = auditEventsByTenant.getOrDefault(tenantId.toString(), new ArrayList<>());
        
        return events.stream()
                .filter(e -> e.getSeverity() == severity)
                .filter(e -> e.getTimestamp().getTime() >= startTime && e.getTimestamp().getTime() <= endTime)
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .collect(Collectors.toList());
    }
    
    @Override
    public List<AuditEvent> getEventsByEntity(TenantId tenantId, String entityType, String entityId, long startTime, long endTime) {
        List<AuditEvent> events = auditEventsByTenant.getOrDefault(tenantId.toString(), new ArrayList<>());
        
        return events.stream()
                .filter(e -> entityType.equals(e.getEntityType()) && entityId.equals(e.getEntityId()))
                .filter(e -> e.getTimestamp().getTime() >= startTime && e.getTimestamp().getTime() <= endTime)
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .collect(Collectors.toList());
    }
    
    @Override
    public List<AuditEvent> getEventsByUser(TenantId tenantId, String userId, long startTime, long endTime) {
        List<AuditEvent> events = auditEventsByTenant.getOrDefault(tenantId.toString(), new ArrayList<>());
        
        return events.stream()
                .filter(e -> userId.equals(e.getUserId()))
                .filter(e -> e.getTimestamp().getTime() >= startTime && e.getTimestamp().getTime() <= endTime)
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .collect(Collectors.toList());
    }
    
    @Override
    public List<AuditEvent> searchEvents(TenantId tenantId, String searchQuery, long startTime, long endTime, int limit) {
        List<AuditEvent> events = auditEventsByTenant.getOrDefault(tenantId.toString(), new ArrayList<>());
        String query = searchQuery.toLowerCase();
        
        return events.stream()
                .filter(e -> e.getDescription().toLowerCase().contains(query) ||
                        e.getEntityName().toLowerCase().contains(query) ||
                        e.getUserName().toLowerCase().contains(query))
                .filter(e -> e.getTimestamp().getTime() >= startTime && e.getTimestamp().getTime() <= endTime)
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .limit(limit)
                .collect(Collectors.toList());
    }
    
    @Override
    public AuditEvent getEventById(String eventId, TenantId tenantId) {
        List<AuditEvent> events = auditEventsByTenant.getOrDefault(tenantId.toString(), new ArrayList<>());
        
        return events.stream()
                .filter(e -> eventId.equals(e.getEventId()))
                .findFirst()
                .orElse(null);
    }
    
    @Override
    public void deleteOldEvents(TenantId tenantId, long retentionDays) {
        List<AuditEvent> events = auditEventsByTenant.getOrDefault(tenantId.toString(), new ArrayList<>());
        long cutoffTime = System.currentTimeMillis() - (retentionDays * 24 * 60 * 60 * 1000);
        
        events.removeIf(e -> e.getTimestamp().getTime() < cutoffTime);
        log.info("[{}] Deleted audit events older than {} days", tenantId, retentionDays);
    }
    
    @Override
    public byte[] exportEvents(TenantId tenantId, long startTime, long endTime, String format) {
        List<AuditEvent> events = getAuditEvents(tenantId, startTime, endTime, Integer.MAX_VALUE);
        
        if ("CSV".equalsIgnoreCase(format)) {
            return exportToCSV(events);
        } else if ("JSON".equalsIgnoreCase(format)) {
            return exportToJSON(events);
        } else {
            throw new IllegalArgumentException("Unsupported export format: " + format);
        }
    }
    
    private byte[] exportToCSV(List<AuditEvent> events) {
        StringBuilder csv = new StringBuilder();
        csv.append("Event ID,Timestamp,Category,Severity,User,Description,Entity Type,Entity ID,Old Value,New Value,Digital Signature\n");
        
        for (AuditEvent event : events) {
            csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                    event.getEventId(),
                    event.getTimestamp(),
                    event.getCategory().getDisplayName(),
                    event.getSeverity().getDisplayName(),
                    event.getUserName(),
                    event.getDescription(),
                    event.getEntityType(),
                    event.getEntityId(),
                    event.getOldValue(),
                    event.getNewValue(),
                    event.getDigitalSignature()
            ));
        }
        
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }
    
    private byte[] exportToJSON(List<AuditEvent> events) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(events);
        } catch (Exception e) {
            log.error("Error exporting events to JSON", e);
            throw new RuntimeException("Failed to export events to JSON", e);
        }
    }
}
