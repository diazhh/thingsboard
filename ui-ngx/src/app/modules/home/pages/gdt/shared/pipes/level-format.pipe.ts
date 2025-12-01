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

import { Pipe, PipeTransform } from '@angular/core';
import { LevelFormatterService } from '../services/level-formatter.service';
import { SystemConfigService } from '../services/system-config.service';

/**
 * Pipe para formatear niveles según la configuración global del sistema
 * 
 * Uso:
 * {{ levelMm | levelFormat }}
 * {{ levelMm | levelFormat:'ft-in-1/16' }}
 */
@Pipe({
  name: 'levelFormat',
  pure: false // Necesario para reaccionar a cambios en la configuración
})
export class LevelFormatPipe implements PipeTransform {
  
  constructor(
    private levelFormatterService: LevelFormatterService,
    private systemConfigService: SystemConfigService
  ) {}

  transform(levelMm: number | null | undefined, formatOverride?: string): string {
    if (levelMm === null || levelMm === undefined || isNaN(levelMm)) {
      return '-';
    }

    // Usar formato especificado o el configurado globalmente
    const format = formatOverride || this.systemConfigService.getLevelFormat();
    
    const formatted = this.levelFormatterService.formatLevel(levelMm, format as any);
    
    return `${formatted.value} ${formatted.unit}`.trim();
  }
}
