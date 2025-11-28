import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TankShape } from '../../../shared/models/display-config.model';

/**
 * Componente de Visualización de Forma del Tanque
 *
 * Renderiza una representación visual SVG del tanque según su forma:
 * - Cilindro vertical
 * - Cilindro horizontal
 * - Esférico
 * - Rectangular
 *
 * Muestra el nivel de llenado con animación y colores según alarmas.
 */
@Component({
  selector: 'tb-tank-shape-visual',
  templateUrl: './tank-shape-visual.component.html',
  styleUrls: ['./tank-shape-visual.component.scss']
})
export class TankShapeVisualComponent implements OnChanges {

  @Input() tankShape: TankShape = 'vertical_cylinder';
  @Input() levelPercent: number = 0;
  @Input() alarmLevel: 'none' | 'low' | 'high' | 'critical' = 'none';
  @Input() width: number = 100;
  @Input() height: number = 150;
  @Input() animate: boolean = true;
  @Input() showLabels: boolean = false;
  @Input() tankName: string = '';

  // Colores según nivel de alarma
  fillColor: string = '#4fc3f7';
  strokeColor: string = '#0288d1';

  // Dimensiones calculadas del SVG
  viewBox: string = '0 0 100 150';
  liquidPath: string = '';
  tankPath: string = '';
  liquidY: number = 0;
  liquidHeight: number = 0;

  // Para cilindro horizontal
  liquidWidth: number = 0;

  ngOnChanges(changes: SimpleChanges): void {
    this.updateColors();
    this.calculateDimensions();
  }

  /**
   * Actualiza los colores según el nivel de alarma
   */
  private updateColors(): void {
    switch (this.alarmLevel) {
      case 'critical':
        this.fillColor = '#ef5350';  // Rojo
        this.strokeColor = '#c62828';
        break;
      case 'high':
        this.fillColor = '#ff9800';  // Naranja
        this.strokeColor = '#ef6c00';
        break;
      case 'low':
        this.fillColor = '#ffc107';  // Amarillo
        this.strokeColor = '#ffa000';
        break;
      default:
        this.fillColor = '#4fc3f7';  // Azul claro
        this.strokeColor = '#0288d1';
    }
  }

  /**
   * Calcula las dimensiones del tanque según su forma
   */
  private calculateDimensions(): void {
    const percent = Math.max(0, Math.min(100, this.levelPercent));

    switch (this.tankShape) {
      case 'vertical':
      case 'vertical_cylinder':
        this.calculateVerticalCylinder(percent);
        break;
      case 'horizontal':
      case 'horizontal_cylinder':
        this.calculateHorizontalCylinder(percent);
        break;
      case 'spherical':
        this.calculateSpherical(percent);
        break;
      case 'rectangular':
        this.calculateRectangular(percent);
        break;
      default:
        this.calculateVerticalCylinder(percent);
    }
  }

  /**
   * Calcula dimensiones para cilindro vertical
   */
  private calculateVerticalCylinder(percent: number): void {
    this.viewBox = '0 0 100 150';

    // El tanque tiene tapas elípticas arriba y abajo
    const tankTop = 15;
    const tankBottom = 135;
    const tankLeft = 15;
    const tankRight = 85;
    const tankHeight = tankBottom - tankTop;

    // Calcular nivel del líquido
    this.liquidHeight = (tankHeight * percent) / 100;
    this.liquidY = tankBottom - this.liquidHeight;

    // Path del tanque (contorno)
    this.tankPath = `
      M ${tankLeft} ${tankTop + 10}
      Q ${tankLeft} ${tankTop}, ${(tankLeft + tankRight) / 2} ${tankTop}
      Q ${tankRight} ${tankTop}, ${tankRight} ${tankTop + 10}
      L ${tankRight} ${tankBottom - 10}
      Q ${tankRight} ${tankBottom}, ${(tankLeft + tankRight) / 2} ${tankBottom}
      Q ${tankLeft} ${tankBottom}, ${tankLeft} ${tankBottom - 10}
      Z
    `;

    // Path del líquido
    if (percent > 0) {
      const liquidTop = this.liquidY;
      const centerX = (tankLeft + tankRight) / 2;
      
      this.liquidPath = `
        M ${tankLeft + 1} ${liquidTop}
        L ${tankRight - 1} ${liquidTop}
        L ${tankRight - 1} ${tankBottom - 10}
        Q ${tankRight - 1} ${tankBottom}, ${centerX} ${tankBottom}
        Q ${tankLeft + 1} ${tankBottom}, ${tankLeft + 1} ${tankBottom - 10}
        L ${tankLeft + 1} ${liquidTop}
        Z
      `;
    } else {
      this.liquidPath = '';
    }
  }

