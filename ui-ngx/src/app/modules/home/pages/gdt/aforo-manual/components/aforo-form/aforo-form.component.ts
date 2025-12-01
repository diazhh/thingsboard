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

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WidgetContext } from '@home/models/widget-component.models';
import { TankAsset } from '../../../shared/services/tank-asset.service';
import { ManualTelemetryService, ManualTelemetryEntry } from '../../../tank-monitoring/services/manual-telemetry.service';

@Component({
  selector: 'tb-aforo-form',
  templateUrl: './aforo-form.component.html',
  styleUrls: ['./aforo-form.component.scss']
})
export class AforoFormComponent implements OnInit {

  @Input() selectedTank: { asset: TankAsset, attributes: any } | null = null;
  @Input() widgetContext: WidgetContext;
  @Output() entrySaved = new EventEmitter<ManualTelemetryEntry>();

  aforoForm: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private manualTelemetryService: ManualTelemetryService,
    private snackBar: MatSnackBar
  ) {
    this.aforoForm = this.fb.group({
      timestamp: [new Date(), Validators.required],
      manualLevel: [null, [Validators.required, Validators.min(0)]],
      manualTemperature: [null, [Validators.min(-50), Validators.max(150)]],
      notes: ['']
    });
  }

  ngOnInit() {
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
      operatorId: 'current-user', // TODO: Get from auth service
      operatorName: 'Current User', // TODO: Get from auth service
      source: 'manual_gauging',
      createdAt: Date.now()
    };

    this.manualTelemetryService.saveManualEntry(this.widgetContext, entry).subscribe({
      next: () => {
        this.snackBar.open('Aforo manual guardado exitosamente', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        this.entrySaved.emit(entry);
        this.aforoForm.reset({
          timestamp: new Date(),
          manualLevel: null,
          manualTemperature: null,
          notes: ''
        });
        this.saving = false;
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
    this.aforoForm.reset({
      timestamp: new Date(),
      manualLevel: null,
      manualTemperature: null,
      notes: ''
    });
  }
}
