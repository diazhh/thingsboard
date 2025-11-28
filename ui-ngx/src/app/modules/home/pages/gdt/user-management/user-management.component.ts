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

import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { getCurrentAuthState } from '@core/auth/auth.selectors';
import { UserService } from '@core/http/user.service';
import { User } from '@shared/models/user.model';
import { Authority } from '@shared/models/authority.enum';
import { PageLink } from '@shared/models/page/page-link';
import { ActionNotificationShow } from '@core/notification/notification.actions';
import { TranslateService } from '@ngx-translate/core';
import { DialogService } from '@core/services/dialog.service';
import { AddTenantUserDialogComponent, AddTenantUserDialogData } from './add-tenant-user-dialog.component';
import { ActivationLinkDialogComponent, ActivationLinkDialogData } from '@modules/home/pages/user/activation-link-dialog.component';

@Component({
  selector: 'tb-gdt-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class GdtUserManagementComponent implements OnInit {

  displayedColumns: string[] = ['email', 'firstName', 'lastName', 'authority', 'status', 'actions'];
  dataSource = new MatTableDataSource<User>([]);
  
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  isLoading = false;
  tenantId: string;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  // Roles disponibles para usuarios del tenant (excluyendo SYS_ADMIN y tokens)
  availableRoles = [
    { value: Authority.TENANT_ADMIN, label: 'Administrador Tenant' },
    { value: Authority.INGENIERO, label: 'Ingeniero' },
    { value: Authority.OPERADOR, label: 'Operador' },
    { value: Authority.REPORTES, label: 'Reportes' },
    { value: Authority.LABORATORIO, label: 'Laboratorio' }
  ];

  constructor(
    private store: Store<AppState>,
    private userService: UserService,
    private dialog: MatDialog,
    private dialogService: DialogService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const authState = getCurrentAuthState(this.store);
    this.tenantId = authState.authUser.tenantId;
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUsers(): void {
    this.isLoading = true;
    const pageLink = new PageLink(this.pageSize, this.pageIndex);
    
    // Use getUsers() which returns users for the current tenant context
    this.userService.getUsers(pageLink).subscribe({
      next: (pageData) => {
        this.dataSource.data = pageData.data;
        this.totalElements = pageData.totalElements;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading users:', err);
        this.store.dispatch(new ActionNotificationShow({
          message: 'Error al cargar usuarios',
          type: 'error'
        }));
      }
    });
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  addUser(): void {
    this.dialog.open<AddTenantUserDialogComponent, AddTenantUserDialogData, User>(
      AddTenantUserDialogComponent, {
        disableClose: true,
        panelClass: ['tb-dialog', 'tb-fullscreen-dialog'],
        data: {
          tenantId: this.tenantId,
          availableRoles: this.availableRoles
        }
      }
    ).afterClosed().subscribe((user) => {
      if (user) {
        this.loadUsers();
        this.store.dispatch(new ActionNotificationShow({
          message: 'Usuario creado exitosamente',
          type: 'success'
        }));
      }
    });
  }

  editUser(user: User): void {
    // Navegar a la edición del usuario o abrir diálogo de edición
    // Por ahora solo recargamos
    this.loadUsers();
  }

  deleteUser(user: User): void {
    this.dialogService.confirm(
      'Confirmar eliminación',
      `¿Está seguro de eliminar al usuario ${user.email}?`
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.userService.deleteUser(user.id.id).subscribe({
          next: () => {
            this.loadUsers();
            this.store.dispatch(new ActionNotificationShow({
              message: 'Usuario eliminado exitosamente',
              type: 'success'
            }));
          },
          error: () => {
            this.store.dispatch(new ActionNotificationShow({
              message: 'Error al eliminar usuario',
              type: 'error'
            }));
          }
        });
      }
    });
  }

  displayActivationLink(user: User): void {
    this.userService.getActivationLinkInfo(user.id.id).subscribe((activationLinkInfo) => {
      this.dialog.open<ActivationLinkDialogComponent, ActivationLinkDialogData, void>(
        ActivationLinkDialogComponent, {
          disableClose: true,
          panelClass: ['tb-dialog', 'tb-fullscreen-dialog'],
          data: { activationLinkInfo }
        }
      );
    });
  }

  resendActivation(user: User): void {
    this.userService.sendActivationEmail(user.email).subscribe(() => {
      this.store.dispatch(new ActionNotificationShow({
        message: 'Email de activación enviado',
        type: 'success'
      }));
    });
  }

  toggleUserStatus(user: User): void {
    const currentEnabled = user.additionalInfo?.userCredentialsEnabled !== false;
    this.userService.setUserCredentialsEnabled(user.id.id, !currentEnabled).subscribe(() => {
      this.loadUsers();
      this.store.dispatch(new ActionNotificationShow({
        message: currentEnabled ? 'Usuario deshabilitado' : 'Usuario habilitado',
        type: 'success'
      }));
    });
  }

  getRoleLabel(authority: Authority): string {
    const role = this.availableRoles.find(r => r.value === authority);
    return role ? role.label : authority;
  }

  getUserStatus(user: User): { label: string; class: string } {
    const activated = user.additionalInfo?.userActivated !== false;
    const enabled = user.additionalInfo?.userCredentialsEnabled !== false;
    
    if (!activated) {
      return { label: 'Pendiente activación', class: 'status-pending' };
    }
    if (!enabled) {
      return { label: 'Deshabilitado', class: 'status-disabled' };
    }
    return { label: 'Activo', class: 'status-active' };
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  isUserActive = (user: User): boolean => {
    return user.additionalInfo?.userActivated !== false && 
           user.additionalInfo?.userCredentialsEnabled !== false;
  }

  isUserPending = (user: User): boolean => {
    return user.additionalInfo?.userActivated === false;
  }

  getActiveUsersCount(): number {
    return this.dataSource.data.filter(user => this.isUserActive(user)).length;
  }

  getPendingUsersCount(): number {
    return this.dataSource.data.filter(user => this.isUserPending(user)).length;
  }
}
