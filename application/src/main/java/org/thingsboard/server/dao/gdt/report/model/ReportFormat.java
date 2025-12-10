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
package org.thingsboard.server.dao.gdt.report.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Report export formats
 */
public enum ReportFormat {
    CSV,
    PDF,
    EXCEL;
    
    /**
     * Convert enum to lowercase for JSON serialization
     */
    @JsonValue
    public String toValue() {
        return this.name().toLowerCase();
    }
    
    /**
     * Convert from lowercase or UPPERCASE string to enum
     */
    @JsonCreator
    public static ReportFormat fromValue(String value) {
        if (value == null) {
            return null;
        }
        return ReportFormat.valueOf(value.toUpperCase());
    }
}
