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
  PortConfig,
  PortInfo,
  AvailablePort,
  BAUDRATE_OPTIONS,
  PARITY_OPTIONS,
  BYTESIZE_OPTIONS,
  STOPBITS_OPTIONS,
  PROTOCOL_OPTIONS,
  DEFAULT_PORT_CONFIG,
  suggestPortName
} from '../../../shared/models/gateway-port.model';

/**
 * Add/Edit Port Dialog Component
 * 
 * Diálogo para crear o editar configuración de puerto serial.
 * 
 * Modos de operación:
 * - Creación: Permite seleccionar puerto disponible y configurar desde cero
 * - Edición: Carga configuración existente y permite modificar parámetros
 * 
 * Características:
 * - Formulario reactivo con validaciones
 * - Selector de puertos disponibles (solo en modo creación)
 * - Auto-completado de campos al seleccionar puerto disponible
 * - Validación de nombre de puerto (solo alfanuméricos y guiones)
 */
@Component({
  selector: 'tb-add-port-dialog',
  templateUrl: './add-port-dialog.component.html',
  styleUrls: ['./add-port-dialog.component.scss']
})
export class AddPortDialogComponent implements OnInit {

  portForm: FormGroup;
  isEdit: boolean;
  availablePorts: AvailablePort[] = [];
  
  // Opciones para los selectores
  baudrateOptions = BAUDRATE_OPTIONS;
  parityOptions = PARITY_OPTIONS;
  bytesizeOptions = BYTESIZE_OPTIONS;
  stopbitsOptions = STOPBITS_OPTIONS;
  protocolOptions = PROTOCOL_OPTIONS;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddPortDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      isEdit: boolean;
      port?: PortInfo;
      availablePorts?: AvailablePort[];
    }
  ) {
    this.isEdit = data.isEdit;
    this.availablePorts = data.availablePorts || [];
  }

  ngOnInit(): void {
    this.buildForm();
    
    if (this.isEdit && this.data.port) {
      this.loadPortData(this.data.port);
    }
  }

  /**
   * Construir formulario reactivo
   */
  private buildForm(): void {
    this.portForm = this.fb.group({
      name: [
        { value: '', disabled: this.isEdit },
        [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern(/^[a-zA-Z0-9_-]+$/)
        ]
      ],
      device: ['', Validators.required],
      baudrate: [DEFAULT_PORT_CONFIG.baudrate, Validators.required],
      bytesize: [DEFAULT_PORT_CONFIG.bytesize, Validators.required],
      parity: [DEFAULT_PORT_CONFIG.parity, Validators.required],
      stopbits: [DEFAULT_PORT_CONFIG.stopbits, Validators.required],
      timeout: [
        DEFAULT_PORT_CONFIG.timeout,
        [Validators.required, Validators.min(0.1), Validators.max(10)]
      ],
      protocol: [DEFAULT_PORT_CONFIG.protocol, Validators.required],
      enabled: [DEFAULT_PORT_CONFIG.enabled],
      auto_reconnect: [DEFAULT_PORT_CONFIG.auto_reconnect],
      description: ['', Validators.maxLength(200)]
    });
  }

  /**
   * Cargar datos de puerto existente (modo edición)
   */
  private loadPortData(port: PortInfo): void {
    this.portForm.patchValue({
      name: port.name,
      device: port.device,
      baudrate: port.baudrate,
      bytesize: port.bytesize,
      parity: port.parity,
      stopbits: port.stopbits,
      timeout: port.timeout,
      protocol: port.protocol,
      enabled: port.enabled,
      auto_reconnect: port.auto_reconnect,
      description: port.description || ''
    });
  }

  /**
   * Seleccionar puerto disponible (solo en modo creación)
   * Auto-completa campos del formulario
   */
  selectAvailablePort(port: AvailablePort): void {
    if (this.isEdit) return;

    // Auto-completar device
    this.portForm.patchValue({
      device: port.device
    });

    // Generar nombre sugerido
    const suggestedName = suggestPortName(port.device);
    this.portForm.patchValue({
      name: suggestedName
    });

    // Auto-completar descripción con info del puerto
    let description = port.description;
    if (port.manufacturer) {
      description += ` - ${port.manufacturer}`;
    }
    if (port.product) {
      description += ` ${port.product}`;
    }
    this.portForm.patchValue({
      description: description.substring(0, 200)
    });
  }

  /**
   * Enviar formulario
   */
  onSubmit(): void {
    if (this.portForm.invalid) {
      Object.keys(this.portForm.controls).forEach(key => {
        this.portForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.portForm.getRawValue();

    if (this.isEdit) {
      // En modo edición, solo enviar campos modificados
      const updates: Partial<PortConfig> = {};
      Object.keys(formValue).forEach(key => {
        if (key !== 'name' && this.portForm.get(key)?.dirty) {
          updates[key] = formValue[key];
        }
      });
      this.dialogRef.close(updates);
    } else {
      // En modo creación, enviar configuración completa
      this.dialogRef.close(formValue as PortConfig);
    }
  }

  /**
   * Cancelar y cerrar diálogo
   */
  onCancel(): void {
    this.dialogRef.close(null);
  }

  /**
   * Obtener mensaje de error para un campo
   */
  getErrorMessage(fieldName: string): string {
    const control = this.portForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return 'Este campo es requerido';
    }
    if (control.errors['minlength']) {
      return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    }
    if (control.errors['maxlength']) {
      return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    }
    if (control.errors['pattern']) {
      return 'Solo se permiten letras, números, guiones y guiones bajos';
    }
    if (control.errors['min']) {
      return `Valor mínimo: ${control.errors['min'].min}`;
    }
    if (control.errors['max']) {
      return `Valor máximo: ${control.errors['max'].max}`;
    }

    return 'Campo inválido';
  }

  /**
   * Verificar si un campo tiene error
   */
  hasError(fieldName: string): boolean {
    const control = this.portForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
