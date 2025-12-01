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

import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { LevelFormat } from '../../../shared/services/system-config.service';

/**
 * Componente de input especializado para Pies, Pulgadas y Fracción
 * Muestra tres campos: pies (entero), pulgadas (entero), y fracción (select)
 */
@Component({
  selector: 'tb-feet-inches-fraction-input',
  templateUrl: './feet-inches-fraction-input.component.html',
  styleUrls: ['./feet-inches-fraction-input.component.scss']
})
export class FeetInchesFractionInputComponent implements OnInit, OnChanges {
  
  @Input() label: string = 'Medida';
  @Input() valueInMeters: number | undefined;
  @Input() fractionFormat: LevelFormat = 'ft-in-1/16'; // ft-in-1/8, ft-in-1/16, ft-in-1/32, ft-in-1/64
  @Input() required: boolean = false;
  @Input() readonly: boolean = false;
  
  @Output() valueChange = new EventEmitter<number>();
  
  feet: number | null = null;
  inches: number | null = null;
  fraction: number | null = null; // Numerador de la fracción
  
  fractionOptions: Array<{value: number, label: string}> = [];
  denominator: number = 16; // Denominador de la fracción
  
  private readonly MM_TO_IN = 0.0393701;
  private readonly IN_PER_FT = 12;
  
  ngOnInit(): void {
    this.setupFractionOptions();
    this.updateFieldsFromMeters();
  }
  
  ngOnChanges(): void {
    this.setupFractionOptions();
    this.updateFieldsFromMeters();
  }
  
  /**
   * Configurar opciones de fracción según el formato
   */
  private setupFractionOptions(): void {
    // Extraer denominador del formato
    const match = this.fractionFormat.match(/1\/(\d+)/);
    this.denominator = match ? parseInt(match[1], 10) : 16;
    
    // Generar opciones de fracción
    this.fractionOptions = [];
    for (let i = 0; i <= this.denominator; i++) {
      const simplified = this.simplifyFraction(i, this.denominator);
      this.fractionOptions.push({
        value: i,
        label: i === 0 ? '0' : `${simplified.num}/${simplified.den}`
      });
    }
  }
  
  /**
   * Simplificar fracción
   */
  private simplifyFraction(numerator: number, denominator: number): {num: number, den: number} {
    if (numerator === 0) return {num: 0, den: 1};
    if (numerator === denominator) return {num: 1, den: 1};
    
    const gcd = this.gcd(numerator, denominator);
    return {
      num: numerator / gcd,
      den: denominator / gcd
    };
  }
  
  /**
   * Calcular máximo común divisor
   */
  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }
  
  /**
   * Actualizar campos desde valor en metros
   */
  private updateFieldsFromMeters(): void {
    if (this.valueInMeters === undefined || this.valueInMeters === null) {
      this.feet = null;
      this.inches = null;
      this.fraction = null;
      return;
    }
    
    // Convertir metros a milímetros, luego a pulgadas
    const totalInches = (this.valueInMeters * 1000) * this.MM_TO_IN;
    
    // Separar pies
    this.feet = Math.floor(totalInches / this.IN_PER_FT);
    const remainingInches = totalInches % this.IN_PER_FT;
    
    // Separar pulgadas enteras
    this.inches = Math.floor(remainingInches);
    
    // Calcular fracción
    const fractionalPart = remainingInches - this.inches;
    this.fraction = Math.round(fractionalPart * this.denominator);
    
    // Si la fracción es igual al denominador, ajustar
    if (this.fraction === this.denominator) {
      this.fraction = 0;
      this.inches++;
      if (this.inches === this.IN_PER_FT) {
        this.inches = 0;
        this.feet++;
      }
    }
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
   * Manejar cambio en select de fracción
   */
  onFractionChange(value: number): void {
    this.fraction = value;
    this.emitValue();
  }
  
  /**
   * Emitir valor convertido a metros
   */
  private emitValue(): void {
    if (this.feet === null && this.inches === null && this.fraction === null) {
      this.valueChange.emit(undefined);
      return;
    }
    
    const feetInInches = (this.feet || 0) * this.IN_PER_FT;
    const wholeInches = this.inches || 0;
    const fractionalInches = (this.fraction || 0) / this.denominator;
    
    const totalInches = feetInInches + wholeInches + fractionalInches;
    const totalMm = totalInches / this.MM_TO_IN;
    const meters = totalMm / 1000;
    
    this.valueChange.emit(meters);
  }
  
  /**
   * Validar que al menos un campo tenga valor si es requerido
   */
  isValid(): boolean {
    if (!this.required) return true;
    return this.feet !== null || this.inches !== null || this.fraction !== null;
  }
}
