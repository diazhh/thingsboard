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

/**
 * Report Types - All available report types in the system
 */
export enum ReportType {
  // Inventory Reports (7)
  DAILY_INVENTORY = 'daily_inventory',
  TANK_INVENTORY_SUMMARY = 'tank_inventory_summary',
  PRODUCT_INVENTORY_BY_GROUP = 'product_inventory_by_group',
  TANK_STATUS = 'tank_status',
  CAPACITY_UTILIZATION = 'capacity_utilization',
  LOW_STOCK_ALERT = 'low_stock_alert',
  OVERFILL_RISK = 'overfill_risk',

  // Custody Transfer Reports (4)
  BATCH_TRANSFER = 'batch_transfer',
  BATCH_HISTORY = 'batch_history',
  MASS_BALANCE = 'mass_balance',
  TRANSFER_RECONCILIATION = 'transfer_reconciliation',

  // Analysis Reports (5)
  LABORATORY_ANALYSIS = 'laboratory_analysis',
  MANUAL_GAUGING = 'manual_gauging',
  DEVIATION_ANALYSIS = 'deviation_analysis',
  TEMPERATURE_PROFILE = 'temperature_profile',
  DENSITY_VARIATION = 'density_variation',

  // Historical Reports (6)
  HISTORICAL_LEVEL_TRENDS = 'historical_level_trends',
  HISTORICAL_VOLUME_TRENDS = 'historical_volume_trends',
  ALARM_HISTORY = 'alarm_history',
  EVENT_LOG = 'event_log',
  CONFIGURATION_CHANGE_HISTORY = 'configuration_change_history',
  PERFORMANCE_METRICS = 'performance_metrics',

  // Compliance Reports (3)
  OIML_R85_COMPLIANCE = 'oiml_r85_compliance',
  AUDIT_TRAIL_SUMMARY = 'audit_trail_summary',
  CALIBRATION_STATUS = 'calibration_status'
}

/**
 * Report Category
 */
export enum ReportCategory {
  INVENTORY = 'inventory',
  CUSTODY_TRANSFER = 'custody_transfer',
  ANALYSIS = 'analysis',
  HISTORICAL = 'historical',
  COMPLIANCE = 'compliance'
}

/**
 * Report Format
 */
export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv'
}

/**
 * Report Status
 */
export enum ReportStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Export Destination Type
 */
export enum ExportDestinationType {
  DOWNLOAD = 'download',
  EMAIL = 'email',
  FTP = 'ftp',
  SFTP = 'sftp',
  S3 = 's3',
  LOCAL = 'local'
}

/**
 * Schedule Frequency
 */
export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom'
}

/**
 * Report Information
 */
export interface ReportInfo {
  type: ReportType;
  name: string;
  description: string;
  category: ReportCategory;
  icon: string;
  supportedFormats: ReportFormat[];
  requiredParameters: string[];
  optionalParameters: string[];
  estimatedGenerationTime: number; // seconds
  ready?: boolean; // true if backend is implemented, false if only frontend
}

/**
 * Report Parameters
 */
export interface ReportParameters {
  tankIds?: string[];
  startDate?: number;
  endDate?: number;
  productFilter?: string;
  groupFilter?: string;
  batchId?: string;
  aggregation?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  includeCharts?: boolean;
  [key: string]: any;
}

/**
 * Report Generation Request
 */
export interface ReportGenerationRequest {
  reportType: ReportType;
  format: ReportFormat;
  parameters: ReportParameters;
  locale?: string;
  timezone?: string;
}

/**
 * Report Generation Response
 */
export interface ReportGenerationResponse {
  reportId: string;
  reportType?: ReportType;
  format?: ReportFormat;
  status: ReportStatus;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  generatedAt?: number;
  error?: string;
  fileContent?: string; // Base64 encoded file content
}

/**
 * Export Destination Configuration
 */
export interface ExportDestination {
  type: ExportDestinationType;
  config: EmailConfig | FtpConfig | S3Config | LocalConfig;
}

