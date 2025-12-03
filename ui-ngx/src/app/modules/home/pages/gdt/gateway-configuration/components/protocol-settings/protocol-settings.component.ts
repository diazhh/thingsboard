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

/*
 * Copyright © 2024 GDT - Grupo de Desarrollo Tecnológico
 * Licensed under the Apache License, Version 2.0
 */

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ProtocolType,
  ProtocolSettings,
  ModbusRTUSettings,
  ModbusTCPSettings,
  EnrafGPUSettings,
  VarecMarkSpaceSettings,
  BAUDRATE_OPTIONS,
  PARITY_OPTIONS,
  STOPBITS_OPTIONS
} from '../../../shared/models/protocol-config.model';
import { ProtocolConfigService } from '../../../shared/services/protocol-config.service';

/**
 * Protocol Settings Component
 * 
 * Displays protocol-specific configuration forms based on selected protocol type.
 */
@Component({
  selector: 'app-protocol-settings',
  templateUrl: './protocol-settings.component.html',
  styleUrls: ['./protocol-settings.component.scss']
})
export class ProtocolSettingsComponent implements OnInit {

  @Input() protocol: ProtocolType;
  @Input() settings: ProtocolSettings;
  @Output() settingsChanged = new EventEmitter<ProtocolSettings>();

  form: FormGroup;
  baudrates = BAUDRATE_OPTIONS;
  parities = PARITY_OPTIONS;
  stopbits = STOPBITS_OPTIONS;
  availablePorts: any[] = [];

  ProtocolType = ProtocolType;

  constructor(
    private fb: FormBuilder,
    private protocolConfigService: ProtocolConfigService
  ) {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    this.loadAvailablePorts();
    this.initializeForm();
  }

  ngOnChanges(): void {
    if (this.protocol) {
      this.initializeForm();
    }
  }

  loadAvailablePorts(): void {
    this.protocolConfigService.getAvailableSerialPorts().subscribe(
      ports => {
        this.availablePorts = ports;
      }
    );
  }

  initializeForm(): void {
    this.form = this.fb.group({});

    switch (this.protocol) {
      case ProtocolType.MODBUS_RTU:
        this.buildModbusRTUForm();
        break;
      case ProtocolType.MODBUS_TCP:
        this.buildModbusTCPForm();
        break;
      case ProtocolType.ENRAF_GPU:
        this.buildEnrafGPUForm();
        break;
      case ProtocolType.VAREC_MARKSPACE:
        this.buildVarecMarkSpaceForm();
        break;
    }

    this.form.valueChanges.subscribe(() => {
      this.emitSettings();
    });
  }

  private buildModbusRTUForm(): void {
    const settings = this.settings as ModbusRTUSettings;
    this.form = this.fb.group({
      device: [settings?.device || '/dev/ttyUSB0', [Validators.required]],
      baudrate: [settings?.baudrate || 9600, [Validators.required]],
      bytesize: [settings?.bytesize || 8, [Validators.required]],
      parity: [settings?.parity || 'N', [Validators.required]],
      stopbits: [settings?.stopbits || 1, [Validators.required]],
      timeout: [settings?.timeout || 1.0, [Validators.required, Validators.min(0.1)]]
    });
  }

  private buildModbusTCPForm(): void {
    const settings = this.settings as ModbusTCPSettings;
    this.form = this.fb.group({
      host: [settings?.host || 'localhost', [Validators.required]],
      port: [settings?.port || 502, [Validators.required, Validators.min(1), Validators.max(65535)]],
      unitId: [settings?.unitId || 1, [Validators.required, Validators.min(0), Validators.max(247)]],
      timeout: [settings?.timeout || 1.0, [Validators.required, Validators.min(0.1)]]
    });
  }

  private buildEnrafGPUForm(): void {
    const settings = this.settings as EnrafGPUSettings;
    this.form = this.fb.group({
      device: [settings?.device || '/dev/ttyUSB0', [Validators.required]],
      baudrate: [settings?.baudrate || 9600, [Validators.required]],
      address: [settings?.address || 1, [Validators.required, Validators.min(1), Validators.max(247)]],
      timeout: [settings?.timeout || 1.0, [Validators.required, Validators.min(0.1)]]
    });
  }

  private buildVarecMarkSpaceForm(): void {
    const settings = this.settings as VarecMarkSpaceSettings;
    this.form = this.fb.group({
      device: [settings?.device || '/dev/ttyUSB0', [Validators.required]],
      baudrate: [settings?.baudrate || 9600, [Validators.required]],
      address: [settings?.address || 1, [Validators.required, Validators.min(1), Validators.max(247)]],
      timeout: [settings?.timeout || 1.0, [Validators.required, Validators.min(0.1)]]
    });
  }

  private emitSettings(): void {
    if (this.form.valid) {
      this.settingsChanged.emit(this.form.value);
    }
  }

  getFormControl(name: string) {
    return this.form.get(name);
  }

  hasError(controlName: string, errorType: string): boolean {
    const control = this.form.get(controlName);
    return control ? control.hasError(errorType) && (control.dirty || control.touched) : false;
  }
}
