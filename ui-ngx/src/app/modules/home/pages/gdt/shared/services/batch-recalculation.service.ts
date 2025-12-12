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
import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { Batch, GaugeReading } from '../models/batch.model';
import { BatchService } from './batch.service';

/**
 * Recalculation result for comparison
 */
export interface RecalculationResult {
  originalBatch: Batch;
  recalculatedBatch: Batch;
  differences: {
    openingNsv?: number;
    closingNsv?: number;
    transferredNsv?: number;
    transferredMass?: number;
    percentageChange?: number;
  };
  requiresApproval: boolean;
  approvalReason?: string;
}

/**
 * Recalculation history entry
 */
export interface RecalculationHistory {
  id: string;
  batchId: string;
  batchNumber: string;
  recalculatedAt: number;
  recalculatedBy: string;
  reason: string;
  originalValues: {
    openingTemperature?: number;
    openingApiGravity?: number;
    openingBsw?: number;
    closingTemperature?: number;
    closingApiGravity?: number;
    closingBsw?: number;
  };
  newValues: {
    openingTemperature?: number;
    openingApiGravity?: number;
    openingBsw?: number;
    closingTemperature?: number;
    closingApiGravity?: number;
    closingBsw?: number;
  };
  differences: {
    transferredNsv?: number;
    transferredMass?: number;
    percentageChange?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BatchRecalculationService {

  // Store recalculation history in memory (in production, use backend)
  private recalculationHistory: Map<string, RecalculationHistory[]> = new Map();

  constructor(
    private batchService: BatchService
  ) {}

  /**
   * Recalculate batch with new parameters
   */
  recalculateBatch(params: {
    batchId?: string;
    batch?: Batch;
    reason: string;
    updatedValues: {
      openingTemperature?: number;
      openingApiGravity?: number;
      openingBsw?: number;
      closingTemperature?: number;
      closingApiGravity?: number;
      closingBsw?: number;
    };
    recalculatedBy: string;
  }): Observable<RecalculationResult> {
    console.log('[BatchRecalculationService] Recalculating batch:', params);

    // If batch is provided directly, use it; otherwise fetch it
    if (params.batch) {
      return this.performRecalculation(params.batch, params);
    } else if (params.batchId) {
      return this.batchService.getBatchById(params.batchId).pipe(
        switchMap(originalBatch => {
          if (!originalBatch) {
            throw new Error(`Batch ${params.batchId} not found`);
          }
          return this.performRecalculation(originalBatch, params);
        }),
        catchError(error => {
          console.error('[BatchRecalculationService] Error recalculating batch:', error);
          throw error;
        })
      );
    } else {
      return throwError(() => new Error('Either batch or batchId must be provided'));
    }
  }

  /**
   * Perform the actual recalculation
   */
  private performRecalculation(
    originalBatch: Batch,
    params: any
  ): Observable<RecalculationResult> {
    // Create a copy of the batch with updated values
    const recalculatedBatch = this.createRecalculatedBatch(
      originalBatch,
      params.updatedValues
    );

    // Calculate differences
    const differences = this.calculateDifferences(originalBatch, recalculatedBatch);

    // Determine if approval is required
    const { requiresApproval, approvalReason } = this.determineApprovalRequired(differences);

    console.log('[BatchRecalculationService] Recalculation result:', {
      differences,
      requiresApproval,
      approvalReason
    });

    // Store in history
    this.addToHistory(originalBatch.id, {
      originalBatch,
      recalculatedBatch,
      reason: params.reason,
      recalculatedBy: params.recalculatedBy,
      originalValues: {
        openingTemperature: originalBatch.opening?.temperature,
        openingApiGravity: originalBatch.opening?.apiGravity,
        openingBsw: originalBatch.opening?.bsw,
        closingTemperature: originalBatch.closing?.temperature,
        closingApiGravity: originalBatch.closing?.apiGravity,
        closingBsw: originalBatch.closing?.bsw
      },
      newValues: params.updatedValues
    });

    const result: RecalculationResult = {
      originalBatch,
      recalculatedBatch,
      differences,
      requiresApproval,
      approvalReason
    };

    // Update batch in service if no approval required
    if (!result.requiresApproval) {
      // Note: In production, use saveBatchToTank or similar method
      console.log('[BatchRecalculationService] Batch updated (no approval required)');
    }

    return of(result);
  }

  /**
   * Get recalculation history for a batch
   */
  getRecalculationHistory(batchId: string): Observable<RecalculationHistory[]> {
    const history = this.recalculationHistory.get(batchId) || [];
    console.log('[BatchRecalculationService] Recalculation history for batch:', {
      batchId,
      count: history.length
    });
    return of(history);
  }

  /**
   * Approve recalculation and update batch
   */
  approveRecalculation(
    batchId: string,
    recalculatedBatch: Batch,
    approvedBy: string
  ): Observable<Batch> {
    console.log('[BatchRecalculationService] Approving recalculation:', {
      batchId,
      approvedBy
    });

    // Add approval metadata
    recalculatedBatch.recalculatedAt = Date.now();
    recalculatedBatch.recalculatedBy = approvedBy;
    recalculatedBatch.status = 'recalculated';

    // In production, use saveBatchToTank or similar method from BatchService
    // For now, just return the updated batch
    return of(recalculatedBatch).pipe(
      tap(() => {
        console.log('[BatchRecalculationService] Recalculation approved and batch updated');
      })
    );
  }

  /**
   * Reject recalculation (keep original batch)
   */
  rejectRecalculation(batchId: string, rejectionReason: string): Observable<void> {
    console.log('[BatchRecalculationService] Rejecting recalculation:', {
      batchId,
      rejectionReason
    });

    // In production, log this rejection in audit trail
    return of(void 0).pipe(
      tap(() => {
        console.log('[BatchRecalculationService] Recalculation rejected');
      })
    );
  }

  /**
   * Private helper methods
   */

  /**
   * Create recalculated batch with updated values
   */
  private createRecalculatedBatch(
    originalBatch: Batch,
    updatedValues: any
  ): Batch {
    const recalculated = JSON.parse(JSON.stringify(originalBatch)); // Deep copy

    // Update opening gauge
    if (originalBatch.opening) {
      const updatedOpening: GaugeReading = {
        ...originalBatch.opening,
        temperature: updatedValues.openingTemperature ?? originalBatch.opening.temperature,
        apiGravity: updatedValues.openingApiGravity ?? originalBatch.opening.apiGravity,
        bsw: updatedValues.openingBsw ?? originalBatch.opening.bsw
      };

      // Recalculate volume and mass for opening
      updatedOpening.nsv = this.calculateNSV(updatedOpening.level);
      updatedOpening.mass = this.calculateMass(updatedOpening.nsv, updatedOpening.apiGravity);

      recalculated.opening = updatedOpening;
    }

    // Update closing gauge
    if (originalBatch.closing) {
      const updatedClosing: GaugeReading = {
        ...originalBatch.closing,
        temperature: updatedValues.closingTemperature ?? originalBatch.closing.temperature,
        apiGravity: updatedValues.closingApiGravity ?? originalBatch.closing.apiGravity,
        bsw: updatedValues.closingBsw ?? originalBatch.closing.bsw
      };

      // Recalculate volume and mass for closing
      updatedClosing.nsv = this.calculateNSV(updatedClosing.level);
      updatedClosing.mass = this.calculateMass(updatedClosing.nsv, updatedClosing.apiGravity);

      recalculated.closing = updatedClosing;
    }

    // Recalculate transferred values
    if (recalculated.opening && recalculated.closing) {
      recalculated.transferredNSV = Math.abs(
        recalculated.opening.nsv - recalculated.closing.nsv
      );
      recalculated.transferredMass = Math.abs(
        recalculated.opening.mass - recalculated.closing.mass
      );
    }

    return recalculated;
  }

  /**
   * Calculate NSV from level
   * NSV = level (mm) × 0.098 (conversion factor for standard tank)
   */
  private calculateNSV(level: number): number {
    return level * 0.098;
  }

  /**
   * Calculate mass from NSV and API gravity
   * Mass = NSV × density
   * Density (kg/L) = 141.5 / (API + 131.5)
   * Density (kg/bbl) = density (kg/L) × 159 L/bbl
   */
  private calculateMass(nsv: number, apiGravity: number): number {
    const densityKgL = 141.5 / (apiGravity + 131.5);
    const densityKgBbl = densityKgL * 159;
    return nsv * densityKgBbl;
  }

  /**
   * Calculate differences between original and recalculated batch
   */
  private calculateDifferences(
    originalBatch: Batch,
    recalculatedBatch: Batch
  ): RecalculationResult['differences'] {
    const differences: RecalculationResult['differences'] = {};

    if (originalBatch.opening && recalculatedBatch.opening) {
      differences.openingNsv = recalculatedBatch.opening.nsv - originalBatch.opening.nsv;
    }

    if (originalBatch.closing && recalculatedBatch.closing) {
      differences.closingNsv = recalculatedBatch.closing.nsv - originalBatch.closing.nsv;
    }

    if (originalBatch.transferredNSV && recalculatedBatch.transferredNSV) {
      differences.transferredNsv = recalculatedBatch.transferredNSV - originalBatch.transferredNSV;
      differences.percentageChange = (differences.transferredNsv / originalBatch.transferredNSV) * 100;
    }

    if (originalBatch.transferredMass && recalculatedBatch.transferredMass) {
      differences.transferredMass = recalculatedBatch.transferredMass - originalBatch.transferredMass;
    }

    return differences;
  }

  /**
   * Determine if recalculation requires approval
   */
  private determineApprovalRequired(
    differences: RecalculationResult['differences']
  ): { requiresApproval: boolean; approvalReason?: string } {
    // Require approval if percentage change > 0.5%
    if (differences.percentageChange && Math.abs(differences.percentageChange) > 0.5) {
      return {
        requiresApproval: true,
        approvalReason: `Significant change detected: ${differences.percentageChange?.toFixed(2)}% difference in transferred volume`
      };
    }

    // Require approval if transferred mass change > 100 kg
    if (differences.transferredMass && Math.abs(differences.transferredMass) > 100) {
      return {
        requiresApproval: true,
        approvalReason: `Significant mass change detected: ${differences.transferredMass?.toFixed(0)} kg difference`
      };
    }

    return { requiresApproval: false };
  }

  /**
   * Add recalculation to history
   */
  private addToHistory(
    batchId: string,
    data: {
      originalBatch: Batch;
      recalculatedBatch: Batch;
      reason: string;
      recalculatedBy: string;
      originalValues: any;
      newValues: any;
    }
  ): void {
    const differences = this.calculateDifferences(data.originalBatch, data.recalculatedBatch);

    const historyEntry: RecalculationHistory = {
      id: `recalc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      batchId: data.originalBatch.id,
      batchNumber: data.originalBatch.batchNumber,
      recalculatedAt: Date.now(),
      recalculatedBy: data.recalculatedBy,
      reason: data.reason,
      originalValues: data.originalValues,
      newValues: data.newValues,
      differences
    };

    if (!this.recalculationHistory.has(batchId)) {
      this.recalculationHistory.set(batchId, []);
    }

    this.recalculationHistory.get(batchId)!.push(historyEntry);

    console.log('[BatchRecalculationService] Added to history:', historyEntry);
  }
}
