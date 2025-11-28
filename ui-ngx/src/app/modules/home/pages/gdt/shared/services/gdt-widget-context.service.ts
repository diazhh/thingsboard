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

import { Injectable, Injector, ChangeDetectorRef } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { WidgetContext } from '@home/models/widget-component.models';
import { Widget } from '@shared/models/widget.models';
import { AssetService } from '@core/http/asset.service';
import { DeviceService } from '@core/http/device.service';
import { AttributeService } from '@core/http/attribute.service';
import { EntityService } from '@core/http/entity.service';
import { TelemetryWebsocketService } from '@core/ws/telemetry-websocket.service';
import { EntityRelationService } from '@core/http/entity-relation.service';
import { getCurrentAuthUser } from '@core/auth/auth.selectors';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { DialogService } from '@core/services/dialog.service';
import { CustomDialogService } from '@home/components/widget/dialog/custom-dialog.service';
import { ResourceService } from '@core/http/resource.service';
import { UserService } from '@core/http/user.service';
import { CustomerService } from '@core/http/customer.service';
import { DashboardService } from '@core/http/dashboard.service';
import { EntityViewService } from '@core/http/entity-view.service';
import { EdgeService } from '@core/http/edge.service';
import { AuthService } from '@core/auth/auth.service';
import { UserSettingsService } from '@core/http/user-settings.service';
import { UtilsService } from '@core/services/utils.service';
import { UnitService } from '@core/services/unit.service';
import { ImagePipe } from '@shared/pipe/image.pipe';
import { MillisecondsToTimeStringPipe } from '@shared/pipe/milliseconds-to-time-string.pipe';

/**
 * GDT Widget Context Service
 * 
 * Creates a WidgetContext for GDT pages to use widget code without modifications.
 * Injects real ThingsBoard services into the context.
 */
@Injectable()
export class GdtWidgetContextService {
  
  /**
   * Create a WidgetContext with real ThingsBoard services
   */
  createContext(settings?: any, cd?: ChangeDetectorRef): WidgetContext {
    // Create mock widget configuration
    const mockWidget: Partial<Widget> = {
      config: {
        settings: settings || {},
        datasources: [],
        timewindow: null,
        showTitle: false,
        dropShadow: false,
        enableFullscreen: false,
        titleStyle: {},
        units: '',
        decimals: 2,
        useDashboardTimewindow: false,
        showLegend: false,
        actions: {},
        mobileHeight: null,
        mobileOrder: null
      }
    };
    
    // Create WidgetContext
    const ctx = new WidgetContext(
      null, // dashboard - not needed for pages
      null, // dashboardWidget - not needed for pages
      mockWidget as Widget
    );
    
    // Inject ThingsBoard services
    ctx.assetService = this.assetService;
    ctx.deviceService = this.deviceService;
    ctx.attributeService = this.attributeService;
    ctx.entityService = this.entityService;
    ctx.telemetryWsService = this.telemetryWsService;
    ctx.entityRelationService = this.entityRelationService;
    ctx.userService = this.userService;
    ctx.customerService = this.customerService;
    ctx.dashboardService = this.dashboardService;
    ctx.entityViewService = this.entityViewService;
    ctx.edgeService = this.edgeService;
    ctx.authService = this.authService;
    ctx.resourceService = this.resourceService;
    ctx.userSettingsService = this.userSettingsService;
    ctx.utilsService = this.utilsService;
    ctx.unitService = this.unitService;
    ctx.dialogs = this.dialogService;
    ctx.customDialog = this.customDialogService;
    ctx.http = this.http;
    ctx.translate = this.translate;
    ctx.date = this.datePipe;
    ctx.imagePipe = this.imagePipe;
    ctx.milliSecondsToTimeString = this.milliSecondsToTimeString;
    ctx.sanitizer = this.sanitizer;
    ctx.router = this.router;
    ctx.store = this.store;
    
    // Set current user (use getter to always get fresh value)
    Object.defineProperty(ctx, 'currentUser', {
      get: () => getCurrentAuthUser(this.store),
      enumerable: true,
      configurable: true
    });
    
    // Set change detector
    const changeDetector = cd || this.injector.get(ChangeDetectorRef);
    ctx.changeDetector = changeDetector;
    ctx.detectChanges = () => {
      try {
        changeDetector.detectChanges();
      } catch (e) {
        // Ignore errors during change detection
        console.debug('Change detection error (ignored):', e);
      }
    };
    
    // Mock $scope for compatibility
    ctx.$scope = {} as any;
    
    // Initialize empty subscriptions
    ctx.subscriptions = {};
    ctx.defaultSubscription = null;
    
    // Mark as initialized
    ctx.inited = true;
    ctx.destroyed = false;
    
    return ctx;
  }
  
  constructor(
    private assetService: AssetService,
    private deviceService: DeviceService,
    private attributeService: AttributeService,
    private entityService: EntityService,
    private telemetryWsService: TelemetryWebsocketService,
    private entityRelationService: EntityRelationService,
    private userService: UserService,
    private customerService: CustomerService,
    private dashboardService: DashboardService,
    private entityViewService: EntityViewService,
    private edgeService: EdgeService,
    private authService: AuthService,
    private resourceService: ResourceService,
    private userSettingsService: UserSettingsService,
    private utilsService: UtilsService,
    private unitService: UnitService,
    private dialogService: DialogService,
    private customDialogService: CustomDialogService,
    private http: HttpClient,
    private translate: TranslateService,
    private datePipe: DatePipe,
    private imagePipe: ImagePipe,
    private milliSecondsToTimeString: MillisecondsToTimeStringPipe,
    private sanitizer: DomSanitizer,
    private router: Router,
    private store: Store<AppState>,
    private injector: Injector
  ) {}
}
