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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Batch, GaugeReading } from '../models/batch.model';

/**
 * Batch PDF Service
 *
 * Generates professional custody transfer batch reports in PDF format.
 * Includes:
 * - Company header and logo
 * - Batch information
 * - Opening and closing gauges
 * - Transferred quantities
 * - QR code for verification
 * - Digital signature hash
 */
@Injectable({
  providedIn: 'root'
})
export class BatchPdfService {

  private readonly PAGE_WIDTH = 210; // A4 width in mm
  private readonly PAGE_HEIGHT = 297; // A4 height in mm
  private readonly MARGIN = 20;
  private readonly PRIMARY_COLOR: [number, number, number] = [13, 115, 119]; // #0d7377

  constructor() {}

  /**
   * Generate PDF for a batch
   */
  async generateBatchPdf(batch: Batch): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = this.MARGIN;

    // Header
    yPosition = this.addHeader(doc, batch, yPosition);
    yPosition += 10;

    // Batch Information Section
    yPosition = this.addBatchInformation(doc, batch, yPosition);
    yPosition += 8;

    // Opening Gauge Section
    yPosition = this.addGaugeSection(doc, 'OPENING GAUGE', batch.opening, yPosition);
    yPosition += 8;

    // Closing Gauge Section (if available)
    if (batch.closing) {
      yPosition = this.addGaugeSection(doc, 'CLOSING GAUGE', batch.closing, yPosition);
      yPosition += 8;
    }

    // Transferred Quantities Section (if closed)
    if (batch.status === 'closed' || batch.status === 'recalculated') {
      yPosition = this.addTransferredQuantities(doc, batch, yPosition);
      yPosition += 10;
    }

    // Transport Information (if available)
    if (batch.destination || batch.transportVehicle) {
      yPosition = this.addTransportInformation(doc, batch, yPosition);
      yPosition += 10;
    }

    // Notes Section (if available)
    if (batch.notes) {
      yPosition = this.addNotes(doc, batch, yPosition);
      yPosition += 10;
    }

    // QR Code and Verification
    await this.addQRCodeAndVerification(doc, batch, yPosition);

    // Footer
    this.addFooter(doc);

