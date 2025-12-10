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
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EChartsOption } from 'echarts';
import { 
  HistoricalDataService, 
  TimeSeriesData, 
  TimeInterval, 
  TimeAggregation,
  HistoricalDataRequest 
} from '../shared/services/historical-data.service';
import { ChartConfigService } from '../shared/services/chart-config.service';
import { TankAssetService } from '../shared/services/tank-asset.service';

/**
 * Chart Type
 */
export enum ChartType {
  LINE = 'line',
  AREA = 'area',
  BAR = 'bar',
  SCATTER = 'scatter'
}

/**
 * Historical Trends Component
 * Displays interactive charts for historical tank data
 */
@Component({
  selector: 'tb-historical-trends',
  templateUrl: './historical-trends.component.html',
  styleUrls: ['./historical-trends.component.scss']
})
export class HistoricalTrendsComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // Form
  filterForm: FormGroup;

  // Data
  tanks: any[] = [];
  selectedTanks: string[] = [];
  availableKeys: string[] = [
    'level', 'temperature', 'TOV', 'GOV', 'GSV', 'NSV',
    'density', 'mass', 'pressure', 'flow_rate'
  ];
  selectedKeys: string[] = ['level', 'temperature'];
  timeSeriesData: TimeSeriesData[] = [];

  // Loading indicators per series
  seriesLoadingStatus = new Map<string, boolean>();

  // Time range for chart axis
  currentStartTs: number = 0;
  currentEndTs: number = 0;

  // Chart configuration
  chartOption: EChartsOption = {};
  chartType: ChartType = ChartType.LINE;
  chartTypes = Object.values(ChartType);

  /**
   * Mapping of time ranges to optimal interval and aggregation
   * Key: time range in milliseconds
   * Value: { interval, aggregation, maxIntervals }
   */
  private readonly timeRangeConfig = new Map<number, { interval: TimeInterval; aggregation: TimeAggregation; maxIntervals: number }>([
    [60 * 60 * 1000, { interval: TimeInterval.MINUTE, aggregation: TimeAggregation.NONE, maxIntervals: 1000 }],           // 1 hour
    [6 * 60 * 60 * 1000, { interval: TimeInterval.MINUTE, aggregation: TimeAggregation.AVG, maxIntervals: 1000 }],        // 6 hours
    [12 * 60 * 60 * 1000, { interval: TimeInterval.MINUTE, aggregation: TimeAggregation.AVG, maxIntervals: 1000 }],       // 12 hours
    [24 * 60 * 60 * 1000, { interval: TimeInterval.HOUR, aggregation: TimeAggregation.AVG, maxIntervals: 1000 }],         // 1 day
    [7 * 24 * 60 * 60 * 1000, { interval: TimeInterval.HOUR, aggregation: TimeAggregation.AVG, maxIntervals: 1000 }],     // 7 days
    [30 * 24 * 60 * 60 * 1000, { interval: TimeInterval.DAY, aggregation: TimeAggregation.AVG, maxIntervals: 1000 }]      // 30 days
  ]);

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

  // Aggregation
  intervals = Object.values(TimeInterval);
  aggregations = Object.values(TimeAggregation);
  selectedInterval: TimeInterval = TimeInterval.HOUR;
  selectedAggregation: TimeAggregation = TimeAggregation.AVG;

  // UI State
  loading = false;
  showCustomDateRange = false;
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;

  // Statistics
  statistics: Map<string, any> = new Map();

  constructor(
    private fb: FormBuilder,
    private historicalDataService: HistoricalDataService,
    private chartConfigService: ChartConfigService,
    private tankAssetService: TankAssetService
  ) {
    this.filterForm = this.fb.group({
      tanks: [[]],
      keys: [['level', 'temperature']],
      timeRange: [this.selectedTimeRange],
      interval: [TimeInterval.HOUR],
      aggregation: [TimeAggregation.AVG],
      chartType: [ChartType.LINE]
    });
  }

  ngOnInit(): void {
    this.loadTanks();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load available tanks
   */
  private loadTanks(): void {
    this.tankAssetService.getTanksByProfile('Tank')
      .pipe(takeUntil(this.destroy$))
      .subscribe(tanks => {
        this.tanks = tanks;
        if (tanks.length > 0) {
          // Select first tank by default
          this.selectedTanks = [tanks[0].id!.id];
          this.filterForm.patchValue({ tanks: this.selectedTanks });
          this.loadData();
        }
      });
  }

  /**
   * Setup form value change listeners
   */
  private setupFormListeners(): void {
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(values => {
        this.selectedTanks = values.tanks || [];
        this.selectedKeys = values.keys || [];
        this.selectedTimeRange = values.timeRange;
        this.selectedInterval = values.interval;
        this.selectedAggregation = values.aggregation;
        this.chartType = values.chartType;

        // Show custom date range picker if selected
        this.showCustomDateRange = this.selectedTimeRange === 0;

        if (!this.showCustomDateRange) {
          this.loadData();
        }
      });
  }

  /**
   * Adjust interval and aggregation based on time range
   */
  private adjustIntervalAndAggregation(timeRange: number): void {
    // Find the best configuration for this time range
    const config = this.timeRangeConfig.get(timeRange);
    
    if (config) {
      this.selectedInterval = config.interval;
      this.selectedAggregation = config.aggregation;
      // Use emitEvent: false to prevent triggering valueChanges listener
      this.filterForm.patchValue({
        interval: config.interval,
        aggregation: config.aggregation
      }, { emitEvent: false });
    }
  }

  /**
   * Load historical data
   */
  loadData(): void {
    if (this.selectedTanks.length === 0 || this.selectedKeys.length === 0) {
      return;
    }

    this.loading = true;

    // Calculate time range
    const endTs = Date.now();
    let startTs: number;
    let timeRange: number;

    if (this.showCustomDateRange && this.customStartDate && this.customEndDate) {
      startTs = this.customStartDate.getTime();
      timeRange = endTs - startTs;
    } else {
      timeRange = this.selectedTimeRange;
      startTs = endTs - timeRange;
    }

    // Adjust interval and aggregation based on time range
    this.adjustIntervalAndAggregation(timeRange);

    // Store time range for chart axis
    this.currentStartTs = startTs;
    this.currentEndTs = endTs;

    // Load data for multiple tanks if selected
    if (this.selectedTanks.length === 1) {
      this.loadSingleTankData(startTs, endTs);
    } else {
      this.loadMultiTankData(startTs, endTs);
    }
  }

  /**
   * Load data for a single tank
   */
  private loadSingleTankData(startTs: number, endTs: number): void {
    const request: HistoricalDataRequest = {
      entityId: this.selectedTanks[0],
      entityType: 'ASSET',
      keys: this.selectedKeys,
      startTs,
      endTs,
      interval: this.selectedInterval,
      aggregation: this.selectedAggregation,
      limit: 1000
    };

    this.historicalDataService.getHistoricalData(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.timeSeriesData = data;
          this.calculateStatistics();
          this.updateChart();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading historical data:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Load data for multiple tanks (comparison mode)
   */
  private loadMultiTankData(startTs: number, endTs: number): void {
    const multiRequest = {
      tankIds: this.selectedTanks,
      keys: this.selectedKeys,
      startTs,
      endTs,
      interval: this.selectedInterval,
      aggregation: this.selectedAggregation
    };

    // Initialize loading status for each series
    this.seriesLoadingStatus.clear();
    this.selectedTanks.forEach(tankId => {
      this.selectedKeys.forEach(key => {
        const seriesKey = `${tankId}_${key}`;
        this.seriesLoadingStatus.set(seriesKey, true);
      });
    });

    this.historicalDataService.getMultiTankData(multiRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dataMap) => {
          // Flatten data from all tanks into a single array
          this.timeSeriesData = [];
          
          dataMap.forEach((tankData, tankId) => {
            const tank = this.tanks.find(t => t.id!.id === tankId);
            const tankName = tank?.name || tankId.substring(0, 8);
            
            tankData.forEach(series => {
              const seriesKey = `${tankId}_${series.key}`;
              this.timeSeriesData.push({
                ...series,
                label: `${tankName} - ${series.label}`,
                key: seriesKey
              });
              // Mark series as loaded
              this.seriesLoadingStatus.set(seriesKey, false);
            });
          });

          this.calculateStatistics();
          this.updateChart();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading multi-tank data:', error);
          // Mark all series as failed
          this.seriesLoadingStatus.forEach((_, key) => {
            this.seriesLoadingStatus.set(key, false);
          });
          this.loading = false;
        }
      });
  }

  /**
   * Calculate statistics for each series
   */
  private calculateStatistics(): void {
    this.statistics.clear();
    this.timeSeriesData.forEach(series => {
      const stats = this.historicalDataService.calculateStatistics(series.data);
      this.statistics.set(series.key, stats);
    });
  }

  /**
   * Update chart configuration
   */
  private updateChart(): void {
    let title: string;
    
    if (this.selectedTanks.length === 1) {
      const tankName = this.tanks.find(t => t.id!.id === this.selectedTanks[0])?.name || 'Tank';
      title = `Tendencias Históricas - ${tankName}`;
    } else {
      title = `Comparación Multi-Tanque (${this.selectedTanks.length} tanques)`;
    }

    switch (this.chartType) {
      case ChartType.LINE:
        this.chartOption = this.chartConfigService.getLineChartConfig(
          this.timeSeriesData,
          {
            title,
            theme: 'light',
            showLegend: true,
            showZoom: true,
            showToolbox: true,
            smooth: true,
            startTs: this.currentStartTs,
            endTs: this.currentEndTs
          }
        );
        break;

      case ChartType.AREA:
        this.chartOption = this.chartConfigService.getAreaChartConfig(
          this.timeSeriesData,
          {
            title,
            theme: 'light',
            showLegend: true,
            stacked: false,
            startTs: this.currentStartTs,
            endTs: this.currentEndTs
          }
        );
        break;

      case ChartType.BAR:
        this.chartOption = this.chartConfigService.getBarChartConfig(
          this.timeSeriesData,
          {
            title,
            theme: 'light',
            showLegend: true,
            horizontal: false,
            startTs: this.currentStartTs,
            endTs: this.currentEndTs
          }
        );
        break;

      case ChartType.SCATTER:
        this.chartOption = this.chartConfigService.getScatterChartConfig(
          this.timeSeriesData,
          {
            title,
            theme: 'light',
            showLegend: true,
            startTs: this.currentStartTs,
            endTs: this.currentEndTs
          }
        );
        break;
    }
  }

  /**
   * Apply custom date range
   */
  applyCustomDateRange(): void {
    if (this.customStartDate && this.customEndDate) {
      this.loadData();
    }
  }

  /**
   * Export data to CSV
   */
  exportData(): void {
    const tankName = this.tanks.find(t => t.id.id === this.selectedTanks[0])?.name || 'tank';
    const filename = `historical_trends_${tankName}_${Date.now()}.csv`;
    this.historicalDataService.exportToCSV(this.timeSeriesData, filename);
  }

  /**
   * Refresh data
   */
  refresh(): void {
    this.loadData();
  }

  /**
   * Get statistics for a key
   */
  getStatistics(key: string): any {
    return this.statistics.get(key);
  }

  /**
   * Format number with units
   */
  formatValue(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }

  /**
   * Get key label
   */
  getKeyLabel(key: string): string {
    const labels: { [key: string]: string } = {
      'level': 'Nivel',
      'temperature': 'Temperatura',
      'TOV': 'TOV',
      'GOV': 'GOV',
      'GSV': 'GSV',
      'NSV': 'NSV',
      'density': 'Densidad',
      'mass': 'Masa',
      'pressure': 'Presión',
      'flow_rate': 'Flujo'
    };
    return labels[key] || key;
  }

  /**
   * Check if a series is loading
   */
  isSeriesLoading(seriesKey: string): boolean {
    return this.seriesLoadingStatus.get(seriesKey) ?? false;
  }

  /**
   * Get key unit
   */
  getKeyUnit(key: string): string {
    const units: { [key: string]: string } = {
      'level': 'mm',
      'temperature': '°C',
      'TOV': 'L',
      'GOV': 'L',
      'GSV': 'L',
      'NSV': 'L',
      'density': 'kg/L',
      'mass': 'kg',
      'pressure': 'kPa',
      'flow_rate': 'L/min'
    };
    return units[key] || '';
  }
}
