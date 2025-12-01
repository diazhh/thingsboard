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
import { MenuId } from '@core/services/menu.models';
import { TankMonitoringComponent } from './tank-monitoring/tank-monitoring.component';
import { TankConfigurationStaticComponent } from './tank-configuration/tank-configuration-static.component';
import { GdtUserManagementComponent } from './user-management/user-management.component';

const routes: Routes = [
  {
    path: 'gdt',
    data: {
      auth: [
        Authority.SYS_ADMIN,
        Authority.TENANT_ADMIN,
        Authority.CUSTOMER_USER,
        Authority.OPERADOR,
        Authority.INGENIERO,
        Authority.REPORTES,
        Authority.LABORATORIO
      ],
      breadcrumb: {
        label: 'Guardian de Tanques',
        icon: 'mdi:tank'
      }
    },
    children: [
      {
        path: 'monitoring',
        component: TankMonitoringComponent,
        data: {
          auth: [
            Authority.SYS_ADMIN,
            Authority.TENANT_ADMIN,
            Authority.CUSTOMER_USER,
            Authority.OPERADOR,
            Authority.INGENIERO,
            Authority.REPORTES,
            Authority.LABORATORIO
          ],
          title: 'gdt.tank-monitoring',
          breadcrumb: {
            menuId: 'gdt_tank_monitoring' as any,
            label: 'Monitoreo de Tanques',
            icon: 'mdi:gauge'
          }
        }
      },
      {
        path: 'configuration',
        component: TankConfigurationStaticComponent,
        data: {
          auth: [Authority.TENANT_ADMIN, Authority.INGENIERO],
          title: 'gdt.tank-configuration',
          breadcrumb: {
            menuId: 'gdt_tank_configuration' as any,
            label: 'Configuración de Tanques',
            icon: 'settings'
          }
        }
      },
      {
        path: 'users',
        component: GdtUserManagementComponent,
        data: {
          auth: [Authority.TENANT_ADMIN, Authority.INGENIERO],
          title: 'gdt.user-management',
          breadcrumb: {
            menuId: 'gdt_user_management' as any,
            label: 'Gestión de Usuarios',
            icon: 'group'
          }
        }
      },
      {
        path: '',
        redirectTo: 'monitoring',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GdtRoutingModule { }
