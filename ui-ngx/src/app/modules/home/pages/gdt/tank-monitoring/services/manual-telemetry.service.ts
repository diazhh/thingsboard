import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { WidgetContext } from '@home/models/widget-component.models';

/**
 * Registro de Telemetría Manual
 *
 * Permite a los operadores registrar valores manuales como:
 * - API Gravity (del laboratorio)
 * - Nivel manual (aforo físico)
 * - Temperatura manual
 *
 * Se guarda como telemetría del Asset para mantener histórico
 */
export interface ManualTelemetryEntry {
  id?: string;
  timestamp: number;              // Timestamp seleccionado por el operador
  tankId: string;
  tankTag: string;

  // Valores manuales (pueden ser null si no se registran)
  apiGravity?: number;            // Gravedad API del laboratorio
  manualLevel?: number;           // Nivel manual en mm
  manualTemperature?: number;     // Temperatura en °C
  bsw?: number;                   // Basic Sediment and Water (%)

  // Metadata
  operatorId: string;
  operatorName: string;
  notes?: string;
  source: 'laboratory' | 'manual_gauging' | 'calibration';

  // Campos calculados
  autoLevel?: number;             // Nivel del radar al momento del registro
  deviation?: number;             // Desviación entre manual y automático

  // Estado
  createdAt: number;
  approved?: boolean;
  approvedBy?: string;
  approvedAt?: number;
}

/**
 * Historial de API Gravity (para telemetrías manuales)
 */
