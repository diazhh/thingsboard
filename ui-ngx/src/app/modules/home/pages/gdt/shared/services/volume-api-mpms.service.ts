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
  StrappingTable,
  StrappingTableEntry,
  StrappingLookupResult,
  VolumeCalculationParams,
  VolumeCalculationResult,
  CorrectionFactor
} from '../models/strapping-table.model';

/**
 * Servicio de cálculo de volumen según API MPMS Chapter 11
 *
 * API MPMS (Manual of Petroleum Measurement Standards)
 * Chapter 11: Physical Properties Data
 * Section 1: Temperature and Pressure Volume Correction Factors for Generalized Crude Oils
 *
 * Implementa:
 * - Búsqueda en tabla de calibración (strapping table)
 * - Interpolación lineal entre entradas
 * - Cálculo de factores de corrección CTL, CPL, CTSH
 * - Conversión GOV -> GSV -> NSV
 */
@Injectable()
export class VolumeApiMpmsService {

  /**
   * Calcula el volumen del tanque basado en el nivel medido
   * Usa la tabla de calibración y factores de corrección
   */
  calculateVolume(params: VolumeCalculationParams): VolumeCalculationResult {
    // 1. Convertir nivel de mm a pies/pulgadas
    const levelMeters = params.levelMM / 1000;
    const levelFeet = this.metersToFeet(levelMeters - (params.bottomOffset / 1000));

    // 2. Buscar en la tabla de calibración
    const strappingLookup = this.lookupStrappingTable(
      levelFeet,
      params.strappingTable,
      params.correctionFactorCode || '260X1'
    );

    // 3. Obtener GOV (Gross Observed Volume) de la tabla
    const govBarrels = strappingLookup.volumeBarrels;
    const govM3 = strappingLookup.volumeM3;

    // 4. Calcular factores de corrección
    const correctionFactor = this.calculateCorrectionFactors(
      params.apiGravity,
      params.temperatureF,
      0 // presión atmosférica por defecto
    );

    // 5. Aplicar CTL para obtener GSV (Gross Standard Volume)
    const gsvBarrels = govBarrels * correctionFactor.ctl;
    const gsvM3 = govM3 * correctionFactor.ctl;

    // 6. Calcular densidad estándar y observada
    const standardDensity = this.apiGravityToDensity(params.apiGravity, 60); // @60°F
    const observedDensity = this.apiGravityToDensity(params.apiGravity, params.temperatureF);

    // 7. NSV = GSV (para productos limpios, sin BS&W)
    // En caso de tener sedimentos y agua (BS&W), se restaría aquí
    const nsvBarrels = gsvBarrels;
    const nsvM3 = gsvM3;

    return {
      grossObservedVolume: govM3,
      grossStandardVolume: gsvM3,
      netStandardVolume: nsvM3,
      observedTemperature: params.temperatureF,
      observedDensity: observedDensity,
      standardDensity: standardDensity,
      ctl: correctionFactor.ctl,
      cpl: correctionFactor.cpl,
      ctsh: correctionFactor.ctsh,
      strappingLookup: strappingLookup,
      calculationDate: new Date(),
      apiStandard: 'API MPMS Chapter 11.1 (2004)'
    };
  }

  /**
   * Busca el volumen en la tabla de calibración
   * Realiza interpolación lineal si es necesario
   */
  private lookupStrappingTable(
    levelFeet: number,
    table: StrappingTable,
    factorCode: string
  ): StrappingLookupResult {
    // Separar pies, pulgadas y fracciones
    const feet = Math.floor(levelFeet);
    const remainingInches = (levelFeet - feet) * 12;
    const inches = Math.floor(remainingInches);
    const fractionInches = remainingInches - inches;

    // Buscar entrada exacta o interpolada
    const lowerEntry = this.findEntry(table, feet, inches);
    const upperEntry = this.findEntry(table, feet, inches + 1) || this.findEntry(table, feet + 1, 0);

    if (!lowerEntry) {
      throw new Error(`No strapping table entry found for ${feet}' ${inches}"`);
    }

    let volumeBarrels: number;
    let interpolated = false;

    // Si hay fracción, interpolar
    if (fractionInches > 0.001 && upperEntry) {
      const lowerVol = this.getVolumeFromEntry(lowerEntry, factorCode);
      const upperVol = this.getVolumeFromEntry(upperEntry, factorCode);
      volumeBarrels = lowerVol + (upperVol - lowerVol) * fractionInches;
      interpolated = true;
    } else {
      volumeBarrels = this.getVolumeFromEntry(lowerEntry, factorCode);
    }

    // Agregar volumen de fracciones si aplica
    if (fractionInches > 0) {
      const fractionVolume = this.getFractionVolume(table, fractionInches);
      volumeBarrels += fractionVolume;
    }

    // Convertir a m³
    const volumeM3 = this.barrelsToM3(volumeBarrels);

    return {
      entry: lowerEntry,
      interpolated,
      lowerEntry: interpolated ? lowerEntry : undefined,
      upperEntry: interpolated ? upperEntry : undefined,
      interpolationFactor: interpolated ? fractionInches : undefined,
      volumeBarrels,
      volumeM3,
      levelFeet: feet,
      levelInches: inches,
      levelFraction: fractionInches
    };
  }

