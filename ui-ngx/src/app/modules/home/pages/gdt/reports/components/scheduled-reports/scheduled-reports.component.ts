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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ScheduledReportConfig, ScheduledReportExecution } from '../../models/scheduled-report.model';
import { ScheduledReportService } from '../../services/scheduled-report.service';
import { ScheduledReportConfigDialogComponent } from '../scheduled-report-config-dialog/scheduled-report-config-dialog.component';

@Component({
  selector: 'tb-scheduled-reports',
  templateUrl: './scheduled-reports.component.html',
  styleUrls: ['./scheduled-reports.component.scss']
})
export class ScheduledReportsComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  scheduledReports: ScheduledReportConfig[] = [];
  selectedReport: ScheduledReportConfig | null = null;
  executionHistory: ScheduledReportExecution[] = [];
  loading = false;
  loadingHistory = false;

  displayedColumns: string[] = ['name', 'reportType', 'cronExpression', 'timezone', 'enabled', 'lastExecutionStatus', 'actions'];
  historyColumns: string[] = ['startTime', 'status', 'duration', 'exportFormats', 'actions'];

  constructor(
    private scheduledReportService: ScheduledReportService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadScheduledReports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadScheduledReports(): void {
    this.loading = true;
    this.scheduledReportService.getScheduledReports()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reports) => {
          this.scheduledReports = reports;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading scheduled reports', error);
          this.snackBar.open('Error al cargar reportes programados', 'Cerrar', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  createScheduledReport(): void {
    const dialogRef = this.dialog.open(ScheduledReportConfigDialogComponent, {
      width: '800px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.saveScheduledReport(result);
      }
    });
  }

  editScheduledReport(report: ScheduledReportConfig): void {
    const dialogRef = this.dialog.open(ScheduledReportConfigDialogComponent, {
      width: '800px',
      data: { mode: 'edit', report: { ...report } }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateScheduledReport(result);
      }
    });
  }

  saveScheduledReport(report: ScheduledReportConfig): void {
    this.scheduledReportService.createScheduledReport(report)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created) => {
          this.scheduledReports.push(created);
          this.snackBar.open('Reporte programado creado exitosamente', 'Cerrar', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error creating scheduled report', error);
          this.snackBar.open('Error al crear reporte programado', 'Cerrar', { duration: 3000 });
        }
      });
  }

  updateScheduledReport(report: ScheduledReportConfig): void {
    if (!report.id) {
      return;
    }

    this.scheduledReportService.updateScheduledReport(report.id, report)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.scheduledReports.findIndex(r => r.id === report.id);
          if (index !== -1) {
            this.scheduledReports[index] = updated;
          }
          this.snackBar.open('Reporte programado actualizado exitosamente', 'Cerrar', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error updating scheduled report', error);
          this.snackBar.open('Error al actualizar reporte programado', 'Cerrar', { duration: 3000 });
        }
      });
  }

  deleteScheduledReport(report: ScheduledReportConfig): void {
    if (!report.id) {
      return;
    }

    if (confirm(`¿Está seguro de eliminar el reporte programado "${report.name}"?`)) {
      this.scheduledReportService.deleteScheduledReport(report.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            const index = this.scheduledReports.findIndex(r => r.id === report.id);
            if (index !== -1) {
              this.scheduledReports.splice(index, 1);
            }
            this.snackBar.open('Reporte programado eliminado exitosamente', 'Cerrar', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error deleting scheduled report', error);
            this.snackBar.open('Error al eliminar reporte programado', 'Cerrar', { duration: 3000 });
          }
        });
    }
  }

  toggleEnabled(report: ScheduledReportConfig): void {
    if (!report.id) {
      return;
    }

    const action = report.enabled ? 'disable' : 'enable';
    const service$ = report.enabled 
      ? this.scheduledReportService.disableScheduledReport(report.id)
      : this.scheduledReportService.enableScheduledReport(report.id);

    service$.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.scheduledReports.findIndex(r => r.id === report.id);
          if (index !== -1) {
            this.scheduledReports[index] = updated;
          }
          const status = updated.enabled ? 'habilitado' : 'deshabilitado';
          this.snackBar.open(`Reporte ${status}`, 'Cerrar', { duration: 2000 });
        },
        error: (error) => {
          console.error(`Error ${action}ing scheduled report`, error);
          this.snackBar.open(`Error al ${action} reporte programado`, 'Cerrar', { duration: 3000 });
          // Revert the toggle
          report.enabled = !report.enabled;
        }
      });
  }

  executeNow(report: ScheduledReportConfig): void {
    if (!report.id) {
      return;
    }

    this.snackBar.open('Ejecutando reporte...', 'Cerrar', { duration: 2000 });
    
    this.scheduledReportService.executeScheduledReportNow(report.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (execution) => {
          this.snackBar.open('Reporte ejecutado exitosamente', 'Cerrar', { duration: 3000 });
          this.loadExecutionHistory(report);
        },
        error: (error) => {
          console.error('Error executing report', error);
          this.snackBar.open('Error al ejecutar reporte', 'Cerrar', { duration: 3000 });
        }
      });
  }

  viewExecutionHistory(report: ScheduledReportConfig): void {
    this.selectedReport = report;
    this.loadExecutionHistory(report);
  }

  loadExecutionHistory(report: ScheduledReportConfig): void {
    if (!report.id) {
      return;
    }

    this.loadingHistory = true;
    this.scheduledReportService.getExecutionHistory(report.id, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          this.executionHistory = history;
          this.loadingHistory = false;
        },
        error: (error) => {
          console.error('Error loading execution history', error);
          this.snackBar.open('Error al cargar historial de ejecuciones', 'Cerrar', { duration: 3000 });
          this.loadingHistory = false;
        }
      });
  }

  getCronDescription(cronExpression: string): string {
    // Simplified cron description
    const parts = cronExpression.split(' ');
    if (parts.length < 6) return cronExpression;
    
    const minute = parts[0];
    const hour = parts[1];
    const dayOfMonth = parts[2];
    const month = parts[3];
    const dayOfWeek = parts[4];
    
    if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '?') {
      return 'Diariamente a medianoche';
    } else if (minute === '0' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '?') {
      return `Diariamente a las ${hour}:00`;
    } else if (dayOfWeek !== '?' && dayOfWeek !== '*') {
      return `Semanalmente`;
    } else if (dayOfMonth !== '*' && dayOfMonth !== '?') {
      return `Mensualmente`;
    }
    
    return cronExpression;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'SUCCESS':
        return 'green';
      case 'FAILED':
        return 'red';
      case 'RUNNING':
      case 'GENERATING_REPORT':
      case 'EXPORTING':
      case 'NOTIFYING':
        return 'blue';
      default:
        return 'gray';
    }
  }

  formatDuration(ms: number): string {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '-';
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }

  formatDate(timestamp: number): string {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  }

  closeHistoryPanel(): void {
    this.selectedReport = null;
    this.executionHistory = [];
  }
}
