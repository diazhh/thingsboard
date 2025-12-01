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

import { Injectable } from '@angular/core';
import {
  LevelDisplayUnit,
  FractionPrecision,
  VolumeDisplayUnit,
  TemperatureDisplayUnit,
  TankDisplayConfig,
  LevelConversionResult,
  FeetInchFraction,
  CONVERSION_CONSTANTS,
  FRACTION_VALUES,
  DEFAULT_DISPLAY_CONFIG
} from '../models/display-config.model';

/**
 * Servicio de Conversión de Unidades
 *
 * Convierte valores entre diferentes unidades de medida.
 * El almacenamiento interno siempre es en unidades SI (mm para nivel, m³ para volumen, °C para temperatura)
 * pero se puede visualizar en cualquier unidad configurada.
 */
@Injectable({
  providedIn: 'root'
})
export class UnitConversionService {

  // ==========================================
  // CONVERSIONES DE NIVEL (desde mm)
  // ==========================================

  /**
   * Convierte nivel de mm a la unidad especificada
   */
  convertLevel(
    levelMM: number,
    toUnit: LevelDisplayUnit,
    fractionPrecision: FractionPrecision = '1/16'
  ): LevelConversionResult {
    const result: LevelConversionResult = {
      originalMM: levelMM,
      meters: levelMM * CONVERSION_CONSTANTS.MM_TO_M,
      centimeters: levelMM * CONVERSION_CONSTANTS.MM_TO_CM,
      inches: levelMM * CONVERSION_CONSTANTS.MM_TO_IN,
      feet: levelMM * CONVERSION_CONSTANTS.MM_TO_FT,
      wholeFeet: 0,
      wholeInches: 0,
      fractionInches: 0,
      fractionString: '',
      displayValue: '',
      displayUnit: ''
    };

    // Calcular pies, pulgadas y fracción
    const totalInches = result.inches;
    result.wholeFeet = Math.floor(totalInches / 12);
    const remainingInches = totalInches - (result.wholeFeet * 12);
    result.wholeInches = Math.floor(remainingInches);
    result.fractionInches = remainingInches - result.wholeInches;

    // Encontrar la fracción más cercana
    const fractionResult = this.findNearestFraction(result.fractionInches, fractionPrecision);
    result.fractionString = fractionResult.fraction;

    // Formatear según la unidad de destino
    switch (toUnit) {
      case 'mm':
        result.displayValue = this.formatNumber(levelMM, 0);
        result.displayUnit = 'mm';
        break;

      case 'm':
        result.displayValue = this.formatNumber(result.meters, 3);
        result.displayUnit = 'm';
        break;

      case 'cm':
        result.displayValue = this.formatNumber(result.centimeters, 1);
        result.displayUnit = 'cm';
        break;

      case 'in':
        result.displayValue = this.formatNumber(result.inches, 2);
        result.displayUnit = 'in';
        break;

      case 'ft':
        result.displayValue = this.formatNumber(result.feet, 2);
        result.displayUnit = 'ft';
        break;

      case 'ft_in':
        result.displayValue = `${result.wholeFeet}' ${result.wholeInches}"`;
        result.displayUnit = '';
        break;

      case 'ft_in_frac':
        if (result.fractionString && result.fractionString !== '0') {
          result.displayValue = `${result.wholeFeet}' ${result.wholeInches}" ${result.fractionString}`;
        } else {
          result.displayValue = `${result.wholeFeet}' ${result.wholeInches}"`;
        }
        result.displayUnit = '';
        break;
    }

    return result;
  }

  /**
   * Convierte de cualquier unidad a mm
   */
  convertToMM(value: number, fromUnit: LevelDisplayUnit): number {
    switch (fromUnit) {
      case 'mm':
        return value;
      case 'm':
        return value / CONVERSION_CONSTANTS.MM_TO_M;
      case 'cm':
        return value / CONVERSION_CONSTANTS.MM_TO_CM;
      case 'in':
        return value * CONVERSION_CONSTANTS.IN_TO_MM;
      case 'ft':
        return value * CONVERSION_CONSTANTS.FT_TO_MM;
      case 'ft_in':
      case 'ft_in_frac':
        // Para estos casos, se necesita parsear el valor
        // Asumimos que el valor viene como pulgadas totales
        return value * CONVERSION_CONSTANTS.IN_TO_MM;
      default:
        return value;
    }
  }

