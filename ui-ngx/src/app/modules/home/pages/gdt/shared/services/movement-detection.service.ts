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
import { Observable, Subject, interval, BehaviorSubject } from 'rxjs';
import { map, bufferCount, distinctUntilChanged, filter, tap, switchMap, takeUntil } from 'rxjs/operators';
import { TankTelemetryService } from './tank-telemetry.service';

/**
 * Movement Event - Represents a detected movement in tank level
 */
export interface MovementEvent {
  tankId: string;
  timestamp: number;
  type: 'receiving' | 'dispensing' | 'idle';
  rate: number; // mm/hour
  confidence: number; // 0-1
  lastLevel: number;
  currentLevel: number;
  levelChange: number;
  duration: number; // milliseconds
}

/**
 * Batch Suggestion - Recommendation to create a batch
 */
export interface BatchSuggestion {
  suggested: boolean;
  tankId: string;
  batchType: 'receiving' | 'dispensing';
  confidence: number;
  estimatedDuration: number; // milliseconds
  message: string;
  rate: number; // bbl/hour
}

/**
 * Movement Detection Service
 * 
 * Detects tank level movements and suggests batch creation.
 * 
 * Features:
 * - Real-time level monitoring
 * - Movement classification (receiving/dispensing/idle)
 * - Rate of change calculation
 * - Batch creation suggestions
 * - Configurable thresholds
 */
@Injectable({
  providedIn: 'root'
})
export class MovementDetectionService {

  // Configuration
  private readonly IDLE_THRESHOLD = 5; // mm/hour - below this is idle
  private readonly RECEIVING_THRESHOLD = 10; // mm/hour - minimum rate for receiving
  private readonly DISPENSING_THRESHOLD = -10; // mm/hour - maximum rate for dispensing
  private readonly BUFFER_SIZE = 5; // Number of readings to buffer
  private readonly POLL_INTERVAL = 10000; // 10 seconds between readings
  private readonly MIN_CONFIDENCE = 0.6; // Minimum confidence for suggestion

  // Active monitoring
  private activeMonitoring = new Map<string, Subject<void>>();
  private movementSubjects = new Map<string, Subject<MovementEvent>>();
  private lastReadings = new Map<string, number[]>();
  private lastMovementTime = new Map<string, number>();

  constructor(
    private telemetryService: TankTelemetryService
  ) {}

  /**
   * Start monitoring a tank for movement
   * 
   * @param tankId - Tank asset ID
   * @returns Observable of movement events
   */
  startMonitoring(tankId: string): Observable<MovementEvent> {
    console.log('[MovementDetectionService] Starting monitoring for tank:', tankId);

    // Create subject for this tank if not exists
    if (!this.movementSubjects.has(tankId)) {
      this.movementSubjects.set(tankId, new Subject<MovementEvent>());
      this.lastReadings.set(tankId, []);
      this.activeMonitoring.set(tankId, new Subject<void>());

      // Start polling
      this.startPolling(tankId);
    }

    return this.movementSubjects.get(tankId)!.asObservable();
  }

  /**
   * Stop monitoring a tank
   * 
   * @param tankId - Tank asset ID
   */
  stopMonitoring(tankId: string): void {
    console.log('[MovementDetectionService] Stopping monitoring for tank:', tankId);

    const stopSubject = this.activeMonitoring.get(tankId);
    if (stopSubject) {
      stopSubject.next();
      stopSubject.complete();
    }

    this.activeMonitoring.delete(tankId);
    this.movementSubjects.delete(tankId);
    this.lastReadings.delete(tankId);
    this.lastMovementTime.delete(tankId);
  }

  /**
   * Get current movement status for a tank
   * 
   * @param tankId - Tank asset ID
   * @returns Current movement event or null
   */
  getCurrentMovement(tankId: string): MovementEvent | null {
    const readings = this.lastReadings.get(tankId);
    if (!readings || readings.length < 2) {
      return null;
    }

    const currentLevel = readings[readings.length - 1];
    const previousLevel = readings[readings.length - 2];
    const levelChange = currentLevel - previousLevel;
    const rate = this.calculateRate(readings);
    const type = this.classifyMovement(rate);

    if (type === 'idle') {
      return null;
    }

    return {
      tankId,
      timestamp: Date.now(),
      type,
      rate,
      confidence: this.calculateConfidence(readings),
      lastLevel: previousLevel,
      currentLevel,
      levelChange,
      duration: this.POLL_INTERVAL * (readings.length - 1)
    };
  }

