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
 * Batch Management System Models
 * 
 * Defines the data structures for managing custody transfer batches
 * in the GDT Tank Gauging System
 */

export type BatchType = 'receiving' | 'dispensing';
export type BatchStatus = 'open' | 'closed' | 'recalculated' | 'voided';

/**
 * Gauge Reading - Captures tank measurements at a specific point in time
 */
export interface GaugeReading {
  timestamp: number;
  operator: string;
  level: number;
  temperature: number;
  apiGravity: number;
  bsw?: number;
  
  // Calculated volumes
  tov?: number;  // Total Observed Volume
  gov?: number;  // Gross Observed Volume
  gsv?: number;  // Gross Standard Volume
  nsv?: number;  // Net Standard Volume
  mass?: number; // Mass
  wia?: number;  // Water in Air
}

/**
 * Batch - Represents a custody transfer batch
 * 
 * A batch is a complete custody transfer operation with:
 * - Opening gauge (start of transfer)
 * - Closing gauge (end of transfer)
 * - Transfer calculations
 * - Metadata and audit trail
 */
export interface Batch {
  // Identifiers
  id: string;
  batchNumber: string;
  tankId: string;
  tankName: string;
  
  // Type and Status
  batchType: BatchType;
  status: BatchStatus;
  
  // Opening Gauge
  opening: GaugeReading;
  
  // Closing Gauge (optional until batch is closed)
  closing?: GaugeReading;
  
  // Transfer Quantities
  transferredNSV?: number;
  transferredMass?: number;
  transferredWIA?: number;
  
  // Metadata
  destination?: string;
  transportVehicle?: string;
  sealNumbers?: string[];
  notes?: string;
  
  // Timestamps
  createdAt: number;
  closedAt?: number;
  recalculatedAt?: number;
  voidedAt?: number;
  
  // Audit Trail
  createdBy: string;
  closedBy?: string;
  recalculatedBy?: string;
  voidReason?: string;
  
  // Report
  reportPdfUrl?: string;
  reportPdfRecalculatedUrl?: string;
}

/**
 * Batch Creation Request
 */
export interface CreateBatchRequest {
  batchNumber: string;
  tankId: string;
  tankName?: string;
  batchType: BatchType;
  destination?: string;
  transportVehicle?: string;
  sealNumbers?: string[];
  notes?: string;
  operator?: string;
  
  // Opening gauge data
  openingLevel: number;
  openingTemperature: number;
  openingApiGravity: number;
  openingBsw?: number;
}

/**
 * Batch Closing Request
 */
export interface CloseBatchRequest {
  batchId: string;
  
  // Closing gauge data
  closingLevel: number;
  closingTemperature: number;
  closingApiGravity: number;
  closingBsw?: number;
  
  // Additional info
  operator?: string;
  notes?: string;
}

/**
 * Batch Recalculation Request
 */
export interface RecalculateBatchRequest {
  batchId: string;
  
  // New values for recalculation
  openingApiGravity?: number;
  openingTemperature?: number;
  openingBsw?: number;
  
  closingApiGravity?: number;
  closingTemperature?: number;
  closingBsw?: number;
  
  reason: string;
  operator?: string;
}

/**
 * Batch Void Request
 */
export interface VoidBatchRequest {
  batchId: string;
  reason: string;
}

/**
 * Batch Filter Criteria
 */
export interface BatchFilterCriteria {
  tankId?: string;
  batchType?: BatchType;
  status?: BatchStatus;
  startDate?: number;
  endDate?: number;
  batchNumber?: string;
  operator?: string;
  pageSize?: number;
  pageNumber?: number;
}

/**
 * Batch List Response
 */
export interface BatchListResponse {
  batches: Batch[];
  totalCount: number;
  pageSize: number;
  pageNumber: number;
}

/**
 * Batch Statistics
 */
export interface BatchStatistics {
  totalBatches: number;
  openBatches: number;
  closedBatches: number;
  recalculatedBatches: number;
  voidedBatches: number;
  totalNSVTransferred: number;
  totalMassTransferred: number;
}
