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

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TankAssetService } from '../shared/services/tank-asset.service';
import { TankTelemetryService } from '../shared/services/tank-telemetry.service';
import { RadarDeviceService } from '../shared/services/radar-device.service';
import { GdtWidgetContextService } from '../shared/services/gdt-widget-context.service';
import { TankData } from '../shared/models/tank-data.model';

interface DashboardStats {
  totalTanks: number;
  tanksOnline: number;
  tanksOffline: number;
  tanksWithAlarms: number;
  totalVolume: number;
  totalCapacity: number;
  averageLevel: number;
}

interface QuickAccessItem {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'tb-gdt-dashboard',
  templateUrl: './gdt-dashboard.component.html',
  styleUrls: ['./gdt-dashboard.component.scss']
})
export class GdtDashboardComponent implements OnInit, OnDestroy {

  // Dashboard stats
  stats: DashboardStats = {
    totalTanks: 0,
    tanksOnline: 0,
    tanksOffline: 0,
    tanksWithAlarms: 0,
    totalVolume: 0,
    totalCapacity: 0,
    averageLevel: 0
  };

  // Tank data
  tanks: TankData[] = [];
  criticalTanks: TankData[] = [];
  recentActivity: any[] = [];

  // Loading state
  loading = true;
  error: string | null = null;

  // Quick access menu items
  quickAccessItems: QuickAccessItem[] = [
    {
      title: 'Monitoreo',
      subtitle: 'Vista en tiempo real',
      icon: 'mdi:gauge',
      route: '/gdt/monitoring',
      color: '#00bcd4'
    },
    {
      title: 'Configuración',
      subtitle: 'Ajustes de tanques',
      icon: 'settings',
      route: '/gdt/configuration',
      color: '#1a237e'
    },
    {
      title: 'Usuarios',
      subtitle: 'Gestión de accesos',
      icon: 'group',
      route: '/gdt/users',
      color: '#7c4dff'
    },
    {
      title: 'Reportes',
      subtitle: 'Análisis y datos',
      icon: 'assessment',
      route: '/dashboards',
      color: '#ff9800'
    }
  ];

