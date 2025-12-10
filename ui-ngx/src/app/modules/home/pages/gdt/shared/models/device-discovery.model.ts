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
 * Copyright © 2024 IOTEC SpA. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Device Discovery Models
 * 
 * Modelos TypeScript para el descubrimiento de dispositivos Modbus RTU.
 * Sincronizado con el backend Python Gateway.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Estados del proceso de discovery
 */
export enum DiscoveryStatus {
  IDLE = 'idle',           // No hay discovery en ejecución
  RUNNING = 'running',     // Discovery en progreso
  COMPLETED = 'completed', // Discovery completado exitosamente
  CANCELLED = 'cancelled', // Discovery cancelado por el usuario
  ERROR = 'error'          // Discovery con error
}

/**
 * Tipo de dispositivo descubierto
 */
export enum DeviceType {
  RADAR = 'radar',
  TEMPERATURE_SENSOR = 'temperature_sensor',
  PRESSURE_SENSOR = 'pressure_sensor',
  LEVEL_SENSOR = 'level_sensor',
  UNKNOWN = 'unknown'
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuración para iniciar discovery
 */
export interface DiscoveryConfig {
  port_name: string;           // Nombre del puerto a escanear
  start_address: number;       // Dirección inicial (1-247)
  end_address: number;         // Dirección final (1-247)
  baudrates: number[];         // Lista de baudrates a probar
  timeout?: number;            // Timeout por dirección (segundos)
  protocol?: string;           // Protocolo (default: modbus_rtu)
}

/**
 * Estado del proceso de discovery
 */
export interface DiscoveryState {
  status: DiscoveryStatus;     // Estado actual
  progress: number;            // Progreso 0-100
  current_address?: number;    // Dirección actual siendo escaneada
  current_baudrate?: number;   // Baudrate actual
  devices_found: number;       // Cantidad de dispositivos encontrados
  started_at?: number;         // Timestamp de inicio
  completed_at?: number;       // Timestamp de finalización
  error_message?: string;      // Mensaje de error si aplica
}

/**
 * Dispositivo descubierto
 */
export interface DiscoveredDevice {
  address: number;             // Dirección Modbus
  baudrate: number;            // Baudrate detectado
  port_name: string;           // Puerto donde fue encontrado
  device_type: DeviceType;     // Tipo de dispositivo
  manufacturer?: string;       // Fabricante (si se puede detectar)
  model?: string;              // Modelo (si se puede detectar)
  serial_number?: string;      // Número de serie
  firmware_version?: string;   // Versión de firmware
  registers_read: number;      // Cantidad de registros leídos
  response_time_ms: number;    // Tiempo de respuesta promedio
  discovered_at: number;       // Timestamp de descubrimiento
  metadata?: Record<string, any>; // Metadata adicional
}

/**
 * Resultado completo del discovery
 */
export interface DiscoveryResult {
  session_id: string;          // ID único de la sesión
  config: DiscoveryConfig;     // Configuración usada
  state: DiscoveryState;       // Estado final
  devices: DiscoveredDevice[]; // Dispositivos encontrados
  scan_summary: {
    total_addresses_scanned: number;
    total_baudrates_tested: number;
    total_time_seconds: number;
    success_rate: number;      // Porcentaje de respuestas exitosas
  };
}

/**
 * Configuración para provisioning de dispositivo
 */
export interface DeviceProvisioningConfig {
  discovered_device: DiscoveredDevice;
  asset_name: string;          // Nombre del asset en ThingsBoard
  asset_label?: string;        // Label del asset
  tank_id?: string;            // ID del tanque asociado (opcional)
  additional_attributes?: Record<string, any>; // Atributos adicionales
}

/**
 * Resultado del provisioning
 */
export interface ProvisioningResult {
  success: boolean;
  asset_id?: string;           // ID del asset creado
  device_id?: string;          // ID del device creado
  message: string;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Baudrates comunes para discovery
 */
export const DISCOVERY_BAUDRATE_PRESETS = [
  { label: 'Rápido (9600, 19200)', baudrates: [9600, 19200] },
  { label: 'Completo (9600-115200)', baudrates: [9600, 19200, 38400, 57600, 115200] },
  { label: 'Extendido (Todos)', baudrates: [4800, 9600, 19200, 38400, 57600, 115200, 230400] }
];

/**
 * Rangos de direcciones comunes
 */
export const ADDRESS_RANGE_PRESETS = [
  { label: 'Rápido (1-10)', start: 1, end: 10 },
  { label: 'Estándar (1-50)', start: 1, end: 50 },
  { label: 'Completo (1-247)', start: 1, end: 247 }
];

/**
 * Configuración por defecto para discovery
 */
export const DEFAULT_DISCOVERY_CONFIG: Partial<DiscoveryConfig> = {
  start_address: 1,
  end_address: 50,
  baudrates: [9600, 19200],
  timeout: 0.5,
  protocol: 'modbus_rtu'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtiene el label del estado de discovery
 */
export function getDiscoveryStatusLabel(status: DiscoveryStatus): string {
  const labels: Record<DiscoveryStatus, string> = {
    [DiscoveryStatus.IDLE]: 'Inactivo',
    [DiscoveryStatus.RUNNING]: 'Escaneando',
    [DiscoveryStatus.COMPLETED]: 'Completado',
    [DiscoveryStatus.CANCELLED]: 'Cancelado',
    [DiscoveryStatus.ERROR]: 'Error'
  };
  return labels[status] || status;
}

/**
 * Obtiene el color del estado de discovery
 */
export function getDiscoveryStatusColor(status: DiscoveryStatus): string {
  const colors: Record<DiscoveryStatus, string> = {
    [DiscoveryStatus.IDLE]: '#9e9e9e',
    [DiscoveryStatus.RUNNING]: '#2196f3',
    [DiscoveryStatus.COMPLETED]: '#4caf50',
    [DiscoveryStatus.CANCELLED]: '#ff9800',
    [DiscoveryStatus.ERROR]: '#f44336'
  };
  return colors[status] || '#9e9e9e';
}

/**
 * Obtiene el icono del estado de discovery
 */
export function getDiscoveryStatusIcon(status: DiscoveryStatus): string {
  const icons: Record<DiscoveryStatus, string> = {
    [DiscoveryStatus.IDLE]: 'radio_button_unchecked',
    [DiscoveryStatus.RUNNING]: 'sync',
    [DiscoveryStatus.COMPLETED]: 'check_circle',
    [DiscoveryStatus.CANCELLED]: 'cancel',
    [DiscoveryStatus.ERROR]: 'error'
  };
  return icons[status] || 'help_outline';
}

/**
 * Obtiene el label del tipo de dispositivo
 */
export function getDeviceTypeLabel(type: DeviceType): string {
  const labels: Record<DeviceType, string> = {
    [DeviceType.RADAR]: 'Radar de Nivel',
    [DeviceType.TEMPERATURE_SENSOR]: 'Sensor de Temperatura',
    [DeviceType.PRESSURE_SENSOR]: 'Sensor de Presión',
    [DeviceType.LEVEL_SENSOR]: 'Sensor de Nivel',
    [DeviceType.UNKNOWN]: 'Desconocido'
  };
  return labels[type] || type;
}

/**
 * Obtiene el icono del tipo de dispositivo
 */
export function getDeviceTypeIcon(type: DeviceType): string {
  const icons: Record<DeviceType, string> = {
    [DeviceType.RADAR]: 'radar',
    [DeviceType.TEMPERATURE_SENSOR]: 'thermostat',
    [DeviceType.PRESSURE_SENSOR]: 'speed',
    [DeviceType.LEVEL_SENSOR]: 'straighten',
    [DeviceType.UNKNOWN]: 'device_unknown'
  };
  return icons[type] || 'device_unknown';
}

/**
 * Calcula el tiempo estimado de discovery
 */
export function estimateDiscoveryTime(config: DiscoveryConfig): number {
  const addressCount = config.end_address - config.start_address + 1;
  const baudrateCount = config.baudrates.length;
  const timeout = config.timeout || 0.5;
  
  // Tiempo estimado = direcciones * baudrates * timeout + overhead
  const baseTime = addressCount * baudrateCount * timeout;
  const overhead = 5; // 5 segundos de overhead
  
  return Math.ceil(baseTime + overhead);
}

/**
 * Formatea el tiempo estimado en formato legible
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seg`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }
  
  return `${minutes} min ${remainingSeconds} seg`;
}

/**
 * Valida la configuración de discovery
 */
export function validateDiscoveryConfig(config: DiscoveryConfig): string | null {
  if (!config.port_name) {
    return 'Debe seleccionar un puerto';
  }
  
  if (config.start_address < 1 || config.start_address > 247) {
    return 'Dirección inicial debe estar entre 1 y 247';
  }
  
  if (config.end_address < 1 || config.end_address > 247) {
    return 'Dirección final debe estar entre 1 y 247';
  }
  
  if (config.start_address > config.end_address) {
    return 'Dirección inicial debe ser menor o igual a la final';
  }
  
  if (!config.baudrates || config.baudrates.length === 0) {
    return 'Debe seleccionar al menos un baudrate';
  }
  
  return null;
}
