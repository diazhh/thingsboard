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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BatchSuggestion, MovementEvent } from '../../../shared/services/movement-detection.service';
import { BatchService } from '../../../shared/services/batch.service';
import { TankAssetService } from '../../../shared/services/tank-asset.service';

@Component({
  selector: 'tb-batch-suggestion-notification',
  templateUrl: './batch-suggestion-notification.component.html',
  styleUrls: ['./batch-suggestion-notification.component.scss']
})
export class BatchSuggestionNotificationComponent implements OnInit {

  suggestion: BatchSuggestion;
  movementEvent: MovementEvent;
  tankName: string = 'Unknown Tank';
  isCreatingBatch = false;
  estimatedDurationMinutes: number;

  constructor(
    private dialogRef: MatDialogRef<BatchSuggestionNotificationComponent>,
    private batchService: BatchService,
    private tankAssetService: TankAssetService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { suggestion: BatchSuggestion; movementEvent: MovementEvent }
  ) {
    this.suggestion = data.suggestion;
    this.movementEvent = data.movementEvent;
    this.estimatedDurationMinutes = Math.round(this.suggestion.estimatedDuration / (60 * 1000));
  }

  ngOnInit(): void {
    this.loadTankName();
  }

  /**
   * Load tank name
   */
  private loadTankName(): void {
    this.tankAssetService.getTankWithAttributes(this.suggestion.tankId)
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
   * Create batch for this movement
   */
  createBatch(): void {
    if (this.isCreatingBatch) {
      return;
    }

    this.isCreatingBatch = true;

    // Create batch with automatic gauge capture
    // The batch service will automatically capture level and temperature from telemetry
    const batchRequest = {
      tankId: this.suggestion.tankId,
      batchType: this.suggestion.batchType,
      notes: `Auto-created from movement detection. Rate: ${this.movementEvent.rate.toFixed(2)} mm/h`
    };

    this.batchService.createBatch(batchRequest as any).subscribe({
      next: (batch) => {
        this.snackBar.open(`✅ Batch ${batch.batchNumber} created successfully`, 'Close', { duration: 3000 });
        this.dialogRef.close({ action: 'created', batch });
      },
      error: (err) => {
        console.error('Error creating batch:', err);
        this.snackBar.open('❌ Error creating batch', 'Close', { duration: 3000 });
        this.isCreatingBatch = false;
      }
    });
  }

  /**
   * Dismiss suggestion
   */
  dismiss(): void {
    this.dialogRef.close({ action: 'dismissed' });
  }

  /**
   * Remind later
   */
  remindLater(): void {
    this.dialogRef.close({ action: 'remind_later' });
  }

  /**
   * Get icon for batch type
   */
  getIcon(): string {
    return this.suggestion.batchType === 'receiving' ? 'arrow_downward' : 'arrow_upward';
  }

  /**
   * Get color for batch type
   */
  getColor(): string {
    return this.suggestion.batchType === 'receiving' ? 'primary' : 'accent';
  }

  /**
   * Get confidence percentage
   */
  getConfidencePercentage(): number {
    return Math.round(this.suggestion.confidence * 100);
  }
}

/**
 * Module for BatchSuggestionNotificationComponent
 * Provides all necessary Material and Angular modules
 */
@NgModule({
  declarations: [BatchSuggestionNotificationComponent],
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ]
})
export class BatchSuggestionNotificationModule { }
