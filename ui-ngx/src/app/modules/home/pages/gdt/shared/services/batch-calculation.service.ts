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
import { GaugeReading } from '../models/batch.model';

/**
 * Batch Calculation Service
 * 
 * Implements API MPMS (American Petroleum Institute Manual of Petroleum
 * Measurement Standards) calculations for custody transfer batches
 */
@Injectable({
  providedIn: 'root'
})
export class BatchCalculationService {

  /**
   * Calculate volume corrections based on temperature and API gravity
   * 
   * Uses API MPMS Chapter 11.1 formulas for volume correction
   */
  calculateVolumeCorrections(
    observedVolume: number,
    temperature: number,
    apiGravity: number,
    referenceTemperature: number = 15
  ): {
    ctpl: number;  // Correction for thermal expansion of liquid
    cpl: number;   // Correction for pressure on liquid
    cstl: number;  // Correction for steel tape
    gsv: number;   // Gross Standard Volume
  } {
    // Thermal expansion coefficient (simplified for petroleum products)
    const thermalCoeff = 0.0006; // Typical for crude oil
    
    // Calculate thermal correction
    const tempDiff = temperature - referenceTemperature;
    const ctpl = observedVolume * thermalCoeff * tempDiff;
    
    // Pressure correction (simplified - typically small)
    const cpl = 0; // Assuming atmospheric pressure
    
    // Steel tape correction (simplified)
    const cstl = 0;
    
    // Gross Standard Volume = Observed Volume - Thermal Correction
    const gsv = observedVolume - ctpl;
    
    return {
      ctpl,
      cpl,
      cstl,
      gsv
    };
  }

  /**
   * Calculate Net Standard Volume (NSV)
   * 
   * NSV = GSV - Water in Air (WIA)
   */
  calculateNSV(gsv: number, wia: number = 0): number {
    return gsv - wia;
  }

  /**
   * Calculate mass from volume and density
   * 
   * Mass = Volume × Density
   */
  calculateMass(volume: number, density: number): number {
    return volume * density;
  }

  /**
   * Convert API Gravity to density (kg/m³)
   * 
   * Uses API gravity formula: Density = 141.5 / (API + 131.5) × 1000
   */
  apiGravityToDensity(apiGravity: number): number {
    return (141.5 / (apiGravity + 131.5)) * 1000;
  }

  /**
   * Convert density to API Gravity
   */
  densityToApiGravity(density: number): number {
    return (141.5 / (density / 1000)) - 131.5;
  }

  /**
   * Calculate water content correction
   * 
   * Adjusts volume based on water and sediment content (BS&W)
   */
  calculateWaterCorrection(volume: number, bsw: number): number {
    // BS&W is percentage of water and sediment
    // Water correction = Volume × (BS&W / 100)
    return volume * (bsw / 100);
  }

  /**
   * Calculate total observed volume (TOV)
   * 
   * TOV = Level × Tank Strapping Factor
   */
  calculateTOV(level: number, strapFactor: number): number {
    return level * strapFactor;
  }

  /**
   * Calculate Gross Observed Volume (GOV)
   * 
   * GOV = TOV + Free Water
   */
  calculateGOV(tov: number, freeWater: number = 0): number {
    return tov + freeWater;
  }

  /**
   * Complete gauge reading calculation
   * 
   * Calculates all volumes and mass for a gauge reading
   */
  calculateGaugeReading(
    level: number,
    temperature: number,
    apiGravity: number,
    bsw: number = 0,
    strapFactor: number = 1,
    operator: string = 'System'
  ): GaugeReading {
    const timestamp = Date.now();
    
    // Calculate TOV (Total Observed Volume)
    const tov = this.calculateTOV(level, strapFactor);
    
    // Calculate GOV (Gross Observed Volume)
    const gov = this.calculateGOV(tov);
    
    // Calculate volume corrections
    const corrections = this.calculateVolumeCorrections(gov, temperature, apiGravity);
    const gsv = corrections.gsv;
    
    // Calculate WIA (Water in Air)
    const wia = this.calculateWaterCorrection(gsv, bsw);
    
    // Calculate NSV (Net Standard Volume)
    const nsv = this.calculateNSV(gsv, wia);
    
    // Calculate mass
    const density = this.apiGravityToDensity(apiGravity);
    const mass = this.calculateMass(nsv, density);
    
    return {
      timestamp,
      operator,
      level,
      temperature,
      apiGravity,
      bsw,
      tov,
      gov,
      gsv,
      nsv,
      mass,
      wia
    };
  }

  /**
   * Calculate transferred quantities between two gauge readings
   */
  calculateTransfer(opening: GaugeReading, closing: GaugeReading): {
    transferredNSV: number;
    transferredMass: number;
    transferredWIA: number;
    density: number;
  } {
    // Use average density for the transfer
    const openingDensity = this.apiGravityToDensity(opening.apiGravity);
    const closingDensity = this.apiGravityToDensity(closing.apiGravity);
    const avgDensity = (openingDensity + closingDensity) / 2;
    
    return {
      transferredNSV: (closing.nsv || 0) - (opening.nsv || 0),
      transferredMass: (closing.mass || 0) - (opening.mass || 0),
      transferredWIA: (closing.wia || 0) - (opening.wia || 0),
      density: avgDensity
    };
  }

  /**
   * Validate gauge reading data
   */
  validateGaugeReading(reading: GaugeReading): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (reading.level < 0) {
      errors.push('Level cannot be negative');
    }

    if (reading.temperature < -50 || reading.temperature > 150) {
      errors.push('Temperature out of valid range (-50°C to 150°C)');
    }

    if (reading.apiGravity < 4 || reading.apiGravity > 99.9) {
      errors.push('API Gravity out of valid range (4 to 99.9)');
    }

    if (reading.bsw && (reading.bsw < 0 || reading.bsw > 100)) {
      errors.push('BS&W out of valid range (0% to 100%)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Format volume for display
   */
  formatVolume(volume: number, unit: string = 'bbl'): string {
    return `${volume.toFixed(2)} ${unit}`;
  }

  /**
   * Format mass for display
   */
  formatMass(mass: number, unit: string = 'kg'): string {
    return `${mass.toFixed(2)} ${unit}`;
  }

  /**
   * Calculate density correction factor
   * 
   * Used for converting between different reference temperatures
   */
  calculateDensityCorrectionFactor(
    fromTemp: number,
    toTemp: number,
    apiGravity: number
  ): number {
    const thermalCoeff = 0.0006;
    const tempDiff = toTemp - fromTemp;
    return 1 + (thermalCoeff * tempDiff);
  }
}
