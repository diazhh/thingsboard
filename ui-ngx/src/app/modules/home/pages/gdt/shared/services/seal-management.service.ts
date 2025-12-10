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
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { RadarDeviceService } from './radar-device.service';

export interface SealStatus {
  deviceId: string;
  deviceName: string;
  state: 'SEALED' | 'UNSEALED' | 'BROKEN';
  sealedAt?: Date;
  sealedBy?: string;
  sealReason?: string;
  lastVerifiedAt?: Date;
  configurationChanges: number;
  dataModifications: number;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING' | 'EXPIRED';
}

export interface SealRequest {
  deviceId: string;
  reason: string;
}

export interface UnsealRequest {
  deviceId: string;
  reason: string;
}

@Injectable({
  providedIn: 'root'
})
export class SealManagementService {

  private readonly API_BASE = '/api/gdt/seal';

  constructor(
    private http: HttpClient,
    private radarDeviceService: RadarDeviceService
  ) {}

  /**
   * Get all sealed devices
   */
  getSealedDevices(): Observable<SealStatus[]> {
    return this.http.get<SealStatus[]>(`${this.API_BASE}/sealed/list`)
      .pipe(
        switchMap(devices => {
          if (devices && devices.length > 0) {
            return this.enrichDevicesWithNames(devices);
          }
          return of([]);
        }),
        catchError(error => {
          console.error('Error getting sealed devices:', error);
          return of([]);
        })
      );
  }

  /**
   * Get all unsealed devices
   */
  getUnsealedDevices(): Observable<SealStatus[]> {
    console.log('SealManagementService: Getting unsealed devices...');
    return this.http.get<SealStatus[]>(`${this.API_BASE}/unsealed/list`)
      .pipe(
        switchMap(devices => {
          console.log('SealManagementService: API returned unsealed devices:', devices);
          
          // Filter out any sealed devices (backend should do this, but double-check)
          const actuallyUnsealed = devices.filter(d => d.state === 'UNSEALED');
          console.log(`SealManagementService: Filtered to ${actuallyUnsealed.length} actually unsealed devices`);
          
          if (actuallyUnsealed && actuallyUnsealed.length > 0) {
            // Enrich devices with actual device names from ThingsBoard API
            return this.enrichDevicesWithNames(actuallyUnsealed);
          }
          // If API returns empty array, use fallback
          console.log('SealManagementService: No unsealed devices, using fallback...');
          return this.getAllDevicesAsSealStatus();
        }),
        // Apply filter to ensure only UNSEALED devices are returned
        map(devices => {
          const filtered = devices.filter(d => d.state === 'UNSEALED');
          console.log(`SealManagementService: Final filter - returning ${filtered.length} unsealed devices`);
          return filtered;
        }),
        catchError(error => {
          console.warn('SealManagementService: Error getting unsealed devices from API, falling back to all devices:', error);
          // Fallback: Get all devices and filter to only unsealed
          return this.getAllDevicesAsSealStatus().pipe(
            map(devices => {
              const filtered = devices.filter(d => d.state === 'UNSEALED');
              console.log(`SealManagementService: Fallback filter - returning ${filtered.length} unsealed devices`);
              return filtered;
            })
          );
        })
      );
  }

  /**
   * Enrich seal status devices with actual device names from ThingsBoard
   */
  private enrichDevicesWithNames(devices: SealStatus[]): Observable<SealStatus[]> {
    console.log('SealManagementService: Enriching devices with names...');
    
    if (!devices || devices.length === 0) {
      return of([]);
    }

    // Load device info for each device
    const deviceRequests = devices.map(device => 
      this.http.get<any>(`/api/device/${device.deviceId}`).pipe(
        map(deviceInfo => ({
          ...device,
          deviceName: deviceInfo.name || device.deviceName || `Device ${device.deviceId.substring(0, 8)}`
        })),
        catchError(error => {
          console.warn(`Error loading device info for ${device.deviceId}:`, error);
          // Return device with fallback name
          return of({
            ...device,
            deviceName: device.deviceName || `Device ${device.deviceId.substring(0, 8)}`
          });
        })
      )
    );

    return forkJoin(deviceRequests).pipe(
      map(enrichedDevices => {
        console.log('SealManagementService: Devices enriched with names:', enrichedDevices);
        return enrichedDevices;
      }),
      catchError(error => {
        console.error('SealManagementService: Error enriching devices:', error);
        // Return original devices with fallback names
        return of(devices.map(d => ({
          ...d,
          deviceName: d.deviceName || `Device ${d.deviceId.substring(0, 8)}`
        })));
      })
    );
  }

