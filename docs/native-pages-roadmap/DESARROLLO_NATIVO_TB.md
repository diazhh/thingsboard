# Guía de Desarrollo de Páginas Nativas en ThingsBoard PE

**Fecha:** 1 de diciembre de 2025
**Versión:** 1.0

---

## Índice

1. [Introducción](#introducción)
2. [Arquitectura de Páginas Nativas](#arquitectura-de-páginas-nativas)
3. [Configuración del Proyecto](#configuración-del-proyecto)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [Routing y Navegación](#routing-y-navegación)
6. [Servicios Compartidos](#servicios-compartidos)
7. [Integración con ThingsBoard API](#integración-con-thingsboard-api)
8. [Componentes Reutilizables](#componentes-reutilizables)
9. [Estilos y Temas](#estilos-y-temas)
10. [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

Las páginas nativas de ThingsBoard PE se desarrollan como módulos Angular integrados directamente en la aplicación ThingsBoard, a diferencia de los widgets que se ejecutan en un sandbox limitado.

### Ventajas de Páginas Nativas vs Widgets

| Aspecto | Widgets | Páginas Nativas |
|---------|---------|----------------|
| **Acceso a API** | Limitado a través de ctx | Acceso completo a servicios |
| **Routing** | No disponible | Routing completo de Angular |
| **State Management** | Limitado | RxJS, NgRx completo |
| **Servicios** | Solo inyección básica | Todos los servicios de TB |
| **Seguridad** | Sandbox aislado | Integración completa |
| **Performance** | Limitado | Optimizado |
| **Mantenibilidad** | Compleja | Alta |

---

## Arquitectura de Páginas Nativas

### Ubicación del Código

Las páginas nativas GDT se encuentran en:
```
thingsboard/ui-ngx/src/app/modules/home/pages/gdt/
```

### Módulo GDT

Archivo principal: `gdt.module.ts`

```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@shared/shared.module';
import { GdtRoutingModule } from './gdt-routing.module';

// Componentes de páginas
import { GdtDashboardComponent } from './dashboard/gdt-dashboard.component';
import { TankMonitoringComponent } from './tank-monitoring/tank-monitoring.component';
import { TankConfigurationComponent } from './tank-configuration/tank-configuration.component';
import { GatewayConfigurationComponent } from './gateway-configuration/gateway-configuration.component';
import { UserManagementComponent } from './user-management/user-management.component';

// Servicios compartidos
import { GdtWidgetContextService } from './shared/services/gdt-widget-context.service';
import { TankAssetService } from './shared/services/tank-asset.service';
import { TankTelemetryService } from './shared/services/tank-telemetry.service';
// ... más servicios

@NgModule({
  declarations: [
    GdtDashboardComponent,
    TankMonitoringComponent,
    TankConfigurationComponent,
    GatewayConfigurationComponent,
    UserManagementComponent,
    // ... componentes hijos
  ],
  imports: [
    CommonModule,
    SharedModule, // Módulo compartido de ThingsBoard
    GdtRoutingModule
  ],
  providers: [
    GdtWidgetContextService,
    TankAssetService,
    TankTelemetryService,
    // ... servicios
  ]
})
export class GdtModule { }
```

### Registro del Módulo en ThingsBoard

El módulo GDT debe registrarse en el módulo principal de home:

`thingsboard/ui-ngx/src/app/modules/home/home.module.ts`

```typescript
import { GdtModule } from './pages/gdt/gdt.module';

@NgModule({
  imports: [
    // ... otros módulos
    GdtModule
  ]
})
export class HomeModule { }
```

---

## Configuración del Proyecto

### Requisitos Previos

- Node.js 16+
- Angular CLI 15+
- ThingsBoard PE 3.6+

### Instalación de Dependencias

```bash
cd thingsboard/ui-ngx
npm install
```

### Ejecución en Desarrollo

```bash
npm start
# La aplicación se ejecuta en http://localhost:4200
```

### Build de Producción

```bash
npm run build:prod
```

---

## Estructura de Archivos

### Estructura Estándar de una Página

```
pagina-ejemplo/
├── pagina-ejemplo.component.ts       # Componente principal
├── pagina-ejemplo.component.html     # Template
├── pagina-ejemplo.component.scss     # Estilos
├── components/                       # Componentes hijos
│   ├── sub-componente-1/
│   │   ├── sub-componente-1.component.ts
│   │   ├── sub-componente-1.component.html
│   │   └── sub-componente-1.component.scss
│   └── sub-componente-2/
│       ├── sub-componente-2.component.ts
│       ├── sub-componente-2.component.html
│       └── sub-componente-2.component.scss
├── services/                         # Servicios específicos
│   └── pagina-ejemplo.service.ts
└── models/                          # Modelos de datos
    └── pagina-ejemplo.model.ts
```

### Ejemplo de Componente Página

`aforo-manual/aforo-manual.component.ts`

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Servicios GDT
import { TankAssetService } from '../shared/services/tank-asset.service';
import { ManualTelemetryService } from './services/manual-telemetry.service';

// Modelos
import { TankData } from '../shared/models/tank-data.model';
import { ManualTelemetryEntry } from './models/manual-telemetry.model';

@Component({
  selector: 'tb-aforo-manual',
  templateUrl: './aforo-manual.component.html',
  styleUrls: ['./aforo-manual.component.scss']
})
export class AforoManualComponent extends PageComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  tanks: TankData[] = [];
  selectedTank: TankData | null = null;
  telemetryHistory: ManualTelemetryEntry[] = [];
  loading = false;

  constructor(
    protected store: Store<AppState>,
    private tankAssetService: TankAssetService,
    private manualTelemetryService: ManualTelemetryService
  ) {
    super(store);
  }

  ngOnInit() {
    this.loadTanks();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTanks() {
    this.loading = true;
    this.tankAssetService.getAllTanks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tanks) => {
          this.tanks = tanks;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading tanks:', err);
          this.loading = false;
        }
      });
  }

  onTankSelected(tank: TankData) {
    this.selectedTank = tank;
    this.loadTelemetryHistory(tank.id.id);
  }

  loadTelemetryHistory(tankId: string) {
    this.manualTelemetryService.getManualTelemetryHistory(tankId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          this.telemetryHistory = history;
        },
        error: (err) => {
          console.error('Error loading telemetry history:', err);
        }
      });
  }

  onEntrySaved(entry: ManualTelemetryEntry) {
    // Recargar historial después de guardar
    if (this.selectedTank) {
      this.loadTelemetryHistory(this.selectedTank.id.id);
    }
  }
}
```

---

## Routing y Navegación

### Configuración de Rutas

`gdt-routing.module.ts`

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Authority } from '@shared/models/authority.enum';
import { AuthGuard } from '@core/guards/auth.guard';

// Componentes
import { GdtDashboardComponent } from './dashboard/gdt-dashboard.component';
import { TankMonitoringComponent } from './tank-monitoring/tank-monitoring.component';
import { TankConfigurationComponent } from './tank-configuration/tank-configuration.component';
import { AforoManualComponent } from './aforo-manual/aforo-manual.component';
import { LaboratorioComponent } from './laboratorio/laboratorio.component';
import { BatchManagementComponent } from './batch-management/batch-management.component';
import { ReportesComponent } from './reportes/reportes.component';
import { HistoricosComponent } from './historicos/historicos.component';
import { AuditoriaComponent } from './auditoria/auditoria.component';
import { IntegracionesComponent } from './integraciones/integraciones.component';

const routes: Routes = [
  {
    path: 'gdt',
    canActivate: [AuthGuard],
    data: {
      breadcrumb: {
        label: 'GDT Tank Gauging',
        icon: 'storage'
      },
      auth: [Authority.TENANT_ADMIN, Authority.CUSTOMER_USER]
    },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: GdtDashboardComponent,
        data: {
          breadcrumb: {
            label: 'Dashboard',
            icon: 'dashboard'
          }
        }
      },
      {
        path: 'monitoring',
        component: TankMonitoringComponent,
        data: {
          breadcrumb: {
            label: 'Tank Monitoring',
            icon: 'remove_red_eye'
          }
        }
      },
      {
        path: 'configuration',
        component: TankConfigurationComponent,
        data: {
          breadcrumb: {
            label: 'Configuration',
            icon: 'settings'
          }
        }
      },
      {
        path: 'aforo-manual',
        component: AforoManualComponent,
        data: {
          breadcrumb: {
            label: 'Manual Gauging',
            icon: 'edit'
          }
        }
      },
      {
        path: 'laboratorio',
        component: LaboratorioComponent,
        data: {
          breadcrumb: {
            label: 'Laboratory',
            icon: 'science'
          }
        }
      },
      {
        path: 'batches',
        component: BatchManagementComponent,
        data: {
          breadcrumb: {
            label: 'Batch Management',
            icon: 'receipt_long'
          }
        }
      },
      {
        path: 'reportes',
        component: ReportesComponent,
        data: {
          breadcrumb: {
            label: 'Reports',
            icon: 'assessment'
          }
        }
      },
      {
        path: 'historicos',
        component: HistoricosComponent,
        data: {
          breadcrumb: {
            label: 'Historical Data',
            icon: 'show_chart'
          }
        }
      },
      {
        path: 'auditoria',
        component: AuditoriaComponent,
        data: {
          breadcrumb: {
            label: 'Audit Trail',
            icon: 'fact_check'
          },
          auth: [Authority.TENANT_ADMIN] // Solo admin
        }
      },
      {
        path: 'integraciones',
        component: IntegracionesComponent,
        data: {
          breadcrumb: {
            label: 'Integrations',
            icon: 'integration_instructions'
          },
          auth: [Authority.TENANT_ADMIN]
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GdtRoutingModule { }
```

### Navegación Programática

```typescript
import { Router } from '@angular/router';

constructor(private router: Router) {}

// Navegar a otra página GDT
navigateToMonitoring() {
  this.router.navigate(['/gdt/monitoring']);
}

// Navegar con parámetros
navigateToTankDetail(tankId: string) {
  this.router.navigate(['/gdt/monitoring'], {
    queryParams: { tankId: tankId }
  });
}
```

### Menú de Navegación

Para agregar enlaces al menú lateral de ThingsBoard, modificar:

`thingsboard/ui-ngx/src/app/core/services/menu.service.ts`

```typescript
const gdtSection: MenuSection = {
  id: 'gdt',
  name: 'gdt.menu',
  type: 'link',
  path: '/gdt',
  icon: 'storage',
  pages: [
    {
      id: 'gdt.dashboard',
      name: 'gdt.dashboard',
      type: 'link',
      path: '/gdt/dashboard',
      icon: 'dashboard'
    },
    {
      id: 'gdt.monitoring',
      name: 'gdt.tank-monitoring',
      type: 'link',
      path: '/gdt/monitoring',
      icon: 'remove_red_eye'
    },
    {
      id: 'gdt.aforo',
      name: 'gdt.manual-gauging',
      type: 'link',
      path: '/gdt/aforo-manual',
      icon: 'edit'
    },
    {
      id: 'gdt.laboratorio',
      name: 'gdt.laboratory',
      type: 'link',
      path: '/gdt/laboratorio',
      icon: 'science'
    },
    {
      id: 'gdt.batches',
      name: 'gdt.batches',
      type: 'link',
      path: '/gdt/batches',
      icon: 'receipt_long'
    },
    {
      id: 'gdt.reportes',
      name: 'gdt.reports',
      type: 'link',
      path: '/gdt/reportes',
      icon: 'assessment'
    },
    {
      id: 'gdt.historicos',
      name: 'gdt.historical',
      type: 'link',
      path: '/gdt/historicos',
      icon: 'show_chart'
    }
  ]
};
```

---

## Servicios Compartidos

### Ubicación de Servicios

```
gdt/shared/services/
├── gdt-widget-context.service.ts     # Contexto compartido
├── tank-asset.service.ts             # Gestión de assets de tanques
├── tank-telemetry.service.ts         # Lectura de telemetría
├── strapping-table.service.ts        # Strapping tables
├── radar-config.service.ts           # Configuración de radares
├── radar-device.service.ts           # Gestión de devices radares
├── tank-calculation.service.ts       # Cálculos volumétricos
├── volume-api-mpms.service.ts        # API MPMS calculations
├── unit-conversion.service.ts        # Conversión de unidades
├── level-formatter.service.ts        # Formateo de nivel
├── alarm-evaluator.service.ts        # Evaluación de alarmas
└── tank-persistence.service.ts       # Persistencia de datos
```

### Ejemplo de Servicio

`tank-asset.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { AssetService } from '@core/http/asset.service';
import { AttributeService } from '@core/http/attribute.service';
import { EntityId } from '@shared/models/id/entity-id';
import { AttributeScope } from '@shared/models/telemetry/telemetry.models';
import { TankData } from '../models/tank-data.model';

@Injectable({
  providedIn: 'root'
})
export class TankAssetService {

  constructor(
    private assetService: AssetService,
    private attributeService: AttributeService
  ) {}

  getAllTanks(): Observable<TankData[]> {
    // Buscar todos los assets de tipo "Tank"
    return this.assetService.getTenantAssetInfos(
      { page: 0, pageSize: 1000, sortOrder: { key: 'name', direction: 'ASC' } },
      'Tank'
    ).pipe(
      switchMap(assetsPage => {
        const tanks = assetsPage.data;

        if (tanks.length === 0) {
          return of([]);
        }

        // Cargar atributos de cada tanque
        const tankObservables = tanks.map(tank =>
          this.loadTankWithAttributes(tank.id)
        );

        return forkJoin(tankObservables);
      }),
      catchError(err => {
        console.error('Error loading tanks:', err);
        return of([]);
      })
    );
  }

  getTankById(tankId: string): Observable<TankData> {
    const entityId: EntityId = {
      id: tankId,
      entityType: 'ASSET'
    };

    return this.loadTankWithAttributes(entityId);
  }

  private loadTankWithAttributes(entityId: EntityId): Observable<TankData> {
    return this.assetService.getAsset(entityId.id).pipe(
      switchMap(asset => {
        // Cargar atributos del servidor
        return this.attributeService.getEntityAttributes(
          entityId,
          AttributeScope.SERVER_SCOPE,
          []
        ).pipe(
          map(attributes => {
            // Convertir atributos a objeto
            const attributesObj = attributes.reduce((acc, attr) => {
              acc[attr.key] = attr.value;
              return acc;
            }, {});

            // Construir objeto TankData
            const tankData: TankData = {
              id: entityId,
              name: asset.name,
              label: asset.label || asset.name,
              type: asset.type,
              // Atributos básicos
              tankTag: attributesObj['tankTag'] || asset.name,
              product: attributesObj['product'] || 'Unknown',
              capacity: attributesObj['capacity'] || 0,
              unit: attributesObj['unit'] || 'bbl',
              // Geometría
              tankHeight: attributesObj['tankHeight'] || 0,
              tankDiameter: attributesObj['tankDiameter'] || 0,
              shape: attributesObj['shape'] || 'cylindrical',
              // API MPMS
              apiGravity: attributesObj['apiGravity'] || 35,
              referenceTemperature: attributesObj['referenceTemperature'] || 60,
              // Umbrales
              levelHH: attributesObj['levelHH'],
              levelH: attributesObj['levelH'],
              levelL: attributesObj['levelL'],
              levelLL: attributesObj['levelLL'],
              // Radar asignado
              radarId: attributesObj['radarId'],
              // Otros
              ...attributesObj
            };

            return tankData;
          })
        );
      })
    );
  }

  saveTankAttributes(tankId: string, attributes: any): Observable<void> {
    const entityId: EntityId = {
      id: tankId,
      entityType: 'ASSET'
    };

    // Convertir objeto a array de atributos
    const attributeArray = Object.keys(attributes).map(key => ({
      key: key,
      value: attributes[key]
    }));

    return this.attributeService.saveEntityAttributes(
      entityId,
      AttributeScope.SERVER_SCOPE,
      attributeArray
    );
  }

  createTank(tankData: Partial<TankData>): Observable<TankData> {
    // Crear asset
    const asset = {
      name: tankData.name,
      type: 'Tank',
      label: tankData.label || tankData.name
    };

    return this.assetService.saveAsset(asset).pipe(
      switchMap(createdAsset => {
        // Guardar atributos
        const attributes = {
          tankTag: tankData.tankTag || tankData.name,
          product: tankData.product || 'Unknown',
          capacity: tankData.capacity || 0,
          unit: tankData.unit || 'bbl',
          tankHeight: tankData.tankHeight || 0,
          tankDiameter: tankData.tankDiameter || 0,
          shape: tankData.shape || 'cylindrical',
          apiGravity: tankData.apiGravity || 35,
          referenceTemperature: tankData.referenceTemperature || 60
        };

        return this.saveTankAttributes(createdAsset.id.id, attributes).pipe(
          map(() => ({
            id: createdAsset.id,
            name: createdAsset.name,
            label: createdAsset.label,
            type: createdAsset.type,
            ...attributes
          } as TankData))
        );
      })
    );
  }

  deleteTank(tankId: string): Observable<void> {
    return this.assetService.deleteAsset(tankId);
  }
}
```

---

## Integración con ThingsBoard API

### Servicios Disponibles

ThingsBoard proporciona servicios Angular para interactuar con la API REST:

- **AssetService**: Gestión de assets
- **DeviceService**: Gestión de devices
- **TelemetryWebsocketService**: Lectura de telemetría en tiempo real
- **AttributeService**: Lectura/escritura de atributos
- **AlarmService**: Gestión de alarmas
- **EntityRelationService**: Relaciones entre entidades
- **RpcService**: Envío de comandos RPC

### Ejemplo: Lectura de Telemetría en Tiempo Real

```typescript
import { TelemetryWebsocketService } from '@core/ws/telemetry-websocket.service';
import { SubscriptionInfo } from '@shared/models/telemetry/telemetry.models';

@Component({...})
export class TankMonitoringComponent implements OnInit, OnDestroy {

  private telemetrySubscription: SubscriptionInfo;

  constructor(
    private telemetryService: TelemetryWebsocketService
  ) {}

  ngOnInit() {
    this.subscribeTelemetry();
  }

  subscribeTelemetry() {
    const entityId: EntityId = {
      id: this.tankId,
      entityType: 'ASSET'
    };

    const telemetryKeys = ['level', 'temperature_avg', 'tov', 'gov', 'gsv', 'nsv'];

    this.telemetrySubscription = this.telemetryService.subscribe({
      entityId: entityId,
      keys: telemetryKeys,
      subscriptionCommands: [{
        cmdId: 1,
        keys: telemetryKeys,
        type: 'TIMESERIES',
        scope: 'LATEST_TELEMETRY'
      }]
    });

    this.telemetrySubscription.data$.subscribe(data => {
      // data contiene los últimos valores de telemetría
      console.log('Telemetry update:', data);
      this.updateTankData(data);
    });
  }

  updateTankData(telemetryData: any) {
    // Actualizar datos del tanque
    this.tankData.level = telemetryData.level?.[0]?.[1];
    this.tankData.temperature = telemetryData.temperature_avg?.[0]?.[1];
    this.tankData.tov = telemetryData.tov?.[0]?.[1];
    // ...
  }

  ngOnDestroy() {
    if (this.telemetrySubscription) {
      this.telemetryService.unsubscribe(this.telemetrySubscription);
    }
  }
}
```

### Ejemplo: Envío de Comando RPC

```typescript
import { DeviceService } from '@core/http/device.service';

constructor(private deviceService: DeviceService) {}

sendRpcCommand(deviceId: string, method: string, params: any): Observable<any> {
  return this.deviceService.sendOneWayRpcCommand(deviceId, method, params);
}

// Ejemplo: Configurar parámetros del radar
configureRadar(radarId: string, params: any) {
  const rpcParams = {
    tankHeight: params.tankHeight,
    offsetDistance: params.offsetDistance,
    calibrationDistance: params.calibrationDistance
  };

  this.sendRpcCommand(radarId, 'set_params', rpcParams).subscribe({
    next: (response) => {
      console.log('RPC command sent successfully:', response);
    },
    error: (err) => {
      console.error('Error sending RPC command:', err);
    }
  });
}
```

---

## Componentes Reutilizables

### Ubicación

```
gdt/shared/components/
├── tank-selector/
├── level-input/
├── feet-inches-input/
├── api-gravity-input/
├── strapping-table-viewer/
└── alarm-indicator/
```

### Ejemplo: Componente Reutilizable

`tank-selector/tank-selector.component.ts`

```typescript
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { TankData } from '../../models/tank-data.model';
import { TankAssetService } from '../../services/tank-asset.service';

@Component({
  selector: 'tb-tank-selector',
  templateUrl: './tank-selector.component.html',
  styleUrls: ['./tank-selector.component.scss']
})
export class TankSelectorComponent implements OnInit {

  @Input() selectedTankId: string | null = null;
  @Input() multiple = false;
  @Output() tankSelected = new EventEmitter<TankData>();
  @Output() tanksSelected = new EventEmitter<TankData[]>();

  tanks: TankData[] = [];
  loading = false;

  constructor(private tankAssetService: TankAssetService) {}

  ngOnInit() {
    this.loadTanks();
  }

  loadTanks() {
    this.loading = true;
    this.tankAssetService.getAllTanks().subscribe({
      next: (tanks) => {
        this.tanks = tanks;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tanks:', err);
        this.loading = false;
      }
    });
  }

  onTankChange(tankId: string) {
    const tank = this.tanks.find(t => t.id.id === tankId);
    if (tank) {
      this.tankSelected.emit(tank);
    }
  }
}
```

`tank-selector.component.html`

```html
<mat-form-field appearance="outline" class="full-width">
  <mat-label>Select Tank</mat-label>
  <mat-select [(value)]="selectedTankId"
              (selectionChange)="onTankChange($event.value)"
              [disabled]="loading">
    <mat-option *ngFor="let tank of tanks" [value]="tank.id.id">
      {{ tank.tankTag }} - {{ tank.product }}
    </mat-option>
  </mat-select>
  <mat-icon matSuffix>storage</mat-icon>
  <mat-progress-spinner *ngIf="loading"
                        mode="indeterminate"
                        diameter="20"
                        matSuffix>
  </mat-progress-spinner>
</mat-form-field>
```

---

## Estilos y Temas

### Material Design

ThingsBoard utiliza Angular Material. Usar componentes de Material Design:

```html
<!-- Buttons -->
<button mat-raised-button color="primary">Primary</button>
<button mat-raised-button color="accent">Accent</button>
<button mat-icon-button><mat-icon>edit</mat-icon></button>

<!-- Cards -->
<mat-card>
  <mat-card-header>
    <mat-card-title>Title</mat-card-title>
  </mat-card-header>
  <mat-card-content>
    Content here
  </mat-card-content>
  <mat-card-actions>
    <button mat-button>Action</button>
  </mat-card-actions>
</mat-card>

<!-- Tables -->
<table mat-table [dataSource]="dataSource">
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef>Name</th>
    <td mat-cell *matCellDef="let element">{{ element.name }}</td>
  </ng-container>
  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
</table>
```

### Temas de ThingsBoard

Usar variables de tema de ThingsBoard:

```scss
// Importar mixins de ThingsBoard
@import '~@angular/material/theming';
@import 'src/theme';

.my-component {
  background-color: mat-color($tb-primary);
  color: mat-color($tb-primary, default-contrast);

  .highlight {
    background-color: mat-color($tb-accent);
  }
}
```

### Estilos Globales GDT

Crear archivo de estilos compartidos:

`gdt/shared/styles/gdt-common.scss`

```scss
// Colores GDT
$gdt-primary: #1976d2;
$gdt-accent: #ff9800;
$gdt-warn: #f44336;
$gdt-success: #4caf50;

// Clases utilitarias
.gdt-card {
  margin: 16px;
  padding: 16px;
}

.gdt-section-title {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 16px;
  color: rgba(0, 0, 0, 0.87);
}

.gdt-form-field {
  width: 100%;
  margin-bottom: 16px;
}

.gdt-tank-gauge {
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
}

// Estados de tanque
.tank-status {
  &.receiving {
    color: $gdt-success;
  }

  &.dispensing {
    color: $gdt-warn;
  }

  &.idle {
    color: rgba(0, 0, 0, 0.54);
  }
}

// Alarmas
.alarm-indicator {
  &.critical {
    color: $gdt-warn;
  }

  &.major {
    color: #ff9800;
  }

  &.minor {
    color: #ffeb3b;
  }
}
```

---

## Mejores Prácticas

### 1. Gestión de Estado

- Usar RxJS para estado reactivo
- Implementar unsubscribe en `ngOnDestroy`
- Usar `takeUntil` para cancelar observables

```typescript
private destroy$ = new Subject<void>();

ngOnInit() {
  this.dataService.getData()
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      // Procesar data
    });
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### 2. Manejo de Errores

- Implementar manejo de errores global
- Mostrar mensajes amigables al usuario

```typescript
import { MatSnackBar } from '@angular/material/snack-bar';

constructor(private snackBar: MatSnackBar) {}

showError(message: string) {
  this.snackBar.open(message, 'Close', {
    duration: 5000,
    horizontalPosition: 'end',
    verticalPosition: 'top',
    panelClass: ['error-snackbar']
  });
}

showSuccess(message: string) {
  this.snackBar.open(message, 'Close', {
    duration: 3000,
    horizontalPosition: 'end',
    verticalPosition: 'top',
    panelClass: ['success-snackbar']
  });
}
```

### 3. Performance

- Usar `trackBy` en `*ngFor`
- Implementar `OnPush` change detection cuando sea apropiado
- Lazy loading de módulos pesados

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedComponent {

  trackByTankId(index: number, tank: TankData): string {
    return tank.id.id;
  }
}
```

### 4. Accesibilidad

- Usar etiquetas semánticas HTML
- Implementar atributos ARIA
- Soporte de teclado

```html
<button mat-raised-button
        [attr.aria-label]="'Save tank configuration'"
        (click)="save()">
  Save
</button>
```

### 5. Internacionalización

- Usar el sistema de traducción de ThingsBoard
- Crear archivos de traducción en `locale/`

```typescript
import { TranslateService } from '@ngx-translate/core';

constructor(private translate: TranslateService) {}

getTranslation(key: string): string {
  return this.translate.instant(key);
}
```

`locale/locale.constant-en_US.json`

```json
{
  "gdt": {
    "menu": "Tank Gauging",
    "dashboard": "Dashboard",
    "tank-monitoring": "Tank Monitoring",
    "manual-gauging": "Manual Gauging",
    "laboratory": "Laboratory",
    "batches": "Batch Management",
    "reports": "Reports",
    "historical": "Historical Data"
  }
}
```

---

## Conclusión

El desarrollo de páginas nativas en ThingsBoard PE ofrece mayor flexibilidad y mejor integración que los widgets. Siguiendo esta guía, podrás crear páginas robustas, mantenibles y con excelente UX.

### Recursos Adicionales

- [ThingsBoard PE Documentation](https://thingsboard.io/docs/pe/)
- [Angular Material Documentation](https://material.angular.io/)
- [RxJS Documentation](https://rxjs.dev/)
- Código existente en `thingsboard/ui-ngx/src/app/modules/home/pages/gdt/`
