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
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { AppState } from '@core/core.state';
import { DialogService } from '@core/services/dialog.service';
import { ActionNotificationShow } from '@core/notification/notification.actions';

import { GatewayApiService } from '../../../shared/services/gateway-api.service';
import {
  PortInfo,
  AvailablePort,
  GatewayStatus,
  PortConfig,
  getStatusLabel,
  getStatusColor,
  getStatusIcon
} from '../../../shared/models/gateway-port.model';
import { AddPortDialogComponent } from '../add-port-dialog/add-port-dialog.component';

/**
 * Port List Component
 * 
 * Componente para gestionar puertos seriales del Gateway GDT.
 * Permite crear, editar, habilitar/deshabilitar y eliminar puertos.
 * 
 * Características:
 * - Tabla de puertos con estado en tiempo real
 * - Auto-refresh cada 5 segundos
 * - Lista de puertos disponibles del sistema
 * - Tarjeta de estado del gateway
 * - Operaciones CRUD completas
 */
@Component({
  selector: 'tb-port-list',
  templateUrl: './port-list.component.html',
  styleUrls: ['./port-list.component.scss']
})
export class PortListComponent implements OnInit, OnDestroy {

  // Columnas de la tabla
  displayedColumns: string[] = ['name', 'device', 'protocol', 'baudrate', 'status', 'description', 'actions'];
  
  // Data source para la tabla
  dataSource = new MatTableDataSource<PortInfo>([]);
  
  // Estado del componente
  isLoading = false;
  gatewayStatus: GatewayStatus | null = null;
  availablePorts: AvailablePort[] = [];
  
  // Subject para cleanup de subscriptions
  private destroy$ = new Subject<void>();
  
  // Intervalo de auto-refresh (5 segundos)
  private refreshInterval$ = interval(5000);

  constructor(
    private gatewayApiService: GatewayApiService,
    private dialog: MatDialog,
    private dialogService: DialogService,
    private store: Store<AppState>
  ) {}

  ngOnInit(): void {
    console.log('[PortListComponent] Initializing...');
    
    // Carga inicial
    this.loadPorts();
    this.loadGatewayStatus();
    this.loadAvailablePorts();
    
    // Auto-refresh cada 5 segundos
    this.refreshInterval$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadPorts(true); // Silent refresh
        this.loadGatewayStatus();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Cargar lista de puertos configurados
   * @param silent - Si es true, no muestra spinner de carga
   */
  loadPorts(silent: boolean = false): void {
    if (!silent) {
      this.isLoading = true;
    }

    this.gatewayApiService.listPorts().subscribe({
      next: (ports) => {
        this.dataSource.data = ports;
        this.isLoading = false;
        if (!silent) {
          console.log('[PortListComponent] Loaded ports:', ports.length);
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('[PortListComponent] Error loading ports:', error);
        
        if (!silent) {
          this.store.dispatch(new ActionNotificationShow({
            message: error.message || 'Error al cargar los puertos',
            type: 'error',
            duration: 5000
          }));
        }
      }
    });
  }

  /**
   * Cargar estado general del gateway
   */
  loadGatewayStatus(): void {
    this.gatewayApiService.getGatewayStatus().subscribe({
      next: (status) => {
        this.gatewayStatus = status;
      },
      error: (error) => {
        console.error('[PortListComponent] Error loading gateway status:', error);
        this.gatewayStatus = null;
      }
    });
  }

  /**
   * Cargar puertos disponibles del sistema
   */
  loadAvailablePorts(): void {
    this.gatewayApiService.listAvailablePorts().subscribe({
      next: (ports) => {
        this.availablePorts = ports;
        console.log('[PortListComponent] Available ports:', ports.length);
      },
      error: (error) => {
        console.error('[PortListComponent] Error loading available ports:', error);
        this.availablePorts = [];
      }
    });
  }

  // ============================================================================
  // PORT OPERATIONS
  // ============================================================================

  /**
   * Abrir diálogo para crear nuevo puerto
   */
  openAddPortDialog(): void {
    const dialogRef = this.dialog.open(AddPortDialogComponent, {
      width: '700px',
      data: {
        isEdit: false,
        availablePorts: this.availablePorts
      }
    });

    dialogRef.afterClosed().subscribe((result: PortConfig | null) => {
      if (result) {
        this.createPort(result);
      }
    });
  }

  /**
   * Abrir diálogo para editar puerto existente
   */
  openEditPortDialog(port: PortInfo): void {
    const dialogRef = this.dialog.open(AddPortDialogComponent, {
      width: '700px',
      data: {
        isEdit: true,
        port: port,
        availablePorts: this.availablePorts
      }
    });

    dialogRef.afterClosed().subscribe((updates: Partial<PortConfig> | null) => {
      if (updates) {
        this.updatePort(port.name, updates);
      }
    });
  }

  /**
   * Crear nuevo puerto
   */
  private createPort(config: PortConfig): void {
    this.isLoading = true;

    this.gatewayApiService.createPort(config).subscribe({
      next: (response) => {
        this.store.dispatch(new ActionNotificationShow({
          message: `Puerto "${config.name}" creado exitosamente`,
          type: 'success',
          duration: 3000
        }));
        this.loadPorts();
        this.loadAvailablePorts(); // Actualizar lista de disponibles
      },
      error: (error) => {
        this.isLoading = false;
        this.store.dispatch(new ActionNotificationShow({
          message: error.message || 'Error al crear el puerto',
          type: 'error',
          duration: 5000
        }));
      }
    });
  }

  /**
   * Actualizar configuración de puerto
   */
  private updatePort(portName: string, updates: Partial<PortConfig>): void {
    this.isLoading = true;

    this.gatewayApiService.updatePort(portName, updates).subscribe({
      next: (response) => {
        this.store.dispatch(new ActionNotificationShow({
          message: `Puerto "${portName}" actualizado exitosamente`,
          type: 'success',
          duration: 3000
        }));
        this.loadPorts();
      },
      error: (error) => {
        this.isLoading = false;
        this.store.dispatch(new ActionNotificationShow({
          message: error.message || 'Error al actualizar el puerto',
          type: 'error',
          duration: 5000
        }));
      }
    });
  }

  /**
   * Eliminar puerto (con confirmación)
   */
  deletePort(port: PortInfo): void {
    this.dialogService.confirm(
      'Eliminar Puerto',
      `¿Está seguro de que desea eliminar el puerto "${port.name}"?`,
      'Cancelar',
      'Eliminar'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.performDeletePort(port.name);
      }
    });
  }

