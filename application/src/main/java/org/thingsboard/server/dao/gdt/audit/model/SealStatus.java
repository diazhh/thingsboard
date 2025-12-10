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

/**
 * Electronic Seal Status Model
 * Represents the electronic seal status of a device for OIML R85 compliance
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SealStatus implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /**
     * Device ID
     */
    private String deviceId;
    
    /**
     * Device name
     */
    private String deviceName;
    
    /**
     * Tenant ID
     */
    private String tenantId;
    
    /**
     * Seal status: SEALED or UNSEALED
     */
    private SealState state;
    
    /**
     * Timestamp when seal status was set
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    private Date sealedAt;
    
    /**
     * User who sealed the device
     */
    private String sealedBy;
    
    /**
     * Reason for sealing
     */
    private String sealReason;
    
    /**
     * Timestamp when seal was last verified
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    private Date lastVerifiedAt;
    
    /**
     * Digital signature of seal status
     */
    private String sealSignature;
    
    /**
     * Number of configuration changes since seal
     */
    private int configurationChanges;
    
    /**
     * Number of data modifications since seal
     */
    private int dataModifications;
    
    /**
     * Compliance status
     */
    private ComplianceStatus complianceStatus;
    
    /**
     * Notes
     */
    private String notes;
    
    /**
     * Seal State Enum
     */
    public enum SealState {
        SEALED("Sellado", "Device is electronically sealed"),
        UNSEALED("Sin Sellar", "Device is not sealed"),
        BROKEN("Roto", "Seal has been broken");
        
        private final String displayName;
        private final String description;
        
        SealState(String displayName, String description) {
            this.displayName = displayName;
            this.description = description;
        }
        
        public String getDisplayName() {
            return displayName;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    /**
     * Compliance Status Enum
     */
    public enum ComplianceStatus {
        COMPLIANT("Cumplido", "Seal status is compliant with OIML R85"),
        NON_COMPLIANT("No Cumplido", "Seal status is not compliant"),
        WARNING("Advertencia", "Seal status requires attention"),
        EXPIRED("Expirado", "Seal has expired");
        
        private final String displayName;
        private final String description;
        
        ComplianceStatus(String displayName, String description) {
            this.displayName = displayName;
            this.description = description;
        }
        
        public String getDisplayName() {
            return displayName;
        }
        
        public String getDescription() {
            return description;
        }
    }
}
