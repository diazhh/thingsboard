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
package org.thingsboard.server.dao.gdt.audit.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Date;
import java.util.Map;

/**
 * Audit Event Model for OIML R85 Compliance
 * Represents a single audit event in the system
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditEvent implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /**
     * Unique event ID
     */
    private String eventId;
    
    /**
     * Tenant ID
     */
    private String tenantId;
    
    /**
     * Event timestamp (UTC)
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    private Date timestamp;
    
    /**
     * Event category
     */
    private EventCategory category;
    
    /**
     * Event severity level
     */
    private EventSeverity severity;
    
    /**
     * User who triggered the event
     */
    private String userId;
    
    /**
     * User name
     */
    private String userName;
    
    /**
     * Event description
     */
    private String description;
    
    /**
     * Entity type (TANK, BATCH, USER, SYSTEM, etc.)
     */
    private String entityType;
    
    /**
     * Entity ID
     */
    private String entityId;
    
    /**
     * Entity name
     */
    private String entityName;
    
    /**
     * Old value (before change)
     */
    private String oldValue;
    
    /**
     * New value (after change)
     */
    private String newValue;
    
    /**
     * Additional metadata
     */
    private Map<String, Object> metadata;
    
    /**
     * IP address of the client
     */
    private String ipAddress;
    
    /**
     * Digital signature (SHA-256)
     */
    private String digitalSignature;
    
    /**
     * Signature timestamp
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    private Date signatureTimestamp;
    
    /**
     * Status of the event
     */
    private EventStatus status;
    
    /**
     * Compliance notes
     */
    private String complianceNotes;
}
