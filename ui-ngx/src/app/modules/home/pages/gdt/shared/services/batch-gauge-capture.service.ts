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
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { TankTelemetryService } from './tank-telemetry.service';
import { TankAssetService } from './tank-asset.service';
import { GaugeReading } from '../models/batch.model';

/**
 * Gauge Snapshot - Complete tank measurement at a specific point in time
 */
export interface GaugeSnapshot extends GaugeReading {
  // Override to make required fields explicit
  captureMethod: 'automatic' | 'manual' | 'historical';
  dataSource: 'telemetry' | 'manual_entry' | 'telemetry_history';
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  tankState?: {
    radarOk: boolean;
    telemetryAge: number;
    lastUpdate: number;
  };
}

/**
 * Batch Gauge Capture Service
 * 
 * Handles automatic capture of tank gauge readings from telemetry
 * for batch custody transfer operations.
 * 
 * Features:
 * - Automatic capture from real-time telemetry
 * - Historical gauge capture from specific timestamps
 * - Data validation and quality checks
 * - Volume calculations integration
 */
@Injectable({
  providedIn: 'root'
})
export class BatchGaugeCaptureService {

  // Telemetry keys to capture
  private readonly TELEMETRY_KEYS = [
    'level',
    'temperature_19',
    'temperature_20',
    'temperature_21',
    'temperature_22',
    'temperature_23',
    'temperature_24',
    'pressure',
    'apiGravity',
    'bsw',
    'density'
  ];

  // Maximum age for telemetry to be considered "fresh" (1 minute)
  private readonly MAX_TELEMETRY_AGE_MS = 60000;

  constructor(
    private telemetryService: TankTelemetryService,
    private tankAssetService: TankAssetService
  ) {}

  /**
   * Capture current gauge reading from real-time telemetry
   * 
   * @param tankId - Tank asset ID
   * @param operator - Operator name (optional)
   * @returns Observable of GaugeSnapshot
   */
  captureCurrentGauge(tankId: string, operator?: string): Observable<GaugeSnapshot> {
    console.log('[BatchGaugeCaptureService] Capturing current gauge for tank:', tankId);

    return this.tankAssetService.getTankWithAttributes(tankId).pipe(
      switchMap(({ asset, attributes }) => {
        // Get latest telemetry
        return this.telemetryService.getLatestTelemetry('ASSET', tankId, this.TELEMETRY_KEYS).pipe(
          map(telemetryData => {
            console.log('[BatchGaugeCaptureService] Telemetry data:', telemetryData);

            // Extract values from telemetry
            const level = this.extractTelemetryValue(telemetryData, 'level');
            const temperature = this.extractAverageTemperature(telemetryData);
            const pressure = this.extractTelemetryValue(telemetryData, 'pressure', 1.013); // atmospheric default
            const apiGravity = this.extractTelemetryValue(telemetryData, 'apiGravity') || 
                              attributes?.apiGravityBase || 
                              35.0; // default
            const bsw = this.extractTelemetryValue(telemetryData, 'bsw', 0);

            // Validate required values
            if (level === null || level === undefined) {
              throw new Error('Level telemetry not available');
            }
            if (temperature === null || temperature === undefined) {
              throw new Error('Temperature telemetry not available (temperature_19 to temperature_24)');
            }

            // Get timestamp (use most recent)
            const timestamp = this.getLatestTimestamp(telemetryData);
            const telemetryAge = Date.now() - timestamp;

            // Calculate volume inline (geometric calculation)
            // For vertical cylinder: V = π * r² * h
            const tankShape = attributes?.tankShape || 'vertical';
            const tankDiameter = attributes?.tankDiameter || 0;
            const radius = tankDiameter / 2;
            const volumeTOV = Math.PI * radius * radius * level; // Simplified for vertical cylinder
            
            // TODO: Implement full API MPMS calculations with CTL, CPL, CSW
            // For now, use simplified calculations
            const volumes = {
              tov: volumeTOV,
              gov: volumeTOV * (1 - (bsw / 100)), // Gross = TOV - water
              gsv: volumeTOV * (1 - (bsw / 100)), // Simplified, needs CTL
              nsv: volumeTOV * (1 - (bsw / 100)), // Simplified, needs CTL + CPL
              mass: volumeTOV * (141.5 / (apiGravity + 131.5)) * 0.999, // Simplified mass
              wia: volumeTOV * (bsw / 100) // Water in air
            };

            // Build gauge snapshot
            const snapshot: GaugeSnapshot = {
              timestamp,
              operator: operator || 'System',
              level,
              temperature,
              apiGravity,
              bsw,
              
              // Calculated volumes
              tov: volumes.tov,
              gov: volumes.gov,
              gsv: volumes.gsv,
              nsv: volumes.nsv,
              mass: volumes.mass,
              wia: volumes.wia,

              // Metadata
              captureMethod: 'automatic',
              dataSource: 'telemetry',
              radarDeviceId: attributes?.radarDeviceId,
              dataQuality: {
                sourceReliable: telemetryAge < this.MAX_TELEMETRY_AGE_MS && this.checkAllKeysAvailable(telemetryData),
                telemetryAge
              }
            };

            console.log('[BatchGaugeCaptureService] Gauge snapshot created:', snapshot);
            return snapshot;
          })
        );
      }),
      catchError(error => {
        console.error('[BatchGaugeCaptureService] Error capturing gauge:', error);
        return throwError(() => new Error(`Failed to capture gauge: ${error.message}`));
      })
    );
  }

