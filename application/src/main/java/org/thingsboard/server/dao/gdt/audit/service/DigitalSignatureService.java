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

import org.thingsboard.server.dao.gdt.audit.model.AuditEvent;

/**
 * Digital Signature Service Interface
 * Handles SHA-256 digital signatures for audit events
 */
public interface DigitalSignatureService {
    
    /**
     * Generate SHA-256 signature for an audit event
     */
    String generateSignature(AuditEvent event);
    
    /**
     * Verify SHA-256 signature for an audit event
     */
    boolean verifySignature(AuditEvent event, String signature);
    
    /**
     * Generate signature for a string
     */
    String generateSignatureForString(String data);
    
    /**
     * Generate signature for a byte array
     */
    String generateSignatureForBytes(byte[] data);
    
    /**
     * Verify signature for a string
     */
    boolean verifySignatureForString(String data, String signature);
    
    /**
     * Verify signature for a byte array
     */
    boolean verifySignatureForBytes(byte[] data, String signature);
    
    /**
     * Get signature algorithm
     */
    String getAlgorithm();
}
