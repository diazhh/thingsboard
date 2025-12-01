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
 * Resultado del parsing de input
 */
export interface ParsedLevelInput {
  valueInMm: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Servicio para parsear y formatear inputs de nivel en diferentes formatos
 * Maneja conversiones bidireccionales entre texto de usuario y milímetros
 */
@Injectable({
  providedIn: 'root'
})
export class LevelInputParserService {
  // Constantes de conversión
  private readonly MM_TO_CM = 0.1;
  private readonly MM_TO_M = 0.001;
  private readonly MM_TO_IN = 0.0393701;
  private readonly MM_TO_FT = 0.00328084;
  private readonly IN_PER_FT = 12;
  private readonly MM_PER_IN = 25.4;
  private readonly MM_PER_FT = 304.8;

  constructor() {}

  /**
   * Parsea un input de texto según el formato especificado
   * @param input Texto ingresado por el usuario
   * @param format Formato de nivel configurado
   * @returns Resultado con valor en mm y validación
   */
  parseInput(input: string, format: LevelFormat): ParsedLevelInput {
    if (!input || input.trim() === '') {
      return { valueInMm: 0, isValid: false, errorMessage: 'Valor requerido' };
    }

    const trimmedInput = input.trim();

    try {
      switch (format) {
        case 'mm':
          return this.parseNumeric(trimmedInput, 1);
        case 'cm':
          return this.parseNumeric(trimmedInput, 10);
        case 'm':
          return this.parseNumeric(trimmedInput, 1000);
        case 'in':
          return this.parseNumeric(trimmedInput, this.MM_PER_IN);
        case 'ft':
          return this.parseNumeric(trimmedInput, this.MM_PER_FT);
        case 'ft-in':
          return this.parseFeetInches(trimmedInput);
        case 'ft-in-1/8':
        case 'ft-in-1/16':
        case 'ft-in-1/32':
        case 'ft-in-1/64':
          return this.parseFeetInchesFraction(trimmedInput, format);
        default:
          return { valueInMm: 0, isValid: false, errorMessage: 'Formato no soportado' };
      }
    } catch (error) {
      return { valueInMm: 0, isValid: false, errorMessage: error.message || 'Error al parsear' };
    }
  }

  /**
   * Formatea un valor en mm para mostrar en un input según el formato
   * @param valueInMm Valor en milímetros
   * @param format Formato de nivel configurado
   * @returns String formateado para el input
   */
  formatForInput(valueInMm: number, format: LevelFormat): string {
    if (valueInMm === null || valueInMm === undefined || isNaN(valueInMm)) {
      return '';
    }

    switch (format) {
      case 'mm':
        return Math.round(valueInMm).toString();
      case 'cm':
        return (valueInMm * this.MM_TO_CM).toFixed(2);
      case 'm':
        return (valueInMm * this.MM_TO_M).toFixed(2);
      case 'in':
        return (valueInMm * this.MM_TO_IN).toFixed(2);
      case 'ft':
        return (valueInMm * this.MM_TO_FT).toFixed(2);
      case 'ft-in':
        return this.formatFeetInches(valueInMm);
      case 'ft-in-1/8':
      case 'ft-in-1/16':
      case 'ft-in-1/32':
      case 'ft-in-1/64':
        return this.formatFeetInchesFraction(valueInMm, format);
      default:
        return valueInMm.toString();
    }
  }

  /**
   * Obtiene el placeholder apropiado para el formato
   */
  getPlaceholder(format: LevelFormat): string {
    const placeholders: Record<LevelFormat, string> = {
      'mm': '5000',
      'cm': '500.00',
      'm': '5.00',
      'in': '196.85',
      'ft': '16.40',
      'ft-in': '16\' 5"',
      'ft-in-1/8': '16\' 5 1/8"',
      'ft-in-1/16': '16\' 5 3/16"',
      'ft-in-1/32': '16\' 5 7/32"',
      'ft-in-1/64': '16\' 5 15/64"'
    };
    return placeholders[format] || '';
  }

  /**
   * Obtiene la unidad de medida para mostrar
   */
  getUnit(format: LevelFormat): string {
    if (format.startsWith('ft-in')) {
      return ''; // Ya incluido en el formato
    }
    const units: Record<string, string> = {
      'mm': 'mm',
      'cm': 'cm',
      'm': 'm',
      'in': 'in',
      'ft': 'ft'
    };
    return units[format] || '';
  }

  /**
   * Parsea un valor numérico simple
   */
  private parseNumeric(input: string, multiplier: number): ParsedLevelInput {
    const value = parseFloat(input);
    if (isNaN(value)) {
      return { valueInMm: 0, isValid: false, errorMessage: 'Debe ser un número válido' };
    }
    if (value < 0) {
      return { valueInMm: 0, isValid: false, errorMessage: 'El valor no puede ser negativo' };
    }
    return { valueInMm: value * multiplier, isValid: true };
  }

