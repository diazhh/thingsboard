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
import org.thingsboard.server.dao.gdt.audit.model.SealStatus;

import java.util.List;

/**
 * Seal Management Service Interface
 * Handles electronic seal management for OIML R85 compliance
 */
public interface SealManagementService {
    
    /**
     * Seal a device
     */
    SealStatus sealDevice(
        String deviceId,
        String deviceName,
        String userId,
        String userName,
        String reason,
        TenantId tenantId
    );
    
    /**
     * Unseal a device
     */
    SealStatus unsealDevice(
        String deviceId,
        String userId,
        String userName,
        String reason,
        TenantId tenantId
    );
    
    /**
     * Get seal status for a device
     */
    SealStatus getSealStatus(String deviceId, TenantId tenantId);
    
    /**
     * Get all sealed devices for a tenant
     */
    List<SealStatus> getSealedDevices(TenantId tenantId);
    
    /**
     * Get all unsealed devices for a tenant
     */
    List<SealStatus> getUnsealedDevices(TenantId tenantId);
    
    /**
     * Verify seal integrity
     */
    boolean verifySealIntegrity(String deviceId, TenantId tenantId);
    
    /**
     * Check if device is sealed
     */
    boolean isDeviceSealed(String deviceId, TenantId tenantId);
    
    /**
     * Get seal history for a device
     */
    List<SealStatus> getSealHistory(String deviceId, TenantId tenantId);
    
    /**
     * Update seal compliance status
     */
    SealStatus updateComplianceStatus(String deviceId, TenantId tenantId);
    
    /**
     * Validate configuration changes on sealed device
     */
    boolean validateConfigurationChange(String deviceId, TenantId tenantId);
    
    /**
     * Validate data modification on sealed device
     */
    boolean validateDataModification(String deviceId, TenantId tenantId);
}
