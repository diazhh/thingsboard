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
 * Atributos extendidos del tanque
 * Información técnica y operacional adicional
 */

/**
 * Tipo de techo del tanque
 */
export type RoofType =
  | 'fixed-cone'        // Techo cónico fijo
  | 'fixed-dome'        // Techo de domo fijo
  | 'floating'          // Techo flotante
  | 'internal-floating' // Techo flotante interno
  | 'umbrella'          // Techo tipo sombrilla
  | 'spherical';        // Esférico

/**
 * Tipo de fondo del tanque
 */
export type BottomType =
  | 'flat'              // Fondo plano
  | 'cone-down'         // Cono hacia abajo
  | 'cone-up'           // Cono hacia arriba
  | 'dished'            // Abarrilado
  | 'hemispherical';    // Hemisférico

/**
 * Material del tanque
 */
export type TankMaterial =
  | 'carbon-steel'      // Acero al carbono
  | 'stainless-steel'   // Acero inoxidable
  | 'fiberglass'        // Fibra de vidrio
  | 'concrete'          // Concreto
  | 'aluminum';         // Aluminio

/**
 * Estándar de construcción
 */
export type ConstructionStandard =
  | 'API-650'           // API 650 - Tanques atmosféricos soldados
  | 'API-620'           // API 620 - Tanques de baja presión
  | 'API-653'           // API 653 - Inspección de tanques
  | 'ASME'              // ASME Boiler and Pressure Vessel Code
  | 'UL-142';           // UL 142 - Tanques de acero

/**
 * Atributos de construcción del tanque
 */
export interface TankConstructionAttributes {
  // Geometría detallada
  shellHeight: number;           // Altura del cuerpo cilíndrico (m)
  shellThickness: number;        // Espesor de pared (mm)
  bottomThickness: number;       // Espesor del fondo (mm)
  roofThickness: number;         // Espesor del techo (mm)

  // Tipo de construcción
  roofType: RoofType;
  bottomType: BottomType;
  material: TankMaterial;
  constructionStandard: ConstructionStandard;

  // Dimensiones adicionales
  shellCourses: number;          // Número de cuerpos/virolas
  bottomSlopeAngle?: number;     // Ángulo de inclinación del fondo (grados)
  sumpDepth?: number;            // Profundidad del sumidero (mm)
  sumpVolume?: number;           // Volumen del sumidero (m³)

  // Pesos
  shellWeight: number;           // Peso del cuerpo (kg)
  roofWeight: number;            // Peso del techo (kg)
  bottomWeight: number;          // Peso del fondo (kg)
  totalEmptyWeight: number;      // Peso total vacío (kg)

  // Datos de construcción
  manufacturer: string;
  yearBuilt: number;
  fabricationDate: Date;
  designPressure: number;        // Presión de diseño (mbar)
  designTemperature: number;     // Temperatura de diseño (°C)
  maxFillRate: number;           // Tasa máxima de llenado (m³/h)
  maxDrawRate: number;           // Tasa máxima de vaciado (m³/h)
}

/**
 * Producto almacenado
 */
export interface ProductAttributes {
  // Identificación
  productName: string;
  productCode: string;
  productType: 'crude' | 'refined' | 'chemical' | 'water' | 'other';

  // Propiedades físicas
  apiGravity: number;            // API Gravity (10-100)
  specificGravity: number;       // Gravedad específica (@60°F)
  density: number;               // Densidad (kg/m³)
  viscosity?: number;            // Viscosidad (cP)

  // Propiedades térmicas
  flashPoint?: number;           // Punto de inflamación (°C)
  autoIgnitionTemp?: number;     // Temperatura de autoignición (°C)
  vaporPressure?: number;        // Presión de vapor (kPa)

  // Clasificación
  hazardClass?: string;          // Clase de peligrosidad
  unNumber?: string;             // Número UN
  casNumber?: string;            // Número CAS

  // Control de calidad
  lastSampleDate?: Date;
  lastLabAnalysis?: Date;
  batchNumber?: string;
}

/**
 * Configuración de alarmas y límites
 */
export interface AlarmConfiguration {
  // Niveles de alarma (metros)
  highHigh: number;              // HH
  high: number;                  // H
  low: number;                   // L
  lowLow: number;                // LL

  // Alarmas de temperatura
  tempHigh?: number;             // Temperatura alta (°C)
  tempLow?: number;              // Temperatura baja (°C)

  // Alarmas de presión
  pressureHigh?: number;         // Presión alta (mbar)
  pressureLow?: number;          // Presión baja (mbar)