  /**
   * Suggest batch creation based on movement
   * 
   * @param movementEvent - Movement event
   * @returns Batch suggestion
   */
  suggestBatchCreation(movementEvent: MovementEvent): BatchSuggestion {
    const confidence = movementEvent.confidence;
    const estimatedDuration = this.estimateDuration(movementEvent.rate);

    return {
      suggested: confidence >= this.MIN_CONFIDENCE,
      tankId: movementEvent.tankId,
      batchType: movementEvent.type === 'receiving' ? 'receiving' : 'dispensing',
      confidence,
      estimatedDuration,
      message: `${movementEvent.type.toUpperCase()} detected at ${Math.abs(movementEvent.rate).toFixed(1)} mm/h. Create batch?`,
      rate: this.convertRateToBarrels(movementEvent.rate)
    };
  }

  /**
   * Private: Start polling for a tank
   */
  private startPolling(tankId: string): void {
    const stopSubject = this.activeMonitoring.get(tankId)!;

    interval(this.POLL_INTERVAL)
      .pipe(
        takeUntil(stopSubject),
        switchMap(() => this.telemetryService.getLatestTelemetry('ASSET', tankId, ['level'])),
        tap(telemetry => {
          const readings = this.lastReadings.get(tankId)!;
          const level = telemetry['level']?.[0]?.[1];

          if (level !== undefined) {
            readings.push(level);

            // Keep only last BUFFER_SIZE readings
            if (readings.length > this.BUFFER_SIZE) {
              readings.shift();
            }

            // Check for movement
            if (readings.length >= 2) {
              const rate = this.calculateRate(readings);
              const type = this.classifyMovement(rate);
              const confidence = this.calculateConfidence(readings);

              if (type !== 'idle' && confidence >= this.MIN_CONFIDENCE) {
                const movementEvent: MovementEvent = {
                  tankId,
                  timestamp: Date.now(),
                  type,
                  rate,
                  confidence,
                  lastLevel: readings[readings.length - 2],
                  currentLevel: readings[readings.length - 1],
                  levelChange: readings[readings.length - 1] - readings[readings.length - 2],
                  duration: this.POLL_INTERVAL * (readings.length - 1)
                };

                // Emit event
                const subject = this.movementSubjects.get(tankId);
                if (subject) {
                  subject.next(movementEvent);
                  this.lastMovementTime.set(tankId, Date.now());
                }
              }
            }
          }
        })
      )
      .subscribe({
        error: (err) => console.error('[MovementDetectionService] Polling error:', err)
      });
  }

  /**
   * Private: Calculate rate of change (mm/hour)
   */
  private calculateRate(readings: number[]): number {
    if (readings.length < 2) {
      return 0;
    }

    const timeSpan = (readings.length - 1) * this.POLL_INTERVAL; // milliseconds
    const levelChange = readings[readings.length - 1] - readings[0]; // mm

    // Convert to mm/hour
    const hours = timeSpan / (1000 * 60 * 60);
    return levelChange / hours;
  }

  /**
   * Private: Classify movement type
   */
  private classifyMovement(rate: number): 'receiving' | 'dispensing' | 'idle' {
    if (Math.abs(rate) < this.IDLE_THRESHOLD) {
      return 'idle';
    }

    return rate > 0 ? 'receiving' : 'dispensing';
  }

  /**
   * Private: Calculate confidence (0-1) based on consistency
   */
  private calculateConfidence(readings: number[]): number {
    if (readings.length < 2) {
      return 0;
    }

    // Calculate variance in readings
    const mean = readings.reduce((a, b) => a + b) / readings.length;
    const variance = readings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / readings.length;
    const stdDev = Math.sqrt(variance);

    // Confidence is inverse of coefficient of variation
    const cv = stdDev / Math.abs(mean);
    const confidence = Math.max(0, 1 - cv);

    return Math.min(1, confidence);
  }

  /**
   * Private: Estimate duration of operation
   */
  private estimateDuration(rate: number): number {
    // Estimate based on typical tank capacity and rate
    // Assuming 50% tank change at current rate
    const typicalCapacity = 10000; // mm equivalent
    const targetChange = typicalCapacity * 0.5;
    const hours = Math.abs(targetChange / rate);

    return hours * 60 * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Private: Convert rate from mm/hour to bbl/hour (approximate)
   */
  private convertRateToBarrels(rateMMPerHour: number): number {
    // Approximate conversion: 1 mm of level ≈ 0.1 bbl
    // This should be calibrated per tank
    return Math.abs(rateMMPerHour) * 0.1;
  }
}
