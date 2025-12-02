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
import { Observable } from 'rxjs';
import {
  PortConfig,
  PortInfo,
  AvailablePort,
  GatewayStatus,
  MessageResponse
} from '../models/gateway-port.model';

/**
 * Gateway API Service
 *
 * Service for communicating with the GDT Gateway REST API.
 * Manages serial port configuration and device discovery.
 */

@Injectable({
  providedIn: 'root'
})
export class GatewayApiService {

  // Gateway API base URL - configurable
  private readonly GATEWAY_API_URL = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  /**
   * Get gateway status
   */
  getStatus(): Observable<GatewayStatus> {
    return this.http.get<GatewayStatus>(`${this.GATEWAY_API_URL}/status`);
  }

  /**
   * List all configured ports
   */
  listPorts(): Observable<PortInfo[]> {
    return this.http.get<PortInfo[]>(`${this.GATEWAY_API_URL}/ports`);
  }

  /**
   * Get specific port information
   */
  getPort(portName: string): Observable<PortInfo> {
    return this.http.get<PortInfo>(`${this.GATEWAY_API_URL}/ports/${portName}`);
  }

  /**
   * Create a new port
   */
  createPort(config: PortConfig): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.GATEWAY_API_URL}/ports`, config);
  }

  /**
   * Update port configuration
   */
  updatePort(portName: string, updates: Partial<PortConfig>): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.GATEWAY_API_URL}/ports/${portName}`, updates);
  }

  /**
   * Delete a port
   */
  deletePort(portName: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.GATEWAY_API_URL}/ports/${portName}`);
  }

  /**
   * Enable a port
   */
  enablePort(portName: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.GATEWAY_API_URL}/ports/${portName}/enable`, {});
  }

  /**
   * Disable a port
   */
  disablePort(portName: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.GATEWAY_API_URL}/ports/${portName}/disable`, {});
  }

  /**
   * List all available serial ports on the system
   */
  listAvailablePorts(): Observable<AvailablePort[]> {
    return this.http.get<AvailablePort[]>(`${this.GATEWAY_API_URL}/ports/available`);
  }

  /**
   * Health check
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.GATEWAY_API_URL}/../health`);
  }
}
