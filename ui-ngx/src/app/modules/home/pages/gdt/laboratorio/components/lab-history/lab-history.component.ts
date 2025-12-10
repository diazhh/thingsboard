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

import { Component, Input, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { TankAsset } from '../../../shared/services/tank-asset.service';
import { ManualTelemetryEntry } from '../../../tank-monitoring/services/manual-telemetry.service';

@Component({
  selector: 'tb-lab-history',
  templateUrl: './lab-history.component.html',
  styleUrls: ['./lab-history.component.scss']
})
export class LabHistoryComponent implements OnInit {

  @Input() set selectedTank(value: { asset: TankAsset, attributes: any } | null) {
    console.log('[LabHistory] selectedTank changed:', value);
    this._selectedTank = value;
    this.updateDisplayedColumns();
  }
  get selectedTank() {
    return this._selectedTank;
  }
  private _selectedTank: { asset: TankAsset, attributes: any } | null = null;
  @Input() loading = false;
  
  @Input() set analysisHistory(value: ManualTelemetryEntry[]) {
    this.dataSource.data = value || [];
  }

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<ManualTelemetryEntry>([]);
  
  // Expose Math for template
  Math = Math;

  constructor(private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.updateDisplayedColumns();
  }

  updateDisplayedColumns() {
    if (this.selectedTank) {
      // Single tank: no need for tankTag column
      this.displayedColumns = ['timestamp', 'apiGravity', 'bsw', 'temperature', 'operatorName', 'notes'];
      console.log('[LabHistory] Showing columns for single tank:', this.displayedColumns);
    } else {
      // All tanks: include tankTag column
      this.displayedColumns = ['timestamp', 'tankTag', 'apiGravity', 'bsw', 'temperature', 'operatorName', 'notes'];
      console.log('[LabHistory] Showing columns for all tanks:', this.displayedColumns);
    }
    // Force change detection
    this.cd.detectChanges();
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  exportToCSV() {
    if (!this.dataSource.data || this.dataSource.data.length === 0) {
      return;
    }

    const headers = this.selectedTank 
      ? ['Fecha/Hora', 'API Gravity (°API)', 'BS&W (%)', 'Temperatura (°C)', 'Analista', 'Notas']
      : ['Fecha/Hora', 'Tanque', 'API Gravity (°API)', 'BS&W (%)', 'Temperatura (°C)', 'Analista', 'Notas'];
    
    const csvData = this.dataSource.data.map(entry => {
      const row = [
        this.formatDate(entry.timestamp),
        ...(this.selectedTank ? [] : [entry.tankTag || '']),
        entry.apiGravity?.toFixed(2) || '',
        entry.bsw?.toFixed(2) || '',
        entry.manualTemperature?.toFixed(2) || '',
        entry.operatorName,
        entry.notes || ''
      ];
      return row;
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `analisis_laboratorio_${this.selectedTank?.attributes.tankTag || 'todos'}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Helper to extract analyst name from notes
  getAnalystFromNotes(notes: string): string {
    if (!notes) return '';
    const match = notes.match(/Analista:\s*([^.]+)/);
    return match ? match[1].trim() : '';
  }
}
