import { Injectable } from '@angular/core';
import { TankData } from '../models/tank-data.model';

@Injectable()
export class TankCalculationService {

  /**
   * Calcula el porcentaje de llenado
   */
  calculateLevelPercent(level: number, tankHeight: number, bottomHeadDist: number = 0): number {
    // Validar que tankHeight sea válido
    if (!tankHeight || tankHeight <= 0) {
      return 0;
    }
    
    const effectiveHeight = tankHeight - bottomHeadDist;
    const effectiveLevel = Math.max(0, level - bottomHeadDist);
    
    // Evitar división por cero
    if (effectiveHeight <= 0) {
      return 0;
    }
    
    const percent = (effectiveLevel / effectiveHeight) * 100;
    return Math.max(0, Math.min(100, percent));
  }

  /**
   * Calcula el volumen actual basado en geometría
   */
  calculateVolume(level: number, tankData: Partial<TankData>): number {
    const { tankShape, tankHeight, tankDiameter, bottomHeadDistance } = tankData;

    if (!tankShape || !tankDiameter) {
      return 0;
    }

    if (tankShape === 'vertical') {
      return this.calculateVerticalCylinderVolume(level, tankDiameter, bottomHeadDistance || 0);
    } else if (tankShape === 'horizontal') {
      return this.calculateHorizontalCylinderVolume(level, tankDiameter, tankHeight || 0);
    } else if (tankShape === 'spherical') {
      return this.calculateSphericalVolume(level, tankDiameter);
    }

    return 0;
  }

  /**
   * Calcula volumen de cilindro vertical
   */
  private calculateVerticalCylinderVolume(level: number, diameter: number, bottomHeadDist: number): number {
    const radius = diameter / 2;
    const effectiveLevel = Math.max(0, level - bottomHeadDist);
    return Math.PI * radius * radius * effectiveLevel;
  }

  /**
   * Calcula volumen de cilindro horizontal
   * Usa la fórmula del segmento circular
   */
  private calculateHorizontalCylinderVolume(level: number, diameter: number, length: number): number {
    const radius = diameter / 2;
    const h = Math.min(Math.max(0, level), diameter);

    if (h === 0) return 0;
    if (h >= diameter) return Math.PI * radius * radius * length;

    // Fórmula para cilindro horizontal
    const area = radius * radius * Math.acos((radius - h) / radius) -
                 (radius - h) * Math.sqrt(2 * radius * h - h * h);
    return area * length;
  }

  /**
   * Calcula volumen de tanque esférico
   * Usa la fórmula del casquete esférico
   */
  private calculateSphericalVolume(level: number, diameter: number): number {
    const radius = diameter / 2;
    const h = Math.min(Math.max(0, level), diameter);

    if (h === 0) return 0;
    if (h >= diameter) return (4/3) * Math.PI * radius * radius * radius;

    // Fórmula para segmento esférico
    return (Math.PI * h * h * (3 * radius - h)) / 3;
  }

  /**
   * Convierte volumen entre unidades
   */
  convertVolume(volume: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return volume;

    // Primero convertir a m³ (unidad base)
    let volumeM3 = volume;
    switch(fromUnit.toLowerCase()) {
      case 'liters':
      case 'l':
        volumeM3 = volume / 1000;
        break;
      case 'barrels':
      case 'bbl':
        volumeM3 = volume / 6.28981;
        break;
      case 'gallons':
      case 'gal':
        volumeM3 = volume / 264.172;
        break;
      case 'm3':
      case 'm³':
        volumeM3 = volume;
        break;
    }

    // Luego convertir de m³ a la unidad destino
    switch(toUnit.toLowerCase()) {
      case 'liters':
      case 'l':
        return volumeM3 * 1000;
      case 'barrels':
      case 'bbl':
        return volumeM3 * 6.28981;
      case 'gallons':
      case 'gal':
        return volumeM3 * 264.172;
      case 'm3':
      case 'm³':
        return volumeM3;
      default:
        return volumeM3;
    }
  }

  /**
   * Convierte nivel entre unidades
   */
  convertLevel(level: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return level;

    // Primero convertir a metros (unidad base)
    let levelM = level;
    switch(fromUnit.toLowerCase()) {
      case 'ft':
      case 'feet':
        levelM = level * 0.3048;
        break;
      case 'm':
      case 'meters':
        levelM = level;
        break;
      case 'mm':
        levelM = level / 1000;
        break;
      case 'cm':
        levelM = level / 100;
        break;
    }

    // Luego convertir de metros a la unidad destino
    switch(toUnit.toLowerCase()) {
      case 'ft':
      case 'feet':
        return levelM * 3.28084;
      case 'm':
      case 'meters':
        return levelM;
      case 'mm':
        return levelM * 1000;
      case 'cm':
        return levelM * 100;
      default:
        return levelM;
    }
  }

  /**
   * Convierte temperatura entre unidades
   */
  convertTemperature(temp: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return temp;

    if (fromUnit.toUpperCase() === 'C' && toUnit.toUpperCase() === 'F') {
      return (temp * 9/5) + 32;
    } else if (fromUnit.toUpperCase() === 'F' && toUnit.toUpperCase() === 'C') {
      return (temp - 32) * 5/9;
    }

    return temp;
  }

  /**
   * Calcula el ullage (espacio vacío) en metros
   */
  calculateUllage(tankHeight: number, level: number): number {
    return Math.max(0, tankHeight - level);
  }

  /**
   * Calcula el volumen disponible (capacidad - volumen actual)
   */
  calculateAvailableVolume(capacity: number, currentVolume: number): number {
    return Math.max(0, capacity - currentVolume);
  }
}
