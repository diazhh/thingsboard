import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

/**
 * Radar Device Model
 */
export interface RadarDevice {
  id?: {
    id: string;
    entityType: 'DEVICE';
  };
  name: string;
  type: string;
  label?: string;
  additionalInfo?: {
    description?: string;
  };
}

/**
 * Relation between entities
 */
export interface EntityRelation {
  from: {
    id: string;
    entityType: string;
  };
  to: {
    id: string;
    entityType: string;
  };
  type: string;
  typeGroup: string;
  additionalInfo?: any;
}

/**
 * RPC Request
 */
export interface RpcRequest {
  method: string;
  params: any;
  timeout?: number;
}

/**
 * Service for managing Radar Devices in ThingsBoard
 * Provides device management, relations, and RPC commands
 */
@Injectable()
export class RadarDeviceService {

  constructor(private http: HttpClient) {}

  /**
   * Get all devices of a specific type/profile
   * @param deviceType - Device type (e.g., 'Radar', 'TRL2')
   * @returns Observable of radar devices array
   */
  getRadarsByProfile(deviceType: string): Observable<RadarDevice[]> {
    return this.http.get<any>(`/api/tenant/devices?type=${deviceType}&pageSize=1000&page=0`)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error fetching radars by profile:', error);
          return of([]);
        })
      );
  }

  /**
   * Get a single device by ID
   * @param deviceId - Device ID
   * @returns Observable of radar device
   */
  getRadarById(deviceId: string): Observable<RadarDevice> {
    return this.http.get<RadarDevice>(`/api/device/${deviceId}`);
  }

  /**
   * Create a new radar device
   * @param device - Radar device data
   * @returns Observable of created device
   */
  createRadar(device: RadarDevice): Observable<RadarDevice> {
    return this.http.post<RadarDevice>('/api/device', device);
  }

  /**
   * Update an existing radar device
   * @param device - Radar device data with ID
   * @returns Observable of updated device
   */
  updateRadar(device: RadarDevice): Observable<RadarDevice> {
    return this.http.post<RadarDevice>('/api/device', device);
  }

  /**
   * Delete a radar device
   * @param deviceId - Device ID to delete
   * @returns Observable of void
   */
  deleteRadar(deviceId: string): Observable<void> {
    return this.http.delete<void>(`/api/device/${deviceId}`);
  }

  /**
   * Get device assigned to an asset (tank)
   * @param assetId - Asset ID
   * @param relationType - Relation type (default: 'Contains')
   * @returns Observable of radar device or null
   */
  getDeviceForAsset(assetId: string, relationType: string = 'Contains'): Observable<RadarDevice | null> {
    return this.http.get<EntityRelation[]>(
      `/api/relations/info?fromId=${assetId}&fromType=ASSET&relationType=${relationType}`
    ).pipe(
      map(relations => {
        const deviceRelation = relations.find(r => r.to.entityType === 'DEVICE');
        return deviceRelation ? deviceRelation.to.id : null;
      }),
      switchMap(deviceId => {
        if (deviceId) {
          return this.getRadarById(deviceId);
        }
        return of(null);
      }),
      catchError(error => {
        console.error('Error getting device for asset:', error);
        return of(null);
      })
    );
  }

  /**
   * Get asset (tank) assigned to a device
   * @param deviceId - Device ID
   * @param relationType - Relation type (default: 'Contains')
   * @returns Observable of asset ID or null
   */
  getAssetForDevice(deviceId: string, relationType: string = 'Contains'): Observable<string | null> {
    return this.http.get<EntityRelation[]>(
      `/api/relations/info?toId=${deviceId}&toType=DEVICE&relationType=${relationType}`
    ).pipe(
      map(relations => {
        const assetRelation = relations.find(r => r.from.entityType === 'ASSET');
        return assetRelation ? assetRelation.from.id : null;
      }),
      catchError(error => {
        console.error('Error getting asset for device:', error);
        return of(null);
      })
    );
  }

  /**
   * Assign a radar to a tank (create relation)
   * @param tankId - Tank asset ID
   * @param radarId - Radar device ID
   * @param relationType - Relation type (default: 'Contains')
   * @returns Observable of void
   */
  assignRadarToTank(tankId: string, radarId: string, relationType: string = 'Contains'): Observable<void> {
    const relation: EntityRelation = {
      from: { id: tankId, entityType: 'ASSET' },
      to: { id: radarId, entityType: 'DEVICE' },
      type: relationType,
      typeGroup: 'COMMON'
    };

    return this.http.post<void>('/api/relation', relation);
  }

  /**
   * Unassign a radar from a tank (delete relation)
   * @param tankId - Tank asset ID
   * @param radarId - Radar device ID
   * @param relationType - Relation type (default: 'Contains')
   * @returns Observable of void
   */
  unassignRadarFromTank(tankId: string, radarId: string, relationType: string = 'Contains'): Observable<void> {
    return this.http.delete<void>(
      `/api/relation?fromId=${tankId}&fromType=ASSET&relationType=${relationType}&toId=${radarId}&toType=DEVICE`
    );
  }

  /**
   * Get all relations for an asset
   * @param assetId - Asset ID
   * @returns Observable of relations array
   */
  getAssetRelations(assetId: string): Observable<EntityRelation[]> {
    return this.http.get<EntityRelation[]>(
      `/api/relations/info?fromId=${assetId}&fromType=ASSET`
    ).pipe(
      catchError(error => {
        console.error('Error getting asset relations:', error);
        return of([]);
      })
    );
  }

  /**
   * Get device attributes
   * @param deviceId - Device ID
   * @param scope - Attribute scope (SERVER_SCOPE, SHARED_SCOPE, CLIENT_SCOPE)
   * @returns Observable of attributes object
   */
  getRadarAttributes(deviceId: string, scope: string = 'SERVER_SCOPE'): Observable<any> {
    return this.http.get<any[]>(
      `/api/plugins/telemetry/DEVICE/${deviceId}/values/attributes/${scope}`
    ).pipe(
      map(attributes => {
        const result: any = {};
        attributes.forEach(attr => {
          result[attr.key] = attr.value;
        });
        return result;
      }),
      catchError(error => {
        console.error('Error fetching radar attributes:', error);
        return of({});
      })
    );
  }

  /**
   * Update device attributes
   * @param deviceId - Device ID
   * @param attributes - Attributes object to update
   * @param scope - Attribute scope (SERVER_SCOPE, SHARED_SCOPE)
   * @returns Observable of void
   */
  updateRadarAttributes(deviceId: string, attributes: any, scope: string = 'SERVER_SCOPE'): Observable<void> {
    return this.http.post<void>(
      `/api/plugins/telemetry/DEVICE/${deviceId}/attributes/${scope}`,
      attributes
    );
  }

  /**
   * Send RPC command to device
   * @param deviceId - Device ID
   * @param request - RPC request
   * @returns Observable of RPC response
   */
  sendRpcCommand(deviceId: string, request: RpcRequest): Observable<any> {
    const timeout = request.timeout || 5000;
    return this.http.post<any>(
      `/api/plugins/rpc/twoway/${deviceId}`,
      {
        method: request.method,
        params: request.params,
        timeout: timeout
      }
    ).pipe(
      catchError(error => {
        console.error('Error sending RPC command:', error);
        throw error;
      })
    );
  }

  /**
   * Send one-way RPC command to device (no response expected)
   * @param deviceId - Device ID
   * @param request - RPC request
   * @returns Observable of void
   */
  sendOneWayRpcCommand(deviceId: string, request: RpcRequest): Observable<void> {
    return this.http.post<void>(
      `/api/plugins/rpc/oneway/${deviceId}`,
      {
        method: request.method,
        params: request.params
      }
    );
  }

  /**
   * Get all unassigned radars (not linked to any tank)
   * @param deviceType - Device type
   * @returns Observable of unassigned radars array
   */
  getUnassignedRadars(deviceType: string): Observable<RadarDevice[]> {
    return this.getRadarsByProfile(deviceType).pipe(
      switchMap(radars => {
        if (radars.length === 0) {
          return of([]);
        }

        // Check each radar for assignment
        const checks = radars.map(radar =>
          this.getAssetForDevice(radar.id!.id).pipe(
            map(assetId => ({ radar, isAssigned: !!assetId }))
          )
        );

        return forkJoin(checks).pipe(
          map(results => results.filter(r => !r.isAssigned).map(r => r.radar))
        );
      })
    );
  }

  /**
   * Get tank-radar assignments
   * @param tankIds - Array of tank IDs
   * @returns Observable of Map with tankId to radarId
   */
  getTankRadarAssignments(tankIds: string[]): Observable<Map<string, string>> {
    const requests = tankIds.map(tankId =>
      this.getDeviceForAsset(tankId).pipe(
        map(radar => ({ tankId, radarId: radar?.id?.id || null }))
      )
    );

    return forkJoin(requests).pipe(
      map(results => {
        const assignmentMap = new Map<string, string>();
        results.forEach(result => {
          if (result.radarId) {
            assignmentMap.set(result.tankId, result.radarId);
          }
        });
        return assignmentMap;
      }),
      catchError(error => {
        console.error('Error getting tank-radar assignments:', error);
        return of(new Map());
      })
    );
  }

  /**
   * Reassign radar from one tank to another
   * @param oldTankId - Old tank ID (to unassign from)
   * @param newTankId - New tank ID (to assign to)
   * @param radarId - Radar device ID
   * @returns Observable of void
   */
  reassignRadar(oldTankId: string, newTankId: string, radarId: string): Observable<void> {
    return this.unassignRadarFromTank(oldTankId, radarId).pipe(
      switchMap(() => this.assignRadarToTank(newTankId, radarId))
    );
  }

  /**
   * Search devices by name
   * @param deviceType - Device type
   * @param searchText - Search text
   * @returns Observable of matching devices
   */
  searchRadars(deviceType: string, searchText: string): Observable<RadarDevice[]> {
    return this.http.get<any>(
      `/api/tenant/devices?type=${deviceType}&textSearch=${searchText}&pageSize=100&page=0`
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Error searching radars:', error);
        return of([]);
      })
    );
  }

  /**
   * Get device credentials (for gateway connection)
   * @param deviceId - Device ID
   * @returns Observable of credentials
   */
  getDeviceCredentials(deviceId: string): Observable<any> {
    return this.http.get<any>(`/api/device/${deviceId}/credentials`);
  }

  /**
   * Check if device is online
   * @param deviceId - Device ID
   * @returns Observable of boolean
   */
  isDeviceOnline(deviceId: string): Observable<boolean> {
    return this.http.get<any>(
      `/api/plugins/telemetry/DEVICE/${deviceId}/values/attributes/SERVER_SCOPE?keys=active`
    ).pipe(
      map(attributes => {
        const activeAttr = attributes.find((a: any) => a.key === 'active');
        return activeAttr ? activeAttr.value === true : false;
      }),
      catchError(() => of(false))
    );
  }
}
