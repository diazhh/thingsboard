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

import { Component, Inject, OnInit, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { LabBatchAssociation, VarianceAnalysis } from '../../../shared/services/lab-batch-integration.service';
import { BatchService } from '../../../shared/services/batch.service';
import { TankAssetService } from '../../../shared/services/tank-asset.service';

@Component({
  selector: 'tb-lab-variance-notification',
  templateUrl: './lab-variance-notification.component.html',
  styleUrls: ['./lab-variance-notification.component.scss']
})
export class LabVarianceNotificationComponent implements OnInit {

  association: LabBatchAssociation;
  variance: VarianceAnalysis;
  tankName: string = 'Unknown Tank';
  isRecalculating = false;
  showDetails = false;

  constructor(
    private dialogRef: MatDialogRef<LabVarianceNotificationComponent>,
    private batchService: BatchService,
    private tankAssetService: TankAssetService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { association: LabBatchAssociation }
  ) {
    this.association = data.association;
    this.variance = data.association.varianceAnalysis;
  }

  ngOnInit(): void {
    this.loadTankName();
  }

  /**
   * Load tank name
   */
  private loadTankName(): void {
    this.tankAssetService.getTankWithAttributes(this.association.tankId)
      .subscribe({
        next: ({ asset, attributes }) => {
          this.tankName = attributes?.tankTag || asset.name || 'Unknown Tank';
        },
        error: (err) => {
          console.error('Error loading tank name:', err);
          this.tankName = 'Unknown Tank';
        }
      });
  }

  /**
   * Recalculate batch with lab values
   */
  recalculateBatch(): void {
    if (this.isRecalculating) {
      return;
    }

    this.isRecalculating = true;

    // Get the batch to recalculate
    this.batchService.getBatches({
      pageSize: 1,
      pageNumber: 0
    }).subscribe({
      next: (response) => {
        const batch = response.batches?.find(b => b.id === this.association.batchId);
        if (!batch) {
          this.snackBar.open('❌ Batch not found', 'Close', { duration: 3000 });
          this.isRecalculating = false;
          return;
        }

        // Prepare recalculation request with lab values
        const recalculationRequest = {
          batchId: batch.id,
          openingApiGravity: batch.opening?.apiGravity,
          openingTemperature: batch.opening?.temperature,
          openingBsw: batch.opening?.bsw,
          closingApiGravity: this.association.varianceAnalysis.apiGravityDiff > 0
            ? (batch.closing?.apiGravity || 0) + this.association.varianceAnalysis.apiGravityDiff
            : batch.closing?.apiGravity,
          closingTemperature: this.association.varianceAnalysis.temperatureDiff > 0
            ? (batch.closing?.temperature || 0) + this.association.varianceAnalysis.temperatureDiff
            : batch.closing?.temperature,
          closingBsw: this.association.varianceAnalysis.bswDiff > 0
            ? (batch.closing?.bsw || 0) + this.association.varianceAnalysis.bswDiff
            : batch.closing?.bsw,
          reason: `Lab result variance detected. API Gravity: ${this.association.varianceAnalysis.apiGravityDiff.toFixed(2)}°`,
          operator: 'Lab Integration'
        };

        this.batchService.recalculateBatch(recalculationRequest as any).subscribe({
          next: (recalculatedBatch) => {
            this.snackBar.open(`✅ Batch ${recalculatedBatch.batchNumber} recalculated successfully`, 'Close', { duration: 3000 });
            this.dialogRef.close({ action: 'recalculated', batch: recalculatedBatch });
          },
          error: (err) => {
            console.error('Error recalculating batch:', err);
            this.snackBar.open('❌ Error recalculating batch', 'Close', { duration: 3000 });
            this.isRecalculating = false;
          }
        });
      },
      error: (err) => {
        console.error('Error loading batch:', err);
        this.snackBar.open('❌ Error loading batch', 'Close', { duration: 3000 });
        this.isRecalculating = false;
      }
    });
  }

  /**
   * Ignore variance
   */
  ignore(): void {
    this.dialogRef.close({ action: 'ignored' });
  }

  /**
   * Toggle details view
   */
  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  /**
   * Get severity color
   */
  getSeverityColor(): string {
    if (this.variance.percentageDiff > 2) {
      return 'warn';
    } else if (this.variance.percentageDiff > 1) {
      return 'accent';
    }
    return 'primary';
  }

  /**
   * Get severity label
   */
  getSeverityLabel(): string {
    if (this.variance.percentageDiff > 2) {
      return 'CRÍTICA';
    } else if (this.variance.percentageDiff > 1) {
      return 'ALTA';
    }
    return 'MEDIA';
  }

  /**
   * Format number with decimals
   */
  formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }

  /**
   * Math object for template
   */
  Math = Math;
}

/**
 * Module for LabVarianceNotificationComponent
 * Provides all necessary Material and Angular modules
 */
@NgModule({
  declarations: [LabVarianceNotificationComponent],
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule
  ]
})
export class LabVarianceNotificationModule { }
