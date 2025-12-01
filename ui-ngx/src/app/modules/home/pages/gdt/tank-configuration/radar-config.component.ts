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

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WidgetContext } from '@home/models/widget-component.models';
import { RadarDeviceService, RadarDevice } from '../shared/services/radar-device.service';
import { RadarConfigService } from '../shared/services/radar-config.service';
import { 
  RadarConfiguration, 
  RadarParameter, 
  RadarWriteOperation,
  RADAR_PARAMETER_DEFINITIONS 
} from '../shared/models/radar-config.model';

/**
 * Componente para configuración de parámetros del Radar TRL/2
 * 
 * Permite:
 * - Seleccionar radar
 * - Editar parámetros del device
 * - Guardar atributos en ThingsBoard
 * 
 * Nota: Una regla de integración de bajada se encarga de enviar
 * la configuración al dispositivo físico vía Modbus RTU
 */
@Component({
  selector: 'tb-radar-config',
  templateUrl: './radar-config.component.html',
  styleUrls: ['./radar-config.component.scss']
})
export class RadarConfigComponent implements OnInit, OnDestroy {

  @Input() ctx: WidgetContext;
  @Input() radars: RadarDevice[] = [];

  // Selected radar
  selectedRadarId: string = '';
  selectedRadar: RadarDevice | null = null;

  // Radar configuration
  radarConfig: RadarConfiguration | null = null;
  hasConfig: boolean = false;

  // Edit mode
  editMode: boolean = false;
  editedParameters: Map<string, number> = new Map();
  originalRadarName: string = '';
  originalModbusAddress: number = 0;

  // Loading states
  loading: boolean = false;
  saving: boolean = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Write confirmation
  showWriteConfirmation: boolean = false;
  parametersToWrite: Array<{ key: string; label: string; currentValue: number; newValue: number }> = [];

  // Write operation tracking
  currentOperation: RadarWriteOperation | null = null;
  showOperationResult: boolean = false;

  // Parameter definitions for display
  parameterKeys = ['tankHeight', 'offsetDistance', 'calibrationDistance', 'bottomHeadDistance', 'holdOffDistance', 'tcl'];

  private subscriptions: Subscription[] = [];

  constructor(
    private radarDeviceService: RadarDeviceService,
    private radarConfigService: RadarConfigService
  ) {}

