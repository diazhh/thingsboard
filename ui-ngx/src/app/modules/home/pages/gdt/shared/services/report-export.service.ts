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
import { ReportFormat } from '../models/report.model';
import {
  DailyInventoryReportData,
  TankInventorySummaryData,
  ProductInventoryGroupData,
  TankStatusReportData,
  CapacityUtilizationReportData,
  LowStockAlertData,
  OverfillRiskData
} from './report-generators/inventory-report-generator.service';

@Injectable({
  providedIn: 'root'
})
export class ReportExportService {

  constructor() {}

  /**
   * Export Daily Inventory Report
   */
  exportDailyInventory(data: DailyInventoryReportData, format: ReportFormat): void {
    switch (format) {
      case ReportFormat.PDF:
        this.exportDailyInventoryPDF(data);
        break;
      case ReportFormat.EXCEL:
        this.exportDailyInventoryExcel(data);
        break;
      case ReportFormat.CSV:
        this.exportDailyInventoryCSV(data);
        break;
    }
  }

  /**
   * Export Tank Inventory Summary
   */
  exportTankInventorySummary(data: TankInventorySummaryData, format: ReportFormat): void {
    switch (format) {
      case ReportFormat.PDF:
        this.exportTankInventorySummaryPDF(data);
        break;
      case ReportFormat.EXCEL:
        this.exportTankInventorySummaryExcel(data);
        break;
      case ReportFormat.CSV:
        this.exportTankInventorySummaryCSV(data);
        break;
    }
  }

  /**
   * Export Product Inventory by Group
   */
  exportProductInventoryByGroup(data: ProductInventoryGroupData, format: ReportFormat): void {
    switch (format) {
      case ReportFormat.PDF:
        this.exportProductInventoryPDF(data);
        break;
      case ReportFormat.EXCEL:
        this.exportProductInventoryExcel(data);
        break;
      case ReportFormat.CSV:
        this.exportProductInventoryCSV(data);
        break;
    }
  }

  /**
   * Export Tank Status Report
   */
  exportTankStatusReport(data: TankStatusReportData, format: ReportFormat): void {
    switch (format) {
      case ReportFormat.PDF:
        this.exportTankStatusPDF(data);
        break;
      case ReportFormat.EXCEL:
        this.exportTankStatusExcel(data);
        break;
      case ReportFormat.CSV:
        this.exportTankStatusCSV(data);
        break;
    }
  }

  /**
   * Export Capacity Utilization Report
   */
  exportCapacityUtilization(data: CapacityUtilizationReportData, format: ReportFormat): void {
    switch (format) {
      case ReportFormat.PDF:
        this.exportCapacityUtilizationPDF(data);
        break;
      case ReportFormat.EXCEL:
        this.exportCapacityUtilizationExcel(data);
        break;
      case ReportFormat.CSV:
        this.exportCapacityUtilizationCSV(data);
        break;
    }
  }

  /**
   * Export Low Stock Alert
   */
  exportLowStockAlert(data: LowStockAlertData, format: ReportFormat): void {
    switch (format) {
      case ReportFormat.PDF:
        this.exportLowStockAlertPDF(data);
        break;
      case ReportFormat.EXCEL:
        this.exportLowStockAlertExcel(data);
        break;
      case ReportFormat.CSV:
        this.exportLowStockAlertCSV(data);
        break;
    }
  }

  /**
   * Export Overfill Risk Report
   */
  exportOverfillRisk(data: OverfillRiskData, format: ReportFormat): void {
    switch (format) {
      case ReportFormat.PDF:
        this.exportOverfillRiskPDF(data);
        break;
      case ReportFormat.EXCEL:
        this.exportOverfillRiskExcel(data);
        break;
      case ReportFormat.CSV:
        this.exportOverfillRiskCSV(data);
        break;
    }
  }

  // ==================== CSV EXPORT METHODS ====================

