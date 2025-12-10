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
import org.thingsboard.server.common.data.alarm.Alarm;
import org.thingsboard.server.common.data.alarm.AlarmSeverity;
import org.thingsboard.server.common.data.alarm.AlarmStatus;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.dao.gdt.audit.model.AuditEvent;
import org.thingsboard.server.dao.gdt.audit.model.EventCategory;
import org.thingsboard.server.dao.gdt.audit.model.EventSeverity;
import org.thingsboard.server.dao.gdt.audit.service.EventLoggerService;
import org.thingsboard.server.service.security.model.SecurityUser;

import java.util.HashMap;
import java.util.Map;

/**
 * Listener for capturing alarm events
 * Generates audit events automatically according to OIML R85
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AlarmAuditListener {
    
    private final EventLoggerService eventLoggerService;
    
    /**
     * Listens when a new alarm is created
     */
    @EventListener
    @Async
    public void onAlarmCreated(AlarmCreatedEvent event) {
        try {
            Alarm alarm = event.getAlarm();
            TenantId tenantId = alarm.getTenantId();
            
            // Create audit event
            AuditEvent auditEvent = AuditEvent.builder()
                .category(EventCategory.ALARM)
                .severity(mapAlarmSeverityToEventSeverity(alarm.getSeverity()))
                .userId("system") // Alarms are created by the system
                .userName("System")
                .description(String.format(
                    "Alarm created: %s - %s",
                    alarm.getType(),
                    alarm.getSeverity().name()
                ))
                .entityType(alarm.getOriginator().getEntityType().name())
                .entityId(alarm.getOriginator().getId().toString())
                .entityName(alarm.getOriginator().getId().toString())
                .newValue(alarm.getStatus().name())
                .metadata(buildAlarmMetadata(alarm))
                .build();
            
            // Log event
            eventLoggerService.logEvent(auditEvent, tenantId);
            
            log.info("[{}] Alarm creation audited: {} on {}",
                tenantId, alarm.getType(), alarm.getOriginator());
            
        } catch (Exception e) {
            log.error("Error auditing alarm creation", e);
        }
    }
    
    /**
     * Listens when an alarm is acknowledged
     */
    @EventListener
    @Async
    public void onAlarmAcknowledged(AlarmAcknowledgedEvent event) {
        try {
            Alarm alarm = event.getAlarm();
            TenantId tenantId = alarm.getTenantId();
            
            // Get user who acknowledged the alarm
            String userId = "unknown";
            String userName = "Unknown User";
            
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof SecurityUser) {
                SecurityUser currentUser = (SecurityUser) auth.getPrincipal();
                userId = currentUser.getId().toString();
                userName = currentUser.getName();
            }
            
            // Create audit event
            AuditEvent auditEvent = AuditEvent.builder()
                .category(EventCategory.ALARM)
                .severity(EventSeverity.INFO)
                .userId(userId)
                .userName(userName)
                .description(String.format(
                    "Alarm acknowledged: %s",
                    alarm.getType()
                ))
                .entityType(alarm.getOriginator().getEntityType().name())
                .entityId(alarm.getOriginator().getId().toString())
                .entityName(alarm.getOriginator().getId().toString())
                .oldValue(AlarmStatus.ACTIVE_UNACK.name())
                .newValue(AlarmStatus.ACTIVE_ACK.name())
                .metadata(buildAlarmMetadata(alarm))
                .build();
            
            // Log event
            eventLoggerService.logEvent(auditEvent, tenantId);
            
            log.info("[{}] Alarm acknowledgment audited: {} by {}",
                tenantId, alarm.getType(), userName);
            
        } catch (Exception e) {
            log.error("Error auditing alarm acknowledgment", e);
        }
    }
    
    /**
     * Listens when an alarm is cleared
     */
    @EventListener
    @Async
    public void onAlarmCleared(AlarmClearedEvent event) {
        try {
            Alarm alarm = event.getAlarm();
            TenantId tenantId = alarm.getTenantId();
            
            // Create audit event
            AuditEvent auditEvent = AuditEvent.builder()
                .category(EventCategory.ALARM)
                .severity(EventSeverity.INFO)
                .userId("system")
                .userName("System")
                .description(String.format(
                    "Alarm cleared: %s",
                    alarm.getType()
                ))
                .entityType(alarm.getOriginator().getEntityType().name())
                .entityId(alarm.getOriginator().getId().toString())
                .entityName(alarm.getOriginator().getId().toString())
                .oldValue(alarm.getStatus().name())
                .newValue(AlarmStatus.CLEARED_ACK.name())
                .metadata(buildAlarmMetadata(alarm))
                .build();
            
            // Log event
            eventLoggerService.logEvent(auditEvent, tenantId);
            
            log.info("[{}] Alarm clearing audited: {} on {}",
                tenantId, alarm.getType(), alarm.getOriginator());
            
        } catch (Exception e) {
            log.error("Error auditing alarm clearing", e);
        }
    }
    
    /**
     * Maps alarm severity to event severity
     */
    private EventSeverity mapAlarmSeverityToEventSeverity(AlarmSeverity alarmSeverity) {
        switch (alarmSeverity) {
            case CRITICAL:
                return EventSeverity.ERROR;
            case MAJOR:
                return EventSeverity.WARNING;
            case MINOR:
            case WARNING:
                return EventSeverity.WARNING;
            case INDETERMINATE:
            default:
                return EventSeverity.INFO;
        }
    }
    
    /**
     * Builds additional metadata for the event
     */
    private Map<String, Object> buildAlarmMetadata(Alarm alarm) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("alarmType", alarm.getType());
        metadata.put("alarmSeverity", alarm.getSeverity().name());
        metadata.put("alarmStatus", alarm.getStatus().name());
        metadata.put("startTime", alarm.getStartTs());
        if (alarm.getEndTs() > 0) {
            metadata.put("endTime", alarm.getEndTs());
        }
        if (alarm.getAckTs() > 0) {
            metadata.put("ackTime", alarm.getAckTs());
        }
        if (alarm.getClearTs() > 0) {
            metadata.put("clearTime", alarm.getClearTs());
        }
        return metadata;
    }
}
