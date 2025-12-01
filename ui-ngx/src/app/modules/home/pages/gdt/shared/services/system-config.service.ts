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
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { AttributeService, AssetService } from '@core/public-api';
import { EntityType, AttributeScope, AttributeData, Asset, PageLink } from '@shared/public-api';

/**
 * Tipos de formato de nivel soportados
 */
export type LevelFormat = 
  | 'mm'           // Milímetros
  | 'cm'           // Centímetros
  | 'm'            // Metros
  | 'in'           // Pulgadas
  | 'ft'           // Pies
  | 'ft-in'        // Pies y pulgadas (ej: 12' 6")
  | 'ft-in-1/8'    // Pies, pulgadas y fracción 1/8
  | 'ft-in-1/16'   // Pies, pulgadas y fracción 1/16
  | 'ft-in-1/32'   // Pies, pulgadas y fracción 1/32
  | 'ft-in-1/64';  // Pies, pulgadas y fracción 1/64

/**
 * Configuración global del sistema
 */
export interface SystemConfig {
  levelFormat: LevelFormat;
  volumeFormat: 'bbl' | 'm3' | 'gal';
}

/**
 * Servicio para gestionar la configuración global del sistema
 * Guarda la configuración en atributos del tenant de ThingsBoard
 * Esto permite que la configuración sea compartida entre usuarios y persista entre sesiones
 */
@Injectable({
  providedIn: 'root'
})
export class SystemConfigService {
  private readonly CONFIG_ASSET_NAME = 'GDT System Configuration';
  private readonly CONFIG_ASSET_TYPE = 'GDT_Config';
  private readonly CONFIG_KEY = 'config';
  
  private readonly defaultConfig: SystemConfig = {
    levelFormat: 'm',
    volumeFormat: 'bbl'
  };

  private configSubject: BehaviorSubject<SystemConfig>;
  public config$: Observable<SystemConfig>;
  private configAssetId: any = null;
  private tenantId: string = null;
  private isInitialized: boolean = false;
  private isLoading: boolean = false;

  constructor(
    private attributeService: AttributeService,
    private assetService: AssetService
  ) {
    // Inicializar con configuración por defecto
    this.configSubject = new BehaviorSubject<SystemConfig>(this.defaultConfig);
    this.config$ = this.configSubject.asObservable();
  }

  /**
   * Inicializa el servicio con el tenant ID
   * Busca o crea el asset de configuración y carga los datos
   */
  initWithTenant(tenantId: string): void {
    // Evitar múltiples inicializaciones
    if (this.isInitialized || this.isLoading) {
      console.log('SystemConfigService already initialized or loading');
      return;
    }

    this.isLoading = true;
    this.tenantId = tenantId;
    
    console.log('Initializing SystemConfigService with tenant:', tenantId);
    
    // Buscar o crear el asset de configuración
    this.findOrCreateConfigAsset().pipe(
      switchMap(asset => {
        this.configAssetId = {
          entityType: EntityType.ASSET,
          id: asset.id.id
        };
        return this.loadConfigFromAsset();
      })
    ).subscribe({
      next: (config) => {
        console.log('Config loaded from asset:', config);
        this.configSubject.next(config);
        this.isInitialized = true;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading config from asset:', err);
        // Usar configuración por defecto
        this.configSubject.next(this.defaultConfig);
        this.isInitialized = true;
        this.isLoading = false;
      }
    });
  }

  /**
   * Obtener la configuración actual
   */
  getConfig(): SystemConfig {
    return this.configSubject.value;
  }

  /**
   * Obtener el formato de nivel actual
   */
  getLevelFormat(): LevelFormat {
    return this.configSubject.value.levelFormat;
  }

  /**
   * Actualizar el formato de nivel
   */
  setLevelFormat(format: LevelFormat): Observable<void> {
    const config = { ...this.configSubject.value, levelFormat: format };
    return this.saveConfigToAsset(config).pipe(
      map(() => {
        this.configSubject.next(config);
      })
    );
  }

  /**
   * Actualizar el formato de volumen
   */
  setVolumeFormat(format: 'bbl' | 'm3' | 'gal'): Observable<void> {
    const config = { ...this.configSubject.value, volumeFormat: format };
    return this.saveConfigToAsset(config).pipe(
      map(() => {
        this.configSubject.next(config);
      })
    );
  }

