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
import { EChartsOption } from 'echarts';
import { TimeSeriesData } from './historical-data.service';

/**
 * Chart Theme
 */
export interface ChartTheme {
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  lineColors: string[];
}

/**
 * Chart Configuration Service
 * Provides ECharts configurations for different chart types
 */
@Injectable({
  providedIn: 'root'
})
export class ChartConfigService {

  private readonly lightTheme: ChartTheme = {
    backgroundColor: '#ffffff',
    textColor: '#333333',
    gridColor: '#e0e0e0',
    lineColors: [
      '#1976d2', '#f44336', '#4caf50', '#ff9800', 
      '#9c27b0', '#00bcd4', '#795548', '#607d8b'
    ]
  };

  private readonly darkTheme: ChartTheme = {
    backgroundColor: '#1e1e1e',
    textColor: '#e0e0e0',
    gridColor: '#424242',
    lineColors: [
      '#42a5f5', '#ef5350', '#66bb6a', '#ffa726',
      '#ab47bc', '#26c6da', '#8d6e63', '#78909c'
    ]
  };

  constructor() {}

  /**
   * Get line chart configuration
   */
  getLineChartConfig(
    data: TimeSeriesData[],
    options?: {
      title?: string;
      theme?: 'light' | 'dark';
      showLegend?: boolean;
      showZoom?: boolean;
      showToolbox?: boolean;
      yAxisLabel?: string;
      smooth?: boolean;
      startTs?: number;
      endTs?: number;
    }
  ): EChartsOption {
    const theme = options?.theme === 'dark' ? this.darkTheme : this.lightTheme;
    const showLegend = options?.showLegend !== false;
    const showZoom = options?.showZoom !== false;
    const showToolbox = options?.showToolbox !== false;
    const smooth = options?.smooth !== false;

    // Prepare series data
    const series = data.map((timeSeries, index) => ({
      name: timeSeries.label,
      type: 'line' as const,
      smooth,
      data: timeSeries.data.map(point => [point.ts, point.value]),
      itemStyle: {
        color: timeSeries.color || theme.lineColors[index % theme.lineColors.length]
      },
      lineStyle: {
        width: 2
      },
      emphasis: {
        focus: 'series' as const
      }
    }));

    return {
      backgroundColor: theme.backgroundColor,
      title: options?.title ? {
        text: options.title,
        left: 'center',
        textStyle: {
          color: theme.textColor,
          fontSize: 16,
          fontWeight: 'bold'
        }
      } : undefined,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          
          const date = new Date(params[0].value[0]);
          let tooltip = `<strong>${date.toLocaleString()}</strong><br/>`;
          
          params.forEach((param: any) => {
            const series = data.find(s => s.label === param.seriesName);
            const unit = series?.unit || '';
            tooltip += `${param.marker} ${param.seriesName}: <strong>${param.value[1].toFixed(2)} ${unit}</strong><br/>`;
          });
          
          return tooltip;
        }
      },
      legend: showLegend ? {
        data: data.map(s => s.label),
        top: options?.title ? 35 : 10,
        textStyle: {
          color: theme.textColor
        }
      } : undefined,
      grid: {
        left: '3%',
        right: '4%',
        bottom: showZoom ? '15%' : '3%',
        top: showLegend ? (options?.title ? 70 : 45) : (options?.title ? 50 : 25),
        containLabel: true
      },
      toolbox: showToolbox ? {
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
            title: {
              zoom: 'Zoom',
              back: 'Restaurar'
            }
          },
          restore: {
            title: 'Restaurar'
          },
          saveAsImage: {
            title: 'Guardar imagen',
            name: options?.title || 'chart'
          }
        },
        right: 20
      } : undefined,
      xAxis: {
        type: 'time' as const,
        boundaryGap: false as any,
        min: options?.startTs,
        max: options?.endTs,
        axisLabel: {
          color: theme.textColor,
          formatter: (value: number) => {
            const date = new Date(value);
            return date.toLocaleDateString() + '\n' + date.toLocaleTimeString();
          }
        },
        axisLine: {
          lineStyle: {
            color: theme.gridColor
          }
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: theme.gridColor,
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: options?.yAxisLabel,
        nameTextStyle: {
          color: theme.textColor
        },
        axisLabel: {
          color: theme.textColor,
          formatter: (value: number) => value.toFixed(2)
        },
        axisLine: {
          lineStyle: {
            color: theme.gridColor
          }
        },
        splitLine: {
          lineStyle: {
            color: theme.gridColor,
            type: 'dashed'
          }
        }
      },
      dataZoom: showZoom ? [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          start: 0,
          end: 100,
          handleIcon: 'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
          handleSize: '80%',
          handleStyle: {
            color: '#fff',
            shadowBlur: 3,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
            shadowOffsetX: 2,
            shadowOffsetY: 2
          },
          textStyle: {
            color: theme.textColor
          }
        }
      ] : undefined,
      series
    };
  }

  /**
   * Get area chart configuration
   */
  getAreaChartConfig(
    data: TimeSeriesData[],
    options?: {
      title?: string;
      theme?: 'light' | 'dark';
      showLegend?: boolean;
      stacked?: boolean;
      startTs?: number;
      endTs?: number;
    }
  ): EChartsOption {
    const baseConfig = this.getLineChartConfig(data, options);
    
    // Modify series to add area style
    if (baseConfig.series && Array.isArray(baseConfig.series)) {
      baseConfig.series = baseConfig.series.map((s: any) => ({
        ...s,
        areaStyle: {
          opacity: options?.stacked ? 0.7 : 0.3
        },
        stack: options?.stacked ? 'total' : undefined
      }));
    }

    return baseConfig;
  }

  /**
   * Get bar chart configuration
   */
  getBarChartConfig(
    data: TimeSeriesData[],
    options?: {
      title?: string;
      theme?: 'light' | 'dark';
      showLegend?: boolean;
      startTs?: number;
      endTs?: number;
      horizontal?: boolean;
    }
  ): EChartsOption {
    const theme = options?.theme === 'dark' ? this.darkTheme : this.lightTheme;
    const horizontal = options?.horizontal || false;

    // For bar charts, we'll use aggregated data (e.g., daily averages)
    const categories = data[0]?.data.map(point => 
      new Date(point.ts).toLocaleDateString()
    ) || [];

    const series = data.map((timeSeries, index) => ({
      name: timeSeries.label,
      type: 'bar' as const,
      data: timeSeries.data.map(point => point.value),
      itemStyle: {
        color: timeSeries.color || theme.lineColors[index % theme.lineColors.length]
      }
    }));

    return {
      backgroundColor: theme.backgroundColor,
      title: options?.title ? {
        text: options.title,
        left: 'center',
        textStyle: {
          color: theme.textColor,
          fontSize: 16,
          fontWeight: 'bold'
        }
      } : undefined,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: data.map(s => s.label),
        top: options?.title ? 35 : 10,
        textStyle: {
          color: theme.textColor
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: options?.title ? 70 : 45,
        containLabel: true
      },
      xAxis: horizontal ? {
        type: 'value',
        axisLabel: { color: theme.textColor }
      } : {
        type: 'category',
        data: categories,
        axisLabel: { 
          color: theme.textColor,
          rotate: 45
        }
      },
      yAxis: horizontal ? {
        type: 'category',
        data: categories,
        axisLabel: { color: theme.textColor }
      } : {
        type: 'value',
        axisLabel: { color: theme.textColor }
      },
      series
    };
  }

  /**
   * Get scatter chart configuration
   */
  getScatterChartConfig(
    data: TimeSeriesData[],
    options?: {
      title?: string;
      theme?: 'light' | 'dark';
      showLegend?: boolean;
      startTs?: number;
      endTs?: number;
    }
  ): EChartsOption {
    const theme = options?.theme === 'dark' ? this.darkTheme : this.lightTheme;

    const series = data.map((timeSeries, index) => ({
      name: timeSeries.label,
      type: 'scatter' as const,
      data: timeSeries.data.map(point => [point.ts, point.value]),
      itemStyle: {
        color: timeSeries.color || theme.lineColors[index % theme.lineColors.length]
      },
      symbolSize: 6
    }));

    return {
      backgroundColor: theme.backgroundColor,
      title: options?.title ? {
        text: options.title,
        left: 'center',
        textStyle: {
          color: theme.textColor,
          fontSize: 16,
          fontWeight: 'bold'
        }
      } : undefined,
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const date = new Date(params.value[0]);
          const series = data.find(s => s.label === params.seriesName);
          const unit = series?.unit || '';
          return `<strong>${date.toLocaleString()}</strong><br/>
                  ${params.marker} ${params.seriesName}: <strong>${params.value[1].toFixed(2)} ${unit}</strong>`;
        }
      },
      legend: {
        data: data.map(s => s.label),
        top: options?.title ? 35 : 10,
        textStyle: {
          color: theme.textColor
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: options?.title ? 70 : 45,
        containLabel: true
      },
      xAxis: {
        type: 'time',
        min: options?.startTs,
        max: options?.endTs,
        axisLabel: { color: theme.textColor }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: theme.textColor }
      },
      series
    };
  }

  /**
   * Get comparison chart configuration (multiple Y axes)
   */
  getComparisonChartConfig(
    data: TimeSeriesData[],
    options?: {
      title?: string;
      theme?: 'light' | 'dark';
    }
  ): EChartsOption {
    const theme = options?.theme === 'dark' ? this.darkTheme : this.lightTheme;

    // Create Y axes for each series
    const yAxis = data.map((series, index) => ({
      type: 'value' as const,
      name: series.label,
      position: (index % 2 === 0 ? 'left' : 'right') as any,
      offset: Math.floor(index / 2) * 60,
      axisLine: {
        show: true,
        lineStyle: {
          color: series.color || theme.lineColors[index % theme.lineColors.length]
        }
      },
      axisLabel: {
        formatter: `{value} ${series.unit || ''}`
      }
    }));

    const series = data.map((timeSeries, index) => ({
      name: timeSeries.label,
      type: 'line' as const,
      yAxisIndex: index,
      data: timeSeries.data.map(point => [point.ts, point.value]),
      itemStyle: {
        color: timeSeries.color || theme.lineColors[index % theme.lineColors.length]
      }
    }));

    return {
      backgroundColor: theme.backgroundColor,
      title: options?.title ? {
        text: options.title,
        left: 'center',
        textStyle: {
          color: theme.textColor
        }
      } : undefined,
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: data.map(s => s.label),
        top: options?.title ? 35 : 10,
        textStyle: {
          color: theme.textColor
        }
      },
      grid: {
        left: data.length > 2 ? '15%' : '10%',
        right: data.length > 2 ? '15%' : '10%',
        bottom: '3%',
        top: options?.title ? 70 : 45,
        containLabel: true
      },
      xAxis: {
        type: 'time',
        axisLabel: { color: theme.textColor }
      },
      yAxis,
      series
    };
  }
}