  /**
   * Get all devices as seal status (fallback when seal API not available)
   */
  private getAllDevicesAsSealStatus(): Observable<SealStatus[]> {
    console.log('SealManagementService: Loading devices as seal status (fallback mode)...');
    
    // Try multiple device profiles
    const profiles = ['Radar_TRL2', 'TRL2', 'Radar', 'radar'];
    
    return this.tryLoadDevicesByProfiles(profiles).pipe(
      switchMap(devices => {
        if (devices.length > 0) {
          console.log(`SealManagementService: Found ${devices.length} devices`);
          return of(devices);
        }
        // If no devices found with specific profiles, try getting all devices
        console.log('SealManagementService: No devices found with specific profiles, trying all devices...');
        return this.getAllDevices();
      }),
      switchMap(devices => {
        console.log('SealManagementService: Mapping devices to SealStatus:', devices);
        // For fallback mode, we need to check the actual seal status from the API
        // Get sealed devices to know which ones are already sealed
        return this.http.get<SealStatus[]>(`${this.API_BASE}/sealed/list`).pipe(
          map(sealedDevices => {
            const sealedDeviceIds = new Set(sealedDevices.map(s => s.deviceId));
            return devices.map((device: any) => {
              const deviceId = device.id?.id || device.id;
              const isSealed = sealedDeviceIds.has(deviceId);
              return {
                deviceId: deviceId,
                deviceName: device.name,
                state: isSealed ? ('SEALED' as const) : ('UNSEALED' as const),
                sealedAt: undefined,
                sealedBy: undefined,
                sealReason: undefined,
                lastVerifiedAt: undefined,
                configurationChanges: 0,
                dataModifications: 0,
                complianceStatus: 'COMPLIANT' as const
              };
            });
          }),
          catchError(error => {
            console.warn('SealManagementService: Could not get sealed devices, assuming all are unsealed:', error);
            // Fallback: assume all are unsealed if we can't get the sealed list
            return of(devices.map((device: any) => ({
              deviceId: device.id?.id || device.id,
              deviceName: device.name,
              state: 'UNSEALED' as const,
              sealedAt: undefined,
              sealedBy: undefined,
              sealReason: undefined,
              lastVerifiedAt: undefined,
              configurationChanges: 0,
              dataModifications: 0,
              complianceStatus: 'COMPLIANT' as const
            })));
          })
        );
      }),
      catchError(error => {
        console.error('SealManagementService: Error getting devices:', error);
        return of([]);
      })
    );
  }

  /**
   * Try to load devices by multiple profiles
   */
  private tryLoadDevicesByProfiles(profiles: string[]): Observable<any[]> {
    if (profiles.length === 0) {
      console.log('SealManagementService: No more profiles to try');
      return of([]);
    }

    const profile = profiles[0];
    console.log(`SealManagementService: Trying profile: ${profile}`);
    
    return this.radarDeviceService.getRadarsByProfile(profile).pipe(
      switchMap(devices => {
        console.log(`SealManagementService: Profile ${profile} returned ${devices.length} devices`);
        if (devices.length > 0) {
          console.log(`SealManagementService: Found ${devices.length} devices with profile ${profile}`, devices);
          return of(devices);
        }
        // Try next profile
        console.log(`SealManagementService: No devices with profile ${profile}, trying next...`);
        return this.tryLoadDevicesByProfiles(profiles.slice(1));
      }),
      catchError(error => {
        console.warn(`SealManagementService: Error with profile ${profile}:`, error);
        // Try next profile
        return this.tryLoadDevicesByProfiles(profiles.slice(1));
      })
    );
  }

  /**
   * Get all devices (no profile filter)
   */
  private getAllDevices(): Observable<any[]> {
    console.log('SealManagementService: Loading all devices...');
    return this.http.get<any>('/api/tenant/devices?pageSize=1000&page=0').pipe(
      map(response => {
        console.log('SealManagementService: Raw API response:', response);
        const devices = response.data || [];
        console.log(`SealManagementService: Loaded ${devices.length} total devices`, devices);
        return devices;
      }),
      catchError(error => {
        console.error('SealManagementService: Error loading all devices:', error);
        return of([]);
      })
    );
  }

  /**
   * Seal a device
   */
  sealDevice(request: SealRequest): Observable<SealStatus> {
    return this.http.post<SealStatus>(`${this.API_BASE}/seal`, request)
      .pipe(
        catchError(error => {
          console.error('Error sealing device:', error);
          throw error;
        })
      );
  }

  /**
   * Unseal a device
   */
  unsealDevice(request: UnsealRequest): Observable<SealStatus> {
    return this.http.post<SealStatus>(`${this.API_BASE}/unseal`, request)
      .pipe(
        catchError(error => {
          console.error('Error unsealing device:', error);
          throw error;
        })
      );
  }

  /**
   * Verify seal integrity
   */
  verifySeal(deviceId: string): Observable<any> {
    return this.http.post(`${this.API_BASE}/${deviceId}/verify`, {})
      .pipe(
        catchError(error => {
          console.error('Error verifying seal:', error);
          throw error;
        })
      );
  }

  /**
   * Get seal history
   */
  getSealHistory(deviceId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE}/${deviceId}/history`)
      .pipe(
        catchError(error => {
          console.error('Error getting seal history:', error);
          return of([]);
        })
      );
  }

  /**
   * Check if device is sealed
   */
  isDeviceSealed(deviceId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.API_BASE}/${deviceId}/is-sealed`)
      .pipe(
        catchError(error => {
          console.error('Error checking seal status:', error);
          return of(false);
        })
      );
  }

  /**
   * Get device seal status
   */
  getDeviceSealStatus(deviceId: string): Observable<SealStatus> {
    return this.http.get<SealStatus>(`${this.API_BASE}/${deviceId}`)
      .pipe(
        catchError(error => {
          console.error('Error getting device seal status:', error);
          throw error;
        })
      );
  }
}
