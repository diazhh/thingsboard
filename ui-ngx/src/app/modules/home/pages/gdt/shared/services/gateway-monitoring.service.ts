/*
 * Copyright © 2024 GDT - Grupo de Desarrollo Tecnológico
 * Licensed under the Apache License, Version 2.0
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  MonitoringState,
  PortStatus,
  DeviceMetrics,
  GatewayMetrics,
  PortDiagnostics,
  DeviceDiagnostics,
  ErrorLog,
  PerformanceMetric
} from '../models/gateway-monitoring.model';

/**
 * Gateway Monitoring Service
 * 
 * Provides real-time monitoring and diagnostics data for the gateway.
 */
@Injectable({
  providedIn: 'root'
})
export class GatewayMonitoringService {

  private readonly apiUrl = '/api';
  private monitoringState$ = new BehaviorSubject<MonitoringState | null>(null);
  private isMonitoring = false;

  constructor(private http: HttpClient) { }

  /**
   * Start real-time monitoring
   */
  startMonitoring(intervalMs: number = 5000): Observable<MonitoringState> {
    if (this.isMonitoring) {
      return this.monitoringState$.asObservable();
    }

    this.isMonitoring = true;

    return interval(intervalMs).pipe(
      switchMap(() => this.fetchMonitoringData()),
      map(state => {
        this.monitoringState$.next(state);
        return state;
      }),
      catchError(error => {
        console.error('Monitoring error:', error);
        return this.monitoringState$.asObservable();
      })
    );
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  /**
   * Get current monitoring state
   */
  getMonitoringState(): Observable<MonitoringState | null> {
    return this.monitoringState$.asObservable();
  }

  /**
   * Fetch monitoring data from backend
   */
  private fetchMonitoringData(): Observable<MonitoringState> {
    return this.http.get<MonitoringState>(`${this.apiUrl}/monitoring/status`)
      .pipe(
        catchError(() => {
          // Return mock data if backend is not available
          return new Observable<MonitoringState>(observer => {
            observer.next(this.getMockMonitoringData());
            observer.complete();
          });
        })
      );
  }

  /**
   * Get port diagnostics
   */
  getPortDiagnostics(portName: string): Observable<PortDiagnostics> {
    return this.http.get<PortDiagnostics>(`${this.apiUrl}/diagnostics/ports/${portName}`)
      .pipe(
        catchError(() => {
          return new Observable<PortDiagnostics>(observer => {
            observer.next(this.getMockPortDiagnostics(portName));
            observer.complete();
          });
        })
      );
  }

  /**
   * Get device diagnostics
   */
  getDeviceDiagnostics(deviceName: string): Observable<DeviceDiagnostics> {
    return this.http.get<DeviceDiagnostics>(`${this.apiUrl}/diagnostics/devices/${deviceName}`)
      .pipe(
        catchError(() => {
          return new Observable<DeviceDiagnostics>(observer => {
            observer.next(this.getMockDeviceDiagnostics(deviceName));
            observer.complete();
          });
        })
      );
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit: number = 100): Observable<ErrorLog[]> {
    return this.http.get<ErrorLog[]>(`${this.apiUrl}/logs/errors?limit=${limit}`)
      .pipe(
        catchError(() => {
          return new Observable<ErrorLog[]>(observer => {
            observer.next(this.getMockErrorLogs(limit));
            observer.complete();
          });
        })
      );
  }

  /**
   * Clear error logs
   */
  clearErrorLogs(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/logs/errors`)
      .pipe(
        catchError(() => {
          return new Observable<any>(observer => {
            observer.next({ success: true });
            observer.complete();
          });
        })
      );
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Observable<PerformanceMetric[]> {
    return this.http.get<PerformanceMetric[]>(`${this.apiUrl}/monitoring/metrics`)
      .pipe(
        catchError(() => {
          return new Observable<PerformanceMetric[]>(observer => {
            observer.next(this.getMockPerformanceMetrics());
            observer.complete();
          });
        })
      );
  }

  // Mock data methods for development/testing

  private getMockMonitoringData(): MonitoringState {
    return {
      ports: [
        {
          name: 'COM1',
          protocol: 'modbus_rtu',
          connected: true,
          lastUpdate: Date.now(),
          bytesReceived: 15234,
          bytesSent: 8932,
          errorCount: 2,
          connectionAttempts: 1
        }
      ],
      devices: [
        {
          deviceName: 'Radar-01',
          portName: 'COM1',
          lastRead: Date.now(),
          readCount: 234,
          errorCount: 1,
          averageResponseTime: 125,
          status: 'online'
        }
      ],
      gatewayMetrics: {
        timestamp: Date.now(),
        uptime: 86400000,
        cpuUsage: 15.5,
        memoryUsage: 42.3,
        activePorts: 1,
        totalDevices: 1,
        totalErrors: 2,
        averageLatency: 125
      },
      diagnosticEvents: [],
      errorLogs: [],
      performanceMetrics: []
    };
  }

  private getMockPortDiagnostics(portName: string): PortDiagnostics {
    return {
      portName,
      protocol: 'modbus_rtu',
      connected: true,
      connectionTime: Date.now() - 3600000,
      statistics: {
        totalRequests: 1000,
        successfulRequests: 998,
        failedRequests: 2,
        averageResponseTime: 125,
        minResponseTime: 95,
        maxResponseTime: 250
      }
    };
  }

  private getMockDeviceDiagnostics(deviceName: string): DeviceDiagnostics {
    return {
      deviceName,
      portName: 'COM1',
      protocol: 'modbus_rtu',
      lastUpdate: Date.now(),
      status: 'online',
      statistics: {
        totalReads: 500,
        successfulReads: 498,
        failedReads: 2,
        averageReadTime: 125,
        lastValue: { level: 1250, temperature: 25.5 }
      }
    };
  }

  private getMockErrorLogs(limit: number): ErrorLog[] {
    return [
      {
        id: '1',
        timestamp: Date.now() - 3600000,
        severity: 'medium',
        category: 'communication',
        message: 'Connection timeout on port COM1',
        source: 'ModbusRTU',
        resolved: true
      }
    ];
  }

  private getMockPerformanceMetrics(): PerformanceMetric[] {
    return [
      {
        timestamp: Date.now(),
        metric: 'cpu_usage',
        value: 15.5,
        unit: '%',
        threshold: 80,
        status: 'normal'
      },
      {
        timestamp: Date.now(),
        metric: 'memory_usage',
        value: 42.3,
        unit: '%',
        threshold: 85,
        status: 'normal'
      },
      {
        timestamp: Date.now(),
        metric: 'average_latency',
        value: 125,
        unit: 'ms',
        threshold: 500,
        status: 'normal'
      }
    ];
  }
}
