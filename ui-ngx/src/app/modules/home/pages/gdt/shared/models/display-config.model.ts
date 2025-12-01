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
 * Configuración de Visualización de Tanques
 *
 * Define las unidades y formatos de visualización para los usuarios.
 * El nivel siempre se almacena en mm internamente,
 * pero se puede visualizar en diferentes unidades según la preferencia.
 */

/**
 * Unidades de visualización de nivel
 */
export type LevelDisplayUnit =
  | 'mm'              // Milímetros
  | 'm'               // Metros
  | 'cm'              // Centímetros
  | 'in'              // Pulgadas
  | 'ft'              // Pies
  | 'ft_in'           // Pies y pulgadas (ej: 5' 3")
  | 'ft_in_frac';     // Pies, pulgadas y fracción (ej: 5' 3" 1/8)

/**
 * Precisión de fracción para unidades imperiales
 */
export type FractionPrecision =
  | '1/8'   // Octavos
  | '1/16'  // Dieciseisavos
  | '1/32'  // Treintaidosavos
  | '1/64'; // Sesentaicuatroavos

/**
 * Unidades de volumen
 */
export type VolumeDisplayUnit =
  | 'bbl'     // Barriles (US barrel = 42 galones)
  | 'm3'      // Metros cúbicos
  | 'liters'  // Litros
  | 'gal';    // Galones (US)

/**
 * Unidades de temperatura
 */
export type TemperatureDisplayUnit =
  | 'C'   // Celsius
  | 'F';  // Fahrenheit

/**
 * Tipos de forma de tanque
 * Incluye valores legacy ('vertical', 'horizontal') para compatibilidad
 */
export type TankShape =
  | 'vertical'              // Legacy: Cilindro vertical
  | 'horizontal'            // Legacy: Cilindro horizontal
  | 'vertical_cylinder'     // Cilindro vertical (más común)
  | 'horizontal_cylinder'   // Cilindro horizontal
  | 'spherical'             // Esférico
  | 'rectangular';          // Rectangular/prismático

/**
 * Configuración de visualización del tanque
 */
export interface TankDisplayConfig {
  // Unidades de nivel
  levelUnit: LevelDisplayUnit;
  fractionPrecision: FractionPrecision;

  // Unidades de volumen
  volumeUnit: VolumeDisplayUnit;

  // Unidades de temperatura
  temperatureUnit: TemperatureDisplayUnit;

  // Decimales para mostrar
  levelDecimals: number;      // Para mm, m, cm, in, ft
  volumeDecimals: number;     // Para volúmenes
  temperatureDecimals: number; // Para temperaturas

  // Formato de números
  thousandsSeparator: string;  // ',' o '.'
  decimalSeparator: string;    // '.' o ','

  // Idioma/Localización
  locale: string;              // 'es-ES', 'en-US', etc.
}

/**
 * Configuración de geometría del tanque
 */
export interface TankGeometryConfig {
  // Forma del tanque
  shape: TankShape;

  // Dimensiones principales (siempre en metros internamente)
  height: number;             // Altura total
  diameter: number;           // Diámetro (para cilíndricos y esféricos)
  length?: number;            // Longitud (para horizontal)
  width?: number;             // Ancho (para rectangular)

  // Capacidad
  nominalCapacity: number;    // Capacidad nominal (m³)
  workingCapacity: number;    // Capacidad de trabajo (m³)

  // Posición del sensor radar
  radarPosition: 'top' | 'side';
  radarOffset: number;        // Offset desde la referencia (mm)

  // Zona muerta del tanque
  deadZoneBottom: number;     // Zona muerta inferior (mm)
  deadZoneTop: number;        // Zona muerta superior (mm)

  // Referencias
  referenceHeight: number;    // Altura de referencia desde el fondo (mm)
  datumPlate: number;         // Placa de referencia (mm)
}

/**
 * Resultado de conversión de nivel
 */
export interface LevelConversionResult {
  // Valor original
  originalMM: number;

  // Valores convertidos
  meters: number;
  centimeters: number;
  inches: number;
  feet: number;

  // Para formato pies-pulgadas-fracción
  wholeFeet: number;
  wholeInches: number;
  fractionInches: number;
  fractionString: string;

  // Formato para mostrar
  displayValue: string;
  displayUnit: string;
}

/**
 * Valor en formato pies, pulgadas y fracción
 */
export interface FeetInchFraction {
  feet: number;
  inches: number;
  fraction: number;         // Valor decimal de la fracción (0 a 0.9375)
  fractionString: string;   // Representación como string (ej: "1/8", "3/16")
  totalInches: number;      // Total en pulgadas (pies*12 + pulgadas + fracción)
}

