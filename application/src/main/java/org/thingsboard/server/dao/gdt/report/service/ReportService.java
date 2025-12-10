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
package org.thingsboard.server.dao.gdt.report.service;

import org.thingsboard.server.common.data.id.DeviceId;
import org.thingsboard.server.common.data.id.EntityId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.kv.TsKvEntry;
import org.thingsboard.server.dao.gdt.report.model.ReportRequest;
import org.thingsboard.server.dao.gdt.report.model.ReportResponse;

import java.util.List;
import java.util.Map;

/**
 * Report Service Interface
 */
public interface ReportService {
    
    /**
     * Generate a report
     */
    ReportResponse generateReport(ReportRequest request, TenantId tenantId);
    
    /**
     * Get report by ID
     */
    ReportResponse getReport(String reportId, TenantId tenantId);
    
    /**
     * Get latest telemetry for an entity (device or asset)
     */
    Map<String, Object> getLatestTelemetry(EntityId entityId, List<String> keys);
    
    /**
     * Get historical telemetry for a device
     */
    List<TsKvEntry> getHistoricalTelemetry(
        DeviceId deviceId, 
        List<String> keys, 
        long startTs, 
        long endTs
    );
}
