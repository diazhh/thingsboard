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

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import {
  DateEntityTableColumn,
  EntityTableColumn,
  EntityTableConfig
} from '@home/models/entity/entities-table-config.models';
import { TranslateService } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { EntityType, entityTypeResources, entityTypeTranslations } from '@shared/models/entity-type.models';
import { Role } from '@shared/models/role.models';
import { RoleService } from '@core/http/role.service';
import { RoleComponent } from '@modules/home/pages/security/role/role.component';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { EntityAction } from '@home/models/entity/entity-component.models';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { map } from 'rxjs/operators';
import { RoleId } from '@shared/models/id/role-id';
import {
  CreateRoleFromTemplateDialogComponent,
  CreateRoleFromTemplateDialogData
} from './create-role-from-template-dialog.component';

@Injectable()
export class RolesTableConfigResolver {

  private readonly config: EntityTableConfig<Role> = new EntityTableConfig<Role>();

  constructor(
    private store: Store<AppState>,
    private roleService: RoleService,
    private translate: TranslateService,
    private datePipe: DatePipe,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.config.entityType = EntityType.ROLE;
    this.config.entityComponent = RoleComponent;
    this.config.entityTranslations = entityTypeTranslations.get(EntityType.ROLE);
    this.config.entityResources = entityTypeResources.get(EntityType.ROLE);

    const systemRoleColumn = new EntityTableColumn<Role>('systemRole', 'role.system-role', '120px');
    systemRoleColumn.cellContentFunction = (role) => role.systemRole ? '✓' : '';

    this.config.columns.push(
      new DateEntityTableColumn<Role>('createdTime', 'common.created-time', this.datePipe, '150px'),
      new EntityTableColumn<Role>('name', 'role.name', '30%'),
      new EntityTableColumn<Role>('description', 'role.description', '50%'),
      systemRoleColumn
    );

    this.config.deleteEnabled = role => role && !role.systemRole;
    this.config.deleteEntityTitle = role => this.translate.instant('role.delete-role-title', { roleName: role.name });
    this.config.deleteEntityContent = () => this.translate.instant('role.delete-role-text');
    this.config.deleteEntitiesTitle = count => this.translate.instant('role.delete-roles-title', { count });
    this.config.deleteEntitiesContent = () => this.translate.instant('role.delete-roles-text');

    this.config.loadEntity = id => this.roleService.getRole(id.id);
    this.config.saveEntity = role => this.roleService.saveRole(role);
    this.config.deleteEntity = id => this.roleService.deleteRole(id.id);
    this.config.onEntityAction = action => this.onRoleAction(action);
    this.config.entitiesFetchFunction = pageLink => this.roleService.getRoles(pageLink);

    this.config.addEnabled = true;
    this.config.detailsPanelEnabled = true;
    this.config.entitySelectionEnabled = entity => !entity.systemRole;

    this.config.headerActionDescriptors.push(
      {
        name: this.translate.instant('role.create-from-template'),
        icon: 'mdi:content-copy',
        isEnabled: () => true,
        onAction: () => this.createRoleFromTemplate()
      }
    );

    this.config.cellActionDescriptors.push(
      {
        name: this.translate.instant('role.manage-permissions'),
        icon: 'mdi:shield-lock-outline',
        isEnabled: () => true,
        onAction: ($event, entity) => this.managePermissions($event, entity)
      },
      {
        name: this.translate.instant('role.view-users'),
        icon: 'mdi:account-multiple',
        isEnabled: () => true,
        onAction: ($event, entity) => this.viewRoleUsers($event, entity)
      }
    );
  }

  resolve(route: ActivatedRouteSnapshot): Observable<EntityTableConfig<Role>> {
    this.config.tableTitle = this.translate.instant('role.roles');
    return new Observable(observer => {
      observer.next(this.config);
      observer.complete();
    });
  }

  private createRoleFromTemplate(): Observable<Role> {
    return this.dialog.open<CreateRoleFromTemplateDialogComponent, CreateRoleFromTemplateDialogData, Role>(
      CreateRoleFromTemplateDialogComponent, {
        disableClose: true,
        panelClass: ['tb-dialog', 'tb-fullscreen-dialog'],
        data: {}
      }
    ).afterClosed();
  }

  private managePermissions($event: Event, role: Role) {
    if ($event) {
      $event.stopPropagation();
    }
    const url = this.router.createUrlTree(['/security/roles', role.id.id, 'permissions']);
    this.router.navigateByUrl(url);
  }

  private viewRoleUsers($event: Event, role: Role) {
    if ($event) {
      $event.stopPropagation();
    }
    const url = this.router.createUrlTree(['/security/roles', role.id.id, 'users']);
    this.router.navigateByUrl(url);
  }

  private onRoleAction(action: EntityAction<Role>): boolean {
    switch (action.action) {
      case 'managePermissions':
        this.managePermissions(action.event, action.entity);
        return true;
      case 'viewUsers':
        this.viewRoleUsers(action.event, action.entity);
        return true;
    }
    return false;
  }
}
