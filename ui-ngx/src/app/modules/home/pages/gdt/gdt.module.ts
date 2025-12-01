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

import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@shared/shared.module';
import { GdtRoutingModule } from './gdt-routing.module';

// Main Components
import { GdtDashboardComponent } from './dashboard/gdt-dashboard.component';
import { TankMonitoringComponent } from './tank-monitoring/tank-monitoring.component';
import { TankConfigurationComponent } from './tank-configuration/tank-configuration.component';
import { GdtUserManagementComponent } from './user-management/user-management.component';
import { AddTenantUserDialogComponent } from './user-management/add-tenant-user-dialog.component';
import { GatewayConfigurationComponent } from './gateway-configuration/gateway-configuration.component';

// Tank Monitoring Subcomponents
import { LiquidGaugeDisplayComponent } from './tank-monitoring/components/liquid-gauge-display/liquid-gauge-display.component';
import { CylinderGaugeComponent } from './tank-monitoring/components/cylinder-gauge/cylinder-gauge.component';
import { TankDetailComponent } from './tank-monitoring/components/tank-detail/tank-detail.component';
import { TankShapeVisualComponent } from './tank-monitoring/components/tank-shape-visual/tank-shape-visual.component';

// Tank Configuration Subcomponents
import { FeetInchesFractionInputComponent } from './tank-configuration/components/feet-inches-fraction-input/feet-inches-fraction-input.component';
import { FeetInchesInputComponent } from './tank-configuration/components/feet-inches-input/feet-inches-input.component';
import { RadarConfigComponent } from './tank-configuration/radar-config.component';
import { StrappingTableConfigComponent } from './tank-configuration/strapping-table-config.component';
import { TankConfigurationStaticComponent } from './tank-configuration/tank-configuration-static.component';

// Pipes
import { FindInArrayPipe } from './tank-configuration/find-in-array.pipe';
import { LevelFormatPipe } from './shared/pipes/level-format.pipe';

// Services
import { GdtWidgetContextService } from './shared/services/gdt-widget-context.service';
import { TankAssetService } from './shared/services/tank-asset.service';
import { RadarDeviceService } from './shared/services/radar-device.service';
import { TankTelemetryService } from './shared/services/tank-telemetry.service';
import { SystemConfigService } from './shared/services/system-config.service';
import { TankCalculationService } from './shared/services/tank-calculation.service';
import { AlarmEvaluatorService } from './shared/services/alarm-evaluator.service';
import { VolumeApiMpmsService } from './shared/services/volume-api-mpms.service';
import { LevelFormatterService } from './shared/services/level-formatter.service';
import { ManualTelemetryService } from './tank-monitoring/services/manual-telemetry.service';

@NgModule({
  declarations: [
    // Main Components
    GdtDashboardComponent,
    TankMonitoringComponent,
    TankConfigurationComponent,
    GdtUserManagementComponent,
    AddTenantUserDialogComponent,
    GatewayConfigurationComponent,
    // Tank Monitoring Subcomponents
    LiquidGaugeDisplayComponent,
    CylinderGaugeComponent,
    TankDetailComponent,
    TankShapeVisualComponent,
    // Tank Configuration Subcomponents
    FeetInchesFractionInputComponent,
    FeetInchesInputComponent,
    RadarConfigComponent,
    StrappingTableConfigComponent,
    TankConfigurationStaticComponent,
    // Pipes
    FindInArrayPipe,
    LevelFormatPipe
  ],
  imports: [
    CommonModule,
    SharedModule,
    GdtRoutingModule
  ],
  providers: [
    // GDT Services
    GdtWidgetContextService,
    TankAssetService,
    RadarDeviceService,
    TankTelemetryService,
    SystemConfigService,
    TankCalculationService,
    AlarmEvaluatorService,
    VolumeApiMpmsService,
    LevelFormatterService,
    ManualTelemetryService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GdtModule { }
