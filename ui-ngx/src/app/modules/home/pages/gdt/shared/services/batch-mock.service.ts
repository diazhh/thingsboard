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
import { Observable, of, delay } from 'rxjs';

import {
  Batch,
  BatchStatus,
  BatchType,
  CreateBatchRequest,
  CloseBatchRequest,
  RecalculateBatchRequest,
  VoidBatchRequest,
  BatchFilterCriteria,
  BatchListResponse,
  BatchStatistics,
  GaugeReading
} from '../models/batch.model';

/**
 * Mock Batch Service for Development
 * 
 * Provides mock data for testing the Batch Management UI
 * without requiring backend implementation
 */
@Injectable({
  providedIn: 'root'
})
export class BatchMockService {

  private mockBatches: Batch[] = [];
  private nextBatchNumber = 1;

  constructor() {
    // Start with empty data - batches will be created via UI
  }

  private createMockBatch(
    batchNumber: string,
    tankId: string,
    tankName: string,
    type: BatchType,
    status: BatchStatus
  ): Batch {
    const now = Date.now();
    const opening: GaugeReading = {
      timestamp: now - 86400000, // 1 day ago
      operator: 'Juan Pérez',
      level: 8500,
      temperature: 28.5,
      apiGravity: 35.2,
      bsw: 0.3,
      tov: 850.5,
      gov: 850.5,
      gsv: 845.2,
      nsv: 842.7,
      mass: 705800,
      wia: 2.5
    };

    const batch: Batch = {
      id: `batch-${batchNumber}`,
      batchNumber,
      tankId,
      tankName,
      batchType: type,
      status,
      opening,
      destination: status !== 'open' ? 'Terminal Central' : undefined,
      transportVehicle: status !== 'open' ? 'ABC-123' : undefined,
      sealNumbers: status !== 'open' ? ['SEAL-001', 'SEAL-002'] : undefined,
      notes: 'Batch de prueba',
      createdAt: now - 86400000,
      createdBy: 'Juan Pérez',
      reportPdfUrl: status === 'closed' || status === 'recalculated' ? '/api/batches/report.pdf' : undefined
    };

    if (status !== 'open') {
      batch.closing = {
        timestamp: now - 3600000, // 1 hour ago
        operator: 'María García',
        level: 7200,
        temperature: 29.0,
        apiGravity: 35.3,
        bsw: 0.4,
        tov: 720.0,
        gov: 720.0,
        gsv: 715.8,
        nsv: 713.0,
        mass: 597200,
        wia: 2.8
      };
      batch.closedAt = now - 3600000;
      batch.closedBy = 'María García';
      batch.transferredNSV = (batch.opening.nsv || 0) - (batch.closing.nsv || 0);
      batch.transferredMass = (batch.opening.mass || 0) - (batch.closing.mass || 0);
      batch.transferredWIA = (batch.opening.wia || 0) - (batch.closing.wia || 0);
    }

    if (status === 'recalculated') {
      batch.recalculatedAt = now - 1800000; // 30 min ago
      batch.recalculatedBy = 'Carlos López';
      batch.reportPdfRecalculatedUrl = '/api/batches/report-recalculated.pdf';
    }

    if (status === 'voided') {
      batch.voidedAt = now - 1800000;
      batch.voidReason = 'Error en medición';
    }

    return batch;
  }

  getBatches(filters: BatchFilterCriteria): Observable<BatchListResponse> {
    let filteredBatches = [...this.mockBatches];

    // Apply filters
    if (filters.tankId) {
      filteredBatches = filteredBatches.filter(b => b.tankId === filters.tankId);
    }
    if (filters.status) {
      filteredBatches = filteredBatches.filter(b => b.status === filters.status);
    }
    if (filters.batchType) {
      filteredBatches = filteredBatches.filter(b => b.batchType === filters.batchType);
    }
    if (filters.batchNumber) {
      filteredBatches = filteredBatches.filter(b => 
        b.batchNumber.toLowerCase().includes(filters.batchNumber!.toLowerCase())
      );
    }

    const response: BatchListResponse = {
      batches: filteredBatches,
      totalCount: filteredBatches.length,
      pageSize: filters.pageSize || 100,
      pageNumber: filters.pageNumber || 0
    };

    return of(response).pipe(delay(500)); // Simulate network delay
  }

  getBatchById(batchId: string): Observable<Batch> {
    const batch = this.mockBatches.find(b => b.id === batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }
    return of(batch).pipe(delay(300));
  }

