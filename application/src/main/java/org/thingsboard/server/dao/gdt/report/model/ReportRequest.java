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

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Report generation request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {
    
    private ReportType reportType;
    private ReportFormat format;
    private Map<String, Object> parameters;
    private String locale;
    private String timezone;
    private boolean scheduled;
    
    /**
     * Get parameter value
     */
    public Object getParameter(String key) {
        return parameters != null ? parameters.get(key) : null;
    }
    
    /**
     * Get parameter as String
     */
    public String getParameterAsString(String key) {
        Object value = getParameter(key);
        return value != null ? value.toString() : null;
    }
    
    /**
     * Get parameter as Long
     */
    public Long getParameterAsLong(String key) {
        Object value = getParameter(key);
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        return null;
    }
}
