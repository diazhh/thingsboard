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
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Batch } from '../models/batch.model';
import { BatchService } from './batch.service';

/**
 * Lab Result - Result from laboratory analysis
 */
export interface LabResult {
  id: string;
  tankId: string;
  timestamp: number;
  apiGravity: number;
  temperature: number;
  bsw: number;
  density?: number;
  viscosity?: number;
  notes?: string;
  operator?: string;
}

/**
 * Variance Analysis - Analysis of differences between batch and lab result
 */
export interface VarianceAnalysis {
  hasVariance: boolean;
  isSignificant: boolean;
  apiGravityDiff: number;
  temperatureDiff: number;
  bswDiff: number;
  percentageDiff: number;
  reason: string;
  recommendation: string;
}

/**
 * Recalculation Suggestion - Suggestion to recalculate batch based on lab result
 */
export interface RecalculationSuggestion {
  suggested: boolean;
  batchId: string;
  tankId: string;
  reason: string;
  estimatedImpact: number; // in barrels
  confidence: number; // 0-1
  message: string;
}

/**
 * Lab-Batch Association - Link between lab result and batch
 */
export interface LabBatchAssociation {
  id: string;
  labResultId: string;
  batchId: string;
  tankId: string;
  associatedAt: number;
  varianceAnalysis: VarianceAnalysis;
  recalculationSuggestion: RecalculationSuggestion;
  status: 'pending' | 'approved' | 'rejected' | 'recalculated';
}

/**
 * Lab Batch Integration Service
 *
 * Integrates laboratory results with batch management.
 *
 * Features:
 * - Associate lab results with batches
 * - Detect variance between batch and lab
 * - Suggest recalculation if variance is significant
 * - Track associations and decisions
 */
@Injectable({
  providedIn: 'root'
})
export class LabBatchIntegrationService {

  // Configuration
  private readonly API_GRAVITY_THRESHOLD = 0.1; // ±0.1° is significant
  private readonly TEMPERATURE_THRESHOLD = 2; // ±2°C is significant
  private readonly BSW_THRESHOLD = 0.5; // ±0.5% is significant
  private readonly PERCENTAGE_THRESHOLD = 0.5; // 0.5% overall change

  // Associations storage
  private associations = new Map<string, LabBatchAssociation>();
  private associationsSubject = new Subject<LabBatchAssociation>();

  constructor(
    private batchService: BatchService
  ) {}

