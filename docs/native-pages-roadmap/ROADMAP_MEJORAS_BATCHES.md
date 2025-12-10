# Roadmap de Mejoras - Sistema de Batches

**Fecha:** 10 de diciembre de 2025
**Versión:** 1.0
**Basado en:** Análisis de funcionalidades de TankMaster y sistema actual GDT

---

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Mejoras Priorizadas](#mejoras-priorizadas)
3. [FASE 2.5: Mejoras Críticas de Batches](#fase-25-mejoras-críticas-de-batches)
4. [FASE 3.5: Automatización Avanzada](#fase-35-automatización-avanzada)
5. [Cronograma y Recursos](#cronograma-y-recursos)
6. [Criterios de Aceptación](#criterios-de-aceptación)
7. [Plan de Implementación Detallado](#plan-de-implementación-detallado)

---

## Resumen Ejecutivo

### Situación Actual

El sistema de batches implementado en GDT tiene:
- ✅ **Estructura de datos correcta y completa**
- ✅ **Cálculos volumétricos funcionando** (TOV, GOV, GSV, NSV)
- ✅ **Generación de PDFs profesional** con QR y firma digital
- ❌ **PROBLEMA:** Requiere ingreso manual de nivel cuando el sistema **ya tiene captura automática desde radares**

### Problema Identificado

```
ACTUAL (Incorrecto):
Usuario: "Crear batch"
Sistema: "Ingrese el nivel manualmente"  ❌
Operador: Mira la pantalla → ve nivel 8,320 mm → lo transcribe manualmente

CORRECTO (TankMaster):
Usuario: "Crear batch"
Sistema: "Capturando datos automáticos desde radar..." ⚡
Sistema: "Nivel: 8,320 mm, Temp: 20°C, TOV: 10,500 bbl"
Usuario: "Confirmar ✓"
```

### Impacto del Problema

| Aspecto | Impacto |
|---------|---------|
| **Errores humanos** | Alto - Transcripción incorrecta |
| **Seguridad** | Medio - Operador no necesita estar cerca del tanque |
| **Cumplimiento** | Alto - No cumple API MPMS 18.2 completamente |
| **Eficiencia** | Medio - Trabajo duplicado innecesario |
| **Precisión** | Alto - Timestamps no sincronizados |

### Solución Propuesta

Implementar **FASE 2.5: Mejoras Críticas de Batches** con 3 sprints:

1. **Sprint 1:** Captura automática de gauges (1 semana)
2. **Sprint 2:** Batch desde rango de fechas (1 semana)
3. **Sprint 3:** Sistema de recálculo robusto (1 semana)

**Total:** 3 semanas con 1 desarrollador

---

## Mejoras Priorizadas

### Matriz de Priorización

```
                    IMPACTO

    Alto    │ 🔴 1. Captura Auto │ 🟠 4. Recálculo    │
            │ 🔴 2. Validación   │ 🟠 3. Rango Fechas │
            ├────────────────────┼────────────────────┤
    Medio   │ 🟡 5. Detección    │ 🟡 6. Lab Integration│
            │    Movimiento      │                    │
            └────────────────────┴────────────────────┘
                Bajo                Alto
                    COMPLEJIDAD
```

### Lista Priorizada

| # | Mejora | Prioridad | Story Points | Días | Sprint |
|---|--------|-----------|--------------|------|--------|
| 1 | Captura automática de gauges | 🔴 Crítica | 13 | 3-4 | Sprint 1 |
| 2 | Validación de estado del tanque | 🔴 Crítica | 8 | 2 | Sprint 1 |
| 3 | Batch desde rango de fechas | 🟠 Alta | 13 | 4-5 | Sprint 2 |
| 4 | Sistema de recálculo robusto | 🟠 Alta | 21 | 5-6 | Sprint 3 |
| 5 | Detección automática de movimiento | 🟡 Media | 13 | 5 | Sprint 4 |
| 6 | Integración con laboratorio | 🟡 Media | 13 | 5 | Sprint 5 |

---

## FASE 2.5: Mejoras Críticas de Batches

**Duración:** 3 semanas
**Story Points:** 42
**Objetivo:** Transformar el sistema de batches para usar captura automática

---

### Sprint 1: Captura Automática (1 semana)

#### Epic 1.1: Captura Automática de Opening Gauge

**Objetivo:** Eliminar ingreso manual de nivel, capturar desde telemetría

##### Tarea 1.1.1: Service de Captura Automática

**Descripción:** Crear servicio para capturar snapshot de telemetría actual

**Archivos a crear:**
- `batch-gauge-capture.service.ts`

**Funcionalidades:**
```typescript
class BatchGaugeCaptureService {
  // Capturar gauge actual desde telemetría
  async captureCurrentGauge(tankId: string): Promise<GaugeSnapshot>

  // Capturar gauge histórico (timestamp específico)
  async captureHistoricalGauge(tankId: string, timestamp: number): Promise<GaugeSnapshot>

  // Validar disponibilidad de datos
  async validateDataAvailability(tankId: string): Promise<ValidationResult>
}
```

**Estimación:** 2 días

##### Tarea 1.1.2: Modificar Formulario de Creación

**Descripción:** Cambiar UI para mostrar datos automáticos en lugar de inputs manuales

**Archivos a modificar:**
- `batch-management/components/create-batch-dialog.component.ts`
- `batch-management/components/create-batch-dialog.component.html`

**Cambios UI:**
```
ANTES:
┌──────────────────────────────┐
│ Nivel inicial: [____] mm     │
│ Temperatura:   [____] °C     │
│ [Crear Batch]                │
└──────────────────────────────┘

DESPUÉS:
┌────────────────────────────────────┐
│ OPENING GAUGE (Automático)         │
│                                    │
│ ⚡ Nivel:     8,320.5 mm           │
│ ⚡ Temp:      20.1°C                │
│ ⚡ Presión:   1.013 bar             │
│ ⚡ API:       35.0°                 │
│                                    │
│ TOV: 10,500.25 bbl (calculado)     │
│ NSV: 10,400.50 bbl (calculado)     │
│                                    │
│ [✓] Confirmar y Crear Batch        │
│ [ ] Ajustar manualmente →          │
└────────────────────────────────────┘
```

**Estimación:** 2 días

##### Tarea 1.1.3: Integrar con Batch Service

**Descripción:** Modificar `batch.service.ts` para usar captura automática

**Archivos a modificar:**
- `shared/services/batch.service.ts`

**Cambios:**
```typescript
// ANTES
createBatch(params: {
  tankId: string;
  openingLevel: number;  // ❌ Manual
  openingTemp: number;   // ❌ Manual
}) { }

// DESPUÉS
async createBatch(params: {
  tankId: string;
  // NO SE PASA NIVEL/TEMP
  // Se captura automáticamente
}) {
  // Capturar opening gauge automáticamente
  const openingGauge = await this.gaugeCaptureService
    .captureCurrentGauge(params.tankId);

  // Crear batch con datos capturados
  const batch = {
    ...params,
    openingLevel: openingGauge.level,
    openingTemperature: openingGauge.temperature,
    // ... resto de datos del gauge
  };

  await this.saveBatch(batch);
}
```

**Estimación:** 1 día

##### Tarea 1.1.4: Captura Automática de Closing Gauge

**Descripción:** Implementar captura automática al cerrar batch

**Archivos a modificar:**
- `shared/services/batch.service.ts`
- `batch-management/components/close-batch-dialog.component.ts`

**Funcionalidad:**
```typescript
async closeBatch(batchId: string) {
  const batch = await this.getBatchById(batchId);

  // Capturar closing gauge automáticamente
  const closingGauge = await this.gaugeCaptureService
    .captureCurrentGauge(batch.tankId);

  // Calcular transferred
  const transferred = this.calculateTransferred(
    batch.openingNSV,
    closingGauge.nsv
  );

  // Actualizar batch
  batch.closingTime = closingGauge.timestamp;
  batch.closingLevel = closingGauge.level;
  // ... resto de datos
  batch.transferredNSV = transferred.nsv;
  batch.status = 'closed';

  await this.saveBatch(batch);
}
```

**Estimación:** 1 día

#### Epic 1.2: Validación de Estado del Tanque

**Objetivo:** Validar que el tanque está en condiciones adecuadas antes de crear batch

##### Tarea 1.2.1: Service de Validación

**Descripción:** Crear servicio para validar estado del tanque

**Archivos a crear:**
- `tank-state-validator.service.ts`

**Funcionalidades:**
```typescript
class TankStateValidator {
  // Validar si el tanque está apto para batch
  async validateTankState(tankId: string): Promise<ValidationResult> {
    // 1. Verificar comunicación con radar
    const radarStatus = await this.checkRadarCommunication(tankId);
    if (!radarStatus.ok) {
      return { valid: false, error: 'Radar communication lost' };
    }

    // 2. Verificar que hay telemetría reciente
    const lastTelemetry = await this.getLastTelemetryTimestamp(tankId);
    const age = Date.now() - lastTelemetry;
    if (age > 60000) { // 1 minuto
      return { valid: false, error: 'Telemetry data is stale' };
    }

    // 3. Verificar alarmas críticas
    const alarms = await this.getActiveAlarms(tankId);
    const critical = alarms.filter(a => a.severity === 'CRITICAL');
    if (critical.length > 0) {
      return { valid: false, error: `Critical alarms active: ${critical[0].type}` };
    }

    // 4. Detectar tipo de movimiento (opcional)
    const movement = await this.detectMovement(tankId);

    return {
      valid: true,
      tankState: {
        radarOk: true,
        telemetryAge: age,
        movement: movement.type, // 'idle', 'receiving', 'dispensing'
        suggestedBatchType: movement.type !== 'idle' ? movement.type : null
      }
    };
  }

  // Detectar movimiento básico
  private async detectMovement(tankId: string): Promise<MovementInfo> {
    // Obtener últimas 5 lecturas de nivel
    const levels = await this.getLast5Levels(tankId);

    // Calcular rate of change
    const rate = this.calculateRate(levels);

    if (Math.abs(rate) < 5) { // mm/h threshold
      return { type: 'idle', rate: 0 };
    }

    return {
      type: rate > 0 ? 'receiving' : 'dispensing',
      rate: Math.abs(rate)
    };
  }
}
```

**Estimación:** 2 días

##### Tarea 1.2.2: Integrar Validación en UI

**Descripción:** Mostrar estado del tanque antes de crear batch

**Archivos a modificar:**
- `create-batch-dialog.component.ts`

**UI:**
```
┌────────────────────────────────────┐
│ VALIDACIÓN DE TANQUE               │
│                                    │
│ ✓ Comunicación con radar: OK      │
│ ✓ Telemetría: Actualizada (5s)    │
│ ✓ Alarmas críticas: Ninguna       │
│ ⚠ Movimiento detectado: DISPENSING│
│                                    │
│ Se recomienda batch tipo:          │
│ → DISPENSING                       │
│                                    │
│ [Continuar con Creación]           │
└────────────────────────────────────┘
```

**Estimación:** 1 día

#### Testing Sprint 1

- Unit tests para `BatchGaugeCaptureService`
- Unit tests para `TankStateValidator`
- Integration tests para flujo completo de creación
- E2E test: Crear batch con captura automática

**Estimación:** 1 día

**Total Sprint 1:** 7 días (1 semana + 2 días)

---

### Sprint 2: Batch desde Rango de Fechas (1 semana)

#### Epic 2.1: Crear Batch Histórico

**Objetivo:** Permitir crear batches de operaciones pasadas usando telemetría histórica

##### Tarea 2.1.1: Service de Telemetría Histórica

**Descripción:** Servicio para buscar telemetría en timestamp específico

**Archivos a crear:**
- `historical-telemetry.service.ts`

**Funcionalidades:**
```typescript
class HistoricalTelemetryService {
  // Buscar telemetría en timestamp específico
  async getTelemetryAtTimestamp(
    tankId: string,
    timestamp: number,
    keys: string[],
    options?: { tolerance?: number } // milliseconds
  ): Promise<TelemetryData>

  // Verificar disponibilidad de datos en rango
  async checkDataAvailability(
    tankId: string,
    startTime: number,
    endTime: number
  ): Promise<AvailabilityResult>

  // Obtener resumen de período
  async getPeriodSummary(
    tankId: string,
    startTime: number,
    endTime: number
  ): Promise<PeriodSummary>
}
```

**Estimación:** 2 días

##### Tarea 2.1.2: UI de Selección de Rango de Fechas

**Descripción:** Componente para seleccionar inicio y fin del batch

**Archivos a crear:**
- `create-batch-historical-dialog.component.ts`
- `create-batch-historical-dialog.component.html`

**UI:**
```
┌────────────────────────────────────────────┐
│ CREAR BATCH DESDE HISTÓRICO                │
│                                            │
│ Tanque: [TK-102 - Diesel ▼]               │
│                                            │
│ Período de la operación:                   │
│ Inicio: [2025-12-10] [08:00:00] 📅        │
│ Fin:    [2025-12-10] [10:00:00] 📅        │
│                                            │
│ [Verificar Disponibilidad de Datos]        │
│                                            │
│ ✓ Datos disponibles                        │
│                                            │
│ PREVIEW:                                   │
│ ┌────────────────────────────────────┐    │
│ │ Opening (08:00):                   │    │
│ │   Nivel: 8,320 mm                  │    │
│ │   Temp:  20°C                      │    │
│ │   NSV:   10,400 bbl                │    │
│ │                                    │    │
│ │ Closing (10:00):                   │    │
│ │   Nivel: 7,120 mm                  │    │
│ │   Temp:  19°C                      │    │
│ │   NSV:   8,900 bbl                 │    │
│ │                                    │    │
│ │ Transferido: 1,500 bbl             │    │
│ └────────────────────────────────────┘    │
│                                            │
│ Tipo: ⦿ Dispensing  ○ Receiving           │
│                                            │
│ [Crear Batch Histórico]                    │
└────────────────────────────────────────────┘
```

**Estimación:** 3 días

##### Tarea 2.1.3: Lógica de Creación de Batch Histórico

**Descripción:** Implementar creación de batch con datos históricos

**Archivos a modificar:**
- `shared/services/batch.service.ts`

**Funcionalidad:**
```typescript
async createBatchFromDateRange(params: {
  tankId: string;
  startTime: number;
  endTime: number;
  batchType: 'receiving' | 'dispensing';
  metadata: BatchMetadata;
}): Promise<Batch> {

  // 1. Validar disponibilidad de datos
  const availability = await this.historicalTelemetry
    .checkDataAvailability(params.tankId, params.startTime, params.endTime);

  if (!availability.available) {
    throw new Error(`No data available for time range`);
  }

  // 2. Capturar opening gauge (startTime)
  const openingGauge = await this.gaugeCaptureService
    .captureHistoricalGauge(params.tankId, params.startTime);

  // 3. Capturar closing gauge (endTime)
  const closingGauge = await this.gaugeCaptureService
    .captureHistoricalGauge(params.tankId, params.endTime);

  // 4. Calcular transferred
  const transferred = this.calculateTransferred(
    openingGauge.nsv,
    closingGauge.nsv
  );

  // 5. Crear batch (ya cerrado)
  const batch: Batch = {
    id: this.generateBatchId(),
    batchNumber: this.generateBatchNumber(),
    tankId: params.tankId,
    batchType: params.batchType,
    status: 'closed', // Histórico siempre cerrado

    // Opening
    openingTime: params.startTime,
    ...openingGauge,

    // Closing
    closingTime: params.endTime,
    ...closingGauge,

    // Transferred
    transferredNSV: transferred.nsv,
    transferredMass: transferred.mass,
    transferredWIA: transferred.wia,

    // Metadata
    ...params.metadata,
    notes: `Historical batch created from ${new Date(params.startTime)} to ${new Date(params.endTime)}`,

    createdAt: Date.now(),
    closedAt: params.endTime
  };

  await this.saveBatch(batch);

  // 6. Generar PDF
  await this.batchPdfService.generateBatchPdf(batch);

  return batch;
}
```

**Estimación:** 2 días

#### Testing Sprint 2

- Unit tests para `HistoricalTelemetryService`
- Integration tests para batch histórico
- E2E test: Crear batch desde rango de fechas

**Estimación:** 1 día

**Total Sprint 2:** 6 días (1 semana + 1 día)

---

### Sprint 3: Recálculo Robusto (1 semana)

#### Epic 3.1: Sistema de Recálculo

**Objetivo:** Permitir recalcular batches cerrados con nuevos parámetros de laboratorio

##### Tarea 3.1.1: Service de Recálculo

**Descripción:** Implementar lógica de recálculo de batches

**Archivos a crear:**
- `batch-recalculation.service.ts`

**Funcionalidades:**
```typescript
class BatchRecalculationService {
  // Recalcular batch con nuevos valores
  async recalculateBatch(params: {
    batchId: string;
    reason: string;
    updatedValues: {
      openingTemperature?: number;
      openingApiGravity?: number;
      openingBsw?: number;
      closingTemperature?: number;
      closingApiGravity?: number;
      closingBsw?: number;
    };
    recalculatedBy: string;
  }): Promise<Batch>

  // Comparar batch original vs recalculado
  async compareBatches(
    originalBatch: Batch,
    recalculatedBatch: Batch
  ): Promise<ComparisonResult>

  // Obtener historial de recálculos
  async getRecalculationHistory(batchId: string): Promise<RecalculationHistory[]>
}
```

**Estimación:** 3 días

##### Tarea 3.1.2: UI de Recálculo

**Descripción:** Dialog para recalcular batch

**Archivos a crear:**
- `recalculate-batch-dialog.component.ts`
- `recalculate-batch-dialog.component.html`

**UI:**
```
┌──────────────────────────────────────────────────────┐
│ RECALCULAR BATCH: BATCH-2025-001                     │
│                                                      │
│ Razón del recálculo:                                 │
│ ⦿ Actualizar API Gravity de laboratorio             │
│ ○ Actualizar temperatura                            │
│ ○ Corregir error                                     │
│ ○ Otro: [____________________________]               │
│                                                      │
│ VALORES ACTUALIZADOS:                                │
│                                                      │
│ Opening Gauge:                                       │
│ ┌────────────────────────────────────┐              │
│ │ Parámetro       │ Original │ Nuevo │              │
│ ├────────────────────────────────────┤              │
│ │ Temperatura     │ 20.0°C   │[20.5]│              │
│ │ API Gravity     │ 35.0°    │[35.2]│              │
│ │ BS&W            │ 0.5%     │[0.4] │              │
│ └────────────────────────────────────┘              │
│                                                      │
│ Closing Gauge:                                       │
│ ┌────────────────────────────────────┐              │
│ │ Parámetro       │ Original │ Nuevo │              │
│ ├────────────────────────────────────┤              │
│ │ Temperatura     │ 19.0°C   │[19.5]│              │
│ │ API Gravity     │ 35.0°    │[35.2]│              │
│ │ BS&W            │ 0.5%     │[0.4] │              │
│ └────────────────────────────────────┘              │
│                                                      │
│ [Calcular Nuevo Volumen]                             │
│                                                      │
│ COMPARACIÓN:                                         │
│ ┌────────────────────────────────────┐              │
│ │             │ Original  │ Recalc.  │              │
│ ├────────────────────────────────────┤              │
│ │ NSV         │ 1,500 bbl │ 1,485 bbl│              │
│ │ Masa        │ 210 ton   │ 208 ton  │              │
│ │ Diferencia  │           │ -15 bbl  │              │
│ └────────────────────────────────────┘              │
│                                                      │
│ ⚠ Se generará nuevo PDF con marca "RECALCULATED"    │
│ ⚠ El PDF original se mantendrá disponible           │
│                                                      │
│ [Cancelar]  [Recalcular y Generar PDF]              │
└──────────────────────────────────────────────────────┘
```

**Estimación:** 2 días

##### Tarea 3.1.3: Generación de PDF con Watermark

**Descripción:** Generar PDF con watermark "RECALCULATED"

**Archivos a modificar:**
- `batch-pdf.service.ts` (frontend)
- `GdtBatchPdfService.java` (backend)

**Funcionalidad:**
```typescript
// Frontend
async generateRecalculatedPdf(batch: Batch): Promise<Blob> {
  const pdf = await this.generateBatchPdf(batch);

  // Agregar watermark diagonal
  this.addWatermark(pdf, 'RECALCULATED');

  // Agregar nota de recálculo
  this.addRecalculationNote(pdf, {
    originalDate: batch.closedAt,
    recalculatedDate: batch.recalculatedAt,
    reason: batch.recalculationReason
  });

  return pdf.output('blob');
}
```

**Estimación:** 1 día

##### Tarea 3.1.4: Audit Trail de Recálculos

**Descripción:** Registrar todos los recálculos en audit trail

**Archivos a modificar:**
- `batch-recalculation.service.ts`
- `audit.service.ts`

**Funcionalidad:**
```typescript
// Registrar recálculo en audit trail
await this.auditService.logEvent('BATCH_RECALCULATED', {
  batchId: batch.id,
  batchNumber: batch.batchNumber,
  recalculatedBy: user.name,
  reason: params.reason,
  changes: {
    openingApiGravity: {
      from: originalBatch.openingApiGravity,
      to: recalculatedBatch.openingApiGravity
    },
    // ... otros cambios
  },
  volumeImpact: {
    nsvDifference: recalculatedBatch.transferredNSV - originalBatch.transferredNSV,
    massDifference: recalculatedBatch.transferredMass - originalBatch.transferredMass
  },
  timestamp: Date.now()
});
```

**Estimación:** 1 día

#### Testing Sprint 3

- Unit tests para `BatchRecalculationService`
- Integration tests para recálculo completo
- E2E test: Recalcular batch y verificar PDF

**Estimación:** 1 día

**Total Sprint 3:** 6 días (1 semana + 1 día)

---

## FASE 3.5: Automatización Avanzada

**Duración:** 2 semanas
**Story Points:** 26
**Objetivo:** Automatización completa con detección de movimiento e integración con laboratorio

---

### Sprint 4: Detección de Movimiento (1 semana)

#### Epic 4.1: Detección Automática de Movimiento

**Objetivo:** Detectar automáticamente inicio de operaciones y sugerir creación de batch

##### Tarea 4.1.1: Service de Detección de Movimiento

**Descripción:** Servicio para detectar movimiento de producto en tanques

**Archivos a crear:**
- `movement-detection.service.ts`

**Funcionalidades:**
```typescript
class MovementDetectionService {
  // Observar nivel de tanque y detectar movimiento
  detectMovement(tankId: string): Observable<MovementEvent> {
    return this.telemetryService.observeTelemetry(tankId, 'level').pipe(
      bufferCount(5, 1),
      map(levels => this.calculateRate(levels)),
      map(rate => this.classifyMovement(rate)),
      distinctUntilChanged((a, b) => a.status === b.status),
      filter(event => event.status === 'active'),
      tap(event => this.logMovementEvent(event))
    );
  }

  // Sugerir creación de batch
  suggestBatchCreation(movementEvent: MovementEvent): BatchSuggestion {
    return {
      suggested: true,
      tankId: movementEvent.tankId,
      batchType: movementEvent.movement,
      confidence: this.calculateConfidence(movementEvent),
      estimatedDuration: this.estimateDuration(movementEvent),
      message: `${movementEvent.movement} detected. Create batch?`
    };
  }
}
```

**Estimación:** 3 días

##### Tarea 4.1.2: UI de Sugerencia de Batch

**Descripción:** Notificación para sugerir creación de batch

**Archivos a crear:**
- `batch-suggestion-notification.component.ts`

**UI:**
```
┌─────────────────────────────────────────┐
│ 🔔 MOVIMIENTO DETECTADO                 │
│                                         │
│ Tanque: TK-102                          │
│ Tipo: DISPENSING                        │
│ Rate: 120 bbl/h                         │
│                                         │
│ ¿Desea crear un batch para             │
│ esta operación?                         │
│                                         │
│ [Sí, Crear Batch]  [No]  [Después]     │
└─────────────────────────────────────────┘
```

**Estimación:** 2 días

#### Testing Sprint 4

- Unit tests para `MovementDetectionService`
- Integration tests para detección en vivo
- E2E test: Detectar movimiento y crear batch

**Estimación:** 1 día

**Total Sprint 4:** 6 días (1 semana + 1 día)

---

### Sprint 5: Integración con Laboratorio (1 semana)

#### Epic 5.1: Vincular Resultados de Lab con Batches

**Objetivo:** Actualizar batches automáticamente con resultados de laboratorio

##### Tarea 5.1.1: Service de Asociación Lab-Batch

**Descripción:** Vincular resultados de laboratorio con batches

**Archivos a crear:**
- `lab-batch-integration.service.ts`

**Funcionalidades:**
```typescript
class LabBatchIntegrationService {
  // Asociar resultado de lab con batch
  async associateLabResultWithBatch(
    labResult: LabResult
  ): Promise<Association>

  // Detectar variación significativa
  async detectVariance(
    batch: Batch,
    labResult: LabResult
  ): Promise<VarianceAnalysis>

  // Sugerir recálculo si hay variación
  async suggestRecalculation(
    batch: Batch,
    labResult: LabResult
  ): Promise<RecalculationSuggestion>
}
```

**Estimación:** 3 días

##### Tarea 5.1.2: UI de Notificación de Variación

**Descripción:** Notificar al operador si hay diferencia entre batch y lab

**UI:**
```
┌─────────────────────────────────────────────┐
│ ⚠ VARIACIÓN DETECTADA                       │
│                                             │
│ Resultado de laboratorio para TK-102:       │
│ API Gravity: 35.2°                          │
│                                             │
│ Batch BATCH-2025-001 usó:                   │
│ API Gravity: 35.0°                          │
│                                             │
│ Diferencia: +0.2° (significativa)           │
│                                             │
│ ¿Desea recalcular el batch con el          │
│ valor actualizado de laboratorio?           │
│                                             │
│ Impacto estimado: -15 bbl                   │
│                                             │
│ [Recalcular Batch]  [Ignorar]  [Ver Más]   │
└─────────────────────────────────────────────┘
```

**Estimación:** 2 días

#### Testing Sprint 5

- Unit tests para `LabBatchIntegrationService`
- Integration tests para flujo completo
- E2E test: Lab result → Detección → Recálculo

**Estimación:** 1 día

**Total Sprint 5:** 6 días (1 semana + 1 día)

---

## Cronograma y Recursos

### Cronograma Visual

```
FASE 2.5 - MEJORAS CRÍTICAS (3 semanas)
───────────────────────────────────────
Semana 1     Semana 2     Semana 3
Sprint 1     Sprint 2     Sprint 3
┌─────┐     ┌─────┐     ┌─────┐
│  🔴 │     │  🟠 │     │  🟠 │
│Auto │────▶│Rango│────▶│Recal│
│Capt │     │Fecha│     │culo │
└─────┘     └─────┘     └─────┘

FASE 3.5 - AUTOMATIZACIÓN (2 semanas)
──────────────────────────────────────
Semana 4          Semana 5
Sprint 4          Sprint 5
┌─────┐          ┌─────┐
│  🟡 │          │  🟡 │
│Detec│─────────▶│  Lab│
│Move │          │Integ│
└─────┘          └─────┘
```

### Estimación Detallada

| Sprint | Duración | Story Points | Tareas | Prioridad |
|--------|----------|--------------|--------|-----------|
| Sprint 1: Captura Auto | 1 semana | 13 | 5 | 🔴 Crítica |
| Sprint 2: Rango Fechas | 1 semana | 13 | 4 | 🟠 Alta |
| Sprint 3: Recálculo | 1 semana | 21 | 5 | 🟠 Alta |
| Sprint 4: Detección | 1 semana | 13 | 3 | 🟡 Media |
| Sprint 5: Lab Integration | 1 semana | 13 | 3 | 🟡 Media |
| **TOTAL** | **5 semanas** | **73 SP** | **20 tareas** | |

### Recursos Necesarios

**Equipo:**
- 1× Senior Frontend Developer (Angular/TypeScript)
- 0.5× Backend Developer (para ajustes en servicios de telemetría)
- 0.3× QA Engineer (testing)

**Total FTE:** 1.8 personas

**Infraestructura:**
- Acceso a ThingsBoard API
- Acceso a telemetría histórica (Cassandra/PostgreSQL)
- Ambiente de pruebas con datos reales de tanques

---

## Criterios de Aceptación

### Sprint 1: Captura Automática

- [ ] Al crear batch, el sistema captura nivel automáticamente desde telemetría
- [ ] Al crear batch, el sistema captura temperatura automáticamente
- [ ] UI muestra datos capturados con indicador "⚡ Automático"
- [ ] Existe opción de override manual (modo API 18.1)
- [ ] Sistema valida estado del tanque antes de permitir creación
- [ ] Validación incluye: comunicación radar, alarmas, telemetría reciente
- [ ] Closing gauge también se captura automáticamente
- [ ] Timestamps de opening y closing son exactos
- [ ] Tests unitarios y E2E pasan

### Sprint 2: Rango de Fechas

- [ ] Usuario puede crear batch histórico con rango de fechas
- [ ] Sistema busca telemetría en timestamps especificados
- [ ] UI muestra preview de opening y closing gauge antes de crear
- [ ] Sistema valida disponibilidad de datos históricos
- [ ] Si no hay datos, muestra error claro
- [ ] Batch histórico se crea con status 'closed'
- [ ] PDF se genera automáticamente para batch histórico
- [ ] Tests pasan

### Sprint 3: Recálculo

- [ ] Usuario puede recalcular batch cerrado
- [ ] Dialog permite actualizar: temperatura, API gravity, BS&W
- [ ] Sistema muestra comparación original vs recalculado
- [ ] Nuevo PDF se genera con watermark "RECALCULATED"
- [ ] PDF original permanece disponible
- [ ] Audit trail registra razón, cambios e impacto
- [ ] Status del batch cambia a 'recalculated'
- [ ] Tests pasan

### Sprint 4: Detección de Movimiento

- [ ] Sistema detecta automáticamente inicio de movimiento
- [ ] Clasificación correcta: receiving, dispensing, idle
- [ ] Notificación sugiere creación de batch
- [ ] Usuario puede aceptar o rechazar sugerencia
- [ ] Rate of change se calcula correctamente
- [ ] No hay falsos positivos en tanques estables
- [ ] Tests pasan

### Sprint 5: Integración Lab

- [ ] Resultado de lab se asocia automáticamente con batch relevante
- [ ] Sistema detecta variación entre batch y lab
- [ ] Notificación informa al operador de variación significativa
- [ ] Usuario puede recalcular desde notificación
- [ ] Threshold de variación es configurable
- [ ] Tests pasan

---

## Plan de Implementación Detallado

### Semana 1: Sprint 1 - Captura Automática

**Lunes:**
- Kickoff meeting
- Setup de branch: `feature/batch-improvements-sprint-1`
- Tarea 1.1.1: Crear `BatchGaugeCaptureService`
- Implementar `captureCurrentGauge()`

**Martes:**
- Continuar Tarea 1.1.1
- Implementar `captureHistoricalGauge()`
- Unit tests para service

**Miércoles:**
- Tarea 1.1.2: Modificar UI de creación
- Cambiar formulario manual → vista de confirmación automática
- Integrar con `BatchGaugeCaptureService`

**Jueves:**
- Tarea 1.1.3: Modificar `batch.service.ts`
- Actualizar método `createBatch()`
- Tarea 1.1.4: Implementar captura de closing gauge

**Viernes:**
- Tarea 1.2.1: Crear `TankStateValidator`
- Tarea 1.2.2: Integrar validación en UI
- Code review
- Testing E2E
- Merge a develop

---

### Semana 2: Sprint 2 - Rango de Fechas

**Lunes:**
- Sprint planning
- Branch: `feature/batch-improvements-sprint-2`
- Tarea 2.1.1: Crear `HistoricalTelemetryService`

**Martes:**
- Continuar Tarea 2.1.1
- Implementar búsqueda de telemetría con tolerancia
- Unit tests

**Miércoles:**
- Tarea 2.1.2: UI de selección de fechas
- Componente `create-batch-historical-dialog`
- Implementar date pickers

**Jueves:**
- Continuar Tarea 2.1.2
- Implementar preview de datos
- Tarea 2.1.3: Lógica de creación de batch histórico

**Viernes:**
- Continuar Tarea 2.1.3
- Testing E2E
- Code review
- Merge a develop

---

### Semana 3: Sprint 3 - Recálculo

**Lunes:**
- Sprint planning
- Branch: `feature/batch-improvements-sprint-3`
- Tarea 3.1.1: Crear `BatchRecalculationService`

**Martes:**
- Continuar Tarea 3.1.1
- Implementar lógica de comparación
- Unit tests

**Miércoles:**
- Tarea 3.1.2: UI de recálculo
- Dialog con inputs para nuevos valores
- Tabla de comparación

**Jueves:**
- Tarea 3.1.3: PDF con watermark
- Actualizar `batch-pdf.service.ts`
- Tarea 3.1.4: Audit trail

**Viernes:**
- Testing E2E completo de FASE 2.5
- Code review final
- Merge a develop
- Deploy a staging

---

### Semana 4: Sprint 4 - Detección Movimiento

**Lunes:**
- Sprint planning (FASE 3.5)
- Branch: `feature/batch-improvements-sprint-4`
- Tarea 4.1.1: Crear `MovementDetectionService`

**Martes-Miércoles:**
- Continuar Tarea 4.1.1
- Implementar detección con RxJS
- Ajustar thresholds
- Unit tests

**Jueves:**
- Tarea 4.1.2: UI de sugerencia
- Notificación toast
- Integración con sistema de notificaciones

**Viernes:**
- Testing
- Code review
- Merge

---

### Semana 5: Sprint 5 - Integración Lab

**Lunes:**
- Sprint planning
- Branch: `feature/batch-improvements-sprint-5`
- Tarea 5.1.1: `LabBatchIntegrationService`

**Martes-Miércoles:**
- Continuar Tarea 5.1.1
- Implementar detección de varianza
- Lógica de asociación

**Jueves:**
- Tarea 5.1.2: UI de notificación de variación
- Dialog de confirmación de recálculo

**Viernes:**
- Testing E2E completo
- Code review final
- Merge a develop
- Deploy a staging
- Demo a stakeholders
- Retrospective

---

## Resumen Final

### Impacto Esperado

**Antes de Mejoras:**
- ❌ Ingreso manual de nivel (errores)
- ❌ No cumple API MPMS 18.2
- ❌ Trabajo duplicado
- ❌ No hay batches históricos
- ❌ Recálculo limitado

**Después de Mejoras:**
- ✅ Captura automática desde radares
- ✅ Cumple API MPMS 18.2 completamente
- ✅ Mayor precisión y seguridad
- ✅ Batches históricos disponibles
- ✅ Recálculo robusto con audit trail
- ✅ Detección automática de operaciones
- ✅ Integración con laboratorio

### Métricas de Éxito

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tiempo de creación de batch | 5 min | 1 min | -80% |
| Errores de transcripción | ~5% | <0.1% | -98% |
| Cumplimiento API 18.2 | Parcial | Completo | 100% |
| Batches históricos | No | Sí | N/A |
| Recálculos por año | ~10 | ~50+ | Facilita operación |

### ROI Estimado

**Inversión:**
- 5 semanas de desarrollo
- ~$15,000 USD en salarios

**Retorno:**
- Reducción de errores: $5,000/año
- Tiempo ahorrado: $8,000/año
- Mejor cumplimiento: Invaluable

**Break-even:** 1.5 años

---

**Fin del Roadmap de Mejoras**

**Contacto:** Para preguntas o para comenzar implementación, contactar al equipo de desarrollo GDT.