export interface ManualApiGravityHistoryEntry {
  timestamp: number;
  value: number;
  previousValue?: number;
  operatorId: string;
  operatorName: string;
  source: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ManualTelemetryService {

  /**
   * Guardar entrada de telemetría manual
   *
   * Se guarda como telemetría del Asset (tanque) con las claves:
   * - manual_api_gravity
   * - manual_level
   * - manual_temperature
   * - manual_entry_metadata (JSON con toda la info)
   */
  saveManualEntry(
    ctx: WidgetContext,
    entry: ManualTelemetryEntry
  ): Observable<boolean> {
    if (!ctx.http) {
      return throwError(() => new Error('HTTP client no disponible'));
    }

    const telemetryData: any = {};
    const timestamp = entry.timestamp;

    // Solo agregar valores que se registraron
    if (entry.apiGravity !== undefined && entry.apiGravity !== null) {
      telemetryData['manual_api_gravity'] = entry.apiGravity;
    }
    if (entry.manualLevel !== undefined && entry.manualLevel !== null) {
      telemetryData['manual_level'] = entry.manualLevel;
    }
    if (entry.manualTemperature !== undefined && entry.manualTemperature !== null) {
      telemetryData['manual_temperature'] = entry.manualTemperature;
    }
    if (entry.bsw !== undefined && entry.bsw !== null) {
      telemetryData['bsw_manual'] = entry.bsw;
    }

    // Metadata como JSON
    telemetryData['manual_entry_metadata'] = JSON.stringify({
      operatorId: entry.operatorId,
      operatorName: entry.operatorName,
      source: entry.source,
      notes: entry.notes,
      autoLevel: entry.autoLevel,
      deviation: entry.deviation,
      createdAt: entry.createdAt
    });

    // Construir el payload con timestamp específico
    const payload = {
      ts: timestamp,
      values: telemetryData
    };

    // Guardar como telemetría del Asset
    const url = `/api/plugins/telemetry/ASSET/${entry.tankId}/timeseries/any`;

    return ctx.http.post(url, payload).pipe(
      map(() => {
        // Si hay BS&W, también guardarlo como atributo del servidor
        if (entry.bsw !== undefined && entry.bsw !== null) {
          this.saveBswAttribute(ctx, entry.tankId, entry.bsw).subscribe({
            next: () => console.log('BS&W guardado como atributo'),
            error: (err) => console.error('Error guardando BS&W como atributo:', err)
          });
        }
        return true;
      }),
      catchError(error => {
        console.error('Error guardando telemetría manual:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener historial de telemetrías manuales
   */
  getManualEntryHistory(
    ctx: WidgetContext,
    tankId: string,
    startTime: number,
    endTime: number,
    limit: number = 100
  ): Observable<ManualTelemetryEntry[]> {
    if (!ctx.http) {
      return of([]);
    }

    const keys = 'manual_api_gravity,manual_level,manual_temperature,manual_bsw,manual_entry_metadata';
    const url = `/api/plugins/telemetry/ASSET/${tankId}/values/timeseries?keys=${keys}&startTs=${startTime}&endTs=${endTime}&limit=${limit}`;

    return ctx.http.get<any>(url).pipe(
      map(response => this.parseManualEntries(response, tankId)),
      catchError(error => {
        console.error('Error obteniendo historial de telemetrías manuales:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener historial de API Gravity
   */
  getApiGravityHistory(
    ctx: WidgetContext,
    tankId: string,
    startTime: number,
    endTime: number,
    limit: number = 50
  ): Observable<ManualApiGravityHistoryEntry[]> {
    if (!ctx.http) {
      return of([]);
    }

    const url = `/api/plugins/telemetry/ASSET/${tankId}/values/timeseries?keys=manual_api_gravity,manual_entry_metadata&startTs=${startTime}&endTs=${endTime}&limit=${limit}`;

    return ctx.http.get<any>(url).pipe(
      map(response => this.parseApiGravityHistory(response)),
      catchError(error => {
        console.error('Error obteniendo historial de API Gravity:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener último valor de API Gravity
   */
  getLastApiGravity(
    ctx: WidgetContext,
    tankId: string
  ): Observable<{ value: number; timestamp: number } | null> {
    if (!ctx.http) {
      return of(null);
    }

    const url = `/api/plugins/telemetry/ASSET/${tankId}/values/timeseries?keys=manual_api_gravity&limit=1`;

    return ctx.http.get<any>(url).pipe(
      map(response => {
        if (response.manual_api_gravity && response.manual_api_gravity.length > 0) {
          const entry = response.manual_api_gravity[0];
          return {
            value: parseFloat(entry.value),
            timestamp: entry.ts
          };
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Parsear respuesta de ThingsBoard a ManualTelemetryEntry[]
   */
  private parseManualEntries(response: any, tankId: string): ManualTelemetryEntry[] {
    const entries: ManualTelemetryEntry[] = [];
    const metadataEntries = response.manual_entry_metadata || [];

    metadataEntries.forEach((metaEntry: any) => {
      try {
        const metadata = JSON.parse(metaEntry.value);
        const timestamp = metaEntry.ts;

        // Buscar valores correspondientes al mismo timestamp
        const apiGravity = this.findValueAtTimestamp(response.manual_api_gravity, timestamp);
        const manualLevel = this.findValueAtTimestamp(response.manual_level, timestamp);
        const manualTemp = this.findValueAtTimestamp(response.manual_temperature, timestamp);
        const bsw = this.findValueAtTimestamp(response.manual_bsw, timestamp);

        entries.push({
          id: `${tankId}_${timestamp}`,
          timestamp: timestamp,
          tankId: tankId,
          tankTag: '',
          apiGravity: apiGravity,
          manualLevel: manualLevel,
          manualTemperature: manualTemp,
          bsw: bsw,
          operatorId: metadata.operatorId || '',
          operatorName: metadata.operatorName || 'Desconocido',
          notes: metadata.notes,
          source: metadata.source || 'manual_gauging',
          autoLevel: metadata.autoLevel,
          deviation: metadata.deviation,
          createdAt: metadata.createdAt || timestamp
        });
      } catch (e) {
        console.warn('Error parseando entrada de telemetría manual:', e);
      }
    });

    // Ordenar por timestamp descendente
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Parsear historial de API Gravity
   */
  private parseApiGravityHistory(response: any): ManualApiGravityHistoryEntry[] {
    const entries: ManualApiGravityHistoryEntry[] = [];
    const apiGravityEntries = response.manual_api_gravity || [];
    const metadataEntries = response.manual_entry_metadata || [];

    apiGravityEntries.forEach((entry: any, index: number) => {
      const metadata = this.findMetadataAtTimestamp(metadataEntries, entry.ts);

      entries.push({
        timestamp: entry.ts,
        value: parseFloat(entry.value),
        previousValue: index < apiGravityEntries.length - 1
          ? parseFloat(apiGravityEntries[index + 1].value)
          : undefined,
        operatorId: metadata?.operatorId || '',
        operatorName: metadata?.operatorName || 'Desconocido',
        source: metadata?.source || 'manual',
        notes: metadata?.notes
      });
    });

    return entries;
  }

  private findValueAtTimestamp(dataArray: any[], timestamp: number): number | undefined {
    if (!dataArray) return undefined;
    const entry = dataArray.find((e: any) => e.ts === timestamp);
    return entry ? parseFloat(entry.value) : undefined;
  }

  private findMetadataAtTimestamp(metadataArray: any[], timestamp: number): any {
    if (!metadataArray) return null;
    const entry = metadataArray.find((e: any) => e.ts === timestamp);
    if (entry) {
      try {
        return JSON.parse(entry.value);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Guardar BS&W como atributo del servidor
   */
  private saveBswAttribute(
    ctx: WidgetContext,
    tankId: string,
    bsw: number
  ): Observable<boolean> {
    if (!ctx.http) {
      return throwError(() => new Error('HTTP client no disponible'));
    }

    const url = `/api/plugins/telemetry/ASSET/${tankId}/SERVER_SCOPE`;
    const payload = {
      bsw: bsw
    };

    return ctx.http.post(url, payload).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error guardando atributo BS&W:', error);
        return throwError(() => error);
      })
    );
  }
}
