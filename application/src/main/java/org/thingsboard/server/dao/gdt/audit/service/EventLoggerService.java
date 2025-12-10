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

import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.dao.gdt.audit.model.AuditEvent;
import org.thingsboard.server.dao.gdt.audit.model.EventCategory;
import org.thingsboard.server.dao.gdt.audit.model.EventSeverity;

import java.util.List;
import java.util.Map;

/**
 * Event Logger Service Interface
 * Handles audit event logging for OIML R85 compliance
 */
public interface EventLoggerService {
    
    /**
     * Log an audit event
     */
    AuditEvent logEvent(AuditEvent event, TenantId tenantId);
    
    /**
     * Log a configuration change event
     */
    AuditEvent logConfigChange(
        String userId,
        String userName,
        String entityType,
        String entityId,
        String entityName,
        String oldValue,
        String newValue,
        TenantId tenantId
    );
    
    /**
     * Log a batch operation event
     */
    AuditEvent logBatchOperation(
        String userId,
        String userName,
        String operationType,
        String batchId,
        String batchName,
        Map<String, Object> metadata,
        TenantId tenantId
    );
    
    /**
     * Log a manual data entry event
     */
    AuditEvent logManualDataEntry(
        String userId,
        String userName,
        String dataType,
        String tankId,
        String tankName,
        String value,
        TenantId tenantId
    );
    
    /**
     * Get audit events for a tenant
     */
    List<AuditEvent> getAuditEvents(
        TenantId tenantId,
        long startTime,
        long endTime,
        int limit
    );
    
    /**
     * Get audit events by category
     */
    List<AuditEvent> getEventsByCategory(
        TenantId tenantId,
        EventCategory category,
        long startTime,
        long endTime
    );
    
    /**
     * Get audit events by severity
     */
    List<AuditEvent> getEventsBySeverity(
        TenantId tenantId,
        EventSeverity severity,
        long startTime,
        long endTime
    );
    
    /**
     * Get audit events by entity
     */
    List<AuditEvent> getEventsByEntity(
        TenantId tenantId,
        String entityType,
        String entityId,
        long startTime,
        long endTime
    );
    
    /**
     * Get audit events by user
     */
    List<AuditEvent> getEventsByUser(
        TenantId tenantId,
        String userId,
        long startTime,
        long endTime
    );
    
    /**
     * Search audit events
     */
    List<AuditEvent> searchEvents(
        TenantId tenantId,
        String searchQuery,
        long startTime,
        long endTime,
        int limit
    );
    
    /**
     * Get audit event by ID
     */
    AuditEvent getEventById(String eventId, TenantId tenantId);
    
    /**
     * Delete old audit events (retention policy)
     */
    void deleteOldEvents(TenantId tenantId, long retentionDays);
    
    /**
     * Export audit events
     */
    byte[] exportEvents(
        TenantId tenantId,
        long startTime,
        long endTime,
        String format
    );
}
