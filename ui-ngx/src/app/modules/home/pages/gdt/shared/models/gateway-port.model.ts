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

/**
 * Port Status Enumeration
 */
export enum PortStatus {
  DISABLED = 'disabled',
  ENABLED = 'enabled',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

/**
 * Port Configuration Interface
 * Represents the configuration for a serial port
 */
export interface PortConfig {
  name: string;
  device: string;
  baudrate: number;
  bytesize: number;
  parity: string;
  stopbits: number;
  timeout: number;
  protocol: string;
  enabled: boolean;
  auto_reconnect: boolean;
  description: string;
}

/**
 * Port Information Interface
 * Represents the complete information about a port including status
 */
export interface PortInfo {
  name: string;
  device: string;
  baudrate: number;
  protocol: string;
  enabled: boolean;
  status: string; // Will be one of PortStatus enum values from backend
  connected: boolean;
  last_error: string | null;
  connected_at: number | null;
  description: string;
}

/**
 * Available Port Interface
 * Represents a serial port available on the system
 */
export interface AvailablePort {
  device: string;
  description: string;
  hwid: string;
  manufacturer: string;
  product: string;
  serial_number: string;
}

/**
 * Gateway Status Interface
 * Represents the overall status of the gateway
 */
export interface GatewayStatus {
  running: boolean;
  total_ports: number;
  connected_ports: number;
  enabled_ports: number;
  disabled_ports: number;
  error_ports: number;
}

/**
 * Message Response Interface
 * Generic response message from API
 */
export interface MessageResponse {
  message: string;
  success: boolean;
}

/**
 * Parity Options
 */
export const PARITY_OPTIONS = [
  { value: 'N', label: 'None' },
  { value: 'E', label: 'Even' },
  { value: 'O', label: 'Odd' },
  { value: 'M', label: 'Mark' },
  { value: 'S', label: 'Space' }
];

/**
 * Baudrate Options
 */
export const BAUDRATE_OPTIONS = [
  1200,
  2400,
  4800,
  9600,
  19200,
  38400,
  57600,
  115200
];

/**
 * Bytesize Options
 */
export const BYTESIZE_OPTIONS = [
  { value: 5, label: '5 bits' },
  { value: 6, label: '6 bits' },
  { value: 7, label: '7 bits' },
  { value: 8, label: '8 bits' }
];

/**
 * Stopbits Options
 */
export const STOPBITS_OPTIONS = [
  { value: 1.0, label: '1' },
  { value: 1.5, label: '1.5' },
  { value: 2.0, label: '2' }
];

/**
 * Protocol Options
 */
export const PROTOCOL_OPTIONS = [
  { value: 'modbus_rtu', label: 'Modbus RTU' },
  { value: 'modbus_tcp', label: 'Modbus TCP' },
  { value: 'enraf', label: 'Enraf' },
  { value: 'varec', label: 'Varec' }
];

/**
 * Helper function to get status display label
 */
export function getStatusLabel(status: PortStatus): string {
  const labels: Record<PortStatus, string> = {
    [PortStatus.DISABLED]: 'Deshabilitado',
    [PortStatus.ENABLED]: 'Habilitado',
    [PortStatus.CONNECTED]: 'Conectado',
    [PortStatus.DISCONNECTED]: 'Desconectado',
    [PortStatus.ERROR]: 'Error'
  };
  return labels[status] || status;
}

/**
 * Helper function to get status color
 */
export function getStatusColor(status: PortStatus): string {
  const colors: Record<PortStatus, string> = {
    [PortStatus.DISABLED]: 'warn',
    [PortStatus.ENABLED]: 'accent',
    [PortStatus.CONNECTED]: 'primary',
    [PortStatus.DISCONNECTED]: 'warn',
    [PortStatus.ERROR]: 'warn'
  };
  return colors[status] || 'accent';
}

/**
 * Default port configuration values
 */
export const DEFAULT_PORT_CONFIG: Partial<PortConfig> = {
  baudrate: 9600,
  bytesize: 8,
  parity: 'N',
  stopbits: 1.0,
  timeout: 1.0,
  protocol: 'modbus_rtu',
  enabled: true,
  auto_reconnect: true,
  description: ''
};
