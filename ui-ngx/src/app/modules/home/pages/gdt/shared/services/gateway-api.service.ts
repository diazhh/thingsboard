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
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  PortConfig,
  PortInfo,
  AvailablePort,
  GatewayStatus,
  ApiResponse
} from '../models/gateway-port.model';

/**
 * Gateway API Service
 * 
 * Servicio Angular para comunicación con el Gateway Python (FastAPI).
 * Maneja todas las operaciones de gestión de puertos seriales.
 * 
 * Endpoints del Gateway:
 * - GET    /api/ports              - Listar puertos configurados
 * - GET    /api/ports/{name}       - Obtener puerto específico
 * - POST   /api/ports              - Crear puerto
 * - PUT    /api/ports/{name}       - Actualizar puerto
 * - DELETE /api/ports/{name}       - Eliminar puerto
 * - POST   /api/ports/{name}/enable   - Habilitar puerto
 * - POST   /api/ports/{name}/disable  - Deshabilitar puerto
 * - GET    /api/ports/available    - Listar puertos disponibles del sistema
 * - GET    /api/status             - Estado general del gateway
 * - GET    /health                 - Health check
 */
@Injectable({
  providedIn: 'root'
})
export class GatewayApiService {

  // URL base del Gateway Python (FastAPI)
  // TODO: Configurar desde environment o settings
  private readonly gatewayBaseUrl = 'http://localhost:8080';
  
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(private http: HttpClient) {
    console.log('[GatewayApiService] Initialized with base URL:', this.gatewayBaseUrl);
  }

  // ============================================================================
  // PORT MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * Listar todos los puertos configurados
   * GET /api/ports
   */
  listPorts(): Observable<PortInfo[]> {
    return this.http.get<PortInfo[]>(`${this.gatewayBaseUrl}/api/ports`)
      .pipe(
        catchError(this.handleError('listPorts'))
      );
  }

  /**
   * Obtener información de un puerto específico
   * GET /api/ports/{name}
   */
  getPort(portName: string): Observable<PortInfo> {
    return this.http.get<PortInfo>(`${this.gatewayBaseUrl}/api/ports/${portName}`)
      .pipe(
        catchError(this.handleError('getPort'))
      );
  }

  /**
   * Crear un nuevo puerto
   * POST /api/ports
   */
  createPort(config: PortConfig): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.gatewayBaseUrl}/api/ports`,
      config,
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError('createPort'))
    );
  }

  /**
   * Actualizar configuración de un puerto existente
   * PUT /api/ports/{name}
   */
  updatePort(portName: string, updates: Partial<PortConfig>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.gatewayBaseUrl}/api/ports/${portName}`,
      updates,
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError('updatePort'))
    );
  }

  /**
   * Eliminar un puerto
   * DELETE /api/ports/{name}
   */
  deletePort(portName: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.gatewayBaseUrl}/api/ports/${portName}`)
      .pipe(
        catchError(this.handleError('deletePort'))
      );
  }

  /**
   * Habilitar un puerto (conectar)
   * POST /api/ports/{name}/enable
   */
  enablePort(portName: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.gatewayBaseUrl}/api/ports/${portName}/enable`,
      {},
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError('enablePort'))
    );
  }

  /**
   * Deshabilitar un puerto (desconectar)
   * POST /api/ports/{name}/disable
   */
  disablePort(portName: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.gatewayBaseUrl}/api/ports/${portName}/disable`,
      {},
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError('disablePort'))
    );
  }

  // ============================================================================
  // SYSTEM ENDPOINTS
  // ============================================================================

  /**
   * Listar puertos disponibles en el sistema
   * GET /api/ports/available
   */
  listAvailablePorts(): Observable<AvailablePort[]> {
    return this.http.get<AvailablePort[]>(`${this.gatewayBaseUrl}/api/ports/available`)
      .pipe(
        catchError(this.handleError('listAvailablePorts'))
      );
  }

  /**
   * Obtener estado general del gateway
   * GET /api/status
   */
  getGatewayStatus(): Observable<GatewayStatus> {
    return this.http.get<GatewayStatus>(`${this.gatewayBaseUrl}/api/status`)
      .pipe(
        catchError(this.handleError('getGatewayStatus'))
      );
  }

  /**
   * Health check del gateway
   * GET /health
   */
  healthCheck(): Observable<{ status: string; timestamp: number }> {
    return this.http.get<{ status: string; timestamp: number }>(`${this.gatewayBaseUrl}/health`)
      .pipe(
        catchError(this.handleError('healthCheck'))
      );
  }

  // ============================================================================
  // DISCOVERY ENDPOINTS (Future implementation)
  // ============================================================================

  /**
   * Iniciar discovery de dispositivos Modbus RTU
   * POST /api/discovery/modbus-rtu
   * 
   * @param portName - Nombre del puerto a escanear
   * @param startAddress - Dirección inicial (default: 1)
   * @param endAddress - Dirección final (default: 247)
   * @param baudrates - Lista de baudrates a probar (default: [9600, 19200])
   */
  startModbusRtuDiscovery(
    portName: string,
    startAddress: number = 1,
    endAddress: number = 247,
    baudrates: number[] = [9600, 19200]
  ): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.gatewayBaseUrl}/api/discovery/modbus-rtu`,
      { port_name: portName, start_address: startAddress, end_address: endAddress, baudrates },
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError('startModbusRtuDiscovery'))
    );
  }

  /**
   * Obtener resultados de discovery
   * GET /api/discovery/results
   */
  getDiscoveryResults(): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayBaseUrl}/api/discovery/results`)
      .pipe(
        catchError(this.handleError('getDiscoveryResults'))
      );
  }

  /**
   * Obtener estado de discovery
   * GET /api/discovery/status
   */
  getDiscoveryStatus(): Observable<{ running: boolean; progress: number }> {
    return this.http.get<{ running: boolean; progress: number }>(`${this.gatewayBaseUrl}/api/discovery/status`)
      .pipe(
        catchError(this.handleError('getDiscoveryStatus'))
      );
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Manejo centralizado de errores HTTP
   */
  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      console.error(`[GatewayApiService] ${operation} failed:`, error);
      
      // Construir mensaje de error legible
      let errorMessage = 'Error de comunicación con el Gateway';
      
      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Error del lado del servidor
        if (error.status === 0) {
          errorMessage = 'No se puede conectar al Gateway. Verifique que esté en ejecución.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else {
          errorMessage = `Error ${error.status}: ${error.statusText}`;
        }
      }
      
      return throwError(() => ({
        operation,
        message: errorMessage,
        status: error.status,
        error: error.error
      }));
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Verifica si el Gateway está disponible
   */
  isGatewayAvailable(): Observable<boolean> {
    return this.healthCheck().pipe(
      map(() => true),
      catchError(() => [false])
    );
  }

  /**
   * Obtiene la URL base del Gateway
   */
  getGatewayBaseUrl(): string {
    return this.gatewayBaseUrl;
  }
}