  /**
   * Capture historical gauge reading from specific timestamp
   * 
   * @param tankId - Tank asset ID
   * @param timestamp - Timestamp in milliseconds
   * @param tolerance - Tolerance in milliseconds for finding closest data (default: 60000 = 1 minute)
   * @returns Observable of GaugeSnapshot
   */
  captureHistoricalGauge(tankId: string, timestamp: number, tolerance: number = 60000, operator?: string): Observable<GaugeSnapshot> {
    console.log('[BatchGaugeCaptureService] Capturing historical gauge for tank:', tankId, 'at', new Date(timestamp));

    return this.tankAssetService.getTankWithAttributes(tankId).pipe(
      switchMap(({ asset, attributes }) => {
        // Query historical telemetry around the timestamp
        const startTs = timestamp - tolerance;
        const endTs = timestamp + tolerance;

        return this.telemetryService.getHistoricalTelemetry(
          'ASSET',
          tankId,
          this.TELEMETRY_KEYS,
          startTs,
          endTs
        ).pipe(
          map(telemetryData => {
            console.log('[BatchGaugeCaptureService] Historical telemetry data:', telemetryData);

            // Find closest data point to target timestamp
            const closestData = this.findClosestDataPoint(telemetryData, timestamp);
            
            if (!closestData) {
              throw new Error(`No telemetry data found near timestamp ${new Date(timestamp)}`);
            }

            // Extract values
            const level = closestData.level;
            const temperature = closestData.temperature;
            // Use API gravity from telemetry or tank config
            const apiGravity = closestData.apiGravity || attributes?.apiGravityBase || 35.0;
            const bsw = closestData.bsw || 0;

            // Validate
            if (level === null || level === undefined) {
              throw new Error('Level data not available in historical telemetry');
            }
            if (temperature === null || temperature === undefined) {
              throw new Error('Temperature data not available in historical telemetry');
            }

            // Calculate volume inline (geometric calculation)
            // For vertical cylinder: V = π * r² * h
            const tankDiameter = attributes?.tankDiameter || 0;
            const radius = tankDiameter / 2;
            const volumeTOV = Math.PI * radius * radius * level; // Simplified for vertical cylinder

            const volumes = {
              tov: volumeTOV,
              gov: volumeTOV * (1 - (bsw / 100)), // Gross = TOV - water
              gsv: volumeTOV * (1 - (bsw / 100)), // Simplified, needs CTL
              nsv: volumeTOV * (1 - (bsw / 100)), // Simplified, needs CTL + CPL
              mass: volumeTOV * (141.5 / (apiGravity + 131.5)) * 0.999, // Simplified mass
              wia: volumeTOV * (bsw / 100) // Water in air
            };

            // Build snapshot
            const snapshot: GaugeSnapshot = {
              timestamp: closestData.timestamp,
              operator: operator || 'System (Historical)',
              level,
              temperature,
              apiGravity,
              bsw,
              
              tov: volumes.tov,
              gov: volumes.gov,
              gsv: volumes.gsv,
              nsv: volumes.nsv,
              mass: volumes.mass,
              wia: volumes.wia,

              // Metadata
              captureMethod: 'historical',
              dataSource: 'telemetry_history',
              radarDeviceId: attributes?.radarDeviceId,
              dataQuality: {
                sourceReliable: true,
                telemetryAge: Math.abs(closestData.timestamp - timestamp)
              }
            };

            console.log('[BatchGaugeCaptureService] Historical gauge snapshot created:', snapshot);
            return snapshot;
          })
        );
      }),
      catchError(error => {
        console.error('[BatchGaugeCaptureService] Error capturing historical gauge:', error);
        return throwError(() => new Error(`Failed to capture historical gauge: ${error.message}`));
      })
    );
  }

