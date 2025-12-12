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
import { Batch } from '../models/batch.model';

/**
 * Service for adding watermarks and metadata to batch PDFs
 * Handles watermark generation for recalculated batches
 */
@Injectable({
  providedIn: 'root'
})
export class BatchPdfWatermarkService {

  constructor() {}

  /**
   * Add watermark to PDF canvas context
   * Used for marking recalculated batches
   */
  addWatermarkToCanvas(
    canvas: HTMLCanvasElement,
    watermarkText: string,
    options?: {
      opacity?: number;
      angle?: number;
      fontSize?: number;
      color?: string;
    }
  ): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[BatchPdfWatermarkService] Could not get canvas context');
      return canvas;
    }

    const opacity = options?.opacity ?? 0.15;
    const angle = options?.angle ?? -45;
    const fontSize = options?.fontSize ?? 80;
    const color = options?.color ?? '#000000';

    // Save canvas state
    ctx.save();

    // Set watermark properties
    ctx.globalAlpha = opacity;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Rotate canvas for diagonal watermark
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);

    // Draw watermark text multiple times across the canvas
    const textWidth = ctx.measureText(watermarkText).width;
    const spacing = textWidth * 1.5;

    for (let x = -canvas.width; x < canvas.width; x += spacing) {
      for (let y = -canvas.height; y < canvas.height; y += spacing) {
        ctx.fillText(watermarkText, x, y);
      }
    }

    // Restore canvas state
    ctx.restore();

    console.log('[BatchPdfWatermarkService] Watermark added to canvas:', watermarkText);
    return canvas;
  }

  /**
   * Generate watermark text for recalculated batch
   */
  generateRecalculationWatermark(batch: Batch): string {
    const date = new Date(batch.recalculatedAt || Date.now()).toLocaleDateString('es-ES');
    return `RECALCULATED - ${date}`;
  }

  /**
   * Create a watermark layer as an HTML element
   * Can be used for HTML-to-PDF conversion
   */
  createWatermarkLayer(
    watermarkText: string,
    options?: {
      opacity?: number;
      angle?: number;
      fontSize?: number;
      color?: string;
    }
  ): HTMLDivElement {
    const opacity = options?.opacity ?? 0.15;
    const angle = options?.angle ?? -45;
    const fontSize = options?.fontSize ?? 80;
    const color = options?.color ?? '#000000';

    const watermarkDiv = document.createElement('div');
    watermarkDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      opacity: ${opacity};
      transform: rotate(${angle}deg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fontSize}px;
      font-weight: bold;
      color: ${color};
      font-family: Arial, sans-serif;
      white-space: nowrap;
      overflow: hidden;
    `;

    watermarkDiv.textContent = watermarkText;

    console.log('[BatchPdfWatermarkService] Watermark layer created:', watermarkText);
    return watermarkDiv;
  }

  /**
   * Add recalculation metadata to PDF
   * Creates a text annotation with recalculation details
   */
  generateRecalculationMetadata(batch: Batch): {
    title: string;
    subject: string;
    author: string;
    keywords: string[];
    creationDate: Date;
    modificationDate: Date;
    notes: string;
  } {
    const recalculatedDate = new Date(batch.recalculatedAt || Date.now());
    const originalDate = new Date(batch.closedAt || Date.now());

    return {
      title: `Batch ${batch.batchNumber} - Recalculated`,
      subject: `Recalculated batch report for ${batch.batchNumber}`,
      author: batch.recalculatedBy || 'System',
      keywords: ['batch', 'recalculated', 'custody-transfer', batch.batchNumber],
      creationDate: originalDate,
      modificationDate: recalculatedDate,
      notes: `
Original Batch: ${batch.batchNumber}
Original Date: ${originalDate.toLocaleString('es-ES')}
Recalculated Date: ${recalculatedDate.toLocaleString('es-ES')}
Recalculated By: ${batch.recalculatedBy || 'Unknown'}
Reason: ${batch.notes || 'No reason provided'}

IMPORTANT: This is a recalculated version of the original batch.
The original PDF should be retained for audit purposes.
      `
    };
  }

  /**
   * Generate a recalculation note as HTML
   * Can be appended to PDF documents
   */
  generateRecalculationNoteHtml(batch: Batch): string {
    const recalculatedDate = new Date(batch.recalculatedAt || Date.now());
    const originalDate = new Date(batch.closedAt || Date.now());

    return `
      <div style="
        margin-top: 20px;
        padding: 15px;
        border: 2px solid #f44336;
        border-radius: 4px;
        background-color: #ffebee;
        page-break-inside: avoid;
      ">
        <h3 style="
          color: #c62828;
          margin: 0 0 10px 0;
          font-size: 16px;
        ">
          ⚠️ RECALCULATION NOTICE
        </h3>
        <p style="
          margin: 5px 0;
          font-size: 12px;
          color: #d32f2f;
          line-height: 1.6;
        ">
          <strong>Original Date:</strong> ${originalDate.toLocaleString('es-ES')}<br>
          <strong>Recalculated Date:</strong> ${recalculatedDate.toLocaleString('es-ES')}<br>
          <strong>Recalculated By:</strong> ${batch.recalculatedBy || 'Unknown'}<br>
          <strong>Reason:</strong> ${batch.notes || 'No reason provided'}<br>
          <br>
          <em>This document is a recalculated version of the original batch report.
          The original PDF should be retained for audit and compliance purposes.</em>
        </p>
      </div>
    `;
  }

  /**
   * Generate comparison table HTML for recalculation
   */
  generateComparisonTableHtml(
    originalValues: any,
    newValues: any,
    differences: any
  ): string {
    return `
      <div style="
        margin-top: 20px;
        page-break-inside: avoid;
      ">
        <h3 style="
          color: #1976d2;
          margin: 0 0 10px 0;
          font-size: 14px;
        ">
          Recalculation Comparison
        </h3>
        <table style="
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          border: 1px solid #e0e0e0;
        ">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="
                padding: 8px;
                text-align: left;
                border: 1px solid #e0e0e0;
                font-weight: bold;
              ">Parameter</th>
              <th style="
                padding: 8px;
                text-align: right;
                border: 1px solid #e0e0e0;
                font-weight: bold;
              ">Original</th>
              <th style="
                padding: 8px;
                text-align: right;
                border: 1px solid #e0e0e0;
                font-weight: bold;
              ">Recalculated</th>
              <th style="
                padding: 8px;
                text-align: right;
                border: 1px solid #e0e0e0;
                font-weight: bold;
              ">Difference</th>
            </tr>
          </thead>
          <tbody>
            ${differences.transferredNsv !== undefined ? `
              <tr>
                <td style="padding: 8px; border: 1px solid #e0e0e0;">Transferred Volume (NSV)</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #e0e0e0;">${originalValues.nsv?.toFixed(2) || 'N/A'} bbl</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #e0e0e0;">${newValues.nsv?.toFixed(2) || 'N/A'} bbl</td>
                <td style="
                  padding: 8px;
                  text-align: right;
                  border: 1px solid #e0e0e0;
                  color: ${differences.transferredNsv > 0 ? '#4caf50' : '#f44336'};
                  font-weight: bold;
                ">${differences.transferredNsv > 0 ? '+' : ''}${differences.transferredNsv?.toFixed(2) || 'N/A'} bbl</td>
              </tr>
            ` : ''}
            ${differences.transferredMass !== undefined ? `
              <tr>
                <td style="padding: 8px; border: 1px solid #e0e0e0;">Transferred Mass</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #e0e0e0;">${originalValues.mass?.toFixed(0) || 'N/A'} kg</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #e0e0e0;">${newValues.mass?.toFixed(0) || 'N/A'} kg</td>
                <td style="
                  padding: 8px;
                  text-align: right;
                  border: 1px solid #e0e0e0;
                  color: ${differences.transferredMass > 0 ? '#4caf50' : '#f44336'};
                  font-weight: bold;
                ">${differences.transferredMass > 0 ? '+' : ''}${differences.transferredMass?.toFixed(0) || 'N/A'} kg</td>
              </tr>
            ` : ''}
            ${differences.percentageChange !== undefined ? `
              <tr style="background-color: #f5f5f5;">
                <td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold;">Percentage Change</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #e0e0e0;">-</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #e0e0e0;">-</td>
                <td style="
                  padding: 8px;
                  text-align: right;
                  border: 1px solid #e0e0e0;
                  color: ${differences.percentageChange > 0 ? '#4caf50' : '#f44336'};
                  font-weight: bold;
                ">${differences.percentageChange > 0 ? '+' : ''}${differences.percentageChange?.toFixed(2) || 'N/A'}%</td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Download PDF with watermark
   */
  downloadPdfWithWatermark(
    pdfBlob: Blob,
    filename: string,
    watermarkText?: string
  ): void {
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log('[BatchPdfWatermarkService] PDF downloaded:', {
      filename,
      watermark: watermarkText,
      size: pdfBlob.size
    });
  }
}
