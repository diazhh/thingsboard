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
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

/**
 * Time Aggregation Types
 */
export enum TimeAggregation {
  NONE = 'NONE',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  SUM = 'SUM',
  COUNT = 'COUNT'
}

/**
 * Time Interval Types
 */
export enum TimeInterval {
  RAW = 'RAW',
  MINUTE = 'MINUTE',
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH'
}

/**
 * Historical Data Point
 */
export interface HistoricalDataPoint {
  ts: number;
  value: number;
}

/**
 * Time Series Data
 */
export interface TimeSeriesData {
  key: string;
  label: string;
  data: HistoricalDataPoint[];
  unit?: string;
  color?: string;
}

/**
 * Historical Data Request
 */
export interface HistoricalDataRequest {
  entityId: string;
  entityType: 'DEVICE' | 'ASSET';
  keys: string[];
  startTs: number;
  endTs: number;
  interval?: TimeInterval;
  aggregation?: TimeAggregation;
  limit?: number;
}

/**
 * Multi-Tank Historical Data Request
 */
export interface MultiTankDataRequest {
  tankIds: string[];
  keys: string[];
  startTs: number;
  endTs: number;
  interval?: TimeInterval;
  aggregation?: TimeAggregation;
}

/**
 * Statistical Summary
 */
export interface DataStatistics {
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
  stdDev: number;
}

/**
 * Cache entry for historical data
 */
