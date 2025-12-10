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
