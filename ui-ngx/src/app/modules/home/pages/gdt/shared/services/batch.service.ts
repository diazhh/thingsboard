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
import { Observable, BehaviorSubject, forkJoin, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

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
import { BatchMockService } from './batch-mock.service';
import { AttributeService } from '@core/http/attribute.service';
import { AttributeScope } from '@shared/models/telemetry/telemetry.models';
import { TankAssetService } from './tank-asset.service';
import { EntityType } from '@shared/models/entity-type.models';

/**
 * Batch Management Service
 * 
 * Handles all batch-related operations including:
 * - Creating new batches
 * - Closing batches
 * - Recalculating batches
 * - Voiding batches
 * - Retrieving batch data
 * 
 * NOTE: Currently using mock service. Set USE_MOCK = false when backend is ready.
 */
@Injectable({
  providedIn: 'root'
})
export class BatchService {

  private readonly USE_MOCK = false; // Using ThingsBoard attributes for persistence
  private readonly USE_PERSISTENT_STORAGE = true; // Store in tank attributes
  private apiUrl = '/api/gdt/batches';
  
  private batchesSubject = new BehaviorSubject<Batch[]>([]);
  public batches$ = this.batchesSubject.asObservable();
  
  private statisticsSubject = new BehaviorSubject<BatchStatistics | null>(null);
  public statistics$ = this.statisticsSubject.asObservable();
  
  private nextBatchNumber = 1;

  constructor(
    private http: HttpClient,
    private mockService: BatchMockService,
    private attributeService: AttributeService,
    private tankAssetService: TankAssetService
  ) {
    // Don't load batches in constructor - let components call loadBatches() when ready
    console.log('[BatchService] Initialized with USE_PERSISTENT_STORAGE:', this.USE_PERSISTENT_STORAGE);
  }
  
  /**
   * Initialize batch counter from existing batches
   */
  private initializeBatchCounter() {
    this.batches$.subscribe(batches => {
      if (batches.length > 0) {
        const numbers = batches
          .map(b => {
            const match = b.batchNumber.match(/BATCH-\d{4}-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter(n => n > 0);
        
        if (numbers.length > 0) {
          this.nextBatchNumber = Math.max(...numbers) + 1;
        }
      }
    });
  }

  /**
   * Create a new batch
   */
  createBatch(request: CreateBatchRequest): Observable<Batch> {
    if (this.USE_MOCK) {
      return this.mockService.createBatch(request).pipe(
        tap(batch => {
          const currentBatches = this.batchesSubject.value;
          this.batchesSubject.next([batch, ...currentBatches]);
          this.updateStatistics();
        })
      );
    }
    
    if (this.USE_PERSISTENT_STORAGE) {
      return this.createBatchPersistent(request);
    }
    
    return this.http.post<Batch>(`${this.apiUrl}/create`, request).pipe(
      tap(batch => {
        const currentBatches = this.batchesSubject.value;
        this.batchesSubject.next([batch, ...currentBatches]);
        this.updateStatistics();
      }),
      catchError(error => {
        console.error('Error creating batch:', error);
        throw error;
      })
    );
  }
  
  /**
   * Create batch and save to tank attributes
   */
  private createBatchPersistent(request: CreateBatchRequest): Observable<Batch> {
    const batchNumber = `BATCH-${new Date().getFullYear()}-${String(this.nextBatchNumber++).padStart(3, '0')}`;
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate opening gauge
    const opening: GaugeReading = {
      timestamp: Date.now(),
      operator: request.operator || 'Current User',
      level: request.openingLevel,
      temperature: request.openingTemperature,
      apiGravity: request.openingApiGravity,
      bsw: request.openingBsw || 0,
      // Mock calculations - replace with real strapping table
      tov: request.openingLevel * 0.1,
      gov: request.openingLevel * 0.1,
      gsv: request.openingLevel * 0.099,
      nsv: request.openingLevel * 0.098,
      // Mass = NSV × density (kg/bbl). Density calculated from API gravity
      // API gravity to density: density (kg/L) = 141.5 / (API + 131.5), then × 159 L/bbl
      mass: (request.openingLevel * 0.098) * (141.5 / (request.openingApiGravity + 131.5)) * 159,
      wia: 0.3
    };
    
    const batch: Batch = {
      id: batchId,
      batchNumber,
      tankId: request.tankId,
      tankName: request.tankName || 'Unknown Tank',
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
    
    // Save to tank attributes
    return this.saveBatchToTank(batch).pipe(
      tap(() => {
        const currentBatches = this.batchesSubject.value;
        this.batchesSubject.next([batch, ...currentBatches]);
        this.updateStatistics();
      })
    );
  }
  
  /**
   * Save batch to tank attributes
   */
  private saveBatchToTank(batch: Batch): Observable<Batch> {
    const attributeKey = `batch_${batch.id}`;
    const attributeValue = JSON.stringify(batch);
    
    console.log('[BatchService] Saving batch to tank attributes:', {
      attributeKey,
      batchNumber: batch.batchNumber,
      status: batch.status,
      hasClosing: !!batch.closing,
      closingData: batch.closing ? {
        level: batch.closing.level,
        temperature: batch.closing.temperature,
        timestamp: batch.closing.timestamp
      } : null
    });
    
    // Create EntityId for the tank
    const tankEntityId = {
      id: batch.tankId,
      entityType: EntityType.ASSET
    };
    
    return this.attributeService.saveEntityAttributes(
      tankEntityId,
      AttributeScope.SERVER_SCOPE,
      [{ key: attributeKey, value: attributeValue }]
    ).pipe(
      tap(() => {
        console.log('[BatchService] Batch saved successfully to tank attributes');
        console.log('[BatchService] Saved batch data:', {
          batchNumber: batch.batchNumber,
          status: batch.status,
          hasClosing: !!batch.closing,
          transferredNSV: batch.transferredNSV
        });
      }),
      map(() => {
        // Return the complete batch object
        return batch;
      }),
      catchError(error => {
        console.error('Error saving batch to tank:', error);
        throw error;
      })
    );
  }

  /**
   * Close an open batch
   */
  closeBatch(request: CloseBatchRequest): Observable<Batch> {
    if (this.USE_PERSISTENT_STORAGE) {
      return this.closeBatchPersistent(request);
    }
    
    return this.http.post<Batch>(`${this.apiUrl}/${request.batchId}/close`, request).pipe(
      tap(batch => {
        this.updateBatchInList(batch);
        this.updateStatistics();
      }),
      catchError(error => {
        console.error('Error closing batch:', error);
        throw error;
      })
    );
  }
  
  /**
   * Close batch and update in tank attributes
   */
  private closeBatchPersistent(request: CloseBatchRequest): Observable<Batch> {
    console.log('[BatchService] closeBatchPersistent - Closing batch:', request.batchId);
    
    const batches = this.batchesSubject.value;
    const batchIndex = batches.findIndex(b => b.id === request.batchId);
    
    if (batchIndex === -1) {
      console.error('[BatchService] Batch not found:', request.batchId);
      return throwError(() => new Error('Batch not found'));
    }
    
    const batch = batches[batchIndex];
    console.log('[BatchService] Found batch to close:', batch.batchNumber);
    
    // Calculate closing gauge
    const closing: GaugeReading = {
      timestamp: Date.now(),
      operator: request.operator || 'Current User',
      level: request.closingLevel,
      temperature: request.closingTemperature,
      apiGravity: request.closingApiGravity,
      bsw: request.closingBsw || 0,
      // Mock calculations - replace with real strapping table
      tov: request.closingLevel * 0.1,
      gov: request.closingLevel * 0.1,
      gsv: request.closingLevel * 0.099,
      nsv: request.closingLevel * 0.098,
      // Mass = NSV × density (kg/bbl). Density calculated from API gravity
      // API gravity to density: density (kg/L) = 141.5 / (API + 131.5), then × 159 L/bbl
      mass: (request.closingLevel * 0.098) * (141.5 / (request.closingApiGravity + 131.5)) * 159,
      wia: 0.3,
      captureMethod: 'automatic',
      dataSource: 'telemetry'
    };
    
    console.log('[BatchService] Closing gauge data:', closing);
    
    // Calculate transferred quantities
    const transferredNSV = Math.abs(batch.opening.nsv - closing.nsv);
    const transferredMass = Math.abs(batch.opening.mass - closing.mass);
    const transferredWIA = Math.abs(batch.opening.wia - closing.wia);
    
    // Update batch
    const updatedBatch: Batch = {
      ...batch,
      closing,
      transferredNSV,
      transferredMass,
      transferredWIA,
      status: 'closed',
      closedAt: Date.now(),
      closedBy: request.operator || 'Current User',
      notes: request.notes || batch.notes
    };
    
    console.log('[BatchService] Updated batch before saving:', updatedBatch);
    
    // Save to tank attributes
    return this.saveBatchToTank(updatedBatch).pipe(
      tap(() => {
        console.log('[BatchService] Batch saved successfully');
        const updatedBatches = [...batches];
        updatedBatches[batchIndex] = updatedBatch;
        this.batchesSubject.next(updatedBatches);
        this.updateStatistics();
      }),
      catchError(error => {
        console.error('[BatchService] Error saving batch:', error);
        throw error;
      })
    );
  }

  /**
   * Recalculate a closed batch with new values
   */
  recalculateBatch(request: RecalculateBatchRequest): Observable<Batch> {
    if (this.USE_PERSISTENT_STORAGE) {
      return this.recalculateBatchPersistent(request);
    }
    
    return this.http.post<Batch>(`${this.apiUrl}/${request.batchId}/recalculate`, request).pipe(
      tap(batch => {
        this.updateBatchInList(batch);
        this.updateStatistics();
      }),
      catchError(error => {
        console.error('Error recalculating batch:', error);
        throw error;
      })
    );
  }
  
  /**
   * Recalculate batch and update in tank attributes
   */
  private recalculateBatchPersistent(request: RecalculateBatchRequest): Observable<Batch> {
    const batches = this.batchesSubject.value;
    const batchIndex = batches.findIndex(b => b.id === request.batchId);
    
    if (batchIndex === -1) {
      return throwError(() => new Error('Batch not found'));
    }
    
    const batch = batches[batchIndex];
    
    // Allow recalculation of both 'closed' and 'recalculated' batches
    if (batch.status !== 'closed' && batch.status !== 'recalculated') {
      return throwError(() => new Error('Only closed or recalculated batches can be recalculated'));
    }
    
    // Update opening gauge with new values if provided
    const updatedOpening: GaugeReading = {
      ...batch.opening,
      apiGravity: request.openingApiGravity ?? batch.opening.apiGravity,
      temperature: request.openingTemperature ?? batch.opening.temperature,
      bsw: request.openingBsw ?? batch.opening.bsw
    };
    
    // Recalculate opening volumes with new values
    updatedOpening.tov = updatedOpening.level * 0.1;
    updatedOpening.gov = updatedOpening.level * 0.1;
    updatedOpening.gsv = updatedOpening.level * 0.099;
    updatedOpening.nsv = updatedOpening.level * 0.098;
    // Mass = NSV × density (kg/bbl). Density calculated from API gravity
    updatedOpening.mass = updatedOpening.nsv * (141.5 / (updatedOpening.apiGravity + 131.5)) * 159;
    
    // Update closing gauge with new values if provided
    const updatedClosing: GaugeReading = {
      ...batch.closing!,
      apiGravity: request.closingApiGravity ?? batch.closing!.apiGravity,
      temperature: request.closingTemperature ?? batch.closing!.temperature,
      bsw: request.closingBsw ?? batch.closing!.bsw
    };
    
    // Recalculate closing volumes with new values
    updatedClosing.tov = updatedClosing.level * 0.1;
    updatedClosing.gov = updatedClosing.level * 0.1;
    updatedClosing.gsv = updatedClosing.level * 0.099;
    updatedClosing.nsv = updatedClosing.level * 0.098;
    // Mass = NSV × density (kg/bbl). Density calculated from API gravity
    updatedClosing.mass = updatedClosing.nsv * (141.5 / (updatedClosing.apiGravity + 131.5)) * 159;
    
    // Recalculate transferred quantities
    const transferredNSV = Math.abs(updatedOpening.nsv - updatedClosing.nsv);
    const transferredMass = Math.abs(updatedOpening.mass - updatedClosing.mass);
    const transferredWIA = Math.abs(updatedOpening.wia - updatedClosing.wia);
    
    // Update batch
    const updatedBatch: Batch = {
      ...batch,
      opening: updatedOpening,
      closing: updatedClosing,
      transferredNSV,
      transferredMass,
      transferredWIA,
      status: 'recalculated',
      recalculatedAt: Date.now(),
      recalculatedBy: request.operator || 'Current User',
      notes: `${batch.notes || ''}\n\nRecalculado: ${request.reason}`
    };
    
    // Save to tank attributes
    return this.saveBatchToTank(updatedBatch).pipe(
      tap(() => {
        const updatedBatches = [...batches];
        updatedBatches[batchIndex] = updatedBatch;
        this.batchesSubject.next(updatedBatches);
        this.updateStatistics();
      })
    );
  }

  /**
   * Void a batch
   */
  voidBatch(request: VoidBatchRequest): Observable<Batch> {
    return this.http.post<Batch>(`${this.apiUrl}/${request.batchId}/void`, request).pipe(
      tap(batch => {
        this.updateBatchInList(batch);
        this.updateStatistics();
      }),
      catchError(error => {
        console.error('Error voiding batch:', error);
        throw error;
      })
    );
  }

  /**
   * Get batch by ID
   */
  getBatchById(batchId: string): Observable<Batch> {
    if (this.USE_MOCK) {
      return this.mockService.getBatchById(batchId);
    }
    
    return this.http.get<Batch>(`${this.apiUrl}/${batchId}`).pipe(
      catchError(error => {
        console.error('Error fetching batch:', error);
        throw error;
      })
    );
  }

  /**
   * Get batches with filters
   */
  getBatches(filters: BatchFilterCriteria): Observable<BatchListResponse> {
    if (this.USE_MOCK) {
      return this.mockService.getBatches(filters).pipe(
        tap(response => {
          this.batchesSubject.next(response.batches);
        })
      );
    }
    
    if (this.USE_PERSISTENT_STORAGE) {
      return this.getBatchesFromTanks(filters);
    }
    
    const params = this.buildFilterParams(filters);
    return this.http.get<BatchListResponse>(`${this.apiUrl}`, { params }).pipe(
      tap(response => {
        this.batchesSubject.next(response.batches);
      }),
      catchError(error => {
        console.error('Error fetching batches:', error);
        throw error;
      })
    );
  }
  
  /**
   * Load batches from tank attributes
   */
  private getBatchesFromTanks(filters: BatchFilterCriteria): Observable<BatchListResponse> {
    console.log('[BatchService] getBatchesFromTanks - Loading from tank attributes...');
    
    return this.tankAssetService.getAllTanksWithAttributes('Tank').pipe(
      map(tanks => {
        console.log('[BatchService] Loaded tanks:', tanks.length);
        const allBatches: Batch[] = [];
        
        // Extract batches from each tank's attributes
        tanks.forEach(tankData => {
          const attributes = tankData.attributes || {};
          const batchKeys = Object.keys(attributes).filter(k => k.startsWith('batch_'));
          
          if (batchKeys.length > 0) {
            console.log(`[BatchService] Tank ${tankData.asset.name} has ${batchKeys.length} batches`);
          }
          
          // Find all batch attributes (keys starting with 'batch_')
          Object.keys(attributes).forEach(key => {
            if (key.startsWith('batch_')) {
              try {
                const batchData = JSON.parse(attributes[key]);
                console.log(`[BatchService] Parsed batch from attribute ${key}:`, {
                  batchNumber: batchData.batchNumber,
                  status: batchData.status,
                  hasClosing: !!batchData.closing,
                  closingData: batchData.closing ? {
                    level: batchData.closing.level,
                    temperature: batchData.closing.temperature,
                    timestamp: batchData.closing.timestamp
                  } : null
                });
                allBatches.push(batchData as Batch);
              } catch (error) {
                console.error(`[BatchService] Error parsing batch from attribute ${key}:`, error);
              }
            }
          });
        });
        
        console.log('[BatchService] Total batches found:', allBatches.length);
        
        // Apply filters
        let filteredBatches = allBatches;
        
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
        if (filters.startDate) {
          filteredBatches = filteredBatches.filter(b => b.createdAt >= filters.startDate!);
        }
        if (filters.endDate) {
          filteredBatches = filteredBatches.filter(b => b.createdAt <= filters.endDate!);
        }
        
        // Sort by creation date (newest first)
        filteredBatches.sort((a, b) => b.createdAt - a.createdAt);
        
        const response: BatchListResponse = {
          batches: filteredBatches,
          totalCount: filteredBatches.length,
          pageSize: filters.pageSize || 100,
          pageNumber: filters.pageNumber || 0
        };
        
        return response;
      }),
      tap(response => {
        this.batchesSubject.next(response.batches);
      }),
      catchError(error => {
        console.error('Error loading batches from tanks:', error);
        return of({
          batches: [],
          totalCount: 0,
          pageSize: filters.pageSize || 100,
          pageNumber: filters.pageNumber || 0
        });
      })
    );
  }

  /**
   * Load all batches
   */
  loadBatches(filters?: BatchFilterCriteria): void {
    console.log('[BatchService] loadBatches called with filters:', filters);
    
    const defaultFilters: BatchFilterCriteria = {
      pageSize: 100,
      pageNumber: 0,
      ...filters
    };

    this.getBatches(defaultFilters).subscribe({
      next: (response) => {
        console.log('[BatchService] Loaded batches:', response.batches.length);
        this.batchesSubject.next(response.batches);
        this.updateStatistics();
        this.initializeBatchCounter();
      },
      error: (err) => {
        console.error('[BatchService] Error loading batches:', err);
        this.batchesSubject.next([]);
      }
    });
  }

  /**
   * Get batch statistics
   */
  getStatistics(): Observable<BatchStatistics> {
    if (this.USE_MOCK) {
      return this.mockService.getStatistics().pipe(
        tap(stats => this.statisticsSubject.next(stats))
      );
    }
    
    if (this.USE_PERSISTENT_STORAGE) {
      return this.calculateStatisticsFromBatches();
    }
    
    return this.http.get<BatchStatistics>(`${this.apiUrl}/statistics`).pipe(
      tap(stats => this.statisticsSubject.next(stats)),
      catchError(error => {
        console.error('Error fetching statistics:', error);
        return of({
          totalBatches: 0,
          openBatches: 0,
          closedBatches: 0,
          recalculatedBatches: 0,
          voidedBatches: 0,
          totalNSVTransferred: 0,
          totalMassTransferred: 0
        });
      })
    );
  }

  /**
   * Calculate statistics from current batches in memory
   */
  private calculateStatisticsFromBatches(): Observable<BatchStatistics> {
    const batches = this.batchesSubject.value;
    
    // Calculate total NSV and Mass transferred
    const closedBatches = batches.filter(b => b.status === 'closed' || b.status === 'recalculated');
    const totalNSV = closedBatches.reduce((sum, b) => sum + (b.transferredNSV || 0), 0);
    const totalMass = closedBatches.reduce((sum, b) => sum + (b.transferredMass || 0), 0);
    
    const stats: BatchStatistics = {
      totalBatches: batches.length,
      openBatches: batches.filter(b => b.status === 'open').length,
      closedBatches: batches.filter(b => b.status === 'closed').length,
      recalculatedBatches: batches.filter(b => b.status === 'recalculated').length,
      voidedBatches: batches.filter(b => b.status === 'voided').length,
      totalNSVTransferred: totalNSV,
      totalMassTransferred: totalMass
    };
    
    return of(stats).pipe(
      tap(s => this.statisticsSubject.next(s))
    );
  }

  /**
   * Download batch report PDF
   */
  downloadBatchReport(batchId: string): Observable<Blob> {
    if (this.USE_MOCK) {
      return this.mockService.downloadBatchReport(batchId);
    }
    
    return this.http.get(`${this.apiUrl}/${batchId}/report`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error downloading report:', error);
        throw error;
      })
    );
  }

  /**
   * Export batches to CSV
   */
  exportBatchesToCsv(filters: BatchFilterCriteria): Observable<Blob> {
    if (this.USE_MOCK) {
      return this.mockService.exportBatchesToCsv(filters);
    }
    
    const params = this.buildFilterParams(filters);
    return this.http.get(`${this.apiUrl}/export/csv`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error exporting batches:', error);
        throw error;
      })
    );
  }

  /**
   * Get batches by tank
   */
  getBatchesByTank(tankId: string, status?: BatchStatus): Observable<Batch[]> {
    const filters: BatchFilterCriteria = {
      tankId,
      status,
      pageSize: 1000
    };
    return this.getBatches(filters).pipe(
      map(response => response.batches)
    );
  }

  /**
   * Get open batches for a tank
   */
  getOpenBatchesForTank(tankId: string): Observable<Batch[]> {
    return this.getBatchesByTank(tankId, 'open');
  }

  /**
   * Calculate transferred quantities
   */
  calculateTransferredQuantities(opening: GaugeReading, closing: GaugeReading): {
    nsv: number;
    mass: number;
    wia: number;
  } {
    return {
      nsv: (closing.nsv || 0) - (opening.nsv || 0),
      mass: (closing.mass || 0) - (opening.mass || 0),
      wia: (closing.wia || 0) - (opening.wia || 0)
    };
  }

  /**
   * Validate batch data
   */
  validateBatch(batch: Batch): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!batch.batchNumber) {
      errors.push('Batch number is required');
    }

    if (!batch.tankId) {
      errors.push('Tank ID is required');
    }

    if (!batch.opening) {
      errors.push('Opening gauge is required');
    }

    if (batch.status === 'closed' && !batch.closing) {
      errors.push('Closing gauge is required for closed batches');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create batch from date range (historical batch)
   */
  createBatchFromDateRange(params: {
    tankId: string;
    tankName?: string;
    startTime: number;
    endTime: number;
    batchType: BatchType;
    notes?: string;
    startTemperature?: number;
    endTemperature?: number;
  }): Observable<Batch> {
    console.log('[BatchService] Creating batch from date range:', params);

    const batchNumber = `BATCH-${new Date().getFullYear()}-${String(this.nextBatchNumber++).padStart(3, '0')}`;
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create opening gauge with historical data
    const opening: GaugeReading = {
      timestamp: params.startTime,
      operator: 'Historical',
      level: 0, // Will be filled from historical data
      temperature: params.startTemperature || 25, // Use provided temperature (already averaged from temp_19-24)
      apiGravity: 35.0,
      bsw: 0,
      tov: 0,
      gov: 0,
      gsv: 0,
      nsv: 0,
      mass: 0,
      wia: 0.3,
      captureMethod: 'historical',
      dataSource: 'telemetry_history'
    };

    // Create closing gauge with historical data
    const closing: GaugeReading = {
      timestamp: params.endTime,
      operator: 'Historical',
      level: 0, // Will be filled from historical data
      temperature: params.endTemperature || 25, // Use provided temperature (already averaged from temp_19-24)
      apiGravity: 35.0,
      bsw: 0,
      tov: 0,
      gov: 0,
      gsv: 0,
      nsv: 0,
      mass: 0,
      wia: 0.3,
      captureMethod: 'historical',
      dataSource: 'telemetry_history'
    };

    // Create batch (already closed since it's historical)
    const batch: Batch = {
      id: batchId,
      batchNumber,
      tankId: params.tankId,
      tankName: params.tankName || 'Unknown Tank',
      batchType: params.batchType,
      status: 'closed',
      opening,
      closing,
      transferredNSV: 0,
      transferredMass: 0,
      transferredWIA: 0,
      notes: params.notes || `Historical batch created from ${new Date(params.startTime).toISOString()} to ${new Date(params.endTime).toISOString()}`,
      createdAt: Date.now(),
      closedAt: params.endTime,
      createdBy: 'Historical',
      closedBy: 'Historical'
    };

    console.log('[BatchService] Historical batch created:', batch);

    // Save to tank attributes
    return this.saveBatchToTank(batch).pipe(
      tap(() => {
        console.log('[BatchService] Historical batch saved successfully');
        const currentBatches = this.batchesSubject.value;
        this.batchesSubject.next([...currentBatches, batch]);
        this.updateStatistics();
      })
    );
  }

  /**
   * Private helper methods
   */

  private updateBatchInList(updatedBatch: Batch): void {
    const currentBatches = this.batchesSubject.value;
    const index = currentBatches.findIndex(b => b.id === updatedBatch.id);
    if (index !== -1) {
      currentBatches[index] = updatedBatch;
      this.batchesSubject.next([...currentBatches]);
    }
  }

  private updateStatistics(): void {
    this.getStatistics().subscribe();
  }

  private buildFilterParams(filters: BatchFilterCriteria): any {
    const params: any = {};

    if (filters.tankId) params.tankId = filters.tankId;
    if (filters.batchType) params.batchType = filters.batchType;
    if (filters.status) params.status = filters.status;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.batchNumber) params.batchNumber = filters.batchNumber;
    if (filters.operator) params.operator = filters.operator;
    if (filters.pageSize) params.pageSize = filters.pageSize;
    if (filters.pageNumber !== undefined) params.pageNumber = filters.pageNumber;

    return params;
  }
}
