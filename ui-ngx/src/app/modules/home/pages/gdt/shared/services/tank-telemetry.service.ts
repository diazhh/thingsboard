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
import { Observable, Subject, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Telemetry data point
 */
export interface TelemetryDataPoint {
  ts: number;  // timestamp in milliseconds
  value: any;
}

/**
 * Telemetry subscription data
 */
export interface TelemetryData {
  [key: string]: TelemetryDataPoint[];
}

/**
 * Subscription configuration
 */
export interface TelemetrySubscriptionConfig {
  entityType: 'DEVICE' | 'ASSET';
  entityId: string;
  keys: string[];
  startTs?: number;
  endTs?: number;
  interval?: number;
  limit?: number;
  agg?: 'NONE' | 'MIN' | 'MAX' | 'AVG' | 'SUM' | 'COUNT';
}

/**
 * Service for managing telemetry subscriptions in ThingsBoard
 * Provides real-time data streaming and historical data queries
 */
@Injectable({
  providedIn: 'root'
})
export class TankTelemetryService {

  private subscriptions: Map<string, Subject<TelemetryData>> = new Map();
  private pollingIntervals: Map<string, any> = new Map();

  constructor(private http: HttpClient) {}

  /**
   * Subscribe to real-time telemetry updates
   * Uses polling since we don't have direct WebSocket access in widget context
   * @param config - Subscription configuration
   * @param pollingInterval - Polling interval in milliseconds (default: 2000ms)
   * @returns Observable of telemetry data
   */
  subscribeToTelemetry(config: TelemetrySubscriptionConfig, pollingInterval: number = 2000): Observable<TelemetryData> {
    const subscriptionKey = `${config.entityType}_${config.entityId}`;
    
    // Return existing subscription if already exists
    if (this.subscriptions.has(subscriptionKey)) {
      return this.subscriptions.get(subscriptionKey)!.asObservable();
    }

    // Create new subject for this subscription
    const subject = new Subject<TelemetryData>();
    this.subscriptions.set(subscriptionKey, subject);

    // Start polling for telemetry data
    const interval = setInterval(() => {
      this.getLatestTelemetry(config.entityType, config.entityId, config.keys)
        .subscribe(
          data => subject.next(data),
          error => console.error('Error polling telemetry:', error)
        );
    }, pollingInterval);

    this.pollingIntervals.set(subscriptionKey, interval);

    // Initial fetch
    this.getLatestTelemetry(config.entityType, config.entityId, config.keys)
      .subscribe(
        data => subject.next(data),
        error => console.error('Error fetching initial telemetry:', error)
      );

    return subject.asObservable();
  }

  /**
   * Unsubscribe from telemetry updates
   * @param entityType - Entity type
   * @param entityId - Entity ID
   */
  unsubscribeFromTelemetry(entityType: string, entityId: string): void {
    const subscriptionKey = `${entityType}_${entityId}`;
    
    // Clear polling interval
    const interval = this.pollingIntervals.get(subscriptionKey);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(subscriptionKey);
    }

    // Complete and remove subject
    const subject = this.subscriptions.get(subscriptionKey);
    if (subject) {
      subject.complete();
      this.subscriptions.delete(subscriptionKey);
    }
  }

  /**
   * Unsubscribe from all telemetry subscriptions
   */
  unsubscribeAll(): void {
    // Clear all intervals
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();

    // Complete all subjects
    this.subscriptions.forEach(subject => subject.complete());
    this.subscriptions.clear();
  }

  /**
   * Get latest telemetry values
   * @param entityType - Entity type (DEVICE or ASSET)
   * @param entityId - Entity ID
   * @param keys - Array of telemetry keys
   * @returns Observable of telemetry data
   */
  getLatestTelemetry(entityType: string, entityId: string, keys: string[]): Observable<TelemetryData> {
    const keysParam = keys.join(',');
    return this.http.get<any>(
      `/api/plugins/telemetry/${entityType}/${entityId}/values/timeseries?keys=${keysParam}`
    ).pipe(
      map(response => {
        // ThingsBoard returns: { key1: [{ts, value}], key2: [{ts, value}] }
        return response;
      }),
      catchError(error => {
        console.error('Error fetching latest telemetry:', error);
        return of({});
      })
    );
  }

  /**
   * Get historical telemetry data
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param keys - Array of telemetry keys
   * @param startTs - Start timestamp (ms)
   * @param endTs - End timestamp (ms)
   * @param interval - Aggregation interval (ms)
   * @param limit - Maximum number of data points
   * @param agg - Aggregation function
   * @returns Observable of historical telemetry data
   */
  getHistoricalTelemetry(
    entityType: string,
    entityId: string,
    keys: string[],
    startTs: number,
    endTs: number,
    interval?: number,
    limit: number = 1000,
    agg: string = 'NONE'
  ): Observable<TelemetryData> {
    const keysParam = keys.join(',');
    let url = `/api/plugins/telemetry/${entityType}/${entityId}/values/timeseries?keys=${keysParam}&startTs=${startTs}&endTs=${endTs}&limit=${limit}&agg=${agg}`;
    
    if (interval) {
      url += `&interval=${interval}`;
    }

    return this.http.get<TelemetryData>(url).pipe(
      catchError(error => {
        console.error('Error fetching historical telemetry:', error);
        return of({});
      })
    );
  }

  /**
   * Save telemetry data (for manual gauging, etc.)
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param data - Telemetry data to save
   * @param scope - Telemetry scope (default: SHARED_SCOPE)
   * @returns Observable of void
   */
  saveTelemetry(
    entityType: string,
    entityId: string,
    data: { [key: string]: any },
    scope: string = 'SHARED_SCOPE'
  ): Observable<void> {
    return this.http.post<void>(
      `/api/plugins/telemetry/${entityType}/${entityId}/timeseries/${scope}`,
      data
    );
  }

  /**
   * Delete telemetry data
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param keys - Array of keys to delete
   * @param startTs - Start timestamp (optional)
   * @param endTs - End timestamp (optional)
   * @returns Observable of void
   */
  deleteTelemetry(
    entityType: string,
    entityId: string,
    keys: string[],
    startTs?: number,
    endTs?: number
  ): Observable<void> {
    const keysParam = keys.join(',');
    let url = `/api/plugins/telemetry/${entityType}/${entityId}/timeseries/delete?keys=${keysParam}`;
    
    if (startTs) url += `&startTs=${startTs}`;
    if (endTs) url += `&endTs=${endTs}`;

    return this.http.delete<void>(url);
  }

  /**
   * Get telemetry keys for an entity
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Observable of telemetry keys array
   */
  getTelemetryKeys(entityType: string, entityId: string): Observable<string[]> {
    return this.http.get<string[]>(
      `/api/plugins/telemetry/${entityType}/${entityId}/keys/timeseries`
    ).pipe(
      catchError(error => {
        console.error('Error fetching telemetry keys:', error);
        return of([]);
      })
    );
  }

  /**
   * Subscribe to multiple entities telemetry
   * @param configs - Array of subscription configurations
   * @param pollingInterval - Polling interval in milliseconds
   * @returns Map of entityId to Observable
   */
  subscribeToMultipleTelemetry(
    configs: TelemetrySubscriptionConfig[],
    pollingInterval: number = 2000
  ): Map<string, Observable<TelemetryData>> {
    const subscriptions = new Map<string, Observable<TelemetryData>>();

    configs.forEach(config => {
      const observable = this.subscribeToTelemetry(config, pollingInterval);
      subscriptions.set(config.entityId, observable);
    });

    return subscriptions;
  }

  /**
   * Get latest telemetry for multiple entities
   * @param entityType - Entity type
   * @param entityIds - Array of entity IDs
   * @param keys - Array of telemetry keys
   * @returns Observable of Map with entityId to telemetry data
   */
  getLatestTelemetryForMultiple(
    entityType: string,
    entityIds: string[],
    keys: string[]
  ): Observable<Map<string, TelemetryData>> {
    const requests = entityIds.map(entityId =>
      this.getLatestTelemetry(entityType, entityId, keys).pipe(
        map(data => ({ entityId, data }))
      )
    );

    return new Observable(observer => {
      Promise.all(requests.map(req => req.toPromise()))
        .then(results => {
          const resultMap = new Map<string, TelemetryData>();
          results.forEach(result => {
            if (result) {
              resultMap.set(result.entityId, result.data);
            }
          });
          observer.next(resultMap);
          observer.complete();
        })
        .catch(error => {
          console.error('Error fetching multiple telemetry:', error);
          observer.next(new Map());
          observer.complete();
        });
    });
  }

  /**
   * Calculate aggregated statistics for a telemetry key
   * @param data - Telemetry data points
   * @returns Statistics object
   */
  calculateStats(data: TelemetryDataPoint[]): {
    min: number;
    max: number;
    avg: number;
    count: number;
    latest: number;
  } {
    if (!data || data.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0, latest: 0 };
    }

    const values = data.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
      latest: values[values.length - 1]
    };
  }
}
