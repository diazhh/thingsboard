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
import { MatSnackBar } from '@angular/material/snack-bar';

// GDT Services
import { TankAssetService, TankAsset } from '../shared/services/tank-asset.service';
import { ManualTelemetryService, ManualTelemetryEntry } from '../tank-monitoring/services/manual-telemetry.service';
import { GdtWidgetContextService } from '../shared/services/gdt-widget-context.service';
import { LabBatchIntegrationService, LabResult } from '../shared/services/lab-batch-integration.service';

// Dialog Component
import { LabFormDialogComponent } from './dialogs/lab-form-dialog.component';
import { LabVarianceNotificationComponent } from '../batch-management/components/lab-variance-notification/lab-variance-notification.component';

@Component({
  selector: 'tb-laboratorio',
  templateUrl: './laboratorio.component.html',
  styleUrls: ['./laboratorio.component.scss']
})
export class LaboratorioComponent extends PageComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  widgetContext: WidgetContext;

  tanks: Array<{ asset: TankAsset, attributes: any }> = [];
  selectedTankFilter: { asset: TankAsset, attributes: any } | null = null;
  analysisHistory: ManualTelemetryEntry[] = [];
  allAnalysisHistory: ManualTelemetryEntry[] = [];
  loading = false;
  loadingHistory = false;

  constructor(
    protected store: Store<AppState>,
    private tankAssetService: TankAssetService,
    private manualTelemetryService: ManualTelemetryService,
    private gdtContextService: GdtWidgetContextService,
    private labBatchIntegrationService: LabBatchIntegrationService,
    private cd: ChangeDetectorRef,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    super(store);
  }

  ngOnInit() {
    // Create widget context for manual telemetry service
    this.widgetContext = this.gdtContextService.createContext({}, this.cd);
    this.loadTanks();
    this.initializeLabBatchIntegration();
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
          // Load all analysis history after tanks are loaded
          this.loadAllAnalysisHistory();
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
      this.analysisHistory = this.allAnalysisHistory.filter(
        entry => entry.tankId === this.selectedTankFilter?.asset.id.id
      );
    } else {
      // Show all history
      this.analysisHistory = [...this.allAnalysisHistory];
    }
  }

  loadAllAnalysisHistory() {
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
            // Filter only laboratory entries and enrich with tankTag
            const labEntries = history
              .filter(entry => entry.source === 'laboratory')
              .map(entry => ({
                ...entry,
                tankTag: tankTag
              }));
            allHistory.push(...labEntries);
            completedRequests++;
            
            if (completedRequests === tankIds.length) {
              // Sort by timestamp descending
              this.allAnalysisHistory = allHistory.sort((a, b) => b.timestamp - a.timestamp);
              this.applyTankFilter();
              this.loadingHistory = false;
              console.log('[Laboratorio] Loaded analysis entries:', this.allAnalysisHistory.length);
              console.log('[Laboratorio] Sample entry:', this.allAnalysisHistory[0]);
            }
          },
          error: (err) => {
            console.error('Error loading analysis history:', err);
            completedRequests++;
            
            if (completedRequests === tankIds.length) {
              this.allAnalysisHistory = allHistory.sort((a, b) => b.timestamp - a.timestamp);
              this.applyTankFilter();
              this.loadingHistory = false;
            }
          }
        });
    });
  }

  onAnalysisSaved(entry: ManualTelemetryEntry) {
    // Reload all history after saving new entry
    this.loadAllAnalysisHistory();
  }

  openLabDialog() {
    const dialogRef = this.dialog.open(LabFormDialogComponent, {
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
        this.onAnalysisSaved(result);
        // Check for batch associations
        this.checkLabResultAssociation(result);
      }
    });
  }

  /**
   * Initialize lab-batch integration monitoring
   */
  private initializeLabBatchIntegration(): void {
    console.log('[Laboratorio] Initializing lab-batch integration');

    // Subscribe to new associations
    this.labBatchIntegrationService.getAssociationsObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (association) => {
          console.log('[Laboratorio] New lab-batch association detected:', association);
          
          // Only show notification if variance is significant AND status is pending
          // This prevents showing notifications for already rejected associations
          if (association.varianceAnalysis.isSignificant && association.status === 'pending') {
            this.showVarianceNotification(association);
          }
        },
        error: (err) => {
          console.error('[Laboratorio] Error in lab-batch integration:', err);
        }
      });
  }

  /**
   * Check if lab result should be associated with a batch
   */
  private checkLabResultAssociation(entry: ManualTelemetryEntry): void {
    // Convert ManualTelemetryEntry to LabResult
    const entryData = entry as any;
    const labResult: LabResult = {
      id: entry.id || `lab-${Date.now()}`,
      tankId: entry.tankId,
      timestamp: entry.timestamp,
      apiGravity: entryData.apiGravity || 0,
      temperature: entryData.temperature || 0,
      bsw: entryData.bsw || 0,
      density: entryData.density,
      viscosity: entryData.viscosity,
      notes: entryData.notes,
      operator: entryData.operator || entryData.operatorId
    };

    console.log('[Laboratorio] Checking lab result association:', labResult);

    // Try to associate with batch
    this.labBatchIntegrationService.associateLabResultWithBatch(labResult)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (association) => {
          console.log('[Laboratorio] Lab result associated with batch:', association);
          
          // Show notification if variance is significant
          if (association.varianceAnalysis.isSignificant) {
            this.showVarianceNotification(association);
          } else {
            this.snackBar.open('✅ Lab result associated with batch', 'Close', { duration: 3000 });
          }
        },
        error: (err) => {
          console.error('[Laboratorio] Error associating lab result:', err);
          
          // Only show snackbar if it's not a "already rejected" error
          if (!err.message?.includes('already rejected')) {
            this.snackBar.open('ℹ️ No closed batch found for this lab result', 'Close', { duration: 3000 });
          }
        }
      });
  }

  /**
   * Show variance notification dialog
   */
  private showVarianceNotification(association: any): void {
    const dialogRef = this.dialog.open(LabVarianceNotificationComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      data: { association }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        switch (result.action) {
          case 'recalculated':
            console.log('[Laboratorio] Batch recalculated from lab variance:', result.batch);
            this.labBatchIntegrationService.updateAssociationStatus(association.id, 'recalculated');
            break;

          case 'ignored':
            console.log('[Laboratorio] Lab variance ignored by user');
            this.labBatchIntegrationService.updateAssociationStatus(association.id, 'rejected');
            break;
        }
      }
    });
  }
}
