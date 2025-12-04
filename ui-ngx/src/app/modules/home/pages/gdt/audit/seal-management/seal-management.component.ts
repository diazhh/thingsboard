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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Seal Status Model
 */
export interface SealStatus {
  deviceId: string;
  deviceName: string;
  state: 'SEALED' | 'UNSEALED' | 'BROKEN';
  sealedAt?: Date;
  sealedBy?: string;
  sealReason?: string;
  lastVerifiedAt?: Date;
  configurationChanges: number;
  dataModifications: number;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING' | 'EXPIRED';
}

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
  displayedColumns: string[] = [
    'deviceName',
    'state',
    'sealedBy',
    'sealedAt',
    'complianceStatus',
    'configurationChanges',
    'dataModifications',
    'actions'
  ];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  // UI State
  loading = false;
  selectedTab = 0;
  showSealDialog = false;
  showUnsealDialog = false;
  selectedDevice: SealStatus | null = null;

  // Available devices (mock data)
  availableDevices = [
    { id: 'device1', name: 'Radar Tank 01' },
    { id: 'device2', name: 'Radar Tank 02' },
    { id: 'device3', name: 'Radar Tank 03' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog
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
    this.loading = true;

    // TODO: Call SealManagementService
    // For now, use mock data
    this.sealedDevices = [
      {
        deviceId: 'device1',
        deviceName: 'Radar Tank 01',
        state: 'SEALED',
        sealedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        sealedBy: 'Admin User',
        sealReason: 'Compliance verification',
        lastVerifiedAt: new Date(),
        configurationChanges: 0,
        dataModifications: 0,
        complianceStatus: 'COMPLIANT'
      }
    ];

    this.updateDataSource();
    this.loading = false;
  }

  /**
   * Load unsealed devices
   */
  loadUnsealedDevices(): void {
    this.unsealedDevices = [
      {
        deviceId: 'device2',
        deviceName: 'Radar Tank 02',
        state: 'UNSEALED',
        configurationChanges: 0,
        dataModifications: 0,
        complianceStatus: 'COMPLIANT'
      },
      {
        deviceId: 'device3',
        deviceName: 'Radar Tank 03',
        state: 'UNSEALED',
        configurationChanges: 0,
        dataModifications: 0,
        complianceStatus: 'COMPLIANT'
      }
    ];

    this.updateDataSource();
  }

  /**
   * Update data source based on selected tab
   */
  private updateDataSource(): void {
    const data = this.selectedTab === 0 ? this.sealedDevices : this.unsealedDevices;
    this.dataSource.data = data;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Handle tab change
   */
  onTabChange(event: any): void {
    this.selectedTab = event.index;
    this.updateDataSource();
  }

  /**
   * Open seal dialog
   */
  openSealDialog(): void {
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

    // TODO: Call SealManagementService.sealDevice()
    console.log('Sealing device:', formValue);

    // Simulate API call
    setTimeout(() => {
      this.loadSealedDevices();
      this.loadUnsealedDevices();
      this.closeSealDialog();
      this.loading = false;
    }, 1000);
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

    // TODO: Call SealManagementService.unsealDevice()
    console.log('Unsealing device:', this.selectedDevice.deviceId, formValue);

    // Simulate API call
    setTimeout(() => {
      this.loadSealedDevices();
      this.loadUnsealedDevices();
      this.closeUnsealDialog();
      this.loading = false;
    }, 1000);
  }

  /**
   * Verify seal integrity
   */
  verifySeal(device: SealStatus): void {
    this.loading = true;

    // TODO: Call SealManagementService.verifySealIntegrity()
    console.log('Verifying seal for device:', device.deviceId);

    // Simulate API call
    setTimeout(() => {
      alert('Seal verification completed. Status: ' + device.complianceStatus);
      this.loading = false;
    }, 1000);
  }

  /**
   * View seal history
   */
  viewHistory(device: SealStatus): void {
    // TODO: Open dialog with seal history
    console.log('Viewing history for device:', device.deviceId);
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
}
