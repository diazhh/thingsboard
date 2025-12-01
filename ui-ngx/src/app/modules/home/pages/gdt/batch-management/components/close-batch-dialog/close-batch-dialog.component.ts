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
import { Batch, CloseBatchRequest } from '../../../shared/models/batch.model';

@Component({
  selector: 'tb-close-batch-dialog',
  templateUrl: './close-batch-dialog.component.html',
  styleUrls: ['./close-batch-dialog.component.scss']
})
export class CloseBatchDialogComponent implements OnInit {

  closeBatchForm: FormGroup;
  batch: Batch;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CloseBatchDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { batch: Batch }
  ) {
    this.batch = data.batch;
  }

  ngOnInit() {
    this.closeBatchForm = this.fb.group({
      // Closing gauge data
      closingLevel: [null, [Validators.required, Validators.min(0)]],
      closingTemperature: [null, [Validators.required]],
      closingApiGravity: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      closingBsw: [0, [Validators.min(0), Validators.max(100)]],
      
      // Additional info
      operator: [''],
      notes: ['']
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.closeBatchForm.valid) {
      const formValue = this.closeBatchForm.value;
      
      const request: CloseBatchRequest = {
        batchId: this.batch.id,
        closingLevel: formValue.closingLevel,
        closingTemperature: formValue.closingTemperature,
        closingApiGravity: formValue.closingApiGravity,
        closingBsw: formValue.closingBsw,
        operator: formValue.operator,
        notes: formValue.notes
      };

      this.dialogRef.close(request);
    }
  }
}
