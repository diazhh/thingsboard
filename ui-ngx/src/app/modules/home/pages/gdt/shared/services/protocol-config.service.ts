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

/*
 * Copyright © 2024 GDT - Grupo de Desarrollo Tecnológico
 * Licensed under the Apache License, Version 2.0
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  ProtocolType,
  ProtocolInfo,
  PROTOCOL_INFO_MAP,
  ProtocolConfig,
  ProtocolValidationResult,
  ModbusRTUSettings,
  ModbusTCPSettings,
  EnrafGPUSettings,
  VarecMarkSpaceSettings,
  BAUDRATE_OPTIONS,
  PARITY_OPTIONS,
  STOPBITS_OPTIONS
} from '../models/protocol-config.model';

/**
 * Protocol Configuration Service
 * 
 * Manages protocol configuration, validation, and testing.
 */
@Injectable({
  providedIn: 'root'
})
export class ProtocolConfigService {

  private readonly apiUrl = '/api/config';

  constructor(private http: HttpClient) { }

  /**
   * Get list of supported protocols
   */
  getSupportedProtocols(): ProtocolInfo[] {
    return Object.values(PROTOCOL_INFO_MAP);
  }

  /**
   * Get protocol info by type
   */
  getProtocolInfo(type: ProtocolType): ProtocolInfo {
    return PROTOCOL_INFO_MAP[type];
  }

  /**
   * Get default settings for protocol type
   */
  getDefaultSettings(type: ProtocolType): any {
    switch (type) {
      case ProtocolType.MODBUS_RTU:
        return {
          device: '/dev/ttyUSB0',
          baudrate: 9600,
          bytesize: 8,
          parity: 'N',
          stopbits: 1,
          timeout: 1.0
        } as ModbusRTUSettings;

      case ProtocolType.MODBUS_TCP:
        return {
          host: 'localhost',
          port: 502,
          unitId: 1,
          timeout: 1.0
        } as ModbusTCPSettings;

      case ProtocolType.ENRAF_GPU:
        return {
          device: '/dev/ttyUSB0',
          baudrate: 9600,
          address: 1,
          timeout: 1.0
        } as EnrafGPUSettings;

      case ProtocolType.VAREC_MARKSPACE:
        return {
          device: '/dev/ttyUSB0',
          baudrate: 9600,
          address: 1,
          timeout: 1.0
        } as VarecMarkSpaceSettings;

      default:
        return {};
    }
  }

  /**
   * Validate protocol configuration
   */
  validateConfiguration(config: ProtocolConfig): ProtocolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Common validation
    if (!config.protocol) {
      errors.push('Protocol type is required');
    }
    if (!config.settings) {
      errors.push('Protocol settings are required');
    }

    // Protocol-specific validation
    switch (config.protocol) {
      case ProtocolType.MODBUS_RTU:
        this._validateModbusRTU(config.settings as ModbusRTUSettings, errors, warnings);
        break;
      case ProtocolType.MODBUS_TCP:
        this._validateModbusTCP(config.settings as ModbusTCPSettings, errors, warnings);
        break;
      case ProtocolType.ENRAF_GPU:
        this._validateEnrafGPU(config.settings as EnrafGPUSettings, errors, warnings);
        break;
      case ProtocolType.VAREC_MARKSPACE:
        this._validateVarecMarkSpace(config.settings as VarecMarkSpaceSettings, errors, warnings);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Test protocol connection
   */
  testConnection(portName: string): Observable<boolean> {
    return this.http.post<any>(`${this.apiUrl}/validate`, { port_name: portName })
      .pipe(
        map(response => response.valid && response.connection_test),
        catchError(() => of(false))
      );
  }

  /**
   * Get available serial ports
   */
  getAvailableSerialPorts(): Observable<any[]> {
    return this.http.get<any[]>('/api/ports/available')
      .pipe(
        catchError(() => of([]))
      );
  }

  /**
   * Get constants for UI
   */
  getBaudrateOptions(): number[] {
    return BAUDRATE_OPTIONS;
  }

  getParityOptions(): string[] {
    return PARITY_OPTIONS;
  }

  getStopbitsOptions(): number[] {
    return STOPBITS_OPTIONS;
  }

  // Private validation methods

  private _validateModbusRTU(settings: ModbusRTUSettings, errors: string[], warnings: string[]): void {
    if (!settings.device) {
      errors.push('Device path is required');
    }
    if (!settings.baudrate || settings.baudrate <= 0) {
      errors.push('Baudrate must be positive');
    }
    if (!BAUDRATE_OPTIONS.includes(settings.baudrate)) {
      warnings.push(`Non-standard baudrate: ${settings.baudrate}`);
    }
    if (!settings.parity || !PARITY_OPTIONS.includes(settings.parity)) {
      errors.push('Invalid parity setting');
    }
    if (!settings.stopbits || ![1, 1.5, 2].includes(settings.stopbits)) {
      errors.push('Invalid stopbits setting');
    }
    if (!settings.timeout || settings.timeout <= 0) {
      errors.push('Timeout must be positive');
    }
  }

  private _validateModbusTCP(settings: ModbusTCPSettings, errors: string[], warnings: string[]): void {
    if (!settings.host) {
      errors.push('Host is required');
    }
    if (!settings.port || settings.port <= 0 || settings.port > 65535) {
      errors.push('Port must be between 1 and 65535');
    }
    if (settings.port !== 502) {
      warnings.push(`Non-standard Modbus port: ${settings.port}`);
    }
    if (!settings.unitId || settings.unitId < 0 || settings.unitId > 247) {
      errors.push('Unit ID must be between 0 and 247');
    }
    if (!settings.timeout || settings.timeout <= 0) {
      errors.push('Timeout must be positive');
    }
  }

  private _validateEnrafGPU(settings: EnrafGPUSettings, errors: string[], warnings: string[]): void {
    if (!settings.device) {
      errors.push('Device path is required');
    }
    if (!settings.baudrate || settings.baudrate <= 0) {
      errors.push('Baudrate must be positive');
    }
    if (!settings.address || settings.address < 1 || settings.address > 247) {
      errors.push('Address must be between 1 and 247');
    }
    if (!settings.timeout || settings.timeout <= 0) {
      errors.push('Timeout must be positive');
    }
  }

  private _validateVarecMarkSpace(settings: VarecMarkSpaceSettings, errors: string[], warnings: string[]): void {
    if (!settings.device) {
      errors.push('Device path is required');
    }
    if (!settings.baudrate || settings.baudrate <= 0) {
      errors.push('Baudrate must be positive');
    }
    if (!settings.address || settings.address < 1 || settings.address > 247) {
      errors.push('Address must be between 1 and 247');
    }
    if (!settings.timeout || settings.timeout <= 0) {
      errors.push('Timeout must be positive');
    }
  }
}
