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
import { map, catchError, switchMap } from 'rxjs/operators';
import { TankTelemetryService } from './tank-telemetry.service';
import { TankAssetService } from './tank-asset.service';

/**
 * Tank State Validation Result
 */
export interface TankStateValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  tankState?: {
    radarOk: boolean;
    telemetryAge: number;
    lastUpdate: number;
    hasActiveAlarms: boolean;
    criticalAlarms: string[];
    movement?: MovementInfo;
    suggestedBatchType?: 'receiving' | 'dispensing' | null;
  };
}

/**
 * Movement Information
 */
export interface MovementInfo {
  type: 'idle' | 'receiving' | 'dispensing';
  rate: number; // mm/hour
  confidence: number; // 0-1
}

/**
 * Alarm Information
 */
export interface AlarmInfo {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'WARNING' | 'INDETERMINATE';
  status: string;
  startTime: number;
}

/**
 * Tank State Validator Service
 * 
 * Validates tank state before allowing batch operations.
 * 
 * Checks:
 * - Radar communication status
 * - Telemetry freshness
 * - Active critical alarms
 * - Tank movement detection (basic)
 * 
 * This ensures batch operations are only performed when
 * the tank is in a valid state with reliable data.
 */
@Injectable({
  providedIn: 'root'
})
export class TankStateValidatorService {

  // Maximum age for telemetry to be considered "fresh" (1 minute)
  private readonly MAX_TELEMETRY_AGE_MS = 60000;

  // Threshold for detecting movement (mm/hour)
  private readonly MOVEMENT_THRESHOLD_MM_PER_HOUR = 5;

  // Number of level readings to analyze for movement
  private readonly MOVEMENT_SAMPLE_COUNT = 5;

  constructor(
    private telemetryService: TankTelemetryService,
    private tankAssetService: TankAssetService
  ) {}

  /**
   * Validate tank state for batch creation
   * 
   * @param tankId - Tank asset ID
   * @returns Observable of TankStateValidationResult
   */
  validateTankState(tankId: string): Observable<TankStateValidationResult> {
    console.log('[TankStateValidator] Validating tank state for:', tankId);

    return forkJoin({
      radarStatus: this.checkRadarCommunication(tankId),
      alarms: this.getActiveAlarms(tankId),
      movement: this.detectMovement(tankId)
    }).pipe(
      map(({ radarStatus, alarms, movement }) => {
        const warnings: string[] = [];
        let valid = true;
        let error: string | undefined;

        // Check radar communication
        if (!radarStatus.ok) {
          valid = false;
          error = radarStatus.error || 'Radar communication lost';
        }

        // Check for critical alarms
        const criticalAlarms = alarms.filter(a => a.severity === 'CRITICAL');
        if (criticalAlarms.length > 0) {
          valid = false;
          error = `Critical alarms active: ${criticalAlarms.map(a => a.type).join(', ')}`;
        }

        // Check for major alarms (warning only)
        const majorAlarms = alarms.filter(a => a.severity === 'MAJOR');
        if (majorAlarms.length > 0) {
          warnings.push(`Major alarms active: ${majorAlarms.map(a => a.type).join(', ')}`);
        }

        // Check telemetry age
        if (radarStatus.telemetryAge > this.MAX_TELEMETRY_AGE_MS) {
          warnings.push(`Telemetry is ${Math.round(radarStatus.telemetryAge / 1000)}s old (stale)`);
        }

        // Suggest batch type based on movement
        let suggestedBatchType: 'receiving' | 'dispensing' | null = null;
        if (movement.type === 'receiving') {
          suggestedBatchType = 'receiving';
        } else if (movement.type === 'dispensing') {
          suggestedBatchType = 'dispensing';
        }

        const result: TankStateValidationResult = {
          valid,
          error,
          warnings: warnings.length > 0 ? warnings : undefined,
          tankState: {
            radarOk: radarStatus.ok,
            telemetryAge: radarStatus.telemetryAge,
            lastUpdate: radarStatus.lastUpdate,
            hasActiveAlarms: alarms.length > 0,
            criticalAlarms: criticalAlarms.map(a => a.type),
            movement,
            suggestedBatchType
          }
        };

        console.log('[TankStateValidator] Validation result:', result);
        return result;
      }),
      catchError(error => {
        console.error('[TankStateValidator] Error validating tank state:', error);
        return of({
          valid: false,
          error: `Validation failed: ${error.message}`
        });
      })
    );
  }

  /**
   * Check radar communication status
   * 
   * @param tankId - Tank asset ID
   * @returns Observable with communication status
   */
  checkRadarCommunication(tankId: string): Observable<{
    ok: boolean;
    error?: string;
    telemetryAge: number;
    lastUpdate: number;
  }> {
    return this.telemetryService.getLatestTelemetry('ASSET', tankId, ['level']).pipe(
      map(telemetryData => {
        if (!telemetryData || !telemetryData['level'] || telemetryData['level'].length === 0) {
          return {
            ok: false,
            error: 'No level telemetry available',
            telemetryAge: Infinity,
            lastUpdate: 0
          };
        }

        const lastUpdate = telemetryData['level'][0].ts;
        const telemetryAge = Date.now() - lastUpdate;
        const ok = telemetryAge < this.MAX_TELEMETRY_AGE_MS;

        return {
          ok,
          error: ok ? undefined : 'Telemetry data is stale',
          telemetryAge,
          lastUpdate
        };
      }),
      catchError(error => {
        console.error('[TankStateValidator] Error checking radar communication:', error);
        return of({
          ok: false,
          error: 'Failed to check radar communication',
          telemetryAge: Infinity,
          lastUpdate: 0
        });
      })
    );
  }

