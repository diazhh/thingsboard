import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { AttributeService } from '@core/public-api';
import { EntityType, AttributeScope, AttributeData } from '@shared/public-api';

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
  private readonly CONFIG_KEY = 'tankSystemConfig';
  
  private readonly defaultConfig: SystemConfig = {
    levelFormat: 'm',
    volumeFormat: 'bbl'
  };

  private configSubject: BehaviorSubject<SystemConfig>;
  public config$: Observable<SystemConfig>;
  private tenantEntityId: any = null;
  private isInitialized: boolean = false;
  private isLoading: boolean = false;

  constructor(private attributeService: AttributeService) {
    // Inicializar con configuración por defecto
    this.configSubject = new BehaviorSubject<SystemConfig>(this.defaultConfig);
    this.config$ = this.configSubject.asObservable();
  }

  /**
   * Inicializa el servicio con el entity ID del tenant
   * Debe ser llamado desde el componente con acceso al WidgetContext
   * Solo se inicializa una vez, llamadas subsecuentes son ignoradas
   */
  initWithTenant(tenantId: string): void {
    // Evitar múltiples inicializaciones
    if (this.isInitialized || this.isLoading) {
      console.log('SystemConfigService already initialized or loading');
      return;
    }

    this.isLoading = true;
    this.tenantEntityId = {
      entityType: EntityType.TENANT,
      id: tenantId
    };
    
    console.log('Initializing SystemConfigService with tenant:', tenantId);
    
    // Cargar configuración del tenant
    this.loadConfigFromTenant().subscribe({
      next: (config) => {
        console.log('Config loaded from tenant:', config);
        this.configSubject.next(config);
        this.isInitialized = true;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading config from tenant:', err);
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
    return this.saveConfigToTenant(config).pipe(
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
    return this.saveConfigToTenant(config).pipe(
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
    return this.saveConfigToTenant(newConfig).pipe(
      map(() => {
        this.configSubject.next(newConfig);
      })
    );
  }

  /**
   * Resetear a configuración por defecto
   */
  resetToDefaults(): Observable<void> {
    return this.saveConfigToTenant(this.defaultConfig).pipe(
      map(() => {
        this.configSubject.next(this.defaultConfig);
      })
    );
  }

  /**
   * Cargar configuración desde atributos del tenant
   */
  private loadConfigFromTenant(): Observable<SystemConfig> {
    if (!this.tenantEntityId) {
      console.warn('Tenant entity ID not initialized, using default config');
      return of(this.defaultConfig);
    }

    return this.attributeService
      .getEntityAttributes(this.tenantEntityId, AttributeScope.SERVER_SCOPE, [this.CONFIG_KEY])
      .pipe(
        map(attrs => {
          if (attrs && attrs.length > 0 && attrs[0].value) {
            const config = typeof attrs[0].value === 'string' 
              ? JSON.parse(attrs[0].value) 
              : attrs[0].value;
            return { ...this.defaultConfig, ...config } as SystemConfig;
          }
          return this.defaultConfig;
        }),
        catchError(error => {
          console.error('Error loading config from tenant:', error);
          return of(this.defaultConfig);
        })
      );
  }

  /**
   * Guardar configuración en atributos del tenant
   */
  private saveConfigToTenant(config: SystemConfig): Observable<void> {
    if (!this.tenantEntityId) {
      console.warn('Tenant entity ID not initialized, cannot save config');
      return of(void 0);
    }

    const attributes: AttributeData[] = [{
      key: this.CONFIG_KEY,
      value: config,
      lastUpdateTs: Date.now()
    } as AttributeData];

    return this.attributeService
      .saveEntityAttributes(this.tenantEntityId, AttributeScope.SERVER_SCOPE, attributes)
      .pipe(
        map(() => void 0),
        catchError(error => {
          console.error('Error saving config to tenant:', error);
          throw error;
        })
      );
  }

  /**
   * Recargar configuración desde el tenant
   * Útil después de cambios externos
   */
  reloadConfig(): Observable<void> {
    if (!this.tenantEntityId) {
      console.warn('Cannot reload config: tenant not initialized');
      return of(void 0);
    }
    
    return this.loadConfigFromTenant().pipe(
      map(config => {
        console.log('Config reloaded from tenant:', config);
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
    this.tenantEntityId = null;
    this.configSubject.next(this.defaultConfig);
  }

  /**
   * Verificar si el servicio está inicializado
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}