export interface EmailConfig {
  recipients: string[];
  subject: string;
  body?: string;
  cc?: string[];
  bcc?: string[];
}

export interface FtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  path: string;
  secure?: boolean; // true for SFTP
}

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  path: string;
}

export interface LocalConfig {
  path: string;
}

/**
 * Scheduled Report Configuration
 */
export interface ScheduledReport {
  id?: string;
  name: string;
  description?: string;
  enabled: boolean;
  reportType: ReportType;
  format: ReportFormat[];
  schedule: ScheduleConfig;
  parameters: ReportParameters;
  destinations: ExportDestination[];
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
  notificationEmails?: string[];
  createdAt?: number;
  updatedAt?: number;
  lastRunAt?: number;
  nextRunAt?: number;
}

/**
 * Schedule Configuration
 */
export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  time: string; // HH:MM format
  timezone: string;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday) for weekly
  dayOfMonth?: number; // 1-31 for monthly
  cronExpression?: string; // for custom frequency
}

/**
 * Report Execution History
 */
export interface ReportExecution {
  id: string;
  scheduledReportId?: string;
  reportType: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  startedAt: number;
  completedAt?: number;
  duration?: number; // milliseconds
  outputFiles?: ReportFile[];
  error?: string;
  parameters: ReportParameters;
}

/**
 * Report File
 */
export interface ReportFile {
  fileName: string;
  format: ReportFormat;
  size: number;
  downloadUrl: string;
  generatedAt: number;
}

/**
 * Report Statistics
 */
export interface ReportStatistics {
  totalReports: number;
  reportsByType: { [key in ReportType]?: number };
  reportsByStatus: { [key in ReportStatus]?: number };
  averageGenerationTime: number;
  totalFileSize: number;
}

/**
 * Constants
 */
