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

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoleService } from '@core/http/role.service';
import { Role, Permission, ResourceType, OperationType } from '@shared/models/role.models';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActionNotificationShow } from '@core/notification/notification.actions';
import { PermissionId } from '@shared/models/id/permission-id';
import { RoleId } from '@shared/models/id/role-id';

interface PermissionMatrix {
  [resource: string]: {
    [operation: string]: boolean;
  };
}

@Component({
  selector: 'tb-role-permissions',
  templateUrl: './role-permissions.component.html',
  styleUrls: ['./role-permissions.component.scss']
})
export class RolePermissionsComponent extends PageComponent implements OnInit {

  role: Role;
  roleId: string;
  permissions: Permission[] = [];
  permissionMatrix: PermissionMatrix = {};
  resources = Object.values(ResourceType);
  operations = Object.values(OperationType);
  isLoading = false;
  isSaving = false;

  constructor(
    protected store: Store<AppState>,
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RoleService,
    private translate: TranslateService,
    private dialog: MatDialog
  ) {
    super(store);
  }

  ngOnInit() {
    this.roleId = this.route.snapshot.params.roleId;
    this.loadRoleAndPermissions();
  }

  loadRoleAndPermissions() {
    this.isLoading = true;
    forkJoin([
      this.roleService.getRole(this.roleId),
      this.roleService.getRolePermissions(this.roleId)
    ]).subscribe(
      ([role, permissions]) => {
        this.role = role;
        this.permissions = permissions;
        this.buildPermissionMatrix();
        this.isLoading = false;
      },
      () => {
        this.isLoading = false;
        this.showError('role.failed-to-load-permissions');
      }
    );
  }

  buildPermissionMatrix() {
    this.permissionMatrix = {};

    // Initialize matrix with false values
    this.resources.forEach(resource => {
      this.permissionMatrix[resource] = {};
      this.operations.forEach(operation => {
        this.permissionMatrix[resource][operation] = false;
      });
    });

    // Set existing permissions to true
    this.permissions.forEach(permission => {
      if (this.permissionMatrix[permission.resource]) {
        this.permissionMatrix[permission.resource][permission.operation] = true;
      }
    });
  }

  togglePermission(resource: string, operation: string) {
    this.permissionMatrix[resource][operation] = !this.permissionMatrix[resource][operation];
  }

  toggleResource(resource: string) {
    const allEnabled = this.operations.every(op => this.permissionMatrix[resource][op]);
    this.operations.forEach(operation => {
      this.permissionMatrix[resource][operation] = !allEnabled;
    });
  }

  toggleOperation(operation: string) {
    const allEnabled = this.resources.every(res => this.permissionMatrix[res][operation]);
    this.resources.forEach(resource => {
      this.permissionMatrix[resource][operation] = !allEnabled;
    });
  }

  isResourceFullyEnabled(resource: string): boolean {
    return this.operations.every(op => this.permissionMatrix[resource][op]);
  }

  isOperationFullyEnabled(operation: string): boolean {
    return this.resources.every(res => this.permissionMatrix[res][operation]);
  }

  isOperationPartiallyEnabled(operation: string): boolean {
    return !this.isOperationFullyEnabled(operation) &&
           this.resources.some(res => this.permissionMatrix[res] && this.permissionMatrix[res][operation]);
  }

  isResourcePartiallyEnabled(resource: string): boolean {
    return !this.isResourceFullyEnabled(resource) &&
           this.operations.some(op => this.permissionMatrix[resource] && this.permissionMatrix[resource][op]);
  }

  savePermissions() {
    this.isSaving = true;

    // Collect new permissions from matrix
    const newPermissions: Permission[] = [];
    this.resources.forEach(resource => {
      this.operations.forEach(operation => {
        if (this.permissionMatrix[resource][operation]) {
          const permission: Permission = {
            roleId: new RoleId(this.roleId),
            resource,
            operation
          };
          newPermissions.push(permission);
        }
      });
    });

    // Delete all existing permissions first, then save new ones
    this.roleService.deleteRolePermissions(this.roleId).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      if (newPermissions.length > 0) {
        const saveRequests = newPermissions.map(permission =>
          this.roleService.savePermission(permission).pipe(
            catchError(() => of(null))
          )
        );

        forkJoin(saveRequests).subscribe(
          () => {
            this.isSaving = false;
            this.showSuccess('role.permissions-updated');
            this.loadRoleAndPermissions();
          },
          () => {
            this.isSaving = false;
            this.showError('role.failed-to-save-permissions');
          }
        );
      } else {
        this.isSaving = false;
        this.showSuccess('role.permissions-updated');
        this.loadRoleAndPermissions();
      }
    });
  }

  cancel() {
    this.router.navigate(['/security/roles']);
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
