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
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * Historical Telemetry Service
 * 
 * Provides methods to query historical telemetry data at specific timestamps
 * for creating historical batches.
 */

export interface TelemetryDataPoint {
  ts: number;
  value: any;
}

export interface AvailabilityResult {
  available: boolean;
  missingKeys: string[];
  availableKeys: string[];
  dataQuality: 'good' | 'partial' | 'poor';
  message: string;
}

export interface PeriodSummary {
  startTime: number;
  endTime: number;
  duration: number; // milliseconds
  dataPoints: number;
  averageLevel?: number;
  levelChange?: number;
  suggestedBatchType?: 'receiving' | 'dispensing';
  confidence?: number;
}

@Injectable({
  providedIn: 'root'
})
export class HistoricalTelemetryService {
  
  private readonly DEFAULT_TOLERANCE = 300000; // 5 minutes
  private readonly REQUIRED_KEYS = ['level', 'temperature'];
  private readonly OPTIONAL_KEYS = ['apiGravity', 'bsw', 'pressure', 'density'];

  constructor(
    private http: HttpClient
  ) {}

  /**
   * Get telemetry data at a specific timestamp
   * Finds the closest data point within tolerance
   * Automatically calculates average temperature from temperature_19 to temperature_24
   */
  getTelemetryAtTimestamp(
    tankId: string,
    timestamp: number,
    keys: string[],
    options?: { tolerance?: number }
  ): Observable<{ [key: string]: TelemetryDataPoint }> {
    const tolerance = options?.tolerance || this.DEFAULT_TOLERANCE;
    const startTs = timestamp - tolerance;
    const endTs = timestamp + tolerance;

    console.log('[HistoricalTelemetryService] Getting telemetry at timestamp:', {
      tankId,
      timestamp: new Date(timestamp).toISOString(),
      keys,
      tolerance,
      range: {
        start: new Date(startTs).toISOString(),
        end: new Date(endTs).toISOString()
      }
    });

    // Build keys to request
    // Always include temperature sensors for averaging
    const temperatureKeys = ['temperature_19', 'temperature_20', 'temperature_21', 'temperature_22', 'temperature_23', 'temperature_24'];
    
    // Filter out 'temperature' from keys since we'll calculate it from individual sensors
    const otherKeys = keys.filter(k => k !== 'temperature');
    const allKeys = [...new Set([...otherKeys, ...temperatureKeys])]; // Remove duplicates

    console.log('[HistoricalTelemetryService] Requesting keys:', allKeys);

    // Query historical data for the time range using HTTP API
    const keysParam = allKeys.join(',');
    const url = `/api/plugins/telemetry/ASSET/${tankId}/values/timeseries?keys=${keysParam}&startTs=${startTs}&endTs=${endTs}&limit=1000&agg=NONE`;

    console.log('[HistoricalTelemetryService] Query URL:', url);

    return this.http.get<{ [key: string]: TelemetryDataPoint[] }>(url).pipe(
      map(data => {
        console.log('[HistoricalTelemetryService] Received telemetry data:', data);
        console.log('[HistoricalTelemetryService] Available keys in response:', Object.keys(data));
        
        const result: { [key: string]: TelemetryDataPoint } = {};
        
        // For each requested key, find the closest data point to the target timestamp
        keys.forEach(key => {
          if (key === 'temperature') {
            // Special handling: calculate average temperature from temperature_19 to temperature_24
            const avgTemp = this.extractAverageTemperature(data, timestamp);
            console.log('[HistoricalTelemetryService] Calculated average temperature:', avgTemp);
            if (avgTemp !== null) {
              result['temperature'] = {
                ts: timestamp,
                value: avgTemp
              };
            }
          } else if (data[key] && data[key].length > 0) {
            const closestPoint = this.findClosestDataPoint(data[key], timestamp);
            if (closestPoint) {
              result[key] = closestPoint;
            }
          }
        });

        console.log('[HistoricalTelemetryService] Result data points:', result);
        return result;
      }),
      catchError(error => {
        console.error('[HistoricalTelemetryService] Error getting telemetry:', error);
        throw error;
      })
    );
  }