export const REPORT_INFO_MAP: { [key in ReportType]: ReportInfo } = {
  [ReportType.DAILY_INVENTORY]: {
    type: ReportType.DAILY_INVENTORY,
    name: 'Reporte de Inventario Diario',
    description: 'Snapshot diario de todos los inventarios de tanques',
    category: ReportCategory.INVENTORY,
    icon: 'inventory',
    supportedFormats: [ReportFormat.CSV, ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: ['date'],
    optionalParameters: ['tankIds', 'productFilter'],
    estimatedGenerationTime: 30,
    ready: true
  },
  [ReportType.TANK_INVENTORY_SUMMARY]: {
    type: ReportType.TANK_INVENTORY_SUMMARY,
    name: 'Resumen de Inventario de Tanques',
    description: 'Resumen de inventario en tiempo real con gráficos',
    category: ReportCategory.INVENTORY,
    icon: 'summarize',
    supportedFormats: [ReportFormat.CSV, ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: [],
    optionalParameters: ['tankIds', 'productFilter', 'includeCharts'],
    estimatedGenerationTime: 20,
    ready: true
  },
  [ReportType.PRODUCT_INVENTORY_BY_GROUP]: {
    type: ReportType.PRODUCT_INVENTORY_BY_GROUP,
    name: 'Inventario de Productos por Grupo',
    description: 'Inventario agrupado por tipo de producto',
    category: ReportCategory.INVENTORY,
    icon: 'category',
    supportedFormats: [ReportFormat.CSV, ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: [],
    optionalParameters: ['productFilter', 'groupFilter'],
    estimatedGenerationTime: 25,
    ready: true
  },
  [ReportType.TANK_STATUS]: {
    type: ReportType.TANK_STATUS,
    name: 'Reporte de Estado de Tanques',
    description: 'Estado operacional de todos los tanques',
    category: ReportCategory.INVENTORY,
    icon: 'info',
    supportedFormats: [ReportFormat.CSV, ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: [],
    optionalParameters: ['tankIds'],
    estimatedGenerationTime: 15,
    ready: true
  },
  [ReportType.CAPACITY_UTILIZATION]: {
    type: ReportType.CAPACITY_UTILIZATION,
    name: 'Reporte de Utilización de Capacidad',
    description: 'Análisis de la utilización de capacidad de tanques',
    category: ReportCategory.INVENTORY,
    icon: 'analytics',
    supportedFormats: [ReportFormat.CSV, ReportFormat.PDF],
    requiredParameters: [],
    optionalParameters: ['tankIds', 'startDate', 'endDate'],
    estimatedGenerationTime: 35,
    ready: true
  },
  [ReportType.LOW_STOCK_ALERT]: {
    type: ReportType.LOW_STOCK_ALERT,
    name: 'Reporte de Alerta de Bajo Stock',
    description: 'Tanques con niveles de inventario bajo',
    category: ReportCategory.INVENTORY,
    icon: 'warning',
    supportedFormats: [ReportFormat.CSV, ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: [],
    optionalParameters: ['threshold'],
    estimatedGenerationTime: 10,
    ready: true
  },
  [ReportType.OVERFILL_RISK]: {
    type: ReportType.OVERFILL_RISK,
    name: 'Reporte de Riesgo de Desbordamiento',
    description: 'Tanques en riesgo de desbordamiento',
    category: ReportCategory.INVENTORY,
    icon: 'error',
    supportedFormats: [ReportFormat.CSV, ReportFormat.PDF],
    requiredParameters: [],
    optionalParameters: ['threshold'],
    estimatedGenerationTime: 10,
    ready: true
  },
  [ReportType.BATCH_TRANSFER]: {
    type: ReportType.BATCH_TRANSFER,
    name: 'Batch Transfer Report',
    description: 'Official custody transfer report',
    category: ReportCategory.CUSTODY_TRANSFER,
    icon: 'receipt',
    supportedFormats: [ReportFormat.PDF],
    requiredParameters: ['batchId'],
    optionalParameters: [],
    estimatedGenerationTime: 20,
    ready: false
  },
  [ReportType.BATCH_HISTORY]: {
    type: ReportType.BATCH_HISTORY,
    name: 'Batch History Report',
    description: 'Historical batch records',
    category: ReportCategory.CUSTODY_TRANSFER,
    icon: 'history',
    supportedFormats: [ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: ['startDate', 'endDate'],
    optionalParameters: ['tankIds', 'batchType'],
    estimatedGenerationTime: 30,
    ready: false
  },
  [ReportType.MASS_BALANCE]: {
    type: ReportType.MASS_BALANCE,
    name: 'Reporte de Balance de Masa',
    description: 'Análisis de balance de masa con detección de discrepancias',
    category: ReportCategory.CUSTODY_TRANSFER,
    icon: 'balance',
    supportedFormats: [ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: ['startDate', 'endDate'],
    optionalParameters: ['tankIds'],
    estimatedGenerationTime: 40,
    ready: true
  },
  [ReportType.TRANSFER_RECONCILIATION]: {
    type: ReportType.TRANSFER_RECONCILIATION,
    name: 'Transfer Reconciliation Report',
    description: 'Reconciliation of internal transfers',
    category: ReportCategory.CUSTODY_TRANSFER,
    icon: 'compare_arrows',
    supportedFormats: [ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: ['sourceBatchId', 'destinationBatchId'],
    optionalParameters: [],
    estimatedGenerationTime: 25,
    ready: false
  },
  [ReportType.LABORATORY_ANALYSIS]: {
    type: ReportType.LABORATORY_ANALYSIS,
    name: 'Laboratory Analysis Report',
    description: 'Consolidated lab analysis results',
    category: ReportCategory.ANALYSIS,
    icon: 'science',
    supportedFormats: [ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: ['startDate', 'endDate'],
    optionalParameters: ['tankIds', 'includeCharts'],
    estimatedGenerationTime: 30,
    ready: false
  },
  [ReportType.MANUAL_GAUGING]: {
    type: ReportType.MANUAL_GAUGING,
    name: 'Manual Gauging Report',
    description: 'Manual gauging measurements and deviations',
    category: ReportCategory.ANALYSIS,
    icon: 'straighten',
    supportedFormats: [ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: ['startDate', 'endDate'],
    optionalParameters: ['tankIds'],
    estimatedGenerationTime: 25,
    ready: false
  },
  [ReportType.DEVIATION_ANALYSIS]: {
    type: ReportType.DEVIATION_ANALYSIS,
    name: 'Deviation Analysis Report',
    description: 'Analysis of automatic vs manual deviations',
    category: ReportCategory.ANALYSIS,
    icon: 'trending_up',
    supportedFormats: [ReportFormat.PDF],
    requiredParameters: ['startDate', 'endDate'],
    optionalParameters: ['tankIds'],
    estimatedGenerationTime: 35,
    ready: false
  },
  [ReportType.TEMPERATURE_PROFILE]: {
    type: ReportType.TEMPERATURE_PROFILE,
    name: 'Temperature Profile Report',
    description: 'Temperature profiles and variations',
    category: ReportCategory.ANALYSIS,
    icon: 'thermostat',
    supportedFormats: [ReportFormat.PDF],
    requiredParameters: ['tankId', 'startDate', 'endDate'],
    optionalParameters: [],
    estimatedGenerationTime: 30,
    ready: false
  },
  [ReportType.DENSITY_VARIATION]: {
    type: ReportType.DENSITY_VARIATION,
    name: 'Density Variation Report',
    description: 'Density and API gravity variations',
    category: ReportCategory.ANALYSIS,
    icon: 'opacity',
    supportedFormats: [ReportFormat.PDF],
    requiredParameters: ['startDate', 'endDate'],
    optionalParameters: ['tankIds'],
    estimatedGenerationTime: 30,
    ready: false
  },
  [ReportType.HISTORICAL_LEVEL_TRENDS]: {
    type: ReportType.HISTORICAL_LEVEL_TRENDS,
    name: 'Tendencias Históricas de Nivel',
    description: 'Tendencias históricas de nivel con gráficos',
    category: ReportCategory.HISTORICAL,
    icon: 'show_chart',
    supportedFormats: [ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: ['tankIds', 'startDate', 'endDate'],
    optionalParameters: ['aggregation'],
    estimatedGenerationTime: 40,
    ready: true
  },
  [ReportType.HISTORICAL_VOLUME_TRENDS]: {
    type: ReportType.HISTORICAL_VOLUME_TRENDS,
    name: 'Tendencias Históricas de Volumen',
    description: 'Tendencias históricas de volumen (TOV, GOV, GSV, NSV)',
    category: ReportCategory.HISTORICAL,
    icon: 'waterfall_chart',
    supportedFormats: [ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: ['tankIds', 'startDate', 'endDate'],
    optionalParameters: ['aggregation'],
    estimatedGenerationTime: 40,
    ready: true
  },
  [ReportType.ALARM_HISTORY]: {
    type: ReportType.ALARM_HISTORY,
    name: 'Reporte de Historial de Alarmas',
    description: 'Registros históricos de alarmas y estadísticas',
    category: ReportCategory.HISTORICAL,
    icon: 'notifications',
    supportedFormats: [ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: ['startDate', 'endDate'],
    optionalParameters: ['tankIds', 'alarmType', 'severity'],
    estimatedGenerationTime: 35,
    ready: true
  },
  [ReportType.EVENT_LOG]: {
    type: ReportType.EVENT_LOG,
    name: 'Event Log Report (OIML R85)',
    description: 'Audit trail for OIML R85 compliance',
    category: ReportCategory.HISTORICAL,
    icon: 'event_note',
    supportedFormats: [ReportFormat.PDF, ReportFormat.CSV],
    requiredParameters: ['startDate', 'endDate'],
    optionalParameters: ['eventType', 'userId'],
    estimatedGenerationTime: 30,
    ready: true
  },
  [ReportType.CONFIGURATION_CHANGE_HISTORY]: {
    type: ReportType.CONFIGURATION_CHANGE_HISTORY,
    name: 'Configuration Change History',
    description: 'History of configuration changes',
    category: ReportCategory.HISTORICAL,
    icon: 'settings_backup_restore',
    supportedFormats: [ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: ['startDate', 'endDate'],
    optionalParameters: ['changeType'],
    estimatedGenerationTime: 25,
    ready: false
  },
  [ReportType.PERFORMANCE_METRICS]: {
    type: ReportType.PERFORMANCE_METRICS,
    name: 'Performance Metrics Report',
    description: 'System performance metrics',
    category: ReportCategory.HISTORICAL,
    icon: 'speed',
    supportedFormats: [ReportFormat.PDF],
    requiredParameters: ['startDate', 'endDate'],
    optionalParameters: [],
    estimatedGenerationTime: 30,
    ready: false
  },
  [ReportType.OIML_R85_COMPLIANCE]: {
    type: ReportType.OIML_R85_COMPLIANCE,
    name: 'Reporte de Cumplimiento OIML R85',
    description: 'Reporte de cumplimiento para certificación OIML R85',
    category: ReportCategory.COMPLIANCE,
    icon: 'verified',
    supportedFormats: [ReportFormat.PDF],
    requiredParameters: [],
    optionalParameters: [],
    estimatedGenerationTime: 60,
    ready: true
  },
  [ReportType.AUDIT_TRAIL_SUMMARY]: {
    type: ReportType.AUDIT_TRAIL_SUMMARY,
    name: 'Resumen de Pista de Auditoría',
    description: 'Resumen ejecutivo de la pista de auditoría',
    category: ReportCategory.COMPLIANCE,
    icon: 'fact_check',
    supportedFormats: [ReportFormat.PDF],
    requiredParameters: ['startDate', 'endDate'],
    optionalParameters: [],
    estimatedGenerationTime: 35,
    ready: true
  },
  [ReportType.CALIBRATION_STATUS]: {
    type: ReportType.CALIBRATION_STATUS,
    name: 'Reporte de Estado de Calibración',
    description: 'Estado de calibración de todos los dispositivos',
    category: ReportCategory.COMPLIANCE,
    icon: 'tune',
    supportedFormats: [ReportFormat.PDF, ReportFormat.EXCEL],
    requiredParameters: [],
    optionalParameters: ['deviceType'],
    estimatedGenerationTime: 20,
    ready: true
  }
};

/**
 * Helper Functions
 */
export function getReportInfo(type: ReportType): ReportInfo {
  return REPORT_INFO_MAP[type];
}

export function getReportsByCategory(category: ReportCategory): ReportInfo[] {
  return Object.values(REPORT_INFO_MAP).filter(info => info.category === category);
}

export function getAllReportTypes(): ReportType[] {
  return Object.values(ReportType);
}

export function getReportCategoryLabel(category: ReportCategory): string {
  const labels = {
    [ReportCategory.INVENTORY]: 'Reportes de Inventario',
    [ReportCategory.CUSTODY_TRANSFER]: 'Reportes de Transferencia de Custodia',
    [ReportCategory.ANALYSIS]: 'Reportes de Análisis',
    [ReportCategory.HISTORICAL]: 'Reportes Históricos',
    [ReportCategory.COMPLIANCE]: 'Reportes de Cumplimiento'
  };
  return labels[category];
}

export function getReportStatusColor(status: ReportStatus): string {
  const colors = {
    [ReportStatus.PENDING]: 'gray',
    [ReportStatus.GENERATING]: 'blue',
    [ReportStatus.COMPLETED]: 'green',
    [ReportStatus.FAILED]: 'red'
  };
  return colors[status];
}

export function getReportStatusIcon(status: ReportStatus): string {
  const icons = {
    [ReportStatus.PENDING]: 'schedule',
    [ReportStatus.GENERATING]: 'hourglass_empty',
    [ReportStatus.COMPLETED]: 'check_circle',
    [ReportStatus.FAILED]: 'error'
  };
  return icons[status];
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
