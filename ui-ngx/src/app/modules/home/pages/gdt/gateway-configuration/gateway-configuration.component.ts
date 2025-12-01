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

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { DeviceService } from '@core/http/device.service';
import { ActionNotificationShow } from '@core/notification/notification.actions';
import { DialogService } from '@core/services/dialog.service';
import { Device, DeviceCredentials, DeviceCredentialsType, DeviceCredentialMQTTBasic } from '@shared/models/device.models';
import { PageLink } from '@shared/models/page/page-link';
import { getCurrentAuthState } from '@core/auth/auth.selectors';

interface GatewayInfo {
  device: Device;
  credentials: DeviceCredentials;
  mqttCredentials?: DeviceCredentialMQTTBasic;
}

@Component({
  selector: 'tb-gdt-gateway-configuration',
  templateUrl: './gateway-configuration.component.html',
  styleUrls: ['./gateway-configuration.component.scss']
})
export class GatewayConfigurationComponent implements OnInit {

  isLoading = false;
  gateway: GatewayInfo | null = null;
  showCredentials = false;
  
  // Form for creating new gateway
  gatewayForm: FormGroup;
  showCreateForm = false;
  isCreating = false;

  // Credential types
  credentialTypes = [
    { value: DeviceCredentialsType.ACCESS_TOKEN, label: 'Access Token' },
    { value: DeviceCredentialsType.MQTT_BASIC, label: 'MQTT Basic' }
  ];

  constructor(
    private store: Store<AppState>,
    private deviceService: DeviceService,
    private dialog: MatDialog,
    private dialogService: DialogService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadGateway();
  }

  private initForm(): void {
    this.gatewayForm = this.fb.group({
      name: ['gdt-radar-gateway', [Validators.required, Validators.minLength(3)]],
      label: ['Gateway Radar GDT', Validators.required],
      credentialsType: [DeviceCredentialsType.MQTT_BASIC, Validators.required],
      // Access Token fields
      accessToken: [''],
      // MQTT Basic fields
      clientId: ['gdt-gateway-client'],
      userName: ['gdt-gateway'],
      password: ['']
    });

    // Generate random password on init
    this.generatePassword();
  }

  loadGateway(): void {
    this.isLoading = true;
    const pageLink = new PageLink(100, 0);
    
    // Search for gateway devices
    this.deviceService.getTenantDeviceInfos(pageLink, 'gateway').subscribe({
      next: (pageData) => {
        // Find GDT gateway
        const gdtGateway = pageData.data.find(d => 
          d.name.toLowerCase().includes('gdt') || 
          d.name.toLowerCase().includes('radar') ||
          d.label?.toLowerCase().includes('gdt')
        );

        if (gdtGateway) {
          this.loadGatewayCredentials(gdtGateway);
        } else if (pageData.data.length > 0) {
          // Use first gateway if no GDT specific found
          this.loadGatewayCredentials(pageData.data[0]);
        } else {
          this.gateway = null;
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error loading gateway:', err);
        this.isLoading = false;
        this.store.dispatch(new ActionNotificationShow({
          message: 'Error al cargar el gateway',
          type: 'error'
        }));
      }
    });
  }

  private loadGatewayCredentials(device: Device): void {
    this.deviceService.getDeviceCredentials(device.id.id).subscribe({
      next: (credentials) => {
        let mqttCredentials: DeviceCredentialMQTTBasic | undefined;
        
        if (credentials.credentialsType === DeviceCredentialsType.MQTT_BASIC && credentials.credentialsValue) {
          try {
            mqttCredentials = JSON.parse(credentials.credentialsValue);
          } catch (e) {
            console.error('Error parsing MQTT credentials:', e);
          }
        }

        this.gateway = {
          device,
          credentials,
          mqttCredentials
        };
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading credentials:', err);
        this.gateway = {
          device,
          credentials: null,
          mqttCredentials: undefined
        };
        this.isLoading = false;
      }
    });
  }

  toggleCredentialsVisibility(): void {
    this.showCredentials = !this.showCredentials;
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.store.dispatch(new ActionNotificationShow({
        message: `${label} copiado al portapapeles`,
        type: 'success',
        duration: 2000
      }));
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm) {
      this.initForm();
    }
  }

