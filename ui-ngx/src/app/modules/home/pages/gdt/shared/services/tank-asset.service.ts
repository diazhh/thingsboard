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
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

/**
 * Tank Asset Model
 */
export interface TankAsset {
  id?: {
    id: string;
    entityType: 'ASSET';
  };
  name: string;
  type: string;
  label?: string;
  additionalInfo?: {
    description?: string;
  };
}

/**
 * Tank Shape Types
 */
export type TankShape = 'vertical_cylinder' | 'horizontal_cylinder' | 'spherical';

/**
 * Roof Types based on API 650
 */
export type RoofType =
  | 'fixed_cone'           // Fixed Cone Roof
  | 'fixed_dome'           // Fixed Dome Roof
  | 'geodesic_dome'        // Aluminum Geodesic Dome
  | 'floating_external'    // External Floating Roof
  | 'floating_internal'    // Internal Floating Roof
  | 'floating_covered'     // Covered Floating Roof (with dome)
  | 'open_top';            // Open Top (no roof)

/**
 * Floating Roof Deck Types
 */
export type FloatingDeckType =
  | 'pan'           // Pan type - single steel deck
  | 'pontoon'       // Pontoon type - with pontoons
  | 'double_deck';  // Double deck - upper and lower deck

/**
 * Bottom Types
 */
export type BottomType =
  | 'flat'          // Flat bottom
  | 'cone_up'       // Cone up (center high)
  | 'cone_down'     // Cone down (center low) - for drainage
  | 'slope';        // Single direction slope

/**
 * Tank Material Types
 */
export type TankMaterial =
  | 'carbon_steel'      // Carbon Steel (most common)
  | 'stainless_steel'   // Stainless Steel
  | 'aluminum'          // Aluminum
  | 'fiberglass'        // Fiberglass Reinforced Plastic
  | 'concrete';         // Concrete

/**
 * Tank Service Classification
 */
export type TankService =
  | 'crude_oil'
  | 'refined_products'
  | 'chemicals'
  | 'water'
  | 'lpg'
  | 'other';

/**
 * Tank Attributes Model (Extended based on API 650 standard)
 */
export interface TankAttributes {
  // === IDENTIFICATION ===
  tankTag: string;                    // Unique identifier (e.g., TK-101)
  tankName: string;                   // Descriptive name
  description?: string;               // Detailed description
  location?: string;                  // Physical location

  // === GEOMETRY ===
  tankShape: TankShape;               // Tank shape
  tankHeight: number;                 // Total height (m)
  tankDiameter: number;               // Diameter (m)
  tankCapacity: number;               // Nominal capacity (m³)
  workingCapacity?: number;           // Working/usable capacity (m³)
  deadStock?: number;                 // Dead stock volume (m³)

  // === ROOF CONFIGURATION ===
  roofType?: RoofType;                // Type of roof
  roofSlope?: number;                 // Roof slope angle (degrees)
  roofHeight?: number;                // Roof height from shell top (m)
  floatingDeckType?: FloatingDeckType; // For floating roofs
  hasGeodesicDome?: boolean;          // Has aluminum geodesic dome cover

  // === BOTTOM CONFIGURATION ===
  bottomType?: BottomType;            // Type of bottom
  bottomSlope?: number;               // Bottom slope (% or degrees)
  hasHeatingCoils?: boolean;          // Has heating coils in bottom

  // === SHELL SPECIFICATIONS (API 650) ===
  shellMaterial?: TankMaterial;       // Shell material
  shellCourses?: number;              // Number of shell courses
  shellThicknessBottom?: number;      // Bottom course thickness (mm)
  shellThicknessTop?: number;         // Top course thickness (mm)
  corrosionAllowance?: number;        // Corrosion allowance (mm)

  // === BOTTOM PLATE SPECIFICATIONS ===
  bottomPlateThickness?: number;      // Bottom plate thickness (mm)
  annularPlateThickness?: number;     // Annular plate thickness (mm)
  annularPlateWidth?: number;         // Annular plate radial width (mm)

  // === ROOF PLATE SPECIFICATIONS ===
  roofPlateThickness?: number;        // Roof plate thickness (mm)
  roofMaterial?: TankMaterial;        // Roof material (may differ from shell)

  // === PHYSICAL PROPERTIES ===
  emptyWeight?: number;               // Empty tank weight (kg)
  designPressure?: number;            // Design pressure (kPa)
  designTemperatureMin?: number;      // Min design temperature (°C)
  designTemperatureMax?: number;      // Max design temperature (°C)
  maxFillRate?: number;               // Maximum fill rate (m³/h)
  maxDrawRate?: number;               // Maximum draw rate (m³/h)