    // Convert to blob
    return doc.output('blob');
  }

  /**
   * Add header with company logo and title
   */
  private addHeader(doc: jsPDF, batch: Batch, yPosition: number): number {
    // Company Name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.PRIMARY_COLOR);
    doc.text('GDT TANK GAUGING SYSTEM', this.MARGIN, yPosition);
    yPosition += 8;

    // Document Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('CUSTODY TRANSFER BATCH REPORT', this.MARGIN, yPosition);
    yPosition += 2;

    // Line separator
    doc.setDrawColor(...this.PRIMARY_COLOR);
    doc.setLineWidth(0.5);
    doc.line(this.MARGIN, yPosition, this.PAGE_WIDTH - this.MARGIN, yPosition);
    yPosition += 8;

    return yPosition;
  }

  /**
   * Add batch information section
   */
  private addBatchInformation(doc: jsPDF, batch: Batch, yPosition: number): number {
    this.addSectionTitle(doc, 'BATCH INFORMATION', yPosition);
    yPosition += 7;

    const data = [
      ['Batch Number', batch.batchNumber],
      ['Tank', batch.tankName],
      ['Type', this.formatBatchType(batch.batchType)],
      ['Status', this.formatStatus(batch.status)],
      ['Created At', this.formatDateTime(batch.createdAt)],
      ['Created By', batch.createdBy]
    ];

    if (batch.closedAt) {
      data.push(['Closed At', this.formatDateTime(batch.closedAt)]);
      data.push(['Closed By', batch.closedBy || 'N/A']);
    }

    if (batch.recalculatedAt) {
      data.push(['Recalculated At', this.formatDateTime(batch.recalculatedAt)]);
      data.push(['Recalculated By', batch.recalculatedBy || 'N/A']);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: this.PRIMARY_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 249, 250] },
        1: { cellWidth: 'auto' }
      },
      margin: { left: this.MARGIN, right: this.MARGIN },
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });

    return (doc as any).lastAutoTable.finalY;
  }

  /**
   * Add gauge section (opening or closing)
   */
  private addGaugeSection(doc: jsPDF, title: string, gauge: GaugeReading, yPosition: number): number {
    this.addSectionTitle(doc, title, yPosition);
    yPosition += 7;

    const data = [
      ['Timestamp', this.formatDateTime(gauge.timestamp)],
      ['Operator', gauge.operator],
      ['Level (mm)', this.formatNumber(gauge.level, 2)],
      ['Temperature (°C)', this.formatNumber(gauge.temperature, 2)],
      ['API Gravity', this.formatNumber(gauge.apiGravity, 2)],
      ['BS&W (%)', this.formatNumber(gauge.bsw || 0, 2)]
    ];

    // Add calculated volumes if available
    if (gauge.tov !== undefined) {
      data.push(['TOV (bbl)', this.formatNumber(gauge.tov, 3)]);
    }
    if (gauge.gov !== undefined) {
      data.push(['GOV (bbl)', this.formatNumber(gauge.gov, 3)]);
    }
    if (gauge.gsv !== undefined) {
      data.push(['GSV (bbl)', this.formatNumber(gauge.gsv, 3)]);
    }
    if (gauge.nsv !== undefined) {
      data.push(['NSV (bbl)', this.formatNumber(gauge.nsv, 3)]);
    }
    if (gauge.mass !== undefined) {
      data.push(['Mass (kg)', this.formatNumber(gauge.mass, 2)]);
    }
    if (gauge.wia !== undefined) {
      data.push(['WIA (%)', this.formatNumber(gauge.wia, 2)]);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: this.PRIMARY_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 249, 250] },
        1: { cellWidth: 'auto' }
      },
      margin: { left: this.MARGIN, right: this.MARGIN },
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });

    return (doc as any).lastAutoTable.finalY;
  }

  /**
   * Add transferred quantities section
   */
  private addTransferredQuantities(doc: jsPDF, batch: Batch, yPosition: number): number {
    this.addSectionTitle(doc, 'TRANSFERRED QUANTITIES', yPosition);
    yPosition += 7;

    const data = [
      ['Net Standard Volume (NSV)', `${this.formatNumber(batch.transferredNSV || 0, 3)} bbl`],
      ['Mass', `${this.formatNumber(batch.transferredMass || 0, 2)} kg`],
      ['Water in Air (WIA)', `${this.formatNumber(batch.transferredWIA || 0, 2)} %`]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: this.PRIMARY_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold', fillColor: [248, 249, 250] },
        1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold', fontSize: 11 }
      },
      margin: { left: this.MARGIN, right: this.MARGIN },
      styles: {
        fontSize: 10,
        cellPadding: 4
      }
    });

    return (doc as any).lastAutoTable.finalY;
  }

  /**
   * Add transport information section
   */
  private addTransportInformation(doc: jsPDF, batch: Batch, yPosition: number): number {
    this.addSectionTitle(doc, 'TRANSPORT INFORMATION', yPosition);
    yPosition += 7;

    const data = [];

    if (batch.destination) {
      data.push(['Destination', batch.destination]);
    }

    if (batch.transportVehicle) {
      data.push(['Transport Vehicle', batch.transportVehicle]);
    }

    if (batch.sealNumbers && batch.sealNumbers.length > 0) {
      data.push(['Seal Numbers', batch.sealNumbers.join(', ')]);
    }

    if (data.length === 0) {
      return yPosition - 7; // No data, return original position
    }

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: this.PRIMARY_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 249, 250] },
        1: { cellWidth: 'auto' }
      },
      margin: { left: this.MARGIN, right: this.MARGIN },
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });

    return (doc as any).lastAutoTable.finalY;
  }

  /**
   * Add notes section
   */
  private addNotes(doc: jsPDF, batch: Batch, yPosition: number): number {
    this.addSectionTitle(doc, 'NOTES', yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const lines = doc.splitTextToSize(batch.notes || '', this.PAGE_WIDTH - 2 * this.MARGIN);

    // Draw box around notes
    const notesHeight = lines.length * 5 + 6;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.rect(this.MARGIN, yPosition, this.PAGE_WIDTH - 2 * this.MARGIN, notesHeight, 'FD');

    doc.text(lines, this.MARGIN + 3, yPosition + 5);

    return yPosition + notesHeight;
  }

  /**
   * Add QR code and verification section
   */
  private async addQRCodeAndVerification(doc: jsPDF, batch: Batch, yPosition: number): Promise<void> {
    // Generate verification hash
    const verificationData = {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      tankId: batch.tankId,
      createdAt: batch.createdAt,
      closedAt: batch.closedAt,
      nsv: batch.transferredNSV,
      mass: batch.transferredMass
    };

    const verificationString = JSON.stringify(verificationData);
    const hash = await this.generateHash(verificationString);

    // Generate QR code
    const qrCodeData = JSON.stringify({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      hash: hash.substring(0, 16) // First 16 chars of hash
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Position QR code at bottom right
    const qrSize = 40;
    const qrX = this.PAGE_WIDTH - this.MARGIN - qrSize;
    const qrY = this.PAGE_HEIGHT - this.MARGIN - qrSize - 10;

    doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Add verification text
    const textX = this.MARGIN;
    const textY = qrY;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.PRIMARY_COLOR);
    doc.text('VERIFICATION HASH', textX, textY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);

    const hashLines = doc.splitTextToSize(`SHA-256: ${hash}`, this.PAGE_WIDTH - 2 * this.MARGIN - qrSize - 10);
    doc.text(hashLines, textX, textY + 4);
  }

  /**
   * Add footer
   */
  private addFooter(doc: jsPDF): void {
    const footerY = this.PAGE_HEIGHT - 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);

    const leftText = `Generated on ${this.formatDateTime(Date.now())}`;
    const rightText = 'Page 1 of 1';

    doc.text(leftText, this.MARGIN, footerY);
    doc.text(rightText, this.PAGE_WIDTH - this.MARGIN, footerY, { align: 'right' });

    // Line above footer
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.line(this.MARGIN, footerY - 3, this.PAGE_WIDTH - this.MARGIN, footerY - 3);
  }

  /**
   * Add section title
   */
  private addSectionTitle(doc: jsPDF, title: string, yPosition: number): void {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.PRIMARY_COLOR);
    doc.text(title, this.MARGIN, yPosition);
  }

  /**
   * Format date and time
   */
  private formatDateTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Format number with decimals
   */
  private formatNumber(value: number, decimals: number): string {
    return value.toFixed(decimals);
  }

  /**
   * Format batch type
   */
  private formatBatchType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Format status
   */
  private formatStatus(status: string): string {
    return status.toUpperCase();
  }

  /**
   * Generate SHA-256 hash
   */
  private async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Download PDF file
   */
  downloadPdf(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