  // Current time
  currentTime: Date = new Date();
  private timeInterval: any;
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private cd: ChangeDetectorRef,
    private tankAssetService: TankAssetService,
    private tankTelemetryService: TankTelemetryService,
    private radarDeviceService: RadarDeviceService,
    private gdtContextService: GdtWidgetContextService
  ) {}

  ngOnInit(): void {
    // Update time every second
    this.timeInterval = setInterval(() => {
      this.currentTime = new Date();
      this.cd.detectChanges();
    }, 1000);

    // Load dashboard data
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadDashboardData(): void {
    this.loading = true;
    
    // Fetch all tanks
    this.tankAssetService.getAllTanksWithAttributes('Tank').subscribe({
      next: (tanksWithAttributes) => {
        this.stats.totalTanks = tanksWithAttributes.length;
        
        if (tanksWithAttributes.length === 0) {
          this.loading = false;
          this.cd.detectChanges();
          return;
        }

        // Get radar assignments
        const tankIds = tanksWithAttributes.map(t => t.asset.id!.id);
        this.radarDeviceService.getTankRadarAssignments(tankIds).subscribe({
          next: (assignments) => {
            // Process tanks
            const processedTanks: TankData[] = tanksWithAttributes.map(tankWithAttr => {
              const tankId = tankWithAttr.asset.id!.id;
              const radarId = assignments.get(tankId);

              return {
                tankId: tankId,
                tankTag: tankWithAttr.attributes.tankTag || tankWithAttr.asset.name,
                tankName: tankWithAttr.attributes.tankName || tankWithAttr.asset.name,
                productName: tankWithAttr.attributes.productName || 'N/A',
                tankShape: tankWithAttr.attributes.tankShape || 'vertical',
                tankHeight: parseFloat(tankWithAttr.attributes.tankHeight) || 0,
                tankDiameter: parseFloat(tankWithAttr.attributes.tankDiameter) || 0,
                tankCapacity: parseFloat(tankWithAttr.attributes.tankCapacity) || 0,
                level: 0,
                levelPercent: 0,
                volumeCurrent: 0,
                radarStatus: radarId ? 'offline' : 'offline',
                currentAlarmLevel: 'none',
                activeAlarms: [],
                alarmLevels: {
                  hh: parseFloat(tankWithAttr.attributes.alarmHH) || 0,
                  h: parseFloat(tankWithAttr.attributes.alarmH) || 0,
                  l: parseFloat(tankWithAttr.attributes.alarmL) || 0,
                  ll: parseFloat(tankWithAttr.attributes.alarmLL) || 0
                }
              } as TankData;
            });

            this.tanks = processedTanks;

            // Subscribe to telemetry for each tank
            processedTanks.forEach((tank, index) => {
              const radarId = assignments.get(tank.tankId!);
              if (radarId) {
                this.subscribeToTelemetry(tank, radarId);
              }
            });

            // Calculate initial stats
            this.calculateStats();
            this.loading = false;
            this.cd.detectChanges();
          },
          error: (err) => {
            console.error('Error loading radar assignments:', err);
            this.error = 'Error cargando asignaciones de radar';
            this.loading = false;
            this.cd.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Error loading tanks:', err);
        this.error = 'Error cargando tanques';
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  private subscribeToTelemetry(tank: TankData, deviceId: string): void {
    const keys = ['level', 'ullage', 'RTGstatus', 'GOV', 'GSV'];
    
    const sub = this.tankTelemetryService.subscribeToTelemetry({
      entityType: 'DEVICE',
      entityId: deviceId,
      keys: keys
    }, 5000).subscribe({
      next: (telemetryData) => {
        this.updateTankData(tank, telemetryData);
        this.calculateStats();
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error(`Error subscribing to telemetry for ${tank.tankTag}:`, err);
        tank.radarStatus = 'error';
      }
    });

    this.subscriptions.push(sub);
  }

  private updateTankData(tank: TankData, telemetryData: any): void {
    Object.keys(telemetryData).forEach(key => {
      const dataPoints = telemetryData[key];
      if (dataPoints && dataPoints.length > 0) {
        const value = dataPoints[0].value;
        
        switch (key) {
          case 'level':
            tank.level = parseFloat(value);
            tank.levelMeters = tank.level / 1000;
            if (tank.tankHeight) {
              tank.levelPercent = (tank.levelMeters / tank.tankHeight) * 100;
            }
            break;
          case 'GOV':
          case 'GSV':
            tank.volumeCurrent = parseFloat(value);
            break;
          case 'RTGstatus':
            const status = parseInt(value);
            tank.radarStatus = (status >= 8000 && status <= 12000) ? 'online' : 'offline';
            break;
        }
      }
    });

    // Evaluate alarms
    if (tank.level && tank.alarmLevels) {
      const levelMM = tank.level;
      if (levelMM >= tank.alarmLevels.hh) {
        tank.currentAlarmLevel = 'critical';
      } else if (levelMM >= tank.alarmLevels.h) {
        tank.currentAlarmLevel = 'high';
      } else if (levelMM <= tank.alarmLevels.ll) {
        tank.currentAlarmLevel = 'critical';
      } else if (levelMM <= tank.alarmLevels.l) {
        tank.currentAlarmLevel = 'low';
      } else {
        tank.currentAlarmLevel = 'none';
      }
    }
  }

  private calculateStats(): void {
    this.stats.totalTanks = this.tanks.length;
    this.stats.tanksOnline = this.tanks.filter(t => t.radarStatus === 'online').length;
    this.stats.tanksOffline = this.tanks.filter(t => t.radarStatus !== 'online').length;
    this.stats.tanksWithAlarms = this.tanks.filter(t => t.currentAlarmLevel !== 'none').length;
    
    this.stats.totalVolume = this.tanks.reduce((sum, t) => sum + (t.volumeCurrent || 0), 0);
    this.stats.totalCapacity = this.tanks.reduce((sum, t) => sum + (t.tankCapacity || 0), 0);
    
    const levels = this.tanks.filter(t => t.levelPercent).map(t => t.levelPercent!);
    this.stats.averageLevel = levels.length > 0 
      ? levels.reduce((a, b) => a + b, 0) / levels.length 
      : 0;

    // Get critical tanks (with alarms)
    this.criticalTanks = this.tanks
      .filter(t => t.currentAlarmLevel !== 'none')
      .sort((a, b) => {
        const priority: Record<string, number> = { critical: 3, high: 2, low: 1, none: 0 };
        return (priority[b.currentAlarmLevel || 'none'] || 0) - (priority[a.currentAlarmLevel || 'none'] || 0);
      })
      .slice(0, 5);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  goToMonitoring(): void {
    this.router.navigate(['/gdt/monitoring']);
  }

  goToTankDetail(tank: TankData): void {
    this.router.navigate(['/gdt/monitoring'], { queryParams: { tank: tank.tankId } });
  }

  getAlarmClass(level: string): string {
    switch (level) {
      case 'critical': return 'alarm-critical';
      case 'high': return 'alarm-high';
      case 'low': return 'alarm-low';
      default: return '';
    }
  }

  getAlarmText(level: string): string {
    switch (level) {
      case 'critical': return 'Crítico';
      case 'high': return 'Alto';
      case 'low': return 'Bajo';
      default: return 'Normal';
    }
  }

  formatVolume(volume: number): string {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(2) + ' M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + ' K';
    }
    return volume.toFixed(0);
  }

  refreshData(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    this.loadDashboardData();
  }
}
