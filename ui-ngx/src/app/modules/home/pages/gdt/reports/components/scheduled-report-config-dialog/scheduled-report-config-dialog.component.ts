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
import { ScheduledReportConfig } from '../../models/scheduled-report.model';

interface CronPreset {
  label: string;
  value: string;
  description: string;
}

@Component({
  selector: 'tb-scheduled-report-config-dialog',
  templateUrl: './scheduled-report-config-dialog.component.html',
  styleUrls: ['./scheduled-report-config-dialog.component.scss']
})
export class ScheduledReportConfigDialogComponent implements OnInit {

  form: FormGroup;
  mode: 'create' | 'edit';
  
  reportTypes = [
    { value: 'DAILY_INVENTORY', label: 'Daily Inventory Report' },
    { value: 'TANK_INVENTORY_SUMMARY', label: 'Tank Inventory Summary' },
    { value: 'PRODUCT_INVENTORY_BY_GROUP', label: 'Product Inventory by Group' },
    { value: 'TANK_STATUS', label: 'Tank Status Report' },
    { value: 'CAPACITY_UTILIZATION', label: 'Capacity Utilization Report' },
    { value: 'LOW_STOCK_ALERT', label: 'Low Stock Alert Report' },
    { value: 'OVERFILL_RISK', label: 'Overfill Risk Report' },
    { value: 'MASS_BALANCE', label: 'Mass Balance Report' },
    { value: 'HISTORICAL_LEVEL_TRENDS', label: 'Historical Level Trends' },
    { value: 'HISTORICAL_VOLUME_TRENDS', label: 'Historical Volume Trends' },
    { value: 'TEMPERATURE_PROFILE', label: 'Temperature Profile Report' },
    { value: 'ALARM_HISTORY', label: 'Alarm History Report' }
  ];

  exportFormats = [
    { value: 'CSV', label: 'CSV' },
    { value: 'PDF', label: 'PDF' },
    { value: 'EXCEL', label: 'Excel' }
  ];

  notificationMethods = [
    { value: 'EMAIL', label: 'Email' },
    { value: 'SMS', label: 'SMS' },
    { value: 'PUSH', label: 'Push Notification' },
    { value: 'WEBHOOK', label: 'Webhook' }
  ];

  timezones = [
    { value: 'America/Bogota', label: 'America/Bogota (COT)' },
    { value: 'America/New_York', label: 'America/New_York (EST)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
    { value: 'Europe/London', label: 'Europe/London (GMT)' },
    { value: 'UTC', label: 'UTC' }
  ];

  cronPresets: CronPreset[] = [
    { label: 'Cada hora', value: '0 0 * * * ?', description: 'Ejecuta cada hora en punto' },
    { label: 'Diario a medianoche', value: '0 0 0 * * ?', description: 'Ejecuta todos los días a las 00:00' },
    { label: 'Diario a las 8:00 AM', value: '0 0 8 * * ?', description: 'Ejecuta todos los días a las 08:00' },
    { label: 'Diario a las 6:00 PM', value: '0 0 18 * * ?', description: 'Ejecuta todos los días a las 18:00' },
    { label: 'Cada lunes a las 9:00 AM', value: '0 0 9 ? * MON', description: 'Ejecuta cada lunes a las 09:00' },
    { label: 'Primer día del mes', value: '0 0 0 1 * ?', description: 'Ejecuta el día 1 de cada mes a las 00:00' },
    { label: 'Personalizado', value: 'custom', description: 'Ingresa tu propia expresión cron' }
  ];

  selectedPreset = 'custom';
  showCustomCron = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ScheduledReportConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit', report?: ScheduledReportConfig }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.data.report?.name || '', Validators.required],
      description: [this.data.report?.description || ''],
      enabled: [this.data.report?.enabled !== false],
      reportType: [this.data.report?.reportType || '', Validators.required],
      cronPreset: ['custom'],
      cronExpression: [this.data.report?.cronExpression || '0 0 8 * * ?', Validators.required],
      timezone: [this.data.report?.timezone || 'America/Bogota', Validators.required],
      exportFormats: [this.data.report?.exportFormats || ['CSV'], Validators.required],
      exportPath: [this.data.report?.exportPath || ''],
      autoExport: [this.data.report?.autoExport !== false],
      notifyOnCompletion: [this.data.report?.notifyOnCompletion !== false],
      notifyOnError: [this.data.report?.notifyOnError !== false],
      notificationEmails: [this.data.report?.notificationEmails?.join(', ') || ''],
      notificationMethod: [this.data.report?.notificationMethod || 'EMAIL'],
      retentionDays: [this.data.report?.retentionDays || 30, [Validators.min(1), Validators.max(365)]],
      autoCleanup: [this.data.report?.autoCleanup !== false]
    });

    // Detect preset from existing cron expression
    if (this.data.report?.cronExpression) {
      const preset = this.cronPresets.find(p => p.value === this.data.report!.cronExpression);
      if (preset) {
        this.selectedPreset = preset.value;
        this.form.patchValue({ cronPreset: preset.value });
      } else {
        this.selectedPreset = 'custom';
        this.showCustomCron = true;
      }
    }
  }

  onPresetChange(preset: string): void {
    this.selectedPreset = preset;
    
    if (preset === 'custom') {
      this.showCustomCron = true;
    } else {
      this.showCustomCron = false;
      this.form.patchValue({ cronExpression: preset });
    }
  }

  getCronDescription(cronExpression: string): string {
    const preset = this.cronPresets.find(p => p.value === cronExpression);
    return preset ? preset.description : 'Expresión cron personalizada';
  }

  validateCronExpression(): boolean {
    const cron = this.form.get('cronExpression')?.value;
    if (!cron) return false;
    
    // Basic validation: should have 6 or 7 parts
    const parts = cron.trim().split(/\s+/);
    return parts.length === 6 || parts.length === 7;
  }

  save(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      
      // Parse notification emails
      const emails = formValue.notificationEmails
        ? formValue.notificationEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e)
        : [];
      
      const config: ScheduledReportConfig = {
        ...this.data.report,
        name: formValue.name,
        description: formValue.description,
        enabled: formValue.enabled,
        reportType: formValue.reportType,
        cronExpression: formValue.cronExpression,
        timezone: formValue.timezone,
        exportFormats: formValue.exportFormats,
        exportPath: formValue.exportPath,
        autoExport: formValue.autoExport,
        notifyOnCompletion: formValue.notifyOnCompletion,
        notifyOnError: formValue.notifyOnError,
        notificationEmails: emails,
        notificationMethod: formValue.notificationMethod,
        retentionDays: formValue.retentionDays,
        autoCleanup: formValue.autoCleanup
      };
      
      this.dialogRef.close(config);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
