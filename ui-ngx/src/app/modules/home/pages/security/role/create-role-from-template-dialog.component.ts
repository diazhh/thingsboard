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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { RoleService } from '@core/http/role.service';
import { RoleTemplate, Role } from '@shared/models/role.models';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { ActionNotificationShow } from '@core/notification/notification.actions';
import { TranslateService } from '@ngx-translate/core';

export interface CreateRoleFromTemplateDialogData {
}

@Component({
  selector: 'tb-create-role-from-template-dialog',
  templateUrl: './create-role-from-template-dialog.component.html',
  styleUrls: ['./create-role-from-template-dialog.component.scss']
})
export class CreateRoleFromTemplateDialogComponent implements OnInit {

  formGroup: UntypedFormGroup;
  templates: RoleTemplate[] = [];
  isLoading = false;
  selectedTemplate: RoleTemplate = null;

  constructor(
    protected store: Store<AppState>,
    protected dialogRef: MatDialogRef<CreateRoleFromTemplateDialogComponent, Role>,
    @Inject(MAT_DIALOG_DATA) public data: CreateRoleFromTemplateDialogData,
    private fb: UntypedFormBuilder,
    private roleService: RoleService,
    private translate: TranslateService
  ) {
    this.formGroup = this.fb.group({
      templateId: [null, [Validators.required]],
      roleName: ['', [Validators.required, Validators.maxLength(255)]]
    });
  }

  ngOnInit() {
    this.loadTemplates();

    this.formGroup.get('templateId').valueChanges.subscribe(templateId => {
      this.selectedTemplate = this.templates.find(t => t.id.id === templateId);
      if (this.selectedTemplate && !this.formGroup.get('roleName').value) {
        this.formGroup.patchValue({ roleName: this.selectedTemplate.name });
      }
    });
  }

  loadTemplates() {
    this.isLoading = true;
    this.roleService.getRoleTemplates().subscribe(
      templates => {
        this.templates = templates;
        this.isLoading = false;
      },
      () => {
        this.isLoading = false;
        this.showError('role.failed-to-load-templates');
      }
    );
  }

  cancel() {
    this.dialogRef.close(null);
  }

  create() {
    if (this.formGroup.invalid) {
      return;
    }

    this.isLoading = true;
    const templateId = this.formGroup.get('templateId').value;
    const roleName = this.formGroup.get('roleName').value;

    this.roleService.createRoleFromTemplate(templateId, roleName).subscribe(
      role => {
        this.isLoading = false;
        this.showSuccess('role.role-created-from-template');
        this.dialogRef.close(role);
      },
      () => {
        this.isLoading = false;
        this.showError('role.failed-to-create-role-from-template');
      }
    );
  }

  private showSuccess(messageKey: string) {
    this.store.dispatch(new ActionNotificationShow({
      message: this.translate.instant(messageKey),
      type: 'success',
      duration: 2000,
      verticalPosition: 'top',
      horizontalPosition: 'right'
    }));
  }

  private showError(messageKey: string) {
    this.store.dispatch(new ActionNotificationShow({
      message: this.translate.instant(messageKey),
      type: 'error',
      duration: 3000,
      verticalPosition: 'top',
      horizontalPosition: 'right'
    }));
  }
}
