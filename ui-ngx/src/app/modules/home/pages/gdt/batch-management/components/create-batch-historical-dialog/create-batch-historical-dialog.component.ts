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

import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HistoricalTelemetryService, AvailabilityResult, PeriodSummary } from '../../../shared/services/historical-telemetry.service';
import { BatchService } from '../../../shared/services/batch.service';
import { TankAssetService } from '../../../shared/services/tank-asset.service';

export interface CreateBatchHistoricalDialogData {
  tankId?: string;
  tankName?: string;
}

@Component({
  selector: 'app-create-batch-historical-dialog',
  templateUrl: './create-batch-historical-dialog.component.html',
  styleUrls: ['./create-batch-historical-dialog.component.scss']
})
export class CreateBatchHistoricalDialogComponent implements OnInit, OnDestroy {

  form: FormGroup;
  tanks: any[] = [];
  
  // State management
  isLoadingTanks = false;
  isCheckingAvailability = false;
  isCreatingBatch = false;
  
  // Results
  availabilityResult: AvailabilityResult | null = null;
  periodSummary: PeriodSummary | null = null;
  
  // UI state
  showPreview = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateBatchHistoricalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateBatchHistoricalDialogData,
    private historicalTelemetryService: HistoricalTelemetryService,
    private batchService: BatchService,
    private tankAssetService: TankAssetService
  ) {
    this.form = this.fb.group({
      tankId: [data?.tankId || '', Validators.required],
      startDate: ['', Validators.required],
      startTime: ['08:00', Validators.required],
      endDate: ['', Validators.required],
      endTime: ['10:00', Validators.required],
      batchType: ['dispensing', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadTanks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load available tanks
   */
  loadTanks(): void {
    this.isLoadingTanks = true;
    this.tankAssetService.getAllTanksWithAttributes('Tank')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tanks) => {
          // Keep full tank data with attributes for later use
          this.tanks = tanks;
          this.isLoadingTanks = false;
          
          // Pre-select tank if provided
          if (this.data?.tankId) {
            this.form.patchValue({ tankId: this.data.tankId });
          }
        },
        error: (error) => {
          console.error('Error loading tanks:', error);
          this.errorMessage = 'Error loading tanks';
          this.isLoadingTanks = false;
        }
      });
  }

  /**
   * Check data availability for the selected time range
   */
  checkAvailability(): void {
    if (!this.form.valid) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.isCheckingAvailability = true;
    this.errorMessage = null;
    this.availabilityResult = null;
    this.periodSummary = null;

    const tankId = this.form.get('tankId')?.value;
    const startTime = this.getTimestampFromForm('start');
    const endTime = this.getTimestampFromForm('end');

    if (startTime >= endTime) {
      this.errorMessage = 'Start time must be before end time';
      this.isCheckingAvailability = false;
      return;
    }

    console.log('[CreateBatchHistoricalDialog] Checking availability:', {
      tankId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    });

    // Check availability and get period summary in parallel
    Promise.all([
      this.historicalTelemetryService.checkDataAvailability(tankId, startTime, endTime).toPromise(),
      this.historicalTelemetryService.getPeriodSummary(tankId, startTime, endTime).toPromise()
    ])
      .then(([availability, summary]) => {
        this.availabilityResult = availability;
        this.periodSummary = summary;
        this.showPreview = true;

        if (!availability?.available) {
          this.errorMessage = availability?.message || 'Data not available for this time range';
        } else {
          this.successMessage = 'Data available! You can create the batch.';
        }

        this.isCheckingAvailability = false;
      })
      .catch((error) => {
        console.error('Error checking availability:', error);
        this.errorMessage = `Error checking data availability: ${error.message}`;
        this.isCheckingAvailability = false;
      });
  }

  /**
   * Create historical batch
   */
  createBatch(): void {
    if (!this.form.valid || !this.availabilityResult?.available) {
      this.errorMessage = 'Cannot create batch: data not available or form invalid';
      return;
    }

    this.isCreatingBatch = true;
    this.errorMessage = null;

    const tankId = this.form.get('tankId')?.value;
    const startTime = this.getTimestampFromForm('start');
    const endTime = this.getTimestampFromForm('end');
    const batchType = this.form.get('batchType')?.value;
    const notes = this.form.get('notes')?.value;

    console.log('[CreateBatchHistoricalDialog] Creating historical batch:', {
      tankId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      batchType,
      notes
    });

    // Get temperature data from historical telemetry
    Promise.all([
      this.historicalTelemetryService.getTelemetryAtTimestamp(tankId, startTime, ['temperature']).toPromise(),
      this.historicalTelemetryService.getTelemetryAtTimestamp(tankId, endTime, ['temperature']).toPromise()
    ])
      .then(([startTempData, endTempData]) => {
        // Extract temperature values (already averaged from temperature_19 to temperature_24)
        const startTemperature = startTempData?.temperature?.value || 25;
        const endTemperature = endTempData?.temperature?.value || 25;

        console.log('[CreateBatchHistoricalDialog] Temperature data:', {
          startTemperature,
          endTemperature
        });

        // Call batch service to create historical batch with temperature data
        const tankName = this.getTankName(tankId);
        this.batchService.createBatchFromDateRange({
          tankId,
          tankName,
          startTime,
          endTime,
          batchType,
          notes,
          startTemperature,
          endTemperature
        })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (batch) => {
              console.log('[CreateBatchHistoricalDialog] Batch created successfully:', batch);
              this.successMessage = `Historical batch ${batch.batchNumber} created successfully!`;
              this.isCreatingBatch = false;
              
              // Close dialog after a short delay
              setTimeout(() => {
                this.dialogRef.close(batch);
              }, 1500);
            },
            error: (error) => {
              console.error('[CreateBatchHistoricalDialog] Error creating batch:', error);
              this.errorMessage = `Error creating batch: ${error.message}`;
              this.isCreatingBatch = false;
            }
          });
      })
      .catch((error) => {
        console.error('[CreateBatchHistoricalDialog] Error getting temperature data:', error);
        this.errorMessage = `Error getting temperature data: ${error.message}`;
        this.isCreatingBatch = false;
      });
  }

  /**
   * Get timestamp from form date and time fields
   */
  private getTimestampFromForm(type: 'start' | 'end'): number {
    const dateKey = `${type}Date`;
    const timeKey = `${type}Time`;
    
    const dateStr = this.form.get(dateKey)?.value;
    const timeStr = this.form.get(timeKey)?.value;

    if (!dateStr || !timeStr) {
      throw new Error(`Missing ${type} date or time`);
    }

    // Parse date (format: YYYY-MM-DD)
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Parse time (format: HH:mm)
    const [hours, minutes] = timeStr.split(':').map(Number);

    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return date.getTime();
  }

  /**
   * Get tank name by ID (using tankTag if available, otherwise asset name)
   */
  getTankName(tankId: string): string {
    const tankData = this.tanks.find(t => t.asset.id.id === tankId);
    if (tankData) {
      return tankData.attributes?.tankTag || tankData.asset.name || tankId;
    }
    return tankId;
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(ts: number | undefined): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format number with decimals
   */
  formatNumber(value: number | undefined, decimals: number = 2): string {
    if (value === undefined || value === null) return '-';
    const numValue = Number(value);
    if (isNaN(numValue)) return '-';
    return numValue.toFixed(decimals);
  }

  /**
   * Get batch type label
   */
  getBatchTypeLabel(type: string): string {
    return type === 'receiving' ? 'Recepción' : 'Despacho';
  }

  /**
   * Close dialog
   */
  cancel(): void {
    this.dialogRef.close();
  }
}
