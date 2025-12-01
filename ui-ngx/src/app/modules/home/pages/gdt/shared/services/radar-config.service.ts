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
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { 
  RadarConfiguration, 
  RadarParameter, 
  RadarWriteOperation, 
  RadarWriteResult,
  RADAR_PARAMETER_DEFINITIONS
} from '../models/radar-config.model';

/**
 * Servicio para gestionar configuración de radares TRL/2
 * 
 * Responsabilidades:
 * - Leer parámetros actuales del radar
 * - Escribir parámetros al radar vía MQTT
 * - Validar valores antes de escribir
 * - Gestionar operaciones de escritura
 * - Mantener log de operaciones
 */
@Injectable({
  providedIn: 'root'
})
export class RadarConfigService {

  private baseUrl = '/api';
  private mqttPublishUrl = `${this.baseUrl}/plugins/rpc/twoway`;

  constructor(
    private http: HttpClient
  ) {}

  /**
   * Obtener configuración actual del radar
   */
  getRadarConfiguration(radarId: string): Observable<RadarConfiguration | null> {
    return this.http.get<any[]>(
      `${this.baseUrl}/plugins/telemetry/DEVICE/${radarId}/values/attributes/SERVER_SCOPE`
    ).pipe(
      map((attributes: any[]) => {
        // Buscar parámetros del radar
        const config: RadarConfiguration = {
          radarId,
          radarName: '',
          modbusAddress: 0,
          parameters: {
            tankHeight: this.createParameter('tankHeight', attributes),
            offsetDistance: this.createParameter('offsetDistance', attributes),
            calibrationDistance: this.createParameter('calibrationDistance', attributes),
            bottomHeadDistance: this.createParameter('bottomHeadDistance', attributes),
            holdOffDistance: this.createParameter('holdOffDistance', attributes),
            tcl: this.createParameter('tcl', attributes)
          },
          lastUpdate: new Date(),
          connectionStatus: 'online'
        };

        // Obtener radar name
        const radarNameAttr = attributes.find((a: any) => a.key === 'radarName');
        if (radarNameAttr) {
          config.radarName = radarNameAttr.value;
        }

        // Obtener modbus address
        const modbusAttr = attributes.find((a: any) => a.key === 'modbus_address');
        if (modbusAttr) {
          config.modbusAddress = parseInt(modbusAttr.value, 10);
        }

        return config;
      }),
      catchError(error => {
        console.error('Error loading radar configuration:', error);
        return of(null);
      })
    );
  }

  /**
   * Guardar atributos del radar en ThingsBoard
   * 
   * Guarda los atributos en SERVER_SCOPE del device
   * Una regla de integración se encarga de detectar cambios y actualizar otro atributo
   */
  saveRadarAttributes(
    radarId: string,
    attributes: any
  ): Observable<RadarWriteOperation> {
    // Crear operación
    const operation: RadarWriteOperation = {
      operationId: this.generateOperationId(),
      radarId,
      radarName: attributes.radarName || '',
      parameters: [],
      status: 'pending',
      createdAt: new Date(),
      userId: 'current-user',
      userName: 'Current User'
    };

    // Guardar atributos directamente en SERVER_SCOPE
    return this.http.post(
      `${this.baseUrl}/plugins/telemetry/DEVICE/${radarId}/SERVER_SCOPE`,
      attributes,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      map(() => {
        operation.status = 'completed';
        operation.startedAt = new Date();
        operation.completedAt = new Date();
        return operation;
      }),
      catchError(error => {
        operation.status = 'failed';
        operation.error = error.message || 'Failed to save attributes';
        operation.errorReason = 'API_ERROR';
        return of(operation);
      })
    );
  }

