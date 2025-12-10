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

import { Component, Input, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WidgetContext } from '@home/models/widget-component.models';
import { TankData } from '../shared/models/tank-data.model';
import { TankCalculationService } from '../shared/services/tank-calculation.service';
import { AlarmEvaluatorService } from '../shared/services/alarm-evaluator.service';
import { VolumeApiMpmsService } from '../shared/services/volume-api-mpms.service';
import { TankAssetService } from '../shared/services/tank-asset.service';
import { TankTelemetryService } from '../shared/services/tank-telemetry.service';
import { RadarDeviceService } from '../shared/services/radar-device.service';
import { SystemConfigService } from '../shared/services/system-config.service';
import { GdtWidgetContextService } from '../shared/services/gdt-widget-context.service';
import { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';

/**
 * Tank Fleet Monitoring Widget
 *
 * Purpose: Multi-tank monitoring widget for operations/control room
 * - Display multiple tanks in grid/list layout
 * - Show all tanks with specific asset profile
 * - Real-time monitoring of entire tank farm
 * - Sortable and filterable
 *
 * Modes:
 * 1. Static Mode: Automatically fetches all assets with profile "Tank"
 * 2. Dynamic Mode: Uses configured datasources if provided
 *
 * Usage: Tank Farm Overview, Fleet Dashboard
 */
@Component({
  selector: 'tb-tank-monitoring',
  templateUrl: './tank-monitoring.component.html',
  styleUrls: ['./tank-monitoring.component.scss']
})
export class TankMonitoringComponent implements OnInit, OnDestroy {

  ctx: WidgetContext; // Created by GdtWidgetContextService

  // Tank data
  tanks: TankData[] = [];
  filteredTanks: TankData[] = [];

  // Tanque seleccionado para vista de detalle
  selectedTank: TankData | null = null;

  // Configuration
  assetProfileFilter: string = 'Tank'; // Default profile to filter
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: 'name' | 'level' | 'alarm' | 'volume' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  // Loading states
  loading: boolean = true;
  error: string | null = null;
  mode: 'static' | 'dynamic' = 'dynamic';

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private cd: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute,
    private gdtContextService: GdtWidgetContextService,
    private tankCalculationService: TankCalculationService,
    private alarmEvaluatorService: AlarmEvaluatorService,
    private volumeApiMpmsService: VolumeApiMpmsService,
    private tankAssetService: TankAssetService,
    private tankTelemetryService: TankTelemetryService,
    private radarDeviceService: RadarDeviceService,
    private systemConfigService: SystemConfigService
  ) {}

  ngOnInit(): void {
    // Create WidgetContext for page mode
    this.ctx = this.gdtContextService.createContext({
      assetProfileFilter: this.assetProfileFilter,
      viewMode: this.viewMode,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    }, this.cd);
    
    // Register this component in the widget scope
    if (this.ctx && this.ctx.$scope) {
      this.ctx.$scope.tankFleetMonitoringComponent = this;
    }

    // Initialize system config service with tenant ID
    if (this.ctx && this.ctx.currentUser && this.ctx.currentUser.tenantId) {
      this.systemConfigService.initWithTenant(this.ctx.currentUser.tenantId);
    }

    // Read widget settings
    this.loadSettings();

    // Determine mode: static or dynamic
    this.determineMode();

    // Initialize data
    this.initializeData();

    // Check for tank parameter in URL and select it when tanks are loaded
    this.activatedRoute.queryParams.subscribe(params => {
      const tankId = params['tank'];
      if (tankId) {
        // Wait a bit for tanks to load, then select the tank
        setTimeout(() => {
          this.selectTankById(tankId);
        }, 500);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadSettings(): void {
    // Load widget settings from ctx.settings
    if (this.ctx.settings) {
      this.assetProfileFilter = this.ctx.settings.assetProfileFilter || 'Tank';
      this.viewMode = this.ctx.settings.viewMode || 'grid';
      this.sortBy = this.ctx.settings.sortBy || 'name';
      this.sortOrder = this.ctx.settings.sortOrder || 'asc';
    }
  }

  private determineMode(): void {
    // If no datasources configured, use static mode
    // If datasources configured, use dynamic mode
    if (!this.ctx.datasources || this.ctx.datasources.length === 0) {
      this.mode = 'static';
      console.log('Tank Fleet Widget: Running in STATIC mode (will fetch all tanks with profile)');
    } else {
      this.mode = 'dynamic';
      console.log('Tank Fleet Widget: Running in DYNAMIC mode (using configured datasources)');
    }
  }

  private initializeData(): void {
    if (this.mode === 'static') {
      this.fetchAllTanksStatic();
    } else {
      // In dynamic mode, data will come via onDataUpdated()
      this.loading = false;
    }
  }

  /**
   * STATIC MODE: Fetch all assets with specific profile
   * Uses ThingsBoard REST API to query assets
   */
  private fetchAllTanksStatic(): void {
    console.log(`Fetching all tanks with profile: ${this.assetProfileFilter}`);
    
    // Step 1: Get all tanks with attributes
    this.tankAssetService.getAllTanksWithAttributes(this.assetProfileFilter)
      .subscribe({
        next: (tanksWithAttributes) => {
          console.log(`Found ${tanksWithAttributes.length} tanks`);
          
          if (tanksWithAttributes.length === 0) {
            this.loading = false;
            this.error = null;
            this.tanks = [];
            this.filteredTanks = [];
            this.ctx.detectChanges();
            return;
          }

          // Step 2: Get device (radar) for each tank
          const tankIds = tanksWithAttributes.map(t => t.asset.id!.id);
          this.radarDeviceService.getTankRadarAssignments(tankIds)
            .subscribe({
              next: (assignments) => {
                // Step 3: Process each tank
                const tankDataPromises = tanksWithAttributes.map(async (tankWithAttr) => {
                  const tankId = tankWithAttr.asset.id!.id;
                  const radarId = assignments.get(tankId);
                  
                  // Create TankData object
                  const tankData: Partial<TankData> = {
                    tankId: tankId,
                    tankTag: tankWithAttr.attributes.tankTag || tankWithAttr.asset.name,
                    tankName: tankWithAttr.attributes.tankName || tankWithAttr.asset.name,
                    productName: tankWithAttr.attributes.productName || 'Unknown',
                    tankShape: tankWithAttr.attributes.tankShape || 'vertical',
                    tankHeight: parseFloat(tankWithAttr.attributes.tankHeight) || 0,
                    tankDiameter: parseFloat(tankWithAttr.attributes.tankDiameter) || 0,
                    tankCapacity: parseFloat(tankWithAttr.attributes.tankCapacity) || 0,
                    alarmLevels: {
                      hh: parseFloat(tankWithAttr.attributes.alarmHH) || 0,
                      h: parseFloat(tankWithAttr.attributes.alarmH) || 0,
                      l: parseFloat(tankWithAttr.attributes.alarmL) || 0,
                      ll: parseFloat(tankWithAttr.attributes.alarmLL) || 0
                    },
                    apiGravity: parseFloat(tankWithAttr.attributes.apiGravityBase) || 0,
                    bsw: tankWithAttr.attributes.bsw ? parseFloat(tankWithAttr.attributes.bsw) : undefined,
                    radarStatus: 'offline',
                    activeAlarms: [],
                    currentAlarmLevel: 'none'
                  };

                  // Parse strapping table if exists
                  if (tankWithAttr.attributes.strappingTable) {
                    try {
                      tankData.strappingTable = JSON.parse(tankWithAttr.attributes.strappingTable);
                    } catch (e) {
                      console.warn(`Error parsing strapping table for tank ${tankId}:`, e);
                    }
                  }

                  // Step 4: Subscribe to telemetry if radar is assigned
                  if (radarId) {
                    this.subscribeToTankTelemetry(tankData as TankData, radarId);
                  }

                  return tankData as TankData;
                });

                // Wait for all tanks to be processed
                Promise.all(tankDataPromises).then(processedTanks => {
                  this.tanks = processedTanks;
                  this.applyFiltersAndSort();
                  this.loading = false;
                  this.error = null;
                  this.ctx.detectChanges();
                });
              },
              error: (err) => {
                console.error('Error getting tank-radar assignments:', err);
                this.error = 'Failed to load tank-radar assignments';
                this.loading = false;
                this.ctx.detectChanges();
              }
            });
        },
        error: (err) => {
          console.error('Error fetching tanks:', err);
          this.error = 'Failed to load tanks. Check permissions and asset profile.';
          this.loading = false;
          this.ctx.detectChanges();
        }
      });
  }

  /**
   * Subscribe to telemetry for a specific tank
   */
  private subscribeToTankTelemetry(tankData: TankData, deviceId: string): void {
    // Subscribe to DEVICE telemetry (radar - for level, temperature, etc.)
    const deviceTelemetryKeys = [
      'level', 'ullage', 'levelRate',
      'temperature_19', 'temperature_20', 'temperature_21',
      'temperature_22', 'temperature_23', 'temperature_24', 'temperature_25',
      'RTGstatus'
    ];

    const deviceSubscription = this.tankTelemetryService.subscribeToTelemetry({
      entityType: 'DEVICE',
      entityId: deviceId,
      keys: deviceTelemetryKeys
    }, 3000).subscribe({
      next: (telemetryData) => {
        // Update tank data with latest telemetry
        this.updateTankWithTelemetry(tankData, telemetryData);
        this.ctx.detectChanges();
      },
      error: (err) => {
        console.error(`Error subscribing to telemetry for device ${deviceId}:`, err);
        tankData.radarStatus = 'error';
      }
    });

    this.subscriptions.push(deviceSubscription);

    // Subscribe to ASSET telemetry (tank - for GOV, GSV, NSV)
    const assetTelemetryKeys = ['GOV', 'GSV', 'NSV'];

    const assetSubscription = this.tankTelemetryService.subscribeToTelemetry({
      entityType: 'ASSET',
      entityId: tankData.tankId!,
      keys: assetTelemetryKeys
    }, 3000).subscribe({
      next: (telemetryData) => {
        console.log(`[Asset Telemetry] Received for ${tankData.tankTag}:`, telemetryData);
        // Update tank data with latest telemetry
        this.updateTankWithTelemetry(tankData, telemetryData);
        this.ctx.detectChanges();
      },
      error: (err) => {
        console.error(`Error subscribing to asset telemetry for tank ${tankData.tankId}:`, err);
      }
    });

    this.subscriptions.push(assetSubscription);
  }

  /**
   * Update tank data with telemetry values
   */
  private updateTankWithTelemetry(tankData: TankData, telemetryData: any): void {
    // Process each telemetry key
    Object.keys(telemetryData).forEach(key => {
      const dataPoints = telemetryData[key];
      if (dataPoints && dataPoints.length > 0) {
        const latestValue = dataPoints[0].value;
        this.mapTelemetryToTankData(key, latestValue, tankData);
      }
    });

    // Calculate derived values
    this.calculateDerivedValues(tankData);

    // Evaluate alarms
    if (tankData.level !== undefined && tankData.tankHeight !== undefined) {
      tankData.activeAlarms = this.alarmEvaluatorService.evaluate(tankData);
      
      // Determine current alarm level
      if (tankData.activeAlarms && tankData.activeAlarms.length > 0) {
        const highestAlarm = tankData.activeAlarms.reduce((prev, current) => 
          this.getAlarmPriority(current.severity) > this.getAlarmPriority(prev.severity) ? current : prev
        );
        tankData.currentAlarmLevel = highestAlarm.severity === 'critical' ? 'critical' : 
                                       highestAlarm.severity === 'warning' ? 'high' : 'low';
      } else {
        tankData.currentAlarmLevel = 'none';
      }
    }

    // Update radar status
    if (tankData.rtgStatus !== undefined) {
      tankData.radarStatus = this.determineRadarStatus(tankData.rtgStatus);
    }

    // Update last update timestamp
    tankData.lastUpdate = new Date();

    // Re-apply filters and sort
    this.applyFiltersAndSort();
  }

  /**
   * Map telemetry key to tank data property
   */
  private mapTelemetryToTankData(key: string, value: any, tankData: Partial<TankData>): void {
    switch (key) {
      case 'level':
        tankData.level = parseFloat(value);
        break;
      case 'ullage':
        tankData.ullage = parseFloat(value);
        break;
      case 'levelRate':
        tankData.levelRate = parseFloat(value);
        break;
      case 'temperature_19':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp19 = parseFloat(value);
        break;
      case 'temperature_20':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp20 = parseFloat(value);
        break;
      case 'temperature_21':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp21 = parseFloat(value);
        break;
      case 'temperature_22':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp22 = parseFloat(value);
        break;
      case 'temperature_23':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp23 = parseFloat(value);
        break;
      case 'temperature_24':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp24 = parseFloat(value);
        break;
      case 'temperature_25':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp25 = parseFloat(value);
        break;
      case 'RTGstatus':
        tankData.rtgStatus = parseFloat(value);
        break;
      case 'GOV':
        if (value !== null && value !== undefined) {
          tankData.volumeGOV = parseFloat(value);
          tankData.volumeCurrent = parseFloat(value);
          console.log(`[mapTelemetryToTankData] GOV received for ${tankData.tankTag}: ${value}`);
        } else {
          console.log(`[mapTelemetryToTankData] GOV is null/undefined for ${tankData.tankTag}`);
        }
        break;
      case 'GSV':
        if (value !== null && value !== undefined) {
          tankData.volumeGSV = parseFloat(value);
          tankData.volumeCurrent = parseFloat(value);
          console.log(`[mapTelemetryToTankData] GSV received for ${tankData.tankTag}: ${value}`);
        } else {
          console.log(`[mapTelemetryToTankData] GSV is null/undefined for ${tankData.tankTag}`);
        }
        break;
      case 'NSV':
        if (value !== null && value !== undefined) {
          tankData.volumeNSV = parseFloat(value);
          console.log(`[mapTelemetryToTankData] NSV received for ${tankData.tankTag}: ${value}`);
        } else {
          console.log(`[mapTelemetryToTankData] NSV is null/undefined for ${tankData.tankTag}`);
        }
        break;
    }
  }

  /**
   * DYNAMIC MODE: Process data from configured datasources
   * Called by ThingsBoard when data updates
   */
  onDataUpdated(): void {
    try {
      if (!this.ctx.data || this.ctx.data.length === 0) {
        this.loading = false;
        this.ctx.detectChanges();
        return;
      }

      // Group data by entity (tank)
      const tankMap = new Map<string, Partial<TankData>>();

      this.ctx.data.forEach(dataItem => {
        const entityId = dataItem.datasource.entityId;
        const entityName = dataItem.datasource.entityName;
        const entityType = dataItem.datasource.entityType;

        // Initialize tank data if not exists
        if (!tankMap.has(entityId)) {
          tankMap.set(entityId, {
            tankId: entityId,
            tankName: entityName,
            tankTag: entityName,
            productName: 'N/A',
            level: 0,
            levelMeters: 0,
            levelPercent: 0,
            volumeCurrent: 0,
            volumeGOV: 0,
            volumeGSV: 0,
            volumeNSV: 0,
            tankCapacity: 0,
            ullage: 0,
            tankShape: 'vertical',
            tankHeight: 0,
            tankDiameter: 0,
            apiGravity: 35.0,
            temperatures: {},
            temperatureAvg: 0,
            activeAlarms: [],
            radarStatus: 'offline',
            lastUpdate: new Date()
          });
        }

        const tankData = tankMap.get(entityId)!;

        // Process each data point
        dataItem.data.forEach(point => {
          if (point.length > 0) {
            const [timestamp, value] = point;
            this.mapDataKeyToTankData(dataItem.dataKey.name, value, tankData);
          }
        });
      });

      // Convert map to array and calculate derived values
      this.tanks = Array.from(tankMap.values()).map(tankData => {
        this.calculateDerivedValues(tankData);
        this.evaluateAlarms(tankData);
        return tankData as TankData;
      });

      // Apply filtering and sorting
      this.applyFiltersAndSort();

      this.loading = false;
      this.ctx.detectChanges();

    } catch (error) {
      console.error('Error processing tank fleet data:', error);
      this.error = 'Failed to process tank data';
      this.loading = false;
      this.ctx.detectChanges();
    }
  }

  /**
   * Map incoming data key to tank data structure
   */
  private mapDataKeyToTankData(keyName: string, value: any, tankData: Partial<TankData>): void {
    switch (keyName) {
      // Asset Attributes
      case 'tankTag':
        tankData.tankTag = value;
        break;
      case 'tankName':
        tankData.tankName = value;
        break;
      case 'productName':
        tankData.productName = value;
        break;
      case 'tankShape':
        tankData.tankShape = value;
        break;
      case 'tankHeight':
        tankData.tankHeight = parseFloat(value);
        break;
      case 'tankDiameter':
        tankData.tankDiameter = parseFloat(value);
        break;
      case 'tankCapacity':
        tankData.tankCapacity = parseFloat(value);
        break;
      case 'alarmHH':
        if (!tankData.alarmLevels) tankData.alarmLevels = {} as any;
        tankData.alarmLevels.hh = parseFloat(value);
        break;
      case 'alarmH':
        if (!tankData.alarmLevels) tankData.alarmLevels = {} as any;
        tankData.alarmLevels.h = parseFloat(value);
        break;
      case 'alarmL':
        if (!tankData.alarmLevels) tankData.alarmLevels = {} as any;
        tankData.alarmLevels.l = parseFloat(value);
        break;
      case 'alarmLL':
        if (!tankData.alarmLevels) tankData.alarmLevels = {} as any;
        tankData.alarmLevels.ll = parseFloat(value);
        break;

      // Device Telemetry
      case 'level':
        tankData.level = parseFloat(value);
        break;
      case 'ullage':
        tankData.ullage = parseFloat(value);
        break;
      case 'temperature_19':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp19 = parseFloat(value);
        break;
      case 'temperature_20':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp20 = parseFloat(value);
        break;
      case 'temperature_21':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp21 = parseFloat(value);
        break;
      case 'temperature_22':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp22 = parseFloat(value);
        break;
      case 'temperature_23':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp23 = parseFloat(value);
        break;
      case 'temperature_24':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp24 = parseFloat(value);
        break;
      case 'temperature_25':
        if (!tankData.temperatures) tankData.temperatures = {};
        tankData.temperatures.temp25 = parseFloat(value);
        break;
      case 'GOV':
        if (value !== null && value !== undefined) {
          tankData.volumeGOV = parseFloat(value);
          tankData.volumeCurrent = parseFloat(value);
        }
        break;
      case 'GSV':
        if (value !== null && value !== undefined) {
          tankData.volumeGSV = parseFloat(value);
          tankData.volumeCurrent = parseFloat(value);
        }
        break;
      case 'NSV':
        if (value !== null && value !== undefined) {
          tankData.volumeNSV = parseFloat(value);
        }
        break;
      case 'apiGravity':
      case 'apiGravityBase':
        tankData.apiGravity = parseFloat(value);
        break;
      case 'strappingTable':
        try {
          tankData.strappingTable = typeof value === 'string' ? JSON.parse(value) : value;
        } catch (e) {
          console.warn('Failed to parse strapping table:', e);
        }
        break;
      case 'level_rate':
        tankData.levelRate = parseFloat(value);
        break;
      case 'RTGstatus':
        tankData.radarStatus = this.determineRadarStatus(value);
        break;
    }
  }

  /**
   * Calculate derived values for a tank
   */
  private calculateDerivedValues(tankData: Partial<TankData>): void {
    if (!tankData.level || !tankData.tankHeight) {
      return;
    }

    // Convert level from mm to meters
    tankData.levelMeters = tankData.level / 1000;

    // Calculate level percentage
    const bottomHeadDist = tankData.bottomHeadDistance || 0;
    tankData.levelPercent = this.tankCalculationService.calculateLevelPercent(
      tankData.levelMeters,
      tankData.tankHeight,
      bottomHeadDist
    );

    // Calculate average temperature
    if (tankData.temperatures) {
      const temps = [
        tankData.temperatures.temp19,
        tankData.temperatures.temp20,
        tankData.temperatures.temp21,
        tankData.temperatures.temp22,
        tankData.temperatures.temp23,
        tankData.temperatures.temp24,
        tankData.temperatures.temp25
      ].filter(t => t && t > 0);
      
      if (temps.length > 0) {
        tankData.temperatureAvg = temps.reduce((a, b) => a + b, 0) / temps.length;
      }
    }

    // Calculate volume using API MPMS if strapping table is available
    // BUT only if volumes are not already provided from telemetry
    const hasVolumeFromTelemetry = tankData.volumeGOV !== undefined || 
                                    tankData.volumeGSV !== undefined || 
                                    tankData.volumeNSV !== undefined;
    
    console.log(`[calculateDerivedValues] Tank ${tankData.tankTag}: hasVolumeFromTelemetry=${hasVolumeFromTelemetry}, GOV=${tankData.volumeGOV}, GSV=${tankData.volumeGSV}, NSV=${tankData.volumeNSV}`);
    
    if (!hasVolumeFromTelemetry) {
      if (tankData.strappingTable) {
        try {
          const tempC = tankData.temperatureAvg || 25;
          const tempF = (tempC * 9/5) + 32;

          const volumeResult = this.volumeApiMpmsService.calculateVolume({
            levelMM: tankData.level || 0,
            temperatureF: tempF,
            apiGravity: tankData.apiGravity || 35.0,
            strappingTable: tankData.strappingTable,
            bottomOffset: tankData.bottomHeadDistance ? tankData.bottomHeadDistance * 1000 : 0,
            referenceHeight: 0,
            correctionFactorCode: tankData.strappingTable.defaultFactorCode || '260X1'
          });

          tankData.volumeGOV = volumeResult.grossObservedVolume;
          tankData.volumeGSV = volumeResult.grossStandardVolume;
          tankData.volumeNSV = volumeResult.netStandardVolume;
          tankData.volumeCurrent = volumeResult.grossStandardVolume;
        } catch (error) {
          console.warn('Failed to calculate API MPMS volumes for tank:', tankData.tankTag, error);
          // Fallback to basic calculation
          tankData.volumeCurrent = this.tankCalculationService.calculateVolume(
            tankData.levelMeters,
            tankData
          );
        }
      } else {
        // Basic volume calculation (always recalculate based on current level)
        tankData.volumeCurrent = this.tankCalculationService.calculateVolume(
          tankData.levelMeters,
          tankData
        );
      }
    }

    // Calculate ullage if not provided
    if (!tankData.ullage && tankData.tankHeight) {
      tankData.ullage = tankData.tankHeight - tankData.levelMeters;
    }

    // Update timestamp
    tankData.lastUpdate = new Date();
  }

  /**
   * Evaluate alarms for a tank
   */
  private evaluateAlarms(tankData: Partial<TankData>): void {
    if (tankData.level !== undefined && tankData.tankHeight !== undefined) {
      tankData.activeAlarms = this.alarmEvaluatorService.evaluate(tankData as TankData);
      
      // Set current alarm level
      if (tankData.activeAlarms && tankData.activeAlarms.length > 0) {
        const highestAlarm = tankData.activeAlarms[0];
        // Map alarm severity to currentAlarmLevel
        tankData.currentAlarmLevel = highestAlarm.severity === 'warning' ? 'high' : 'critical';
      } else {
        tankData.currentAlarmLevel = 'none';
      }
    }
  }

  /**
   * Get alarm priority for sorting
   */
  private getAlarmPriority(severity: 'warning' | 'critical'): number {
    return severity === 'critical' ? 2 : 1;
  }

  /**
   * Parse radar status from RTGstatus value
   */
  private determineRadarStatus(statusValue: any): 'online' | 'offline' | 'error' {
    const status = parseInt(statusValue);
    if (isNaN(status)) return 'offline';
    if (status >= 8000 && status <= 12000) return 'online';
    if (status < 0) return 'error';
    return 'offline';
  }

  /**
   * Apply filters and sorting to tank list
   */
  applyFiltersAndSort(): void {
    // Start with all tanks
    this.filteredTanks = [...this.tanks];

    // Sort tanks
    this.filteredTanks.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'name':
          comparison = (a.tankName || '').localeCompare(b.tankName || '');
          break;
        case 'level':
          comparison = (a.levelPercent || 0) - (b.levelPercent || 0);
          break;
        case 'alarm':
          const alarmPriority: Record<string, number> = { critical: 4, high: 3, low: 2, none: 1 };
          comparison = (alarmPriority[a.currentAlarmLevel || 'none'] || 0) - 
                      (alarmPriority[b.currentAlarmLevel || 'none'] || 0);
          break;
        case 'volume':
          comparison = (a.volumeCurrent || 0) - (b.volumeCurrent || 0);
          break;
      }

      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Change sort criteria
   */
  changeSortBy(sortBy: 'name' | 'level' | 'alarm' | 'volume'): void {
    if (this.sortBy === sortBy) {
      // Toggle order if same field
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'asc';
    }
    this.applyFiltersAndSort();
    this.ctx.detectChanges();
  }

  /**
   * Change view mode
   */
  changeViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    this.ctx.detectChanges();
  }

  /**
   * Navegar al detalle del tanque
   */
  onTankClick(tank: TankData): void {
    console.log('Tanque seleccionado:', tank.tankTag);
    this.selectedTank = tank;
    this.ctx.detectChanges();
  }

  /**
   * Seleccionar tanque por ID (desde queryParams)
   */
  selectTankById(tankId: string): void {
    const tank = this.tanks.find(t => t.tankId === tankId);
    if (tank) {
      console.log('Tanque seleccionado desde URL:', tank.tankTag);
      this.onTankClick(tank);
    } else {
      console.warn(`Tank with ID ${tankId} not found`);
    }
  }

  /**
   * Cerrar la vista de detalle y volver a la lista
   */
  closeTankDetail(): void {
    this.selectedTank = null;
    this.ctx.detectChanges();
  }

  /**
   * Obtener texto de estado del radar en español
   */
  getRadarStatusText(status: string | undefined): string {
    switch (status) {
      case 'online': return 'En línea';
      case 'offline': return 'Fuera de línea';
      case 'error': return 'Error';
      default: return 'Desconocido';
    }
  }

  /**
   * ========================================
   * COMPACT SVG METHODS FOR GRID VIEW
   * ========================================
   */

  /**
   * Get compact SVG path for tank shell in grid view
   */
  getTankSvgPathCompact(tank: TankData): string {
    const shape = tank.tankShape || 'vertical_cylinder';
    
    if (shape === 'vertical_cylinder' || shape === 'vertical' as any) {
      // Calculate dimensions based on real tank ratio
      const tankHeight = tank.tankHeight || 12;
      const tankDiameter = tank.tankDiameter || 8;
      const ratio = tankDiameter / tankHeight;
      
      // Compact view dimensions
      const maxHeight = 90;
      const maxWidth = 60;
      
      let height = maxHeight;
      let width = height * ratio;
      
      // Si el ancho excede el máximo, ajustar por ancho
      if (width > maxWidth) {
        width = maxWidth;
        height = width / ratio;
      }
      
      const x = 50 - width / 2; // Centrar
      const y = 20;
      const roofHeight = 15;

      // Shell only (roof is separate)
      return `M ${x} ${y + roofHeight} L ${x} ${y + roofHeight + height} L ${x + width} ${y + roofHeight + height} L ${x + width} ${y + roofHeight} Z`;
    }
    
    return '';
  }

  /**
   * Get compact SVG path for roof in grid view
   */
  getRoofSvgPathCompact(tank: TankData): string {
    const shape = tank.tankShape || 'vertical_cylinder';
    
    if (shape === 'vertical_cylinder' || shape === 'vertical' as any) {
      // Calculate dimensions based on real tank ratio
      const tankHeight = tank.tankHeight || 12;
      const tankDiameter = tank.tankDiameter || 8;
      const ratio = tankDiameter / tankHeight;
      
      const maxHeight = 90;
      const maxWidth = 60;
      
      let height = maxHeight;
      let width = height * ratio;
      
      if (width > maxWidth) {
        width = maxWidth;
        height = width / ratio;
      }
      
      const x = 50 - width / 2; // Centrar
      const y = 20;
      const roofHeight = 15;

      // Fixed cone roof
      return `M ${x} ${y + roofHeight} L ${x + width/2} ${y} L ${x + width} ${y + roofHeight} Z`;
    }
    
    return '';
  }

  /**
   * Get compact SVG path for liquid level in grid view
   */
  getLiquidPathCompact(tank: TankData): string {
    const shape = tank.tankShape || 'vertical_cylinder';
    const levelPercent = tank.levelPercent || 0;

    if (levelPercent <= 0) return '';

    if (shape === 'vertical_cylinder' || shape === 'vertical' as any) {
      // Calculate dimensions based on real tank ratio
      const tankHeight = tank.tankHeight || 12;
      const tankDiameter = tank.tankDiameter || 8;
      const ratio = tankDiameter / tankHeight;
      
      const maxHeight = 90;
      const maxWidth = 60;
      
      let height = maxHeight;
      let width = height * ratio;
      
      if (width > maxWidth) {
        width = maxWidth;
        height = width / ratio;
      }
      
      const x = 50 - width / 2; // Centrar
      const y = 20;
      const roofHeight = 15;

      const liquidHeight = (height * levelPercent) / 100;
      const liquidY = y + roofHeight + height - liquidHeight;

      return `M ${x} ${liquidY} L ${x} ${y + roofHeight + height} L ${x + width} ${y + roofHeight + height} L ${x + width} ${liquidY} Z`;
    }

    return '';
  }
}