  /**
   * Ejecutar eliminación de puerto
   */
  private performDeletePort(portName: string): void {
    this.isLoading = true;

    this.gatewayApiService.deletePort(portName).subscribe({
      next: (response) => {
        this.store.dispatch(new ActionNotificationShow({
          message: `Puerto "${portName}" eliminado exitosamente`,
          type: 'success',
          duration: 3000
        }));
        this.loadPorts();
        this.loadAvailablePorts(); // Actualizar lista de disponibles
      },
      error: (error) => {
        this.isLoading = false;
        this.store.dispatch(new ActionNotificationShow({
          message: error.message || 'Error al eliminar el puerto',
          type: 'error',
          duration: 5000
        }));
      }
    });
  }

  /**
   * Toggle enable/disable de puerto
   */
  togglePortEnabled(port: PortInfo): void {
    if (port.enabled) {
      this.disablePort(port);
    } else {
      this.enablePort(port);
    }
  }

  /**
   * Habilitar puerto
   */
  private enablePort(port: PortInfo): void {
    this.gatewayApiService.enablePort(port.name).subscribe({
      next: (response) => {
        this.store.dispatch(new ActionNotificationShow({
          message: `Puerto "${port.name}" habilitado`,
          type: 'success',
          duration: 2000
        }));
        this.loadPorts();
      },
      error: (error) => {
        this.store.dispatch(new ActionNotificationShow({
          message: error.message || 'Error al habilitar el puerto',
          type: 'error',
          duration: 5000
        }));
      }
    });
  }

  /**
   * Deshabilitar puerto
   */
  private disablePort(port: PortInfo): void {
    this.gatewayApiService.disablePort(port.name).subscribe({
      next: (response) => {
        this.store.dispatch(new ActionNotificationShow({
          message: `Puerto "${port.name}" deshabilitado`,
          type: 'success',
          duration: 2000
        }));
        this.loadPorts();
      },
      error: (error) => {
        this.store.dispatch(new ActionNotificationShow({
          message: error.message || 'Error al deshabilitar el puerto',
          type: 'error',
          duration: 5000
        }));
      }
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Obtiene el label del estado
   */
  getStatusLabel(status: string): string {
    return getStatusLabel(status as any);
  }

  /**
   * Obtiene el color del estado
   */
  getStatusColor(status: string): string {
    return getStatusColor(status as any);
  }

  /**
   * Obtiene el icono del estado
   */
  getStatusIcon(status: string): string {
    return getStatusIcon(status as any);
  }

  /**
   * Refresh manual de datos
   */
  refreshData(): void {
    this.loadPorts();
    this.loadGatewayStatus();
    this.loadAvailablePorts();
  }
}