interface CacheEntry {
  data: TimeSeriesData[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

@Injectable({
  providedIn: 'root'
})
export class HistoricalDataService {

  // Cache storage: key = hash(request), value = CacheEntry
  private dataCache = new Map<string, CacheEntry>();
  
  // Default cache TTL: 5 minutes
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000;
  
  // Maximum cache size: 50 entries
  private readonly MAX_CACHE_SIZE = 50;

  constructor(private http: HttpClient) {
    // Cleanup expired cache entries every 10 minutes
    setInterval(() => this.cleanupExpiredCache(), 10 * 60 * 1000);
  }

  /**
   * Get historical data for a single entity (with caching)
   */
  getHistoricalData(request: HistoricalDataRequest): Observable<TimeSeriesData[]> {
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first
    const cachedEntry = this.dataCache.get(cacheKey);
    if (cachedEntry && !this.isCacheExpired(cachedEntry)) {
      return of(cachedEntry.data);
    }

    const { entityId, entityType, keys, startTs, endTs, interval, aggregation, limit } = request;

    // Build API URL based on aggregation
    const useAggregation = interval && interval !== TimeInterval.RAW && aggregation && aggregation !== TimeAggregation.NONE;
    
    const dataObservable = useAggregation 
      ? this.getAggregatedData(request)
      : this.getRawData(request);

    // Cache the result
    return dataObservable.pipe(
      map(data => {
        this.setCacheEntry(cacheKey, data);
        return data;
      })
    );
  }

  /**
   * Get raw (non-aggregated) historical data
   */
  private getRawData(request: HistoricalDataRequest): Observable<TimeSeriesData[]> {
    const { entityId, entityType, keys, startTs, endTs, limit } = request;
    const keysParam = keys.join(',');
    const limitParam = limit || 1000;
    
    const url = `/api/plugins/telemetry/${entityType}/${entityId}/values/timeseries?keys=${keysParam}&startTs=${startTs}&endTs=${endTs}&limit=${limitParam}&agg=NONE&orderBy=ASC`;

    return this.http.get<any>(url).pipe(
      map(response => this.transformResponse(response, keys)),
      catchError(error => {
        console.error('Error fetching raw historical data:', error);
        return of([]);
      })
    );
  }

  /**
   * Get aggregated historical data
   */
  private getAggregatedData(request: HistoricalDataRequest): Observable<TimeSeriesData[]> {
    const { entityId, entityType, keys, startTs, endTs, interval, aggregation, limit } = request;
    const keysParam = keys.join(',');
    const intervalMs = this.getIntervalMilliseconds(interval!);
    const limitParam = limit || 1000;
    
    const url = `/api/plugins/telemetry/${entityType}/${entityId}/values/timeseries?keys=${keysParam}&startTs=${startTs}&endTs=${endTs}&interval=${intervalMs}&agg=${aggregation}&limit=${limitParam}&orderBy=ASC`;

    return this.http.get<any>(url).pipe(
      map(response => this.transformResponse(response, keys)),
      catchError(error => {
        console.error('Error fetching aggregated historical data:', error);
        return of([]);
      })
    );
  }

  /**
   * Transform ThingsBoard API response to TimeSeriesData format
   */
  private transformResponse(response: any, keys: string[]): TimeSeriesData[] {
    const result: TimeSeriesData[] = [];

    keys.forEach(key => {
      if (response[key] && Array.isArray(response[key])) {
        const data: HistoricalDataPoint[] = response[key].map((item: any) => ({
          ts: item.ts,
          value: parseFloat(item.value)
        }));

        result.push({
          key,
          label: this.getKeyLabel(key),
          data,
          unit: this.getKeyUnit(key),
          color: this.getKeyColor(key)
        });
      }
    });

    return result;
  }

  /**
   * Get historical data for multiple tanks
   */
  getMultiTankData(request: MultiTankDataRequest): Observable<Map<string, TimeSeriesData[]>> {
    const requests = request.tankIds.map(tankId => 
      this.getHistoricalData({
        entityId: tankId,
        entityType: 'ASSET',
        keys: request.keys,
        startTs: request.startTs,
        endTs: request.endTs,
        interval: request.interval,
        aggregation: request.aggregation
      })
    );

    return forkJoin(requests).pipe(
      map(results => {
        const dataMap = new Map<string, TimeSeriesData[]>();
        request.tankIds.forEach((tankId, index) => {
          dataMap.set(tankId, results[index]);
        });
        return dataMap;
      })
    );
  }

  /**
   * Calculate statistics for time series data
   */
  calculateStatistics(data: HistoricalDataPoint[]): DataStatistics {
    if (!data || data.length === 0) {
      return { min: 0, max: 0, avg: 0, sum: 0, count: 0, stdDev: 0 };
    }

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const count = values.length;
    const avg = sum / count;

    // Calculate standard deviation
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / count;
    const stdDev = Math.sqrt(variance);

    return { min, max, avg, sum, count, stdDev };
  }

  /**
   * Aggregate data by time interval
   */
  aggregateData(
    data: HistoricalDataPoint[],
    interval: TimeInterval,
    aggregation: TimeAggregation
  ): HistoricalDataPoint[] {
    if (!data || data.length === 0) return [];

    const intervalMs = this.getIntervalMilliseconds(interval);
    const grouped = new Map<number, number[]>();

    // Group data by interval
    data.forEach(point => {
      const bucket = Math.floor(point.ts / intervalMs) * intervalMs;
      if (!grouped.has(bucket)) {
        grouped.set(bucket, []);
      }
      grouped.get(bucket)!.push(point.value);
    });

    // Aggregate each bucket
    const aggregated: HistoricalDataPoint[] = [];
    grouped.forEach((values, ts) => {
      let value: number;
      switch (aggregation) {
        case TimeAggregation.AVG:
          value = values.reduce((sum, v) => sum + v, 0) / values.length;
          break;
        case TimeAggregation.MIN:
          value = Math.min(...values);
          break;
        case TimeAggregation.MAX:
          value = Math.max(...values);
          break;
        case TimeAggregation.SUM:
          value = values.reduce((sum, v) => sum + v, 0);
          break;
        case TimeAggregation.COUNT:
          value = values.length;
          break;
        default:
          value = values[values.length - 1]; // Last value
      }
      aggregated.push({ ts, value });
    });

    return aggregated.sort((a, b) => a.ts - b.ts);
  }

  /**
   * Export data to CSV
   */
  exportToCSV(data: TimeSeriesData[], filename: string): void {
    if (!data || data.length === 0) return;

    // Create CSV header
    const headers = ['Timestamp', ...data.map(series => series.label)];
    let csv = headers.join(',') + '\n';

    // Get all unique timestamps
    const timestamps = new Set<number>();
    data.forEach(series => {
      series.data.forEach(point => timestamps.add(point.ts));
    });

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    // Create CSV rows
    sortedTimestamps.forEach(ts => {
      const row = [new Date(ts).toISOString()];
      data.forEach(series => {
        const point = series.data.find(p => p.ts === ts);
        row.push(point ? point.value.toFixed(2) : '');
      });
      csv += row.join(',') + '\n';
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Get interval in milliseconds
   */
  private getIntervalMilliseconds(interval: TimeInterval): number {
    switch (interval) {
      case TimeInterval.MINUTE:
        return 60 * 1000;
      case TimeInterval.HOUR:
        return 60 * 60 * 1000;
      case TimeInterval.DAY:
        return 24 * 60 * 60 * 1000;
      case TimeInterval.WEEK:
        return 7 * 24 * 60 * 60 * 1000;
      case TimeInterval.MONTH:
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 1000; // 1 second
    }
  }


  /**
   * Get label for key
   */
  private getKeyLabel(key: string): string {
    const labels: { [key: string]: string } = {
      'level': 'Nivel',
      'temperature': 'Temperatura',
      'TOV': 'TOV',
      'GOV': 'GOV',
      'GSV': 'GSV',
      'NSV': 'NSV',
      'density': 'Densidad',
      'mass': 'Masa',
      'pressure': 'Presión',
      'flow_rate': 'Flujo'
    };
    return labels[key] || key;
  }

  /**
   * Get unit for key
   */
  private getKeyUnit(key: string): string {
    const units: { [key: string]: string } = {
      'level': 'mm',
      'temperature': '°C',
      'TOV': 'L',
      'GOV': 'L',
      'GSV': 'L',
      'NSV': 'L',
      'density': 'kg/L',
      'mass': 'kg',
      'pressure': 'kPa',
      'flow_rate': 'L/min'
    };
    return units[key] || '';
  }

  /**
   * Get color for key
   */
  private getKeyColor(key: string): string {
    const colors: { [key: string]: string } = {
      'level': '#1976d2',
      'temperature': '#f44336',
      'TOV': '#4caf50',
      'GOV': '#2196f3',
      'GSV': '#ff9800',
      'NSV': '#9c27b0',
      'density': '#00bcd4',
      'mass': '#795548',
      'pressure': '#607d8b',
      'flow_rate': '#3f51b5'
    };
    return colors[key] || '#000000';
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: HistoricalDataRequest | MultiTankDataRequest): string {
    const isMultiTank = 'tankIds' in request;
    const ids = isMultiTank ? (request as MultiTankDataRequest).tankIds.join(',') : (request as HistoricalDataRequest).entityId;
    const keys = request.keys.join(',');
    const interval = request.interval || 'RAW';
    const aggregation = request.aggregation || 'NONE';
    
    return `${ids}:${keys}:${request.startTs}:${request.endTs}:${interval}:${aggregation}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Set cache entry with automatic eviction if needed
   */
  private setCacheEntry(key: string, data: TimeSeriesData[]): void {
    // Evict oldest entry if cache is full
    if (this.dataCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.dataCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.dataCache.delete(oldestKey);
    }

    this.dataCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.DEFAULT_CACHE_TTL
    });
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.dataCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.dataCache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.dataCache.clear();
  }
}
