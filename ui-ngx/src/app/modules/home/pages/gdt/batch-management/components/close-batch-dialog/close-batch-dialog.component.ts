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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Batch, CloseBatchRequest } from '../../../shared/models/batch.model';
import { BatchGaugeCaptureService, GaugeSnapshot } from '../../../shared/services/batch-gauge-capture.service';

@Component({
  selector: 'tb-close-batch-dialog',
  templateUrl: './close-batch-dialog.component.html',
  styleUrls: ['./close-batch-dialog.component.scss']
})
export class CloseBatchDialogComponent implements OnInit, OnDestroy {

  closeBatchForm: FormGroup;
  batch: Batch;
  loading = false;
  capturingGauge = false;
  captureError: string | null = null;
  
  // Automatic capture mode
  useAutomaticCapture = true;
  gaugeSnapshot: GaugeSnapshot | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CloseBatchDialogComponent>,
    private gaugeCaptureService: BatchGaugeCaptureService,
    @Inject(MAT_DIALOG_DATA) public data: { batch: Batch }
  ) {
    this.batch = data.batch;
  }

  ngOnInit() {
    this.closeBatchForm = this.fb.group({
      // Closing gauge data
      closingLevel: [{ value: '', disabled: true }],
      closingTemperature: [{ value: '', disabled: true }],
      closingApiGravity: [{ value: '', disabled: true }],
      closingBsw: [{ value: 0, disabled: true }],
      
      // Additional info
      operator: [''],
      notes: ['']
    });
    
    // Auto-capture closing gauge when dialog opens
    if (this.batch?.tankId) {
      this.captureClosingGauge(this.batch.tankId);
    }
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Capture closing gauge reading from telemetry
   */
  captureClosingGauge(tankId: string) {
    const operator = this.closeBatchForm.get('operator')?.value || undefined;
    
    this.capturingGauge = true;
    this.captureError = null;
    this.gaugeSnapshot = null;
    
    this.gaugeCaptureService.captureCurrentGauge(tankId, operator)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshot) => {
          this.gaugeSnapshot = snapshot;
          this.capturingGauge = false;
          this.captureError = null;
          
          // Auto-fill form with captured data
          this.closeBatchForm.patchValue({
            closingLevel: snapshot.level,
            closingTemperature: snapshot.temperature,
            closingApiGravity: snapshot.apiGravity,
            closingBsw: snapshot.bsw
          });
          
          console.log('Closing gauge captured successfully:', snapshot);
        },
        error: (err) => {
          console.error('Error capturing closing gauge:', err);
          this.capturingGauge = false;
          this.captureError = err?.message || 'Error al capturar el gauge automáticamente';
          console.warn('Capture error:', this.captureError);
        }
      });
  }

  /**
   * Toggle between automatic and manual capture
   */
  toggleCaptureMode() {
    this.useAutomaticCapture = !this.useAutomaticCapture;
    
    if (this.useAutomaticCapture) {
      // Disable manual fields
      this.closeBatchForm.get('closingLevel')?.disable();
      this.closeBatchForm.get('closingTemperature')?.disable();
      this.closeBatchForm.get('closingApiGravity')?.disable();
      this.closeBatchForm.get('closingBsw')?.disable();
      
      // Re-capture if tank is available
      if (this.batch?.tankId) {
        this.captureClosingGauge(this.batch.tankId);
      }
    } else {
      // Enable manual fields
      this.closeBatchForm.get('closingLevel')?.enable();
      this.closeBatchForm.get('closingTemperature')?.enable();
      this.closeBatchForm.get('closingApiGravity')?.enable();
      this.closeBatchForm.get('closingBsw')?.enable();
      
      // Clear automatic data
      this.gaugeSnapshot = null;
      this.captureError = null;
    }
  }

  /**
   * Check if form is ready to submit
   */
  canSubmit(): boolean {
    if (this.useAutomaticCapture) {
      // For automatic capture: need valid gauge snapshot and not capturing
      return this.gaugeSnapshot !== null && !this.capturingGauge;
    } else {
      // For manual: need all fields filled
      return this.closeBatchForm.get('closingLevel')?.valid === true &&
             this.closeBatchForm.get('closingTemperature')?.valid === true &&
             this.closeBatchForm.get('closingApiGravity')?.valid === true;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (!this.canSubmit()) {
      return;
    }

    const formValue = this.closeBatchForm.getRawValue(); // getRawValue includes disabled fields
    
    const request: CloseBatchRequest = {
      batchId: this.batch.id,
      closingLevel: formValue.closingLevel,
      closingTemperature: formValue.closingTemperature,
      closingApiGravity: formValue.closingApiGravity,
      closingBsw: formValue.closingBsw,
      operator: formValue.operator,
      notes: formValue.notes
    };

    this.dialogRef.close(request);
  }
}
