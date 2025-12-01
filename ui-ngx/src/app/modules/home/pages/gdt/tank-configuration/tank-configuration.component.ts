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
import { WidgetContext } from '@home/models/widget-component.models';
import { TankAssetService, TankAsset, TankAttributes } from '../shared/services/tank-asset.service';
import { RadarDeviceService, RadarDevice } from '../shared/services/radar-device.service';
import { SystemConfigService } from '../shared/services/system-config.service';
import { GdtWidgetContextService } from '../shared/services/gdt-widget-context.service';
import { Subscription } from 'rxjs';

/**
 * Tank Configuration Widget
 *
 * Purpose: Complete configuration widget for tank system management
 * 
 * Sections:
 * 1. Tank Configuration: Manage tanks, assign radars, configure calibration tables
 * 2. Radar Configuration: Configure radar parameters with Modbus write validation
 * 3. General Configuration: Volume display formats, Modbus port scanning
 *
 * Usage: Engineering Dashboard, Configuration screens
 */
@Component({
  selector: 'tb-tank-configuration',
  templateUrl: './tank-configuration.component.html',
  styleUrls: ['./tank-configuration.component.scss']
})
export class TankConfigurationComponent implements OnInit, OnDestroy {

  ctx: WidgetContext; // Created by GdtWidgetContextService

  // Main sections
  activeSection: 'tanks' | 'radars' | 'general' = 'tanks';

  // Data
  tanks: Array<{ asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice }> = [];
  radars: RadarDevice[] = [];
  
  // Selected items for detail view
  selectedTank: { asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice } | null = null;
  selectedRadar: RadarDevice | null = null;

  // Tank detail tabs
  tankDetailTab: 'basic' | 'radar-assignment' | 'calibration' = 'basic';

  // Loading states
  loading: boolean = true;
  error: string | null = null;

  // Configuration
  assetProfileFilter: string = 'Tank';
  deviceProfileFilter: string = 'Radar_TRL2';

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private cd: ChangeDetectorRef,
    private gdtContextService: GdtWidgetContextService,
    private tankAssetService: TankAssetService,
    private radarDeviceService: RadarDeviceService,
    private systemConfigService: SystemConfigService
  ) {}

  ngOnInit(): void {
    // Create WidgetContext for page mode
    this.ctx = this.gdtContextService.createContext({
      assetProfileFilter: this.assetProfileFilter,
      deviceProfileFilter: this.deviceProfileFilter
    }, this.cd);
    
    // Register this component in the widget scope
    if (this.ctx && this.ctx.$scope) {
      this.ctx.$scope.tankConfigurationComponent = this;
    }

    // Initialize system config service with tenant ID
    if (this.ctx && this.ctx.currentUser && this.ctx.currentUser.tenantId) {
      this.systemConfigService.initWithTenant(this.ctx.currentUser.tenantId);
    }

    // Load settings
    this.loadSettings();

    // Load all data
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadSettings(): void {
    if (this.ctx.settings) {
      this.assetProfileFilter = this.ctx.settings.assetProfileFilter || 'Tank';
      this.deviceProfileFilter = this.ctx.settings.deviceProfileFilter || 'Radar_TRL2';
    }
  }

  /**
   * Load all tanks and radars
   */
  private loadAllData(): void {
    this.loading = true;
    this.error = null;

    // Load tanks with attributes
    this.tankAssetService.getAllTanksWithAttributes(this.assetProfileFilter)
      .subscribe({
        next: (tanksWithAttributes) => {
          console.log(`Loaded ${tanksWithAttributes.length} tanks`);

          // Get radar assignments for each tank
          const tankIds = tanksWithAttributes.map(t => t.asset.id!.id);
          this.radarDeviceService.getTankRadarAssignments(tankIds)
            .subscribe({
              next: (assignments) => {
                // Build tank list with radar info
                const tankPromises = tanksWithAttributes.map(async (tankWithAttr) => {
                  const tankId = tankWithAttr.asset.id!.id;
                  const radarId = assignments.get(tankId);
                  
                  let radar: RadarDevice | undefined;
                  if (radarId) {
                    try {
                      radar = await this.radarDeviceService.getRadarById(radarId).toPromise();
                    } catch (err) {
                      console.warn(`Could not load radar ${radarId}:`, err);
                    }
                  }

                  return {
                    asset: tankWithAttr.asset,
                    attributes: tankWithAttr.attributes,
                    radar: radar
                  };
                });

                Promise.all(tankPromises).then(tanks => {
                  this.tanks = tanks;
                  this.loading = false;
                  this.ctx.detectChanges();
                });
              },
              error: (err) => {
                console.error('Error loading radar assignments:', err);
                // Continue without radar info
                this.tanks = tanksWithAttributes.map(t => ({
                  asset: t.asset,
                  attributes: t.attributes
                }));
                this.loading = false;
                this.ctx.detectChanges();
              }
            });

          // Load all radars
          this.loadRadars();
        },
        error: (err) => {
          console.error('Error loading tanks:', err);
          this.error = 'Failed to load tanks. Check permissions.';
          this.loading = false;
          this.ctx.detectChanges();
        }
      });
  }

  /**
   * Load all radars
   */
  private loadRadars(): void {
    this.radarDeviceService.getRadarsByProfile(this.deviceProfileFilter)
      .subscribe({
        next: (radars) => {
          this.radars = radars;
          this.ctx.detectChanges();
        },
        error: (err) => {
          console.error('Error loading radars:', err);
        }
      });
  }

  /**
   * Set active section
   */
  setActiveSection(section: 'tanks' | 'radars' | 'general'): void {
    this.activeSection = section;
    this.selectedTank = null;
    this.selectedRadar = null;
    this.ctx.detectChanges();
  }

  /**
   * Select tank for detail view
   */
  selectTank(tank: { asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice }): void {
    this.selectedTank = tank;
    this.tankDetailTab = 'basic';
    this.ctx.detectChanges();
  }

  /**
   * Go back to tank list
   */
  backToTankList(): void {
    this.selectedTank = null;
    this.ctx.detectChanges();
  }

  /**
   * Set tank detail tab
   */
  setTankDetailTab(index: number | 'basic' | 'radar-assignment' | 'calibration'): void {
    if (typeof index === 'number') {
      const tabs: ('basic' | 'radar-assignment' | 'calibration')[] = ['basic', 'radar-assignment', 'calibration'];
      this.tankDetailTab = tabs[index] || 'basic';
    } else {
      this.tankDetailTab = index;
    }
    this.ctx.detectChanges();
  }

  /**
   * Select radar for detail view
   */
  selectRadar(radar: RadarDevice): void {
    this.selectedRadar = radar;
    this.ctx.detectChanges();
  }

  /**
   * Go back to radar list
   */
  backToRadarList(): void {
    this.selectedRadar = null;
    this.ctx.detectChanges();
  }

  /**
   * Reload all data
   */
  reloadData(): void {
    this.loadAllData();
  }

  // Widget settings
  get settings() {
    return this.ctx.settings;
  }
}
