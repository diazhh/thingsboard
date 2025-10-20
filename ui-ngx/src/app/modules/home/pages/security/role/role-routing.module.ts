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

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Authority } from '@shared/models/authority.enum';
import { EntitiesTableComponent } from '@home/components/entity/entities-table.component';
import { EntityDetailsPageComponent } from '@home/components/entity/entity-details-page.component';
import { ConfirmOnExitGuard } from '@core/guards/confirm-on-exit.guard';
import { entityDetailsPageBreadcrumbLabelFunction } from '@home/pages/home-pages.models';
import { BreadCrumbConfig } from '@shared/components/breadcrumb';
import { RolesTableConfigResolver } from './roles-table-config.resolver';
import { RolePermissionsComponent } from './role-permissions.component';
import { RoleUsersComponent } from './role-users.component';

const routes: Routes = [
  {
    path: 'roles',
    data: {
      auth: [Authority.SYS_ADMIN, Authority.TENANT_ADMIN],
      breadcrumb: {
        label: 'role.roles',
        icon: 'mdi:shield-account'
      }
    },
    children: [
      {
        path: '',
        component: EntitiesTableComponent,
        data: {
          auth: [Authority.SYS_ADMIN, Authority.TENANT_ADMIN],
          title: 'role.roles'
        },
        resolve: {
          entitiesTableConfig: RolesTableConfigResolver
        }
      },
      {
        path: ':entityId',
        component: EntityDetailsPageComponent,
        canDeactivate: [ConfirmOnExitGuard],
        data: {
          breadcrumb: {
            labelFunction: entityDetailsPageBreadcrumbLabelFunction,
            icon: 'mdi:shield-account'
          } as BreadCrumbConfig<EntityDetailsPageComponent>,
          auth: [Authority.SYS_ADMIN, Authority.TENANT_ADMIN],
          title: 'role.role'
        },
        resolve: {
          entitiesTableConfig: RolesTableConfigResolver
        }
      },
      {
        path: ':roleId/permissions',
        component: RolePermissionsComponent,
        data: {
          breadcrumb: {
            label: 'role.permissions',
            icon: 'mdi:shield-lock-outline'
          },
          auth: [Authority.SYS_ADMIN, Authority.TENANT_ADMIN],
          title: 'role.manage-permissions'
        }
      },
      {
        path: ':roleId/users',
        component: RoleUsersComponent,
        data: {
          breadcrumb: {
            label: 'role.users',
            icon: 'mdi:account-multiple'
          },
          auth: [Authority.SYS_ADMIN, Authority.TENANT_ADMIN],
          title: 'role.role-users'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [
    RolesTableConfigResolver
  ]
})
export class RoleRoutingModule { }
