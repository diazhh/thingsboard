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
import { AforoManualComponent } from './aforo-manual/aforo-manual.component';
import { LaboratorioComponent } from './laboratorio/laboratorio.component';
import { BatchManagementComponent } from './batch-management/batch-management.component';
import { CreateBatchDialogComponent } from './batch-management/components/create-batch-dialog/create-batch-dialog.component';
import { BatchDetailDialogComponent } from './batch-management/components/batch-detail-dialog/batch-detail-dialog.component';
import { CloseBatchDialogComponent } from './batch-management/components/close-batch-dialog/close-batch-dialog.component';
import { RecalculateBatchDialogComponent } from './batch-management/components/recalculate-batch-dialog/recalculate-batch-dialog.component';
import { ReportsComponent } from './reports/reports.component';
import { GenerateReportDialogComponent } from './reports/components/generate-report-dialog/generate-report-dialog.component';
import { ScheduledReportsComponent } from './reports/components/scheduled-reports/scheduled-reports.component';
import { ScheduledReportConfigDialogComponent } from './reports/components/scheduled-report-config-dialog/scheduled-report-config-dialog.component';

// Tank Monitoring Subcomponents
import { LiquidGaugeDisplayComponent } from './tank-monitoring/components/liquid-gauge-display/liquid-gauge-display.component';
import { CylinderGaugeComponent } from './tank-monitoring/components/cylinder-gauge/cylinder-gauge.component';
import { TankDetailComponent } from './tank-monitoring/components/tank-detail/tank-detail.component';
import { TankShapeVisualComponent } from './tank-monitoring/components/tank-shape-visual/tank-shape-visual.component';

// Aforo Manual Subcomponents
import { AforoFormComponent } from './aforo-manual/components/aforo-form/aforo-form.component';
import { AforoHistoryComponent } from './aforo-manual/components/aforo-history/aforo-history.component';

// Laboratorio Subcomponents
import { LabFormComponent } from './laboratorio/components/lab-form/lab-form.component';
import { LabHistoryComponent } from './laboratorio/components/lab-history/lab-history.component';

// Gateway Configuration Subcomponents
import { PortListComponent } from './gateway-configuration/components/port-list/port-list.component';
import { AddPortDialogComponent } from './gateway-configuration/components/add-port-dialog/add-port-dialog.component';
import { DeviceDiscoveryComponent } from './gateway-configuration/components/device-discovery/device-discovery.component';
import { DiscoveryResultsTableComponent } from './gateway-configuration/components/discovery-results-table/discovery-results-table.component';
import { ProvisionDeviceDialogComponent } from './gateway-configuration/components/provision-device-dialog/provision-device-dialog.component';

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
import { LevelInputParserService } from './shared/services/level-input-parser.service';
import { BatchService } from './shared/services/batch.service';
import { BatchMockService } from './shared/services/batch-mock.service';
import { BatchCalculationService } from './shared/services/batch-calculation.service';
import { ManualTelemetryService } from './tank-monitoring/services/manual-telemetry.service';
import { GatewayApiService } from './shared/services/gateway-api.service';
import { ReportService } from './shared/services/report.service';
import { InventoryReportGeneratorService } from './shared/services/report-generators/inventory-report-generator.service';
import { ReportExportService } from './shared/services/report-export.service';
import { ScheduledReportService } from './reports/services/scheduled-report.service';

@NgModule({
  declarations: [
    // Main Components
    GdtDashboardComponent,
    TankMonitoringComponent,
    TankConfigurationComponent,
    GdtUserManagementComponent,
    AddTenantUserDialogComponent,
    GatewayConfigurationComponent,
    AforoManualComponent,
    LaboratorioComponent,
    BatchManagementComponent,
    CreateBatchDialogComponent,
    BatchDetailDialogComponent,
    CloseBatchDialogComponent,
    RecalculateBatchDialogComponent,
    ReportsComponent,
    GenerateReportDialogComponent,
    ScheduledReportsComponent,
    ScheduledReportConfigDialogComponent,
    // Tank Monitoring Subcomponents
    LiquidGaugeDisplayComponent,
    CylinderGaugeComponent,
    TankDetailComponent,
    TankShapeVisualComponent,
    // Aforo Manual Subcomponents
    AforoFormComponent,
    AforoHistoryComponent,
    // Laboratorio Subcomponents
    LabFormComponent,
    LabHistoryComponent,
    // Gateway Configuration Subcomponents
    PortListComponent,
    AddPortDialogComponent,
    DeviceDiscoveryComponent,
    DiscoveryResultsTableComponent,
    ProvisionDeviceDialogComponent,
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
    LevelInputParserService,
    ManualTelemetryService,
    // Batch Management Services
    BatchService,
    BatchMockService,
    BatchCalculationService,
    // Gateway Services
    GatewayApiService,
    // Report Services
    ReportService,
    InventoryReportGeneratorService,
    ReportExportService,
    ScheduledReportService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GdtModule { }
