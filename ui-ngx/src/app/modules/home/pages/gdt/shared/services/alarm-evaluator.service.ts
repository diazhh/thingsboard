import { Injectable } from '@angular/core';
import { TankData } from '../models/tank-data.model';
import { Alarm } from '../models/alarm.model';

@Injectable()
export class AlarmEvaluatorService {

  /**
   * Evalúa todas las alarmas basadas en el nivel actual del tanque
   */
  evaluate(tankData: TankData): Alarm[] {
    const alarms: Alarm[] = [];

    if (!tankData || !tankData.alarmLevels) {
      return alarms;
    }

    const currentLevel = tankData.levelMeters || 0;
    const { hh, h, l, ll } = tankData.alarmLevels;

    // High-High (crítico) - Máxima prioridad
    if (currentLevel >= hh) {
      alarms.push({
        type: 'HH',
        level: hh,
        message: `Level at ${currentLevel.toFixed(2)}m exceeds HIGH-HIGH limit (${hh.toFixed(2)}m)`,
        severity: 'critical',
        timestamp: new Date(),
        active: true
      });
    }
    // High (warning)
    else if (currentLevel >= h) {
      alarms.push({
        type: 'H',
        level: h,
        message: `Level at ${currentLevel.toFixed(2)}m exceeds HIGH limit (${h.toFixed(2)}m)`,
        severity: 'warning',
        timestamp: new Date(),
        active: true
      });
    }

    // Low (warning)
    if (currentLevel <= l && currentLevel > ll) {
      alarms.push({
        type: 'L',
        level: l,
        message: `Level at ${currentLevel.toFixed(2)}m below LOW limit (${l.toFixed(2)}m)`,
        severity: 'warning',
        timestamp: new Date(),
        active: true
      });
    }
    // Low-Low (crítico)
    else if (currentLevel <= ll) {
      alarms.push({
        type: 'LL',
        level: ll,
        message: `Level at ${currentLevel.toFixed(2)}m below LOW-LOW limit (${ll.toFixed(2)}m)`,
        severity: 'critical',
        timestamp: new Date(),
        active: true
      });
    }

    return alarms;
  }

  /**
   * Determina el nivel de alarma actual (el más crítico)
   */
  getCurrentLevel(tankData: TankData): 'none' | 'low' | 'high' | 'critical' {
    if (!tankData || !tankData.activeAlarms || tankData.activeAlarms.length === 0) {
      return 'none';
    }

    const alarms = tankData.activeAlarms;

    // Verificar alarmas críticas primero
    if (alarms.some(a => a.severity === 'critical' && a.active)) {
      return 'critical';
    }

    // Verificar alarmas de warning
    if (alarms.some(a => a.severity === 'warning' && a.active)) {
      return 'high';
    }

    return 'none';
  }

  /**
   * Obtiene el color asociado a un nivel de alarma
   */
  getAlarmColor(level: 'none' | 'low' | 'high' | 'critical'): string {
    switch(level) {
      case 'critical':
        return '#F44336'; // Rojo
      case 'high':
        return '#FFC107'; // Amarillo
      case 'low':
        return '#2196F3'; // Azul
      case 'none':
      default:
        return '#4CAF50'; // Verde
    }
  }

  /**
   * Verifica si hay alarmas activas
   */
  hasActiveAlarms(tankData: TankData): boolean {
    return tankData?.activeAlarms?.some(a => a.active) || false;
  }

  /**
   * Obtiene solo las alarmas críticas activas
   */
  getCriticalAlarms(tankData: TankData): Alarm[] {
    if (!tankData || !tankData.activeAlarms) {
      return [];
    }
    return tankData.activeAlarms.filter(a => a.severity === 'critical' && a.active);
  }

  /**
   * Obtiene solo las alarmas de warning activas
   */
  getWarningAlarms(tankData: TankData): Alarm[] {
    if (!tankData || !tankData.activeAlarms) {
      return [];
    }
    return tankData.activeAlarms.filter(a => a.severity === 'warning' && a.active);
  }

  /**
   * Formatea el mensaje de alarma para mostrar al usuario
   */
  formatAlarmMessage(alarm: Alarm): string {
    const timestamp = alarm.timestamp ? alarm.timestamp.toLocaleTimeString() : '';
    return `[${timestamp}] ${alarm.type}: ${alarm.message}`;
  }

  /**
   * Determina si el tanque está en estado seguro (nivel entre L y H)
   */
  isSafeLevel(tankData: TankData): boolean {
    if (!tankData || !tankData.alarmLevels) {
      return false;
    }

    const currentLevel = tankData.levelMeters || 0;
    const { h, l } = tankData.alarmLevels;

    return currentLevel > l && currentLevel < h;
  }

  /**
   * Calcula la distancia al próximo nivel de alarma
   */
  getDistanceToNextAlarm(tankData: TankData): { type: string; distance: number; direction: 'up' | 'down' } | null {
    if (!tankData || !tankData.alarmLevels) {
      return null;
    }

    const currentLevel = tankData.levelMeters || 0;
    const { hh, h, l, ll } = tankData.alarmLevels;

    // Si está subiendo
    if (currentLevel < h) {
      return {
        type: 'H',
        distance: h - currentLevel,
        direction: 'up'
      };
    } else if (currentLevel >= h && currentLevel < hh) {
      return {
        type: 'HH',
        distance: hh - currentLevel,
        direction: 'up'
      };
    }

    // Si está bajando
    if (currentLevel > l && currentLevel <= h) {
      return {
        type: 'L',
        distance: currentLevel - l,
        direction: 'down'
      };
    } else if (currentLevel > ll && currentLevel <= l) {
      return {
        type: 'LL',
        distance: currentLevel - ll,
        direction: 'down'
      };
    }

    return null;
  }
}
