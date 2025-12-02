/*
 * Copyright © 2024 GDT - Grupo de Desarrollo Tecnológico
 * Licensed under the Apache License, Version 2.0
 */

import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ErrorLog } from '../../../shared/models/gateway-monitoring.model';
import { GatewayMonitoringService } from '../../../shared/services/gateway-monitoring.service';

/**
 * Error Log Viewer Component
 * 
 * Displays and manages error logs with filtering, searching, and export capabilities.
 */
@Component({
  selector: 'app-error-log-viewer',
  templateUrl: './error-log-viewer.component.html',
  styleUrls: ['./error-log-viewer.component.scss']
})
export class ErrorLogViewerComponent implements OnInit {

  errorLogs: ErrorLog[] = [];
  filteredLogs: ErrorLog[] = [];
  isLoading = false;

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];

  // Filters
  severityFilter = '';
  searchText = '';
  severityOptions = ['low', 'medium', 'high', 'critical'];

  // Expanded rows
  expandedElement: ErrorLog | null = null;

  displayedColumns: string[] = ['timestamp', 'severity', 'category', 'message', 'actions'];

  constructor(private monitoringService: GatewayMonitoringService) { }

  ngOnInit(): void {
    this.loadErrorLogs();
  }

  loadErrorLogs(): void {
    this.isLoading = true;
    this.monitoringService.getErrorLogs(100).subscribe(
      logs => {
        this.errorLogs = logs;
        this.applyFilters();
        this.isLoading = false;
      },
      error => {
        console.error('Error loading logs:', error);
        this.isLoading = false;
      }
    );
  }

  applyFilters(): void {
    this.filteredLogs = this.errorLogs.filter(log => {
      const matchesSeverity = !this.severityFilter || log.severity === this.severityFilter;
      const matchesSearch = !this.searchText || 
        log.message.toLowerCase().includes(this.searchText.toLowerCase()) ||
        log.category.toLowerCase().includes(this.searchText.toLowerCase());
      return matchesSeverity && matchesSearch;
    });
    this.pageIndex = 0;
  }

  onSeverityFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  toggleExpanded(log: ErrorLog): void {
    this.expandedElement = this.expandedElement === log ? null : log;
  }

  getSeverityClass(severity: string): string {
    return `severity-${severity}`;
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'priority_high';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  clearLogs(): void {
    if (confirm('Are you sure you want to clear all error logs?')) {
      this.monitoringService.clearErrorLogs().subscribe(
        () => {
          this.errorLogs = [];
          this.filteredLogs = [];
        },
        error => {
          console.error('Error clearing logs:', error);
        }
      );
    }
  }

  exportLogs(): void {
    const csv = this.convertToCSV(this.filteredLogs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `error-logs-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private convertToCSV(logs: ErrorLog[]): string {
    const headers = ['Timestamp', 'Severity', 'Category', 'Message', 'Source'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.severity,
      log.category,
      log.message,
      log.source
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  get paginatedLogs(): ErrorLog[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredLogs.slice(start, end);
  }
}
