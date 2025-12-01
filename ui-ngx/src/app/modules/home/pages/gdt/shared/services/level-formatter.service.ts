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
import { LevelFormat } from './system-config.service';

/**
 * Resultado de conversión de nivel con formato
 */
export interface FormattedLevel {
  value: string;
  unit: string;
  numericValue: number;
}

/**
 * Servicio para convertir y formatear niveles desde mm a diferentes unidades
 */
@Injectable({
  providedIn: 'root'
})
export class LevelFormatterService {
  // Constantes de conversión
  private readonly MM_TO_CM = 0.1;
  private readonly MM_TO_M = 0.001;
  private readonly MM_TO_IN = 0.0393701;
  private readonly MM_TO_FT = 0.00328084;
  private readonly IN_PER_FT = 12;

  constructor() {}

  /**
   * Convertir nivel en mm al formato especificado
   */
  formatLevel(levelMm: number, format: LevelFormat): FormattedLevel {
    if (levelMm === null || levelMm === undefined || isNaN(levelMm)) {
      return { value: '-', unit: '', numericValue: 0 };
    }

    switch (format) {
      case 'mm':
        return this.formatMm(levelMm);
      case 'cm':
        return this.formatCm(levelMm);
      case 'm':
        return this.formatM(levelMm);
      case 'in':
        return this.formatIn(levelMm);
      case 'ft':
        return this.formatFt(levelMm);
      case 'ft-in':
        return this.formatFtIn(levelMm);
      case 'ft-in-1/8':
        return this.formatFtInFraction(levelMm, 8);
      case 'ft-in-1/16':
        return this.formatFtInFraction(levelMm, 16);
      case 'ft-in-1/32':
        return this.formatFtInFraction(levelMm, 32);
      case 'ft-in-1/64':
        return this.formatFtInFraction(levelMm, 64);
      default:
        return this.formatM(levelMm);
    }
  }

  /**
   * Formato: Milímetros (sin decimales)
   */
  private formatMm(levelMm: number): FormattedLevel {
    const value = Math.round(levelMm);
    return {
      value: value.toFixed(0),
      unit: 'mm',
      numericValue: value
    };
  }

  /**
   * Formato: Centímetros (2 decimales)
   */
  private formatCm(levelMm: number): FormattedLevel {
    const cm = levelMm * this.MM_TO_CM;
    return {
      value: cm.toFixed(2),
      unit: 'cm',
      numericValue: cm
    };
  }

  /**
   * Formato: Metros (2 decimales)
   */
  private formatM(levelMm: number): FormattedLevel {
    const m = levelMm * this.MM_TO_M;
    return {
      value: m.toFixed(2),
      unit: 'm',
      numericValue: m
    };
  }

  /**
   * Formato: Pulgadas (2 decimales)
   */
  private formatIn(levelMm: number): FormattedLevel {
    const inches = levelMm * this.MM_TO_IN;
    return {
      value: inches.toFixed(2),
      unit: 'in',
      numericValue: inches
    };
  }

  /**
   * Formato: Pies (2 decimales)
   */
  private formatFt(levelMm: number): FormattedLevel {
    const feet = levelMm * this.MM_TO_FT;
    return {
      value: feet.toFixed(2),
      unit: 'ft',
      numericValue: feet
    };
  }

  /**
   * Formato: Pies y pulgadas (ej: 12' 6.5")
   */
  private formatFtIn(levelMm: number): FormattedLevel {
    const totalInches = levelMm * this.MM_TO_IN;
    const feet = Math.floor(totalInches / this.IN_PER_FT);
    const inches = totalInches % this.IN_PER_FT;
    
    return {
      value: `${feet}' ${inches.toFixed(1)}"`,
      unit: '',
      numericValue: totalInches
    };
  }

  /**
   * Formato: Pies, pulgadas y fracción (ej: 12' 6 3/8")
   * @param levelMm Nivel en milímetros
   * @param denominator Denominador de la fracción (8, 16, 32, 64)
   */
  private formatFtInFraction(levelMm: number, denominator: number): FormattedLevel {
    const totalInches = levelMm * this.MM_TO_IN;
    const feet = Math.floor(totalInches / this.IN_PER_FT);
    const remainingInches = totalInches % this.IN_PER_FT;
    
    // Separar pulgadas enteras y fracción
    const wholeInches = Math.floor(remainingInches);
    const fractionalPart = remainingInches - wholeInches;
    
    // Convertir a fracción
    const numerator = Math.round(fractionalPart * denominator);
    
    // Simplificar fracción si es posible
    const { num, den } = this.simplifyFraction(numerator, denominator);
    
    // Construir string
    let result = `${feet}'`;
    
    if (wholeInches > 0 || num > 0) {
      result += ` ${wholeInches}`;
      if (num > 0) {
        result += ` ${num}/${den}`;
      }
      result += '"';
    } else {
      result += ' 0"';
    }
    
    return {
      value: result,
      unit: '',
      numericValue: totalInches
    };
  }

  /**
   * Simplificar fracción
   */
  private simplifyFraction(numerator: number, denominator: number): { num: number; den: number } {
    if (numerator === 0) {
      return { num: 0, den: denominator };
    }
    
    const gcd = this.greatestCommonDivisor(numerator, denominator);
    return {
      num: numerator / gcd,
      den: denominator / gcd
    };
  }

  /**
   * Calcular máximo común divisor
   */
  private greatestCommonDivisor(a: number, b: number): number {
    return b === 0 ? a : this.greatestCommonDivisor(b, a % b);
  }

  /**
   * Obtener descripción legible del formato
   */
  getFormatDescription(format: LevelFormat): string {
    const descriptions: Record<LevelFormat, string> = {
      'mm': 'Milímetros (mm)',
      'cm': 'Centímetros (cm)',
      'm': 'Metros (m)',
      'in': 'Pulgadas (in)',
      'ft': 'Pies (ft)',
      'ft-in': 'Pies y pulgadas (ft\' in")',
      'ft-in-1/8': 'Pies, pulgadas y 1/8 (ft\' in 1/8")',
      'ft-in-1/16': 'Pies, pulgadas y 1/16 (ft\' in 1/16")',
      'ft-in-1/32': 'Pies, pulgadas y 1/32 (ft\' in 1/32")',
      'ft-in-1/64': 'Pies, pulgadas y 1/64 (ft\' in 1/64")'
    };
    return descriptions[format] || format;
  }

  /**
   * Obtener ejemplo de formato
   */
  getFormatExample(format: LevelFormat): string {
    // Ejemplo con 3658.8 mm (12 pies exactos)
    const exampleMm = 3658.8;
    const formatted = this.formatLevel(exampleMm, format);
    return `${formatted.value} ${formatted.unit}`.trim();
  }
}
