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

import { Component, Input, OnChanges, SimpleChanges, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { TimeSeriesData, HistoricalDataPoint } from '../../../shared/services/historical-data.service';

/**
 * Table Row Interface
 */
interface TableRow {
  timestamp: number;
  timestampFormatted: string;
  [key: string]: any;
}

/**
 * Historical Data Table Component
 * Displays time series data in a Material table with pagination and sorting
 */
@Component({
  selector: 'tb-historical-data-table',
  templateUrl: './historical-data-table.component.html',
  styleUrls: ['./historical-data-table.component.scss']
})
export class HistoricalDataTableComponent implements OnChanges, AfterViewInit {

  @Input() data: TimeSeriesData[] = [];
  @Input() pageSize: number = 25;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource: MatTableDataSource<TableRow>;
  displayedColumns: string[] = ['timestamp'];
  columnLabels: Map<string, string> = new Map();
  columnUnits: Map<string, string> = new Map();

  // Pagination options
  pageSizeOptions: number[] = [10, 25, 50, 100];

  constructor() {
    this.dataSource = new MatTableDataSource<TableRow>([]);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.updateTable();
    }
  }

  /**
   * Update table data
   */
  private updateTable(): void {
    if (!this.data || this.data.length === 0) {
      this.dataSource.data = [];
      this.displayedColumns = ['timestamp'];
      return;
    }

    // Build column definitions
    this.displayedColumns = ['timestamp'];
    this.columnLabels.clear();
    this.columnUnits.clear();

    this.data.forEach(series => {
      this.displayedColumns.push(series.key);
      this.columnLabels.set(series.key, series.label);
      this.columnUnits.set(series.key, series.unit || '');
    });

    // Collect all unique timestamps
    const timestampMap = new Map<number, TableRow>();

    this.data.forEach(series => {
      series.data.forEach(point => {
        if (!timestampMap.has(point.ts)) {
          timestampMap.set(point.ts, {
            timestamp: point.ts,
            timestampFormatted: this.formatTimestamp(point.ts)
          });
        }
        timestampMap.get(point.ts)![series.key] = point.value;
      });
    });

    // Convert to array and sort by timestamp descending (newest first)
    const tableData = Array.from(timestampMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    this.dataSource.data = tableData;
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(ts: number): string {
    const date = new Date(ts);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Format value with decimals
   */
  formatValue(value: any, decimals: number = 2): string {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'number') {
      return value.toFixed(decimals);
    }
    return value.toString();
  }

  /**
   * Get column header with unit
   */
  getColumnHeader(key: string): string {
    const label = this.columnLabels.get(key) || key;
    const unit = this.columnUnits.get(key);
    return unit ? `${label} (${unit})` : label;
  }

  /**
   * Apply filter to table
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Export table data to CSV
   */
  exportToCSV(): void {
    if (!this.dataSource.data || this.dataSource.data.length === 0) {
      return;
    }

    // Create CSV header
    const headers = ['Timestamp', ...this.displayedColumns.slice(1).map(col => this.getColumnHeader(col))];
    let csv = headers.join(',') + '\n';

    // Create CSV rows
    this.dataSource.data.forEach(row => {
      const values = [
        row.timestampFormatted,
        ...this.displayedColumns.slice(1).map(col => this.formatValue(row[col]))
      ];
      csv += values.join(',') + '\n';
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historical_data_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
