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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.thingsboard.server.common.data.exception.ThingsboardException;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.controller.BaseController;
import org.thingsboard.server.dao.gdt.audit.model.SealStatus;
import org.thingsboard.server.dao.gdt.audit.service.SealManagementService;
import org.thingsboard.server.queue.util.TbCoreComponent;

import java.util.List;
import java.util.Map;

/**
 * Seal Management REST Controller
 * Handles REST API endpoints for electronic seal management
 */
@RestController
@RequestMapping("/api/gdt/seal")
@Slf4j
@TbCoreComponent
public class SealManagementController extends BaseController {

    @Autowired
    private SealManagementService sealManagementService;

    /**
     * Seal a device
     */
    @PostMapping("/seal")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN')")
    public ResponseEntity<SealStatus> sealDevice(@RequestBody Map<String, String> request) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        String userId = getCurrentUserId();
        String userName = getCurrentUserName();

        SealStatus sealStatus = sealManagementService.sealDevice(
                request.get("deviceId"),
                request.get("deviceName"),
                userId,
                userName,
                request.get("reason"),
                tenantId
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(sealStatus);
    }

    /**
     * Unseal a device
     */
    @PostMapping("/unseal")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN')")
    public ResponseEntity<SealStatus> unsealDevice(@RequestBody Map<String, String> request) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        String userId = getCurrentUserId();
        String userName = getCurrentUserName();

        SealStatus sealStatus = sealManagementService.unsealDevice(
                request.get("deviceId"),
                userId,
                userName,
                request.get("reason"),
                tenantId
        );

        return ResponseEntity.ok(sealStatus);
    }

    /**
     * Get seal status for a device
     */
    @GetMapping("/{deviceId}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<SealStatus> getSealStatus(@PathVariable String deviceId) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        SealStatus sealStatus = sealManagementService.getSealStatus(deviceId, tenantId);

        if (sealStatus == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(sealStatus);
    }

    /**
     * Get all sealed devices
     */
    @GetMapping("/sealed/list")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<SealStatus>> getSealedDevices() throws ThingsboardException {
        TenantId tenantId = getTenantId();
        List<SealStatus> sealedDevices = sealManagementService.getSealedDevices(tenantId);
        return ResponseEntity.ok(sealedDevices);
    }

    /**
     * Get all unsealed devices
     */
    @GetMapping("/unsealed/list")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<SealStatus>> getUnsealedDevices() throws ThingsboardException {
        TenantId tenantId = getTenantId();
        List<SealStatus> unsealedDevices = sealManagementService.getUnsealedDevices(tenantId);
        return ResponseEntity.ok(unsealedDevices);
    }

    /**
     * Verify seal integrity
     */
    @PostMapping("/{deviceId}/verify")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<Map<String, Object>> verifySealIntegrity(@PathVariable String deviceId) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        boolean isValid = sealManagementService.verifySealIntegrity(deviceId, tenantId);

        return ResponseEntity.ok(Map.of(
                "deviceId", deviceId,
                "isValid", isValid,
                "timestamp", System.currentTimeMillis()
        ));
    }

    /**
     * Check if device is sealed
     */
    @GetMapping("/{deviceId}/is-sealed")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<Map<String, Object>> isDeviceSealed(@PathVariable String deviceId) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        boolean isSealed = sealManagementService.isDeviceSealed(deviceId, tenantId);

        return ResponseEntity.ok(Map.of(
                "deviceId", deviceId,
                "isSealed", isSealed
        ));
    }

    /**
     * Get seal history for a device
     */
    @GetMapping("/{deviceId}/history")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<SealStatus>> getSealHistory(@PathVariable String deviceId) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        List<SealStatus> history = sealManagementService.getSealHistory(deviceId, tenantId);
        return ResponseEntity.ok(history);
    }

    /**
     * Update compliance status
     */
    @PostMapping("/{deviceId}/update-compliance")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN')")
    public ResponseEntity<SealStatus> updateComplianceStatus(@PathVariable String deviceId) throws ThingsboardException {
        TenantId tenantId = getTenantId();
        SealStatus sealStatus = sealManagementService.updateComplianceStatus(deviceId, tenantId);

        if (sealStatus == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(sealStatus);
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
