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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { AppState } from '@core/core.state';
import { ActionNotificationShow } from '@core/notification/notification.actions';

import { GatewayApiService } from '../../../shared/services/gateway-api.service';
import { PortInfo } from '../../../shared/models/gateway-port.model';
import {
  DiscoveryConfig,
  DiscoveryState,
  DiscoveredDevice,
  DiscoveryStatus,
  DISCOVERY_BAUDRATE_PRESETS,
  ADDRESS_RANGE_PRESETS,
  DEFAULT_DISCOVERY_CONFIG,
  estimateDiscoveryTime,
  formatEstimatedTime,
  validateDiscoveryConfig,
  getDiscoveryStatusLabel,
  getDiscoveryStatusColor,
  getDiscoveryStatusIcon
} from '../../../shared/models/device-discovery.model';

/**
 * Device Discovery Component
 * 
 * Componente para descubrir dispositivos Modbus RTU conectados a puertos seriales.
 * 
 * Características:
 * - Configuración de parámetros de escaneo
 * - Progreso en tiempo real
 * - Lista de dispositivos descubiertos
 * - Provisioning a ThingsBoard
 */
@Component({
  selector: 'tb-device-discovery',
  templateUrl: './device-discovery.component.html',
  styleUrls: ['./device-discovery.component.scss']
})
export class DeviceDiscoveryComponent implements OnInit, OnDestroy {

  discoveryForm: FormGroup;
  
  // Estado del componente
  isLoading = false;
  availablePorts: PortInfo[] = [];
  discoveryState: DiscoveryState | null = null;
  discoveredDevices: DiscoveredDevice[] = [];
  
  // Presets
  baudratePresets = DISCOVERY_BAUDRATE_PRESETS;
  addressRangePresets = ADDRESS_RANGE_PRESETS;
  
  // Subject para cleanup
  private destroy$ = new Subject<void>();
  
  // Polling para estado de discovery
  private discoveryPoll$ = interval(1000);

  constructor(
    private fb: FormBuilder,
    private gatewayApiService: GatewayApiService,
    private store: Store<AppState>
  ) {}

  ngOnInit(): void {
    console.log('[DeviceDiscoveryComponent] Initializing...');
    this.buildForm();
    this.loadAvailablePorts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // FORM MANAGEMENT
  // ============================================================================

  /**
   * Construir formulario de configuración
   */
  private buildForm(): void {
    this.discoveryForm = this.fb.group({
      port_name: ['', Validators.required],
      start_address: [DEFAULT_DISCOVERY_CONFIG.start_address, [
        Validators.required,
        Validators.min(1),
        Validators.max(247)
      ]],
      end_address: [DEFAULT_DISCOVERY_CONFIG.end_address, [
        Validators.required,
        Validators.min(1),
        Validators.max(247)
      ]],
      baudrates: [DEFAULT_DISCOVERY_CONFIG.baudrates, Validators.required],
      timeout: [DEFAULT_DISCOVERY_CONFIG.timeout, [
        Validators.required,
        Validators.min(0.1),
        Validators.max(5)
      ]],
      protocol: [DEFAULT_DISCOVERY_CONFIG.protocol]
    });
  }

  /**
   * Cargar puertos disponibles
   */
  private loadAvailablePorts(): void {
    this.isLoading = true;
    
    this.gatewayApiService.listPorts().subscribe({
      next: (ports) => {
        // Solo mostrar puertos habilitados y conectados
        this.availablePorts = ports.filter(p => p.enabled && p.status === 'connected');
        this.isLoading = false;
        
        // Auto-seleccionar primer puerto si hay solo uno
        if (this.availablePorts.length === 1) {
          this.discoveryForm.patchValue({
            port_name: this.availablePorts[0].name
          });
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.store.dispatch(new ActionNotificationShow({
          message: error.message || 'Error al cargar puertos',
          type: 'error',
          duration: 5000
        }));
      }
    });
  }

  // ============================================================================
  // DISCOVERY OPERATIONS
  // ============================================================================

  /**
   * Iniciar discovery
   */
  startDiscovery(): void {
    if (this.discoveryForm.invalid) {
      Object.keys(this.discoveryForm.controls).forEach(key => {
        this.discoveryForm.get(key)?.markAsTouched();
      });
      return;
    }

    const config: DiscoveryConfig = this.discoveryForm.value;
    
    // Validar configuración
    const validationError = validateDiscoveryConfig(config);
    if (validationError) {
      this.store.dispatch(new ActionNotificationShow({
        message: validationError,
        type: 'error',
        duration: 5000
      }));
      return;
    }

    this.isLoading = true;
    this.discoveredDevices = [];

    this.gatewayApiService.startModbusRtuDiscovery(
      config.port_name,
      config.start_address,
      config.end_address,
      config.baudrates
    ).subscribe({
      next: (response) => {
        this.store.dispatch(new ActionNotificationShow({
          message: 'Discovery iniciado exitosamente',
          type: 'success',
          duration: 3000
        }));
        this.isLoading = false;
        this.startPolling();
      },
      error: (error) => {
        this.isLoading = false;
        this.store.dispatch(new ActionNotificationShow({
          message: error.message || 'Error al iniciar discovery',
          type: 'error',
          duration: 5000
        }));
      }
    });
  }

  /**
   * Cancelar discovery en progreso
   */
  cancelDiscovery(): void {
    // TODO: Implementar endpoint de cancelación en backend
    this.store.dispatch(new ActionNotificationShow({
      message: 'Cancelación de discovery no implementada aún',
      type: 'info',
      duration: 3000
    }));
  }

  /**
   * Iniciar polling del estado de discovery
   */
  private startPolling(): void {
    this.discoveryPoll$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.gatewayApiService.getDiscoveryStatus())
      )
      .subscribe({
        next: (state: any) => {
          this.discoveryState = state;
          
          // Si el discovery terminó, cargar resultados
          if (state.status === DiscoveryStatus.COMPLETED || 
              state.status === DiscoveryStatus.ERROR ||
              state.status === DiscoveryStatus.CANCELLED) {
            this.loadDiscoveryResults();
            this.stopPolling();
          }
        },
        error: (error) => {
          console.error('[DeviceDiscoveryComponent] Error polling status:', error);
        }
      });
  }

