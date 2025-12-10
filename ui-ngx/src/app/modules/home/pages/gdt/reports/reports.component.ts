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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject, throwError } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  ReportType,
  ReportCategory,
  ReportFormat,
  ReportInfo,
  ReportGenerationRequest,
  ReportGenerationResponse,
  ReportStatus,
  getReportCategoryLabel
} from '../shared/models/report.model';
import { ReportService } from '../shared/services/report.service';
import { InventoryReportGeneratorService } from '../shared/services/report-generators/inventory-report-generator.service';
import { ReportExportService } from '../shared/services/report-export.service';
import { GenerateReportDialogComponent } from './components/generate-report-dialog/generate-report-dialog.component';

@Component({
  selector: 'tb-gdt-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // Report categories (excluding ANALYSIS for now)
  reportCategories = Object.values(ReportCategory).filter(cat => cat !== ReportCategory.ANALYSIS);
  selectedCategory: ReportCategory = ReportCategory.INVENTORY;
  selectedCategoryIndex = 0;

  // Available reports
  availableReports: ReportInfo[] = [];
  filteredReports: ReportInfo[] = [];

  // Search and filter
  searchText = '';

  // Recent reports
  recentReports: ReportGenerationResponse[] = [];
  loadingRecent = false;

  // Loading states
  loading = false;

  constructor(
    private reportService: ReportService,
    private inventoryGenerator: InventoryReportGeneratorService,
    private reportExport: ReportExportService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadAvailableReports();
    this.loadRecentReports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load available reports
   */
  loadAvailableReports(): void {
    this.loading = true;
    this.reportService.getAvailableReports()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reports) => {
          // Filter only ready reports (backend implemented)
          this.availableReports = reports.filter(report => report.ready !== false);
          this.filterReports();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading reports:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Load recent reports
   */
  loadRecentReports(): void {
    this.loadingRecent = true;
    // TODO: Implement getRecentReports in service
    // For now, just set empty array
    this.recentReports = [];
    this.loadingRecent = false;
  }

  /**
   * Filter reports by category and search text
   */
  filterReports(): void {
    this.filteredReports = this.availableReports.filter(report => {
      const matchesCategory = !this.selectedCategory || report.category === this.selectedCategory;
      const matchesSearch = !this.searchText ||
        report.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
        report.description.toLowerCase().includes(this.searchText.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  /**
   * Handle category change
   */
  onCategoryChange(): void {
    this.filterReports();
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    this.searchText = '';
    this.selectedCategory = null;
    this.filterReports();
  }

  /**
   * Handle search text change
   */
  onSearchChange(): void {
    this.filterReports();
  }

  /**
   * Generate report
   */
  generateReport(reportInfo: ReportInfo): void {
    const dialogRef = this.dialog.open(GenerateReportDialogComponent, {
      width: '800px',
      data: { reportInfo }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.executeReportGeneration(result);
      }
    });
  }

  /**
   * Execute report generation
   */
  private executeReportGeneration(request: ReportGenerationRequest): void {
    // Use backend API to generate report
    this.reportService.generateReport(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Report generation response:', response);
          
          if (response.status === ReportStatus.COMPLETED) {
            console.log('Report completed, downloading...');
            // Download the generated report
            if (response.fileContent) {
              // Download from Base64 content
              this.downloadReportFromBase64(response);
            } else if (response.downloadUrl) {
              // Download from URL
              this.downloadReport(response);
            } else {
              console.warn('No download method available');
            }
          } else if (response.status === ReportStatus.FAILED) {
            console.error('Report generation failed:', response.error);
            // TODO: Show error notification
          }
          this.loadRecentReports();
        },
        error: (error) => {
          console.error('Error generating report:', error);
          // TODO: Show error notification
        }
      });
  }
  
  /**
   * Download report from Base64 content
   */
  private downloadReportFromBase64(response: ReportGenerationResponse): void {
    try {
      // Decode Base64 to binary
      const binaryString = atob(response.fileContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob and download
      const blob = new Blob([bytes], { type: this.getMimeType(response.format) });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.fileName || `report_${response.reportId}.${response.format}`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      console.log('Report downloaded successfully:', response.fileName);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  }
  
  /**
   * Get MIME type for report format
   */
  private getMimeType(format: ReportFormat): string {
    switch (format) {
      case ReportFormat.PDF:
        return 'application/pdf';
      case ReportFormat.EXCEL:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case ReportFormat.CSV:
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Generate report data based on type
   */
  private generateReportData(request: ReportGenerationRequest): Observable<any> {
    switch (request.reportType) {
      case ReportType.DAILY_INVENTORY:
        return this.inventoryGenerator.generateDailyInventoryReport(request.parameters);
      case ReportType.TANK_INVENTORY_SUMMARY:
        return this.inventoryGenerator.generateTankInventorySummary(request.parameters);
      case ReportType.PRODUCT_INVENTORY_BY_GROUP:
        return this.inventoryGenerator.generateProductInventoryByGroup(request.parameters);
      case ReportType.TANK_STATUS:
        return this.inventoryGenerator.generateTankStatusReport(request.parameters);
      case ReportType.CAPACITY_UTILIZATION:
        return this.inventoryGenerator.generateCapacityUtilizationReport(request.parameters);
      case ReportType.LOW_STOCK_ALERT:
        return this.inventoryGenerator.generateLowStockAlert(request.parameters);
      case ReportType.OVERFILL_RISK:
        return this.inventoryGenerator.generateOverfillRisk(request.parameters);
      default:
        return throwError(() => new Error(`Report type ${request.reportType} not yet implemented`));
    }
  }

  /**
   * Export report data in the requested format
   */
  private exportReportData(reportType: ReportType, data: any, format: ReportFormat): void {
    switch (reportType) {
      case ReportType.DAILY_INVENTORY:
        this.reportExport.exportDailyInventory(data, format);
        break;
      case ReportType.TANK_INVENTORY_SUMMARY:
        this.reportExport.exportTankInventorySummary(data, format);
        break;
      case ReportType.PRODUCT_INVENTORY_BY_GROUP:
        this.reportExport.exportProductInventoryByGroup(data, format);
        break;
      case ReportType.TANK_STATUS:
        this.reportExport.exportTankStatusReport(data, format);
        break;
      case ReportType.CAPACITY_UTILIZATION:
        this.reportExport.exportCapacityUtilization(data, format);
        break;
      case ReportType.LOW_STOCK_ALERT:
        this.reportExport.exportLowStockAlert(data, format);
        break;
      case ReportType.OVERFILL_RISK:
        this.reportExport.exportOverfillRisk(data, format);
        break;
      default:
        console.error(`Export for report type ${reportType} not yet implemented`);
    }
  }

  /**
   * Download report
   */
  private downloadReport(response: ReportGenerationResponse): void {
    if (response.downloadUrl) {
      window.open(response.downloadUrl, '_blank');
    }
  }

  /**
   * Get category label
   */
  getCategoryLabel(category: ReportCategory): string {
    return getReportCategoryLabel(category);
  }

  /**
   * Get category icon
   */
  getCategoryIcon(category: ReportCategory): string {
    const icons = {
      [ReportCategory.INVENTORY]: 'inventory',
      [ReportCategory.CUSTODY_TRANSFER]: 'swap_horiz',
      [ReportCategory.ANALYSIS]: 'analytics',
      [ReportCategory.HISTORICAL]: 'history',
      [ReportCategory.COMPLIANCE]: 'verified'
    };
    return icons[category];
  }

  /**
   * Get format badge color
   */
  getFormatColor(format: ReportFormat): string {
    const colors = {
      [ReportFormat.PDF]: 'red',
      [ReportFormat.EXCEL]: 'green',
      [ReportFormat.CSV]: 'blue'
    };
    return colors[format];
  }
}
