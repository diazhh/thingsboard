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
 * Tabla de Calibración (Strapping Table)
 * Basada en API MPMS Chapter 2
 *
 * La tabla relaciona la altura/nivel medido con el volumen contenido
 * Usa unidades en pies y pulgadas para la altura
 * Y fracciones de pulgada para mayor precisión
 */

/**
 * Entrada individual en la tabla de calibración
 * Representa un punto de medición: altura -> volumen
 */
export interface StrappingTableEntry {
  // Identificación
  feet: number;           // Pies completos (0-99)
  inches: number;         // Pulgadas completas (0-11)
  medEq: number;          // Número de medición equivalente (secuencial)

  // Volúmenes para diferentes factores de corrección
  // Según la tabla proporcionada
  vol470X1: number;       // Volumen a 470X1 (barriles)
  vol260X4: number;       // Volumen a 260X4 (barriles)
  vol260X3: number;       // Volumen a 260X3 (barriles)
  vol260X2: number;       // Volumen a 260X2 (barriles)
  vol260X1: number;       // Volumen a 260X1 (barriles)
  vol165X1: number;       // Volumen a 165X1 (barriles)
}

/**
 * Tabla de fracciones de pulgada
 * Para interpolación de valores entre pulgadas completas
 */
export interface FractionTableEntry {
  fraction: string;       // Fracción como string (ej: "1/16", "1/8", "3/16")
  fractionDecimal: number; // Fracción como decimal (ej: 0.0625)
  barrels: number;        // Barriles correspondientes a esa fracción
}

/**
 * Tabla de calibración completa del tanque
 */
export interface StrappingTable {
  // Metadata
  tankId: string;
  tankTag: string;
  createdDate: Date;
  lastModified: Date;
  createdBy: string;
  version: string;

  // Información del tanque
  tankHeight: number;     // Altura total del tanque (metros)
  tankDiameter: number;   // Diámetro del tanque (metros)
  tankShape: 'vertical' | 'horizontal' | 'spherical';
  referenceHeight: number; // Altura de referencia desde el fondo

  // Unidades de la tabla
  heightUnit: 'ft' | 'm';
  volumeUnit: 'bbl' | 'm3' | 'liters';
  
  // Factor de corrección por defecto
  defaultFactorCode?: string; // ej: "260X1", "470X1"

  // Tabla principal (pies y pulgadas completas)
  entries: StrappingTableEntry[];

  // Tabla de fracciones (para interpolación)
  fractionTable: FractionTableEntry[];

  // Metadatos adicionales
  calibrationStandard: string;  // ej: "API MPMS Chapter 2.2A"
  calibrationDate: Date;
  calibrationAgency: string;
  certificateNumber: string;

  // Notas
  notes?: string;
}

/**
 * Resultado de búsqueda en la tabla de calibración
 */
export interface StrappingLookupResult {
  // Entrada encontrada (o interpolada)
  entry: StrappingTableEntry;

  // Detalles de la interpolación
  interpolated: boolean;
  lowerEntry?: StrappingTableEntry;
  upperEntry?: StrappingTableEntry;
  interpolationFactor?: number;

  // Resultado final
  volumeBarrels: number;
  volumeM3: number;

  // Input usado
  levelFeet: number;
  levelInches: number;
  levelFraction: number;
}

/**
 * Configuración de factor de corrección
 * Según temperatura y presión
 */
export interface CorrectionFactor {
  temperature: number;     // °F
  pressure: number;        // psi
  factorCode: string;      // ej: "260X1", "470X1"
  ctl: number;            // Correction for Temperature on Liquid
  cpl: number;            // Correction for Pressure on Liquid
  ctsh: number;           // Correction for Temperature on Steel Shell
}

/**
 * Parámetros para cálculo de volumen
 */
export interface VolumeCalculationParams {
  // Nivel medido
  levelMM: number;         // Nivel en milímetros (desde telemetría)

  // API Gravity
  apiGravity: number;      // API Gravity del producto (10-100)
  temperatureF: number;    // Temperatura en °F

  // Tabla de calibración
  strappingTable: StrappingTable;

  // Factor de corrección a usar
  correctionFactorCode?: string; // Por defecto "260X1"

  // Parámetros del tanque
  bottomOffset: number;    // Offset desde el fondo (mm)
  referenceHeight: number; // Altura de referencia (mm)
}

/**
 * Resultado del cálculo de volumen
 * Según API MPMS Chapter 11
 */
export interface VolumeCalculationResult {
  // Volúmenes
  grossObservedVolume: number;    // GOV - Volumen bruto observado
  grossStandardVolume: number;    // GSV - Volumen bruto estándar (@60°F)
  netStandardVolume: number;      // NSV - Volumen neto estándar

  // Detalles
  observedTemperature: number;    // Temperatura observada (°F)
  observedDensity: number;        // Densidad observada
  standardDensity: number;        // Densidad estándar (@60°F)

  // Factores de corrección aplicados
  ctl: number;                    // Correction for Temperature on Liquid
  cpl: number;                    // Correction for Pressure on Liquid
  ctsh: number;                   // Correction for Temperature on Steel Shell

  // Lookup result de la tabla
  strappingLookup: StrappingLookupResult;

  // Metadata
  calculationDate: Date;
  apiStandard: string;            // "API MPMS 11.1"
}
