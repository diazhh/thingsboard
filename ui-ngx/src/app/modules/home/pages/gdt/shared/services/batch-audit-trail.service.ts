///
/// Copyright © 2016-2025 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Batch } from '../models/batch.model';

/**
 * Audit trail event types
 */
export enum AuditEventType {
  BATCH_CREATED = 'BATCH_CREATED',
  BATCH_OPENED = 'BATCH_OPENED',
  BATCH_CLOSED = 'BATCH_CLOSED',
  BATCH_RECALCULATED = 'BATCH_RECALCULATED',
  BATCH_VOIDED = 'BATCH_VOIDED',
  BATCH_UPDATED = 'BATCH_UPDATED',
  BATCH_DELETED = 'BATCH_DELETED'
}

/**
 * Audit trail event
 */
export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  batchId: string;
  batchNumber: string;
  timestamp: number;
  userId: string;
  userName: string;
  action: string;
  details: {
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Service for managing batch audit trail
 * Logs all batch operations for compliance and traceability
 */
@Injectable({
  providedIn: 'root'
})
export class BatchAuditTrailService {

  // Store audit events in memory (in production, use backend)
  private auditEvents: AuditEvent[] = [];
  private eventId = 0;

  constructor() {
    console.log('[BatchAuditTrailService] Service initialized');
  }

  /**
   * Log batch creation
   */
  logBatchCreated(batch: Batch, userId: string, userName: string): Observable<AuditEvent> {
    const event = this.createAuditEvent(
      AuditEventType.BATCH_CREATED,
      batch,
      userId,
      userName,
      'Batch created',
      {
        batchType: batch.batchType,
        tankId: batch.tankId,
        operator: batch.createdBy,
        notes: batch.notes
      }
    );

    this.auditEvents.push(event);
    console.log('[BatchAuditTrailService] Batch created event logged:', event);
    return of(event);
  }

  /**
   * Log batch closure
   */
  logBatchClosed(batch: Batch, userId: string, userName: string, reason?: string): Observable<AuditEvent> {
    const event = this.createAuditEvent(
      AuditEventType.BATCH_CLOSED,
      batch,
      userId,
      userName,
      'Batch closed',
      {
        closedBy: batch.closedBy,
        closedAt: batch.closedAt,
        transferredNSV: batch.transferredNSV,
        transferredMass: batch.transferredMass,
        reason
      }
    );

    this.auditEvents.push(event);
    console.log('[BatchAuditTrailService] Batch closed event logged:', event);
    return of(event);
  }

  /**
   * Log batch recalculation
   */
  logBatchRecalculated(
    originalBatch: Batch,
    recalculatedBatch: Batch,
    userId: string,
    userName: string,
    reason: string,
    differences: any
  ): Observable<AuditEvent> {
    const event = this.createAuditEvent(
      AuditEventType.BATCH_RECALCULATED,
      recalculatedBatch,
      userId,
      userName,
      'Batch recalculated',
      {
        originalNSV: originalBatch.transferredNSV,
        recalculatedNSV: recalculatedBatch.transferredNSV,
        originalMass: originalBatch.transferredMass,
        recalculatedMass: recalculatedBatch.transferredMass,
        nsvDifference: differences.transferredNsv,
        massDifference: differences.transferredMass,
        percentageChange: differences.percentageChange,
        reason,
        recalculatedBy: recalculatedBatch.recalculatedBy,
        recalculatedAt: recalculatedBatch.recalculatedAt
      }
    );

    this.auditEvents.push(event);
    console.log('[BatchAuditTrailService] Batch recalculated event logged:', event);
    return of(event);
  }

  /**
   * Log batch void
   */
  logBatchVoided(batch: Batch, userId: string, userName: string, reason?: string): Observable<AuditEvent> {
    const event = this.createAuditEvent(
      AuditEventType.BATCH_VOIDED,
      batch,
      userId,
      userName,
      'Batch voided',
      {
        voidedBy: userId,
        voidedAt: Date.now(),
        reason
      }
    );

    this.auditEvents.push(event);
    console.log('[BatchAuditTrailService] Batch voided event logged:', event);
    return of(event);
  }

  /**
   * Get audit trail for a specific batch
   */
  getBatchAuditTrail(batchId: string): Observable<AuditEvent[]> {
    const trail = this.auditEvents.filter(event => event.batchId === batchId);
    console.log('[BatchAuditTrailService] Audit trail retrieved for batch:', {
      batchId,
      eventCount: trail.length
    });
    return of(trail);
  }

  /**
   * Get all audit events
   */
  getAllAuditEvents(filters?: {
    eventType?: AuditEventType;
    userId?: string;
    startDate?: number;
    endDate?: number;
  }): Observable<AuditEvent[]> {
    let events = [...this.auditEvents];

    if (filters) {
      if (filters.eventType) {
        events = events.filter(e => e.eventType === filters.eventType);
      }
      if (filters.userId) {
        events = events.filter(e => e.userId === filters.userId);
      }
      if (filters.startDate) {
        events = events.filter(e => e.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        events = events.filter(e => e.timestamp <= filters.endDate!);
      }
    }

    console.log('[BatchAuditTrailService] All audit events retrieved:', {
      totalCount: events.length,
      filters
    });
    return of(events);
  }

  /**
   * Get audit statistics
   */
  getAuditStatistics(): Observable<{
    totalEvents: number;
    eventsByType: { [key: string]: number };
    eventsByUser: { [key: string]: number };
    lastEventTime: number;
  }> {
    const stats = {
      totalEvents: this.auditEvents.length,
      eventsByType: {} as { [key: string]: number },
      eventsByUser: {} as { [key: string]: number },
      lastEventTime: this.auditEvents.length > 0 ? this.auditEvents[this.auditEvents.length - 1].timestamp : 0
    };

    // Count by event type
    this.auditEvents.forEach(event => {
      stats.eventsByType[event.eventType] = (stats.eventsByType[event.eventType] || 0) + 1;
    });

    // Count by user
    this.auditEvents.forEach(event => {
      stats.eventsByUser[event.userName] = (stats.eventsByUser[event.userName] || 0) + 1;
    });

    console.log('[BatchAuditTrailService] Audit statistics:', stats);
    return of(stats);
  }

  /**
   * Export audit trail to CSV
   */
  exportAuditTrailToCsv(): Observable<string> {
    const headers = ['ID', 'Event Type', 'Batch Number', 'Timestamp', 'User', 'Action', 'Details'];
    const rows = this.auditEvents.map(event => [
      event.id,
      event.eventType,
      event.batchNumber,
      new Date(event.timestamp).toLocaleString('es-ES'),
      event.userName,
      event.action,
      JSON.stringify(event.details)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    console.log('[BatchAuditTrailService] Audit trail exported to CSV');
    return of(csv);
  }

  /**
   * Clear audit trail (for testing only)
   */
  clearAuditTrail(): Observable<void> {
    this.auditEvents = [];
    this.eventId = 0;
    console.log('[BatchAuditTrailService] Audit trail cleared');
    return of(void 0);
  }

  /**
   * Private helper methods
   */

  /**
   * Create an audit event
   */
  private createAuditEvent(
    eventType: AuditEventType,
    batch: Batch,
    userId: string,
    userName: string,
    action: string,
    details: any
  ): AuditEvent {
    return {
      id: `audit-${this.eventId++}-${Date.now()}`,
      eventType,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      timestamp: Date.now(),
      userId,
      userName,
      action,
      details,
      ipAddress: this.getClientIpAddress(),
      userAgent: navigator.userAgent
    };
  }

  /**
   * Get client IP address (mock implementation)
   * In production, this would be obtained from the server
   */
  private getClientIpAddress(): string {
    // This is a placeholder - in production, get from server
    return 'N/A';
  }
}