  /**
   * Escribir parámetros al radar (DEPRECATED - usar saveRadarAttributes)
   * 
   * Este método publica un mensaje MQTT al topic del radar
   * El gateway TRL2 escucha este topic y ejecuta la escritura Modbus
   */
  writeParametersToRadar(
    radarId: string,
    radarName: string,
    parameters: Array<{ key: string; value: number }>,
    userId: string,
    userName: string
  ): Observable<RadarWriteOperation> {
    // Crear operación
    const operation: RadarWriteOperation = {
      operationId: this.generateOperationId(),
      radarId,
      radarName,
      parameters: parameters.map(p => {
        const def = this.getParameterDefinition(p.key);
        return {
          key: p.key,
          label: def?.label || p.key,
          currentValue: 0, // Se debe obtener antes
          newValue: p.value,
          register: def?.writeRegister || 0
        };
      }),
      status: 'pending',
      createdAt: new Date(),
      userId,
      userName
    };

    // Validar parámetros
    const validation = this.validateParameters(parameters);
    if (!validation.valid) {
      operation.status = 'failed';
      operation.error = validation.errors.join(', ');
      return throwError(() => new Error(operation.error));
    }

    // Preparar payload MQTT
    const mqttPayload = this.buildMqttPayload(radarName, parameters);

    // Publicar a MQTT vía ThingsBoard RPC
    return this.publishToMqtt(radarId, mqttPayload).pipe(
      map(response => {
        operation.status = 'in_progress';
        operation.startedAt = new Date();
        return operation;
      }),
      catchError(error => {
        operation.status = 'failed';
        operation.error = error.message || 'Failed to publish MQTT message';
        operation.errorReason = 'MODBUS_ERROR';
        return of(operation);
      })
    );
  }

  /**
   * Verificar resultado de escritura
   * 
   * Compara los atributos _dl (escritos) con los atributos sin sufijo (leídos del radar)
   * para confirmar que los valores se escribieron correctamente
   */
  verifyWriteOperation(
    radarId: string,
    parameters: Array<{ key: string; expectedValue: number }>
  ): Observable<RadarWriteResult[]> {
    // Obtener ambos scopes: SHARED_SCOPE (con _dl) y SERVER_SCOPE (sin _dl, leídos del radar)
    const sharedAttrs$ = this.http.get<any[]>(
      `${this.baseUrl}/plugins/telemetry/DEVICE/${radarId}/values/attributes/SHARED_SCOPE`
    );
    
    const serverAttrs$ = this.http.get<any[]>(
      `${this.baseUrl}/plugins/telemetry/DEVICE/${radarId}/values/attributes/SERVER_SCOPE`
    );

    return sharedAttrs$.pipe(
      switchMap(sharedAttrs => {
        return serverAttrs$.pipe(
          map(serverAttrs => {
            const results: RadarWriteResult[] = [];

            for (const param of parameters) {
              const paramDef = this.getParameterDefinition(param.key);
              
              if (!paramDef) {
                results.push({
                  parameterKey: param.key,
                  parameterLabel: param.key,
                  valueWritten: param.expectedValue,
                  valueRead: 0,
                  success: false,
                  verified: false,
                  writeAttempts: 1,
                  verificationAttempts: 1,
                  writeDuration: 0,
                  verificationDuration: 0,
                  error: 'Parameter definition not found',
                  timestamp: new Date()
                });
                continue;
              }

              // Buscar valor escrito (con _dl en SHARED_SCOPE)
              const writtenAttr = sharedAttrs.find((a: any) => a.key === `${param.key}_dl`);
              const valueWritten = writtenAttr ? parseFloat(writtenAttr.value) : param.expectedValue;

              // Buscar valor leído del radar (sin _dl en SERVER_SCOPE)
              const readAttr = serverAttrs.find((a: any) => a.key === param.key);
              const valueRead = readAttr ? parseFloat(readAttr.value) : 0;

              // Comparar con tolerancia
              const tolerance = 0.001;
              const verified = Math.abs(valueRead - valueWritten) <= tolerance;

              results.push({
                parameterKey: param.key,
                parameterLabel: paramDef.label,
                valueWritten,
                valueRead,
                success: verified,
                verified,
                writeAttempts: 1,
                verificationAttempts: 1,
                writeDuration: 0,
                verificationDuration: 0,
                timestamp: new Date()
              });
            }

            return results;
          })
        );
      }),
      catchError(error => {
        console.error('Error verifying write operation:', error);
        return of(parameters.map(param => ({
          parameterKey: param.key,
          parameterLabel: param.key,
          valueWritten: param.expectedValue,
          valueRead: 0,
          success: false,
          verified: false,
          writeAttempts: 1,
          verificationAttempts: 1,
          writeDuration: 0,
          verificationDuration: 0,
          error: error.message || 'Failed to verify',
          timestamp: new Date()
        })));
      })
    );
  }