  /**
   * Validate data availability for gauge capture
   * 
   * @param tankId - Tank asset ID
   * @returns Observable of ValidationResult
   */
  validateDataAvailability(tankId: string): Observable<ValidationResult> {
    console.log('[BatchGaugeCaptureService] Validating data availability for tank:', tankId);

    return this.telemetryService.getLatestTelemetry('ASSET', tankId, this.TELEMETRY_KEYS).pipe(
      map(telemetryData => {
        const timestamp = this.getLatestTimestamp(telemetryData);
        const telemetryAge = Date.now() - timestamp;
        const isFresh = telemetryAge < this.MAX_TELEMETRY_AGE_MS;

        const level = this.extractTelemetryValue(telemetryData, 'level');
        const temperature = this.extractTelemetryValue(telemetryData, 'temperature');

        const warnings: string[] = [];
        let valid = true;
        let error: string | undefined;

        // Check required keys
        if (level === null || level === undefined) {
          valid = false;
          error = 'Level telemetry not available';
        } else if (temperature === null || temperature === undefined) {
          valid = false;
          error = 'Temperature telemetry not available';
        } else if (!isFresh) {
          warnings.push(`Telemetry data is ${Math.round(telemetryAge / 1000)}s old (stale)`);
        }

        // Check optional keys
        if (!this.extractTelemetryValue(telemetryData, 'pressure')) {
          warnings.push('Pressure telemetry not available (will use atmospheric default)');
        }
        if (!this.extractTelemetryValue(telemetryData, 'apiGravity')) {
          warnings.push('API Gravity telemetry not available (will use tank configuration)');
        }

        const result: ValidationResult = {
          valid,
          error,
          warnings: warnings.length > 0 ? warnings : undefined,
          tankState: {
            radarOk: isFresh,
            telemetryAge,
            lastUpdate: timestamp
          }
        };

        console.log('[BatchGaugeCaptureService] Validation result:', result);
        return result;
      }),
      catchError(error => {
        console.error('[BatchGaugeCaptureService] Error validating data:', error);
        return of({
          valid: false,
          error: `Failed to validate data: ${error.message}`
        });
      })
    );
  }

  /**
   * Private helper methods
   */

  private extractTelemetryValue(telemetryData: any, key: string, defaultValue: any = null): any {
    if (!telemetryData || !telemetryData[key] || telemetryData[key].length === 0) {
      return defaultValue;
    }
    return telemetryData[key][0].value;
  }

  /**
   * Extract average temperature from temperature_19 to temperature_24
   * These represent temperature sensors at different heights in the tank
   */
  private extractAverageTemperature(telemetryData: any): number | null {
    const temperatureKeys = ['temperature_19', 'temperature_20', 'temperature_21', 'temperature_22', 'temperature_23', 'temperature_24'];
    const temperatures: number[] = [];

    for (const key of temperatureKeys) {
      const value = this.extractTelemetryValue(telemetryData, key);
      if (value !== null && value !== undefined && !isNaN(value)) {
        temperatures.push(Number(value));
      }
    }

    if (temperatures.length === 0) {
      return null;
    }

    // Calculate average
    const sum = temperatures.reduce((a, b) => a + b, 0);
    return sum / temperatures.length;
  }

  private getLatestTimestamp(telemetryData: any): number {
    let latestTs = 0;
    Object.keys(telemetryData || {}).forEach(key => {
      if (telemetryData[key] && telemetryData[key].length > 0) {
        const ts = telemetryData[key][0].ts;
        if (ts > latestTs) {
          latestTs = ts;
        }
      }
    });
    return latestTs || Date.now();
  }

  private checkAllKeysAvailable(telemetryData: any): boolean {
    // Check if level is available
    if (!telemetryData['level'] || telemetryData['level'].length === 0) {
      return false;
    }
    
    // Check if at least one temperature sensor is available
    const temperatureKeys = ['temperature_19', 'temperature_20', 'temperature_21', 'temperature_22', 'temperature_23', 'temperature_24'];
    const hasTemperature = temperatureKeys.some(key => 
      telemetryData[key] && telemetryData[key].length > 0
    );
    
    return hasTemperature;
  }

  private findClosestDataPoint(telemetryData: any, targetTimestamp: number): any {
    const dataPoints: any[] = [];

    // Extract all data points with timestamps
    Object.keys(telemetryData || {}).forEach(key => {
      if (telemetryData[key] && Array.isArray(telemetryData[key])) {
        telemetryData[key].forEach((point: any) => {
          const existing = dataPoints.find(dp => dp.timestamp === point.ts);
          if (existing) {
            existing[key] = point.value;
          } else {
            dataPoints.push({
              timestamp: point.ts,
              [key]: point.value
            });
          }
        });
      }
    });

    if (dataPoints.length === 0) {
      return null;
    }

    // Find closest to target timestamp
    dataPoints.sort((a, b) => {
      const diffA = Math.abs(a.timestamp - targetTimestamp);
      const diffB = Math.abs(b.timestamp - targetTimestamp);
      return diffA - diffB;
    });

    const closestPoint = dataPoints[0];
    
    // Calculate average temperature from temperature_19 to temperature_24
    const temperatureKeys = ['temperature_19', 'temperature_20', 'temperature_21', 'temperature_22', 'temperature_23', 'temperature_24'];
    const temperatures: number[] = [];
    
    for (const key of temperatureKeys) {
      if (closestPoint[key] !== null && closestPoint[key] !== undefined && !isNaN(closestPoint[key])) {
        temperatures.push(Number(closestPoint[key]));
      }
    }
    
    if (temperatures.length > 0) {
      const sum = temperatures.reduce((a, b) => a + b, 0);
      closestPoint.temperature = sum / temperatures.length;
    }

    return closestPoint;
  }
}
