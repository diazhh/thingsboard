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
 * Gateway Port Models
 * 
 * Modelos TypeScript para la gestión de puertos seriales del Gateway GDT.
 * Estos modelos se sincronizan con el backend Python (FastAPI).
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Estados posibles de un puerto serial
 */
export enum PortStatus {
  DISABLED = 'disabled',       // Puerto deshabilitado (no se intenta conectar)
  ENABLED = 'enabled',         // Puerto habilitado pero no conectado
  CONNECTED = 'connected',     // Puerto conectado y operacional
  DISCONNECTED = 'disconnected', // Puerto desconectado (error temporal)
  ERROR = 'error'              // Puerto con error crítico
}

/**
 * Protocolos soportados por el Gateway
 */
export enum PortProtocol {
  MODBUS_RTU = 'modbus_rtu',
  MODBUS_TCP = 'modbus_tcp',
  ENRAF_GPU = 'enraf_gpu',
  VAREC_MARKSPACE = 'varec_markspace'
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuración de un puerto serial
 * Usado para crear/actualizar puertos
 */
export interface PortConfig {
  name: string;                // Identificador único del puerto
  device: string;              // Ruta del dispositivo (ej: /dev/ttyUSB0)
  baudrate: number;            // Velocidad de transmisión (9600, 19200, etc.)
  bytesize: number;            // Tamaño de byte (5, 6, 7, 8)
  parity: string;              // Paridad: 'N', 'E', 'O', 'M', 'S'
  stopbits: number;            // Stop bits: 1, 1.5, 2
  timeout: number;             // Timeout en segundos
  protocol: string;            // Protocolo de comunicación
  enabled: boolean;            // Si el puerto debe conectarse automáticamente
  auto_reconnect: boolean;     // Si debe reconectar automáticamente
  description?: string;        // Descripción opcional del puerto
}

/**
 * Información completa de un puerto (incluye estado)
 * Retornado por el backend al listar puertos
 */
export interface PortInfo extends PortConfig {
  status: PortStatus;          // Estado actual del puerto
  last_error?: string;         // Último error registrado
  connected_at?: number;       // Timestamp de última conexión exitosa
  error_count?: number;        // Contador de errores
}

/**
 * Puerto disponible en el sistema
 * Detectado por pyserial
 */
export interface AvailablePort {
  device: string;              // Ruta del dispositivo (ej: /dev/ttyUSB0)
  description: string;         // Descripción del hardware
  hwid?: string;               // Hardware ID
  vid?: number;                // Vendor ID
  pid?: number;                // Product ID
  serial_number?: string;      // Número de serie del dispositivo
  manufacturer?: string;       // Fabricante
  product?: string;            // Nombre del producto
}

/**
 * Estado general del Gateway
 */
export interface GatewayStatus {
  running: boolean;            // Si el gateway está en ejecución
  total_ports: number;         // Total de puertos configurados
  connected_ports: number;     // Puertos conectados
  enabled_ports: number;       // Puertos habilitados
  disabled_ports: number;      // Puertos deshabilitados
  error_ports: number;         // Puertos con error
  uptime_seconds?: number;     // Tiempo de ejecución en segundos
  version?: string;            // Versión del gateway
}

/**
 * Respuesta genérica de la API
 */
export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Opciones de Baudrate estándar
 */
export const BAUDRATE_OPTIONS = [
  9600,
  19200,
  38400,
  57600,
  115200,
  230400,
  460800,
  921600
];

/**
 * Opciones de Paridad
 */
export const PARITY_OPTIONS = [
  { value: 'N', label: 'None' },
  { value: 'E', label: 'Even' },
  { value: 'O', label: 'Odd' },
  { value: 'M', label: 'Mark' },
  { value: 'S', label: 'Space' }
];

/**
 * Opciones de Bytesize
 */
export const BYTESIZE_OPTIONS = [5, 6, 7, 8];

/**
 * Opciones de Stop Bits
 */
export const STOPBITS_OPTIONS = [1, 1.5, 2];

/**
 * Opciones de Protocolo
 */
export const PROTOCOL_OPTIONS = [
  { value: PortProtocol.MODBUS_RTU, label: 'Modbus RTU' },
  { value: PortProtocol.MODBUS_TCP, label: 'Modbus TCP' },
  { value: PortProtocol.ENRAF_GPU, label: 'Enraf GPU' },
  { value: PortProtocol.VAREC_MARKSPACE, label: 'Varec Mark/Space' }
];

/**
 * Configuración por defecto para un nuevo puerto
 */
export const DEFAULT_PORT_CONFIG: Partial<PortConfig> = {
  baudrate: 9600,
  bytesize: 8,
  parity: 'N',
  stopbits: 1,
  timeout: 1.0,
  protocol: PortProtocol.MODBUS_RTU,
  enabled: true,
  auto_reconnect: true
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtiene el label legible de un estado de puerto
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
 * Obtiene el color asociado a un estado de puerto
 */
export function getStatusColor(status: PortStatus): string {
  const colors: Record<PortStatus, string> = {
    [PortStatus.DISABLED]: '#9e9e9e',      // Gris
    [PortStatus.ENABLED]: '#2196f3',       // Azul
    [PortStatus.CONNECTED]: '#4caf50',     // Verde
    [PortStatus.DISCONNECTED]: '#ff9800',  // Naranja
    [PortStatus.ERROR]: '#f44336'          // Rojo
  };
  return colors[status] || '#9e9e9e';
}

/**
 * Obtiene el icono Material asociado a un estado de puerto
 */
export function getStatusIcon(status: PortStatus): string {
  const icons: Record<PortStatus, string> = {
    [PortStatus.DISABLED]: 'block',
    [PortStatus.ENABLED]: 'radio_button_unchecked',
    [PortStatus.CONNECTED]: 'check_circle',
    [PortStatus.DISCONNECTED]: 'error_outline',
    [PortStatus.ERROR]: 'cancel'
  };
  return icons[status] || 'help_outline';
}

/**
 * Valida si un nombre de puerto es válido
 */
export function isValidPortName(name: string): boolean {
  // Solo alfanuméricos, guiones y guiones bajos, mínimo 3 caracteres
  const regex = /^[a-zA-Z0-9_-]{3,}$/;
  return regex.test(name);
}

/**
 * Genera un nombre sugerido para un puerto basado en el device
 */
export function suggestPortName(device: string): string {
  // Extrae el nombre del dispositivo (ej: /dev/ttyUSB0 -> ttyUSB0)
  const deviceName = device.split('/').pop() || 'port';
  return `port-${deviceName}`;
}

/**
 * Formatea el uptime en formato legible
 */
export function formatUptime(seconds: number): string {
  if (!seconds) return 'N/A';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : '< 1m';
}
