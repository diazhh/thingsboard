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

import { Component, OnInit, Input } from '@angular/core';
import { DeviceDiagnostics } from '../../../shared/models/gateway-monitoring.model';
import { GatewayMonitoringService } from '../../../shared/services/gateway-monitoring.service';

/**
 * Device Diagnostics Panel Component
 * 
 * Displays detailed diagnostics for a specific device.
 */
@Component({
  selector: 'app-device-diagnostics',
  templateUrl: './device-diagnostics.component.html',
  styleUrls: ['./device-diagnostics.component.scss']
})
export class DeviceDiagnosticsComponent implements OnInit {

  @Input() deviceName: string;

  diagnostics: DeviceDiagnostics | null = null;
  isLoading = false;

  constructor(private monitoringService: GatewayMonitoringService) { }

  ngOnInit(): void {
    this.loadDiagnostics();
  }

  loadDiagnostics(): void {
    if (!this.deviceName) {
      return;
    }

    this.isLoading = true;
    this.monitoringService.getDeviceDiagnostics(this.deviceName).subscribe(
      diagnostics => {
        this.diagnostics = diagnostics;
        this.isLoading = false;
      },
      error => {
        console.error('Error loading diagnostics:', error);
        this.isLoading = false;
      }
    );
  }

  getSuccessRate(): number {
    if (!this.diagnostics) return 0;
    const total = this.diagnostics.statistics.totalReads;
    if (total === 0) return 0;
    return (this.diagnostics.statistics.successfulReads / total) * 100;
  }

  getStatusClass(): string {
    return `status-${this.diagnostics?.status || 'offline'}`;
  }

  getStatusIcon(): string {
    switch (this.diagnostics?.status) {
      case 'online':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'cancel';
    }
  }

  formatTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
}
