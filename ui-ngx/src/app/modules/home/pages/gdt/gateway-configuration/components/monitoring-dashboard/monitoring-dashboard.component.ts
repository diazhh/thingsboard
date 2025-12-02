/*
 * Copyright © 2024 GDT - Grupo de Desarrollo Tecnológico
 * Licensed under the Apache License, Version 2.0
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  MonitoringState,
  PortStatus,
  DeviceMetrics,
  GatewayMetrics
} from '../../../shared/models/gateway-monitoring.model';
import { GatewayMonitoringService } from '../../../shared/services/gateway-monitoring.service';

/**
 * Real-time Monitoring Dashboard Component
 * 
 * Displays real-time metrics and status for gateway ports and devices.
 */
@Component({
  selector: 'app-monitoring-dashboard',
  templateUrl: './monitoring-dashboard.component.html',
  styleUrls: ['./monitoring-dashboard.component.scss']
})
export class MonitoringDashboardComponent implements OnInit, OnDestroy {

  monitoringState: MonitoringState | null = null;
  isMonitoring = false;
  autoRefreshInterval = 5000;

  private destroy$ = new Subject<void>();

  constructor(private monitoringService: GatewayMonitoringService) { }

  ngOnInit(): void {
    this.startMonitoring();
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
    this.destroy$.next();
    this.destroy$.complete();
  }

  startMonitoring(): void {
    this.isMonitoring = true;
    this.monitoringService.startMonitoring(this.autoRefreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        state => {
          this.monitoringState = state;
        },
        error => {
          console.error('Monitoring error:', error);
          this.isMonitoring = false;
        }
      );
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    this.monitoringService.stopMonitoring();
  }

  toggleMonitoring(): void {
    if (this.isMonitoring) {
      this.stopMonitoring();
    } else {
      this.startMonitoring();
    }
  }

  getGatewayMetrics(): GatewayMetrics | undefined {
    return this.monitoringState?.gatewayMetrics;
  }

  getPorts(): PortStatus[] {
    return this.monitoringState?.ports || [];
  }

  getDevices(): DeviceMetrics[] {
    return this.monitoringState?.devices || [];
  }

  getPortStatusClass(port: PortStatus): string {
    return port.connected ? 'connected' : 'disconnected';
  }

  getDeviceStatusClass(device: DeviceMetrics): string {
    return device.status === 'online' ? 'online' : device.status === 'error' ? 'error' : 'offline';
  }

  getPortStatusIcon(port: PortStatus): string {
    return port.connected ? 'cloud_done' : 'cloud_off';
  }

  getDeviceStatusIcon(device: DeviceMetrics): string {
    switch (device.status) {
      case 'online':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'cancel';
    }
  }

  formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
