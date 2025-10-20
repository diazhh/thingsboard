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
import { UserService } from '@core/http/user.service';
import { Role, UserRole } from '@shared/models/role.models';
import { User } from '@shared/models/user.model';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { PageLink } from '@shared/models/page/page-link';
import { PageData } from '@shared/models/page/page-data';
import { ActionNotificationShow } from '@core/notification/notification.actions';
import {
  AssignUserDialogComponent,
  AssignUserDialogData
} from './assign-user-dialog.component';

@Component({
  selector: 'tb-role-users',
  templateUrl: './role-users.component.html',
  styleUrls: ['./role-users.component.scss']
})
export class RoleUsersComponent extends PageComponent implements OnInit {

  role: Role;
  roleId: string;
  userRoles: UserRole[] = [];
  users: User[] = [];
  isLoading = false;
  displayedColumns: string[] = ['email', 'firstName', 'lastName', 'assignedTime', 'actions'];

  pageSize = 10;
  pageIndex = 0;
  totalElements = 0;

  constructor(
    protected store: Store<AppState>,
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RoleService,
    private userService: UserService,
    private translate: TranslateService,
    private dialog: MatDialog
  ) {
    super(store);
  }

  ngOnInit() {
    this.roleId = this.route.snapshot.params.roleId;
    this.loadRole();
    this.loadUsers();
  }

  loadRole() {
    this.roleService.getRole(this.roleId).subscribe(
      role => {
        this.role = role;
      },
      () => {
        this.showError('role.failed-to-load-role');
      }
    );
  }

  loadUsers() {
    this.isLoading = true;
    const pageLink = new PageLink(this.pageSize, this.pageIndex);

    this.roleService.getRoleUsers(this.roleId, pageLink).subscribe(
      (pageData: PageData<UserRole>) => {
        this.userRoles = pageData.data;
        this.totalElements = pageData.totalElements;

        // Load user details for each UserRole
        const userPromises = this.userRoles.map(ur =>
          this.userService.getUser(ur.userId.id).toPromise()
        );

        Promise.all(userPromises).then(users => {
          this.users = users;
          this.isLoading = false;
        }).catch(() => {
          this.isLoading = false;
          this.showError('role.failed-to-load-users');
        });
      },
      () => {
        this.isLoading = false;
        this.showError('role.failed-to-load-users');
      }
    );
  }

  assignUser() {
    this.dialog.open<AssignUserDialogComponent, AssignUserDialogData, string>(
      AssignUserDialogComponent, {
        disableClose: true,
        panelClass: ['tb-dialog', 'tb-fullscreen-dialog'],
        data: {
          roleId: this.roleId,
          roleName: this.role.name
        }
      }
    ).afterClosed().subscribe(userId => {
      if (userId) {
        this.roleService.assignRoleToUser(userId, this.roleId).subscribe(
          () => {
            this.showSuccess('role.user-assigned-successfully');
            this.loadUsers();
          },
          () => {
            this.showError('role.failed-to-assign-user');
          }
        );
      }
    });
  }

  unassignUser(user: User) {
    this.roleService.unassignRoleFromUser(user.id.id, this.roleId).subscribe(
      () => {
        this.showSuccess('role.user-unassigned-successfully');
        this.loadUsers();
      },
      () => {
        this.showError('role.failed-to-unassign-user');
      }
    );
  }

  getUserByIndex(index: number): User {
    return this.users[index];
  }

  getUserRole(index: number): UserRole {
    return this.userRoles[index];
  }

  onPageChange(event: any) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
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