  /**
   * Check if data is available for a time range
   */
  checkDataAvailability(
    tankId: string,
    startTime: number,
    endTime: number
  ): Observable<AvailabilityResult> {
    console.log('[HistoricalTelemetryService] Checking data availability:', {
      tankId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    });

    // Only check for level (temperature will be calculated from temperature_19-24)
    const requiredKeys = ['level'];
    const allKeys = [...requiredKeys, ...this.OPTIONAL_KEYS];

    return forkJoin({
      startData: this.getTelemetryAtTimestamp(tankId, startTime, allKeys),
      endData: this.getTelemetryAtTimestamp(tankId, endTime, allKeys)
    }).pipe(
      map(({ startData, endData }) => {
        console.log('[HistoricalTelemetryService] Start data:', startData);
        console.log('[HistoricalTelemetryService] End data:', endData);
        
        const startKeys = Object.keys(startData);
        const endKeys = Object.keys(endData);
        
        // Check which required keys are available at both timestamps
        const availableRequiredKeys = requiredKeys.filter(key =>
          startKeys.includes(key) && endKeys.includes(key)
        );
        
        const missingRequiredKeys = requiredKeys.filter(key =>
          !availableRequiredKeys.includes(key)
        );

        const availableOptionalKeys = this.OPTIONAL_KEYS.filter(key =>
          startKeys.includes(key) && endKeys.includes(key)
        );

        const available = missingRequiredKeys.length === 0;
        
        let dataQuality: 'good' | 'partial' | 'poor';
        if (availableRequiredKeys.length === requiredKeys.length &&
            availableOptionalKeys.length === this.OPTIONAL_KEYS.length) {
          dataQuality = 'good';
        } else if (availableRequiredKeys.length === requiredKeys.length) {
          dataQuality = 'partial';
        } else {
          dataQuality = 'poor';
        }

        let message = '';
        if (!available) {
          message = `Missing required data: ${missingRequiredKeys.join(', ')}`;
        } else if (dataQuality === 'partial') {
          message = `Some optional data is missing, but batch can be created`;
        } else {
          message = `All data available for the selected time range`;
        }

        console.log('[HistoricalTelemetryService] Availability result:', {
          available,
          dataQuality,
          availableKeys: [...availableRequiredKeys, ...availableOptionalKeys],
          missingKeys: missingRequiredKeys
        });

        return {
          available,
          missingKeys: missingRequiredKeys,
          availableKeys: [...availableRequiredKeys, ...availableOptionalKeys],
          dataQuality,
          message
        };
      }),
      catchError(error => {
        console.error('[HistoricalTelemetryService] Error checking availability:', error);
        return of({
          available: false,
          missingKeys: requiredKeys,
          availableKeys: [],
          dataQuality: 'poor' as const,
          message: `Error checking data availability: ${error.message}`
        });
      })
    );
  }

