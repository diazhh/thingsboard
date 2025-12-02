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
import {
  PortConfig,
  PortInfo,
  AvailablePort,
  DEFAULT_PORT_CONFIG,
  BAUDRATE_OPTIONS,
  BYTESIZE_OPTIONS,
  STOPBITS_OPTIONS,
  PARITY_OPTIONS,
  PROTOCOL_OPTIONS
} from '../../../shared/models/gateway-port.model';

export interface AddPortDialogData {
  availablePorts: AvailablePort[];
  existingPort?: PortInfo;
  isEdit?: boolean;
}

@Component({
  selector: 'tb-add-port-dialog',
  templateUrl: './add-port-dialog.component.html',
  styleUrls: ['./add-port-dialog.component.scss']
})
export class AddPortDialogComponent implements OnInit {

  portForm: FormGroup;
  isEdit: boolean = false;

  // Options for form fields
  baudrateOptions = BAUDRATE_OPTIONS;
  bytesizeOptions = BYTESIZE_OPTIONS;
  stopbitsOptions = STOPBITS_OPTIONS;
  parityOptions = PARITY_OPTIONS;
  protocolOptions = PROTOCOL_OPTIONS;

  // Available ports
  availablePorts: AvailablePort[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddPortDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddPortDialogData
  ) {
    this.availablePorts = data.availablePorts || [];
    this.isEdit = data.isEdit || false;
  }

  ngOnInit(): void {
    this.initForm();

    // If editing, populate form with existing port data
    if (this.isEdit && this.data.existingPort) {
      this.populateForm(this.data.existingPort);
    }
  }

  private initForm(): void {
    this.portForm = this.fb.group({
      name: [
        { value: '', disabled: this.isEdit },
        [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_-]+$/)]
      ],
      device: ['', Validators.required],
      baudrate: [DEFAULT_PORT_CONFIG.baudrate, Validators.required],
      bytesize: [DEFAULT_PORT_CONFIG.bytesize, Validators.required],
      parity: [DEFAULT_PORT_CONFIG.parity, Validators.required],
      stopbits: [DEFAULT_PORT_CONFIG.stopbits, Validators.required],
      timeout: [DEFAULT_PORT_CONFIG.timeout, [Validators.required, Validators.min(0.1), Validators.max(10)]],
      protocol: [DEFAULT_PORT_CONFIG.protocol, Validators.required],
      enabled: [DEFAULT_PORT_CONFIG.enabled],
      auto_reconnect: [DEFAULT_PORT_CONFIG.auto_reconnect],
      description: ['', Validators.maxLength(200)]
    });
  }

  private populateForm(port: PortInfo): void {
    this.portForm.patchValue({
      name: port.name,
      device: port.device,
      baudrate: port.baudrate,
      protocol: port.protocol,
      enabled: port.enabled,
      description: port.description
    });
  }

  selectAvailablePort(port: AvailablePort): void {
    this.portForm.patchValue({
      device: port.device
    });

    // Auto-generate name if not editing
    if (!this.isEdit && !this.portForm.get('name').value) {
      // Generate name from device path (e.g., /dev/ttyUSB0 -> ttyUSB0)
      const deviceName = port.device.split('/').pop();
      this.portForm.patchValue({
        name: `port-${deviceName}`
      });
    }

    // Auto-fill description if empty
    if (!this.portForm.get('description').value) {
      let desc = port.description;
      if (port.manufacturer !== 'Unknown') {
        desc = `${port.manufacturer} ${port.product}`;
      }
      this.portForm.patchValue({
        description: desc
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.portForm.invalid) {
      this.portForm.markAllAsTouched();
      return;
    }

    const formValue = this.portForm.getRawValue(); // getRawValue includes disabled fields

    // For edit mode, only include changed values
    if (this.isEdit) {
      const updates: Partial<PortConfig> = {};
      Object.keys(formValue).forEach(key => {
        if (key !== 'name' && this.portForm.get(key).dirty) {
          updates[key] = formValue[key];
        }
      });
      this.dialogRef.close(updates);
    } else {
      // For create mode, send all values
      const config: PortConfig = formValue;
      this.dialogRef.close(config);
    }
  }

  get dialogTitle(): string {
    return this.isEdit ? 'Editar Puerto' : 'Agregar Puerto';
  }

  get submitButtonText(): string {
    return this.isEdit ? 'Actualizar' : 'Crear';
  }
}
