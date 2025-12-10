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
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TankAssetService } from '../tank-asset.service';
import { TankTelemetryService } from '../tank-telemetry.service';
import { ReportParameters } from '../../models/report.model';

/**
 * Tank Inventory Data
 */
export interface TankInventoryData {
  tankId: string;
  tankName: string;
  product: string;
  level: number;
  levelUnit: string;
  temperature: number;
  temperatureUnit: string;
  tov: number;
  gov: number;
  gsv: number;
  nsv: number;
  volumeUnit: string;
  density: number;
  densityUnit: string;
  mass: number;
  massUnit: string;
  capacity: number;
  utilization: number; // percentage
  status: 'Normal' | 'Warning' | 'Critical' | 'Offline';
  lastUpdate: number;
  alarms: string[];
}

/**
 * Daily Inventory Report Data
 */
export interface DailyInventoryReportData {
  reportDate: number;
  generatedAt: number;
  totalTanks: number;
  activeTanks: number;
  totalVolume: number;
  totalCapacity: number;
  averageUtilization: number;
  tanks: TankInventoryData[];
  summary: {
    byProduct: { [product: string]: { volume: number; tanks: number } };
    byStatus: { [status: string]: number };
  };
}

/**
 * Tank Inventory Summary Data
 */
export interface TankInventorySummaryData {
  generatedAt: number;
  totalTanks: number;
  totalVolume: number;
  totalCapacity: number;
  averageUtilization: number;
  tanks: TankInventoryData[];
  charts: {
    utilizationByTank: { name: string; value: number }[];
    volumeByProduct: { name: string; value: number }[];
    statusDistribution: { name: string; value: number }[];
  };
}

/**
 * Product Inventory Group Data
 */
export interface ProductInventoryGroupData {
  generatedAt: number;
  products: {
    productName: string;
    totalVolume: number;
    totalMass: number;
    tankCount: number;
    averageUtilization: number;
    tanks: TankInventoryData[];
  }[];
}

/**
 * Tank Status Report Data
 */
export interface TankStatusReportData {
  generatedAt: number;
  tanks: {
    tankId: string;
    tankName: string;
    product: string;
    operationalStatus: 'Online' | 'Offline' | 'Maintenance';
    alarmStatus: 'Normal' | 'Warning' | 'Critical';
    activeAlarms: string[];
    lastCommunication: number;
    deviceHealth: 'Good' | 'Fair' | 'Poor';
    calibrationStatus: 'Valid' | 'Due' | 'Overdue';
    lastCalibration: number;
  }[];
}

/**
 * Capacity Utilization Report Data
 */
export interface CapacityUtilizationReportData {
  generatedAt: number;
  startDate: number;
  endDate: number;
  tanks: {
    tankId: string;
    tankName: string;
    product: string;
    capacity: number;
    averageUtilization: number;
    minUtilization: number;
    maxUtilization: number;
    utilizationTrend: 'Increasing' | 'Decreasing' | 'Stable';
    historicalData: { timestamp: number; utilization: number }[];
  }[];
  overall: {
    averageUtilization: number;
    peakUtilization: number;
    lowestUtilization: number;
  };
}

/**
 * Low Stock Alert Data
 */
export interface LowStockAlertData {
  generatedAt: number;
  threshold: number;
  tanks: {
    tankId: string;
    tankName: string;
    product: string;
    currentLevel: number;
    currentVolume: number;
    capacity: number;
    utilization: number;
    daysUntilEmpty: number;
    severity: 'Low' | 'Critical';
  }[];
}

/**
 * Overfill Risk Data
 */