  // === PRODUCT INFORMATION ===
  productName: string;                // Current product name
  tankService?: TankService;          // Service classification
  apiGravityBase?: number;            // API Gravity @ 60°F
  specificGravity?: number;           // Specific gravity
  flashPoint?: number;                // Flash point (°C)
  productTempNormal?: number;         // Normal operating temperature (°C)

  // === ALARM LEVELS ===
  alarmHH?: number;                   // High-High alarm level (m)
  alarmH?: number;                    // High alarm level (m)
  alarmL?: number;                    // Low alarm level (m)
  alarmLL?: number;                   // Low-Low alarm level (m)
  maxSafeLevel?: number;              // Maximum safe fill level (m)
  minOperatingLevel?: number;         // Minimum operating level (m)

  // === REFERENCE LEVELS ===
  referenceHeight?: number;           // Reference height for gauging (m)
  gaugeHatchHeight?: number;          // Gauge hatch height from ground (m)
  inletNozzleHeight?: number;         // Inlet nozzle height (m)
  outletNozzleHeight?: number;        // Outlet nozzle height (m)

  // === INSULATION ===
  isInsulated?: boolean;              // Has insulation
  insulationType?: string;            // Insulation material type
  insulationThickness?: number;       // Insulation thickness (mm)

  // === CALIBRATION ===
  strappingTable?: string;            // Strapping table reference
  lastCalibrationDate?: string;       // Last calibration date (ISO)
  calibrationMethod?: string;         // Calibration method used

  // === CONSTRUCTION ===
  manufacturer?: string;              // Tank manufacturer
  yearBuilt?: number;                 // Year of construction
  designStandard?: string;            // Design standard (e.g., API 650)

  // === OPERATIONAL ===
  isInService?: boolean;              // Currently in service
  lastInspectionDate?: string;        // Last inspection date (ISO)
  nextInspectionDate?: string;        // Next scheduled inspection (ISO)
}

/**
 * Default values for new tank
 */
export const DEFAULT_TANK_ATTRIBUTES: Partial<TankAttributes> = {
  tankShape: 'vertical_cylinder',
  roofType: 'fixed_cone',
  bottomType: 'flat',
  shellMaterial: 'carbon_steel',
  tankHeight: 12.0,
  tankDiameter: 8.0,
  tankCapacity: 0,
  shellCourses: 4,
  shellThicknessBottom: 12,
  shellThicknessTop: 8,
  bottomPlateThickness: 6,
  annularPlateThickness: 10,
  roofPlateThickness: 5,
  corrosionAllowance: 3,
  roofSlope: 1.5,
  designPressure: 2.5,
  designTemperatureMin: -10,
  designTemperatureMax: 90,
  apiGravityBase: 35.0,
  alarmHH: 11.5,
  alarmH: 10.0,
  alarmL: 2.0,
  alarmLL: 0.5,
  designStandard: 'API 650',
  isInService: true
};

/**
 * Service for managing Tank Assets in ThingsBoard
 * Provides CRUD operations and attribute management
 */
@Injectable()
export class TankAssetService {

  constructor(private http: HttpClient) {}

