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

/**
 * Gateway Monitoring Models
 * 
 * Defines interfaces for real-time monitoring and diagnostics.
 */

export interface PortStatus {
  name: string;
  protocol: string;
  connected: boolean;
  lastUpdate: number;
  bytesReceived: number;
  bytesSent: number;
  errorCount: number;
  connectionAttempts: number;
}

export interface DeviceMetrics {
  deviceName: string;
  portName: string;
  lastRead: number;
  readCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastValue?: any;
  status: 'online' | 'offline' | 'error';
}

export interface GatewayMetrics {
  timestamp: number;
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  activePorts: number;
  totalDevices: number;
  totalErrors: number;
  averageLatency: number;
}

export interface DiagnosticEvent {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  details?: any;
}

export interface PortDiagnostics {
  portName: string;
  protocol: string;
  connected: boolean;
  connectionTime: number;
  lastError?: string;
  lastErrorTime?: number;
  statistics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
  };
}

export interface DeviceDiagnostics {
  deviceName: string;
  portName: string;
  protocol: string;
  lastUpdate: number;
  status: 'online' | 'offline' | 'error';
  statistics: {
    totalReads: number;
    successfulReads: number;
    failedReads: number;
    averageReadTime: number;
    lastValue?: any;
    lastError?: string;
  };
}

export interface ErrorLog {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  message: string;
  source: string;
  stackTrace?: string;
  resolved: boolean;
}

export interface PerformanceMetric {
  timestamp: number;
  metric: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface MonitoringState {
  ports: PortStatus[];
  devices: DeviceMetrics[];
  gatewayMetrics: GatewayMetrics;
  diagnosticEvents: DiagnosticEvent[];
  errorLogs: ErrorLog[];
  performanceMetrics: PerformanceMetric[];
}