  /**
   * Convierte pies, pulgadas y fracción a mm
   */
  convertFeetInchFractionToMM(feet: number, inches: number, fractionDecimal: number = 0): number {
    const totalInches = (feet * 12) + inches + fractionDecimal;
    return totalInches * CONVERSION_CONSTANTS.IN_TO_MM;
  }

  /**
   * Convierte mm a pies, pulgadas y fracción
   */
  convertMMToFeetInchFraction(mm: number, precision: FractionPrecision = '1/16'): FeetInchFraction {
    const totalInches = mm * CONVERSION_CONSTANTS.MM_TO_IN;
    const feet = Math.floor(totalInches / 12);
    const remainingInches = totalInches - (feet * 12);
    const inches = Math.floor(remainingInches);
    const fractionDecimal = remainingInches - inches;

    const nearestFraction = this.findNearestFraction(fractionDecimal, precision);

    return {
      feet,
      inches,
      fraction: nearestFraction.decimal,
      fractionString: nearestFraction.fraction,
      totalInches
    };
  }

  /**
   * Encuentra la fracción más cercana según la precisión
   */
  findNearestFraction(decimal: number, precision: FractionPrecision): { fraction: string; decimal: number } {
    const fractions = FRACTION_VALUES[precision];

    let nearest = fractions[0];
    let minDiff = Math.abs(decimal - nearest.decimal);

    for (const frac of fractions) {
      const diff = Math.abs(decimal - frac.decimal);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = frac;
      }
    }

