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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  ReportInfo,
  ReportFormat,
  ReportGenerationRequest,
  ReportParameters
} from '../../../shared/models/report.model';
import { AssetService } from '@core/http/asset.service';
import { PageLink } from '@shared/models/page/page-link';

export interface GenerateReportDialogData {
  reportInfo: ReportInfo;
}

@Component({
  selector: 'tb-generate-report-dialog',
  templateUrl: './generate-report-dialog.component.html',
  styleUrls: ['./generate-report-dialog.component.scss']
})
export class GenerateReportDialogComponent implements OnInit {

  reportForm: FormGroup;
  reportInfo: ReportInfo;
  availableFormats: ReportFormat[];
  availableTanks: Array<{id: string, name: string}> = [];

  // Date range
  maxDate = new Date();
  minDate = new Date(2020, 0, 1);

  constructor(
    private fb: FormBuilder,
    private assetService: AssetService,
    public dialogRef: MatDialogRef<GenerateReportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GenerateReportDialogData
  ) {
    this.reportInfo = data.reportInfo;
    this.availableFormats = data.reportInfo.supportedFormats;
  }

  ngOnInit(): void {
    this.buildForm();
    this.loadTanks();
  }

  /**
   * Load available tanks from backend
   */
  private loadTanks(): void {
    const pageLink = new PageLink(100, 0);
    this.assetService.getTenantAssetInfos(pageLink, 'Tank').subscribe({
      next: (assets) => {
        this.availableTanks = assets.data.map(asset => ({
          id: asset.id.id,
          name: asset.name
        }));
        console.log('Loaded tanks:', this.availableTanks);
      },
      error: (error) => {
        console.error('Error loading tanks:', error);
      }
    });
  }

  /**
   * Build form based on report requirements
   */
  private buildForm(): void {
    // Default to CSV format (fully functional)
    const defaultFormat = this.availableFormats.includes(ReportFormat.CSV) 
      ? ReportFormat.CSV 
      : this.availableFormats[0];
    
    const formConfig: any = {
      format: [defaultFormat, Validators.required],
      locale: ['en'],
      timezone: ['UTC']
    };

    // Add required parameters
    this.reportInfo.requiredParameters.forEach(param => {
      formConfig[param] = [null, Validators.required];
    });

    // Add optional parameters
    this.reportInfo.optionalParameters.forEach(param => {
      formConfig[param] = [null];
    });

    this.reportForm = this.fb.group(formConfig);
  }

  /**
   * Check if parameter is required
   */
  isRequired(param: string): boolean {
    return this.reportInfo.requiredParameters.includes(param);
  }

  /**
   * Get parameter label
   */
  getParameterLabel(param: string): string {
    const labels: { [key: string]: string } = {
      tankIds: 'Seleccionar Tanques',
      startDate: 'Fecha de Inicio',
      endDate: 'Fecha de Fin',
      date: 'Fecha',
      productFilter: 'Filtro por Producto',
      groupFilter: 'Filtro por Grupo',
      batchId: 'ID de Lote',
      batchType: 'Tipo de Lote',
      aggregation: 'Agregación',
      includeCharts: 'Incluir Gráficos',
      threshold: 'Umbral',
      alarmType: 'Tipo de Alarma',
      severity: 'Severidad',
      eventType: 'Tipo de Evento',
      userId: 'ID de Usuario',
      changeType: 'Tipo de Cambio',
      deviceType: 'Tipo de Dispositivo',
      sourceBatchId: 'ID de Lote Origen',
      destinationBatchId: 'ID de Lote Destino',
      tankId: 'ID de Tanque'
    };
    return labels[param] || param;
  }

  /**
   * Get parameter type for input
   */
  getParameterType(param: string): 'text' | 'date' | 'select' | 'checkbox' | 'multiselect' {
    if (param.includes('Date') || param === 'date') {
      return 'date';
    }
    if (param === 'includeCharts') {
      return 'checkbox';
    }
    if (param === 'tankIds') {
      return 'multiselect';
    }
    if (param.includes('Type') || param === 'aggregation' || param === 'severity') {
      return 'select';
    }
    return 'text';
  }

  /**
   * Get options for select parameters
   */
  getParameterOptions(param: string): string[] {
    const options: { [key: string]: string[] } = {
      batchType: ['receiving', 'dispensing', 'all'],
      aggregation: ['hourly', 'daily', 'weekly', 'monthly'],
      alarmType: ['Level HH', 'Level H', 'Level L', 'Level LL', 'Rate', 'Deviation', 'Device'],
      severity: ['Critical', 'Major', 'Minor'],
      eventType: ['Configuration Change', 'Parameter Change', 'Batch Operation', 'Seal Change'],
      changeType: ['Tank Parameters', 'Strapping Table', 'Alarm Thresholds', 'Radar Config'],
      deviceType: ['Radar', 'Temperature Sensor', 'Pressure Sensor']
    };
    return options[param] || [];
  }

  /**
   * Cancel dialog
   */
  cancel(): void {
    this.dialogRef.close();
  }

  /**
   * Generate report
   */
  generate(): void {
    if (this.reportForm.valid) {
      const formValue = this.reportForm.value;
      
      // Build parameters object
      const parameters: ReportParameters = {};
      [...this.reportInfo.requiredParameters, ...this.reportInfo.optionalParameters].forEach(param => {
        if (formValue[param] !== null && formValue[param] !== undefined) {
          parameters[param] = formValue[param];
        }
      });

      // Build request
      const request: ReportGenerationRequest = {
        reportType: this.reportInfo.type,
        format: formValue.format,
        parameters,
        locale: formValue.locale,
        timezone: formValue.timezone
      };

      this.dialogRef.close(request);
    }
  }
}
