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
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Audit Event Model
 */
export interface AuditEvent {
  eventId: string;
  timestamp: Date;
  category: string;
  severity: string;
  userId: string;
  userName: string;
  description: string;
  entityType: string;
  entityId: string;
  entityName: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  digitalSignature: string;
  status: string;
}

/**
 * Audit Event Service
 * Handles communication with the audit event REST API
 */
@Injectable({
  providedIn: 'root'
})
export class AuditEventService {

  private readonly apiUrl = '/api/gdt/audit/events';

  constructor(private http: HttpClient) {}

  /**
   * Get audit events for current tenant
   */
  getAuditEvents(timeRange: number = 86400000, limit: number = 1000): Observable<AuditEvent[]> {
    let params = new HttpParams()
      .set('timeRange', timeRange.toString())
      .set('limit', limit.toString());

    return this.http.get<AuditEvent[]>(this.apiUrl, { params })
      .pipe(
        map(events => this.transformEvents(events))
      );
  }

  /**
   * Get audit events by category
   */
  getEventsByCategory(category: string, timeRange: number = 86400000): Observable<AuditEvent[]> {
    let params = new HttpParams()
      .set('timeRange', timeRange.toString());

    return this.http.get<AuditEvent[]>(`${this.apiUrl}/category/${category}`, { params })
      .pipe(
        map(events => this.transformEvents(events))
      );
  }

  /**
   * Get audit events by severity
   */
  getEventsBySeverity(severity: string, timeRange: number = 86400000): Observable<AuditEvent[]> {
    let params = new HttpParams()
      .set('timeRange', timeRange.toString());

    return this.http.get<AuditEvent[]>(`${this.apiUrl}/severity/${severity}`, { params })
      .pipe(
        map(events => this.transformEvents(events))
      );
  }

  /**
   * Get audit events by entity
   */
  getEventsByEntity(entityType: string, entityId: string, timeRange: number = 2592000000): Observable<AuditEvent[]> {
    let params = new HttpParams()
      .set('timeRange', timeRange.toString());

    return this.http.get<AuditEvent[]>(`${this.apiUrl}/entity/${entityType}/${entityId}`, { params })
      .pipe(
        map(events => this.transformEvents(events))
      );
  }

  /**
   * Get audit events by user
   */
  getEventsByUser(userId: string, timeRange: number = 2592000000): Observable<AuditEvent[]> {
    let params = new HttpParams()
      .set('timeRange', timeRange.toString());

    return this.http.get<AuditEvent[]>(`${this.apiUrl}/user/${userId}`, { params })
      .pipe(
        map(events => this.transformEvents(events))
      );
  }

  /**
   * Search audit events
   */
  searchEvents(query: string, timeRange: number = 2592000000, limit: number = 1000): Observable<AuditEvent[]> {
    let params = new HttpParams()
      .set('query', query)
      .set('timeRange', timeRange.toString())
      .set('limit', limit.toString());

    return this.http.get<AuditEvent[]>(`${this.apiUrl}/search`, { params })
      .pipe(
        map(events => this.transformEvents(events))
      );
  }

  /**
   * Get audit event by ID
   */
  getEventById(eventId: string): Observable<AuditEvent> {
    return this.http.get<AuditEvent>(`${this.apiUrl}/${eventId}`)
      .pipe(
        map(event => this.transformEvent(event))
      );
  }

  /**
   * Log a configuration change event
   */
  logConfigChange(
    entityType: string,
    entityId: string,
    entityName: string,
    oldValue: string,
    newValue: string
  ): Observable<AuditEvent> {
    const payload = {
      entityType,
      entityId,
      entityName,
      oldValue,
      newValue
    };

    return this.http.post<AuditEvent>(`${this.apiUrl}/config-change`, payload)
      .pipe(
        map(event => this.transformEvent(event))
      );
  }

  /**
   * Log a batch operation event
   */
  logBatchOperation(
    operationType: string,
    batchId: string,
    batchName: string,
    metadata?: any
  ): Observable<AuditEvent> {
    const payload = {
      operationType,
      batchId,
      batchName,
      metadata: metadata || {}
    };

    return this.http.post<AuditEvent>(`${this.apiUrl}/batch-operation`, payload)
      .pipe(
        map(event => this.transformEvent(event))
      );
  }

  /**
   * Log a manual data entry event
   */
  logManualDataEntry(
    dataType: string,
    tankId: string,
    tankName: string,
    value: string
  ): Observable<AuditEvent> {
    const payload = {
      dataType,
      tankId,
      tankName,
      value
    };

    return this.http.post<AuditEvent>(`${this.apiUrl}/manual-entry`, payload)
      .pipe(
        map(event => this.transformEvent(event))
      );
  }

  /**
   * Export audit events to CSV
   */
  exportToCSV(timeRange: number = 2592000000): Observable<Blob> {
    let params = new HttpParams()
      .set('timeRange', timeRange.toString());

    return this.http.get(`${this.apiUrl}/export/csv`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Export audit events to JSON
   */
  exportToJSON(timeRange: number = 2592000000): Observable<Blob> {
    let params = new HttpParams()
      .set('timeRange', timeRange.toString());

    return this.http.get(`${this.apiUrl}/export/json`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Transform event dates from ISO strings to Date objects
   */
  private transformEvent(event: any): AuditEvent {
    if (event && event.timestamp) {
      event.timestamp = new Date(event.timestamp);
    }
    return event as AuditEvent;
  }

  /**
   * Transform multiple events
   */
  private transformEvents(events: any[]): AuditEvent[] {
    return events.map(event => this.transformEvent(event));
  }
}
