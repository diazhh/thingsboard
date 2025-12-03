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

/*
 * Copyright © 2024 GDT - Grupo de Desarrollo Tecnológico
 * Licensed under the Apache License, Version 2.0
 */

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ProtocolConfig, ProtocolValidationResult } from '../../../shared/models/protocol-config.model';
import { ProtocolConfigService } from '../../../shared/services/protocol-config.service';

/**
 * Configuration Validator Component
 * 
 * Validates protocol configuration and displays validation results.
 */
@Component({
  selector: 'app-config-validator',
  templateUrl: './config-validator.component.html',
  styleUrls: ['./config-validator.component.scss']
})
export class ConfigValidatorComponent implements OnInit {

  @Input() config: ProtocolConfig;
  @Output() validationResult = new EventEmitter<ProtocolValidationResult>();

  validationState: ProtocolValidationResult | null = null;
  isValidating = false;
  connectionTestResult: boolean | null = null;
  isTestingConnection = false;

  constructor(private protocolConfigService: ProtocolConfigService) { }

  ngOnInit(): void {
    this.validateConfiguration();
  }

  ngOnChanges(): void {
    if (this.config) {
      this.validateConfiguration();
    }
  }

  validateConfiguration(): void {
    if (!this.config) {
      return;
    }

    this.isValidating = true;
    this.validationState = this.protocolConfigService.validateConfiguration(this.config);
    this.isValidating = false;
    this.validationResult.emit(this.validationState);
  }

  testConnection(): void {
    if (!this.config || !this.validationState?.valid) {
      return;
    }

    this.isTestingConnection = true;
    this.connectionTestResult = null;

    // For now, we'll use a mock test. In production, this would call the backend
    setTimeout(() => {
      this.connectionTestResult = true;
      this.isTestingConnection = false;
    }, 2000);
  }

  getErrorIcon(): string {
    return 'error_outline';
  }

  getWarningIcon(): string {
    return 'warning';
  }

  getSuccessIcon(): string {
    return 'check_circle';
  }

  isValid(): boolean {
    return this.validationState?.valid || false;
  }

  hasErrors(): boolean {
    return (this.validationState?.errors?.length || 0) > 0;
  }

  hasWarnings(): boolean {
    return (this.validationState?.warnings?.length || 0) > 0;
  }
}
