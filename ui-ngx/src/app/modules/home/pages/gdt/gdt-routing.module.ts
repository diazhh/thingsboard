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
import { GdtDashboardComponent } from './dashboard/gdt-dashboard.component';
import { TankMonitoringComponent } from './tank-monitoring/tank-monitoring.component';
import { TankConfigurationStaticComponent } from './tank-configuration/tank-configuration-static.component';
import { GdtUserManagementComponent } from './user-management/user-management.component';
import { GatewayConfigurationComponent } from './gateway-configuration/gateway-configuration.component';
import { AforoManualComponent } from './aforo-manual/aforo-manual.component';
import { LaboratorioComponent } from './laboratorio/laboratorio.component';
import { BatchManagementComponent } from './batch-management/batch-management.component';
import { ReportsComponent } from './reports/reports.component';
import { ScheduledReportsComponent } from './reports/components/scheduled-reports/scheduled-reports.component';
import { HistoricalTrendsComponent } from './historical-trends/historical-trends.component';
import { EventLogViewerComponent } from './audit/event-log-viewer/event-log-viewer.component';
import { SealManagementComponent } from './audit/seal-management/seal-management.component';

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
        path: 'dashboard',
        component: GdtDashboardComponent,
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
          title: 'gdt.dashboard',
          breadcrumb: {
            menuId: 'gdt_dashboard' as any,
            label: 'Panel Principal',
            icon: 'dashboard'
          }
        }
      },
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
        path: 'gateway',
        component: GatewayConfigurationComponent,
        data: {
          auth: [Authority.TENANT_ADMIN, Authority.INGENIERO],
          title: 'gdt.gateway-configuration',
          breadcrumb: {
            menuId: 'gdt_gateway_configuration' as any,
            label: 'Configuración Gateway',
            icon: 'router'
          }
        }
      },
      {
        path: 'aforo-manual',
        component: AforoManualComponent,
        data: {
          auth: [
            Authority.SYS_ADMIN,
            Authority.TENANT_ADMIN,
            Authority.CUSTOMER_USER,
            Authority.OPERADOR,
            Authority.INGENIERO,
            Authority.LABORATORIO
          ],
          title: 'gdt.aforo-manual',
          breadcrumb: {
            menuId: 'gdt_aforo_manual' as any,
            label: 'Aforo Manual',
            icon: 'edit'
          }
        }
      },
      {
        path: 'laboratorio',
        component: LaboratorioComponent,
        data: {
          auth: [
            Authority.SYS_ADMIN,
            Authority.TENANT_ADMIN,
            Authority.CUSTOMER_USER,
            Authority.LABORATORIO
          ],
          title: 'gdt.laboratorio',
          breadcrumb: {
            menuId: 'gdt_laboratorio' as any,
            label: 'Laboratorio',
            icon: 'science'
          }
        }
      },
      {
        path: 'batches',
        component: BatchManagementComponent,
        data: {
          auth: [
            Authority.SYS_ADMIN,
            Authority.TENANT_ADMIN,
            Authority.INGENIERO
          ],
          title: 'gdt.batch-management',
          breadcrumb: {
            menuId: 'gdt_batch_management' as any,
            label: 'Gestión de Batches',
            icon: 'inventory_2'
          }
        }
      },
      {
        path: 'reports',
        component: ReportsComponent,
        data: {
          auth: [
            Authority.SYS_ADMIN,
            Authority.TENANT_ADMIN,
            Authority.INGENIERO,
            Authority.REPORTES
          ],
          title: 'gdt.reports',
          breadcrumb: {
            menuId: 'gdt_reports' as any,
            label: 'Reports & Analytics',
            icon: 'assessment'
          }
        }
      },
      {
        path: 'scheduled-reports',
        component: ScheduledReportsComponent,
        data: {
          auth: [
            Authority.SYS_ADMIN,
            Authority.TENANT_ADMIN,
            Authority.INGENIERO,
            Authority.REPORTES
          ],
          title: 'gdt.scheduled-reports',
          breadcrumb: {
            menuId: 'gdt_scheduled_reports' as any,
            label: 'Reportes Programados',
            icon: 'schedule'
          }
        }
      },
      {
        path: 'historical-trends',
        component: HistoricalTrendsComponent,
        data: {
          auth: [
            Authority.SYS_ADMIN,
            Authority.TENANT_ADMIN,
            Authority.CUSTOMER_USER,
            Authority.INGENIERO,
            Authority.OPERADOR,
            Authority.REPORTES
          ],
          title: 'gdt.historical-trends',
          breadcrumb: {
            menuId: 'gdt_historical_trends' as any,
            label: 'Tendencias Históricas',
            icon: 'trending_up'
          }
        }
      },
      {
        path: 'audit/event-log-viewer',
        component: EventLogViewerComponent,
        data: {
          auth: [Authority.SYS_ADMIN, Authority.TENANT_ADMIN, Authority.INGENIERO],
          title: 'gdt.event-log-viewer',
          breadcrumb: {
            menuId: 'gdt_event_log_viewer' as any,
            label: 'Visor de Eventos',
            icon: 'history'
          }
        }
      },
      {
        path: 'audit/seal-management',
        component: SealManagementComponent,
        data: {
          auth: [Authority.SYS_ADMIN, Authority.TENANT_ADMIN, Authority.INGENIERO],
          title: 'gdt.seal-management',
          breadcrumb: {
            menuId: 'gdt_seal_management' as any,
            label: 'Gestión de Sellado',
            icon: 'lock'
          }
        }
      },
      {
        path: '',
        redirectTo: 'dashboard',
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
