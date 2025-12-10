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

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SealManagementService } from '../../shared/services/seal-management.service';
import type { SealStatus } from '../../shared/services/seal-management.service';

/**
 * Seal Management Component
 * Manages electronic seals for OIML R85 compliance
 */
@Component({
  selector: 'tb-seal-management',
  templateUrl: './seal-management.component.html',
  styleUrls: ['./seal-management.component.scss']
})
export class SealManagementComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // Form
  sealForm: FormGroup;
  unsealForm: FormGroup;

  // Data
  sealedDevices: SealStatus[] = [];
  unsealedDevices: SealStatus[] = [];
  dataSource: MatTableDataSource<SealStatus>;
  
  // Different column sets for each tab
  sealedDisplayedColumns: string[] = [
    'deviceName',
    'state',
    'sealedBy',
    'sealedAt',
    'complianceStatus',
    'configurationChanges',
    'dataModifications',
    'actions'
  ];
  
  unsealedDisplayedColumns: string[] = [
    'deviceName',
    'state',
    'complianceStatus',
    'configurationChanges',
    'dataModifications',
    'actions'
  ];
  
  // Dynamic property that returns the correct columns for the current tab
  get displayedColumns(): string[] {
    return this.selectedTab === 0 ? this.sealedDisplayedColumns : this.unsealedDisplayedColumns;
  }

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  // UI State
  loading = false;
  selectedTab = 0;
  showSealDialog = false;
  showUnsealDialog = false;
  showHistoryDialog = false;
  showVerificationModal = false;
  selectedDevice: SealStatus | null = null;
  sealHistory: any[] = [];
  verificationResult: any = null;

  // Available devices - loaded from unsealed devices
  availableDevices: Array<{ id: string; name: string }> = [];

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private sealService: SealManagementService,
    private snackBar: MatSnackBar
  ) {
    this.sealForm = this.fb.group({
      deviceId: ['', Validators.required],
      reason: ['', Validators.required]
    });

    this.unsealForm = this.fb.group({
      reason: ['', Validators.required]
    });

    this.dataSource = new MatTableDataSource<SealStatus>([]);
  }

  ngOnInit(): void {
    console.log('SealManagementComponent initialized, selectedTab:', this.selectedTab);
    // Initialize dataSource with empty data for the selected tab
    this.updateDataSource();
    // Load data
    this.loadSealedDevices();
    this.loadUnsealedDevices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load sealed devices
   */
  loadSealedDevices(): void {
    this.sealService.getSealedDevices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (devices) => {
          console.log('Sealed devices loaded:', devices);
          this.sealedDevices = devices;
          // Update data source if we're on the sealed tab
          if (this.selectedTab === 0) {
            this.updateDataSource();
          }
        },
        error: (error) => {
          console.error('Error loading sealed devices:', error);
          this.snackBar.open('Error al cargar dispositivos sellados', 'Cerrar', { duration: 3000 });
        }
      });
  }

  /**
   * Load unsealed devices
   */
  loadUnsealedDevices(): void {
    console.log('Loading unsealed devices...');
    this.sealService.getUnsealedDevices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (devices) => {
          console.log('Unsealed devices loaded:', devices);
          this.unsealedDevices = devices;
          // Update available devices for seal dialog
          this.availableDevices = devices.map(d => ({
            id: d.deviceId,
            name: d.deviceName
          }));
          console.log('Available devices updated:', this.availableDevices);
          // Update data source if we're on the unsealed tab
          if (this.selectedTab === 1) {
            this.updateDataSource();
          }
        },
        error: (error) => {
          console.error('Error loading unsealed devices:', error);
          this.snackBar.open('Error al cargar dispositivos sin sellar', 'Cerrar', { duration: 3000 });
        }
      });
  }

  /**
   * Update data source based on selected tab
   */
  private updateDataSource(): void {
    // Default to tab 0 if selectedTab is undefined
    const currentTab = this.selectedTab ?? 0;
    const data = currentTab === 0 ? this.sealedDevices : this.unsealedDevices;
    console.log(`Updating dataSource for tab ${currentTab}:`, data);
    this.dataSource.data = data;
    
    // Force table to refresh
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
    
    // Trigger change detection
    this.dataSource._updateChangeSubscription();
  }

  /**
   * Handle tab change
   */
  onTabChange(event: any): void {
    const newIndex = typeof event === 'number' ? event : event.index;
    console.log(`Tab changed to: ${newIndex}`);
    
    if (newIndex !== undefined && newIndex !== null) {
      this.selectedTab = newIndex;
      this.updateDataSource();
    }
  }

  /**
   * Open seal dialog
   */
  openSealDialog(device?: SealStatus): void {
    // If a device is provided, preselect it
    if (device) {
      this.sealForm.patchValue({
        deviceId: device.deviceId
      });
    } else {
      // Reset form if no device provided
      this.sealForm.reset();
    }
    this.showSealDialog = true;
  }

  /**
   * Close seal dialog
   */
  closeSealDialog(): void {
    this.showSealDialog = false;
    this.sealForm.reset();
  }

  /**
   * Seal device
   */
  sealDevice(): void {
    if (this.sealForm.invalid) {
      return;
    }

    this.loading = true;
    const formValue = this.sealForm.value;

    this.sealService.sealDevice({
      deviceId: formValue.deviceId,
      reason: formValue.reason
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('Device sealed successfully:', result);
          this.snackBar.open('Dispositivo sellado exitosamente', 'Cerrar', { duration: 3000 });
          this.closeSealDialog();
          this.loading = false;
          
          // Reload both lists - they will update their respective tabs
          this.loadSealedDevices();
          this.loadUnsealedDevices();
        },
        error: (error) => {
          console.error('Error sealing device:', error);
          this.snackBar.open('Error al sellar dispositivo', 'Cerrar', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  /**
   * Open unseal dialog
   */
  openUnsealDialog(device: SealStatus): void {
    this.selectedDevice = device;
    this.showUnsealDialog = true;
  }

  /**
   * Close unseal dialog
   */
  closeUnsealDialog(): void {
    this.showUnsealDialog = false;
    this.unsealForm.reset();
    this.selectedDevice = null;
  }

  /**
   * Unseal device
   */
  unsealDevice(): void {
    if (this.unsealForm.invalid || !this.selectedDevice) {
      return;
    }

    this.loading = true;
    const formValue = this.unsealForm.value;

    this.sealService.unsealDevice({
      deviceId: this.selectedDevice.deviceId,
      reason: formValue.reason
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('Device unsealed successfully:', result);
          this.snackBar.open('Dispositivo desellado exitosamente', 'Cerrar', { duration: 3000 });
          this.closeUnsealDialog();
          this.loading = false;
          
          // Reload both lists - they will update their respective tabs
          this.loadSealedDevices();
          this.loadUnsealedDevices();
        },
        error: (error) => {
          console.error('Error unsealing device:', error);
          this.snackBar.open('Error al dessellar dispositivo', 'Cerrar', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  /**
   * Verify seal integrity
   */
  verifySeal(device: SealStatus): void {
    this.loading = true;
    this.selectedDevice = device;

    this.sealService.verifySeal(device.deviceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('Seal verification result:', result);
          this.verificationResult = result;
          // Show verification result in a dialog
          this.showVerificationDialog();
          this.loadSealedDevices();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error verifying seal:', error);
          this.snackBar.open('Error al verificar integridad del sello', 'Cerrar', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  /**
   * Show verification result modal
   */
  showVerificationDialog(): void {
    this.showVerificationModal = true;
  }

  /**
   * Close verification modal
   */
  closeVerificationModal(): void {
    this.showVerificationModal = false;
    this.verificationResult = null;
  }

  /**
   * View seal history
   */
  viewHistory(device: SealStatus): void {
    this.selectedDevice = device;
    this.loading = true;

    this.sealService.getSealHistory(device.deviceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          console.log('Seal history for device:', device.deviceId, history);
          this.sealHistory = history || [];
          this.showHistoryDialog = true;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading seal history:', error);
          this.snackBar.open('Error al cargar historial del sello', 'Cerrar', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  /**
   * Close history dialog
   */
  closeHistoryDialog(): void {
    this.showHistoryDialog = false;
    this.sealHistory = [];
  }

  /**
   * Get state color
   */
  getStateColor(state: string): string {
    switch (state) {
      case 'SEALED':
        return 'primary';
      case 'UNSEALED':
        return 'accent';
      case 'BROKEN':
        return 'warn';
      default:
        return 'primary';
    }
  }

  /**
   * Get compliance color
   */
  getComplianceColor(status: string): string {
    switch (status) {
      case 'COMPLIANT':
        return 'primary';
      case 'NON_COMPLIANT':
        return 'warn';
      case 'WARNING':
        return 'accent';
      case 'EXPIRED':
        return 'warn';
      default:
        return 'primary';
    }
  }

  /**
   * Get state icon
   */
  getStateIcon(state: string): string {
    switch (state) {
      case 'SEALED':
        return 'lock';
      case 'UNSEALED':
        return 'lock_open';
      case 'BROKEN':
        return 'lock_outline';
      default:
        return 'info';
    }
  }

  /**
   * Get state label (translated)
   */
  getStateLabel(state: string): string {
    switch (state) {
      case 'SEALED':
        return 'Sellado';
      case 'UNSEALED':
        return 'Sin Sellar';
      case 'BROKEN':
        return 'Roto';
      default:
        return state;
    }
  }

  /**
   * Get compliance status label (translated)
   */
  getComplianceLabel(status: string): string {
    switch (status) {
      case 'COMPLIANT':
        return 'Conforme';
      case 'NON_COMPLIANT':
        return 'No Conforme';
      case 'WARNING':
        return 'Advertencia';
      case 'EXPIRED':
        return 'Expirado';
      default:
        return status;
    }
  }
}
