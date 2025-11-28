/**
 * Modelos para configuración de parámetros del Radar TRL/2
 * Basado en el protocolo Modbus RTU descrito en 02_ANALISIS_TRL2.md
 */

/**
 * Parámetro configurable del radar TRL/2
 */
export interface RadarParameter {
  // Identificación
  key: string;                    // Clave del parámetro (ej: "Sip-TankHeight_R")
  label: string;                  // Etiqueta para mostrar
  description: string;            // Descripción del parámetro
  
  // Registros Modbus
  writeRegister: number;          // Registro de escritura (ej: 1000)
  readRegisterStart: number;      // Registro de lectura inicio (ej: 1000)
  readRegisterEnd: number;        // Registro de lectura fin (ej: 1001)
  
  // Tipo y formato
  dataType: 'float32';            // Siempre float32 para TRL/2
  unit: string;                   // Unidad (ej: "m", "°C")
  
  // Validación
  minValue: number;               // Valor mínimo permitido
  maxValue: number;               // Valor máximo permitido
  decimals: number;               // Decimales a mostrar
  
  // Valor actual
  currentValue?: number;          // Valor leído del radar
  newValue?: number;              // Nuevo valor a escribir
  lastReadTime?: Date;            // Timestamp de última lectura
}

/**
 * Conjunto completo de parámetros del radar TRL/2
 */
export interface RadarConfiguration {
  // Identificación del radar
  radarId: string;
  radarName: string;
  modbusAddress: number;
  
  // Parámetros configurables
  parameters: {
    tankHeight: RadarParameter;         // Sip-TankHeight_R (1000-1001)
    offsetDistance: RadarParameter;     // Sip-OffsetDist_G (1002-1003)
    calibrationDistance: RadarParameter; // Sip-CalibrationDist (1004-1005)
    bottomHeadDistance: RadarParameter; // Sip-BottomHeadDist_C (1006-1007)
    holdOffDistance: RadarParameter;    // Sip-HoldOffDist (1008-1009)
    tcl: RadarParameter;                // Sip-TCL (1010-1011)
  };
  
  // Estado
  lastUpdate: Date;
  connectionStatus: 'online' | 'offline' | 'error';
}

/**
 * Operación de escritura al radar
 */
export interface RadarWriteOperation {
  // Identificación
  operationId: string;            // UUID de la operación
  radarId: string;
  radarName: string;
  
  // Parámetros a escribir
  parameters: Array<{
    key: string;                  // Clave del parámetro
    label: string;
    currentValue: number;
    newValue: number;
    register: number;
  }>;
  
  // Estado de la operación
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  
  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Usuario
  userId: string;
  userName: string;
  
  // Resultados
  results?: RadarWriteResult[];
  
  // Error global (si aplica)
  error?: string;
  errorReason?: 'GLOBAL_WRITE_DISABLED' | 'MODBUS_ERROR' | 'VERIFICATION_FAILED' | 'TIMEOUT' | 'API_ERROR';
}

/**
 * Resultado de escritura de un parámetro individual
 */
export interface RadarWriteResult {
  // Parámetro
  parameterKey: string;
  parameterLabel: string;
  
  // Valores
  valueWritten: number;
  valueRead: number;              // Valor leído después de escribir
  
  // Estado
  success: boolean;
  verified: boolean;              // Si se verificó correctamente
  
  // Detalles
  writeAttempts: number;          // Intentos de escritura
  verificationAttempts: number;   // Intentos de verificación
  
  // Tiempos
  writeDuration: number;          // ms
  verificationDuration: number;   // ms
  
  // Error (si aplica)
  error?: string;
  
  // Timestamp
  timestamp: Date;
}

/**
 * Mensaje de bloqueo de seguridad
 */
export interface SecurityBlockMessage {
  blocked: true;
  reason: 'GLOBAL_WRITE_DISABLED';
  message: string;
  timestamp: Date;
  radarName: string;
  parametersCount: number;
  systemStatus: 'WRITE_OPERATIONS_DISABLED';
  auditLogged: boolean;
}

/**
 * Log de operación de escritura
 */
export interface RadarWriteLog {
  id: string;
  operationId: string;
  radarId: string;
  radarName: string;
  