  /**
   * Detener polling
   */
  private stopPolling(): void {
    this.destroy$.next();
  }

  /**
   * Cargar resultados del discovery
   */
  private loadDiscoveryResults(): void {
    this.gatewayApiService.getDiscoveryResults().subscribe({
      next: (devices) => {
        this.discoveredDevices = devices;
        
        if (devices.length > 0) {
          this.store.dispatch(new ActionNotificationShow({
            message: `Discovery completado: ${devices.length} dispositivo(s) encontrado(s)`,
            type: 'success',
            duration: 5000
          }));
        } else {
          this.store.dispatch(new ActionNotificationShow({
            message: 'Discovery completado: No se encontraron dispositivos',
            type: 'info',
            duration: 5000
          }));
        }
      },
      error: (error) => {
        console.error('[DeviceDiscoveryComponent] Error loading results:', error);
      }
    });
  }

  // ============================================================================
  // PRESET HANDLERS
  // ============================================================================

  /**
   * Aplicar preset de baudrates
   */
  applyBaudratePreset(preset: { label: string; baudrates: number[] }): void {
    this.discoveryForm.patchValue({
      baudrates: preset.baudrates
    });
  }

  /**
   * Aplicar preset de rango de direcciones
   */
  applyAddressRangePreset(preset: { label: string; start: number; end: number }): void {
    this.discoveryForm.patchValue({
      start_address: preset.start,
      end_address: preset.end
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calcula el tiempo estimado de discovery
   */
  getEstimatedTime(): string {
    if (this.discoveryForm.invalid) {
      return 'N/A';
    }
    
    const config: DiscoveryConfig = this.discoveryForm.value;
    const seconds = estimateDiscoveryTime(config);
    return formatEstimatedTime(seconds);
  }

  /**
   * Verifica si el discovery está en progreso
   */
  isDiscoveryRunning(): boolean {
    return this.discoveryState?.status === DiscoveryStatus.RUNNING;
  }

  /**
   * Obtiene el label del estado
   */
  getStatusLabel(): string {
    if (!this.discoveryState) return 'Inactivo';
    return getDiscoveryStatusLabel(this.discoveryState.status);
  }

  /**
   * Obtiene el color del estado
   */
  getStatusColor(): string {
    if (!this.discoveryState) return '#9e9e9e';
    return getDiscoveryStatusColor(this.discoveryState.status);
  }

  /**
   * Obtiene el icono del estado
   */
  getStatusIcon(): string {
    if (!this.discoveryState) return 'radio_button_unchecked';
    return getDiscoveryStatusIcon(this.discoveryState.status);
  }

  /**
   * Obtiene mensaje de error para un campo
   */
  getErrorMessage(fieldName: string): string {
    const control = this.discoveryForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return 'Este campo es requerido';
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
   * Verifica si un campo tiene error
   */
  hasError(fieldName: string): boolean {
    const control = this.discoveryForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
