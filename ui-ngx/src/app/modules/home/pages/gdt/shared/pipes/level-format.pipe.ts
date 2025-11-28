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
