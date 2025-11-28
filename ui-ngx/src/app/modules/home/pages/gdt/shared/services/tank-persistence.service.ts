import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { WidgetContext } from '@home/models/widget-component.models';
import { EntityType, AttributeScope } from '@shared/public-api';
import { StrappingTable } from '../models/strapping-table.model';
import { ManualGaugingRecord, MaintenanceRecord, ApiGravityUpdate } from '../models/tank-extended-attributes.model';

// EntityId interface for type safety
interface EntityId {
  id: string;
  entityType: EntityType;
}

/**
 * Servicio de persistencia para datos del tanque en ThingsBoard
 * Maneja la lectura y escritura de atributos
 */
@Injectable()
export class TankPersistenceService {

  constructor() {}

  // ==================== HELPERS ====================

  /**
   * Convierte string ID a EntityId
   */
  private toEntityId(id: string, entityType: EntityType = EntityType.ASSET): EntityId {
    return {
      id,
      entityType
    };
  }

  // ==================== TABLA DE CALIBRACIÓN ====================

  /**
   * Guarda la tabla de calibración en los atributos del Asset
   */
  saveStrappingTable(ctx: WidgetContext, tankAssetId: string, table: StrappingTable): Observable<any> {
    const tableJson = JSON.stringify(table);

    return ctx.attributeService.saveEntityAttributes(
      this.toEntityId(tankAssetId),
      AttributeScope.SERVER_SCOPE,
      [
        { key: 'strappingTable', value: tableJson },
        { key: 'strappingTableVersion', value: table.version },
        { key: 'strappingTableUpdatedDate', value: new Date().toISOString() }
      ]
    );
  }

  /**
   * Carga la tabla de calibración desde los atributos del Asset
   */
  loadStrappingTable(ctx: WidgetContext, tankAssetId: string): Observable<StrappingTable | null> {
    return ctx.attributeService.getEntityAttributes(
      this.toEntityId(tankAssetId),
      AttributeScope.SERVER_SCOPE,
      ['strappingTable']
    ).pipe(
      map(attrs => {
        const tableAttr = attrs.find(a => a.key === 'strappingTable');
        if (!tableAttr || !tableAttr.value) {
          return null;
        }

        try {
          return JSON.parse(tableAttr.value) as StrappingTable;
        } catch (error) {
          console.error('Error parsing strapping table:', error);
          return null;
        }
      }),
      catchError(error => {
        console.error('Error loading strapping table:', error);
        return of(null);
      })
    );
  }

  // ==================== API GRAVITY ====================

  /**
   * Guarda actualización de API Gravity
   * Se guarda en atributo (valor actual)
   */
  saveApiGravity(ctx: WidgetContext, tankAssetId: string, update: ApiGravityUpdate): Observable<any> {
    return ctx.attributeService.saveEntityAttributes(
      this.toEntityId(tankAssetId),
      AttributeScope.SERVER_SCOPE,
      [
        { key: 'apiGravity', value: update.newValue },
        { key: 'apiGravityLastUpdate', value: update.timestamp.toISOString() },
        { key: 'apiGravityLastChangedBy', value: update.changedBy },
        { key: 'apiGravityChangeReason', value: update.reason }
      ]
    );
  }

  /**
   * Carga historial de cambios de API Gravity
   * Simplificado: retorna array vacío por ahora
   */
  loadApiGravityHistory(ctx: WidgetContext, tankAssetId: string, startTs: number, endTs: number, limit?: number): Observable<ApiGravityUpdate[]> {
    // Por ahora retornamos array vacío
    // En el futuro se puede implementar guardando en telemetría
    return of([]);
  }

  // ==================== AFOROS MANUALES ====================

  /**
   * Guarda un registro de aforo manual
   */
  saveManualGauging(ctx: WidgetContext, tankAssetId: string, record: ManualGaugingRecord): Observable<any> {
    // Guardar en atributos (último registro)
    return ctx.attributeService.saveEntityAttributes(
      this.toEntityId(tankAssetId),
      AttributeScope.SERVER_SCOPE,
      [
        { key: 'lastManualGauging', value: JSON.stringify(record) },
        { key: 'lastManualGaugingDate', value: record.timestamp.toISOString() },
        { key: 'lastManualGaugingOperator', value: record.operator }
      ]
    );
  }

  /**
   * Carga historial de aforos manuales
   * Simplificado: retorna array vacío por ahora
   */
  loadManualGaugingHistory(ctx: WidgetContext, tankAssetId: string, startTs: number, endTs: number, limit?: number): Observable<ManualGaugingRecord[]> {
    // Por ahora retornamos array vacío
    // En el futuro se puede implementar guardando en telemetría
    return of([]);
  }

  /**
   * Aprueba un registro de aforo manual
   */
  approveGauging(ctx: WidgetContext, tankAssetId: string, gaugingId: string, approvedBy: string): Observable<any> {
    // Por ahora retornamos success
    return of({ success: true });
  }

  // ==================== MANTENIMIENTO ====================

  /**
   * Guarda un registro de mantenimiento
   */
  saveMaintenanceRecord(ctx: WidgetContext, tankAssetId: string, record: MaintenanceRecord): Observable<any> {
    return ctx.attributeService.saveEntityAttributes(
      this.toEntityId(tankAssetId),
      AttributeScope.SERVER_SCOPE,
      [
        { key: 'lastMaintenance', value: JSON.stringify(record) },
        { key: 'lastMaintenanceDate', value: record.timestamp.toISOString() },
        { key: 'lastMaintenanceType', value: record.maintenanceType }
      ]
    );
  }

  /**
   * Carga historial de mantenimiento
   */
  loadMaintenanceHistory(ctx: WidgetContext, tankAssetId: string, startTs: number, endTs: number, limit?: number): Observable<MaintenanceRecord[]> {
    // Por ahora retornamos array vacío
    return of([]);
  }

  // ==================== PERMISOS ====================

  /**
   * Verifica si el usuario es supervisor
   */
  isSupervisor(ctx: WidgetContext): boolean {
    const user = ctx.currentUser;
    if (!user) return false;

    // Verificar si tiene authority de TENANT_ADMIN
    return user.authority === 'TENANT_ADMIN';
  }

  /**
   * Verifica si el usuario puede editar
   */
  canEdit(ctx: WidgetContext): boolean {
    return !!ctx.currentUser;
  }
}
