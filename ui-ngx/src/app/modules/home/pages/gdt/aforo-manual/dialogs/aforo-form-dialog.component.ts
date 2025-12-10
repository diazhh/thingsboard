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

import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WidgetContext } from '@home/models/widget-component.models';
import { TankAsset } from '../../shared/services/tank-asset.service';
import { ManualTelemetryService, ManualTelemetryEntry } from '../../tank-monitoring/services/manual-telemetry.service';

export interface AforoFormDialogData {
  tanks: Array<{ asset: TankAsset, attributes: any }>;
  widgetContext: WidgetContext;
}

@Component({
  selector: 'tb-aforo-form-dialog',
  templateUrl: './aforo-form-dialog.component.html',
  styleUrls: ['./aforo-form-dialog.component.scss']
})
export class AforoFormDialogComponent implements OnInit {

  aforoForm: FormGroup;
  saving = false;
  selectedTank: { asset: TankAsset, attributes: any } | null = null;

  constructor(
    private fb: FormBuilder,
    private manualTelemetryService: ManualTelemetryService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<AforoFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AforoFormDialogData
  ) {
    this.aforoForm = this.fb.group({
      timestamp: [new Date(), Validators.required],
      manualLevel: [null, [Validators.required, Validators.min(0)]],
      manualTemperature: [null, [Validators.min(-50), Validators.max(150)]],
      operatorName: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit() {
    // Initialize with first tank if available
    if (this.data.tanks && this.data.tanks.length > 0) {
      this.selectedTank = this.data.tanks[0];
    }
  }

  onSubmit() {
    if (this.aforoForm.invalid || !this.selectedTank || !this.selectedTank.asset.id) {
      return;
    }

    this.saving = true;
    const formValue = this.aforoForm.value;
    
    const entry: ManualTelemetryEntry = {
      timestamp: new Date(formValue.timestamp).getTime(),
      tankId: this.selectedTank.asset.id.id,
      tankTag: this.selectedTank.attributes.tankTag || this.selectedTank.asset.name,
      manualLevel: formValue.manualLevel,
      manualTemperature: formValue.manualTemperature,
      notes: formValue.notes,
      operatorId: 'manual-entry', // Manual entry ID
      operatorName: formValue.operatorName,
      source: 'manual_gauging',
      createdAt: Date.now()
    };

    this.manualTelemetryService.saveManualEntry(this.data.widgetContext, entry).subscribe({
      next: () => {
        this.snackBar.open('Aforo manual guardado exitosamente', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        this.dialogRef.close(entry);
      },
      error: (err) => {
        console.error('Error saving manual entry:', err);
        this.snackBar.open('Error al guardar el aforo manual', 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.saving = false;
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  compareTanks(t1: any, t2: any): boolean {
    return t1 && t2 ? t1.asset.id.id === t2.asset.id.id : t1 === t2;
  }
}