  /**
   * Get summary of a period (level changes, suggested batch type)
   */
  getPeriodSummary(
    tankId: string,
    startTime: number,
    endTime: number
  ): Observable<PeriodSummary> {
    console.log('[HistoricalTelemetryService] Getting period summary:', {
      tankId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    });

    const url = `/api/plugins/telemetry/ASSET/${tankId}/values/timeseries?keys=level&startTs=${startTime}&endTs=${endTime}&limit=1000&agg=NONE`;

    return this.http.get<{ level: TelemetryDataPoint[] }>(url).pipe(
      map(data => {
        if (!data.level || data.level.length === 0) {
          return {
            startTime,
            endTime,
            duration: endTime - startTime,
            dataPoints: 0,
            suggestedBatchType: undefined,
            confidence: 0
          };
        }

        const levelData = data.level;
        const dataPoints = levelData.length;

        // Calculate average level
        const averageLevel = levelData.reduce((sum, point) => sum + Number(point.value), 0) / dataPoints;

        // Get start and end levels
        const startLevel = Number(levelData[0].value);
        const endLevel = Number(levelData[dataPoints - 1].value);
        const levelChange = endLevel - startLevel;

        // Suggest batch type based on level change
        let suggestedBatchType: 'receiving' | 'dispensing' | undefined;
        let confidence = 0;

        if (Math.abs(levelChange) > 50) { // Threshold: 50mm
          if (levelChange > 0) {
            suggestedBatchType = 'receiving';
          } else {
            suggestedBatchType = 'dispensing';
          }
          
          // Calculate confidence based on consistency of trend
          const trend = this.analyzeTrend(levelData);
          confidence = trend.consistency;
        }

        const summary: PeriodSummary = {
          startTime,
          endTime,
          duration: endTime - startTime,
          dataPoints,
          averageLevel,
          levelChange,
          suggestedBatchType,
          confidence
        };

        console.log('[HistoricalTelemetryService] Period summary:', summary);
        return summary;
      }),
      catchError(error => {
        console.error('[HistoricalTelemetryService] Error getting period summary:', error);
        throw error;
      })
    );
  }

  /**
   * Extract average temperature from temperature_19 to temperature_24
   * These represent temperature sensors at different heights in the tank
   */
  private extractAverageTemperature(
    telemetryData: { [key: string]: TelemetryDataPoint[] },
    targetTimestamp: number
  ): number | null {
    const temperatureKeys = ['temperature_19', 'temperature_20', 'temperature_21', 'temperature_22', 'temperature_23', 'temperature_24'];
    const temperatures: number[] = [];

    for (const key of temperatureKeys) {
      if (telemetryData[key] && telemetryData[key].length > 0) {
        const closestPoint = this.findClosestDataPoint(telemetryData[key], targetTimestamp);
        if (closestPoint) {
          const value = Number(closestPoint.value);
          if (!isNaN(value)) {
            temperatures.push(value);
          }
        }
      }
    }

    if (temperatures.length === 0) {
      return null;
    }

    // Calculate average
    const sum = temperatures.reduce((a, b) => a + b, 0);
    return sum / temperatures.length;
  }

  /**
   * Find the closest data point to a target timestamp
   * Returns the point with the minimum time difference
   */
  private findClosestDataPoint(
    dataPoints: TelemetryDataPoint[],
    targetTimestamp: number
  ): TelemetryDataPoint | null {
    if (!dataPoints || dataPoints.length === 0) {
      return null;
    }

    // Sort by distance from target timestamp
    let closest = dataPoints[0];
    let minDiff = Math.abs(dataPoints[0].ts - targetTimestamp);

    console.log(`[HistoricalTelemetryService] Finding closest point to ${new Date(targetTimestamp).toISOString()} from ${dataPoints.length} points`);

    for (const point of dataPoints) {
      const diff = Math.abs(point.ts - targetTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }

    console.log(`[HistoricalTelemetryService] Closest point: ${new Date(closest.ts).toISOString()} (diff: ${minDiff}ms, value: ${closest.value})`);

    return closest;
  }

  /**
   * Analyze trend consistency in level data
   */
  private analyzeTrend(dataPoints: TelemetryDataPoint[]): { consistency: number } {
    if (dataPoints.length < 3) {
      return { consistency: 0 };
    }

    const startLevel = Number(dataPoints[0].value);
    const endLevel = Number(dataPoints[dataPoints.length - 1].value);
    const overallTrend = endLevel - startLevel;

    if (Math.abs(overallTrend) < 10) {
      return { consistency: 0 }; // No significant change
    }

    // Count how many consecutive points follow the trend
    let consistentPoints = 0;
    for (let i = 1; i < dataPoints.length; i++) {
      const change = Number(dataPoints[i].value) - Number(dataPoints[i - 1].value);
      if ((overallTrend > 0 && change >= 0) || (overallTrend < 0 && change <= 0)) {
        consistentPoints++;
      }
    }

    const consistency = consistentPoints / (dataPoints.length - 1);
    return { consistency };
  }
}
