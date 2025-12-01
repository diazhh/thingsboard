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
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { 
  StrappingTable, 
  StrappingTableEntry, 
  FractionTableEntry,
  StrappingLookupResult 
} from '../models/strapping-table.model';

/**
 * Servicio para gestionar tablas de calibración (Strapping Tables)
 * 
 * Responsabilidades:
 * - Cargar/guardar tablas desde/hacia ThingsBoard attributes
 * - Validar estructura de tablas
 * - Importar desde CSV/Excel
 * - Exportar a diferentes formatos
 * - Búsqueda e interpolación en la tabla
 */
@Injectable({
  providedIn: 'root'
})
export class StrappingTableService {

  private baseUrl = '/api';

  constructor(
    private http: HttpClient
  ) {}

  /**
   * Obtener tabla de calibración de un tanque
   */
  getStrappingTable(tankId: string): Observable<StrappingTable | null> {
    return this.http.get<any[]>(
      `${this.baseUrl}/plugins/telemetry/ASSET/${tankId}/values/attributes/SERVER_SCOPE?keys=strappingTable`
    ).pipe(
      map((attributes: any[]) => {
        const attr = attributes.find((a: any) => a.key === 'strappingTable');
        if (!attr || !attr.value) {
          return null;
        }

        try {
          const tableData = typeof attr.value === 'string' 
            ? JSON.parse(attr.value) 
            : attr.value;
          
          return this.parseStrappingTable(tableData);
        } catch (error) {
          console.error('Error parsing strapping table:', error);
          return null;
        }
      }),
      catchError(error => {
        console.error('Error loading strapping table:', error);
        return of(null);
      })
    );
  }

