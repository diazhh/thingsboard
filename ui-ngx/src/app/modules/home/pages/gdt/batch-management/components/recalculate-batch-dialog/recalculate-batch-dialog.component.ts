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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Batch, RecalculateBatchRequest } from '../../../shared/models/batch.model';
import { BatchRecalculationService, RecalculationResult } from '../../../shared/services/batch-recalculation.service';

@Component({
  selector: 'tb-recalculate-batch-dialog',
  templateUrl: './recalculate-batch-dialog.component.html',
  styleUrls: ['./recalculate-batch-dialog.component.scss']
})
export class RecalculateBatchDialogComponent implements OnInit, OnDestroy {

  recalculateForm: FormGroup;
  batch: Batch;
  loading = false;
  showComparison = false;
  recalculationResult: RecalculationResult | null = null;
  requiresApproval = false;
  approvalReason: string | null = null;

  // Recalculation reasons
  recalculationReasons = [
    { value: 'lab_update', label: 'Actualizar API Gravity de laboratorio' },
    { value: 'temp_update', label: 'Actualizar temperatura' },
    { value: 'bsw_update', label: 'Actualizar BS&W' },
    { value: 'correction', label: 'Corregir error' },
    { value: 'other', label: 'Otro' }
  ];

  selectedReason = 'lab_update';
  otherReason = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RecalculateBatchDialogComponent>,
    private recalculationService: BatchRecalculationService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { batch: Batch }
  ) {
    this.batch = data.batch;
  }

  ngOnInit() {
    this.initializeForm();
    this.setupFormValueChanges();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the recalculation form
   */
  private initializeForm(): void {
    this.recalculateForm = this.fb.group({
      // Opening values
      openingTemperature: [
        this.batch.opening?.temperature || 25,
        [Validators.required, Validators.min(-50), Validators.max(150)]
      ],
      openingApiGravity: [
        this.batch.opening?.apiGravity || 35,
        [Validators.required, Validators.min(0), Validators.max(100)]
      ],
      openingBsw: [
        this.batch.opening?.bsw || 0,
        [Validators.required, Validators.min(0), Validators.max(100)]
      ],

      // Closing values
      closingTemperature: [
        this.batch.closing?.temperature || 25,
        [Validators.required, Validators.min(-50), Validators.max(150)]
      ],
      closingApiGravity: [
        this.batch.closing?.apiGravity || 35,
        [Validators.required, Validators.min(0), Validators.max(100)]
      ],
      closingBsw: [
        this.batch.closing?.bsw || 0,
        [Validators.required, Validators.min(0), Validators.max(100)]
      ],

      // Metadata
      reason: [this.selectedReason, Validators.required],
      otherReason: [''],
      operator: ['', Validators.required]
    });

    console.log('[RecalculateBatchDialogComponent] Form initialized with batch:', this.batch.batchNumber);
  }

  /**
   * Setup form value changes to trigger recalculation preview
   */
  private setupFormValueChanges(): void {
    this.recalculateForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.showComparison) {
          this.calculateRecalculation();
        }
      });
  }

  /**
   * Calculate recalculation and show comparison
   */
  calculateRecalculation(): void {
    if (!this.recalculateForm.valid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading = true;
    const formValue = this.recalculateForm.value;

    const updatedValues = {
      openingTemperature: formValue.openingTemperature,
      openingApiGravity: formValue.openingApiGravity,
      openingBsw: formValue.openingBsw,
      closingTemperature: formValue.closingTemperature,
      closingApiGravity: formValue.closingApiGravity,
      closingBsw: formValue.closingBsw
    };

    const reason = formValue.reason === 'other' ? formValue.otherReason : formValue.reason;

    this.recalculationService.recalculateBatch({
      batch: this.batch,
      reason,
      updatedValues,
      recalculatedBy: formValue.operator
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.recalculationResult = result;
          this.requiresApproval = result.requiresApproval;
          this.approvalReason = result.approvalReason || null;
          this.showComparison = true;
          this.loading = false;

          console.log('[RecalculateBatchDialogComponent] Recalculation result:', result);

          if (result.requiresApproval) {
            this.snackBar.open(
              `⚠️ Requiere aprobación: ${result.approvalReason}`,
              'Cerrar',
              { duration: 5000 }
            );
          } else {
            this.snackBar.open(
              '✅ Recálculo completado sin cambios significativos',
              'Cerrar',
              { duration: 3000 }
            );
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('[RecalculateBatchDialogComponent] Error calculating recalculation:', error);
          this.snackBar.open('Error al calcular recálculo', 'Cerrar', { duration: 3000 });
        }
      });
  }

  /**
   * Get the final reason (handles 'other' case)
   */
  getFinalReason(): string {
    const reason = this.recalculateForm.get('reason')?.value;
    if (reason === 'other') {
      return this.recalculateForm.get('otherReason')?.value || '';
    }
    return reason;
  }

  /**
   * Format percentage change for display
   */
  formatPercentageChange(value?: number): string {
    if (!value) return '0.00%';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  /**
   * Approve recalculation
   */
  approveRecalculation(): void {
    if (!this.recalculationResult) {
      this.snackBar.open('Error: No hay resultado de recálculo', 'Cerrar', { duration: 3000 });
      return;
    }

    const formValue = this.recalculateForm.getRawValue();
    const reason = formValue.reason === 'other' ? formValue.otherReason : formValue.reason;
    const operator = formValue.operator;

    // Create the recalculation request to be processed by the parent component
    const request: RecalculateBatchRequest = {
      batchId: this.batch.id,
      openingApiGravity: this.recalculationResult.recalculatedBatch.opening.apiGravity,
      openingTemperature: this.recalculationResult.recalculatedBatch.opening.temperature,
      openingBsw: this.recalculationResult.recalculatedBatch.opening.bsw,
      closingApiGravity: this.recalculationResult.recalculatedBatch.closing?.apiGravity,
      closingTemperature: this.recalculationResult.recalculatedBatch.closing?.temperature,
      closingBsw: this.recalculationResult.recalculatedBatch.closing?.bsw,
      reason,
      operator
    };

    this.snackBar.open('✅ Recálculo aprobado', 'Cerrar', { duration: 2000 });
    this.dialogRef.close(request);
  }

  /**
   * Reject recalculation
   */
  rejectRecalculation(): void {
    this.loading = true;

    this.recalculationService.rejectRecalculation(
      this.batch.id,
      'Usuario rechazó el recálculo'
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open('Recálculo rechazado', 'Cerrar', { duration: 3000 });
          this.dialogRef.close();
        },
        error: (error) => {
          this.loading = false;
          console.error('[RecalculateBatchDialogComponent] Error rejecting recalculation:', error);
          this.snackBar.open('Error al rechazar recálculo', 'Cerrar', { duration: 3000 });
        }
      });
  }

  /**
   * Cancel dialog
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}
