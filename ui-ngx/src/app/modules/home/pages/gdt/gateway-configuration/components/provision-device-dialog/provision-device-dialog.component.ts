///
/// Copyright © 2016-2025 The Thingsboard Authors
///

import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';

import { AppState } from '@core/core.state';
import { ActionNotificationShow } from '@core/notification/notification.actions';

import {
  DiscoveredDevice,
  DeviceProvisioningConfig,
  getDeviceTypeLabel
} from '../../../shared/models/device-discovery.model';

@Component({
  selector: 'tb-provision-device-dialog',
  templateUrl: './provision-device-dialog.component.html',
  styleUrls: ['./provision-device-dialog.component.scss']
})
export class ProvisionDeviceDialogComponent implements OnInit {

  provisionForm: FormGroup;
  device: DiscoveredDevice;
  isProvisioning = false;

  constructor(
    private fb: FormBuilder,
    private store: Store<AppState>,
    public dialogRef: MatDialogRef<ProvisionDeviceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { device: DiscoveredDevice }
  ) {
    this.device = data.device;
  }

  ngOnInit(): void {
    this.buildForm();
  }

  private buildForm(): void {
    const suggestedName = `Radar-${this.device.address}`;
    
    this.provisionForm = this.fb.group({
      asset_name: [suggestedName, [Validators.required, Validators.minLength(3)]],
      asset_label: [this.device.manufacturer || '', Validators.maxLength(100)],
      tank_id: [''],
      description: [this.generateDescription(), Validators.maxLength(200)]
    });
  }

  private generateDescription(): string {
    const parts = [];
    if (this.device.manufacturer) parts.push(this.device.manufacturer);
    if (this.device.model) parts.push(this.device.model);
    parts.push(`Dirección ${this.device.address}`);
    parts.push(`${this.device.baudrate} bps`);
    return parts.join(' - ');
  }

  getDeviceTypeLabel(): string {
    return getDeviceTypeLabel(this.device.device_type);
  }

  onSubmit(): void {
    if (this.provisionForm.invalid) {
      Object.keys(this.provisionForm.controls).forEach(key => {
        this.provisionForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isProvisioning = true;

    const config: DeviceProvisioningConfig = {
      discovered_device: this.device,
      asset_name: this.provisionForm.value.asset_name,
      asset_label: this.provisionForm.value.asset_label,
      tank_id: this.provisionForm.value.tank_id || undefined,
      additional_attributes: {
        description: this.provisionForm.value.description,
        modbus_address: this.device.address,
        baudrate: this.device.baudrate,
        port_name: this.device.port_name
      }
    };

    // TODO: Llamar al servicio de provisioning cuando esté disponible
    setTimeout(() => {
      this.isProvisioning = false;
      this.store.dispatch(new ActionNotificationShow({
        message: 'Provisioning no implementado aún. Funcionalidad pendiente.',
        type: 'info',
        duration: 5000
      }));
      this.dialogRef.close(config);
    }, 1000);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