/**
 * Configuración por defecto para visualización
 */
export const DEFAULT_DISPLAY_CONFIG: TankDisplayConfig = {
  levelUnit: 'ft_in_frac',
  fractionPrecision: '1/16',
  volumeUnit: 'bbl',
  temperatureUnit: 'F',
  levelDecimals: 2,
  volumeDecimals: 0,
  temperatureDecimals: 1,
  thousandsSeparator: ',',
  decimalSeparator: '.',
  locale: 'es-ES'
};

/**
 * Configuración por defecto para geometría
 */
export const DEFAULT_GEOMETRY_CONFIG: TankGeometryConfig = {
  shape: 'vertical_cylinder',
  height: 15,           // 15 metros
  diameter: 10,         // 10 metros
  nominalCapacity: 1000,
  workingCapacity: 950,
  radarPosition: 'top',
  radarOffset: 0,
  deadZoneBottom: 300,  // 300mm
  deadZoneTop: 500,     // 500mm
  referenceHeight: 0,
  datumPlate: 0
};

/**
 * Constantes de conversión
 */
export const CONVERSION_CONSTANTS = {
  // Longitud
  MM_TO_M: 0.001,
  MM_TO_CM: 0.1,
  MM_TO_IN: 0.0393701,
  MM_TO_FT: 0.00328084,
  IN_TO_MM: 25.4,
  FT_TO_MM: 304.8,
  FT_TO_IN: 12,

  // Volumen
  BBL_TO_M3: 0.158987,
  M3_TO_BBL: 6.28981,
  BBL_TO_LITERS: 158.987,
  BBL_TO_GAL: 42,
  M3_TO_LITERS: 1000,
  GAL_TO_LITERS: 3.78541,

  // Temperatura
  C_TO_F: (c: number) => (c * 9/5) + 32,
  F_TO_C: (f: number) => (f - 32) * 5/9
};

/**
 * Fracciones disponibles según precisión
 */
