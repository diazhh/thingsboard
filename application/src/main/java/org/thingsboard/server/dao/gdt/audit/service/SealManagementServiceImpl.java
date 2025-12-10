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
import org.thingsboard.server.dao.gdt.audit.model.SealStatus;
import org.thingsboard.server.dao.gdt.audit.model.EventCategory;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Seal Management Service Implementation
 * Handles electronic seal management for OIML R85 compliance
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SealManagementServiceImpl implements SealManagementService {
    
    private final EventLoggerService eventLoggerService;
    private final DigitalSignatureService digitalSignatureService;
    
    // In-memory storage (should be replaced with database)
    private final Map<String, SealStatus> sealStatusByDevice = new ConcurrentHashMap<>();
    private final Map<String, List<SealStatus>> sealHistoryByDevice = new ConcurrentHashMap<>();
    
    @Override
    public SealStatus sealDevice(
            String deviceId,
            String deviceName,
            String userId,
            String userName,
            String reason,
            TenantId tenantId) {
        
        try {
            log.info("[{}] Sealing device: {} ({})", tenantId, deviceName, deviceId);
            
            // Create seal status
            SealStatus sealStatus = SealStatus.builder()
                    .deviceId(deviceId)
                    .deviceName(deviceName)
                    .tenantId(tenantId.toString())
                    .state(SealStatus.SealState.SEALED)
                    .sealedAt(new Date())
                    .sealedBy(userName)
                    .sealReason(reason)
                    .lastVerifiedAt(new Date())
                    .configurationChanges(0)
                    .dataModifications(0)
                    .complianceStatus(SealStatus.ComplianceStatus.COMPLIANT)
                    .build();
            
            // Generate digital signature
            String signature = digitalSignatureService.generateSignatureForString(
                    deviceId + "|" + sealStatus.getSealedAt() + "|" + userName
            );
            sealStatus.setSealSignature(signature);
            
            // Store seal status
            sealStatusByDevice.put(deviceId, sealStatus);
            sealHistoryByDevice.computeIfAbsent(deviceId, k -> new ArrayList<>()).add(sealStatus);
            
            // Log event
            eventLoggerService.logEvent(
                    org.thingsboard.server.dao.gdt.audit.model.AuditEvent.builder()
                            .category(EventCategory.SEAL_STATUS_CHANGE)
                            .severity(org.thingsboard.server.dao.gdt.audit.model.EventSeverity.WARNING)
                            .userId(userId)
                            .userName(userName)
                            .description("Device sealed: " + deviceName)
                            .entityType("DEVICE")
                            .entityId(deviceId)
                            .entityName(deviceName)
                            .newValue("SEALED")
                            .metadata(Map.of("reason", reason))
                            .build(),
                    tenantId
            );
            
            log.info("[{}] Device sealed successfully: {}", tenantId, deviceId);
            return sealStatus;
            
        } catch (Exception e) {
            log.error("[{}] Error sealing device: {}", tenantId, deviceId, e);
            throw new RuntimeException("Failed to seal device", e);
        }
    }
    
    @Override
    public SealStatus unsealDevice(
            String deviceId,
            String userId,
            String userName,
            String reason,
            TenantId tenantId) {
        
        try {
            log.info("[{}] Unsealing device: {}", tenantId, deviceId);
            
            SealStatus currentSeal = sealStatusByDevice.get(deviceId);
            if (currentSeal == null) {
                throw new IllegalArgumentException("Device is not sealed");
            }
            
            // Create new seal status (unsealed)
            SealStatus newSealStatus = SealStatus.builder()
                    .deviceId(deviceId)
                    .deviceName(currentSeal.getDeviceName())
                    .tenantId(tenantId.toString())
                    .state(SealStatus.SealState.UNSEALED)
                    .lastVerifiedAt(new Date())
                    .configurationChanges(currentSeal.getConfigurationChanges())
                    .dataModifications(currentSeal.getDataModifications())
                    .complianceStatus(SealStatus.ComplianceStatus.COMPLIANT)
                    .notes("Unsealed by: " + userName + " - Reason: " + reason)
                    .build();
            
            // Generate digital signature
            String signature = digitalSignatureService.generateSignatureForString(
                    deviceId + "|" + new Date() + "|" + userName
            );
            newSealStatus.setSealSignature(signature);
            
            // Store new seal status
            sealStatusByDevice.put(deviceId, newSealStatus);
            sealHistoryByDevice.computeIfAbsent(deviceId, k -> new ArrayList<>()).add(newSealStatus);
            
            // Log event
            eventLoggerService.logEvent(
                    org.thingsboard.server.dao.gdt.audit.model.AuditEvent.builder()
                            .category(EventCategory.SEAL_STATUS_CHANGE)
                            .severity(org.thingsboard.server.dao.gdt.audit.model.EventSeverity.WARNING)
                            .userId(userId)
                            .userName(userName)
                            .description("Device unsealed: " + currentSeal.getDeviceName())
                            .entityType("DEVICE")
                            .entityId(deviceId)
                            .entityName(currentSeal.getDeviceName())
                            .oldValue("SEALED")
                            .newValue("UNSEALED")
                            .metadata(Map.of("reason", reason))
                            .build(),
                    tenantId
            );
            
            log.info("[{}] Device unsealed successfully: {}", tenantId, deviceId);
            return newSealStatus;
            
        } catch (Exception e) {
            log.error("[{}] Error unsealing device: {}", tenantId, deviceId, e);
            throw new RuntimeException("Failed to unseal device", e);
        }
    }
    
    @Override
    public SealStatus getSealStatus(String deviceId, TenantId tenantId) {
        return sealStatusByDevice.get(deviceId);
    }
    
    @Override
    public List<SealStatus> getSealedDevices(TenantId tenantId) {
        return sealStatusByDevice.values().stream()
                .filter(s -> tenantId.toString().equals(s.getTenantId()))
                .filter(s -> s.getState() == SealStatus.SealState.SEALED)
                .collect(Collectors.toList());
    }
    
    @Override
    public List<SealStatus> getUnsealedDevices(TenantId tenantId) {
        return sealStatusByDevice.values().stream()
                .filter(s -> tenantId.toString().equals(s.getTenantId()))
                .filter(s -> s.getState() == SealStatus.SealState.UNSEALED)
                .collect(Collectors.toList());
    }
    
    @Override
    public boolean verifySealIntegrity(String deviceId, TenantId tenantId) {
        SealStatus sealStatus = sealStatusByDevice.get(deviceId);
        
        if (sealStatus == null || sealStatus.getState() != SealStatus.SealState.SEALED) {
            return false;
        }
        
        // Verify signature
        String expectedSignature = digitalSignatureService.generateSignatureForString(
                deviceId + "|" + sealStatus.getSealedAt() + "|" + sealStatus.getSealedBy()
        );
        
        boolean isValid = expectedSignature.equals(sealStatus.getSealSignature());
        
        if (!isValid) {
            sealStatus.setComplianceStatus(SealStatus.ComplianceStatus.NON_COMPLIANT);
            sealStatus.setState(SealStatus.SealState.BROKEN);
            log.warn("[{}] Seal integrity check failed for device: {}", tenantId, deviceId);
        }
        
        sealStatus.setLastVerifiedAt(new Date());
        return isValid;
    }
    
    @Override
    public boolean isDeviceSealed(String deviceId, TenantId tenantId) {
        SealStatus sealStatus = sealStatusByDevice.get(deviceId);
        return sealStatus != null && sealStatus.getState() == SealStatus.SealState.SEALED;
    }
    
    @Override
    public List<SealStatus> getSealHistory(String deviceId, TenantId tenantId) {
        return sealHistoryByDevice.getOrDefault(deviceId, new ArrayList<>());
    }
    
    @Override
    public SealStatus updateComplianceStatus(String deviceId, TenantId tenantId) {
        SealStatus sealStatus = sealStatusByDevice.get(deviceId);
        
        if (sealStatus == null) {
            return null;
        }
        
        // Check compliance based on changes
        if (sealStatus.getConfigurationChanges() > 0 || sealStatus.getDataModifications() > 0) {
            if (sealStatus.getState() == SealStatus.SealState.SEALED) {
                sealStatus.setComplianceStatus(SealStatus.ComplianceStatus.NON_COMPLIANT);
                sealStatus.setState(SealStatus.SealState.BROKEN);
            }
        }
        
        return sealStatus;
    }
    
    @Override
    public boolean validateConfigurationChange(String deviceId, TenantId tenantId) {
        SealStatus sealStatus = sealStatusByDevice.get(deviceId);
        
        if (sealStatus == null) {
            return true; // Device not sealed, allow change
        }
        
        if (sealStatus.getState() == SealStatus.SealState.SEALED) {
            sealStatus.setConfigurationChanges(sealStatus.getConfigurationChanges() + 1);
            sealStatus.setComplianceStatus(SealStatus.ComplianceStatus.NON_COMPLIANT);
            sealStatus.setState(SealStatus.SealState.BROKEN);
            log.warn("[{}] Configuration change detected on sealed device: {}", tenantId, deviceId);
            return false; // Reject change
        }
        
        return true; // Allow change
    }
    
    @Override
    public boolean validateDataModification(String deviceId, TenantId tenantId) {
        SealStatus sealStatus = sealStatusByDevice.get(deviceId);
        
        if (sealStatus == null) {
            return true; // Device not sealed, allow modification
        }
        
        if (sealStatus.getState() == SealStatus.SealState.SEALED) {
            sealStatus.setDataModifications(sealStatus.getDataModifications() + 1);
            sealStatus.setComplianceStatus(SealStatus.ComplianceStatus.NON_COMPLIANT);
            sealStatus.setState(SealStatus.SealState.BROKEN);
            log.warn("[{}] Data modification detected on sealed device: {}", tenantId, deviceId);
            return false; // Reject modification
        }
        
        return true; // Allow modification
    }
}