  /**
   * Actualizar toda la configuración
   */
  updateConfig(config: Partial<SystemConfig>): Observable<void> {
    const newConfig = { ...this.configSubject.value, ...config };
    return this.saveConfigToAsset(newConfig).pipe(
      map(() => {
        this.configSubject.next(newConfig);
      })
    );
  }

  /**
   * Resetear a configuración por defecto
   */
  resetToDefaults(): Observable<void> {
    return this.saveConfigToAsset(this.defaultConfig).pipe(
      map(() => {
        this.configSubject.next(this.defaultConfig);
      })
    );
  }

  /**
   * Buscar o crear el asset de configuración
   */
  private findOrCreateConfigAsset(): Observable<Asset> {
    // Buscar asset existente por nombre usando getTenantAssetInfos
    const pageLink = new PageLink(100, 0, this.CONFIG_ASSET_NAME);
    
    return this.assetService.getTenantAssetInfos(pageLink, this.CONFIG_ASSET_TYPE).pipe(
      map(pageData => {
        // Buscar el asset de configuración exacto
        const configAsset = pageData.data.find(
          assetInfo => assetInfo.name === this.CONFIG_ASSET_NAME
        );
        return configAsset;
      }),
      switchMap(existingAssetInfo => {
        if (existingAssetInfo) {
          console.log('Found existing config asset:', existingAssetInfo.id.id);
          // Obtener el asset completo
          return this.assetService.getAsset(existingAssetInfo.id.id);
        } else {
          // Crear nuevo asset de configuración
          console.log('Creating new config asset');
          const newAsset: Asset = {
            name: this.CONFIG_ASSET_NAME,
            type: this.CONFIG_ASSET_TYPE,
            label: 'Configuración del Sistema GDT'
          } as Asset;
          return this.assetService.saveAsset(newAsset);
        }
      }),
      catchError(error => {
        console.error('Error finding/creating config asset:', error);
        throw error;
      })
    );
  }

  /**
   * Cargar configuración desde el asset
   */
  private loadConfigFromAsset(): Observable<SystemConfig> {
    if (!this.configAssetId) {
      console.warn('Config asset ID not initialized');
      return of(this.defaultConfig);
    }

    return this.attributeService
      .getEntityAttributes(this.configAssetId, AttributeScope.SERVER_SCOPE, [this.CONFIG_KEY])
      .pipe(
        map(attrs => {
          if (attrs && attrs.length > 0 && attrs[0].value) {
            const config = typeof attrs[0].value === 'string' 
              ? JSON.parse(attrs[0].value) 
              : attrs[0].value;
            console.log('Loaded config from asset:', config);
            return { ...this.defaultConfig, ...config } as SystemConfig;
          }
          console.log('No config found in asset, using defaults');
          return this.defaultConfig;
        }),
        catchError(error => {
          console.error('Error loading config from asset:', error);
          return of(this.defaultConfig);
        })
      );
  }

  /**
   * Guardar configuración en el asset
   */
  private saveConfigToAsset(config: SystemConfig): Observable<void> {
    if (!this.configAssetId) {
      console.warn('Config asset ID not initialized, cannot save config');
      return of(void 0);
    }

    const attributes: AttributeData[] = [{
      key: this.CONFIG_KEY,
      value: config
    } as AttributeData];

    return this.attributeService
      .saveEntityAttributes(this.configAssetId, AttributeScope.SERVER_SCOPE, attributes)
      .pipe(
        tap(() => console.log('Config saved to asset successfully')),
        map(() => void 0),
        catchError(error => {
          console.error('Error saving config to asset:', error);
          throw error;
        })
      );
  }

  /**
   * Recargar configuración desde el tenant
   * Útil después de cambios externos
   */
  reloadConfig(): Observable<void> {
    if (!this.configAssetId) {
      console.warn('Cannot reload config: asset not initialized');
      return of(void 0);
    }
    
    return this.loadConfigFromAsset().pipe(
      map(config => {
        console.log('Config reloaded from asset:', config);
        this.configSubject.next(config);
      })
    );
  }

  /**
   * Resetear el estado de inicialización
   * Útil para testing o cuando se necesita reinicializar
   */
  resetInitialization(): void {
    this.isInitialized = false;
    this.isLoading = false;
    this.configAssetId = null;
    this.tenantId = null;
    this.configSubject.next(this.defaultConfig);
  }

  /**
   * Verificar si el servicio está inicializado
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}