  /**
   * Associate lab result with batch
   *
   * @param labResult - Lab result to associate
   * @returns Observable of association
   */
  associateLabResultWithBatch(labResult: LabResult): Observable<LabBatchAssociation> {
    console.log('[LabBatchIntegrationService] Associating lab result:', labResult);

    return this.batchService.getBatches({
      tankId: labResult.tankId,
      status: 'closed',
      pageSize: 100,
      pageNumber: 0
    }).pipe(
      map(response => {
        // Find the most recent closed batch for this tank
        // Accept both 'closed' and 'recalculated' statuses
        const batches = response.batches || [];
        const relevantBatch = batches.find(b => 
          b.tankId === labResult.tankId && 
          (b.status === 'closed' || b.status === 'recalculated') &&
          b.closing?.timestamp <= labResult.timestamp
        );

        if (!relevantBatch) {
          throw new Error(`No closed batch found for tank ${labResult.tankId}`);
        }

        // Check if this lab result was already associated and rejected
        // If so, don't create a duplicate association
        const existingRejected = Array.from(this.associations.values()).find(a =>
          a.labResultId === labResult.id &&
          a.batchId === relevantBatch.id &&
          a.status === 'rejected'
        );

        if (existingRejected) {
          throw new Error(`Lab result already rejected for this batch`);
        }

        // Analyze variance
        const varianceAnalysis = this.analyzeVariance(relevantBatch, labResult);

        // Generate suggestion
        const suggestion = this.generateRecalculationSuggestion(
          relevantBatch,
          labResult,
          varianceAnalysis
        );

        // Create association
        const association: LabBatchAssociation = {
          id: `assoc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          labResultId: labResult.id,
          batchId: relevantBatch.id,
          tankId: labResult.tankId,
          associatedAt: Date.now(),
          varianceAnalysis,
          recalculationSuggestion: suggestion,
          status: 'pending'
        };

        // Store association
        this.associations.set(association.id, association);
        this.associationsSubject.next(association);

        console.log('[LabBatchIntegrationService] Association created:', association);
        return association;
      })
    );
  }

  /**
   * Detect variance between batch and lab result
   *
   * @param batch - Batch to compare
   * @param labResult - Lab result to compare
   * @returns Variance analysis
   */
  private analyzeVariance(batch: Batch, labResult: LabResult): VarianceAnalysis {
    const batchClosing = batch.closing;

    if (!batchClosing) {
      return {
        hasVariance: false,
        isSignificant: false,
        apiGravityDiff: 0,
        temperatureDiff: 0,
        bswDiff: 0,
        percentageDiff: 0,
        reason: 'No closing measurement available',
        recommendation: 'Cannot compare without closing measurement'
      };
    }

    // Calculate differences
    const apiGravityDiff = labResult.apiGravity - (batchClosing.apiGravity || 0);
    const temperatureDiff = labResult.temperature - (batchClosing.temperature || 0);
    const bswDiff = labResult.bsw - (batchClosing.bsw || 0);

    // Calculate percentage difference
    const baseValue = batchClosing.apiGravity || 1;
    const percentageDiff = Math.abs(apiGravityDiff / baseValue) * 100;

    // Determine if variance is significant
    const isSignificant = 
      Math.abs(apiGravityDiff) >= this.API_GRAVITY_THRESHOLD ||
      Math.abs(temperatureDiff) >= this.TEMPERATURE_THRESHOLD ||
      Math.abs(bswDiff) >= this.BSW_THRESHOLD ||
      percentageDiff >= this.PERCENTAGE_THRESHOLD;

    // Generate reason and recommendation
    const reasons: string[] = [];
    if (Math.abs(apiGravityDiff) >= this.API_GRAVITY_THRESHOLD) {
      reasons.push(`API Gravity difference: ${apiGravityDiff.toFixed(2)}°`);
    }
    if (Math.abs(temperatureDiff) >= this.TEMPERATURE_THRESHOLD) {
      reasons.push(`Temperature difference: ${temperatureDiff.toFixed(1)}°C`);
    }
    if (Math.abs(bswDiff) >= this.BSW_THRESHOLD) {
      reasons.push(`BS&W difference: ${bswDiff.toFixed(2)}%`);
    }

    const reason = reasons.length > 0 
      ? reasons.join(', ')
      : 'Variance detected but below threshold';

    const recommendation = isSignificant
      ? 'Recalculation recommended to ensure accuracy'
      : 'Variance is within acceptable range';

    return {
      hasVariance: Math.abs(apiGravityDiff) > 0 || Math.abs(temperatureDiff) > 0 || Math.abs(bswDiff) > 0,
      isSignificant,
      apiGravityDiff,
      temperatureDiff,
      bswDiff,
      percentageDiff,
      reason,
      recommendation
    };
  }

  /**
   * Generate recalculation suggestion based on variance
   *
   * @param batch - Batch to recalculate
   * @param labResult - Lab result with new values
   * @param variance - Variance analysis
   * @returns Recalculation suggestion
   */
  private generateRecalculationSuggestion(
    batch: Batch,
    labResult: LabResult,
    variance: VarianceAnalysis
  ): RecalculationSuggestion {
    const confidence = Math.min(1, Math.abs(variance.percentageDiff) / 2); // Confidence based on percentage diff

    // Estimate impact in barrels
    // Simplified calculation: 1% API gravity change ≈ 10 barrels per 1000 barrel tank
    const estimatedImpact = (variance.percentageDiff / 100) * (batch.closing?.gsv || 1000) * 0.01;

    const message = variance.isSignificant
      ? `Lab result shows significant variance. ${variance.reason}. Recalculation recommended.`
      : `Lab result received. ${variance.reason}. Variance within acceptable range.`;

    return {
      suggested: variance.isSignificant,
      batchId: batch.id,
      tankId: batch.tankId,
      reason: variance.reason,
      estimatedImpact: Math.abs(estimatedImpact),
      confidence,
      message
    };
  }

  /**
   * Get association by ID
   *
   * @param associationId - Association ID
   * @returns Association or undefined
   */
  getAssociation(associationId: string): LabBatchAssociation | undefined {
    return this.associations.get(associationId);
  }

  /**
   * Get all associations for a batch
   *
   * @param batchId - Batch ID
   * @returns Array of associations
   */
  getAssociationsForBatch(batchId: string): LabBatchAssociation[] {
    return Array.from(this.associations.values()).filter(a => a.batchId === batchId);
  }

  /**
   * Get all associations for a tank
   *
   * @param tankId - Tank ID
   * @returns Array of associations
   */
  getAssociationsForTank(tankId: string): LabBatchAssociation[] {
    return Array.from(this.associations.values()).filter(a => a.tankId === tankId);
  }

  /**
   * Update association status
   *
   * @param associationId - Association ID
   * @param status - New status
   */
  updateAssociationStatus(
    associationId: string,
    status: 'pending' | 'approved' | 'rejected' | 'recalculated'
  ): void {
    const association = this.associations.get(associationId);
    if (association) {
      association.status = status;
      this.associationsSubject.next(association);
      console.log('[LabBatchIntegrationService] Association status updated:', associationId, status);
    }
  }

  /**
   * Get associations observable
   *
   * @returns Observable of associations
   */
  getAssociationsObservable(): Observable<LabBatchAssociation> {
    return this.associationsSubject.asObservable();
  }

  /**
   * Get pending associations
   *
   * @returns Array of pending associations
   */
  getPendingAssociations(): LabBatchAssociation[] {
    return Array.from(this.associations.values()).filter(a => a.status === 'pending');
  }

  /**
   * Clear all associations (for testing)
   */
  clearAssociations(): void {
    this.associations.clear();
    console.log('[LabBatchIntegrationService] All associations cleared');
  }
}