  private exportDailyInventoryCSV(data: DailyInventoryReportData): void {
    const headers = [
      'Tank ID', 'Tank Name', 'Product', 'Level (mm)', 'Temperature (°C)',
      'TOV (L)', 'GOV (L)', 'GSV (L)', 'NSV (L)', 'Density (kg/L)',
      'Mass (kg)', 'Capacity (L)', 'Utilization (%)', 'Status', 'Last Update'
    ];

    const rows = data.tanks.map(tank => [
      tank.tankId,
      tank.tankName,
      tank.product,
      tank.level.toFixed(2),
      tank.temperature.toFixed(2),
      tank.tov.toFixed(2),
      tank.gov.toFixed(2),
      tank.gsv.toFixed(2),
      tank.nsv.toFixed(2),
      tank.density.toFixed(3),
      tank.mass.toFixed(2),
      tank.capacity.toFixed(2),
      tank.utilization.toFixed(2),
      tank.status,
      new Date(tank.lastUpdate).toISOString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    this.downloadCSV(csvContent, `daily_inventory_${this.getDateString(data.reportDate)}.csv`);
  }

  private exportTankInventorySummaryCSV(data: TankInventorySummaryData): void {
    this.exportDailyInventoryCSV({
      reportDate: data.generatedAt,
      generatedAt: data.generatedAt,
      totalTanks: data.totalTanks,
      activeTanks: data.totalTanks,
      totalVolume: data.totalVolume,
      totalCapacity: data.totalCapacity,
      averageUtilization: data.averageUtilization,
      tanks: data.tanks,
      summary: { byProduct: {}, byStatus: {} }
    });
  }

  private exportProductInventoryCSV(data: ProductInventoryGroupData): void {
    const headers = ['Product', 'Total Volume (L)', 'Total Mass (kg)', 'Tank Count', 'Avg Utilization (%)'];
    const rows = data.products.map(p => [
      p.productName,
      p.totalVolume.toFixed(2),
      p.totalMass.toFixed(2),
      p.tankCount.toString(),
      p.averageUtilization.toFixed(2)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    this.downloadCSV(csvContent, `product_inventory_${this.getDateString()}.csv`);
  }

  private exportTankStatusCSV(data: TankStatusReportData): void {
    const headers = [
      'Tank ID', 'Tank Name', 'Product', 'Operational Status', 'Alarm Status',
      'Active Alarms', 'Last Communication', 'Device Health', 'Calibration Status'
    ];

    const rows = data.tanks.map(tank => [
      tank.tankId,
      tank.tankName,
      tank.product,
      tank.operationalStatus,
      tank.alarmStatus,
      tank.activeAlarms.join('; '),
      new Date(tank.lastCommunication).toISOString(),
      tank.deviceHealth,
      tank.calibrationStatus
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    this.downloadCSV(csvContent, `tank_status_${this.getDateString()}.csv`);
  }

  private exportCapacityUtilizationCSV(data: CapacityUtilizationReportData): void {
    const headers = [
      'Tank ID', 'Tank Name', 'Product', 'Capacity (L)', 'Avg Utilization (%)',
      'Min Utilization (%)', 'Max Utilization (%)', 'Trend'
    ];

    const rows = data.tanks.map(tank => [
      tank.tankId,
      tank.tankName,
      tank.product,
      tank.capacity.toFixed(2),
      tank.averageUtilization.toFixed(2),
      tank.minUtilization.toFixed(2),
      tank.maxUtilization.toFixed(2),
      tank.utilizationTrend
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    this.downloadCSV(csvContent, `capacity_utilization_${this.getDateString()}.csv`);
  }

  private exportLowStockAlertCSV(data: LowStockAlertData): void {
    const headers = [
      'Tank ID', 'Tank Name', 'Product', 'Current Level (mm)', 'Current Volume (L)',
      'Capacity (L)', 'Utilization (%)', 'Days Until Empty', 'Severity'
    ];

    const rows = data.tanks.map(tank => [
      tank.tankId,
      tank.tankName,
      tank.product,
      tank.currentLevel.toFixed(2),
      tank.currentVolume.toFixed(2),
      tank.capacity.toFixed(2),
      tank.utilization.toFixed(2),
      tank.daysUntilEmpty.toFixed(1),
      tank.severity
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    this.downloadCSV(csvContent, `low_stock_alert_${this.getDateString()}.csv`);
  }

  private exportOverfillRiskCSV(data: OverfillRiskData): void {
    const headers = [
      'Tank ID', 'Tank Name', 'Product', 'Current Level (mm)', 'Current Volume (L)',
      'Capacity (L)', 'Utilization (%)', 'Available Capacity (L)', 'Fill Rate (L/h)',
      'Hours Until Full', 'Risk Level'
    ];

    const rows = data.tanks.map(tank => [
      tank.tankId,
      tank.tankName,
      tank.product,
      tank.currentLevel.toFixed(2),
      tank.currentVolume.toFixed(2),
      tank.capacity.toFixed(2),
      tank.utilization.toFixed(2),
      tank.availableCapacity.toFixed(2),
      tank.fillRate.toFixed(2),
      tank.hoursUntilFull.toFixed(1),
      tank.riskLevel
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    this.downloadCSV(csvContent, `overfill_risk_${this.getDateString()}.csv`);
  }

  // ==================== PDF EXPORT METHODS (MOCK) ====================

  private exportDailyInventoryPDF(data: DailyInventoryReportData): void {
    console.log('PDF export not yet implemented. Data:', data);
    alert('PDF export will be implemented with backend support. For now, use CSV or Excel format.');
  }

  private exportTankInventorySummaryPDF(data: TankInventorySummaryData): void {
    console.log('PDF export not yet implemented. Data:', data);
    alert('PDF export will be implemented with backend support. For now, use CSV or Excel format.');
  }

  private exportProductInventoryPDF(data: ProductInventoryGroupData): void {
    console.log('PDF export not yet implemented. Data:', data);
    alert('PDF export will be implemented with backend support. For now, use CSV or Excel format.');
  }

  private exportTankStatusPDF(data: TankStatusReportData): void {
    console.log('PDF export not yet implemented. Data:', data);
    alert('PDF export will be implemented with backend support. For now, use CSV or Excel format.');
  }

  private exportCapacityUtilizationPDF(data: CapacityUtilizationReportData): void {
    console.log('PDF export not yet implemented. Data:', data);
    alert('PDF export will be implemented with backend support. For now, use CSV or Excel format.');
  }

  private exportLowStockAlertPDF(data: LowStockAlertData): void {
    console.log('PDF export not yet implemented. Data:', data);
    alert('PDF export will be implemented with backend support. For now, use CSV or Excel format.');
  }

  private exportOverfillRiskPDF(data: OverfillRiskData): void {
    console.log('PDF export not yet implemented. Data:', data);
    alert('PDF export will be implemented with backend support. For now, use CSV or Excel format.');
  }

  // ==================== EXCEL EXPORT METHODS (MOCK) ====================

  private exportDailyInventoryExcel(data: DailyInventoryReportData): void {
    console.log('Excel export not yet implemented. Data:', data);
    alert('Excel export will be implemented with a library like SheetJS. For now, use CSV format.');
  }

  private exportTankInventorySummaryExcel(data: TankInventorySummaryData): void {
    console.log('Excel export not yet implemented. Data:', data);
    alert('Excel export will be implemented with a library like SheetJS. For now, use CSV format.');
  }

  private exportProductInventoryExcel(data: ProductInventoryGroupData): void {
    console.log('Excel export not yet implemented. Data:', data);
    alert('Excel export will be implemented with a library like SheetJS. For now, use CSV format.');
  }

  private exportTankStatusExcel(data: TankStatusReportData): void {
    console.log('Excel export not yet implemented. Data:', data);
    alert('Excel export will be implemented with a library like SheetJS. For now, use CSV format.');
  }

  private exportCapacityUtilizationExcel(data: CapacityUtilizationReportData): void {
    console.log('Excel export not yet implemented. Data:', data);
    alert('Excel export will be implemented with a library like SheetJS. For now, use CSV format.');
  }

  private exportLowStockAlertExcel(data: LowStockAlertData): void {
    console.log('Excel export not yet implemented. Data:', data);
    alert('Excel export will be implemented with a library like SheetJS. For now, use CSV format.');
  }

  private exportOverfillRiskExcel(data: OverfillRiskData): void {
    console.log('Excel export not yet implemented. Data:', data);
    alert('Excel export will be implemented with a library like SheetJS. For now, use CSV format.');
  }

  // ==================== HELPER METHODS ====================

  /**
   * Download CSV file
   */
  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Get date string for filename
   */
  private getDateString(timestamp?: number): string {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toISOString().split('T')[0];
  }
}
