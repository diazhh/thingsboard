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

/**
 * Event Categories for OIML R85 Compliance
 * Categorizes different types of system events for audit logging
 */
public enum EventCategory {
    // Configuration Changes
    CONFIG_CHANGE("Configuration Change", "System configuration was modified"),
    TANK_SETTINGS_CHANGE("Tank Settings Change", "Tank configuration was modified"),
    ALARM_THRESHOLD_CHANGE("Alarm Threshold Change", "Alarm thresholds were modified"),
    USER_PERMISSION_CHANGE("User Permission Change", "User permissions were modified"),
    
    // Batch Operations
    BATCH_CREATED("Batch Created", "New batch was created"),
    BATCH_TRANSFERRED("Batch Transferred", "Batch transfer operation completed"),
    BATCH_CLOSED("Batch Closed", "Batch was closed"),
    BATCH_RECONCILED("Batch Reconciled", "Batch reconciliation completed"),
    
    // Manual Data Entry
    MANUAL_LEVEL_ENTRY("Manual Level Entry", "Manual level measurement was recorded"),
    MANUAL_TEMPERATURE_ENTRY("Manual Temperature Entry", "Manual temperature measurement was recorded"),
    LABORATORY_ANALYSIS_ENTRY("Laboratory Analysis Entry", "Laboratory analysis data was entered"),
    
    // System Events
    SYSTEM_STARTUP("System Startup", "System started"),
    SYSTEM_SHUTDOWN("System Shutdown", "System shut down"),
    DATABASE_BACKUP("Database Backup", "Database backup was performed"),
    
    // Security Events
    USER_LOGIN("User Login", "User logged in"),
    USER_LOGOUT("User Logout", "User logged out"),
    UNAUTHORIZED_ACCESS_ATTEMPT("Unauthorized Access Attempt", "Unauthorized access attempt detected"),
    PASSWORD_CHANGE("Password Change", "User password was changed"),
    
    // Data Integrity
    DATA_VALIDATION_ERROR("Data Validation Error", "Data validation error detected"),
    DISCREPANCY_DETECTED("Discrepancy Detected", "Mass balance discrepancy detected"),
    SEAL_STATUS_CHANGE("Seal Status Change", "Electronic seal status changed"),
    
    // Alarms
    ALARM("Alarm", "Alarm event"),
    
    // Other
    OTHER("Other", "Other event");
    
    private final String displayName;
    private final String description;
    
    EventCategory(String displayName, String description) {
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