export interface OverfillRiskData {
  generatedAt: number;
  threshold: number;
  tanks: {
    tankId: string;
    tankName: string;
    product: string;
    currentLevel: number;
    currentVolume: number;
    capacity: number;
    utilization: number;
    availableCapacity: number;
    fillRate: number; // volume per hour
    hoursUntilFull: number;
    riskLevel: 'Medium' | 'High' | 'Critical';
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class InventoryReportGeneratorService {

  constructor(
    private tankAssetService: TankAssetService,
    private tankTelemetryService: TankTelemetryService
  ) {}

  /**
   * Generate Daily Inventory Report
   */
  generateDailyInventoryReport(parameters: ReportParameters): Observable<DailyInventoryReportData> {
    const reportDate = parameters.date || Date.now();
    
    return this.getTankInventoryData(parameters.tankIds).pipe(
      map(tanks => {
        const activeTanks = tanks.filter(t => t.status !== 'Offline');
        const totalVolume = tanks.reduce((sum, t) => sum + t.gsv, 0);
        const totalCapacity = tanks.reduce((sum, t) => sum + t.capacity, 0);
        const averageUtilization = totalCapacity > 0 ? (totalVolume / totalCapacity) * 100 : 0;

        // Group by product
        const byProduct: { [product: string]: { volume: number; tanks: number } } = {};
        tanks.forEach(tank => {
          if (!byProduct[tank.product]) {
            byProduct[tank.product] = { volume: 0, tanks: 0 };
          }
          byProduct[tank.product].volume += tank.gsv;
          byProduct[tank.product].tanks++;
        });

        // Group by status
        const byStatus: { [status: string]: number } = {};
        tanks.forEach(tank => {
          byStatus[tank.status] = (byStatus[tank.status] || 0) + 1;
        });

        return {
          reportDate,
          generatedAt: Date.now(),
          totalTanks: tanks.length,
          activeTanks: activeTanks.length,
          totalVolume,
          totalCapacity,
          averageUtilization,
          tanks,
          summary: {
            byProduct,
            byStatus
          }
        };
      })
    );
  }

  /**
   * Generate Tank Inventory Summary Report
   */
  generateTankInventorySummary(parameters: ReportParameters): Observable<TankInventorySummaryData> {
    return this.getTankInventoryData(parameters.tankIds).pipe(
      map(tanks => {
        const totalVolume = tanks.reduce((sum, t) => sum + t.gsv, 0);
        const totalCapacity = tanks.reduce((sum, t) => sum + t.capacity, 0);
        const averageUtilization = totalCapacity > 0 ? (totalVolume / totalCapacity) * 100 : 0;

        // Chart data: Utilization by tank
        const utilizationByTank = tanks.map(t => ({
          name: t.tankName,
          value: t.utilization
        }));

        // Chart data: Volume by product
        const volumeByProduct: { [product: string]: number } = {};
        tanks.forEach(tank => {
          volumeByProduct[tank.product] = (volumeByProduct[tank.product] || 0) + tank.gsv;
        });
        const volumeByProductChart = Object.entries(volumeByProduct).map(([name, value]) => ({
          name,
          value
        }));

        // Chart data: Status distribution
        const statusDistribution: { [status: string]: number } = {};
        tanks.forEach(tank => {
          statusDistribution[tank.status] = (statusDistribution[tank.status] || 0) + 1;
        });
        const statusDistributionChart = Object.entries(statusDistribution).map(([name, value]) => ({
          name,
          value
        }));

        return {
          generatedAt: Date.now(),
          totalTanks: tanks.length,
          totalVolume,
          totalCapacity,
          averageUtilization,
          tanks,
          charts: {
            utilizationByTank,
            volumeByProduct: volumeByProductChart,
            statusDistribution: statusDistributionChart
          }
        };
      })
    );
  }

  /**
   * Generate Product Inventory by Group Report
   */
  generateProductInventoryByGroup(parameters: ReportParameters): Observable<ProductInventoryGroupData> {
    return this.getTankInventoryData(parameters.tankIds).pipe(
      map(tanks => {
        // Group tanks by product
        const productGroups: { [product: string]: TankInventoryData[] } = {};
        tanks.forEach(tank => {
          if (!productGroups[tank.product]) {
            productGroups[tank.product] = [];
          }
          productGroups[tank.product].push(tank);
        });

        // Calculate totals for each product
        const products = Object.entries(productGroups).map(([productName, productTanks]) => {
          const totalVolume = productTanks.reduce((sum, t) => sum + t.gsv, 0);
          const totalMass = productTanks.reduce((sum, t) => sum + t.mass, 0);
          const totalCapacity = productTanks.reduce((sum, t) => sum + t.capacity, 0);
          const averageUtilization = totalCapacity > 0 ? (totalVolume / totalCapacity) * 100 : 0;

          return {
            productName,
            totalVolume,
            totalMass,
            tankCount: productTanks.length,
            averageUtilization,
            tanks: productTanks
          };
        });

        return {
          generatedAt: Date.now(),
          products
        };
      })
    );
  }

  /**
   * Generate Tank Status Report
   */
  generateTankStatusReport(parameters: ReportParameters): Observable<TankStatusReportData> {
    return this.getTankInventoryData(parameters.tankIds).pipe(
      map(tanks => {
        const statusData = tanks.map(tank => ({
          tankId: tank.tankId,
          tankName: tank.tankName,
          product: tank.product,
          operationalStatus: tank.status === 'Offline' ? 'Offline' as const : 'Online' as const,
          alarmStatus: tank.status === 'Critical' ? 'Critical' as const : 
                      tank.status === 'Warning' ? 'Warning' as const : 'Normal' as const,
          activeAlarms: tank.alarms,
          lastCommunication: tank.lastUpdate,
          deviceHealth: this.calculateDeviceHealth(tank),
          calibrationStatus: this.getCalibrationStatus(tank),
          lastCalibration: tank.lastUpdate - (Math.random() * 90 * 24 * 60 * 60 * 1000) // Mock: random within 90 days
        }));

        return {
          generatedAt: Date.now(),
          tanks: statusData
        };
      })
    );
  }

  /**
   * Generate Capacity Utilization Report
   */
  generateCapacityUtilizationReport(parameters: ReportParameters): Observable<CapacityUtilizationReportData> {
    const startDate = parameters.startDate || Date.now() - (30 * 24 * 60 * 60 * 1000);
    const endDate = parameters.endDate || Date.now();

    return this.getTankInventoryData(parameters.tankIds).pipe(
      map(tanks => {
        const tanksData = tanks.map(tank => {
          // Generate mock historical data
          const historicalData = this.generateMockHistoricalUtilization(startDate, endDate, tank.utilization);
          const utilizationValues = historicalData.map(d => d.utilization);
          const minUtilization = Math.min(...utilizationValues);
          const maxUtilization = Math.max(...utilizationValues);
          const trend = this.calculateTrend(utilizationValues);

          return {
            tankId: tank.tankId,
            tankName: tank.tankName,
            product: tank.product,
            capacity: tank.capacity,
            averageUtilization: tank.utilization,
            minUtilization,
            maxUtilization,
            utilizationTrend: trend,
            historicalData
          };
        });

        const allUtilizations = tanksData.map(t => t.averageUtilization);
        const overall = {
          averageUtilization: allUtilizations.reduce((sum, u) => sum + u, 0) / allUtilizations.length,
          peakUtilization: Math.max(...allUtilizations),
          lowestUtilization: Math.min(...allUtilizations)
        };

        return {
          generatedAt: Date.now(),
          startDate,
          endDate,
          tanks: tanksData,
          overall
        };
      })
    );
  }

  /**
   * Generate Low Stock Alert Report
   */
  generateLowStockAlert(parameters: ReportParameters): Observable<LowStockAlertData> {
    const threshold = parameters.threshold || 20; // Default 20%

    return this.getTankInventoryData(parameters.tankIds).pipe(
      map(tanks => {
        const lowStockTanks = tanks
          .filter(tank => tank.utilization < threshold)
          .map(tank => {
            const daysUntilEmpty = this.calculateDaysUntilEmpty(tank);
            const severity = tank.utilization < 10 ? 'Critical' as const : 'Low' as const;

            return {
              tankId: tank.tankId,
              tankName: tank.tankName,
              product: tank.product,
              currentLevel: tank.level,
              currentVolume: tank.gsv,
              capacity: tank.capacity,
              utilization: tank.utilization,
              daysUntilEmpty,
              severity
            };
          })
          .sort((a, b) => a.utilization - b.utilization);

        return {
          generatedAt: Date.now(),
          threshold,
          tanks: lowStockTanks
        };
      })
    );
  }

  /**
   * Generate Overfill Risk Report
   */
  generateOverfillRisk(parameters: ReportParameters): Observable<OverfillRiskData> {
    const threshold = parameters.threshold || 90; // Default 90%

    return this.getTankInventoryData(parameters.tankIds).pipe(
      map(tanks => {
        const highUtilizationTanks = tanks
          .filter(tank => tank.utilization > threshold)
          .map(tank => {
            const availableCapacity = tank.capacity - tank.gsv;
            const fillRate = this.calculateFillRate(tank); // Mock calculation
            const hoursUntilFull = fillRate > 0 ? availableCapacity / fillRate : Infinity;
            const riskLevel = tank.utilization > 95 ? 'Critical' as const :
                             tank.utilization > 92 ? 'High' as const : 'Medium' as const;

            return {
              tankId: tank.tankId,
              tankName: tank.tankName,
              product: tank.product,
              currentLevel: tank.level,
              currentVolume: tank.gsv,
              capacity: tank.capacity,
              utilization: tank.utilization,
              availableCapacity,
              fillRate,
              hoursUntilFull,
              riskLevel
            };
          })
          .sort((a, b) => b.utilization - a.utilization);

        return {
          generatedAt: Date.now(),
          threshold,
          tanks: highUtilizationTanks
        };
      })
    );
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Get tank inventory data
   */
  private getTankInventoryData(tankIds?: string[]): Observable<TankInventoryData[]> {
    // Mock data for now - replace with actual service calls
    const mockTanks: TankInventoryData[] = [
      {
        tankId: 'tank-001',
        tankName: 'Tank 001',
        product: 'Gasoline 95',
        level: 3250,
        levelUnit: 'mm',
        temperature: 25.5,
        temperatureUnit: '°C',
        tov: 45000,
        gov: 44850,
        gsv: 44700,
        nsv: 44550,
        volumeUnit: 'L',
        density: 0.745,
        densityUnit: 'kg/L',
        mass: 33301.5,
        massUnit: 'kg',
        capacity: 50000,
        utilization: 89.4,
        status: 'Normal',
        lastUpdate: Date.now() - 60000,
        alarms: []
      },
      {
        tankId: 'tank-002',
        tankName: 'Tank 002',
        product: 'Diesel',
        level: 1850,
        levelUnit: 'mm',
        temperature: 24.8,
        temperatureUnit: '°C',
        tov: 25000,
        gov: 24900,
        gsv: 24800,
        nsv: 24700,
        volumeUnit: 'L',
        density: 0.832,
        densityUnit: 'kg/L',
        mass: 20633.6,
        massUnit: 'kg',
        capacity: 50000,
        utilization: 49.6,
        status: 'Normal',
        lastUpdate: Date.now() - 45000,
        alarms: []
      },
      {
        tankId: 'tank-003',
        tankName: 'Tank 003',
        product: 'Gasoline 95',
        level: 850,
        levelUnit: 'mm',
        temperature: 26.2,
        temperatureUnit: '°C',
        tov: 8500,
        gov: 8450,
        gsv: 8400,
        nsv: 8350,
        volumeUnit: 'L',
        density: 0.745,
        densityUnit: 'kg/L',
        mass: 6258,
        massUnit: 'kg',
        capacity: 50000,
        utilization: 16.8,
        status: 'Warning',
        lastUpdate: Date.now() - 120000,
        alarms: ['Low Level Warning']
      }
    ];

    // Filter by tankIds if provided
    const filteredTanks = tankIds && tankIds.length > 0
      ? mockTanks.filter(t => tankIds.includes(t.tankId))
      : mockTanks;

    return of(filteredTanks);
  }

  /**
   * Calculate device health
   */
  private calculateDeviceHealth(tank: TankInventoryData): 'Good' | 'Fair' | 'Poor' {
    const timeSinceUpdate = Date.now() - tank.lastUpdate;
    if (timeSinceUpdate < 5 * 60 * 1000) return 'Good'; // < 5 minutes
    if (timeSinceUpdate < 30 * 60 * 1000) return 'Fair'; // < 30 minutes
    return 'Poor';
  }

  /**
   * Get calibration status
   */
  private getCalibrationStatus(tank: TankInventoryData): 'Valid' | 'Due' | 'Overdue' {
    // Mock implementation - in production, check actual calibration dates
    const random = Math.random();
    if (random > 0.8) return 'Due';
    if (random > 0.95) return 'Overdue';
    return 'Valid';
  }

  /**
   * Generate mock historical utilization data
   */
  private generateMockHistoricalUtilization(
    startDate: number,
    endDate: number,
    currentUtilization: number
  ): { timestamp: number; utilization: number }[] {
    const data: { timestamp: number; utilization: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.floor((endDate - startDate) / dayMs);

    for (let i = 0; i <= days; i++) {
      const timestamp = startDate + (i * dayMs);
      const variation = (Math.random() - 0.5) * 10; // ±5%
      const utilization = Math.max(0, Math.min(100, currentUtilization + variation));
      data.push({ timestamp, utilization });
    }

    return data;
  }

  /**
   * Calculate trend from utilization values
   */
  private calculateTrend(values: number[]): 'Increasing' | 'Decreasing' | 'Stable' {
    if (values.length < 2) return 'Stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const avgFirst = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    const diff = avgSecond - avgFirst;
    if (Math.abs(diff) < 2) return 'Stable';
    return diff > 0 ? 'Increasing' : 'Decreasing';
  }

  /**
   * Calculate days until empty (mock)
   */
  private calculateDaysUntilEmpty(tank: TankInventoryData): number {
    // Mock calculation - in production, use historical consumption data
    const consumptionRate = tank.capacity * 0.02; // 2% per day
    return tank.gsv / consumptionRate;
  }

  /**
   * Calculate fill rate (mock)
   */
  private calculateFillRate(tank: TankInventoryData): number {
    // Mock calculation - in production, use historical fill data
    return Math.random() * 100 + 50; // 50-150 L/hour
  }
}
