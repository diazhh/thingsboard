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
import { MatDialog } from '@angular/material/dialog';

// GDT Services
import { TankAssetService, TankAsset } from '../shared/services/tank-asset.service';
import { ManualTelemetryService, ManualTelemetryEntry } from '../tank-monitoring/services/manual-telemetry.service';
import { GdtWidgetContextService } from '../shared/services/gdt-widget-context.service';

// Dialog Component
import { AforoFormDialogComponent } from './dialogs/aforo-form-dialog.component';

@Component({
  selector: 'tb-aforo-manual',
  templateUrl: './aforo-manual.component.html',
  styleUrls: ['./aforo-manual.component.scss']
})
export class AforoManualComponent extends PageComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  widgetContext: WidgetContext;

  tanks: Array<{ asset: TankAsset, attributes: any }> = [];
  selectedTankFilter: { asset: TankAsset, attributes: any } | null = null;
  telemetryHistory: ManualTelemetryEntry[] = [];
  allTelemetryHistory: ManualTelemetryEntry[] = [];
  loading = false;
  loadingHistory = false;

  constructor(
    protected store: Store<AppState>,
    private tankAssetService: TankAssetService,
    private manualTelemetryService: ManualTelemetryService,
    private gdtContextService: GdtWidgetContextService,
    private cd: ChangeDetectorRef,
    private dialog: MatDialog
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
          // Load all telemetry history after tanks are loaded
          this.loadAllTelemetryHistory();
        },
        error: (err) => {
          console.error('Error loading tanks:', err);
          this.loading = false;
        }
      });
  }

  onTankFilterChanged(tank: { asset: TankAsset, attributes: any } | null) {
    this.selectedTankFilter = tank;
    this.applyTankFilter();
  }

  applyTankFilter() {
    if (this.selectedTankFilter) {
      // Filter history by selected tank
      this.telemetryHistory = this.allTelemetryHistory.filter(
        entry => entry.tankId === this.selectedTankFilter?.asset.id.id
      );
    } else {
      // Show all history
      this.telemetryHistory = [...this.allTelemetryHistory];
    }
  }

  loadAllTelemetryHistory() {
    this.loadingHistory = true;
    const endTime = Date.now();
    const startTime = endTime - (30 * 24 * 60 * 60 * 1000); // Last 30 days
    
    // Load history for all tanks
    const tankIds = this.tanks.map(t => t.asset.id.id);
    if (tankIds.length === 0) {
      this.loadingHistory = false;
      return;
    }

    // Load history for each tank and combine
    let completedRequests = 0;
    const allHistory: ManualTelemetryEntry[] = [];

    tankIds.forEach(tankId => {
      // Find tank info
      const tankInfo = this.tanks.find(t => t.asset.id.id === tankId);
      const tankTag = tankInfo?.attributes.tankTag || tankInfo?.asset.name || 'N/A';
      
      this.manualTelemetryService.getManualEntryHistory(this.widgetContext, tankId, startTime, endTime, 100)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (history) => {
            // Enrich entries with tankTag
            const enrichedHistory = history.map(entry => ({
              ...entry,
              tankTag: tankTag
            }));
            allHistory.push(...enrichedHistory);
            completedRequests++;
            
            if (completedRequests === tankIds.length) {
              // Sort by timestamp descending
              this.allTelemetryHistory = allHistory.sort((a, b) => b.timestamp - a.timestamp);
              this.applyTankFilter();
              this.loadingHistory = false;
              console.log('[AforoManual] Loaded history entries:', this.allTelemetryHistory.length);
              console.log('[AforoManual] Sample entry:', this.allTelemetryHistory[0]);
            }
          },
          error: (err) => {
            console.error('Error loading telemetry history:', err);
            completedRequests++;
            
            if (completedRequests === tankIds.length) {
              this.allTelemetryHistory = allHistory.sort((a, b) => b.timestamp - a.timestamp);
              this.applyTankFilter();
              this.loadingHistory = false;
            }
          }
        });
    });
  }

  onEntrySaved(entry: ManualTelemetryEntry) {
    // Reload all history after saving new entry
    this.loadAllTelemetryHistory();
  }

  openAforoDialog() {
    const dialogRef = this.dialog.open(AforoFormDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: {
        tanks: this.tanks,
        widgetContext: this.widgetContext
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Reload history after saving new entry
        this.onEntrySaved(result);
      }
    });
  }
}