  createBatch(request: CreateBatchRequest): Observable<Batch> {
    const batchNumber = `BATCH-${new Date().getFullYear()}-${String(this.nextBatchNumber++).padStart(3, '0')}`;
    const opening: GaugeReading = {
      timestamp: Date.now(),
      operator: request.operator || 'Current User',
      level: request.openingLevel,
      temperature: request.openingTemperature,
      apiGravity: request.openingApiGravity,
      bsw: request.openingBsw || 0,
      tov: request.openingLevel * 0.1, // Mock calculation - replace with real strapping table
      gov: request.openingLevel * 0.1,
      gsv: request.openingLevel * 0.099,
      nsv: request.openingLevel * 0.098,
      mass: request.openingLevel * 82,
      wia: 0.3
    };

    const batch: Batch = {
      id: `batch-${Date.now()}`,
      batchNumber,
      tankId: request.tankId,
      tankName: request.tankName || 'Unknown Tank', // Should be passed from UI
      batchType: request.batchType,
      status: 'open',
      opening,
      destination: request.destination,
      transportVehicle: request.transportVehicle,
      sealNumbers: request.sealNumbers,
      notes: request.notes,
      createdAt: Date.now(),
      createdBy: request.operator || 'Current User'
    };

    this.mockBatches.unshift(batch);
    return of(batch).pipe(delay(500));
  }

  closeBatch(request: CloseBatchRequest): Observable<Batch> {
    const batch = this.mockBatches.find(b => b.id === request.batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    batch.closing = {
      timestamp: Date.now(),
      operator: 'Current User',
      level: request.closingLevel,
      temperature: request.closingTemperature,
      apiGravity: request.closingApiGravity,
      bsw: request.closingBsw,
      tov: request.closingLevel * 0.1,
      gov: request.closingLevel * 0.1,
      gsv: request.closingLevel * 0.099,
      nsv: request.closingLevel * 0.098,
      mass: request.closingLevel * 82,
      wia: 0.3
    };

    batch.status = 'closed';
    batch.closedAt = Date.now();
    batch.closedBy = 'Current User';
    batch.transferredNSV = (batch.opening.nsv || 0) - (batch.closing.nsv || 0);
    batch.transferredMass = (batch.opening.mass || 0) - (batch.closing.mass || 0);
    batch.transferredWIA = (batch.opening.wia || 0) - (batch.closing.wia || 0);
    batch.reportPdfUrl = '/api/batches/report.pdf';

    return of(batch).pipe(delay(500));
  }

  recalculateBatch(request: RecalculateBatchRequest): Observable<Batch> {
    const batch = this.mockBatches.find(b => b.id === request.batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    batch.status = 'recalculated';
    batch.recalculatedAt = Date.now();
    batch.recalculatedBy = 'Current User';
    batch.reportPdfRecalculatedUrl = '/api/batches/report-recalculated.pdf';

    return of(batch).pipe(delay(500));
  }

  voidBatch(request: VoidBatchRequest): Observable<Batch> {
    const batch = this.mockBatches.find(b => b.id === request.batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    batch.status = 'voided';
    batch.voidedAt = Date.now();
    batch.voidReason = request.reason;

    return of(batch).pipe(delay(500));
  }

  getStatistics(): Observable<BatchStatistics> {
    const stats: BatchStatistics = {
      totalBatches: this.mockBatches.length,
      openBatches: this.mockBatches.filter(b => b.status === 'open').length,
      closedBatches: this.mockBatches.filter(b => b.status === 'closed').length,
      recalculatedBatches: this.mockBatches.filter(b => b.status === 'recalculated').length,
      voidedBatches: this.mockBatches.filter(b => b.status === 'voided').length,
      totalNSVTransferred: this.mockBatches
        .filter(b => b.transferredNSV)
        .reduce((sum, b) => sum + (b.transferredNSV || 0), 0),
      totalMassTransferred: this.mockBatches
        .filter(b => b.transferredMass)
        .reduce((sum, b) => sum + (b.transferredMass || 0), 0)
    };

    return of(stats).pipe(delay(300));
  }

  downloadBatchReport(batchId: string): Observable<Blob> {
    // Return a mock PDF blob
    const mockPdf = new Blob(['Mock PDF content'], { type: 'application/pdf' });
    return of(mockPdf).pipe(delay(500));
  }

  exportBatchesToCsv(filters: BatchFilterCriteria): Observable<Blob> {
    // Return a mock CSV blob
    const mockCsv = new Blob(['Batch Number,Tank,Type,Status\n'], { type: 'text/csv' });
    return of(mockCsv).pipe(delay(500));
  }
}
