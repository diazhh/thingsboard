import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

/**
 * Componente de Gauge de Líquido
 *
 * Muestra un indicador visual de nivel de tanque con efecto de olas animadas
 * usando ngx-liquid-gauge (basado en D3.js)
 */
@Component({
  selector: 'tb-liquid-gauge-display',
  templateUrl: './liquid-gauge-display.component.html',
  styleUrls: ['./liquid-gauge-display.component.scss']
})
export class LiquidGaugeDisplayComponent implements OnChanges {

  @Input() value: number = 0;           // Porcentaje de llenado (0-100)
  @Input() minValue: number = 0;
  @Input() maxValue: number = 100;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() alarmLevel: 'none' | 'low' | 'high' | 'critical' = 'none';
  @Input() showPercent: boolean = true;
  @Input() animate: boolean = true;
  @Input() label?: string;

  // Configuración del gauge
  gaugeConfig = {
    circleThickness: 0.05,
    circleFillGap: 0.05,
    circleColor: '#178BCA',
    waveHeight: 0.05,
    waveCount: 2,
    waveRiseTime: 1000,
    waveAnimateTime: 2000,
    waveRise: true,
    waveHeightScaling: true,
    waveAnimate: true,
    waveColor: '#178BCA',
    waveOffset: 0.25,
    textVertPosition: 0.5,
    textSize: 1,
    valueCountUp: true,
    displayPercent: true,
    textColor: '#045681',
    waveTextColor: '#A4DBf8'
  };

  // Dimensiones según tamaño
  get dimensions(): number {
    switch (this.size) {
      case 'small': return 80;
      case 'medium': return 120;
      case 'large': return 180;
      default: return 120;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['alarmLevel'] || changes['animate']) {
      this.updateGaugeColors();
    }
  }

  private updateGaugeColors(): void {
    // Colores según nivel de alarma
    switch (this.alarmLevel) {
      case 'critical':
        this.gaugeConfig.circleColor = '#d32f2f';
        this.gaugeConfig.waveColor = '#ef5350';
        this.gaugeConfig.textColor = '#b71c1c';
        this.gaugeConfig.waveTextColor = '#ffcdd2';
        break;
      case 'high':
        this.gaugeConfig.circleColor = '#f57c00';
        this.gaugeConfig.waveColor = '#ff9800';
        this.gaugeConfig.textColor = '#e65100';
        this.gaugeConfig.waveTextColor = '#ffe0b2';
        break;
      case 'low':
        this.gaugeConfig.circleColor = '#fbc02d';
        this.gaugeConfig.waveColor = '#ffeb3b';
        this.gaugeConfig.textColor = '#f57f17';
        this.gaugeConfig.waveTextColor = '#fff9c4';
        break;
      case 'none':
      default:
        this.gaugeConfig.circleColor = '#2e7d32';
        this.gaugeConfig.waveColor = '#4caf50';
        this.gaugeConfig.textColor = '#1b5e20';
        this.gaugeConfig.waveTextColor = '#c8e6c9';
        break;
    }

    // Configurar animación
    this.gaugeConfig.waveAnimate = this.animate;
    this.gaugeConfig.waveRise = this.animate;
    this.gaugeConfig.valueCountUp = this.animate;
    this.gaugeConfig.displayPercent = this.showPercent;
  }

  // Método para obtener el texto del estado
  getStatusText(): string {
    switch (this.alarmLevel) {
      case 'critical': return 'CRÍTICO';
      case 'high': return 'ALTO';
      case 'low': return 'BAJO';
      default: return 'NORMAL';
    }
  }

  getStatusClass(): string {
    return `status-${this.alarmLevel}`;
  }
}
