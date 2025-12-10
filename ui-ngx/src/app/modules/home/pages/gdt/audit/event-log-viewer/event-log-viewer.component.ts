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

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuditEventService, AuditEvent } from '../../shared/services/audit-event.service';

/**
 * Event Log Viewer Component
 * Displays audit events for OIML R85 compliance
 */
@Component({
  selector: 'tb-event-log-viewer',
  templateUrl: './event-log-viewer.component.html',
  styleUrls: ['./event-log-viewer.component.scss']
})
export class EventLogViewerComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // Form
  filterForm: FormGroup;

  // Data
  auditEvents: AuditEvent[] = [];
  dataSource: MatTableDataSource<AuditEvent>;
  displayedColumns: string[] = [
    'timestamp',
    'category',
    'severity',
    'userName',
    'description',
    'entityName',
    'status',
    'actions'
  ];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  // UI State
  loading = false;
  selectedEvent: AuditEvent | null = null;
  showEventDetails = false;

  // Filters
  categories = [
    'CONFIG_CHANGE',
    'TANK_SETTINGS_CHANGE',
    'ALARM_THRESHOLD_CHANGE',
    'USER_PERMISSION_CHANGE',
    'BATCH_CREATED',
    'BATCH_TRANSFERRED',
    'BATCH_CLOSED',
    'BATCH_RECONCILED',
    'MANUAL_LEVEL_ENTRY',
    'MANUAL_TEMPERATURE_ENTRY',
    'LABORATORY_ANALYSIS_ENTRY',
    'SYSTEM_STARTUP',
    'SYSTEM_SHUTDOWN',
    'USER_LOGIN',
    'USER_LOGOUT',
    'UNAUTHORIZED_ACCESS_ATTEMPT',
    'PASSWORD_CHANGE',
    'DATA_VALIDATION_ERROR',
    'DISCREPANCY_DETECTED',
    'SEAL_STATUS_CHANGE',
    'OTHER'
  ];

  severities = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
  statuses = ['RECORDED', 'SIGNED', 'VERIFIED', 'ARCHIVED', 'FAILED'];

  // Time range
  timeRanges = [
    { label: 'Última hora', value: 60 * 60 * 1000 },
    { label: 'Últimas 6 horas', value: 6 * 60 * 60 * 1000 },
    { label: 'Últimas 12 horas', value: 12 * 60 * 60 * 1000 },
    { label: 'Último día', value: 24 * 60 * 60 * 1000 },
    { label: 'Últimos 7 días', value: 7 * 24 * 60 * 60 * 1000 },
    { label: 'Últimos 30 días', value: 30 * 24 * 60 * 60 * 1000 },
    { label: 'Personalizado', value: 0 }
  ];
  selectedTimeRange = this.timeRanges[3].value; // Default: last 24 hours

  // Custom date range
  showCustomDateRange = false;
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;

  constructor(
    private fb: FormBuilder,
    private auditEventService: AuditEventService
  ) {
    this.filterForm = this.fb.group({
      searchQuery: [''],
      category: [''],
      severity: [''],
      status: [''],
      userName: [''],
      timeRange: [this.selectedTimeRange],
      entityType: ['']
    });

    this.dataSource = new MatTableDataSource<AuditEvent>([]);
  }

  ngOnInit(): void {
    this.setupFormListeners();
    this.loadAuditEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup form value change listeners
   */
  private setupFormListeners(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });
  }

  /**
   * Load audit events
   */
  loadAuditEvents(): void {
    this.loading = true;

    // Calculate time range
    const endTs = Date.now();
    let timeRange: number;

    if (this.showCustomDateRange && this.customStartDate && this.customEndDate) {
      timeRange = this.customEndDate.getTime() - this.customStartDate.getTime();
    } else {
      timeRange = this.selectedTimeRange;
    }

    // Call AuditEventService to fetch events
    this.auditEventService.getAuditEvents(timeRange, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (events) => {
          this.auditEvents = events;
          this.dataSource.data = events;
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading audit events:', error);
          this.loading = false;
          // Fallback to mock data for development
          this.loadMockData();
        }
      });
  }

  /**
   * Load mock audit events
   */
  private loadMockData(): void {
    const now = Date.now();
    this.auditEvents = [
      {
        eventId: '1',
        timestamp: new Date(now - 60000),
        category: 'CONFIG_CHANGE',
        severity: 'WARNING',
        userId: 'user1',
        userName: 'Admin User',
        description: 'Tank configuration was modified',
        entityType: 'TANK',
        entityId: 'tank1',
        entityName: 'tanque de diesel 01',
        oldValue: 'capacity: 1000',
        newValue: 'capacity: 1200',
        ipAddress: '192.168.1.100',
        digitalSignature: 'abc123def456',
        status: 'SIGNED'
      },
      {
        eventId: '2',
        timestamp: new Date(now - 120000),
        category: 'BATCH_CREATED',
        severity: 'INFO',
        userId: 'user2',
        userName: 'Operator User',
        description: 'New batch was created',
        entityType: 'BATCH',
        entityId: 'batch1',
        entityName: 'Batch #001',
        ipAddress: '192.168.1.101',
        digitalSignature: 'xyz789uvw012',
        status: 'VERIFIED'
      },
      {
        eventId: '3',
        timestamp: new Date(now - 300000),
        category: 'MANUAL_LEVEL_ENTRY',
        severity: 'INFO',
        userId: 'user1',
        userName: 'Admin User',
        description: 'Manual level measurement was recorded',
        entityType: 'TANK',
        entityId: 'tank1',
        entityName: 'tanque de diesel 01',
        newValue: '850 mm',
        ipAddress: '192.168.1.100',
        digitalSignature: 'pqr345stu678',
        status: 'SIGNED'
      },
      {
        eventId: '4',
        timestamp: new Date(now - 600000),
        category: 'USER_LOGIN',
        severity: 'INFO',
        userId: 'user1',
        userName: 'Admin User',
        description: 'User logged in',
        entityType: 'USER',
        entityId: 'user1',
        entityName: 'Admin User',
        ipAddress: '192.168.1.100',
        digitalSignature: 'mno123jkl456',
        status: 'VERIFIED'
      },
      {
        eventId: '5',
        timestamp: new Date(now - 900000),
        category: 'DISCREPANCY_DETECTED',
        severity: 'ERROR',
        userId: 'system',
        userName: 'System',
        description: 'Mass balance discrepancy detected',
        entityType: 'TANK',
        entityId: 'tank2',
        entityName: 'tanque de gasolina 01',
        oldValue: '0.2%',
        newValue: '0.8%',
        ipAddress: '127.0.0.1',
        digitalSignature: 'ghi789def012',
        status: 'SIGNED'
      }
    ];

    this.dataSource.data = this.auditEvents;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Apply filters to the data
   */
  private applyFilters(): void {
    const filters = this.filterForm.value;
    const searchQuery = filters.searchQuery?.toLowerCase() || '';
    const category = filters.category || '';
    const severity = filters.severity || '';
    const status = filters.status || '';
    const userName = filters.userName?.toLowerCase() || '';
    const entityType = filters.entityType || '';

    let filtered = this.auditEvents;

    if (searchQuery) {
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(searchQuery) ||
        e.entityName.toLowerCase().includes(searchQuery) ||
        e.userName.toLowerCase().includes(searchQuery)
      );
    }

    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }

    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }

    if (status) {
      filtered = filtered.filter(e => e.status === status);
    }

    if (userName) {
      filtered = filtered.filter(e => e.userName.toLowerCase().includes(userName));
    }

    if (entityType) {
      filtered = filtered.filter(e => e.entityType === entityType);
    }

    this.dataSource.data = filtered;
  }

  /**
   * Show event details
   */
  showDetails(event: AuditEvent): void {
    this.selectedEvent = event;
    this.showEventDetails = true;
  }

  /**
   * Close event details
   */
  closeDetails(): void {
    this.showEventDetails = false;
    this.selectedEvent = null;
  }

  /**
   * Export events to CSV
   */
  exportToCSV(): void {
    const headers = ['Event ID', 'Timestamp', 'Category', 'Severity', 'User', 'Description', 'Entity', 'Status', 'Signature'];
    const rows = this.dataSource.filteredData.map(e => [
      e.eventId,
      e.timestamp.toISOString(),
      e.category,
      e.severity,
      e.userName,
      e.description,
      `${e.entityType}:${e.entityName}`,
      e.status,
      e.digitalSignature
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_events_${Date.now()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export events to JSON
   */
  exportToJSON(): void {
    const data = JSON.stringify(this.dataSource.filteredData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_events_${Date.now()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get severity color
   */
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'INFO':
        return 'primary';
      case 'WARNING':
        return 'accent';
      case 'ERROR':
        return 'warn';
      case 'CRITICAL':
        return 'warn';
      default:
        return 'primary';
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'SIGNED':
        return 'verified_user';
      case 'VERIFIED':
        return 'check_circle';
      case 'ARCHIVED':
        return 'archive';
      case 'FAILED':
        return 'error';
      default:
        return 'info';
    }
  }

  /**
   * Apply custom date range
   */
  applyCustomDateRange(): void {
    if (this.customStartDate && this.customEndDate) {
      this.loadAuditEvents();
    }
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    this.filterForm.reset({
      searchQuery: '',
      category: '',
      severity: '',
      status: '',
      userName: '',
      timeRange: this.timeRanges[3].value,
      entityType: ''
    });
    this.showCustomDateRange = false;
    this.customStartDate = null;
    this.customEndDate = null;
  }
}