export const FRACTION_VALUES: Record<FractionPrecision, { fraction: string; decimal: number }[]> = {
  '1/8': [
    { fraction: '0', decimal: 0 },
    { fraction: '1/8', decimal: 0.125 },
    { fraction: '1/4', decimal: 0.25 },
    { fraction: '3/8', decimal: 0.375 },
    { fraction: '1/2', decimal: 0.5 },
    { fraction: '5/8', decimal: 0.625 },
    { fraction: '3/4', decimal: 0.75 },
    { fraction: '7/8', decimal: 0.875 }
  ],
  '1/16': [
    { fraction: '0', decimal: 0 },
    { fraction: '1/16', decimal: 0.0625 },
    { fraction: '1/8', decimal: 0.125 },
    { fraction: '3/16', decimal: 0.1875 },
    { fraction: '1/4', decimal: 0.25 },
    { fraction: '5/16', decimal: 0.3125 },
    { fraction: '3/8', decimal: 0.375 },
    { fraction: '7/16', decimal: 0.4375 },
    { fraction: '1/2', decimal: 0.5 },
    { fraction: '9/16', decimal: 0.5625 },
    { fraction: '5/8', decimal: 0.625 },
    { fraction: '11/16', decimal: 0.6875 },
    { fraction: '3/4', decimal: 0.75 },
    { fraction: '13/16', decimal: 0.8125 },
    { fraction: '7/8', decimal: 0.875 },
    { fraction: '15/16', decimal: 0.9375 }
  ],
  '1/32': [
    { fraction: '0', decimal: 0 },
    { fraction: '1/32', decimal: 0.03125 },
    { fraction: '1/16', decimal: 0.0625 },
    { fraction: '3/32', decimal: 0.09375 },
    { fraction: '1/8', decimal: 0.125 },
    { fraction: '5/32', decimal: 0.15625 },
    { fraction: '3/16', decimal: 0.1875 },
    { fraction: '7/32', decimal: 0.21875 },
    { fraction: '1/4', decimal: 0.25 },
    { fraction: '9/32', decimal: 0.28125 },
    { fraction: '5/16', decimal: 0.3125 },
    { fraction: '11/32', decimal: 0.34375 },
    { fraction: '3/8', decimal: 0.375 },
    { fraction: '13/32', decimal: 0.40625 },
    { fraction: '7/16', decimal: 0.4375 },
    { fraction: '15/32', decimal: 0.46875 },
    { fraction: '1/2', decimal: 0.5 },
    { fraction: '17/32', decimal: 0.53125 },
    { fraction: '9/16', decimal: 0.5625 },
    { fraction: '19/32', decimal: 0.59375 },
    { fraction: '5/8', decimal: 0.625 },
    { fraction: '21/32', decimal: 0.65625 },
    { fraction: '11/16', decimal: 0.6875 },
    { fraction: '23/32', decimal: 0.71875 },
    { fraction: '3/4', decimal: 0.75 },
    { fraction: '25/32', decimal: 0.78125 },
    { fraction: '13/16', decimal: 0.8125 },
    { fraction: '27/32', decimal: 0.84375 },
    { fraction: '7/8', decimal: 0.875 },
    { fraction: '29/32', decimal: 0.90625 },
    { fraction: '15/16', decimal: 0.9375 },
    { fraction: '31/32', decimal: 0.96875 }
  ],
  '1/64': [
    { fraction: '0', decimal: 0 },
    { fraction: '1/64', decimal: 0.015625 },
    { fraction: '1/32', decimal: 0.03125 },
    { fraction: '3/64', decimal: 0.046875 },
    { fraction: '1/16', decimal: 0.0625 },
    { fraction: '5/64', decimal: 0.078125 },
    { fraction: '3/32', decimal: 0.09375 },
    { fraction: '7/64', decimal: 0.109375 },
    { fraction: '1/8', decimal: 0.125 },
    { fraction: '9/64', decimal: 0.140625 },
    { fraction: '5/32', decimal: 0.15625 },
    { fraction: '11/64', decimal: 0.171875 },
    { fraction: '3/16', decimal: 0.1875 },
    { fraction: '13/64', decimal: 0.203125 },
    { fraction: '7/32', decimal: 0.21875 },
    { fraction: '15/64', decimal: 0.234375 },
    { fraction: '1/4', decimal: 0.25 },
    { fraction: '17/64', decimal: 0.265625 },
    { fraction: '9/32', decimal: 0.28125 },
    { fraction: '19/64', decimal: 0.296875 },
    { fraction: '5/16', decimal: 0.3125 },
    { fraction: '21/64', decimal: 0.328125 },
    { fraction: '11/32', decimal: 0.34375 },
    { fraction: '23/64', decimal: 0.359375 },
    { fraction: '3/8', decimal: 0.375 },
    { fraction: '25/64', decimal: 0.390625 },
    { fraction: '13/32', decimal: 0.40625 },
    { fraction: '27/64', decimal: 0.421875 },
    { fraction: '7/16', decimal: 0.4375 },
    { fraction: '29/64', decimal: 0.453125 },
    { fraction: '15/32', decimal: 0.46875 },
    { fraction: '31/64', decimal: 0.484375 },
    { fraction: '1/2', decimal: 0.5 },
    { fraction: '33/64', decimal: 0.515625 },
    { fraction: '17/32', decimal: 0.53125 },
    { fraction: '35/64', decimal: 0.546875 },
    { fraction: '9/16', decimal: 0.5625 },
    { fraction: '37/64', decimal: 0.578125 },
    { fraction: '19/32', decimal: 0.59375 },
    { fraction: '39/64', decimal: 0.609375 },
    { fraction: '5/8', decimal: 0.625 },
    { fraction: '41/64', decimal: 0.640625 },
    { fraction: '21/32', decimal: 0.65625 },
    { fraction: '43/64', decimal: 0.671875 },
    { fraction: '11/16', decimal: 0.6875 },
    { fraction: '45/64', decimal: 0.703125 },
    { fraction: '23/32', decimal: 0.71875 },
    { fraction: '47/64', decimal: 0.734375 },
    { fraction: '3/4', decimal: 0.75 },
    { fraction: '49/64', decimal: 0.765625 },
    { fraction: '25/32', decimal: 0.78125 },
    { fraction: '51/64', decimal: 0.796875 },
    { fraction: '13/16', decimal: 0.8125 },
    { fraction: '53/64', decimal: 0.828125 },
    { fraction: '27/32', decimal: 0.84375 },
    { fraction: '55/64', decimal: 0.859375 },
    { fraction: '7/8', decimal: 0.875 },
    { fraction: '57/64', decimal: 0.890625 },
    { fraction: '29/32', decimal: 0.90625 },
    { fraction: '59/64', decimal: 0.921875 },
    { fraction: '15/16', decimal: 0.9375 },
    { fraction: '61/64', decimal: 0.953125 },
    { fraction: '31/32', decimal: 0.96875 },
    { fraction: '63/64', decimal: 0.984375 }
  ]
};
