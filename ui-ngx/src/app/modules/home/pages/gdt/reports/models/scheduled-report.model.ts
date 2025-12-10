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

export interface ScheduledReportConfig {
  id?: string;
  tenantId?: string;
  name: string;
  description?: string;
  enabled: boolean;
  reportType: string;
  reportParameters?: any;
  cronExpression: string;
  timezone?: string;
  exportFormats: string[];
  exportPath?: string;
  autoExport: boolean;
  notifyOnCompletion: boolean;
  notifyOnError: boolean;
  notificationEmails?: string[];
  notificationUserIds?: string[];
  notificationMethod?: 'EMAIL' | 'SMS' | 'PUSH' | 'WEBHOOK';
  retentionDays?: number;
  autoCleanup?: boolean;
  createdTime?: number;
  createdBy?: string;
  lastModifiedTime?: number;
  lastModifiedBy?: string;
  lastExecutionTime?: number;
  lastExecutionStatus?: string;
  lastExecutionError?: string;
  executionCount?: number;
}

export interface ScheduledReportExecution {
  id: string;
  scheduledReportId: string;
  tenantId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'SCHEDULED' | 'RUNNING' | 'GENERATING_REPORT' | 'EXPORTING' | 'NOTIFYING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  errorMessage?: string;
  reportType: string;
  reportId?: string;
  exportResults?: ExportResult[];
  notificationSent?: boolean;
  notificationTime?: number;
  notificationStatus?: string;
}

export interface ExportResult {
  format: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  success: boolean;
  errorMessage?: string;
  exportTime?: number;
}