  /**
   * Validar parámetros antes de escribir
   */
  private validateParameters(parameters: Array<{ key: string; value: number }>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const param of parameters) {
      const def = this.getParameterDefinition(param.key);
      
      if (!def) {
        errors.push(`Unknown parameter: ${param.key}`);
        continue;
      }

      // Validar rango
      if (param.value < def.minValue || param.value > def.maxValue) {
        errors.push(`${def.label}: value ${param.value} is out of range [${def.minValue}, ${def.maxValue}]`);
      }

      // Validar tipo
      if (typeof param.value !== 'number' || isNaN(param.value)) {
        errors.push(`${def.label}: invalid numeric value`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Construir payload MQTT para escritura
   * 
   * El gateway TRL2 espera un mensaje en el topic:
   * tbmq/radar-gdt/{radar_name}/set_params
   * 
   * Con payload:
   * {
   *   "Sip-TankHeight_R_dl": 12.5,
   *   "Sip-OffsetDist_G_dl": 0.5,
   *   ...
   * }
   */
  private buildMqttPayload(radarName: string, parameters: Array<{ key: string; value: number }>): any {
    const payload: any = {};

    for (const param of parameters) {
      // Agregar sufijo _dl para indicar "download" (escritura al radar)
      const key = `${param.key}_dl`;
      payload[key] = param.value;
    }

    return {
      topic: `tbmq/radar-gdt/${radarName}/set_params`,
      payload: JSON.stringify(payload)
    };
  }

  /**
   * Publicar mensaje a MQTT vía ThingsBoard RPC
   */
  private publishToMqtt(deviceId: string, mqttMessage: any): Observable<any> {
    // Guardar atributos en SERVER_SCOPE
    // Una regla de integración de bajada se encargará de enviar
    // la configuración al dispositivo físico
    
    const payload = JSON.parse(mqttMessage.payload);
    const attributes: any = {};
    
    // Convertir a formato de objeto para ThingsBoard
    Object.keys(payload).forEach(key => {
      attributes[key] = payload[key];
    });

    return this.http.post(
      `${this.baseUrl}/plugins/telemetry/DEVICE/${deviceId}/SERVER_SCOPE`,
      attributes,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  /**
   * Crear parámetro desde atributos
   */
  private createParameter(paramKey: string, attributes: any[]): RadarParameter {
    const def = RADAR_PARAMETER_DEFINITIONS[paramKey];
    
    if (!def) {
      throw new Error(`Unknown parameter key: ${paramKey}`);
    }

    const attr = attributes.find((a: any) => a.key === def.key);
    
    return {
      ...def,
      currentValue: attr ? parseFloat(attr.value) : undefined,
      lastReadTime: attr ? new Date(attr.lastUpdateTs) : undefined
    };
  }

  /**
   * Obtener definición de parámetro
   */
  private getParameterDefinition(key: string): typeof RADAR_PARAMETER_DEFINITIONS[keyof typeof RADAR_PARAMETER_DEFINITIONS] | null {
    // Buscar por key completo (ej: "Sip-TankHeight_R")
    for (const paramKey in RADAR_PARAMETER_DEFINITIONS) {
      const def = RADAR_PARAMETER_DEFINITIONS[paramKey as keyof typeof RADAR_PARAMETER_DEFINITIONS];
      if (def.key === key) {
        return def;
      }
    }

    // Buscar por paramKey (ej: "tankHeight")
    if (key in RADAR_PARAMETER_DEFINITIONS) {
      return RADAR_PARAMETER_DEFINITIONS[key as keyof typeof RADAR_PARAMETER_DEFINITIONS];
    }

    return null;
  }

  /**
   * Obtener clave de parámetro desde key completo
   */
  private getParameterKey(fullKey: string): string {
    for (const paramKey in RADAR_PARAMETER_DEFINITIONS) {
      const def = RADAR_PARAMETER_DEFINITIONS[paramKey as keyof typeof RADAR_PARAMETER_DEFINITIONS];
      if (def.key === fullKey) {
        return paramKey;
      }
    }
    return fullKey;
  }

  /**
   * Generar ID único para operación
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtener estado de seguridad de escrituras
   * 
   * Verifica si WRITE_OPERATIONS_ENABLED está habilitado en el gateway
   */
  checkWriteSecurityStatus(): Observable<{ enabled: boolean; message: string }> {
    // Esto debería consultar el estado del gateway
    // Por ahora, retornamos un valor por defecto
    return of({
      enabled: false,
      message: 'WRITE_OPERATIONS_DISABLED: El sistema está configurado para bloquear todas las escrituras a radares por motivos de seguridad.'
    });
  }
}