  /**
   * Calcula dimensiones para cilindro horizontal
   */
  private calculateHorizontalCylinder(percent: number): void {
    this.viewBox = '0 0 150 100';

    const tankTop = 15;
    const tankBottom = 85;
    const tankLeft = 15;
    const tankRight = 135;
    const tankWidth = tankRight - tankLeft;
    const tankHeight = tankBottom - tankTop;
    const radius = tankHeight / 2;
    const centerY = (tankTop + tankBottom) / 2;

    // Para cilindro horizontal, el llenado es más complejo
    // Usamos el área del segmento circular
    const fillHeight = (tankHeight * percent) / 100;
    const liquidTopY = tankBottom - fillHeight;

    // Path del tanque
    this.tankPath = `
      M ${tankLeft + radius} ${tankTop}
      L ${tankRight - radius} ${tankTop}
      A ${radius} ${radius} 0 0 1 ${tankRight - radius} ${tankBottom}
      L ${tankLeft + radius} ${tankBottom}
      A ${radius} ${radius} 0 0 1 ${tankLeft + radius} ${tankTop}
    `;

    // Path del líquido (simplificado como rectángulo con esquinas redondeadas)
    if (percent > 0) {
      // Calcular el ancho del líquido en la superficie según la altura
      const h = fillHeight;
      const r = radius;
      // Ancho del segmento a esa altura
      const chordHalf = Math.sqrt(Math.max(0, r * r - (r - h) * (r - h)));

      this.liquidPath = `
        M ${tankLeft + radius - chordHalf} ${liquidTopY}
        L ${tankRight - radius + chordHalf} ${liquidTopY}
        A ${radius} ${radius} 0 0 1 ${tankRight - radius + chordHalf} ${tankBottom}
        L ${tankLeft + radius - chordHalf} ${tankBottom}
        A ${radius} ${radius} 0 0 1 ${tankLeft + radius - chordHalf} ${liquidTopY}
        Z
      `;
    } else {
      this.liquidPath = '';
    }
  }

  /**
   * Calcula dimensiones para tanque esférico
   */
  private calculateSpherical(percent: number): void {
    this.viewBox = '0 0 100 100';

    const centerX = 50;
    const centerY = 50;
    const radius = 40;

    // Path del tanque (círculo)
    this.tankPath = `
      M ${centerX} ${centerY - radius}
      A ${radius} ${radius} 0 1 1 ${centerX} ${centerY + radius}
      A ${radius} ${radius} 0 1 1 ${centerX} ${centerY - radius}
    `;

    // Calcular el nivel del líquido
    if (percent > 0) {
      const fillHeight = (2 * radius * percent) / 100;
      const liquidTopY = centerY + radius - fillHeight;

      // Calcular el ancho del segmento a esa altura
      const distFromCenter = liquidTopY - centerY;
      const chordHalf = Math.sqrt(Math.max(0, radius * radius - distFromCenter * distFromCenter));

      if (percent >= 100) {
        // Completamente lleno
        this.liquidPath = this.tankPath;
      } else if (percent > 50) {
        // Más de la mitad
        this.liquidPath = `
          M ${centerX - chordHalf} ${liquidTopY}
          A ${radius} ${radius} 0 1 1 ${centerX + chordHalf} ${liquidTopY}
          A ${radius} ${radius} 0 0 0 ${centerX - chordHalf} ${liquidTopY}
          Z
        `;
      } else {
        // Menos de la mitad
        this.liquidPath = `
          M ${centerX - chordHalf} ${liquidTopY}
          A ${radius} ${radius} 0 0 1 ${centerX + chordHalf} ${liquidTopY}
          A ${radius} ${radius} 0 0 0 ${centerX - chordHalf} ${liquidTopY}
          Z
        `;
      }
    } else {
      this.liquidPath = '';
    }
  }

  /**
   * Calcula dimensiones para tanque rectangular
   */
  private calculateRectangular(percent: number): void {
    this.viewBox = '0 0 100 150';

    const tankTop = 15;
    const tankBottom = 135;
    const tankLeft = 20;
    const tankRight = 80;
    const tankHeight = tankBottom - tankTop;

    // Calcular nivel del líquido
    this.liquidHeight = (tankHeight * percent) / 100;
    this.liquidY = tankBottom - this.liquidHeight;

    // Path del tanque (rectángulo con bordes redondeados)
    this.tankPath = `
      M ${tankLeft + 5} ${tankTop}
      L ${tankRight - 5} ${tankTop}
      Q ${tankRight} ${tankTop}, ${tankRight} ${tankTop + 5}
      L ${tankRight} ${tankBottom - 5}
      Q ${tankRight} ${tankBottom}, ${tankRight - 5} ${tankBottom}
      L ${tankLeft + 5} ${tankBottom}
      Q ${tankLeft} ${tankBottom}, ${tankLeft} ${tankBottom - 5}
      L ${tankLeft} ${tankTop + 5}
      Q ${tankLeft} ${tankTop}, ${tankLeft + 5} ${tankTop}
    `;

    // Path del líquido
    if (percent > 0) {
      this.liquidPath = `
        M ${tankLeft + 1} ${this.liquidY}
        L ${tankRight - 1} ${this.liquidY}
        L ${tankRight - 1} ${tankBottom - 5}
        Q ${tankRight - 1} ${tankBottom}, ${tankRight - 5} ${tankBottom}
        L ${tankLeft + 5} ${tankBottom}
        Q ${tankLeft + 1} ${tankBottom}, ${tankLeft + 1} ${tankBottom - 5}
        L ${tankLeft + 1} ${this.liquidY}
        Z
      `;
    } else {
      this.liquidPath = '';
    }
  }

  /**
   * Obtiene el nombre de la forma para mostrar
   */
  getShapeLabel(): string {
    switch (this.tankShape) {
      case 'vertical':
      case 'vertical_cylinder':
        return 'Cilíndrico Vertical';
      case 'horizontal':
      case 'horizontal_cylinder':
        return 'Cilíndrico Horizontal';
      case 'spherical':
        return 'Esférico';
      case 'rectangular':
        return 'Rectangular';
      default:
        return 'Desconocido';
    }
  }
}
