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

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { WidgetContext } from '@home/models/widget-component.models';
import { TankData } from '../../../shared/models/tank-data.model';
import { ManualTelemetryService, ManualTelemetryEntry, ManualApiGravityHistoryEntry } from '../../../tank-monitoring/services/manual-telemetry.service';
import { SystemConfigService } from '../../../shared/services/system-config.service';
import { LevelFormatterService } from '../../../shared/services/level-formatter.service';
import { Subscription } from 'rxjs';
import * as echarts from 'echarts/core';
import { EChartsOption } from 'echarts';
import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Registrar componentes de ECharts
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  TitleComponent,
  CanvasRenderer
]);

/**
 * Vista de Detalle del Tanque
 *
 * Muestra información completa de un tanque individual:
 * - Gauge de líquido grande con animación
 * - Indicadores de telemetría en tiempo real
 * - Histórico de telemetrías (tabla y gráficos)
 * - Información del tanque (configuración)
 * - Historial de API Gravity
 * - Formulario de registro manual
 */
@Component({
  selector: 'tb-tank-detail',
  templateUrl: './tank-detail.component.html',
  styleUrls: ['./tank-detail.component.scss']
})
export class TankDetailComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() ctx: WidgetContext;
  @Input() tank: TankData;
  @Output() back = new EventEmitter<void>();

  // Tab activa
  activeTab: 'resumen' | 'historico' | 'info' | 'registro' = 'resumen';

  // Datos de histórico
  telemetryHistory: any[] = [];
  apiGravityHistory: ManualApiGravityHistoryEntry[] = [];
  manualEntries: ManualTelemetryEntry[] = [];
  lastApiGravity: { value: number; timestamp: number } | null = null;
  lastBswEntry: ManualTelemetryEntry | null = null;

  // Formulario de registro manual
  manualEntry: Partial<ManualTelemetryEntry> = {
    timestamp: Date.now(),
    apiGravity: undefined,
    manualLevel: undefined,
    manualTemperature: undefined,
    bsw: undefined,
    notes: '',
    source: 'manual_gauging'
  };

  // Campos para nivel en ft/in
  manualLevelFeet: number | undefined = undefined;
  manualLevelInches: number | undefined = undefined;
  manualLevelFraction: string = '0';

  // Opciones de fracciones de pulgada
  fractionOptions = [
    { label: '0', value: '0' },
    { label: '1/8', value: '0.125' },
    { label: '1/4', value: '0.25' },
    { label: '3/8', value: '0.375' },
    { label: '1/2', value: '0.5' },
    { label: '5/8', value: '0.625' },
    { label: '3/4', value: '0.75' },
    { label: '7/8', value: '0.875' }
  ];

  // Campo para datetime-local (necesita string formato ISO)
  entryDateTimeLocal: string = '';
  maxDateTimeLocal: string = '';

  // Estados
  loadingHistory: boolean = false;
  savingEntry: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Configuración de rango de tiempo para histórico
  timeRanges = [
    { label: 'Últimas 24 horas', value: 24 * 60 * 60 * 1000 },
    { label: 'Últimos 7 días', value: 7 * 24 * 60 * 60 * 1000 },
    { label: 'Últimos 30 días', value: 30 * 24 * 60 * 60 * 1000 }
  ];
  selectedTimeRange: number = 24 * 60 * 60 * 1000;

  // Opciones de fuente
  sourceOptions = [
    { label: 'Aforo Manual', value: 'manual_gauging' },
    { label: 'Laboratorio', value: 'laboratory' },
    { label: 'Calibración', value: 'calibration' }
  ];

  // Chart
  @ViewChild('levelChart') levelChartCanvas: ElementRef<HTMLDivElement>;
  private levelChart: echarts.ECharts | null = null;
  private levelHistoryData: Array<{timestamp: number, level: number}> = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private manualTelemetryService: ManualTelemetryService,
    private systemConfigService: SystemConfigService,
    private levelFormatterService: LevelFormatterService
  ) {}

  ngOnInit(): void {
    // Initialize system config service with tenant ID
    if (this.ctx && this.ctx.currentUser && this.ctx.currentUser.tenantId) {
      this.systemConfigService.initWithTenant(this.ctx.currentUser.tenantId);
    }
    
    this.initDateTimeFields();
    this.loadLastApiGravity();
    this.loadLastBsw();
    this.loadTelemetryHistory();
  }

  ngAfterViewInit(): void {
    // El gráfico se inicializará cuando se cargue el tab de histórico
  }

  /**
   * Inicializar campos de fecha/hora
   */
  private initDateTimeFields(): void {
    this.updateMaxDateTime();
    this.entryDateTimeLocal = this.formatDateTimeLocal(new Date());
  }

  /**
   * Actualizar fecha/hora máxima permitida
   */
  private updateMaxDateTime(): void {
    this.maxDateTimeLocal = this.formatDateTimeLocal(new Date());
  }

  /**
   * Formatear fecha para input datetime-local (YYYY-MM-DDTHH:MM)
   */
  private formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Parsear fecha de datetime-local a timestamp
   */
  private parseDateTimeLocal(dateStr: string): number {
    if (!dateStr) return Date.now();
    return new Date(dateStr).getTime();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.levelChart) {
      this.levelChart.dispose();
    }
  }

  /**
   * Verificar si el sistema usa unidades imperiales
   */
  isImperialUnits(): boolean {
    const config = this.systemConfigService.getConfig();
    return config.levelFormat.startsWith('ft');
  }

  /**
   * Convertir pies y pulgadas a milímetros
   */
  convertFeetInchesToMm(): void {
    const feet = this.manualLevelFeet || 0;
    const inches = this.manualLevelInches || 0;
    const fraction = parseFloat(this.manualLevelFraction || '0');

    // Validar que al menos uno tenga valor
    if (feet === 0 && inches === 0 && fraction === 0) {
      this.manualEntry.manualLevel = undefined;
      return;
    }

    // Convertir a pulgadas totales
    const totalInches = (feet * 12) + inches + fraction;

    // Convertir a milímetros (1 inch = 25.4 mm)
    const totalMm = totalInches * 25.4;

    this.manualEntry.manualLevel = Math.round(totalMm * 10) / 10; // Redondear a 1 decimal
  }

  /**
   * Convertir milímetros a pies y pulgadas (para mostrar el nivel actual del radar)
   */
  mmToFeetInches(mm: number): { feet: number; inches: number; fraction: string } {
    // Convertir mm a pulgadas
    const totalInches = mm / 25.4;

    // Calcular pies
    const feet = Math.floor(totalInches / 12);

    // Calcular pulgadas restantes
    const remainingInches = totalInches - (feet * 12);
    const inches = Math.floor(remainingInches);

    // Calcular fracción
    const fractionValue = remainingInches - inches;
    let fractionStr = '0';

    // Redondear a la fracción más cercana (1/8)
    const roundedFraction = Math.round(fractionValue * 8) / 8;
    fractionStr = roundedFraction.toString();

    return { feet, inches, fraction: fractionStr };
  }

  // Navegación
  goBack(): void {
    this.back.emit();
  }

  setActiveTab(tab: 'resumen' | 'historico' | 'info' | 'registro'): void {
    this.activeTab = tab;
    
    // Forzar detección de cambios para que Angular actualice el DOM
    this.ctx.detectChanges();
    
    if (tab === 'historico') {
      // Destruir gráfico existente si hay para forzar recreación
      if (this.levelChart) {
        console.log('Destroying existing chart before recreating');
        this.levelChart.dispose();
        this.levelChart = null;
      }
      
      this.loadTelemetryHistory();
      
      // Intentar inicializar el gráfico con reintentos
      this.tryInitChart(0);
    }
  }
  
  private tryInitChart(attempt: number): void {
    const maxAttempts = 10;
    const delay = 150 + (attempt * 50); // Incrementar delay en cada intento
    
    setTimeout(() => {
      console.log(`Attempt ${attempt + 1}/${maxAttempts} to initialize chart`);
      console.log('Canvas element:', this.levelChartCanvas);
      console.log('Canvas native element:', this.levelChartCanvas?.nativeElement);
      console.log('Loading history:', this.loadingHistory);
      
      if (!this.levelChartCanvas || !this.levelChartCanvas.nativeElement) {
        console.warn('Canvas not ready yet');
        if (attempt < maxAttempts - 1) {
          this.tryInitChart(attempt + 1);
        } else {
          console.error('Failed to initialize chart after max attempts');
        }
        return;
      }
      
      // Esperar a que termine de cargar el histórico
      if (this.loadingHistory) {
        console.log('Still loading history, waiting...');
        if (attempt < maxAttempts - 1) {
          this.tryInitChart(attempt + 1);
        }
        return;
      }
      
      // Canvas está disponible y datos cargados
      if (!this.levelChart) {
        console.log('Initializing chart...');
        this.initLevelChart();
      } else {
        console.log('Chart already exists, resizing...');
        this.levelChart.resize();
        this.updateChartData();
      }
    }, delay);
  }

  // Cargar último API Gravity
  loadLastApiGravity(): void {
    if (!this.tank?.tankId) return;

    const sub = this.manualTelemetryService.getLastApiGravity(this.ctx, this.tank.tankId)
      .subscribe(result => {
        this.lastApiGravity = result;
        this.ctx.detectChanges();
      });

    this.subscriptions.push(sub);
  }

  // Cargar histórico de telemetrías
  loadTelemetryHistory(): void {
    if (!this.tank?.tankId) return;

    this.loadingHistory = true;
    const endTime = Date.now();
    const startTime = endTime - this.selectedTimeRange;

    // Cargar histórico de telemetría del dispositivo (radar)
    this.loadDeviceTelemetryHistory(startTime, endTime);

    // Cargar histórico de API Gravity
    const apiSub = this.manualTelemetryService.getApiGravityHistory(
      this.ctx, this.tank.tankId, startTime, endTime
    ).subscribe(history => {
      this.apiGravityHistory = history;
      this.ctx.detectChanges();
    });

    // Cargar entradas manuales
    const manualSub = this.manualTelemetryService.getManualEntryHistory(
      this.ctx, this.tank.tankId, startTime, endTime
    ).subscribe(entries => {
      this.manualEntries = entries;
      this.loadingHistory = false;
      this.ctx.detectChanges();
    });

    this.subscriptions.push(apiSub, manualSub);
  }

  // Nota: loadDeviceTelemetryHistory está implementado más abajo en la sección de CHART METHODS

  // Cambiar rango de tiempo
  onTimeRangeChange(): void {
    // Destruir gráfico existente para forzar recreación con nuevo rango
    if (this.levelChart) {
      console.log('Destroying chart on time range change');
      this.levelChart.dispose();
      this.levelChart = null;
    }
    
    this.loadTelemetryHistory();
    
    // Reintentar inicializar el gráfico después de cargar datos
    setTimeout(() => {
      if (!this.levelChart && this.activeTab === 'historico') {
        this.tryInitChart(0);
      }
    }, 200);
  }

  // Guardar entrada manual
  saveManualEntry(): void {
    if (!this.tank?.tankId) {
      this.errorMessage = 'No se puede identificar el tanque';
      this.ctx.detectChanges();
      return;
    }

    // Convertir nivel de ft/in a mm si está en modo imperial
    if (this.isImperialUnits()) {
      this.convertFeetInchesToMm();
    }

    // Validar que al menos un valor esté ingresado
    const hasApiGravity = this.manualEntry.apiGravity !== undefined &&
                          this.manualEntry.apiGravity !== null &&
                          !isNaN(Number(this.manualEntry.apiGravity));
    const hasManualLevel = this.manualEntry.manualLevel !== undefined &&
                           this.manualEntry.manualLevel !== null &&
                           !isNaN(Number(this.manualEntry.manualLevel));
    const hasManualTemp = this.manualEntry.manualTemperature !== undefined &&
                          this.manualEntry.manualTemperature !== null &&
                          !isNaN(Number(this.manualEntry.manualTemperature));
    const hasBsw = this.manualEntry.bsw !== undefined &&
                   this.manualEntry.bsw !== null &&
                   !isNaN(Number(this.manualEntry.bsw));

    if (!hasApiGravity && !hasManualLevel && !hasManualTemp && !hasBsw) {
      this.errorMessage = 'Debe ingresar al menos un valor (API Gravity, Nivel, Temperatura o BS&W)';
      this.ctx.detectChanges();
      return;
    }

    // Validar que ctx.http esté disponible
    if (!this.ctx?.http) {
      this.errorMessage = 'Error de conexión: Cliente HTTP no disponible. Recargue la página.';
      this.ctx.detectChanges();
      return;
    }

    this.savingEntry = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.ctx.detectChanges();

    // Parsear timestamp del campo datetime-local
    const entryTimestamp = this.parseDateTimeLocal(this.entryDateTimeLocal);

    // Obtener información del usuario actual
    const currentUser: any = this.ctx.currentUser || {};

    const entry: ManualTelemetryEntry = {
      timestamp: entryTimestamp,
      tankId: this.tank.tankId!,
      tankTag: this.tank.tankTag,
      apiGravity: hasApiGravity ? Number(this.manualEntry.apiGravity) : undefined,
      manualLevel: hasManualLevel ? Number(this.manualEntry.manualLevel) : undefined,
      manualTemperature: hasManualTemp ? Number(this.manualEntry.manualTemperature) : undefined,
      bsw: hasBsw ? Number(this.manualEntry.bsw) : undefined,
      operatorId: currentUser.userId || currentUser.id?.id || 'unknown',
      operatorName: currentUser.firstName
        ? `${currentUser.firstName} ${currentUser.lastName || ''}`
        : currentUser.email || currentUser.name || 'Operador',
      notes: this.manualEntry.notes,
      source: this.manualEntry.source as any || 'manual_gauging',
      autoLevel: this.tank.level,
      deviation: hasManualLevel && this.tank.level
        ? Math.abs(Number(this.manualEntry.manualLevel) - this.tank.level)
        : undefined,
      createdAt: Date.now()
    };

    console.log('Guardando entrada manual:', entry);

    const sub = this.manualTelemetryService.saveManualEntry(this.ctx, entry)
      .subscribe({
        next: () => {
          console.log('Entrada guardada exitosamente');
          this.savingEntry = false;
          this.successMessage = 'Registro guardado exitosamente';
          this.resetManualEntryForm();
          this.loadLastApiGravity();
          this.loadLastBsw();
          this.loadTelemetryHistory();
          this.ctx.detectChanges();

          // Limpiar mensaje después de 3 segundos
          setTimeout(() => {
            this.successMessage = null;
            this.ctx.detectChanges();
          }, 3000);
        },
        error: (error) => {
          console.error('Error guardando entrada manual:', error);
          this.savingEntry = false;
          // Extraer mensaje de error más detallado
          let errorMsg = 'Error desconocido';
          if (error?.error?.message) {
            errorMsg = error.error.message;
          } else if (error?.message) {
            errorMsg = error.message;
          } else if (error?.status) {
            errorMsg = `Error HTTP ${error.status}: ${error.statusText || 'Sin descripción'}`;
          } else if (typeof error === 'string') {
            errorMsg = error;
          }
          this.errorMessage = `Error al guardar el registro: ${errorMsg}`;
          this.ctx.detectChanges();
        }
      });

    this.subscriptions.push(sub);
  }

  // Resetear formulario
  resetManualEntryForm(): void {
    this.manualEntry = {
      timestamp: Date.now(),
      apiGravity: undefined,
      manualLevel: undefined,
      manualTemperature: undefined,
      bsw: undefined,
      notes: '',
      source: 'manual_gauging'
    };
    this.manualLevelFeet = undefined;
    this.manualLevelInches = undefined;
    this.manualLevelFraction = '0';
    this.entryDateTimeLocal = this.formatDateTimeLocal(new Date());
    this.errorMessage = null;
    this.successMessage = null;
    this.ctx.detectChanges();
  }

  // Formatear fecha
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Formatear fecha corta
  formatDateShort(timestamp: number): string {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Obtener color según nivel de alarma
  getAlarmColor(): string {
    switch (this.tank?.currentAlarmLevel) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'low': return '#fbc02d';
      default: return '#4caf50';
    }
  }

  // Obtener texto de estado del radar
  getRadarStatusText(): string {
    switch (this.tank?.radarStatus) {
      case 'online': return 'En línea';
      case 'offline': return 'Fuera de línea';
      case 'error': return 'Error';
      default: return 'Desconocido';
    }
  }

  /**
   * ========================================
   * CHART METHODS
   * ========================================
   */

  /**
   * Cargar histórico de telemetría del dispositivo radar
   */
  private loadDeviceTelemetryHistory(startTime: number, endTime: number): void {
    if (!this.tank?.tankId) {
      console.warn('No tank ID available');
      this.levelHistoryData = [];
      return;
    }

    // Primero obtener el radar asignado al tanque
    this.ctx.http.get(`/api/relations/info`, {
      params: {
        fromId: this.tank.tankId,
        fromType: 'ASSET',
        relationType: 'Contains'
      }
    }).subscribe({
      next: (relations: any) => {
        if (!relations || relations.length === 0) {
          console.warn('No radar assigned to this tank');
          this.levelHistoryData = [];
          return;
        }

        const radarDeviceId = relations[0].to.id;
        console.log('Found radar device:', radarDeviceId);

        // Obtener telemetría de nivel del radar con agregados
        const keys = 'level'; // La clave de telemetría del nivel
        const timeRange = endTime - startTime;
        
        // Optimización: Calcular intervalo y límite basado en el rango de tiempo
        // Para un mes (30 días), queremos ~500-800 puntos para balance entre detalle y rendimiento
        const maxPoints = 500; // Reducido de 1000 a 500 para mejor rendimiento
        let interval = Math.ceil(timeRange / maxPoints);
        let limit = 500; // Límite de puntos a solicitar
        
        // Redondear a intervalos razonables según el rango
        const hours = timeRange / 3600000;
        
        if (hours <= 24) {
          // Último día: 5 minutos de intervalo (~288 puntos)
          interval = 300000; // 5 minutos
          limit = 300;
        } else if (hours <= 72) {
          // 3 días: 15 minutos de intervalo (~288 puntos)
          interval = 900000; // 15 minutos
          limit = 300;
        } else if (hours <= 168) {
          // 1 semana: 30 minutos de intervalo (~336 puntos)
          interval = 1800000; // 30 minutos
          limit = 350;
        } else if (hours <= 720) {
          // 1 mes: 2 horas de intervalo (~360 puntos)
          interval = 7200000; // 2 horas
          limit = 400;
        } else {
          // Más de 1 mes: 4 horas de intervalo
          interval = 14400000; // 4 horas
          limit = 500;
        }
        
        const agg = 'AVG';
        
        console.log(`Time range: ${timeRange}ms (${timeRange / 3600000} hours)`);
        console.log(`Calculated interval: ${interval}ms (${interval / 60000} minutes)`);
        console.log(`Expected data points: ~${Math.ceil(timeRange / interval)}`);
        
        this.ctx.http.get(
          `/api/plugins/telemetry/DEVICE/${radarDeviceId}/values/timeseries`,
          {
            params: {
              keys: keys,
              startTs: startTime.toString(),
              endTs: endTime.toString(),
              limit: limit.toString(),
              agg: agg,
              interval: interval.toString()
            }
          }
        ).subscribe({
          next: (data: any) => {
            console.log('Telemetry data received:', data);
            
            if (data && data.level && Array.isArray(data.level)) {
              this.levelHistoryData = data.level.map((point: any) => ({
                timestamp: point.ts,
                level: parseFloat(point.value)
              })).sort((a, b) => a.timestamp - b.timestamp);
              
              console.log(`Loaded ${this.levelHistoryData.length} level data points`);
              
              // Actualizar o inicializar gráfico
              if (this.levelChart) {
                console.log('Chart exists, updating data');
                this.updateChartData();
              } else if (this.activeTab === 'historico') {
                // Si estamos en la pestaña de histórico y el gráfico no existe, intentar inicializarlo
                console.log('Chart does not exist, attempting to initialize');
                setTimeout(() => {
                  if (!this.levelChart && this.levelChartCanvas?.nativeElement) {
                    this.initLevelChart();
                  }
                }, 100);
              }
            } else {
              console.warn('No level data in response');
              this.levelHistoryData = [];
            }
          },
          error: (err) => {
            console.error('Error loading telemetry history:', err);
            this.levelHistoryData = [];
          }
        });
      },
      error: (err) => {
        console.error('Error loading radar assignment:', err);
        this.levelHistoryData = [];
      }
    });
  }

  /**
   * Inicializar el gráfico de nivel con ECharts
   */
  private initLevelChart(): void {
    console.log('initLevelChart called');
    
    if (!this.levelChartCanvas || !this.levelChartCanvas.nativeElement) {
      console.warn('Chart container not available yet');
      return;
    }

    console.log('Chart container found');

    // Destruir gráfico existente si hay
    if (this.levelChart) {
      console.log('Disposing existing chart');
      this.levelChart.dispose();
    }

    // Inicializar ECharts
    this.levelChart = echarts.init(this.levelChartCanvas.nativeElement);

    // Obtener formato de nivel actual
    const levelFormat = this.systemConfigService.getLevelFormat();
    const formatted = this.levelFormatterService.formatLevel(1000, levelFormat);
    const unit = formatted.unit;

    console.log('Level format:', levelFormat, 'Unit:', unit);
    
    // Calcular rango de tiempo para el eje X
    const endTime = Date.now();
    const startTime = endTime - this.selectedTimeRange;

    // Configuración del gráfico
    const option: EChartsOption = {
      title: {
        text: `Histórico de Nivel (${unit})`,
        left: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const param = params[0];
          const date = new Date(param.value[0]);
          const dateStr = date.toLocaleString('es-ES');
          const levelValue = param.value[1];
          const formattedLevel = this.levelFormatterService.formatLevel(levelValue, levelFormat);
          return `${dateStr}<br/>Nivel: ${formattedLevel.value} ${formattedLevel.unit}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          start: 0,
          end: 100,
          handleIcon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
          handleSize: '80%',
          handleStyle: {
            color: '#fff',
            shadowBlur: 3,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
            shadowOffsetX: 2,
            shadowOffsetY: 2
          }
        }
      ],
      xAxis: {
        type: 'time',
        // Establecer límites explícitos para mostrar el rango completo
        min: endTime - this.selectedTimeRange,
        max: endTime,
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return date.toLocaleString('es-ES', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        }
      },
      yAxis: {
        type: 'value',
        name: `Nivel (${unit})`,
        axisLabel: {
          formatter: (value: number) => {
            const formatted = this.levelFormatterService.formatLevel(value, levelFormat);
            return formatted.value;
          }
        }
      },
      series: [
        {
          name: 'Nivel',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#2196F3',
            width: 2
          },
          itemStyle: {
            color: '#2196F3'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(33, 150, 243, 0.3)' },
                { offset: 1, color: 'rgba(33, 150, 243, 0.05)' }
              ]
            }
          },
          data: []
        }
      ]
    };

    this.levelChart.setOption(option);
    console.log('Chart created successfully');
    console.log('Level history data points:', this.levelHistoryData.length);
    this.updateChartData();
    
    // Forzar resize después de un breve delay para asegurar renderizado correcto
    setTimeout(() => {
      if (this.levelChart) {
        this.levelChart.resize();
        console.log('Chart resized after initialization');
      }
    }, 100);
  }

  /**
   * Actualizar datos del gráfico
   */
  private updateChartData(): void {
    if (!this.levelChart) return;

    // Convertir datos al formato de ECharts [timestamp, value]
    const chartData = this.levelHistoryData.map(point => [point.timestamp, point.level]);

    console.log('Updating chart with data points:', chartData.length);
    
    // Calcular rango de tiempo para el eje X
    const endTime = Date.now();
    const startTime = endTime - this.selectedTimeRange;

    // Actualizar serie de datos y rango del eje X
    this.levelChart.setOption({
      xAxis: {
        min: startTime,
        max: endTime
      },
      series: [
        {
          data: chartData
        }
      ]
    });
    
    // Forzar resize después de actualizar datos
    setTimeout(() => {
      if (this.levelChart) {
        this.levelChart.resize();
      }
    }, 50);
  }

  /**
   * Resetear zoom del gráfico
   */
  resetChartZoom(): void {
    if (this.levelChart) {
      this.levelChart.dispatchAction({
        type: 'dataZoom',
        start: 0,
        end: 100
      });
    }
  }

  /**
   * ========================================
   * TANK SVG VISUALIZATION METHODS
   * ========================================
   */

  /**
   * Get SVG path for tank visualization
   */
  getTankSvgPath(): string {
    const shape = this.tank?.tankShape || 'vertical_cylinder';
    const roofType = 'fixed_cone'; // Default roof type
    const bottomType = 'flat'; // Default bottom type

    // Calculate dimensions based on real tank ratio
    const tankHeight = this.tank?.tankHeight || 12; // metros
    const tankDiameter = this.tank?.tankDiameter || 8; // metros
    const ratio = tankDiameter / tankHeight; // ancho/alto
    
    // Base dimensions for SVG respecting ratio
    const maxHeight = 240;
    const maxWidth = 200;
    
    let shellHeight = maxHeight;
    let width = shellHeight * ratio;
    
    // Si el ancho excede el máximo, ajustar por ancho
    if (width > maxWidth) {
      width = maxWidth;
      shellHeight = width / ratio;
    }
    
    const roofHeight = 40;
    const bottomHeight = 20;

    if (shape === 'vertical_cylinder' || shape === 'vertical' as any) {
      return this.getVerticalCylinderPath(width, shellHeight, roofType, bottomType, roofHeight, bottomHeight);
    } else if (shape === 'horizontal_cylinder' || shape === 'horizontal' as any) {
      return this.getHorizontalCylinderPath(width, shellHeight);
    } else if (shape === 'spherical') {
      return this.getSphericalTankPath(width, shellHeight);
    }
    return '';
  }

  /**
   * Get roof SVG path (separate from shell)
   */
  getRoofSvgPath(): string {
    const shape = this.tank?.tankShape || 'vertical_cylinder';
    if (shape !== 'vertical_cylinder' && shape !== 'vertical') {
      return '';
    }

    // Calculate dimensions based on real tank ratio
    const tankHeight = this.tank?.tankHeight || 12;
    const tankDiameter = this.tank?.tankDiameter || 8;
    const ratio = tankDiameter / tankHeight;
    
    const maxHeight = 240;
    const maxWidth = 200;
    const viewBoxWidth = 300;
    
    let shellHeight = maxHeight;
    let width = shellHeight * ratio;
    
    if (width > maxWidth) {
      width = maxWidth;
      shellHeight = width / ratio;
    }

    // Centrar el tanque en el viewBox
    const x = (viewBoxWidth - width) / 2;
    const y = 30;
    const roofHeight = 40;

    // Fixed cone roof
    return `M ${x} ${y + roofHeight} L ${x + width/2} ${y} L ${x + width} ${y + roofHeight} Z`;
  }

  /**
   * Get liquid level path
   */
  getLiquidPath(): string {
    const shape = this.tank?.tankShape || 'vertical_cylinder';
    const levelPercent = this.tank?.levelPercent || 0;

    if (levelPercent <= 0) return '';

    // Calculate dimensions based on real tank ratio
    const tankHeight = this.tank?.tankHeight || 12;
    const tankDiameter = this.tank?.tankDiameter || 8;
    const ratio = tankDiameter / tankHeight;
    
    const maxHeight = 240;
    const maxWidth = 200;
    const viewBoxWidth = 300;
    
    let shellHeight = maxHeight;
    let width = shellHeight * ratio;
    
    if (width > maxWidth) {
      width = maxWidth;
      shellHeight = width / ratio;
    }

    // Centrar el tanque en el viewBox
    const x = (viewBoxWidth - width) / 2;
    const y = 30;
    const roofHeight = 40;

    if (shape === 'vertical_cylinder' || shape === 'vertical' as any) {
      const liquidHeight = (shellHeight * levelPercent) / 100;
      const liquidY = y + roofHeight + shellHeight - liquidHeight;

      return `M ${x} ${liquidY} L ${x} ${y + roofHeight + shellHeight} L ${x + width} ${y + roofHeight + shellHeight} L ${x + width} ${liquidY} Z`;
    }

    return '';
  }

  private getVerticalCylinderPath(width: number, shellHeight: number, roofType: string, bottomType: string, roofHeight: number, bottomHeight: number): string {
    const viewBoxWidth = 300;
    const x = (viewBoxWidth - width) / 2; // Centrar
    const y = 30;
    const w = width;
    const h = shellHeight;

    // Shell rectangle only (roof is separate)
    let path = `M ${x} ${y + roofHeight} L ${x} ${y + roofHeight + h} `;

    // Bottom
    if (bottomType === 'cone_down') {
      path += `L ${x + w/2} ${y + roofHeight + h + bottomHeight} L ${x + w} ${y + roofHeight + h} `;
    } else if (bottomType === 'cone_up') {
      path += `Q ${x + w/2} ${y + roofHeight + h - bottomHeight} ${x + w} ${y + roofHeight + h} `;
    } else {
      path += `L ${x + w} ${y + roofHeight + h} `;
    }

    // Right wall
    path += `L ${x + w} ${y + roofHeight} `;

    // Close path at top (flat for shell only)
    path += `L ${x} ${y + roofHeight} Z`;

    return path;
  }

  private getHorizontalCylinderPath(width: number, height: number): string {
    const x = 50;
    const y = 80;
    const w = width;
    const h = 160;
    const radius = h / 2;

    return `
      M ${x + radius} ${y}
      L ${x + w - radius} ${y}
      A ${radius} ${radius} 0 0 1 ${x + w - radius} ${y + h}
      L ${x + radius} ${y + h}
      A ${radius} ${radius} 0 0 1 ${x + radius} ${y}
      Z
    `;
  }

  private getSphericalTankPath(width: number, height: number): string {
    const cx = 150;
    const cy = 180;
    const r = 100;

    return `
      M ${cx - r} ${cy}
      A ${r} ${r} 0 1 1 ${cx + r} ${cy}
      A ${r} ${r} 0 1 1 ${cx - r} ${cy}
      Z
    `;
  }

  /**
   * Get tank shape label
   */
  getTankShapeLabel(): string {
    const shape = this.tank?.tankShape || 'vertical_cylinder';
    const labels: Record<string, string> = {
      'vertical_cylinder': 'Cilindro Vertical',
      'vertical': 'Cilindro Vertical',
      'horizontal_cylinder': 'Cilindro Horizontal',
      'horizontal': 'Cilindro Horizontal',
      'spherical': 'Esférico'
    };
    return labels[shape] || 'Cilindro Vertical';
  }

  /**
   * ========================================
   * BSW METHODS
   * ========================================
   */

  /**
   * Load last BSW value
   */
  loadLastBsw(): void {
    if (!this.tank?.tankId) return;

    const endTime = Date.now();
    const startTime = endTime - (90 * 24 * 60 * 60 * 1000); // Last 90 days

    const sub = this.manualTelemetryService.getManualEntryHistory(
      this.ctx, this.tank.tankId, startTime, endTime
    ).subscribe(entries => {
      // Find the most recent entry with BSW value
      const entriesWithBsw = entries.filter(e => e.bsw !== undefined && e.bsw !== null);
      if (entriesWithBsw.length > 0) {
        this.lastBswEntry = entriesWithBsw[0]; // Already sorted by timestamp desc
      }
      this.ctx.detectChanges();
    });

    this.subscriptions.push(sub);
  }

  /**
   * Get BSW value for display
   */
  getBswValue(): string {
    // Primero intentar obtener de registros manuales
    if (this.lastBswEntry && this.lastBswEntry.bsw !== undefined) {
      return this.lastBswEntry.bsw.toFixed(2);
    }
    // Si no hay registros manuales, usar el valor de los atributos del tanque
    if (this.tank?.bsw !== undefined) {
      return this.tank.bsw.toFixed(2);
    }
    return 'N/A';
  }

  /**
   * ========================================
   * INFO TAB HELPER METHODS
   * ========================================
   */

  /**
   * Get tank attribute from server attributes
   */
  getTankAttribute(attributeName: string): any {
    // Los atributos se cargan dinámicamente desde el asset
    // Por ahora retornamos null, pero se pueden cargar bajo demanda
    // usando el servicio de atributos de ThingsBoard
    return null;
  }

  /**
   * Get roof type label
   */
  getRoofTypeLabel(): string {
    const roofType = this.getTankAttribute('roofType');
    const labels: Record<string, string> = {
      'fixed_cone': 'Techo Cónico Fijo',
      'fixed_dome': 'Techo Domo Fijo',
      'geodesic_dome': 'Domo Geodésico',
      'floating_external': 'Techo Flotante Externo',
      'floating_internal': 'Techo Flotante Interno',
      'floating_covered': 'Techo Flotante con Domo',
      'open_top': 'Sin Techo (Abierto)'
    };
    return labels[roofType] || 'N/A';
  }

  /**
   * Get bottom type label
   */
  getBottomTypeLabel(): string {
    const bottomType = this.getTankAttribute('bottomType');
    const labels: Record<string, string> = {
      'flat': 'Fondo Plano',
      'cone_up': 'Cono Arriba (Centro Alto)',
      'cone_down': 'Cono Abajo (Drenaje)',
      'slope': 'Pendiente Simple'
    };
    return labels[bottomType] || 'N/A';
  }

  /**
   * Get shell material label
   */
  getShellMaterialLabel(): string {
    const material = this.getTankAttribute('shellMaterial');
    const labels: Record<string, string> = {
      'carbon_steel': 'Acero al Carbono',
      'stainless_steel': 'Acero Inoxidable',
      'aluminum': 'Aluminio',
      'fiberglass': 'Fibra de Vidrio',
      'concrete': 'Concreto'
    };
    return labels[material] || 'N/A';
  }

  /**
   * Get tank service label
   */
  getTankServiceLabel(): string {
    const service = this.getTankAttribute('tankService');
    const labels: Record<string, string> = {
      'crude_oil': 'Petróleo Crudo',
      'refined_products': 'Productos Refinados',
      'chemicals': 'Químicos',
      'water': 'Agua',
      'lpg': 'GLP',
      'other': 'Otro'
    };
    return labels[service] || 'N/A';
  }
}