  // Configuración de notificaciones
  enableEmailAlerts: boolean;
  emailRecipients?: string[];
  enableSMSAlerts: boolean;
  smsRecipients?: string[];

  // Delays y deadbands
  alarmDelay: number;            // Retraso de alarma (segundos)
  alarmDeadband: number;         // Banda muerta (mm)
}

/**
 * Información de mantenimiento
 */
export interface MaintenanceInfo {
  // Última inspección
  lastInspectionDate: Date;
  lastInspectionType: string;    // 'internal' | 'external' | 'API-653'
  lastInspectorName: string;
  lastInspectorCompany: string;
  lastInspectionReport?: string; // URL o ID del reporte

  // Próxima inspección
  nextInspectionDate: Date;
  nextInspectionType: string;
  inspectionFrequency: number;   // Días entre inspecciones

  // Mantenimiento del radar
  lastRadarCalibration: Date;
  nextRadarCalibration: Date;
  radarSerialNumber: string;
  radarModel: string;
  radarManufacturer: string;

  // Historial de reparaciones
  lastRepairDate?: Date;
  lastRepairDescription?: string;
  repairCount: number;

  // Limpieza
  lastCleaningDate?: Date;
  nextCleaningDate?: Date;
}

/**
 * Registro de aforo manual (Gauging)
 */
export interface ManualGaugingRecord {
  // Identificación
  id: string;
  timestamp: Date;
  operator: string;
  shift: string;

  // Mediciones manuales
  manualLevel: number;           // Nivel medido manualmente (mm)
  temperature: number;           // Temperatura medida (°C)
  observedDensity?: number;      // Densidad observada

  // Comparación con automático
  autoLevel: number;             // Nivel del radar automático (mm)
  deviation: number;             // Desviación (mm)
  deviationPercent: number;      // Desviación porcentual

  // Cálculos
  calculatedVolume: number;      // Volumen calculado (m³)
  calculatedVolumeBarrels: number; // Volumen en barriles

  // Notas
  notes?: string;
  weatherConditions?: string;
  anomaliesDetected?: string;

  // QC
  approved: boolean;
  approvedBy?: string;
  approvedDate?: Date;
}

/**
 * Registro de mantenimiento
 */
export interface MaintenanceRecord {
  // Identificación
  id: string;
  timestamp: Date;
  maintenanceType: 'inspection' | 'calibration' | 'repair' | 'cleaning' | 'modification';

  // Detalles
  description: string;
  performedBy: string;
  company: string;
  duration: number;              // Horas

  // Componentes afectados
  components: string[];          // ['radar', 'shell', 'roof', 'bottom', 'nozzles']

  // Hallazgos
  findingsDescription?: string;
  criticalIssues?: string[];
  recommendations?: string[];

  // Documentos
  reportUrl?: string;
  photosUrls?: string[];
  certificateUrl?: string;

  // Estado después del mantenimiento
  tankStatus: 'operational' | 'limited' | 'out-of-service';
  nextActionRequired?: string;
  nextActionDate?: Date;

  // Costos
  laborCost?: number;
  materialsCost?: number;
  totalCost?: number;
}

/**
 * Atributos extendidos completos del tanque
 */
export interface TankExtendedAttributes {
  // Identificación
  tankId: string;
  tankTag: string;

  // Construcción
  construction: TankConstructionAttributes;

  // Producto
  product: ProductAttributes;

  // Alarmas
  alarms: AlarmConfiguration;

  // Mantenimiento
  maintenance: MaintenanceInfo;

  // Ubicación
  location?: {
    farmName: string;            // Nombre del parque de tanques
    tankNumber: string;          // Número del tanque en el parque
    latitude?: number;
    longitude?: number;
    elevation?: number;          // Elevación sobre nivel del mar (m)
  };

  // Operación
  operation?: {
    commissionDate: Date;        // Fecha de puesta en servicio
    lastTurnover: Date;          // Última rotación de inventario
    averageTurnoverDays: number; // Días promedio de rotación
    operationalStatus: 'active' | 'standby' | 'maintenance' | 'decommissioned';
    lockoutTagout: boolean;      // LOTO activo
  };

  // Metadata
  createdDate: Date;
  lastModified: Date;
  modifiedBy: string;
}

/**
 * Registro de cambio de API Gravity
 */
export interface ApiGravityUpdate {
  timestamp: Date;
  oldValue: number;
  newValue: number;
  changedBy: string;
  reason: string;
}