  /**
   * Encuentra una entrada en la tabla por pies y pulgadas
   */
  private findEntry(table: StrappingTable, feet: number, inches: number): StrappingTableEntry | null {
    return table.entries.find(e => e.feet === feet && e.inches === inches) || null;
  }

  /**
   * Obtiene el volumen de una entrada según el factor code
   *
   * NOTA IMPORTANTE:
   * Los códigos como '470X1', '260X4' NO son identificadores de tanques.
   * Son factores de corrección de temperatura pre-calculados en la tabla:
   * - Primer número: Temperatura de referencia (470 = 47°F, 260 = 26°F)
   * - Segundo número: Factor de expansión del material
   *
   * Cada TANQUE (ThingsBoard Asset) tiene su PROPIA tabla de calibración única,
   * almacenada como atributo JSON en el Asset. La tabla puede tener diferentes
   * columnas según cómo fue calibrada.
   *
   * El factor a usar se configura en los atributos del tanque según su
   * temperatura de operación típica.
   */
  private getVolumeFromEntry(entry: StrappingTableEntry, factorCode?: string): number {
    // Si no se especifica factor, usar el campo base de la tabla
    // Cada tanque puede tener una estructura diferente
    if (!factorCode) {
      // Intentar usar el campo más común primero
      return entry.vol260X1 || entry.vol470X1 || entry.vol260X4 || 0;
    }

    // Si se especifica un factor específico, buscarlo
    switch(factorCode) {
      case '470X1': return entry.vol470X1 || 0;
      case '260X4': return entry.vol260X4 || 0;
      case '260X3': return entry.vol260X3 || 0;
      case '260X2': return entry.vol260X2 || 0;
      case '260X1': return entry.vol260X1 || 0;
      case '165X1': return entry.vol165X1 || 0;
      default:
        // Intentar acceder dinámicamente usando el código como clave
        // Esto permite soportar tablas con nombres personalizados
        const key = `vol${factorCode}` as keyof StrappingTableEntry;
        return (entry[key] as number) || 0;
    }
  }

  /**
   * Obtiene el volumen correspondiente a una fracción de pulgada
   */
  private getFractionVolume(table: StrappingTable, fractionDecimal: number): number {
    if (!table.fractionTable || table.fractionTable.length === 0) {
      return 0;
    }

    // Buscar la fracción más cercana
    const closestFraction = table.fractionTable.reduce((prev, curr) => {
      return Math.abs(curr.fractionDecimal - fractionDecimal) < Math.abs(prev.fractionDecimal - fractionDecimal)
        ? curr
        : prev;
    });

    return closestFraction.barrels;
  }