  // Acción
  action: 'write' | 'verify' | 'unlock' | 'lock';
  
  // Detalles
  parameterKey?: string;
  parameterLabel?: string;
  value?: number;
  
  // Resultado
  success: boolean;
  error?: string;
  
  // Metadata
  timestamp: Date;
  userId: string;
  userName: string;
  
  // Contexto técnico
  modbusFunction?: number;
  modbusRegister?: number;
  modbusData?: string;
  retries?: number;
}

/**
 * Configuración de seguridad para escrituras
 */
export interface RadarWriteSecurityConfig {
  // Estado global
  writeOperationsEnabled: boolean;
  
  // Permisos
  allowedUsers: string[];         // Lista de user IDs permitidos
  allowedRoles: string[];         // Lista de roles permitidos
  
  // Auditoría
  auditEnabled: boolean;
  auditRetentionDays: number;
  
  // Límites
  maxWritesPerHour: number;
  maxWritesPerDay: number;
  
  // Confirmación
  requireConfirmation: boolean;
  requireDoubleConfirmation: boolean; // Para parámetros críticos
}

/**
 * Parámetros por defecto del radar TRL/2
 */
export const DEFAULT_RADAR_PARAMETERS: Omit<RadarConfiguration['parameters'], 'tankHeight' | 'offsetDistance' | 'calibrationDistance' | 'bottomHeadDistance' | 'holdOffDistance' | 'tcl'> = {};

export const RADAR_PARAMETER_DEFINITIONS: Record<string, Omit<RadarParameter, 'currentValue' | 'newValue' | 'lastReadTime'>> = {
  tankHeight: {
    key: 'Sip-TankHeight_R',
    label: 'Altura del Tanque',
    description: 'Altura total del tanque desde el fondo hasta la parte superior',
    writeRegister: 1000,
    readRegisterStart: 1000,
    readRegisterEnd: 1001,
    dataType: 'float32',
    unit: 'm',
    minValue: 0.5,
    maxValue: 100.0,
    decimals: 3
  },
  offsetDistance: {
    key: 'Sip-OffsetDist_G',
    label: 'Distancia de Offset',
    description: 'Distancia desde la brida de referencia hasta la parte superior del tanque',
    writeRegister: 1002,
    readRegisterStart: 1002,
    readRegisterEnd: 1003,
    dataType: 'float32',
    unit: 'm',
    minValue: 0.0,
    maxValue: 10.0,
    decimals: 3
  },
  calibrationDistance: {
    key: 'Sip-CalibrationDist',
    label: 'Distancia de Calibración',
    description: 'Distancia utilizada para la calibración del radar',
    writeRegister: 1004,
    readRegisterStart: 1004,
    readRegisterEnd: 1005,
    dataType: 'float32',
    unit: 'm',
    minValue: 0.0,
    maxValue: 50.0,
    decimals: 3
  },
  bottomHeadDistance: {
    key: 'Sip-BottomHeadDist_C',
    label: 'Distancia del Fondo',
    description: 'Distancia desde el fondo del tanque hasta la referencia de medición',
    writeRegister: 1006,
    readRegisterStart: 1006,
    readRegisterEnd: 1007,
    dataType: 'float32',
    unit: 'm',
    minValue: 0.0,
    maxValue: 5.0,
    decimals: 3
  },
  holdOffDistance: {
    key: 'Sip-HoldOffDist',
    label: 'Distancia de Zona Muerta',
    description: 'Distancia de zona muerta (distancia mínima de medición)',
    writeRegister: 1008,
    readRegisterStart: 1008,
    readRegisterEnd: 1009,
    dataType: 'float32',
    unit: 'm',
    minValue: 0.0,
    maxValue: 2.0,
    decimals: 3
  },
  tcl: {
    key: 'Sip-TCL',
    label: 'Nivel de Calibración del Tanque (TCL)',
    description: 'Nivel de referencia para la calibración del tanque',
    writeRegister: 1010,
    readRegisterStart: 1010,
    readRegisterEnd: 1011,
    dataType: 'float32',
    unit: 'm',
    minValue: 0.0,
    maxValue: 100.0,
    decimals: 3
  }
};