  ngOnInit(): void {
    // Auto-select first radar if available
    if (this.radars.length > 0 && !this.selectedRadarId) {
      this.selectRadar(this.radars[0].id!.id);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Select radar and load its configuration
   */
  selectRadar(radarId: string): void {
    this.selectedRadarId = radarId;
    this.selectedRadar = this.radars.find(r => r.id!.id === radarId) || null;
    this.error = null;
    this.successMessage = null;
    this.editMode = false;
    this.editedParameters.clear();

    if (this.selectedRadar) {
      this.loadConfiguration();
    }
  }

  /**
   * Load configuration from device attributes
   */
  loadConfiguration(): void {
    if (!this.selectedRadarId) return;

    this.loading = true;
    this.error = null;
    this.editMode = false;
    this.editedParameters.clear();

    const sub = this.radarConfigService.getRadarConfiguration(this.selectedRadarId)
      .subscribe({
        next: (config) => {
          this.radarConfig = config;
          this.hasConfig = config !== null;
          this.loading = false;

          if (config) {
            this.selectedRadar!.name = config.radarName || this.selectedRadar!.name;
          }

          this.ctx.detectChanges();
        },
        error: (err) => {
          console.error('Error loading radar configuration:', err);
          this.error = 'Failed to load radar configuration';
          this.loading = false;
          this.ctx.detectChanges();
        }
      });

    this.subscriptions.push(sub);
  }

  /**
   * Enable edit mode
   */
  enableEditMode(): void {
    if (!this.radarConfig) return;

    this.editMode = true;
    this.editedParameters.clear();

    // Save original values
    this.originalRadarName = this.radarConfig.radarName;
    this.originalModbusAddress = this.radarConfig.modbusAddress;

    // Initialize edited values with current values
    for (const key of this.parameterKeys) {
      const param = (this.radarConfig.parameters as any)[key] as RadarParameter;
      if (param && param.currentValue !== undefined) {
        this.editedParameters.set(key, param.currentValue);
      }
    }

    this.ctx.detectChanges();
  }

  /**
   * Cancel edit mode
   */
  cancelEdit(): void {
    if (this.radarConfig) {
      // Restore original values
      this.radarConfig.radarName = this.originalRadarName;
      this.radarConfig.modbusAddress = this.originalModbusAddress;
    }
    
    this.editMode = false;
    this.editedParameters.clear();
    this.error = null;
    this.ctx.detectChanges();
  }

  /**
   * Get edited value for a parameter
   */
  getEditedValue(paramKey: string): number {
    return this.editedParameters.get(paramKey) || 0;
  }

  /**
   * Set edited value for a parameter
   */
  setEditedValue(paramKey: string, value: number): void {
    this.editedParameters.set(paramKey, value);
  }

  /**
   * Check if parameter has been modified
   */
  isParameterModified(paramKey: string): boolean {
    if (!this.radarConfig) return false;

    const param = (this.radarConfig.parameters as any)[paramKey] as RadarParameter;
    const editedValue = this.editedParameters.get(paramKey);

    if (!param || editedValue === undefined) return false;

    return Math.abs((param.currentValue || 0) - editedValue) > 0.001;
  }

  /**
   * Get modified parameters
   */
  getModifiedParameters(): Array<{ key: string; label: string; currentValue: number; newValue: number }> {
    const modified: Array<{ key: string; label: string; currentValue: number; newValue: number }> = [];

    for (const paramKey of this.parameterKeys) {
      if (this.isParameterModified(paramKey)) {
        const param = (this.radarConfig!.parameters as any)[paramKey] as RadarParameter;
        const newValue = this.editedParameters.get(paramKey)!;

        modified.push({
          key: param.key,
          label: param.label,
          currentValue: param.currentValue || 0,
          newValue
        });
      }
    }

    return modified;
  }

  /**
   * Validate edited parameter
   */
  validateParameter(paramKey: string): { valid: boolean; error?: string } {
    if (!this.radarConfig) return { valid: false, error: 'No configuration loaded' };

    const param = (this.radarConfig.parameters as any)[paramKey] as RadarParameter;
    const value = this.editedParameters.get(paramKey);

    if (value === undefined) return { valid: true };

    if (isNaN(value)) {
      return { valid: false, error: 'Invalid number' };
    }

    if (value < param.minValue || value > param.maxValue) {
      return { valid: false, error: `Value must be between ${param.minValue} and ${param.maxValue}` };
    }

    return { valid: true };
  }

  /**
   * Validate all edited parameters
   */
  validateAllParameters(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const paramKey of this.parameterKeys) {
      if (this.editedParameters.has(paramKey)) {
        const validation = this.validateParameter(paramKey);
        if (!validation.valid) {
          const param = (this.radarConfig!.parameters as any)[paramKey] as RadarParameter;
          errors.push(`${param.label}: ${validation.error}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Prepare write operation
   */
  prepareWrite(): void {
    if (!this.radarConfig) return;

    const validation = this.validateAllParameters();
    
    if (!validation.valid) {
      this.error = `Validation failed:\n${validation.errors.join('\n')}`;
      return;
    }

    const modified = this.getModifiedParameters();

    // Agregar radarName si fue modificado
    if (this.radarConfig.radarName !== this.originalRadarName) {
      modified.push({
        key: 'radarName',
        label: 'Radar Name',
        currentValue: 0, // No aplica para string
        newValue: 0 // No aplica para string
      });
    }

    // Agregar modbusAddress si fue modificado
    if (this.radarConfig.modbusAddress !== this.originalModbusAddress) {
      modified.push({
        key: 'modbus_address',
        label: 'Modbus Address',
        currentValue: this.originalModbusAddress,
        newValue: this.radarConfig.modbusAddress
      });
    }

    if (modified.length === 0) {
      this.error = 'No parameters have been modified';
      return;
    }

    this.parametersToWrite = modified;
    this.showWriteConfirmation = true;
    this.error = null;
    this.ctx.detectChanges();
  }

  /**
   * Cancel write operation
   */
  cancelWrite(): void {
    this.showWriteConfirmation = false;
    this.parametersToWrite = [];
    this.ctx.detectChanges();
  }

  /**
   * Execute write operation
   */
  executeWrite(): void {
    if (!this.selectedRadar || !this.radarConfig) return;

    this.saving = true;
    this.showWriteConfirmation = false;
    this.error = null;

    const parameters = this.parametersToWrite.map(p => ({
      key: p.key,
      value: p.newValue
    }));

    // Agregar radarName y modbusAddress si fueron modificados
    const allParameters: any = {};
    
    parameters.forEach(p => {
      allParameters[p.key] = p.value;
    });

    if (this.radarConfig.radarName !== this.originalRadarName) {
      allParameters['radarName'] = this.radarConfig.radarName;
    }

    if (this.radarConfig.modbusAddress !== this.originalModbusAddress) {
      allParameters['modbus_address'] = this.radarConfig.modbusAddress;
    }

    const sub = this.radarConfigService.saveRadarAttributes(
      this.selectedRadarId,
      allParameters
    ).subscribe({
      next: (operation) => {
        this.currentOperation = operation;
        this.saving = false;

        if (operation.status === 'failed') {
          this.error = operation.error || 'Error al guardar atributos';
        } else {
          this.successMessage = 'Atributos guardados exitosamente';
          this.editMode = false;
          this.editedParameters.clear();
          // Recargar configuración
          this.loadConfiguration();
        }

        this.ctx.detectChanges();
      },
      error: (err) => {
        console.error('Error saving attributes:', err);
        this.error = err.message || 'Error al guardar atributos';
        this.saving = false;
        this.ctx.detectChanges();
      }
    });

    this.subscriptions.push(sub);
  }

  /**
   * Verify write operation
   */
  verifyWrite(): void {
    if (!this.currentOperation) return;

    const parameters = this.currentOperation.parameters.map(p => ({
      key: p.key,
      expectedValue: p.newValue
    }));

    const sub = this.radarConfigService.verifyWriteOperation(this.selectedRadarId, parameters)
      .subscribe({
        next: (results) => {
          if (this.currentOperation) {
            this.currentOperation.results = results;
            this.currentOperation.status = results.every(r => r.success) ? 'completed' : 'failed';
            this.currentOperation.completedAt = new Date();
          }

          const allSuccess = results.every(r => r.success);
          
          if (allSuccess) {
            this.successMessage = 'Parameters written and verified successfully';
            this.editMode = false;
            this.editedParameters.clear();
            // Reload configuration
            this.loadConfiguration();
          } else {
            this.error = 'Some parameters failed verification. Check the results below.';
          }

          this.saving = false;
          this.showOperationResult = true;
          this.ctx.detectChanges();
        },
        error: (err) => {
          console.error('Error verifying write:', err);
          this.error = 'Failed to verify write operation';
          this.saving = false;
          this.showOperationResult = true;
          this.ctx.detectChanges();
        }
      });

    this.subscriptions.push(sub);
  }

  /**
   * Close operation result
   */
  closeOperationResult(): void {
    this.showOperationResult = false;
    this.currentOperation = null;
    this.ctx.detectChanges();
  }

  /**
   * Clear messages
   */
  clearMessages(): void {
    this.error = null;
    this.successMessage = null;
    this.ctx.detectChanges();
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  /**
   * Get available radars for selection
   */
  get availableRadars() {
    return this.radars.filter(r => r.id?.id);
  }

  /**
   * Check if any parameter is modified
   */
  get hasModifications(): boolean {
    if (!this.radarConfig) return false;
    
    // Check if radar name or modbus address changed
    const basicInfoChanged = 
      this.radarConfig.radarName !== this.originalRadarName ||
      this.radarConfig.modbusAddress !== this.originalModbusAddress;
    
    return basicInfoChanged || this.getModifiedParameters().length > 0;
  }
}
