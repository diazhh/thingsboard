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

import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Batch } from '../../../shared/models/batch.model';

@Component({
  selector: 'tb-batch-detail-dialog',
  templateUrl: './batch-detail-dialog.component.html',
  styleUrls: ['./batch-detail-dialog.component.scss']
})
export class BatchDetailDialogComponent {

  batch: Batch;

  constructor(
    private dialogRef: MatDialogRef<BatchDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { batch: Batch }
  ) {
    this.batch = data.batch;
  }

  close() {
    this.dialogRef.close();
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

  formatNumber(value: number | undefined, decimals: number = 2): string {
    if (value === undefined || value === null) return '-';
    return value.toFixed(decimals);
  }
}