  /**
   * Guardar tabla de calibración en un tanque
   */
  saveStrappingTable(tankId: string, table: StrappingTable): Observable<void> {
    // Validar tabla antes de guardar
    const validation = this.validateStrappingTable(table);
    if (!validation.valid) {
      return throwError(() => new Error(`Invalid strapping table: ${validation.errors.join(', ')}`));
    }

    // Preparar para serialización
    const tableJson = JSON.stringify(table);

    // ThingsBoard espera un objeto con los atributos
    const attributes = {
      strappingTable: tableJson,
      strappingTableVersion: table.version,
      strappingTableLastModified: table.lastModified.toISOString(),
      strappingTableUpdatedBy: table.createdBy
    };

    return this.http.post<void>(
      `${this.baseUrl}/plugins/telemetry/ASSET/${tankId}/SERVER_SCOPE`,
      attributes,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  /**
   * Eliminar tabla de calibración de un tanque
   */
  deleteStrappingTable(tankId: string): Observable<void> {
    const keys = ['strappingTable', 'strappingTableVersion', 'strappingTableLastModified', 'strappingTableUpdatedBy'];
    return this.http.delete<void>(
      `${this.baseUrl}/plugins/telemetry/ASSET/${tankId}/SERVER_SCOPE?keys=${keys.join(',')}`
    );
  }

  /**
   * Validar estructura de tabla de calibración
   */
  validateStrappingTable(table: StrappingTable): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar metadata
    if (!table.tankId) errors.push('Tank ID is required');
    if (!table.tankTag) errors.push('Tank Tag is required');
    if (!table.version) errors.push('Version is required');

    // Validar entradas
    if (!table.entries || table.entries.length === 0) {
      errors.push('Strapping table must have at least one entry');
    } else {
      // Validar que las entradas estén ordenadas
      for (let i = 1; i < table.entries.length; i++) {
        const prev = table.entries[i - 1];
        const curr = table.entries[i];
        
        const prevHeight = prev.feet * 12 + prev.inches;
        const currHeight = curr.feet * 12 + curr.inches;
        
        if (currHeight <= prevHeight) {
          errors.push(`Entry ${i} is not in ascending order`);
        }
      }

      // Validar que los volúmenes sean positivos (no validar si son crecientes)
      const factorCodes = ['vol470X1', 'vol260X4', 'vol260X3', 'vol260X2', 'vol260X1', 'vol165X1'];
      for (const factorCode of factorCodes) {
        for (let i = 0; i < table.entries.length; i++) {
          const entry = table.entries[i] as any;
          
          // Solo validar si el factor tiene datos
          if (entry[factorCode] === 0) continue;
          
          if (entry[factorCode] < 0) {
            errors.push(`Entry ${i} has negative volume for ${factorCode}`);
          }
          
          // No validar volúmenes decrecientes - pueden haber inconsistencias en datos de calibración
        }
      }
    }

    // Validar tabla de fracciones
    if (!table.fractionTable || table.fractionTable.length === 0) {
      errors.push('Fraction table is required');
    } else {
      // Validar que las fracciones estén ordenadas
      for (let i = 1; i < table.fractionTable.length; i++) {
        const prev = table.fractionTable[i - 1];
        const curr = table.fractionTable[i];
        
        if (curr.fractionDecimal <= prev.fractionDecimal) {
          errors.push(`Fraction entry ${i} is not in ascending order`);
        }
      }
    }

    // Validar calibración
    if (!table.calibrationStandard) errors.push('Calibration standard is required');
    if (!table.calibrationDate) errors.push('Calibration date is required');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Importar tabla desde CSV
   * Formato real: PIES,PULG.,135X1 (o cualquier factor como 260X1, 470X1, etc.)
   * Los números pueden tener formato con comas (ej: "1,169")
   */
  importFromCSV(csvContent: string, tankId: string, tankTag: string): Observable<StrappingTable> {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        return throwError(() => new Error('CSV file is empty or has no data rows'));
      }

      // Parsear header
      const header = lines[0].split(',').map(h => h.trim().toUpperCase());
      
      // Detectar columnas (formato flexible)
      const feetCol = header.findIndex(h => h.includes('PIES') || h.includes('FEET') || h.includes('FT'));
      const inchCol = header.findIndex(h => h.includes('PULG') || h.includes('INCH') || h.includes('IN'));
      
      if (feetCol === -1 || inchCol === -1) {
        return throwError(() => new Error('CSV must have PIES/FEET and PULG/INCHES columns'));
      }

      // Detectar columna de volumen (puede ser cualquier factor: 135X1, 260X1, etc.)
      const volumeCol = header.findIndex((h, idx) => idx > inchCol && h.trim() !== '');
      if (volumeCol === -1) {
        return throwError(() => new Error('CSV must have a volume column (e.g., 135X1, 260X1)'));
      }

      const factorCode = header[volumeCol]; // Ej: "135X1", "260X1"

      // Parsear entradas
      const entries: StrappingTableEntry[] = [];
      let medEq = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = this.parseCSVLine(line);
        
        if (values.length < 3) {
          continue; // Saltar líneas incompletas
        }

        const feetStr = values[feetCol]?.trim();
        const inchStr = values[inchCol]?.trim();
        const volumeStr = values[volumeCol]?.trim();

        // Saltar si no hay datos
        if (!feetStr || !inchStr || !volumeStr) {
          continue;
        }

        // Parsear números (remover comas)
        const feet = parseFloat(feetStr.replace(/,/g, ''));
        const inches = parseFloat(inchStr.replace(/,/g, ''));
        const volume = parseFloat(volumeStr.replace(/,/g, '').replace(/"/g, ''));

        // Validar valores numéricos
        if (isNaN(feet) || isNaN(inches) || isNaN(volume)) {
          continue;
        }

        // Crear entrada con el factor detectado
        const entry: StrappingTableEntry = {
          feet,
          inches,
          medEq: medEq++,
          vol470X1: factorCode.includes('470') ? volume : 0,
          vol260X4: factorCode.includes('260X4') ? volume : 0,
          vol260X3: factorCode.includes('260X3') ? volume : 0,
          vol260X2: factorCode.includes('260X2') ? volume : 0,
          vol260X1: factorCode.includes('260X1') || factorCode.includes('260') ? volume : 0,
          vol165X1: factorCode.includes('165') || factorCode.includes('135') ? volume : 0
        };

        entries.push(entry);
      }

      if (entries.length === 0) {
        return throwError(() => new Error('No valid entries found in CSV'));
      }

      // Crear tabla
      const table: StrappingTable = {
        tankId,
        tankTag,
        createdDate: new Date(),
        lastModified: new Date(),
        createdBy: 'imported',
        version: '1.0',
        tankHeight: 0,
        tankDiameter: 0,
        tankShape: 'vertical',
        referenceHeight: 0,
        heightUnit: 'ft',
        volumeUnit: 'bbl',
        defaultFactorCode: factorCode,
        entries,
        fractionTable: this.getDefaultFractionTable(),
        calibrationStandard: 'API MPMS Chapter 2.2A',
        calibrationDate: new Date(),
        calibrationAgency: 'Unknown',
        certificateNumber: 'N/A',
        notes: `Imported from CSV with factor ${factorCode}`
      };

      return of(table);
    } catch (error) {
      return throwError(() => new Error(`Error parsing CSV: ${error}`));
    }
  }

  /**
   * Parsear línea CSV manejando comillas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Importar tabla de fracciones desde CSV
   * Formato: FRACCION,135X1 (o cualquier factor)
   */
  importFractionsFromCSV(csvContent: string): FractionTableEntry[] {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        return this.getDefaultFractionTable();
      }

      const fractions: FractionTableEntry[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values.length < 2) continue;

        const fractionStr = values[0].trim();
        const barrelsStr = values[1].trim();

        if (!fractionStr || !barrelsStr) continue;

        const barrels = parseFloat(barrelsStr.replace(/,/g, ''));
        if (isNaN(barrels)) continue;

        // Calcular decimal de la fracción
        const fractionDecimal = this.parseFraction(fractionStr);

        fractions.push({
          fraction: fractionStr,
          fractionDecimal,
          barrels
        });
      }