  /**
   * Parsea formato pies y pulgadas: "12' 6"" o "12' 6.5""
   */
  private parseFeetInches(input: string): ParsedLevelInput {
    // Regex para capturar: pies' pulgadas"
    const regex = /^\s*(\d+(?:\.\d+)?)\s*['′]\s*(\d+(?:\.\d+)?)\s*["″]?\s*$/;
    const match = input.match(regex);

    if (!match) {
      return { 
        valueInMm: 0, 
        isValid: false, 
        errorMessage: 'Formato inválido. Use: 12\' 6" o 12\' 6.5"' 
      };
    }

    const feet = parseFloat(match[1]);
    const inches = parseFloat(match[2]);

    if (isNaN(feet) || isNaN(inches)) {
      return { valueInMm: 0, isValid: false, errorMessage: 'Valores numéricos inválidos' };
    }

    if (feet < 0 || inches < 0 || inches >= 12) {
      return { 
        valueInMm: 0, 
        isValid: false, 
        errorMessage: 'Pies y pulgadas deben ser positivos, pulgadas < 12' 
      };
    }

    const totalInches = (feet * 12) + inches;
    const valueInMm = totalInches * this.MM_PER_IN;

    return { valueInMm, isValid: true };
  }

  /**
   * Parsea formato pies, pulgadas y fracción: "12' 6 3/8""
   */
  private parseFeetInchesFraction(input: string, format: LevelFormat): ParsedLevelInput {
    // Regex para capturar: pies' pulgadas fracción"
    const regex = /^\s*(\d+)\s*['′]\s*(\d+)?\s*(\d+\s*\/\s*\d+)?\s*["″]?\s*$/;
    const match = input.match(regex);

    if (!match) {
      return { 
        valueInMm: 0, 
        isValid: false, 
        errorMessage: 'Formato inválido. Use: 12\' 6 3/8"' 
      };
    }

    const feet = parseInt(match[1]);
    const wholeInches = match[2] ? parseInt(match[2]) : 0;
    const fractionStr = match[3] ? match[3].replace(/\s/g, '') : '0/1';

    if (isNaN(feet) || isNaN(wholeInches)) {
      return { valueInMm: 0, isValid: false, errorMessage: 'Valores numéricos inválidos' };
    }

    // Parsear fracción
    const fractionParts = fractionStr.split('/');
    if (fractionParts.length !== 2) {
      return { valueInMm: 0, isValid: false, errorMessage: 'Fracción inválida' };
    }

    const numerator = parseInt(fractionParts[0]);
    const denominator = parseInt(fractionParts[1]);

    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
      return { valueInMm: 0, isValid: false, errorMessage: 'Fracción inválida' };
    }

    // Validar denominador según formato
    const expectedDenominator = this.getDenominatorFromFormat(format);
    if (denominator > expectedDenominator) {
      return { 
        valueInMm: 0, 
        isValid: false, 
        errorMessage: `Fracción debe ser múltiplo de 1/${expectedDenominator}` 
      };
    }

    if (feet < 0 || wholeInches < 0 || wholeInches >= 12) {
      return { 
        valueInMm: 0, 
        isValid: false, 
        errorMessage: 'Valores fuera de rango' 
      };
    }

    const fractionInches = numerator / denominator;
    const totalInches = (feet * 12) + wholeInches + fractionInches;
    const valueInMm = totalInches * this.MM_PER_IN;

    return { valueInMm, isValid: true };
  }

  /**
   * Formatea valor en mm a pies y pulgadas
   */
  private formatFeetInches(valueInMm: number): string {
    const totalInches = valueInMm * this.MM_TO_IN;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}' ${inches.toFixed(1)}"`;
  }

  /**
   * Formatea valor en mm a pies, pulgadas y fracción
   */
  private formatFeetInchesFraction(valueInMm: number, format: LevelFormat): string {
    const totalInches = valueInMm * this.MM_TO_IN;
    const feet = Math.floor(totalInches / 12);
    const remainingInches = totalInches % 12;
    
    const wholeInches = Math.floor(remainingInches);
    const fractionalPart = remainingInches - wholeInches;
    
    const denominator = this.getDenominatorFromFormat(format);
    const numerator = Math.round(fractionalPart * denominator);
    
    // Simplificar fracción
    const { num, den } = this.simplifyFraction(numerator, denominator);
    
    if (num === 0) {
      return `${feet}' ${wholeInches}"`;
    }
    
    return `${feet}' ${wholeInches} ${num}/${den}"`;
  }

  /**
   * Obtiene el denominador según el formato
   */
  private getDenominatorFromFormat(format: LevelFormat): number {
    const match = format.match(/1\/(\d+)/);
    return match ? parseInt(match[1]) : 8;
  }

  /**
   * Simplifica una fracción
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
   * Calcula el máximo común divisor
   */
  private greatestCommonDivisor(a: number, b: number): number {
    return b === 0 ? a : this.greatestCommonDivisor(b, a % b);
  }

  /**
   * Valida que un input sea válido para el formato
   */
  validateInput(input: string, format: LevelFormat): boolean {
    const result = this.parseInput(input, format);
    return result.isValid;
  }
}
