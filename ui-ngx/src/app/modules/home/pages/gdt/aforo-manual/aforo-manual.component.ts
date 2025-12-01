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

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WidgetContext } from '@home/models/widget-component.models';

// GDT Services
import { TankAssetService, TankAsset } from '../shared/services/tank-asset.service';
import { ManualTelemetryService, ManualTelemetryEntry } from '../tank-monitoring/services/manual-telemetry.service';
import { GdtWidgetContextService } from '../shared/services/gdt-widget-context.service';

@Component({
  selector: 'tb-aforo-manual',
  templateUrl: './aforo-manual.component.html',
  styleUrls: ['./aforo-manual.component.scss']
})
export class AforoManualComponent extends PageComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  widgetContext: WidgetContext;

  tanks: Array<{ asset: TankAsset, attributes: any }> = [];
  selectedTank: { asset: TankAsset, attributes: any } | null = null;
  telemetryHistory: ManualTelemetryEntry[] = [];
  loading = false;
  loadingHistory = false;

  constructor(
    protected store: Store<AppState>,
    private tankAssetService: TankAssetService,
    private manualTelemetryService: ManualTelemetryService,
    private gdtContextService: GdtWidgetContextService,
    private cd: ChangeDetectorRef
  ) {
    super(store);
  }

  ngOnInit() {
    // Create widget context for manual telemetry service
    this.widgetContext = this.gdtContextService.createContext({}, this.cd);
    this.loadTanks();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTanks() {
    this.loading = true;
    this.tankAssetService.getAllTanksWithAttributes('Tank')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tanks) => {
          this.tanks = tanks;
          this.loading = false;
          
          // Auto-select first tank if available
          if (tanks.length > 0 && !this.selectedTank) {
            this.onTankSelected(tanks[0]);
          }
        },
        error: (err) => {
          console.error('Error loading tanks:', err);
          this.loading = false;
        }
      });
  }

  onTankSelected(tank: { asset: TankAsset, attributes: any }) {
    this.selectedTank = tank;
    if (tank.asset.id) {
      this.loadTelemetryHistory(tank.asset.id.id);
    }
  }

  loadTelemetryHistory(tankId: string) {
    this.loadingHistory = true;
    const endTime = Date.now();
    const startTime = endTime - (30 * 24 * 60 * 60 * 1000); // Last 30 days
    
    this.manualTelemetryService.getManualEntryHistory(this.widgetContext, tankId, startTime, endTime, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          this.telemetryHistory = history;
          this.loadingHistory = false;
        },
        error: (err) => {
          console.error('Error loading telemetry history:', err);
          this.loadingHistory = false;
        }
      });
  }

  onEntrySaved(entry: ManualTelemetryEntry) {
    // Reload history after saving new entry
    if (this.selectedTank && this.selectedTank.asset.id) {
      this.loadTelemetryHistory(this.selectedTank.asset.id.id);
    }
  }
}
