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

import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Batch, RecalculateBatchRequest } from '../../../shared/models/batch.model';

@Component({
  selector: 'tb-recalculate-batch-dialog',
  templateUrl: './recalculate-batch-dialog.component.html',
  styleUrls: ['./recalculate-batch-dialog.component.scss']
})
export class RecalculateBatchDialogComponent implements OnInit {

  recalculateForm: FormGroup;
  batch: Batch;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RecalculateBatchDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { batch: Batch }
  ) {
    this.batch = data.batch;
  }

  ngOnInit() {
    this.recalculateForm = this.fb.group({
      // Opening values
      openingApiGravity: [this.batch.opening.apiGravity, [Validators.min(0), Validators.max(100)]],
      openingTemperature: [this.batch.opening.temperature],
      
      // Closing values (if exists)
      closingApiGravity: [this.batch.closing?.apiGravity, [Validators.min(0), Validators.max(100)]],
      closingTemperature: [this.batch.closing?.temperature],
      
      // Additional info
      reason: ['', Validators.required],
      operator: ['']
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.recalculateForm.valid) {
      const formValue = this.recalculateForm.value;
      
      const request: RecalculateBatchRequest = {
        batchId: this.batch.id,
        openingApiGravity: formValue.openingApiGravity,
        openingTemperature: formValue.openingTemperature,
        closingApiGravity: formValue.closingApiGravity,
        closingTemperature: formValue.closingTemperature,
        reason: formValue.reason,
        operator: formValue.operator
      };

      this.dialogRef.close(request);
    }
  }
}
