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
 * Event Status
 */
public enum EventStatus {
    RECORDED("Recorded", "Event has been recorded"),
    SIGNED("Signed", "Event has been digitally signed"),
    VERIFIED("Verified", "Event signature has been verified"),
    ARCHIVED("Archived", "Event has been archived"),
    FAILED("Failed", "Event processing failed");
    
    private final String displayName;
    private final String description;
    
    EventStatus(String displayName, String description) {
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