  /**
   * Get all assets of a specific type/profile
   * @param assetType - Asset type (e.g., 'Tank')
   * @returns Observable of tank assets array
   */
  getTanksByProfile(assetType: string): Observable<TankAsset[]> {
    return this.http.get<any>(`/api/tenant/assets?type=${assetType}&pageSize=1000&page=0`)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error fetching tanks by profile:', error);
          return of([]);
        })
      );
  }

  /**
   * Get a single asset by ID
   * @param assetId - Asset ID
   * @returns Observable of tank asset
   */
  getTankById(assetId: string): Observable<TankAsset> {
    return this.http.get<TankAsset>(`/api/asset/${assetId}`);
  }

  /**
   * Create a new tank asset
   * @param tank - Tank asset data
   * @returns Observable of created tank
   */
  createTank(tank: TankAsset): Observable<TankAsset> {
    return this.http.post<TankAsset>('/api/asset', tank);
  }

  /**
   * Update an existing tank asset
   * @param tank - Tank asset data with ID
   * @returns Observable of updated tank
   */
  updateTank(tank: TankAsset): Observable<TankAsset> {
    return this.http.post<TankAsset>('/api/asset', tank);
  }

  /**
   * Delete a tank asset
   * @param assetId - Asset ID to delete
   * @returns Observable of void
   */
  deleteTank(assetId: string): Observable<void> {
    return this.http.delete<void>(`/api/asset/${assetId}`);
  }

  /**
   * Get all attributes of a tank asset
   * @param assetId - Asset ID
   * @param scope - Attribute scope (SERVER_SCOPE, SHARED_SCOPE, CLIENT_SCOPE)
   * @returns Observable of attributes object
   */
  getTankAttributes(assetId: string, scope: string = 'SERVER_SCOPE'): Observable<any> {
    return this.http.get<any[]>(`/api/plugins/telemetry/ASSET/${assetId}/values/attributes/${scope}`)
      .pipe(
        map(attributes => {
          // Convert array of {key, value} to object
          const result: any = {};
          attributes.forEach(attr => {
            result[attr.key] = attr.value;
          });
          return result;
        }),
        catchError(error => {
          console.error('Error fetching tank attributes:', error);
          return of({});
        })
      );
  }

  /**
   * Update attributes of a tank asset
   * @param assetId - Asset ID
   * @param attributes - Attributes object to update
   * @param scope - Attribute scope (SERVER_SCOPE, SHARED_SCOPE)
   * @returns Observable of void
   */
  updateTankAttributes(assetId: string, attributes: any, scope: string = 'SERVER_SCOPE'): Observable<void> {
    return this.http.post<void>(
      `/api/plugins/telemetry/ASSET/${assetId}/attributes/${scope}`,
      attributes
    );
  }

  /**
   * Delete specific attributes of a tank asset
   * @param assetId - Asset ID
   * @param attributeKeys - Array of attribute keys to delete
   * @param scope - Attribute scope
   * @returns Observable of void
   */
  deleteTankAttributes(assetId: string, attributeKeys: string[], scope: string = 'SERVER_SCOPE'): Observable<void> {
    const keys = attributeKeys.join(',');
    return this.http.delete<void>(
      `/api/plugins/telemetry/ASSET/${assetId}/attributes/${scope}?keys=${keys}`
    );
  }

  /**
   * Get tank with its attributes in a single call
   * @param assetId - Asset ID
   * @returns Observable of tank with attributes
   */
  getTankWithAttributes(assetId: string): Observable<{ asset: TankAsset, attributes: any }> {
    return this.getTankById(assetId).pipe(
      switchMap(asset => {
        return this.getTankAttributes(assetId).pipe(
          map(attributes => ({ asset, attributes }))
        );
      })
    );
  }

  /**
   * Get all tanks with their attributes
   * @param assetType - Asset type (e.g., 'Tank')
   * @returns Observable of tanks with attributes array
   */
  getAllTanksWithAttributes(assetType: string): Observable<Array<{ asset: TankAsset, attributes: any }>> {
    return this.getTanksByProfile(assetType).pipe(
      switchMap(tanks => {
        if (tanks.length === 0) {
          return of([]);
        }

        // Fetch attributes for all tanks in parallel
        const requests = tanks.map(tank => 
          this.getTankAttributes(tank.id!.id).pipe(
            map(attributes => ({ asset: tank, attributes })),
            catchError(() => of({ asset: tank, attributes: {} }))
          )
        );

        return forkJoin(requests);
      })
    );
  }

  /**
   * Create tank with attributes in a single transaction
   * @param tankData - Tank asset data
   * @param attributes - Tank attributes
   * @returns Observable of created tank with ID
   */
  createTankWithAttributes(tankData: TankAsset, attributes: TankAttributes): Observable<TankAsset> {
    return this.createTank(tankData).pipe(
      switchMap(createdTank => {
        const assetId = createdTank.id!.id;
        return this.updateTankAttributes(assetId, attributes).pipe(
          map(() => createdTank)
        );
      })
    );
  }

  /**
   * Update tank and its attributes
   * @param tank - Tank asset data
   * @param attributes - Tank attributes to update
   * @returns Observable of updated tank
   */
  updateTankWithAttributes(tank: TankAsset, attributes: TankAttributes): Observable<TankAsset> {
    return this.updateTank(tank).pipe(
      switchMap(updatedTank => {
        const assetId = updatedTank.id!.id;
        return this.updateTankAttributes(assetId, attributes).pipe(
          map(() => updatedTank)
        );
      })
    );
  }

  /**
   * Search tanks by name or tag
   * @param assetType - Asset type
   * @param searchText - Search text
   * @returns Observable of matching tanks
   */
  searchTanks(assetType: string, searchText: string): Observable<TankAsset[]> {
    return this.http.get<any>(`/api/tenant/assets?type=${assetType}&textSearch=${searchText}&pageSize=100&page=0`)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error searching tanks:', error);
          return of([]);
        })
      );
  }

  /**
   * Check if a tank tag is unique
   * @param tankTag - Tank tag to check
   * @param excludeAssetId - Asset ID to exclude from check (for updates)
   * @returns Observable of boolean (true if unique)
   */
  isTankTagUnique(tankTag: string, excludeAssetId?: string): Observable<boolean> {
    return this.getAllTanksWithAttributes('Tank').pipe(
      map(tanks => {
        const existingTank = tanks.find(t => 
          t.attributes.tankTag === tankTag && 
          (!excludeAssetId || t.asset.id!.id !== excludeAssetId)
        );
        return !existingTank;
      })
    );
  }
}