  /**
   * Calcula los factores de corrección según API MPMS Chapter 11.1
   *
   * CTL: Correction for Temperature on Liquid
   * CPL: Correction for Pressure on Liquid
   * CTSH: Correction for Temperature on Steel Shell
   */
  private calculateCorrectionFactors(
    apiGravity: number,
    temperatureF: number,
    pressurePSI: number
  ): CorrectionFactor {
    // CTL - Factor de corrección por temperatura
    // Fórmula simplificada basada en API MPMS 11.1
    // Para una implementación completa, se deben usar las tablas del estándar
    const refTemp = 60; // °F (temperatura de referencia)
    const deltaT = temperatureF - refTemp;

    // Coeficiente de expansión térmica (aproximado)
    // Varía con API gravity: menor API = mayor expansión
    const alpha = 0.0004 + (0.00002 * (100 - apiGravity));
    const ctl = 1 / (1 + alpha * deltaT);

    // CPL - Factor de corrección por presión (típicamente muy pequeño para tanques atmosféricos)
    const cpl = 1.0 + (pressurePSI * 0.000001); // Factor simplificado

    // CTSH - Factor de corrección por expansión del casco de acero
    // Coeficiente de expansión del acero: ~0.0000065 per °F
    const alphaSh = 0.0000065;
    const ctsh = 1 + (alphaSh * deltaT);

    return {
      temperature: temperatureF,
      pressure: pressurePSI,
      factorCode: '260X1',
      ctl,
      cpl,
      ctsh
    };
  }

  /**
   * Convierte API Gravity a densidad
   * Density (kg/m³) = (141.5 / (API + 131.5)) * 999.016 (densidad del agua @60°F)
   */
  private apiGravityToDensity(apiGravity: number, temperatureF: number): number {
    const sg60 = 141.5 / (apiGravity + 131.5); // Specific Gravity @ 60°F
    const densityAt60 = sg60 * 999.016; // kg/m³

    // Ajustar por temperatura
    const deltaT = temperatureF - 60;
    const alpha = 0.0004;
    const densityAtTemp = densityAt60 / (1 + alpha * deltaT);

    return densityAtTemp;
  }

  /**
   * Convierte densidad a API Gravity
   * API = (141.5 / SG) - 131.5
   */
  private densityToApiGravity(densityKgM3: number): number {
    const sg = densityKgM3 / 999.016;
    return (141.5 / sg) - 131.5;
  }

  /**
   * Conversión de metros a pies
   */
  private metersToFeet(meters: number): number {
    return meters * 3.28084;
  }

  /**
   * Conversión de pies a metros
   */
  private feetToMeters(feet: number): number {
    return feet / 3.28084;
  }

  /**
   * Conversión de barriles a m³
   * 1 barrel (US) = 0.158987 m³
   */
  private barrelsToM3(barrels: number): number {
    return barrels * 0.158987;
  }

  /**
   * Conversión de m³ a barriles
   */
  private m3ToBarrels(m3: number): number {
    return m3 / 0.158987;
  }

  /**
   * Valida que el API Gravity esté en rango válido
   */
  validateApiGravity(apiGravity: number): boolean {
    return apiGravity >= 4.0 && apiGravity <= 99.9;
  }

  /**
   * Valida que la temperatura esté en rango válido según API MPMS
   */
  validateTemperature(temperatureF: number): boolean {
    return temperatureF >= 20 && temperatureF <= 174.9;
  }

  /**
   * Crea una entrada de fracción estándar basada en la tabla proporcionada
   */
  createStandardFractionTable(): any[] {
    return [
      { fraction: '0', fractionDecimal: 0.0, barrels: 0 },
      { fraction: '1/16', fractionDecimal: 0.0625, barrels: 10 },
      { fraction: '1/8', fractionDecimal: 0.125, barrels: 21 },
      { fraction: '3/16', fractionDecimal: 0.1875, barrels: 31 },
      { fraction: '1/4', fractionDecimal: 0.25, barrels: 42 },
      { fraction: '5/16', fractionDecimal: 0.3125, barrels: 52 },
      { fraction: '3/8', fractionDecimal: 0.375, barrels: 63 },
      { fraction: '7/16', fractionDecimal: 0.4375, barrels: 73 },
      { fraction: '1/2', fractionDecimal: 0.5, barrels: 84 },
      { fraction: '9/16', fractionDecimal: 0.5625, barrels: 94 },
      { fraction: '5/8', fractionDecimal: 0.625, barrels: 105 },
      { fraction: '11/16', fractionDecimal: 0.6875, barrels: 115 },
      { fraction: '3/4', fractionDecimal: 0.75, barrels: 126 },
      { fraction: '13/16', fractionDecimal: 0.8125, barrels: 136 },
      { fraction: '7/8', fractionDecimal: 0.875, barrels: 147 },
      { fraction: '15/16', fractionDecimal: 0.9375, barrels: 157 }
    ];
  }
}
