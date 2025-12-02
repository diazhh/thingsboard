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
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { ActionNotificationShow } from '@core/notification/notification.actions';
import { DialogService } from '@core/services/dialog.service';
import { GatewayApiService } from '../../../shared/services/gateway-api.service';
import {
  PortInfo,
  PortConfig,
  PortStatus,
  AvailablePort,
  GatewayStatus,
  getStatusLabel,
  getStatusColor
} from '../../../shared/models/gateway-port.model';
import { AddPortDialogComponent, AddPortDialogData } from '../add-port-dialog/add-port-dialog.component';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'tb-port-list',
  templateUrl: './port-list.component.html',
  styleUrls: ['./port-list.component.scss']
})
export class PortListComponent implements OnInit, OnDestroy {

  displayedColumns: string[] = ['name', 'device', 'protocol', 'baudrate', 'status', 'description', 'actions'];
  dataSource = new MatTableDataSource<PortInfo>([]);

  isLoading = false;
  gatewayStatus: GatewayStatus | null = null;
  availablePorts: AvailablePort[] = [];

  private destroy$ = new Subject<void>();
  private refreshInterval$ = interval(5000); // Refresh every 5 seconds

  constructor(
    private gatewayApiService: GatewayApiService,
    private dialog: MatDialog,
    private dialogService: DialogService,
    private store: Store<AppState>
  ) {}

  ngOnInit(): void {
    this.loadPorts();
    this.loadGatewayStatus();
    this.loadAvailablePorts();

    // Auto-refresh ports
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

  loadPorts(silent: boolean = false): void {
    if (!silent) {
      this.isLoading = true;
    }

    this.gatewayApiService.listPorts().subscribe({
      next: (ports) => {
        this.dataSource.data = ports;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading ports:', error);
        this.isLoading = false;
        if (!silent) {
          this.store.dispatch(new ActionNotificationShow({
            message: 'Error al cargar los puertos. Verifique que el Gateway esté en ejecución.',
            type: 'error'
          }));
        }
      }
    });
  }

  loadGatewayStatus(): void {
    this.gatewayApiService.getStatus().subscribe({
      next: (status) => {
        this.gatewayStatus = status;
      },
      error: (error) => {
        console.error('Error loading gateway status:', error);
      }
    });
  }

  loadAvailablePorts(): void {
    this.gatewayApiService.listAvailablePorts().subscribe({
      next: (ports) => {
        this.availablePorts = ports;
      },
      error: (error) => {
        console.error('Error loading available ports:', error);
      }
    });
  }

  openAddPortDialog(): void {
    const dialogRef = this.dialog.open(AddPortDialogComponent, {
      width: '700px',
      data: {
        availablePorts: this.availablePorts
      } as AddPortDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createPort(result);
      }
    });
  }

  openEditPortDialog(port: PortInfo): void {
    const dialogRef = this.dialog.open(AddPortDialogComponent, {
      width: '700px',
      data: {
        availablePorts: this.availablePorts,
        existingPort: port,
        isEdit: true
      } as AddPortDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updatePort(port.name, result);
      }
    });
  }

  createPort(config: PortConfig): void {
    this.isLoading = true;
    this.gatewayApiService.createPort(config).subscribe({
      next: (response) => {
        this.store.dispatch(new ActionNotificationShow({
          message: `Puerto "${config.name}" creado exitosamente`,
          type: 'success'
        }));
        this.loadPorts();
        this.loadAvailablePorts(); // Refresh available ports
      },
      error: (error) => {
        this.isLoading = false;
        this.store.dispatch(new ActionNotificationShow({
          message: `Error al crear puerto: ${error.error?.message || error.message}`,
          type: 'error'
        }));
      }
    });
  }

  updatePort(portName: string, updates: Partial<PortConfig>): void {
    this.isLoading = true;
    this.gatewayApiService.updatePort(portName, updates).subscribe({
      next: (response) => {
        this.store.dispatch(new ActionNotificationShow({
          message: `Puerto "${portName}" actualizado exitosamente`,
          type: 'success'
        }));
        this.loadPorts();
      },
      error: (error) => {
        this.isLoading = false;
        this.store.dispatch(new ActionNotificationShow({
          message: `Error al actualizar puerto: ${error.error?.message || error.message}`,
          type: 'error'
        }));
      }
    });
  }

  deletePort(port: PortInfo): void {
    this.dialogService.confirm(
      'Eliminar Puerto',
      `¿Está seguro de eliminar el puerto "${port.name}"? Esta acción no se puede deshacer.`
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.performDeletePort(port.name);
      }
    });
  }

  private performDeletePort(portName: string): void {
    this.isLoading = true;
    this.gatewayApiService.deletePort(portName).subscribe({
      next: (response) => {
        this.store.dispatch(new ActionNotificationShow({
          message: `Puerto "${portName}" eliminado exitosamente`,
          type: 'success'
        }));
        this.loadPorts();
        this.loadAvailablePorts(); // Refresh available ports
      },
      error: (error) => {
        this.isLoading = false;
        this.store.dispatch(new ActionNotificationShow({
          message: `Error al eliminar puerto: ${error.error?.message || error.message}`,
          type: 'error'
        }));
      }
    });
  }

  enablePort(port: PortInfo): void {
    this.isLoading = true;
    this.gatewayApiService.enablePort(port.name).subscribe({
      next: (response) => {
        this.store.dispatch(new ActionNotificationShow({
          message: `Puerto "${port.name}" habilitado`,
          type: 'success'
        }));
        this.loadPorts();
      },
      error: (error) => {
        this.isLoading = false;
        this.store.dispatch(new ActionNotificationShow({
          message: `Error al habilitar puerto: ${error.error?.message || error.message}`,
          type: 'error'
        }));
      }
    });
  }

  disablePort(port: PortInfo): void {
    this.isLoading = true;
    this.gatewayApiService.disablePort(port.name).subscribe({
      next: (response) => {
        this.store.dispatch(new ActionNotificationShow({
          message: `Puerto "${port.name}" deshabilitado`,
          type: 'success'
        }));
        this.loadPorts();
      },
      error: (error) => {
        this.isLoading = false;
        this.store.dispatch(new ActionNotificationShow({
          message: `Error al deshabilitar puerto: ${error.error?.message || error.message}`,
          type: 'error'
        }));
      }
    });
  }

  togglePortEnabled(port: PortInfo): void {
    if (port.enabled) {
      this.disablePort(port);
    } else {
      this.enablePort(port);
    }
  }

  refreshPorts(): void {
    this.loadPorts();
    this.loadGatewayStatus();
    this.loadAvailablePorts();
  }

  getStatusLabel(status: string): string {
    return getStatusLabel(status as PortStatus);
  }

  getStatusColor(status: string): string {
    return getStatusColor(status as PortStatus);
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'disabled': 'power_off',
      'enabled': 'power',
      'connected': 'check_circle',
      'disconnected': 'cancel',
      'error': 'error'
    };
    return icons[status] || 'help';
  }

  formatTimestamp(timestamp: number | null): string {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString('es-ES');
  }
}