  generatePassword(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.gatewayForm.patchValue({ password });
  }

  generateAccessToken(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 20; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.gatewayForm.patchValue({ accessToken: token });
  }

  createGateway(): void {
    if (this.gatewayForm.invalid) {
      this.gatewayForm.markAllAsTouched();
      return;
    }

    this.dialogService.confirm(
      'Crear Gateway',
      '¿Está seguro de crear un nuevo gateway? Esto creará un dispositivo tipo gateway en ThingsBoard.'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.performCreateGateway();
      }
    });
  }

  private performCreateGateway(): void {
    this.isCreating = true;
    const formValue = this.gatewayForm.value;

    // Create device object
    const device: Device = {
      name: formValue.name,
      type: 'gateway',
      label: formValue.label,
      additionalInfo: {
        gateway: true,
        description: 'Gateway para comunicación con radares GDT vía MQTT'
      }
    } as Device;

    // Create credentials based on type
    let credentials: DeviceCredentials;
    
    if (formValue.credentialsType === DeviceCredentialsType.MQTT_BASIC) {
      const mqttCreds: DeviceCredentialMQTTBasic = {
        clientId: formValue.clientId,
        userName: formValue.userName,
        password: formValue.password
      };
      credentials = {
        credentialsType: DeviceCredentialsType.MQTT_BASIC,
        credentialsId: formValue.userName,
        credentialsValue: JSON.stringify(mqttCreds)
      } as DeviceCredentials;
    } else {
      credentials = {
        credentialsType: DeviceCredentialsType.ACCESS_TOKEN,
        credentialsId: formValue.accessToken,
        credentialsValue: null
      } as DeviceCredentials;
    }

    // Save device with credentials
    this.deviceService.saveDeviceWithCredentials(device, credentials).subscribe({
      next: (savedDevice) => {
        this.isCreating = false;
        this.showCreateForm = false;
        this.store.dispatch(new ActionNotificationShow({
          message: 'Gateway creado exitosamente',
          type: 'success'
        }));
        this.loadGateway();
      },
      error: (err) => {
        this.isCreating = false;
        console.error('Error creating gateway:', err);
        this.store.dispatch(new ActionNotificationShow({
          message: `Error al crear gateway: ${err.error?.message || err.message}`,
          type: 'error'
        }));
      }
    });
  }

  deleteGateway(): void {
    if (!this.gateway) return;

    this.dialogService.confirm(
      'Eliminar Gateway',
      `¿Está seguro de eliminar el gateway "${this.gateway.device.name}"? Esta acción no se puede deshacer.`
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.deviceService.deleteDevice(this.gateway.device.id.id).subscribe({
          next: () => {
            this.store.dispatch(new ActionNotificationShow({
              message: 'Gateway eliminado exitosamente',
              type: 'success'
            }));
            this.gateway = null;
          },
          error: (err) => {
            this.store.dispatch(new ActionNotificationShow({
              message: 'Error al eliminar gateway',
              type: 'error'
            }));
          }
        });
      }
    });
  }

  refreshCredentials(): void {
    if (this.gateway) {
      this.loadGatewayCredentials(this.gateway.device);
    }
  }

  getCredentialTypeLabel(type: DeviceCredentialsType): string {
    const found = this.credentialTypes.find(ct => ct.value === type);
    return found ? found.label : type;
  }

  getMqttConnectionString(): string {
    if (!this.gateway?.mqttCredentials) return '';
    
    const creds = this.gateway.mqttCredentials;
    return `mqtt://${creds.userName}:****@<broker-host>:1883`;
  }

  getConnectionExample(): string {
    if (!this.gateway) return '';

    if (this.gateway.credentials?.credentialsType === DeviceCredentialsType.MQTT_BASIC) {
      const creds = this.gateway.mqttCredentials;
      return `mosquitto_pub -h <broker-host> -p 1883 -u "${creds?.userName}" -P "<password>" -t "v1/gateway/telemetry" -m '{"Device A": [{"ts": 1234567890, "values": {"key": "value"}}]}'`;
    } else {
      return `mosquitto_pub -h <broker-host> -p 1883 -t "v1/devices/me/telemetry" -u "${this.gateway.credentials?.credentialsId}" -m '{"key": "value"}'`;
    }
  }
}
