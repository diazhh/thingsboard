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
import { UserService } from '@core/http/user.service';
import { User } from '@shared/models/user.model';
import { PageLink } from '@shared/models/page/page-link';

export interface AssignUserDialogData {
  roleId: string;
  roleName: string;
}

@Component({
  selector: 'tb-assign-user-dialog',
  templateUrl: './assign-user-dialog.component.html',
  styleUrls: ['./assign-user-dialog.component.scss']
})
export class AssignUserDialogComponent implements OnInit {

  formGroup: UntypedFormGroup;
  users: User[] = [];
  isLoading = false;
  searchText = '';

  constructor(
    protected dialogRef: MatDialogRef<AssignUserDialogComponent, string>,
    @Inject(MAT_DIALOG_DATA) public data: AssignUserDialogData,
    private fb: UntypedFormBuilder,
    private userService: UserService
  ) {
    this.formGroup = this.fb.group({
      userId: [null, [Validators.required]]
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    const pageLink = new PageLink(100, 0, this.searchText);

    this.userService.getUsers(pageLink).subscribe(
      pageData => {
        this.users = pageData.data;
        this.isLoading = false;
      },
      () => {
        this.isLoading = false;
      }
    );
  }

  onSearchChange() {
    this.loadUsers();
  }

  cancel() {
    this.dialogRef.close(null);
  }

  assign() {
    if (this.formGroup.invalid) {
      return;
    }
    this.dialogRef.close(this.formGroup.get('userId').value);
  }

  getUserDisplayName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName} (${user.email})`;
    } else if (user.firstName) {
      return `${user.firstName} (${user.email})`;
    } else {
      return user.email;
    }
  }
}
