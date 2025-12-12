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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Batch, BatchFilterCriteria, BatchStatus, BatchType, CreateBatchRequest, CloseBatchRequest, RecalculateBatchRequest } from '../shared/models/batch.model';
import { BatchService } from '../shared/services/batch.service';
import { TankAssetService } from '../shared/services/tank-asset.service';
import { GdtWidgetContextService } from '../shared/services/gdt-widget-context.service';
import { MovementDetectionService, BatchSuggestion, MovementEvent } from '../shared/services/movement-detection.service';
import { CreateBatchDialogComponent } from './components/create-batch-dialog/create-batch-dialog.component';
import { CreateBatchHistoricalDialogComponent } from './components/create-batch-historical-dialog/create-batch-historical-dialog.component';
import { BatchDetailDialogComponent } from './components/batch-detail-dialog/batch-detail-dialog.component';
import { CloseBatchDialogComponent } from './components/close-batch-dialog/close-batch-dialog.component';
import { RecalculateBatchDialogComponent } from './components/recalculate-batch-dialog/recalculate-batch-dialog.component';
import { BatchSuggestionNotificationComponent } from './components/batch-suggestion-notification/batch-suggestion-notification.component';

@Component({
  selector: 'tb-batch-management',
  templateUrl: './batch-management.component.html',
  styleUrls: ['./batch-management.component.scss']
})
export class BatchManagementComponent extends PageComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // Data
  batches: Batch[] = [];
  filteredBatches: Batch[] = [];
  tanks: any[] = [];

  // Filters
  selectedTankId: string | null = null;
  selectedStatus: BatchStatus | null = null;
  selectedType: BatchType | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  searchText: string = '';

  // UI State
  loading = false;
  displayedColumns: string[] = ['batchNumber', 'tankName', 'type', 'status', 'opening', 'closing', 'createdAt', 'actions'];

  // Movement Detection
  private activeMovementMonitoring = new Map<string, boolean>();
  private dismissedSuggestions = new Map<string, number>(); // tankId -> timestamp of dismissal

  // Filter options
  statusOptions: { label: string; value: BatchStatus }[] = [
    { label: 'Abierto', value: 'open' },
    { label: 'Cerrado', value: 'closed' },
    { label: 'Recalculado', value: 'recalculated' },
    { label: 'Anulado', value: 'voided' }
  ];

  typeOptions: { label: string; value: BatchType }[] = [
    { label: 'Recepción', value: 'receiving' },
    { label: 'Despacho', value: 'dispensing' }
  ];

  constructor(
    protected store: Store<AppState>,
    private batchService: BatchService,
    private tankAssetService: TankAssetService,
    private gdtContextService: GdtWidgetContextService,
    private movementDetectionService: MovementDetectionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cd: ChangeDetectorRef
  ) {
    super(store);
  }

  ngOnInit() {
    this.loadTanks();
    this.loadBatches();
    this.initializeMovementDetection();
  }

  ngOnDestroy() {
    // Stop all movement monitoring
    this.activeMovementMonitoring.forEach((_, tankId) => {
      this.movementDetectionService.stopMonitoring(tankId);
    });
    this.activeMovementMonitoring.clear();

    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize movement detection for all tanks
   */
  private initializeMovementDetection(): void {
    console.log('[BatchManagement] Initializing movement detection');
    
    // Start monitoring for each tank
    this.tanks.forEach(tank => {
      const tankId = tank.asset?.id?.id || tank.id;
      if (tankId && !this.activeMovementMonitoring.has(tankId)) {
        this.startMovementMonitoring(tankId);
      }
    });
  }

  /**
   * Start monitoring a specific tank for movement
   */
  private startMovementMonitoring(tankId: string): void {
    console.log('[BatchManagement] Starting movement monitoring for tank:', tankId);
    
    this.movementDetectionService.startMonitoring(tankId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (movementEvent: MovementEvent) => {
          console.log('[BatchManagement] Movement detected:', movementEvent);
          this.handleMovementDetected(movementEvent);
        },
        error: (err) => {
          console.error('[BatchManagement] Error monitoring movement:', err);
        }
      });

    this.activeMovementMonitoring.set(tankId, true);
  }

  /**
   * Handle detected movement - show suggestion dialog
   */
  private handleMovementDetected(movementEvent: MovementEvent): void {
    const tankId = movementEvent.tankId;

    // Check if suggestion was recently dismissed (within 5 minutes)
    const dismissedTime = this.dismissedSuggestions.get(tankId);
    if (dismissedTime && (Date.now() - dismissedTime) < 5 * 60 * 1000) {
      console.log('[BatchManagement] Suggestion recently dismissed for tank:', tankId);
      return;
    }

    // Generate suggestion
    const suggestion = this.movementDetectionService.suggestBatchCreation(movementEvent);

    if (suggestion.suggested) {
      console.log('[BatchManagement] Showing batch suggestion for tank:', tankId);
      
      const dialogRef = this.dialog.open(BatchSuggestionNotificationComponent, {
        width: '500px',
        disableClose: false,
        data: { suggestion, movementEvent }
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          switch (result.action) {
            case 'created':
              console.log('[BatchManagement] Batch created from suggestion:', result.batch);
              this.loadBatches();
              break;

            case 'dismissed':
              console.log('[BatchManagement] Suggestion dismissed by user');
              this.dismissedSuggestions.set(tankId, Date.now());
              break;

            case 'remind_later':
              console.log('[BatchManagement] User chose to remind later');
              this.dismissedSuggestions.set(tankId, Date.now());
              break;
          }
        }
      });
    }
  }

  loadTanks() {
    this.tankAssetService.getAllTanksWithAttributes('Tank')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tanks) => {
          this.tanks = tanks;
          // Reinitialize movement detection for new tanks
          this.initializeMovementDetection();
        },
        error: (err) => {
          console.error('Error loading tanks:', err);
        }
      });
  }

  loadBatches() {
    console.log('[BatchManagement] loadBatches called');
    this.loading = true;
    const filters: BatchFilterCriteria = {
      tankId: this.selectedTankId || undefined,
      status: this.selectedStatus || undefined,
      batchType: this.selectedType || undefined,
      startDate: this.startDate ? this.startDate.getTime() : undefined,
      endDate: this.endDate ? this.endDate.getTime() : undefined,
      pageSize: 100,
      pageNumber: 0
    };

    console.log('[BatchManagement] Calling batchService.getBatches with filters:', filters);

    this.batchService.getBatches(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[BatchManagement] Received response:', response);
          this.batches = response.batches;
          this.applyFilters();
          this.loading = false;
          this.cd.detectChanges(); // Force change detection
        },
        error: (err) => {
          console.error('[BatchManagement] Error loading batches:', err);
          this.snackBar.open('Error loading batches', 'Close', { duration: 5000 });
          this.loading = false;
        }
      });
  }

  applyFilters() {
    this.filteredBatches = this.batches.filter(batch => {
      if (this.searchText) {
        const searchLower = this.searchText.toLowerCase();
        return batch.batchNumber.toLowerCase().includes(searchLower) ||
               batch.tankName.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }

  onFilterChange() {
    this.loadBatches();
  }

  onSearchChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.selectedTankId = null;
    this.selectedStatus = null;
    this.selectedType = null;
    this.startDate = null;
    this.endDate = null;
    this.searchText = '';
    this.loadBatches();
  }

  createBatch() {
    const dialogRef = this.dialog.open(CreateBatchDialogComponent, {
      width: '600px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((request: CreateBatchRequest) => {
      if (request) {
        this.batchService.createBatch(request)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (batch) => {
              this.snackBar.open(`Batch ${batch.batchNumber} creado exitosamente`, 'Cerrar', { duration: 3000 });
              this.loadBatches();
            },
            error: (err) => {
              console.error('Error creating batch:', err);
              this.snackBar.open('Error al crear batch', 'Cerrar', { duration: 5000 });
            }
          });
      }
    });
  }

  createHistoricalBatch() {
    const dialogRef = this.dialog.open(CreateBatchHistoricalDialogComponent, {
      width: '600px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((batch: Batch) => {
      if (batch) {
        this.snackBar.open(`Batch histórico ${batch.batchNumber} creado exitosamente`, 'Cerrar', { duration: 3000 });
        this.loadBatches();
      }
    });
  }

  viewBatchDetail(batch: Batch) {
    this.dialog.open(BatchDetailDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { batch }
    });
  }

  closeBatch(batch: Batch) {
    if (batch.status !== 'open') {
      this.snackBar.open('Solo se pueden cerrar batches abiertos', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(CloseBatchDialogComponent, {
      width: '600px',
      disableClose: false,
      data: { batch }
    });

    dialogRef.afterClosed().subscribe((request: CloseBatchRequest) => {
      if (request) {
        this.batchService.closeBatch(request)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (closedBatch) => {
              this.snackBar.open(`Batch ${closedBatch.batchNumber} cerrado exitosamente`, 'Cerrar', { duration: 3000 });
              this.loadBatches();
            },
            error: (err) => {
              console.error('Error closing batch:', err);
              this.snackBar.open('Error al cerrar batch', 'Cerrar', { duration: 5000 });
            }
          });
      }
    });
  }

  recalculateBatch(batch: Batch) {
    if (batch.status !== 'closed') {
      this.snackBar.open('Solo se pueden recalcular batches cerrados', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(RecalculateBatchDialogComponent, {
      width: '600px',
      disableClose: false,
      data: { batch }
    });

    dialogRef.afterClosed().subscribe((request: RecalculateBatchRequest) => {
      if (request) {
        this.batchService.recalculateBatch(request)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (recalculatedBatch) => {
              this.snackBar.open(`Batch ${recalculatedBatch.batchNumber} recalculado exitosamente`, 'Cerrar', { duration: 3000 });
              this.loadBatches();
            },
            error: (err) => {
              console.error('Error recalculating batch:', err);
              this.snackBar.open(err.message || 'Error al recalcular batch', 'Cerrar', { duration: 5000 });
            }
          });
      }
    });
  }

  downloadReport(batch: Batch) {
    this.batchService.downloadBatchReport(batch.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, `batch-${batch.batchNumber}.pdf`);
          this.snackBar.open('Report downloaded successfully', 'Close', { duration: 3000 });
        },
        error: (err) => {
          console.error('Error downloading report:', err);
          this.snackBar.open('Error downloading report', 'Close', { duration: 5000 });
        }
      });
  }

  exportToCsv() {
    const filters: BatchFilterCriteria = {
      tankId: this.selectedTankId || undefined,
      status: this.selectedStatus || undefined,
      batchType: this.selectedType || undefined
    };

    this.batchService.exportBatchesToCsv(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, `batches-${Date.now()}.csv`);
          this.snackBar.open('Batches exported successfully', 'Close', { duration: 3000 });
        },
        error: (err) => {
          console.error('Error exporting batches:', err);
          this.snackBar.open('Error exporting batches', 'Close', { duration: 5000 });
        }
      });
  }

  getStatusColor(status: BatchStatus): string {
    switch (status) {
      case 'open':
        return 'primary';
      case 'closed':
        return 'accent';
      case 'recalculated':
        return 'warn';
      case 'voided':
        return 'disabled';
      default:
        return '';
    }
  }

  getStatusIcon(status: BatchStatus): string {
    switch (status) {
      case 'open':
        return 'lock_open';
      case 'closed':
        return 'lock';
      case 'recalculated':
        return 'refresh';
      case 'voided':
        return 'cancel';
      default:
        return '';
    }
  }

  getStatusLabel(status: BatchStatus): string {
    switch (status) {
      case 'open':
        return 'Abierto';
      case 'closed':
        return 'Cerrado';
      case 'recalculated':
        return 'Recalculado';
      case 'voided':
        return 'Anulado';
      default:
        return status;
    }
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private downloadFile(blob: Blob, filename: string) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
