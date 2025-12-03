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

import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProtocolType, ProtocolInfo } from '../../../shared/models/protocol-config.model';
import { ProtocolConfigService } from '../../../shared/services/protocol-config.service';

/**
 * Protocol Selector Component
 * 
 * Allows users to select and configure a protocol for gateway communication.
 */
@Component({
  selector: 'app-protocol-selector',
  templateUrl: './protocol-selector.component.html',
  styleUrls: ['./protocol-selector.component.scss']
})
export class ProtocolSelectorComponent implements OnInit {

  @Input() selectedProtocol: ProtocolType;
  @Output() protocolSelected = new EventEmitter<ProtocolType>();

  protocols: ProtocolInfo[] = [];
  selectedProtocolInfo: ProtocolInfo | null = null;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private protocolConfigService: ProtocolConfigService
  ) {
    this.form = this.fb.group({
      protocol: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadProtocols();
    if (this.selectedProtocol) {
      this.form.patchValue({ protocol: this.selectedProtocol });
      this.onProtocolChange(this.selectedProtocol);
    }
  }

  loadProtocols(): void {
    this.protocols = this.protocolConfigService.getSupportedProtocols();
  }

  onProtocolChange(protocol: ProtocolType): void {
    this.selectedProtocol = protocol;
    this.selectedProtocolInfo = this.protocolConfigService.getProtocolInfo(protocol);
    this.protocolSelected.emit(protocol);
  }

  getProtocolIcon(protocol: ProtocolInfo): string {
    return protocol.icon || 'device_hub';
  }

  getProtocolDescription(protocol: ProtocolInfo): string {
    return protocol.description || '';
  }

  isNetworkProtocol(protocol: ProtocolInfo): boolean {
    return protocol.supportsNetwork;
  }

  isSerialProtocol(protocol: ProtocolInfo): boolean {
    return protocol.supportsSerial;
  }
}
