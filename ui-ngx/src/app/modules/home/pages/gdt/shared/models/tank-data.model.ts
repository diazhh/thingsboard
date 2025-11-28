import { Alarm } from './alarm.model';
import { StrappingTable } from './strapping-table.model';
import {
  TankDisplayConfig,
  TankGeometryConfig,
  TankShape
} from './display-config.model';

export interface TankData {
  // Identificación
  tankId?: string;
  tankName: string;
  tankTag: string;
  productName: string;

  // Geometría del tanque (desde asset attributes)
  tankHeight: number;           // metros
  tankDiameter: number;         // metros
  tankLength?: number;          // metros (para tanques horizontales)
  tankShape: TankShape;         // Tipo de forma del tanque
  tankCapacity: number;         // m³

  // Configuración de geometría detallada (opcional)
  geometryConfig?: TankGeometryConfig;

  // Configuración de visualización (desde asset attributes o configuración global)
  displayConfig?: TankDisplayConfig;

  // Parámetros de configuración (desde device attributes)
  offsetDistance?: number;      // Sip-OffsetDist_G
  calibrationDistance?: number; // Sip-CalibrationDist
  bottomHeadDistance?: number;  // Sip-BottomHeadDist_C
  holdOffDistance?: number;     // Sip-HoldOffDist
  tcl?: number;                 // Sip-TCL

  // Telemetría en tiempo real (desde device telemetry)
  level?: number;               // mm (desde telemetría)
  levelMetric?: number;         // mm (level_metric)
  ullage?: number;              // mm
  levelRate?: number;           // cm/h
  rtgStatus?: number;           // RTGstatus

  // Temperaturas
  temperatures?: {
    temp19?: number;
    temp20?: number;
    temp21?: number;
    temp22?: number;
    temp23?: number;
    temp24?: number;
    temp25?: number;
  };
  temperatureAvg?: number;      // Temperatura promedio calculada

  // Producto y API MPMS
  apiGravity?: number;          // API Gravity del producto (4.0-99.9)
  strappingTable?: StrappingTable; // Tabla de calibración
  bsw?: number;                 // Basic Sediment and Water (%) - desde asset attributes

  // Alarmas (desde asset attributes)
  alarmLevels?: {
    hh: number;  // High-High (metros)
    h: number;   // High (metros)
    l: number;   // Low (metros)
    ll: number;  // Low-Low (metros)
  };

  // Estado
  radarStatus?: 'online' | 'offline' | 'error';
  signalQuality?: 'good' | 'fair' | 'poor';
  lastUpdate?: Date;

  // Cálculos derivados (calculados localmente)
  levelMeters?: number;         // Nivel en metros
  levelPercent?: number;        // % de llenado
  volumeCurrent?: number;       // Volumen actual (m³ o bbl según unidad)
  volumeAvailable?: number;     // Volumen disponible (m³)
  ullageMeters?: number;        // Ullage en metros

  // Nivel formateado según configuración de visualización
  levelFormatted?: string;      // Nivel formateado (ej: "5' 3\" 1/8")
  levelDisplayUnit?: string;    // Unidad de visualización actual

  // Volúmenes API MPMS (calculados o desde telemetría)
  volumeGOV?: number;           // Gross Observed Volume (barriles)
  volumeGSV?: number;           // Gross Standard Volume @60°F (barriles)
  volumeNSV?: number;           // Net Standard Volume (barriles)

  // Volumen formateado según configuración
  volumeFormatted?: string;     // Volumen formateado (ej: "1,234 bbl")

  // Alarmas activas (calculadas localmente)
  activeAlarms?: Alarm[];
  currentAlarmLevel?: 'none' | 'low' | 'high' | 'critical';
}

/**
 * Configuración de atributos del tanque en ThingsBoard
 * Estos son los atributos que se guardan en SERVER_SCOPE del Asset
 */
export interface TankAssetAttributes {
  // Identificación
  tankTag: string;
  tankName: string;
  productName: string;

  // Geometría
  tankShape: TankShape;
  tankHeight: number;           // metros
  tankDiameter: number;         // metros
  tankLength?: number;          // metros (para horizontales)
  tankCapacity: number;         // m³

  // Configuración de visualización
  levelDisplayUnit?: string;    // 'mm' | 'm' | 'cm' | 'in' | 'ft' | 'ft_in' | 'ft_in_frac'
  fractionPrecision?: string;   // '1/8' | '1/16' | '1/32' | '1/64'
  volumeDisplayUnit?: string;   // 'bbl' | 'm3' | 'liters' | 'gal'
  temperatureDisplayUnit?: string; // 'C' | 'F'

  // Alarmas
  alarmHH?: number;
  alarmH?: number;
  alarmL?: number;
  alarmLL?: number;

  // API y calibración
  apiGravityBase?: number;
  strappingTableId?: string;    // ID de la tabla de calibración

  // Radar
  radarDeviceId?: string;       // ID del dispositivo radar asociado

  // Ubicación
  location?: string;
  area?: string;
  description?: string;
}
