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
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScheduledReportConfig, ScheduledReportExecution } from '../models/scheduled-report.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduledReportService {

  private apiUrl = '/api/gdt/reports/scheduled';

  constructor(private http: HttpClient) { }

  /**
   * Get all scheduled reports for the current tenant
   */
  getScheduledReports(): Observable<ScheduledReportConfig[]> {
    return this.http.get<ScheduledReportConfig[]>(this.apiUrl);
  }

  /**
   * Get a specific scheduled report by ID
   */
  getScheduledReport(id: string): Observable<ScheduledReportConfig> {
    return this.http.get<ScheduledReportConfig>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create a new scheduled report
   */
  createScheduledReport(config: ScheduledReportConfig): Observable<ScheduledReportConfig> {
    return this.http.post<ScheduledReportConfig>(this.apiUrl, config);
  }

  /**
   * Update an existing scheduled report
   */
  updateScheduledReport(id: string, config: ScheduledReportConfig): Observable<ScheduledReportConfig> {
    return this.http.put<ScheduledReportConfig>(`${this.apiUrl}/${id}`, config);
  }

  /**
   * Delete a scheduled report
   */
  deleteScheduledReport(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Enable a scheduled report
   */
  enableScheduledReport(id: string): Observable<ScheduledReportConfig> {
    return this.http.post<ScheduledReportConfig>(`${this.apiUrl}/${id}/enable`, {});
  }

  /**
   * Disable a scheduled report
   */
  disableScheduledReport(id: string): Observable<ScheduledReportConfig> {
    return this.http.post<ScheduledReportConfig>(`${this.apiUrl}/${id}/disable`, {});
  }

  /**
   * Execute a scheduled report immediately
   */
  executeScheduledReportNow(id: string): Observable<ScheduledReportExecution> {
    return this.http.post<ScheduledReportExecution>(`${this.apiUrl}/${id}/execute`, {});
  }

  /**
   * Get execution history for a scheduled report
   */
  getExecutionHistory(id: string, limit: number = 10): Observable<ScheduledReportExecution[]> {
    return this.http.get<ScheduledReportExecution[]>(`${this.apiUrl}/${id}/executions`, {
      params: { limit: limit.toString() }
    });
  }

  /**
   * Get execution details
   */
  getExecutionDetails(scheduledReportId: string, executionId: string): Observable<ScheduledReportExecution> {
    return this.http.get<ScheduledReportExecution>(`${this.apiUrl}/${scheduledReportId}/executions/${executionId}`);
  }

  /**
   * Download exported report file
   */
  downloadExportedReport(scheduledReportId: string, executionId: string, format: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${scheduledReportId}/executions/${executionId}/download`, {
      params: { format },
      responseType: 'blob'
    });
  }
}
