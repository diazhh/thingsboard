///
/// Copyright © 2016-2025 The Thingsboard Authors
///

import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

import {
  DiscoveredDevice,
  getDeviceTypeLabel,
  getDeviceTypeIcon
} from '../../../shared/models/device-discovery.model';
import { ProvisionDeviceDialogComponent } from '../provision-device-dialog/provision-device-dialog.component';

@Component({
  selector: 'tb-discovery-results-table',
  templateUrl: './discovery-results-table.component.html',
  styleUrls: ['./discovery-results-table.component.scss']
})
export class DiscoveryResultsTableComponent implements OnInit {

  @Input() devices: DiscoveredDevice[] = [];

  displayedColumns: string[] = ['address', 'type', 'baudrate', 'manufacturer', 'model', 'response_time', 'actions'];
  dataSource = new MatTableDataSource<DiscoveredDevice>([]);

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    this.dataSource.data = this.devices;
  }

  ngOnChanges(): void {
    this.dataSource.data = this.devices;
  }

  getDeviceTypeLabel(type: string): string {
    return getDeviceTypeLabel(type as any);
  }

  getDeviceTypeIcon(type: string): string {
    return getDeviceTypeIcon(type as any);
  }

  openProvisionDialog(device: DiscoveredDevice): void {
    this.dialog.open(ProvisionDeviceDialogComponent, {
      width: '600px',
      data: { device }
    });
  }
}
