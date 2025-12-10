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

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thingsboard.server.dao.gdt.audit.model.AuditEvent;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Digital Signature Service Implementation
 * Implements SHA-256 digital signatures for audit events
 */
@Service
@Slf4j
public class DigitalSignatureServiceImpl implements DigitalSignatureService {
    
    private static final String ALGORITHM = "SHA-256";
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    public String generateSignature(AuditEvent event) {
        try {
            // Create a map with event data for signing (excluding signature field)
            Map<String, Object> eventData = new LinkedHashMap<>();
            eventData.put("eventId", event.getEventId());
            eventData.put("tenantId", event.getTenantId());
            eventData.put("timestamp", event.getTimestamp());
            eventData.put("category", event.getCategory());
            eventData.put("severity", event.getSeverity());
            eventData.put("userId", event.getUserId());
            eventData.put("userName", event.getUserName());
            eventData.put("description", event.getDescription());
            eventData.put("entityType", event.getEntityType());
            eventData.put("entityId", event.getEntityId());
            eventData.put("entityName", event.getEntityName());
            eventData.put("oldValue", event.getOldValue());
            eventData.put("newValue", event.getNewValue());
            eventData.put("ipAddress", event.getIpAddress());
            
            // Convert to JSON string
            String jsonString = objectMapper.writeValueAsString(eventData);
            
            // Generate SHA-256 signature
            return generateSignatureForString(jsonString);
            
        } catch (Exception e) {
            log.error("Error generating signature for audit event", e);
            throw new RuntimeException("Failed to generate signature", e);
        }
    }
    
    @Override
    public boolean verifySignature(AuditEvent event, String signature) {
        try {
            String generatedSignature = generateSignature(event);
            return generatedSignature.equals(signature);
        } catch (Exception e) {
            log.error("Error verifying signature for audit event", e);
            return false;
        }
    }
    
    @Override
    public String generateSignatureForString(String data) {
        return generateSignatureForBytes(data.getBytes(StandardCharsets.UTF_8));
    }
    
    @Override
    public String generateSignatureForBytes(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance(ALGORITHM);
            byte[] hashBytes = digest.digest(data);
            
            // Convert bytes to hexadecimal string
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            
            return hexString.toString();
            
        } catch (NoSuchAlgorithmException e) {
            log.error("SHA-256 algorithm not available", e);
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
    
    @Override
    public boolean verifySignatureForString(String data, String signature) {
        try {
            String generatedSignature = generateSignatureForString(data);
            return generatedSignature.equals(signature);
        } catch (Exception e) {
            log.error("Error verifying signature for string", e);
            return false;
        }
    }
    
    @Override
    public boolean verifySignatureForBytes(byte[] data, String signature) {
        try {
            String generatedSignature = generateSignatureForBytes(data);
            return generatedSignature.equals(signature);
        } catch (Exception e) {
            log.error("Error verifying signature for bytes", e);
            return false;
        }
    }
    
    @Override
    public String getAlgorithm() {
        return ALGORITHM;
    }
}
