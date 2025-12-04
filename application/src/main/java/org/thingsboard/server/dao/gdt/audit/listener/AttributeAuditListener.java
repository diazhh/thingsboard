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
package org.thingsboard.server.dao.gdt.audit.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.thingsboard.server.common.data.Device;
import org.thingsboard.server.common.data.id.DeviceId;
import org.thingsboard.server.common.data.id.EntityId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.dao.device.DeviceService;
import org.thingsboard.server.dao.gdt.audit.model.AuditEvent;
import org.thingsboard.server.dao.gdt.audit.model.EventCategory;
import org.thingsboard.server.dao.gdt.audit.model.EventSeverity;
import org.thingsboard.server.dao.gdt.audit.service.EventLoggerService;
import org.thingsboard.server.service.security.model.SecurityUser;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Listener for capturing attribute changes
 * Generates audit events automatically according to OIML R85
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AttributeAuditListener {
    
    private final EventLoggerService eventLoggerService;
    private final DeviceService deviceService;
    
    // Critical attributes that require auditing
    private static final Set<String> CRITICAL_ATTRIBUTES = Set.of(
        // Calibration
        "calibrationDate",
        "calibrationCertificate",
        "calibrationInterval",
        "lastCalibrationBy",
        
        // Gauging Table
        "gaugingTable",
        "gaugingTableVersion",
        "gaugingTableDate",
        
        // Tank Configuration
        "maxCapacity",
        "minCapacity",
        "safeWorkingLevel",
        "productType",
        "density",
        
        // Alarms
        "highLevelAlarm",
        "lowLevelAlarm",
        "highHighLevelAlarm",
        "lowLowLevelAlarm",
        "temperatureAlarmThreshold",
        
        // Device Configuration
        "deviceModel",
        "serialNumber",
        "firmwareVersion",
        "communicationProtocol",
        "pollingInterval"
    );
    
    /**
     * Listens for server-side attribute updates
     * These are the most critical for audit trail
     */
    @EventListener
    @Async
    public void onServerAttributeUpdate(ServerAttributeUpdateEvent event) {
        try {
            TenantId tenantId = event.getTenantId();
            EntityId entityId = event.getEntityId();
            String attributeName = event.getAttributeName();
            String oldValue = event.getOldValue();
            String newValue = event.getNewValue();
            
            log.info("[{}] Received ServerAttributeUpdate event: attribute={}, oldValue={}, newValue={}", 
                tenantId, attributeName, oldValue, newValue);
            
            // Audit all attributes (critical or not)
            // Filter only critical attributes for higher severity
            boolean isCritical = shouldAuditAttribute(attributeName);
            if (!isCritical) {
                log.debug("[{}] Non-critical attribute will be logged as INFO: {}", tenantId, attributeName);
            }
            
            // Get device information
            Device device = null;
            String entityName = entityId.toString();
            
            if (entityId instanceof DeviceId) {
                device = deviceService.findDeviceById(tenantId, (DeviceId) entityId);
                if (device != null) {
                    entityName = device.getName();
                }
            }
            
            // Get current user (who made the change)
            String userId = "system";
            String userName = "System";
            
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof SecurityUser) {
                SecurityUser currentUser = (SecurityUser) auth.getPrincipal();
                userId = currentUser.getId().toString();
                userName = currentUser.getName();
            }
            
            // Determine severity based on attribute criticality
            EventSeverity severity = determineSeverity(attributeName);
            
            // Create audit event
            AuditEvent auditEvent = AuditEvent.builder()
                .category(EventCategory.CONFIG_CHANGE)
                .severity(severity)
                .userId(userId)
                .userName(userName)
                .description(String.format(
                    "Device attribute updated: %s changed from '%s' to '%s'",
                    attributeName,
                    oldValue != null ? oldValue : "null",
                    newValue != null ? newValue : "null"
                ))
                .entityType("DEVICE")
                .entityId(entityId.toString())
                .entityName(entityName)
                .oldValue(oldValue)
                .newValue(newValue)
                .metadata(buildMetadata(attributeName, device))
                .build();
            
            // Log event
            eventLoggerService.logEvent(auditEvent, tenantId);
            
            log.info("[{}] Attribute change audited: {} on entity {}",
                tenantId, attributeName, entityName);
            
        } catch (Exception e) {
            log.error("Error auditing attribute update", e);
        }
    }
    
    /**
     * Listens for shared attribute updates
     * These are configured by the tenant
     */
    @EventListener
    @Async
    public void onSharedAttributeUpdate(SharedAttributeUpdateEvent event) {
        try {
            TenantId tenantId = event.getTenantId();
            EntityId entityId = event.getEntityId();
            String attributeName = event.getAttributeName();
            String oldValue = event.getOldValue();
            String newValue = event.getNewValue();
            
            log.info("[{}] Received SharedAttributeUpdate event: attribute={}, oldValue={}, newValue={}", 
                tenantId, attributeName, oldValue, newValue);
            
            // Audit all attributes (critical or not)
            // Filter only critical attributes for higher severity
            boolean isCritical = shouldAuditAttribute(attributeName);
            if (!isCritical) {
                log.debug("[{}] Non-critical shared attribute will be logged as INFO: {}", tenantId, attributeName);
            }
            
            // Get device information
            Device device = null;
            String entityName = entityId.toString();
            
            if (entityId instanceof DeviceId) {
                device = deviceService.findDeviceById(tenantId, (DeviceId) entityId);
                if (device != null) {
                    entityName = device.getName();
                }
            }
            
            // Get current user
            String userId = "system";
            String userName = "System";
            
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof SecurityUser) {
                SecurityUser currentUser = (SecurityUser) auth.getPrincipal();
                userId = currentUser.getId().toString();
                userName = currentUser.getName();
            }
            
            // Determine severity
            EventSeverity severity = determineSeverity(attributeName);
            
            // Create audit event
            AuditEvent auditEvent = AuditEvent.builder()
                .category(EventCategory.CONFIG_CHANGE)
                .severity(severity)
                .userId(userId)
                .userName(userName)
                .description(String.format(
                    "Shared attribute updated: %s changed from '%s' to '%s'",
                    attributeName,
                    oldValue != null ? oldValue : "null",
                    newValue != null ? newValue : "null"
                ))
                .entityType("DEVICE")
                .entityId(entityId.toString())
                .entityName(entityName)
                .oldValue(oldValue)
                .newValue(newValue)
                .metadata(buildMetadata(attributeName, device))
                .build();
            
            // Log event
            eventLoggerService.logEvent(auditEvent, tenantId);
            
            log.info("[{}] Shared attribute change audited: {} on entity {}",
                tenantId, attributeName, entityName);
            
        } catch (Exception e) {
            log.error("Error auditing shared attribute update", e);
        }
    }
    
    /**
     * Determines if an attribute should be audited
     */
    private boolean shouldAuditAttribute(String attributeName) {
        return CRITICAL_ATTRIBUTES.contains(attributeName);
    }
    
    /**
     * Determines event severity based on attribute criticality
     */
    private EventSeverity determineSeverity(String attributeName) {
        // Calibration and gauging table attributes are critical
        if (attributeName.contains("calibration") || 
            attributeName.contains("gaugingTable")) {
            return EventSeverity.WARNING;
        }
        
        // Alarm attributes are important
        if (attributeName.contains("Alarm") || 
            attributeName.contains("Threshold")) {
            return EventSeverity.WARNING;
        }
        
        // Other attributes are informational
        return EventSeverity.INFO;
    }
    
    /**
     * Builds additional metadata for the event
     */
    private Map<String, Object> buildMetadata(String attributeName, Device device) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("attributeName", attributeName);
        if (device != null) {
            metadata.put("deviceType", device.getType());
            metadata.put("deviceLabel", device.getLabel());
        }
        metadata.put("critical", CRITICAL_ATTRIBUTES.contains(attributeName));
        metadata.put("timestamp", System.currentTimeMillis());
        return metadata;
    }
}
