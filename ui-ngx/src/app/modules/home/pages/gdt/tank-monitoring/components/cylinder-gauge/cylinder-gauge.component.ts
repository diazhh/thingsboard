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

import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

/**
 * Cylinder Gauge Component
 *
 * Inspired by FusionCharts Cylinder Gauge
 * Displays a 3D-style cylinder with fill level based on percentage
 *
 * Features:
 * - 3D effect with gradients and shadows
 * - Configurable colors based on alarm level
 * - Animated fill transitions
 * - Labels for value and unit
 * - Scale markers on the side
 */
@Component({
  selector: 'tb-cylinder-gauge',
  templateUrl: './cylinder-gauge.component.html',
  styleUrls: ['./cylinder-gauge.component.scss']
})
export class CylinderGaugeComponent implements OnChanges, AfterViewInit {

  @Input() value: number = 0;           // Current value (percentage 0-100)
  @Input() minValue: number = 0;        // Minimum value for scale
  @Input() maxValue: number = 100;      // Maximum value for scale
  @Input() displayValue: string = '';   // Value to display (e.g., "8.5 m")
  @Input() unit: string = '%';          // Unit to display
  @Input() label: string = '';          // Label below gauge (e.g., tank name)
  @Input() subLabel: string = '';       // Sub-label (e.g., product name)

  @Input() width: number = 120;         // Width in pixels
  @Input() height: number = 200;        // Height in pixels

  @Input() alarmLevel: 'none' | 'low' | 'high' | 'critical' = 'none';
  @Input() animate: boolean = true;
  @Input() showScale: boolean = true;   // Show scale markers on side
  @Input() showValue: boolean = true;   // Show value display
  @Input() showLabels: boolean = true;  // Show labels below

  // Internal calculated values
  fillHeight: number = 0;
  fillY: number = 0;
  fillColor: string = '#4fc3f7';
  fillColorDark: string = '#0288d1';
  cylinderGradientId: string = '';
  fillGradientId: string = '';

  // Cylinder dimensions (calculated from width/height)
  cylinderWidth: number = 60;
  cylinderHeight: number = 140;
  cylinderX: number = 30;
  cylinderY: number = 20;
  ellipseRy: number = 10;  // Ellipse radius for 3D effect

  // Scale markers
  scaleMarkers: { y: number; label: string }[] = [];

  uniqueId: string = '';

  @ViewChild('svgElement') svgElement: ElementRef;

  constructor() {
    this.uniqueId = 'cg_' + Math.random().toString(36).substr(2, 9);
    this.cylinderGradientId = this.uniqueId + '_cyl_grad';
    this.fillGradientId = this.uniqueId + '_fill_grad';
  }

  ngAfterViewInit(): void {
    this.calculateDimensions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['width'] || changes['height'] ||
        changes['alarmLevel'] || changes['minValue'] || changes['maxValue']) {
      this.calculateDimensions();
    }
  }

  private calculateDimensions(): void {
    // Calculate cylinder dimensions based on widget size
    this.cylinderWidth = this.width * 0.5;
    this.cylinderHeight = this.height * 0.65;
    this.cylinderX = (this.width - this.cylinderWidth) / 2;
    this.cylinderY = this.height * 0.1;
    this.ellipseRy = this.cylinderWidth * 0.15;

    // Clamp value between 0 and 100
    const percent = Math.max(0, Math.min(100, this.value));

    // Calculate fill height and position
    // The fill starts from the bottom of the cylinder
    const innerHeight = this.cylinderHeight - (this.ellipseRy * 2);
    this.fillHeight = (percent / 100) * innerHeight;
    this.fillY = this.cylinderY + this.ellipseRy + (innerHeight - this.fillHeight);

    // Set colors based on alarm level
    this.setColors();

    // Generate scale markers
    this.generateScaleMarkers();
  }

  private setColors(): void {
    switch (this.alarmLevel) {
      case 'critical':
        this.fillColor = '#ef5350';      // Red
        this.fillColorDark = '#c62828';
        break;
      case 'high':
        this.fillColor = '#ff9800';      // Orange
        this.fillColorDark = '#ef6c00';
        break;
      case 'low':
        this.fillColor = '#ffeb3b';      // Yellow
        this.fillColorDark = '#f9a825';
        break;
      case 'none':
      default:
        this.fillColor = '#4fc3f7';      // Light blue (like water/fuel)
        this.fillColorDark = '#0288d1';
        break;
    }
  }

  private generateScaleMarkers(): void {
    if (!this.showScale) {
      this.scaleMarkers = [];
      return;
    }

    const markers: { y: number; label: string }[] = [];
    const steps = 5; // 0%, 25%, 50%, 75%, 100%
    const innerHeight = this.cylinderHeight - (this.ellipseRy * 2);

    for (let i = 0; i <= steps; i++) {
      const percent = (i / steps) * 100;
      const y = this.cylinderY + this.ellipseRy + (innerHeight * (1 - i / steps));

      // Calculate actual value based on min/max
      const actualValue = this.minValue + ((this.maxValue - this.minValue) * (percent / 100));

      markers.push({
        y: y,
        label: percent === 0 || percent === 100 ? actualValue.toFixed(0) : ''
      });
    }

    this.scaleMarkers = markers;
  }

  // SVG path for the cylinder body (3D effect)
  get cylinderBodyPath(): string {
    const x = this.cylinderX;
    const y = this.cylinderY;
    const w = this.cylinderWidth;
    const h = this.cylinderHeight;
    const ry = this.ellipseRy;

    // Path: left side, bottom ellipse, right side
    return `M ${x} ${y + ry}
            L ${x} ${y + h - ry}
            A ${w/2} ${ry} 0 0 0 ${x + w} ${y + h - ry}
            L ${x + w} ${y + ry}`;
  }

  // Get display value string
  get displayString(): string {
    if (this.displayValue) {
      return this.displayValue;
    }
    return `${this.value.toFixed(1)}${this.unit}`;
  }

  // Get fill clip path
  get fillClipPath(): string {
    return `url(#${this.uniqueId}_clip)`;
  }
}