      return fractions.length > 0 ? fractions : this.getDefaultFractionTable();
    } catch (error) {
      console.error('Error parsing fractions CSV:', error);
      return this.getDefaultFractionTable();
    }
  }

  /**
   * Parsear fracción a decimal (ej: "1/16" -> 0.0625)
   */
  private parseFraction(fractionStr: string): number {
    const match = fractionStr.match(/(\d+)\/(\d+)/);
    if (match) {
      const numerator = parseInt(match[1]);
      const denominator = parseInt(match[2]);
      return numerator / denominator;
    }
    return 0;
  }

  /**
   * Exportar tabla a CSV
   */
  exportToCSV(table: StrappingTable): string {
    const header = 'feet,inches,medEq,vol470X1,vol260X4,vol260X3,vol260X2,vol260X1,vol165X1';
    const rows = table.entries.map(entry => 
      `${entry.feet},${entry.inches},${entry.medEq},${entry.vol470X1},${entry.vol260X4},${entry.vol260X3},${entry.vol260X2},${entry.vol260X1},${entry.vol165X1}`
    );

    return [header, ...rows].join('\n');
  }

  /**
   * Buscar volumen en la tabla para un nivel dado
   */
  lookupVolume(table: StrappingTable, levelMeters: number, factorCode: string = '260X1'): StrappingLookupResult | null {
    // Convertir nivel a pies y pulgadas
    const levelFeet = levelMeters * 3.28084; // metros a pies
    const feet = Math.floor(levelFeet);
    const inchesDecimal = (levelFeet - feet) * 12;
    const inches = Math.floor(inchesDecimal);
    const fraction = inchesDecimal - inches;

    // Buscar entrada en la tabla
    const entry = table.entries.find(e => e.feet === feet && e.inches === inches);

    if (!entry) {
      // Interpolación necesaria
      const lowerEntry = this.findLowerEntry(table, feet, inches);
      const upperEntry = this.findUpperEntry(table, feet, inches);

      if (!lowerEntry || !upperEntry) {
        console.warn('Level out of strapping table range');
        return null;
      }

      // Interpolación lineal
      const lowerHeight = lowerEntry.feet * 12 + lowerEntry.inches;
      const upperHeight = upperEntry.feet * 12 + upperEntry.inches;
      const currentHeight = feet * 12 + inches + fraction;

      const interpolationFactor = (currentHeight - lowerHeight) / (upperHeight - lowerHeight);

      const lowerVolume = this.getVolumeForFactor(lowerEntry, factorCode);
      const upperVolume = this.getVolumeForFactor(upperEntry, factorCode);

      const interpolatedVolume = lowerVolume + (upperVolume - lowerVolume) * interpolationFactor;

      // Agregar fracción
      const fractionBarrels = this.getFractionBarrels(table, fraction);
      const totalVolume = interpolatedVolume + fractionBarrels;

      return {
        entry: lowerEntry,
        interpolated: true,
        lowerEntry,
        upperEntry,
        interpolationFactor,
        volumeBarrels: totalVolume,
        volumeM3: totalVolume * 0.158987, // barriles a m³
        levelFeet: feet,
        levelInches: inches,
        levelFraction: fraction
      };
    }

    // Entrada exacta encontrada
    const baseVolume = this.getVolumeForFactor(entry, factorCode);
    const fractionBarrels = this.getFractionBarrels(table, fraction);
    const totalVolume = baseVolume + fractionBarrels;

    return {
      entry,
      interpolated: false,
      volumeBarrels: totalVolume,
      volumeM3: totalVolume * 0.158987,
      levelFeet: feet,
      levelInches: inches,
      levelFraction: fraction
    };
  }

  /**
   * Parsear tabla desde JSON
   */
  private parseStrappingTable(data: any): StrappingTable {
    return {
      ...data,
      createdDate: new Date(data.createdDate),
      lastModified: new Date(data.lastModified),
      calibrationDate: new Date(data.calibrationDate)
    };
  }

  /**
   * Obtener volumen para un factor específico
   */
  private getVolumeForFactor(entry: StrappingTableEntry, factorCode: string): number {
    switch (factorCode) {
      case '470X1': return entry.vol470X1;
      case '260X4': return entry.vol260X4;
      case '260X3': return entry.vol260X3;
      case '260X2': return entry.vol260X2;
      case '260X1': return entry.vol260X1;
      case '165X1': return entry.vol165X1;
      default: return entry.vol260X1;
    }
  }

  /**
   * Buscar entrada inferior más cercana
   */
  private findLowerEntry(table: StrappingTable, feet: number, inches: number): StrappingTableEntry | null {
    const targetHeight = feet * 12 + inches;
    
    for (let i = table.entries.length - 1; i >= 0; i--) {
      const entry = table.entries[i];
      const entryHeight = entry.feet * 12 + entry.inches;
      
      if (entryHeight <= targetHeight) {
        return entry;
      }
    }
    
    return null;
  }

  /**
   * Buscar entrada superior más cercana
   */
  private findUpperEntry(table: StrappingTable, feet: number, inches: number): StrappingTableEntry | null {
    const targetHeight = feet * 12 + inches;
    
    for (let i = 0; i < table.entries.length; i++) {
      const entry = table.entries[i];
      const entryHeight = entry.feet * 12 + entry.inches;
      
      if (entryHeight >= targetHeight) {
        return entry;
      }
    }
    
    return null;
  }

  /**
   * Obtener barriles correspondientes a una fracción
   */
  private getFractionBarrels(table: StrappingTable, fraction: number): number {
    if (!table.fractionTable || table.fractionTable.length === 0) {
      return 0;
    }

    // Buscar fracción más cercana
    let closestEntry = table.fractionTable[0];
    let minDiff = Math.abs(fraction - closestEntry.fractionDecimal);

    for (const entry of table.fractionTable) {
      const diff = Math.abs(fraction - entry.fractionDecimal);
      if (diff < minDiff) {
        minDiff = diff;
        closestEntry = entry;
      }
    }

    return closestEntry.barrels;
  }

  /**
   * Obtener tabla de fracciones por defecto
   */
  private getDefaultFractionTable(): FractionTableEntry[] {
    return [
      { fraction: '0', fractionDecimal: 0, barrels: 0 },
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