    return nearest;
  }

  /**
   * Parsea un string de pies-pulgadas-fracción a mm
   * Ejemplos: "5' 3\"", "5' 3\" 1/8", "5-3-1/8"
   */
  parseFeetInchFraction(input: string): number | null {
    // Formato: X' Y" Z/W o X' Y" o variaciones
    const patterns = [
      // 5' 3" 1/8
      /(\d+)['′]\s*(\d+)[""]\s*(\d+)\/(\d+)/,
      // 5' 3"
      /(\d+)['′]\s*(\d+)[""]/,
      // 5-3-1/8
      /(\d+)-(\d+)-(\d+)\/(\d+)/,
      // 5-3
      /(\d+)-(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const feet = parseInt(match[1], 10);
        const inches = parseInt(match[2], 10);
        let fractionDecimal = 0;

        if (match[3] && match[4]) {
          fractionDecimal = parseInt(match[3], 10) / parseInt(match[4], 10);
        }

        return this.convertFeetInchFractionToMM(feet, inches, fractionDecimal);
      }
    }

    return null;
  }

  // ==========================================
  // CONVERSIONES DE VOLUMEN
  // ==========================================

  /**
   * Convierte volumen de barriles a la unidad especificada
   */
  convertVolume(volumeBBL: number, toUnit: VolumeDisplayUnit): number {
    switch (toUnit) {
      case 'bbl':
        return volumeBBL;
      case 'm3':
        return volumeBBL * CONVERSION_CONSTANTS.BBL_TO_M3;
      case 'liters':
        return volumeBBL * CONVERSION_CONSTANTS.BBL_TO_LITERS;
      case 'gal':
        return volumeBBL * CONVERSION_CONSTANTS.BBL_TO_GAL;
      default:
        return volumeBBL;
    }
  }

  /**
   * Convierte volumen de cualquier unidad a barriles
   */
  convertToBarrels(volume: number, fromUnit: VolumeDisplayUnit): number {
    switch (fromUnit) {
      case 'bbl':
        return volume;
      case 'm3':
        return volume * CONVERSION_CONSTANTS.M3_TO_BBL;
      case 'liters':
        return volume / CONVERSION_CONSTANTS.BBL_TO_LITERS;
      case 'gal':
        return volume / CONVERSION_CONSTANTS.BBL_TO_GAL;
      default:
        return volume;
    }
  }

  /**
   * Formatea un volumen para visualización
   */
  formatVolume(volumeBBL: number, toUnit: VolumeDisplayUnit, decimals: number = 0): string {
    const converted = this.convertVolume(volumeBBL, toUnit);
    return this.formatNumber(converted, decimals);
  }

  // ==========================================
  // CONVERSIONES DE TEMPERATURA
  // ==========================================

  /**
   * Convierte temperatura de Celsius a la unidad especificada
   */
  convertTemperature(tempC: number, toUnit: TemperatureDisplayUnit): number {
    switch (toUnit) {
      case 'C':
        return tempC;
      case 'F':
        return CONVERSION_CONSTANTS.C_TO_F(tempC);
      default:
        return tempC;
    }
  }

  /**
   * Convierte temperatura de cualquier unidad a Celsius
   */
  convertToCelsius(temp: number, fromUnit: TemperatureDisplayUnit): number {
    switch (fromUnit) {
      case 'C':
        return temp;
      case 'F':
        return CONVERSION_CONSTANTS.F_TO_C(temp);
      default:
        return temp;
    }
  }

  /**
   * Formatea una temperatura para visualización
   */
  formatTemperature(tempC: number, toUnit: TemperatureDisplayUnit, decimals: number = 1): string {
    const converted = this.convertTemperature(tempC, toUnit);
    return `${this.formatNumber(converted, decimals)}°${toUnit}`;
  }

  // ==========================================
  // UTILIDADES DE FORMATEO
  // ==========================================

  /**
   * Formatea un número con separadores de miles y decimales
   */
  formatNumber(
    value: number,
    decimals: number = 2,
    thousandsSep: string = ',',
    decimalSep: string = '.'
  ): string {
    const fixed = value.toFixed(decimals);
    const parts = fixed.split('.');

    // Agregar separador de miles
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);

    // Unir con el separador decimal correcto
    if (decimals > 0) {
      return parts.join(decimalSep);
    }
    return parts[0];
  }

  /**
   * Formatea un nivel según la configuración
   */
  formatLevelWithConfig(levelMM: number, config: TankDisplayConfig): string {
    const result = this.convertLevel(levelMM, config.levelUnit, config.fractionPrecision);

    if (config.levelUnit === 'ft_in' || config.levelUnit === 'ft_in_frac') {
      return result.displayValue;
    }

    return `${this.formatNumber(
      parseFloat(result.displayValue.replace(/,/g, '')),
      config.levelDecimals,
      config.thousandsSeparator,
      config.decimalSeparator
    )} ${result.displayUnit}`;
  }

  /**
   * Formatea un volumen según la configuración
   */
  formatVolumeWithConfig(volumeBBL: number, config: TankDisplayConfig): string {
    const converted = this.convertVolume(volumeBBL, config.volumeUnit);

    const unitLabels: Record<VolumeDisplayUnit, string> = {
      'bbl': 'bbl',
      'm3': 'm³',
      'liters': 'L',
      'gal': 'gal'
    };

    return `${this.formatNumber(
      converted,
      config.volumeDecimals,
      config.thousandsSeparator,
      config.decimalSeparator
    )} ${unitLabels[config.volumeUnit]}`;
  }

  /**
   * Formatea una temperatura según la configuración
   */
  formatTemperatureWithConfig(tempC: number, config: TankDisplayConfig): string {
    const converted = this.convertTemperature(tempC, config.temperatureUnit);

    return `${this.formatNumber(
      converted,
      config.temperatureDecimals,
      config.thousandsSeparator,
      config.decimalSeparator
    )}°${config.temperatureUnit}`;
  }

  // ==========================================
  // MÉTODOS DE VALIDACIÓN
  // ==========================================

  /**
   * Valida un valor de fracción
   */
  isValidFraction(fractionStr: string): boolean {
    const pattern = /^(\d+)\/(\d+)$/;
    const match = fractionStr.match(pattern);

    if (!match) return false;

    const numerator = parseInt(match[1], 10);
    const denominator = parseInt(match[2], 10);

    // Denominadores válidos: 2, 4, 8, 16, 32, 64
    const validDenominators = [2, 4, 8, 16, 32, 64];
    return validDenominators.includes(denominator) && numerator < denominator;
  }

  /**
   * Parsea un string de fracción a decimal
   */
  parseFraction(fractionStr: string): number {
    if (fractionStr === '0' || !fractionStr) return 0;

    const pattern = /^(\d+)\/(\d+)$/;
    const match = fractionStr.match(pattern);

    if (!match) return 0;

    const numerator = parseInt(match[1], 10);
    const denominator = parseInt(match[2], 10);

    return numerator / denominator;
  }

  /**
   * Obtiene la configuración por defecto
   */
  getDefaultConfig(): TankDisplayConfig {
    return { ...DEFAULT_DISPLAY_CONFIG };
  }
}
