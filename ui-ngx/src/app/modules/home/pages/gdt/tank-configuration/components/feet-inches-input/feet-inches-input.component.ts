import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

/**
 * Componente de input especializado para Pies y Pulgadas
 * Muestra dos campos: uno para pies (entero) y otro para pulgadas (entero)
 */
@Component({
  selector: 'tb-feet-inches-input',
  templateUrl: './feet-inches-input.component.html',
  styleUrls: ['./feet-inches-input.component.scss']
})
export class FeetInchesInputComponent implements OnInit {
  
  @Input() label: string = 'Medida';
  @Input() valueInMeters: number | undefined;
  @Input() required: boolean = false;
  @Input() readonly: boolean = false;
  
  @Output() valueChange = new EventEmitter<number>();
  
  feet: number | null = null;
  inches: number | null = null;
  
  private readonly MM_TO_IN = 0.0393701;
  private readonly IN_PER_FT = 12;
  
  ngOnInit(): void {
    this.updateFieldsFromMeters();
  }
  
  ngOnChanges(): void {
    this.updateFieldsFromMeters();
  }
  
  /**
   * Actualizar campos de pies y pulgadas desde valor en metros
   */
  private updateFieldsFromMeters(): void {
    if (this.valueInMeters === undefined || this.valueInMeters === null) {
      this.feet = null;
      this.inches = null;
      return;
    }
    
    // Convertir metros a milímetros, luego a pulgadas
    const totalInches = (this.valueInMeters * 1000) * this.MM_TO_IN;
    
    // Separar pies y pulgadas
    this.feet = Math.floor(totalInches / this.IN_PER_FT);
    this.inches = Math.floor(totalInches % this.IN_PER_FT);
  }
  
  /**
   * Manejar cambio en campo de pies
   */
  onFeetChange(value: string): void {
    const numValue = parseInt(value, 10);
    this.feet = isNaN(numValue) ? null : Math.max(0, numValue);
    this.emitValue();
  }
  
  /**
   * Manejar cambio en campo de pulgadas
   */
  onInchesChange(value: string): void {
    const numValue = parseInt(value, 10);
    this.inches = isNaN(numValue) ? null : Math.max(0, Math.min(11, numValue));
    this.emitValue();
  }
  
  /**
   * Emitir valor convertido a metros
   */
  private emitValue(): void {
    if (this.feet === null && this.inches === null) {
      this.valueChange.emit(undefined);
      return;
    }
    
    const totalInches = (this.feet || 0) * this.IN_PER_FT + (this.inches || 0);
    const totalMm = totalInches / this.MM_TO_IN;
    const meters = totalMm / 1000;
    
    this.valueChange.emit(meters);
  }
  
  /**
   * Validar que al menos un campo tenga valor si es requerido
   */
  isValid(): boolean {
    if (!this.required) return true;
    return this.feet !== null || this.inches !== null;
  }
}
