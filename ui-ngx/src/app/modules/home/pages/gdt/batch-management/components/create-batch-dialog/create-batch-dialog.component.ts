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

import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BatchType, CreateBatchRequest } from '../../../shared/models/batch.model';
import { TankAssetService } from '../../../shared/services/tank-asset.service';
import { BatchGaugeCaptureService, GaugeSnapshot } from '../../../shared/services/batch-gauge-capture.service';
import { TankStateValidatorService, TankStateValidationResult } from '../../../shared/services/tank-state-validator.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'tb-create-batch-dialog',
  templateUrl: './create-batch-dialog.component.html',
  styleUrls: ['./create-batch-dialog.component.scss']
})
export class CreateBatchDialogComponent implements OnInit, OnDestroy {

  batchForm: FormGroup;
  tanks: any[] = [];
  loading = false;
  capturingGauge = false;
  validatingTank = false;
  captureError: string | null = null;
  
  // Automatic capture mode
  useAutomaticCapture = true;
  gaugeSnapshot: GaugeSnapshot | null = null;
  validationResult: TankStateValidationResult | null = null;
  
  private destroy$ = new Subject<void>();

  batchTypes: { label: string; value: BatchType }[] = [
    { label: 'Recepción', value: 'receiving' },
    { label: 'Despacho', value: 'dispensing' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateBatchDialogComponent>,
    private tankAssetService: TankAssetService,
    private gaugeCaptureService: BatchGaugeCaptureService,
    private tankValidatorService: TankStateValidatorService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadTanks();
    
    // Listen to tank selection changes
    this.batchForm.get('tankId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(tankId => {
        if (tankId && this.useAutomaticCapture) {
          this.validateAndCaptureGauge(tankId);
        }
      });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildForm() {
    this.batchForm = this.fb.group({
      tankId: ['', Validators.required],
      batchType: ['receiving', Validators.required],
      // Manual fields (only used when useAutomaticCapture = false)
      openingLevel: [{ value: '', disabled: true }],
      openingTemperature: [{ value: '', disabled: true }],
      openingApiGravity: [{ value: '', disabled: true }],
      openingBsw: [{ value: 0, disabled: true }],
      // Metadata fields
      destination: [''],
      transportVehicle: [''],
      sealNumbers: [''],
      notes: [''],
      operator: ['']
    });
  }

  loadTanks() {
    this.loading = true;
    this.tankAssetService.getAllTanksWithAttributes('Tank').subscribe({
      next: (tanks) => {
        this.tanks = tanks;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tanks:', err);
        this.loading = false;
      }
    });
  }

  /**
   * Validate tank state and capture gauge automatically
   */
  validateAndCaptureGauge(tankId: string) {
    this.validatingTank = true;
    this.capturingGauge = true;
    this.gaugeSnapshot = null;
    this.validationResult = null;

    // First validate tank state
    this.tankValidatorService.validateTankState(tankId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (validation) => {
          this.validationResult = validation;
          this.validatingTank = false;

          // If valid, capture gauge
          if (validation.valid) {
            this.captureGauge(tankId);
            
            // Auto-suggest batch type based on movement
            if (validation.tankState?.suggestedBatchType) {
              this.batchForm.patchValue({
                batchType: validation.tankState.suggestedBatchType
              });
            }
          } else {
            this.capturingGauge = false;
          }
        },
        error: (err) => {
          console.error('Error validating tank:', err);
          this.validatingTank = false;
          this.capturingGauge = false;
        }
      });
  }

  /**
   * Capture gauge reading from telemetry
   */
  captureGauge(tankId: string) {
    const operator = this.batchForm.get('operator')?.value || undefined;
    
    this.gaugeCaptureService.captureCurrentGauge(tankId, operator)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshot) => {
          this.gaugeSnapshot = snapshot;
          this.capturingGauge = false;
          this.captureError = null;
          console.log('Gauge captured successfully:', snapshot);
        },
        error: (err) => {
          console.error('Error capturing gauge:', err);
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
      this.batchForm.get('openingLevel')?.disable();
      this.batchForm.get('openingTemperature')?.disable();
      this.batchForm.get('openingApiGravity')?.disable();
      this.batchForm.get('openingBsw')?.disable();
      
      // Re-capture if tank is selected
      const tankId = this.batchForm.get('tankId')?.value;
      if (tankId) {
        this.validateAndCaptureGauge(tankId);
      }
    } else {
      // Enable manual fields
      this.batchForm.get('openingLevel')?.enable();
      this.batchForm.get('openingTemperature')?.enable();
      this.batchForm.get('openingApiGravity')?.enable();
      this.batchForm.get('openingBsw')?.enable();
      
      // Clear automatic data
      this.gaugeSnapshot = null;
      this.validationResult = null;
    }
  }

  /**
   * Check if form is ready to submit
   */
  canSubmit(): boolean {
    if (!this.batchForm.valid) {
      return false;
    }
    
    if (this.useAutomaticCapture) {
      // For automatic capture:
      // - Tank validation must pass (validationResult.valid === true)
      // - Gauge snapshot should be captured (but allow submit even if capture failed, user can retry)
      // - Not currently validating or capturing
      return this.validationResult?.valid === true && 
             !this.validatingTank && 
             !this.capturingGauge &&
             this.gaugeSnapshot !== null;
    } else {
      // Need manual values
      return this.batchForm.get('openingLevel')?.valid === true &&
             this.batchForm.get('openingTemperature')?.valid === true &&
             this.batchForm.get('openingApiGravity')?.valid === true;
    }
  }

  onSubmit() {
    if (!this.canSubmit()) {
      return;
    }

    const formValue = this.batchForm.getRawValue(); // getRawValue includes disabled fields
    
    // Find selected tank
    const selectedTank = this.tanks.find(t => t.asset.id.id === formValue.tankId);
    const tankName = selectedTank ? 
      (selectedTank.attributes.tankTag || selectedTank.asset.name) : 
      'Unknown Tank';

    // Parse seal numbers
    const sealNumbers = formValue.sealNumbers ? 
      formValue.sealNumbers.split(',').map((s: string) => s.trim()).filter((s: string) => s) : 
      undefined;

    let request: CreateBatchRequest;

    if (this.useAutomaticCapture && this.gaugeSnapshot) {
      // Use automatic capture data
      request = {
        batchNumber: '', // Will be generated by backend/service
        tankId: formValue.tankId,
        tankName,
        batchType: formValue.batchType,
        openingLevel: this.gaugeSnapshot.level,
        openingTemperature: this.gaugeSnapshot.temperature,
        openingApiGravity: this.gaugeSnapshot.apiGravity,
        openingBsw: this.gaugeSnapshot.bsw,
        destination: formValue.destination || undefined,
        transportVehicle: formValue.transportVehicle || undefined,
        sealNumbers,
        notes: formValue.notes || undefined,
        operator: formValue.operator || undefined
      };
    } else {
      // Use manual entry data
      request = {
        batchNumber: '',
        tankId: formValue.tankId,
        tankName,
        batchType: formValue.batchType,
        openingLevel: formValue.openingLevel,
        openingTemperature: formValue.openingTemperature,
        openingApiGravity: formValue.openingApiGravity,
        openingBsw: formValue.openingBsw,
        destination: formValue.destination || undefined,
        transportVehicle: formValue.transportVehicle || undefined,
        sealNumbers,
        notes: formValue.notes || undefined,
        operator: formValue.operator || undefined
      };
    }

    this.dialogRef.close(request);
  }

  onCancel() {
    this.dialogRef.close();
  }
}
