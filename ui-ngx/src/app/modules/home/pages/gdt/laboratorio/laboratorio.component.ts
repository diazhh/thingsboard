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
  selector: 'tb-laboratorio',
  templateUrl: './laboratorio.component.html',
  styleUrls: ['./laboratorio.component.scss']
})
export class LaboratorioComponent extends PageComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  widgetContext: WidgetContext;

  tanks: Array<{ asset: TankAsset, attributes: any }> = [];
  selectedTank: { asset: TankAsset, attributes: any } | null = null;
  analysisHistory: ManualTelemetryEntry[] = [];
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
      this.loadAnalysisHistory(tank.asset.id.id);
    }
  }

  loadAnalysisHistory(tankId: string) {
    this.loadingHistory = true;
    const endTime = Date.now();
    const startTime = endTime - (30 * 24 * 60 * 60 * 1000); // Last 30 days
    
    this.manualTelemetryService.getManualEntryHistory(this.widgetContext, tankId, startTime, endTime, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          // Filter only laboratory entries
          this.analysisHistory = history.filter(entry => entry.source === 'laboratory');
          this.loadingHistory = false;
        },
        error: (err) => {
          console.error('Error loading analysis history:', err);
          this.loadingHistory = false;
        }
      });
  }

  onAnalysisSaved(entry: ManualTelemetryEntry) {
    // Reload history after saving new entry
    if (this.selectedTank && this.selectedTank.asset.id) {
      this.loadAnalysisHistory(this.selectedTank.asset.id.id);
    }
  }
}