  /**
   * Get timestamp of last telemetry update
   * 
   * @param tankId - Tank asset ID
   * @returns Observable of timestamp in milliseconds
   */
  getLastTelemetryTimestamp(tankId: string): Observable<number> {
    return this.telemetryService.getLatestTelemetry('ASSET', tankId, ['level']).pipe(
      map(telemetryData => {
        if (!telemetryData || !telemetryData['level'] || telemetryData['level'].length === 0) {
          return 0;
        }
        return telemetryData['level'][0].ts;
      }),
      catchError(() => of(0))
    );
  }

  /**
   * Get active alarms for tank
   * 
   * NOTE: This is a placeholder implementation.
   * In production, this should query the ThingsBoard Alarm API.
   * 
   * @param tankId - Tank asset ID
   * @returns Observable of active alarms
   */
  getActiveAlarms(tankId: string): Observable<AlarmInfo[]> {
    // TODO: Implement actual alarm query when alarm service is available
    // For now, return empty array
    console.log('[TankStateValidator] Getting active alarms for tank:', tankId);
    return of([]);
  }

  /**
   * Detect tank movement (basic implementation)
   * 
   * Analyzes recent level readings to determine if tank is:
   * - Idle (no significant change)
   * - Receiving (level increasing)
   * - Dispensing (level decreasing)
   * 
   * @param tankId - Tank asset ID
   * @returns Observable of MovementInfo
   */
  detectMovement(tankId: string): Observable<MovementInfo> {
    const endTs = Date.now();
    const startTs = endTs - (this.MOVEMENT_SAMPLE_COUNT * 10 * 1000); // Last 50 seconds (assuming 10s interval)

    return this.telemetryService.getHistoricalTelemetry(
      'ASSET',
      tankId,
      ['level'],
      startTs,
      endTs
    ).pipe(
      map(telemetryData => {
        if (!telemetryData || !telemetryData['level'] || telemetryData['level'].length < 2) {
          // Not enough data
          return {
            type: 'idle' as const,
            rate: 0,
            confidence: 0
          };
        }

        const levels = telemetryData['level']
          .sort((a: any, b: any) => a.ts - b.ts)
          .map((point: any) => ({
            ts: point.ts,
            value: point.value
          }));

        // Calculate rate of change (mm/hour)
        const firstLevel = levels[0];
        const lastLevel = levels[levels.length - 1];
        const timeSpanHours = (lastLevel.ts - firstLevel.ts) / (1000 * 60 * 60);
        const levelChange = lastLevel.value - firstLevel.value;
        const rate = timeSpanHours > 0 ? levelChange / timeSpanHours : 0;

        // Determine movement type
        let type: 'idle' | 'receiving' | 'dispensing' = 'idle';
        let confidence = 0;

        if (Math.abs(rate) >= this.MOVEMENT_THRESHOLD_MM_PER_HOUR) {
          type = rate > 0 ? 'receiving' : 'dispensing';
          
          // Calculate confidence based on consistency of trend
          const consistencyScore = this.calculateTrendConsistency(levels);
          confidence = Math.min(consistencyScore, 1.0);
        }

        const movement: MovementInfo = {
          type,
          rate: Math.abs(rate),
          confidence
        };

        console.log('[TankStateValidator] Movement detected:', movement);
        return movement;
      }),
      catchError(error => {
        console.error('[TankStateValidator] Error detecting movement:', error);
        return of({
          type: 'idle' as const,
          rate: 0,
          confidence: 0
        });
      })
    );
  }

  /**
   * Calculate trend consistency
   * 
   * Returns a score (0-1) indicating how consistent the trend is.
   * Higher score = more consistent trend
   * 
   * @param levels - Array of level readings with timestamps
   * @returns Consistency score (0-1)
   */
  private calculateTrendConsistency(levels: Array<{ ts: number; value: number }>): number {
    if (levels.length < 3) {
      return 0;
    }

    // Calculate differences between consecutive readings
    const diffs: number[] = [];
    for (let i = 1; i < levels.length; i++) {
      diffs.push(levels[i].value - levels[i - 1].value);
    }

    // Check if all diffs have the same sign (all positive or all negative)
    const allPositive = diffs.every(d => d > 0);
    const allNegative = diffs.every(d => d < 0);

    if (allPositive || allNegative) {
      // Calculate coefficient of variation
      const mean = diffs.reduce((sum, d) => sum + Math.abs(d), 0) / diffs.length;
      const variance = diffs.reduce((sum, d) => sum + Math.pow(Math.abs(d) - mean, 2), 0) / diffs.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? stdDev / mean : 0;

      // Lower CV = higher consistency
      // Map CV to confidence score (inverse relationship)
      return Math.max(0, 1 - cv);
    }

    // Mixed signs = low consistency
    return 0.2;
  }

  /**
   * Check if tank is suitable for batch operation
   * 
   * Quick validation method that returns boolean
   * 
   * @param tankId - Tank asset ID
   * @returns Observable of boolean
   */
  isTankReadyForBatch(tankId: string): Observable<boolean> {
    return this.validateTankState(tankId).pipe(
      map(result => result.valid)
    );
  }
}
