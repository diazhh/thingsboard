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
  selector: 'tb-lab-form',
  templateUrl: './lab-form.component.html',
  styleUrls: ['./lab-form.component.scss']
})
export class LabFormComponent implements OnInit {

  @Input() selectedTank: { asset: TankAsset, attributes: any } | null = null;
  @Input() widgetContext: WidgetContext;
  @Output() analysisSaved = new EventEmitter<ManualTelemetryEntry>();

  labForm: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private manualTelemetryService: ManualTelemetryService,
    private snackBar: MatSnackBar
  ) {
    this.labForm = this.fb.group({
      timestamp: [new Date(), Validators.required],
      apiGravity: [null, [Validators.required, Validators.min(4), Validators.max(99.9)]],
      bsw: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      temperature: [null, [Validators.min(-50), Validators.max(150)]],
      analyst: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit() {
  }

  onSubmit() {
    if (this.labForm.invalid || !this.selectedTank || !this.selectedTank.asset.id) {
      return;
    }

    this.saving = true;
    const formValue = this.labForm.value;
    
    const entry: ManualTelemetryEntry = {
      timestamp: new Date(formValue.timestamp).getTime(),
      tankId: this.selectedTank.asset.id.id,
      tankTag: this.selectedTank.attributes.tankTag || this.selectedTank.asset.name,
      apiGravity: formValue.apiGravity,
      bsw: formValue.bsw,
      manualTemperature: formValue.temperature,
      notes: `Analista: ${formValue.analyst}. ${formValue.notes}`,
      operatorId: 'current-user', // TODO: Get from auth service
      operatorName: formValue.analyst,
      source: 'laboratory',
      createdAt: Date.now()
    };

    this.manualTelemetryService.saveManualEntry(this.widgetContext, entry).subscribe({
      next: () => {
        this.snackBar.open('Análisis de laboratorio guardado exitosamente', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        this.analysisSaved.emit(entry);
        this.labForm.reset({
          timestamp: new Date(),
          apiGravity: null,
          bsw: null,
          temperature: null,
          analyst: '',
          notes: ''
        });
        this.saving = false;
      },
      error: (err) => {
        console.error('Error saving laboratory analysis:', err);
        this.snackBar.open('Error al guardar el análisis de laboratorio', 'Cerrar', {
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
    this.labForm.reset({
      timestamp: new Date(),
      apiGravity: null,
      bsw: null,
      temperature: null,
      analyst: '',
      notes: ''
    });
  }
}
