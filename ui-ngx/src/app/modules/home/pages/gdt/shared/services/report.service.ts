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
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import {
  ReportType,
  ReportCategory,
  ReportFormat,
  ReportStatus,
  ReportInfo,
  ReportParameters,
  ReportGenerationRequest,
  ReportGenerationResponse,
  ScheduledReport,
  ReportExecution,
  ReportStatistics,
  ScheduleFrequency,
  ExportDestinationType,
  REPORT_INFO_MAP,
  getReportInfo,
  getReportsByCategory
} from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private readonly API_BASE = '/api/reports';
  private readonly USE_MOCK_DATA = false; // Backend is now ready

  constructor(private http: HttpClient) {}

  /**
   * Get all available report types
   */
  getAvailableReports(): Observable<ReportInfo[]> {
    return of(Object.values(REPORT_INFO_MAP));
  }

  /**
   * Get reports by category
   */
  getReportsByCategory(category: ReportCategory): Observable<ReportInfo[]> {
    return of(getReportsByCategory(category));
  }

  /**
   * Get report information
   */
  getReportInfo(type: ReportType): Observable<ReportInfo> {
    return of(getReportInfo(type));
  }

  /**
   * Generate a report
   */
  generateReport(request: ReportGenerationRequest): Observable<ReportGenerationResponse> {
    if (this.USE_MOCK_DATA) {
      return this.generateReportMock(request);
    }

    return this.http.post<ReportGenerationResponse>(`${this.API_BASE}/generate`, request)
      .pipe(
        catchError(error => {
          console.error('Error generating report:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get report status
   */
  getReportStatus(reportId: string): Observable<ReportGenerationResponse> {
    if (this.USE_MOCK_DATA) {
      return this.getReportStatusMock(reportId);
    }

    return this.http.get<ReportGenerationResponse>(`${this.API_BASE}/${reportId}/status`)
      .pipe(
        catchError(error => {
          console.error('Error getting report status:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Download report
   */
  downloadReport(reportId: string, format: ReportFormat): Observable<Blob> {
    if (this.USE_MOCK_DATA) {
      return this.downloadReportMock(reportId, format);
    }

    return this.http.get(`${this.API_BASE}/${reportId}/download`, {
      responseType: 'blob',
      params: new HttpParams().set('format', format)
    }).pipe(
      catchError(error => {
        console.error('Error downloading report:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get scheduled reports
   */
  getScheduledReports(): Observable<ScheduledReport[]> {
    if (this.USE_MOCK_DATA) {
      return this.getScheduledReportsMock();
    }

    return this.http.get<ScheduledReport[]>(`${this.API_BASE}/scheduled`)
      .pipe(
        catchError(error => {
          console.error('Error getting scheduled reports:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create scheduled report
   */
  createScheduledReport(report: ScheduledReport): Observable<ScheduledReport> {
    if (this.USE_MOCK_DATA) {
      return this.createScheduledReportMock(report);
    }

    return this.http.post<ScheduledReport>(`${this.API_BASE}/scheduled`, report)
      .pipe(
        catchError(error => {
          console.error('Error creating scheduled report:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update scheduled report
   */
  updateScheduledReport(id: string, report: ScheduledReport): Observable<ScheduledReport> {
    if (this.USE_MOCK_DATA) {
      return this.updateScheduledReportMock(id, report);
    }

    return this.http.put<ScheduledReport>(`${this.API_BASE}/scheduled/${id}`, report)
      .pipe(
        catchError(error => {
          console.error('Error updating scheduled report:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete scheduled report
   */
  deleteScheduledReport(id: string): Observable<void> {
    if (this.USE_MOCK_DATA) {
      return this.deleteScheduledReportMock(id);
    }

    return this.http.delete<void>(`${this.API_BASE}/scheduled/${id}`)
      .pipe(
        catchError(error => {
          console.error('Error deleting scheduled report:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Run scheduled report now
   */
  runScheduledReport(id: string): Observable<ReportGenerationResponse> {
    if (this.USE_MOCK_DATA) {
      return this.runScheduledReportMock(id);
    }

    return this.http.post<ReportGenerationResponse>(`${this.API_BASE}/scheduled/${id}/run`, {})
      .pipe(
        catchError(error => {
          console.error('Error running scheduled report:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get report execution history
   */
  getReportExecutions(scheduledReportId?: string, limit: number = 50): Observable<ReportExecution[]> {
    if (this.USE_MOCK_DATA) {
      return this.getReportExecutionsMock(scheduledReportId, limit);
    }

    let params = new HttpParams().set('limit', limit.toString());
    if (scheduledReportId) {
      params = params.set('scheduledReportId', scheduledReportId);
    }

    return this.http.get<ReportExecution[]>(`${this.API_BASE}/executions`, { params })
      .pipe(
        catchError(error => {
          console.error('Error getting report executions:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get report statistics
   */
  getReportStatistics(): Observable<ReportStatistics> {
    if (this.USE_MOCK_DATA) {
      return this.getReportStatisticsMock();
    }

    return this.http.get<ReportStatistics>(`${this.API_BASE}/statistics`)
      .pipe(
        catchError(error => {
          console.error('Error getting report statistics:', error);
          return throwError(() => error);
        })
      );
  }

  // ==================== MOCK DATA METHODS ====================

  private generateReportMock(request: ReportGenerationRequest): Observable<ReportGenerationResponse> {
    const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return of({
      reportId,
      status: ReportStatus.GENERATING,
      fileName: `${request.reportType}_${Date.now()}.${request.format}`,
      generatedAt: Date.now()
    }).pipe(
      delay(2000),
      map(response => ({
        ...response,
        status: ReportStatus.COMPLETED,
        downloadUrl: `/api/gdt/reports/${reportId}/download`,
        fileSize: Math.floor(Math.random() * 1000000) + 100000
      }))
    );
  }

  private getReportStatusMock(reportId: string): Observable<ReportGenerationResponse> {
    return of({
      reportId,
      status: ReportStatus.COMPLETED,
      downloadUrl: `/api/gdt/reports/${reportId}/download`,
      fileName: `report_${Date.now()}.pdf`,
      fileSize: 524288,
      generatedAt: Date.now()
    });
  }

  private downloadReportMock(reportId: string, format: ReportFormat): Observable<Blob> {
    // Create a mock PDF blob
    const content = `Mock ${format.toUpperCase()} Report Content\nReport ID: ${reportId}\nGenerated: ${new Date().toISOString()}`;
    const blob = new Blob([content], { type: this.getMimeType(format) });
    return of(blob).pipe(delay(500));
  }

  private getScheduledReportsMock(): Observable<ScheduledReport[]> {
    const mockReports: ScheduledReport[] = [
      {
        id: 'SR-001',
        name: 'Daily Inventory Report - All Tanks',
        description: 'Automated daily inventory report for all tanks',
        enabled: true,
        reportType: ReportType.DAILY_INVENTORY,
        format: [ReportFormat.PDF, ReportFormat.EXCEL],
        schedule: {
          frequency: ScheduleFrequency.DAILY,
          time: '23:59',
          timezone: 'UTC'
        },
        parameters: {
          includeCharts: true
        },
        destinations: [
          {
            type: ExportDestinationType.EMAIL,
            config: {
              recipients: ['manager@company.com', 'operator@company.com'],
              subject: 'Daily Inventory Report - {{date}}'
            }
          }
        ],
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notificationEmails: ['admin@company.com'],
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        lastRunAt: Date.now() - 24 * 60 * 60 * 1000,
        nextRunAt: Date.now() + 60 * 60 * 1000
      },
      {
        id: 'SR-002',
        name: 'Weekly Mass Balance Report',
        description: 'Weekly mass balance analysis',
        enabled: true,
        reportType: ReportType.MASS_BALANCE,
        format: [ReportFormat.PDF],
        schedule: {
          frequency: ScheduleFrequency.WEEKLY,
          time: '00:00',
          timezone: 'UTC',
          daysOfWeek: [1] // Monday
        },
        parameters: {
          startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
          endDate: Date.now()
        },
        destinations: [
          {
            type: ExportDestinationType.EMAIL,
            config: {
              recipients: ['supervisor@company.com'],
              subject: 'Weekly Mass Balance Report'
            }
          }
        ],
        notifyOnSuccess: true,
        notifyOnFailure: true,
        notificationEmails: ['admin@company.com'],
        createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
        lastRunAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        nextRunAt: Date.now() + 6 * 24 * 60 * 60 * 1000
      }
    ];

    return of(mockReports);
  }

  private createScheduledReportMock(report: ScheduledReport): Observable<ScheduledReport> {
    const newReport: ScheduledReport = {
      ...report,
      id: `SR-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nextRunAt: this.calculateNextRun(report.schedule)
    };
    return of(newReport).pipe(delay(500));
  }

  private updateScheduledReportMock(id: string, report: ScheduledReport): Observable<ScheduledReport> {
    const updatedReport: ScheduledReport = {
      ...report,
      id,
      updatedAt: Date.now(),
      nextRunAt: this.calculateNextRun(report.schedule)
    };
    return of(updatedReport).pipe(delay(500));
  }

  private deleteScheduledReportMock(id: string): Observable<void> {
    return of(void 0).pipe(delay(300));
  }

  private runScheduledReportMock(id: string): Observable<ReportGenerationResponse> {
    return of({
      reportId: `RPT-${Date.now()}`,
      status: ReportStatus.GENERATING,
      generatedAt: Date.now()
    }).pipe(
      delay(2000),
      map(response => ({
        ...response,
        status: ReportStatus.COMPLETED,
        downloadUrl: `/api/gdt/reports/${response.reportId}/download`,
        fileName: `scheduled_report_${Date.now()}.pdf`,
        fileSize: 524288
      }))
    );
  }

  private getReportExecutionsMock(scheduledReportId?: string, limit: number = 50): Observable<ReportExecution[]> {
    const mockExecutions: ReportExecution[] = [];
    const now = Date.now();

    for (let i = 0; i < Math.min(limit, 20); i++) {
      const startedAt = now - (i * 24 * 60 * 60 * 1000);
      const duration = Math.floor(Math.random() * 30000) + 5000;
      const status = Math.random() > 0.1 ? ReportStatus.COMPLETED : ReportStatus.FAILED;

      mockExecutions.push({
        id: `EXE-${startedAt}-${i}`,
        scheduledReportId: scheduledReportId || (i % 2 === 0 ? 'SR-001' : 'SR-002'),
        reportType: i % 2 === 0 ? ReportType.DAILY_INVENTORY : ReportType.MASS_BALANCE,
        format: ReportFormat.PDF,
        status,
        startedAt,
        completedAt: startedAt + duration,
        duration,
        outputFiles: status === ReportStatus.COMPLETED ? [
          {
            fileName: `report_${startedAt}.pdf`,
            format: ReportFormat.PDF,
            size: Math.floor(Math.random() * 1000000) + 100000,
            downloadUrl: `/api/gdt/reports/EXE-${startedAt}-${i}/download`,
            generatedAt: startedAt + duration
          }
        ] : undefined,
        error: status === ReportStatus.FAILED ? 'Failed to generate report: Connection timeout' : undefined,
        parameters: {
          includeCharts: true
        }
      });
    }

    return of(mockExecutions);
  }

  private getReportStatisticsMock(): Observable<ReportStatistics> {
    return of({
      totalReports: 1247,
      reportsByType: {
        [ReportType.DAILY_INVENTORY]: 365,
        [ReportType.MASS_BALANCE]: 52,
        [ReportType.BATCH_TRANSFER]: 420,
        [ReportType.TANK_STATUS]: 180,
        [ReportType.ALARM_HISTORY]: 120
      },
      reportsByStatus: {
        [ReportStatus.COMPLETED]: 1198,
        [ReportStatus.FAILED]: 49,
        [ReportStatus.GENERATING]: 0,
        [ReportStatus.PENDING]: 0
      },
      averageGenerationTime: 18500, // milliseconds
      totalFileSize: 2147483648 // 2 GB
    });
  }

  private calculateNextRun(schedule: any): number {
    // Simplified calculation - in production, use a proper cron library
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    if (nextRun <= now) {
      if (schedule.frequency === 'daily') {
        nextRun.setDate(nextRun.getDate() + 1);
      } else if (schedule.frequency === 'weekly') {
        nextRun.setDate(nextRun.getDate() + 7);
      } else if (schedule.frequency === 'monthly') {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    }
    
    return nextRun.getTime();
  }

  private getMimeType(format: ReportFormat): string {
    const mimeTypes = {
      [ReportFormat.PDF]: 'application/pdf',
      [ReportFormat.EXCEL]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [ReportFormat.CSV]: 'text/csv'
    };
    return mimeTypes[format];
  }
}
