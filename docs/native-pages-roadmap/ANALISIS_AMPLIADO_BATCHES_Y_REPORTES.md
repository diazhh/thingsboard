# Análisis Ampliado - Batches Manuales y Sistema de Reportes

**Fecha:** 10 de diciembre de 2025
**Versión:** 1.0
**Complemento de:** ANALISIS_FUNCIONALIDADES_BATCHES.md

---

## Índice

1. [Introducción](#introducción)
2. [Soporte para Batches Manuales (API MPMS 18.1)](#soporte-para-batches-manuales-api-mpms-181)
3. [Análisis del Sistema de Reportes](#análisis-del-sistema-de-reportes)
4. [Integración Batches-Reportes](#integración-batches-reportes)
5. [Mejoras Propuestas para Reportes](#mejoras-propuestas-para-reportes)
6. [Roadmap Actualizado](#roadmap-actualizado)

---

## Introducción

Este documento extiende el análisis previo para incluir dos áreas críticas que faltaban:

1. **Batches Manuales (API MPMS 18.1):** Casos donde la telemetría es errónea o el tanque no tiene radar
2. **Sistema de Reportes:** Análisis de los 25 tipos de reportes especificados

### Contexto de Batches Manuales

Tienes razón en que **debemos manejar batches manuales**. Hay escenarios donde la captura automática no es posible o confiable:

❌ **Casos que requieren ingreso manual:**
- Radar sin comunicación (fallo de hardware)
- Telemetría errónea o poco confiable
- Tanque sin instrumentación (instalación nueva/temporal)
- Operaciones en campo remoto sin ATG
- Medición manual de verificación (regulatory compliance)
- Discrepancia entre automático y manual que requiere override

✅ **La solución correcta:**
- **Priorizar captura automática** (API MPMS 18.2)
- **Permitir override manual** como opción explícita (API MPMS 18.1)
- **Marcar claramente** el método de captura en el batch
- **Audit trail** de decisión manual vs automática

---

## Soporte para Batches Manuales (API MPMS 18.1)

### Comparación de Estándares

| Aspecto | API MPMS 18.1 (Manual) | API MPMS 18.2 (Automático) |
|---------|------------------------|----------------------------|
| **Método de captura** | Manual con cinta métrica | Radar, GWR, servo gauge |
| **Nivel** | Medido manualmente | Capturado desde sensor |
| **Temperatura** | Muestreo a 3 profundidades | Sensores RTD multi-punto |
| **Calidad (BS&W)** | Análisis de muestra física | Analizador en línea (opcional) |
| **API Gravity** | Hidrómetro de muestra | De laboratorio o configuración |
| **Seguridad** | Baja (operador en tanque) | Alta (operador en sala control) |
| **Precisión** | ±0.5-1% | ±0.1-0.3% |
| **Velocidad** | 10-30 minutos | Instantáneo |
| **Cumplimiento OIML** | ✅ Sí | ✅ Sí |
| **Uso típico** | Campo remoto, verificación | Terminales modernas, ATG |

### Cuándo Usar Batch Manual

```
┌─────────────────────────────────────────────────────┐
│  DECISIÓN: ¿BATCH AUTOMÁTICO O MANUAL?             │
│                                                      │
│  Verificar:                                          │
│  1. ¿Radar tiene comunicación? ─────────┐           │
│                                          │           │
│     ├─ NO  → MANUAL (sin telemetría)    │           │
│     └─ SÍ  → Continuar ──────────────────┘          │
│                                          │           │
│  2. ¿Telemetría es confiable? ──────────┤           │
│                                          │           │
│     ├─ NO  → MANUAL (datos erróneos)    │           │
│     └─ SÍ  → Continuar ──────────────────┘          │
│                                          │           │
│  3. ¿Desviación vs manual reciente? ────┤           │
│                                          │           │
│     ├─ >2% → ALERTA + Opción MANUAL     │           │
│     └─ <2% → AUTOMÁTICO ✅              │           │
│                                                      │
│  RESULTADO:                                          │
│  - Preferir AUTOMÁTICO cuando posible               │
│  - Permitir MANUAL cuando necesario                 │
│  - Registrar razón en audit trail                   │
└─────────────────────────────────────────────────────┘
```

### Implementación de Modo Manual

#### 1. UI con Toggle Automático/Manual

```
┌────────────────────────────────────────────────────┐
│  CREAR BATCH                                       │
│                                                    │
│  Tanque: [TK-102 - Diesel ▼]                      │
│                                                    │
│  Método de captura:                                │
│  ⦿ Automático (recomendado)  ○ Manual             │
│  ────────────────────────────────────────────     │
│                                                    │
│  ┌─ MODO AUTOMÁTICO ──────────────────────────┐  │
│  │                                             │  │
│  │  OPENING GAUGE                              │  │
│  │  ✓ Radar comunicación: OK                   │  │
│  │  ✓ Última telemetría: hace 5s               │  │
│  │                                             │  │
│  │  ⚡ Nivel:     8,320.5 mm (automático)      │  │
│  │  ⚡ Temp:      20.1°C (automático)          │  │
│  │  ⚡ Presión:   1.013 bar (automático)       │  │
│  │  ⚡ API:       35.0° (configuración)        │  │
│  │                                             │  │
│  │  TOV: 10,500 bbl (calculado)                │  │
│  │  NSV: 10,400 bbl (calculado)                │  │
│  │                                             │  │
│  │  [✓] Datos correctos - Crear Batch         │  │
│  │  [ ] Necesito ajustar → Cambiar a manual   │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  CREAR BATCH                                       │
│                                                    │
│  Tanque: [TK-102 - Diesel ▼]                      │
│                                                    │
│  Método de captura:                                │
│  ○ Automático  ⦿ Manual                            │
│  ────────────────────────────────────────────     │
│                                                    │
│  ⚠ MODO MANUAL SELECCIONADO                       │
│                                                    │
│  Razón: [Telemetría errónea______________ ▼]     │
│         (opciones: Sin comunicación radar,         │
│                    Telemetría errónea,             │
│                    Verificación regulatoria,       │
│                    Tanque sin instrumentación,     │
│                    Otro)                           │
│                                                    │
│  ┌─ OPENING GAUGE (Manual) ──────────────────┐   │
│  │                                            │   │
│  │  Timestamp: [2025-12-10] [08:00:00] 🕐    │   │
│  │                                            │   │
│  │  Nivel:       [8320.5___] mm              │   │
│  │  Temperatura: [20.1____] °C               │   │
│  │  Presión:     [1.013___] bar              │   │
│  │  API Gravity: [35.0____] °API             │   │
│  │  BS&W:        [0.5_____] %                │   │
│  │                                            │   │
│  │  Operador:    [Juan Pérez______________]  │   │
│  │  Método:      [Cinta métrica 15m_______]  │   │
│  │                                            │   │
│  │  [Calcular Volúmenes]                     │   │
│  │                                            │   │
│  │  TOV: 10,485 bbl (calculado)              │   │
│  │  NSV: 10,385 bbl (calculado)              │   │
│  │                                            │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  Información adicional:                            │
│  Tipo: ⦿ Dispensing  ○ Receiving                  │
│  Vehículo: [ABC-123____________]                   │
│  Conductor: [José García_______]                   │
│                                                    │
│  Notas: [Medición manual por radar fuera de       │
│          servicio. Mantenimiento programado.]      │
│                                                    │
│  [Crear Batch Manual]                              │
└────────────────────────────────────────────────────┘
```

#### 2. Modelo de Datos Extendido

```typescript
interface Batch {
  id: string;
  batchNumber: string;
  tankId: string;
  tankName: string;
  batchType: 'receiving' | 'dispensing';
  status: 'open' | 'closed' | 'recalculated' | 'voided';

  // ⭐ NUEVO: Método de captura
  captureMethod: 'automatic' | 'manual';
  captureMethodReason?: string; // Razón si es manual

  // Opening Gauge
  openingTime: number;
  openingOperator: string;
  openingCaptureMethod: 'automatic' | 'manual'; // ⭐ NUEVO
  openingManualReason?: string; // ⭐ NUEVO
  openingManualInstrument?: string; // ⭐ NUEVO (e.g., "Cinta métrica 15m")
  openingLevel: number;
  openingTemperature: number;
  openingPressure?: number;
  openingApiGravity: number;
  openingBsw?: number; // ⭐ Más importante en manual
  openingTOV: number;
  openingGOV: number;
  openingGSV: number;
  openingNSV: number;
  openingMass: number;
  openingWIA: number;

  // Closing Gauge (mismo esquema)
  closingTime?: number;
  closingOperator?: string;
  closingCaptureMethod?: 'automatic' | 'manual'; // ⭐ NUEVO
  closingManualReason?: string;
  closingManualInstrument?: string;
  // ... resto de campos closing

  // Transferred
  transferredNSV?: number;
  transferredMass?: number;
  transferredWIA?: number;

  // Metadata
  destination?: string;
  transportVehicle?: string;
  sealNumbers?: string[];
  notes?: string;

  // Audit trail
  createdAt: number;
  closedAt?: number;
  recalculatedAt?: number;

  // ⭐ NUEVO: Data quality flags
  dataQuality?: {
    openingSourceReliable: boolean; // true si automático y telemetría OK
    closingSourceReliable: boolean;
    manualVerificationPerformed: boolean;
    deviationFromAutomatic?: number; // % si hay medición automática para comparar
  };

  // PDF
  reportPdfUrl?: string;
  reportPdfHash?: string;
}
```

#### 3. Service con Dual Mode

```typescript
// batch.service.ts

/**
 * Crear batch con captura automática
 */
async createBatchAutomatic(params: {
  tankId: string;
  batchType: 'receiving' | 'dispensing';
  metadata: BatchMetadata;
}): Promise<Batch> {

  // 1. Validar que telemetría está disponible
  const validation = await this.validateTankState(params.tankId);
  if (!validation.valid) {
    throw new Error(`Cannot create automatic batch: ${validation.error}`);
  }

  // 2. Capturar opening gauge automáticamente
  const openingGauge = await this.gaugeCaptureService
    .captureCurrentGauge(params.tankId);

  // 3. Crear batch
  const batch: Batch = {
    id: this.generateBatchId(),
    batchNumber: this.generateBatchNumber(),
    tankId: params.tankId,
    tankName: params.tankName,
    batchType: params.batchType,
    status: 'open',

    // ⭐ Método de captura
    captureMethod: 'automatic',

    // Opening gauge
    openingTime: openingGauge.timestamp,
    openingOperator: this.currentUser.name,
    openingCaptureMethod: 'automatic',
    openingLevel: openingGauge.level,
    openingTemperature: openingGauge.temperature,
    openingPressure: openingGauge.pressure,
    openingApiGravity: openingGauge.apiGravity,
    openingBsw: openingGauge.bsw,
    openingTOV: openingGauge.tov,
    openingGOV: openingGauge.gov,
    openingGSV: openingGauge.gsv,
    openingNSV: openingGauge.nsv,
    openingMass: openingGauge.mass,
    openingWIA: openingGauge.wia,

    // Data quality
    dataQuality: {
      openingSourceReliable: true,
      closingSourceReliable: false, // aún no cerrado
      manualVerificationPerformed: false
    },

    // Metadata
    ...params.metadata,

    createdAt: Date.now()
  };

  await this.saveBatch(batch);

  // Log en audit trail
  await this.auditService.logEvent('BATCH_CREATED_AUTOMATIC', {
    batchId: batch.id,
    tankId: batch.tankId,
    method: 'automatic',
    radarDeviceId: openingGauge.radarDeviceId
  });

  return batch;
}

/**
 * Crear batch con captura manual
 */
async createBatchManual(params: {
  tankId: string;
  batchType: 'receiving' | 'dispensing';
  reason: string; // ⭐ Razón obligatoria para manual
  openingGauge: {
    timestamp: number;
    operator: string;
    instrument: string; // e.g., "Cinta métrica 15m"
    level: number;
    temperature: number;
    pressure?: number;
    apiGravity: number;
    bsw: number;
  };
  metadata: BatchMetadata;
}): Promise<Batch> {

  // 1. Validar datos manuales
  this.validateManualGaugeData(params.openingGauge);

  // 2. Calcular volúmenes con datos manuales
  const tankConfig = await this.tankService.getTankConfig(params.tankId);
  const volumes = await this.volumeCalculationService.calculateVolumes({
    level: params.openingGauge.level,
    temperature: params.openingGauge.temperature,
    pressure: params.openingGauge.pressure || 1.013,
    apiGravity: params.openingGauge.apiGravity,
    bsw: params.openingGauge.bsw,
    strappingTable: tankConfig.strappingTable
  });

  // 3. Verificar si hay telemetría automática para comparar
  let deviationFromAutomatic: number | undefined;
  try {
    const autoGauge = await this.gaugeCaptureService
      .captureHistoricalGauge(params.tankId, params.openingGauge.timestamp);

    if (autoGauge) {
      // Calcular desviación
      deviationFromAutomatic = Math.abs(
        (volumes.nsv - autoGauge.nsv) / autoGauge.nsv * 100
      );

      // Alerta si desviación significativa
      if (deviationFromAutomatic > 2) {
        await this.notificationService.notify({
          type: 'MANUAL_AUTO_DEVIATION',
          severity: 'WARNING',
          message: `Manual gauge deviates ${deviationFromAutomatic.toFixed(2)}% from automatic`,
          tankId: params.tankId
        });
      }
    }
  } catch (err) {
    // No hay telemetría disponible, OK
  }

  // 4. Crear batch manual
  const batch: Batch = {
    id: this.generateBatchId(),
    batchNumber: this.generateBatchNumber(),
    tankId: params.tankId,
    batchType: params.batchType,
    status: 'open',

    // ⭐ Método de captura
    captureMethod: 'manual',
    captureMethodReason: params.reason,

    // Opening gauge
    openingTime: params.openingGauge.timestamp,
    openingOperator: params.openingGauge.operator,
    openingCaptureMethod: 'manual',
    openingManualReason: params.reason,
    openingManualInstrument: params.openingGauge.instrument,
    openingLevel: params.openingGauge.level,
    openingTemperature: params.openingGauge.temperature,
    openingPressure: params.openingGauge.pressure || 1.013,
    openingApiGravity: params.openingGauge.apiGravity,
    openingBsw: params.openingGauge.bsw,
    openingTOV: volumes.tov,
    openingGOV: volumes.gov,
    openingGSV: volumes.gsv,
    openingNSV: volumes.nsv,
    openingMass: volumes.mass,
    openingWIA: volumes.wia,

    // Data quality
    dataQuality: {
      openingSourceReliable: false, // manual = menos confiable
      closingSourceReliable: false,
      manualVerificationPerformed: true,
      deviationFromAutomatic
    },

    // Metadata
    ...params.metadata,

    createdAt: Date.now()
  };

  await this.saveBatch(batch);

  // Log en audit trail con razón
  await this.auditService.logEvent('BATCH_CREATED_MANUAL', {
    batchId: batch.id,
    tankId: batch.tankId,
    method: 'manual',
    reason: params.reason,
    instrument: params.openingGauge.instrument,
    deviationFromAutomatic
  });

  return batch;
}

/**
 * Validar datos de gauge manual
 */
private validateManualGaugeData(gauge: ManualGaugeData): void {
  const errors: string[] = [];

  // Validaciones básicas
  if (!gauge.level || gauge.level <= 0) {
    errors.push('Level must be positive');
  }

  if (!gauge.temperature || gauge.temperature < -50 || gauge.temperature > 150) {
    errors.push('Temperature out of range (-50 to 150°C)');
  }

  if (!gauge.apiGravity || gauge.apiGravity < 10 || gauge.apiGravity > 100) {
    errors.push('API Gravity out of range (10 to 100°API)');
  }

  if (gauge.bsw < 0 || gauge.bsw > 100) {
    errors.push('BS&W must be between 0 and 100%');
  }

  if (!gauge.operator || gauge.operator.trim().length === 0) {
    errors.push('Operator name is required');
  }

  if (!gauge.instrument || gauge.instrument.trim().length === 0) {
    errors.push('Measurement instrument must be specified');
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid manual gauge data', errors);
  }
}
```

#### 4. Indicadores en PDF

El PDF debe indicar claramente si el batch fue automático o manual:

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]      BATCH TRANSFER REPORT                          │
│                                                              │
│  Batch Number: BT-20251210-001                              │
│  Date: December 10, 2025                                    │
│                                                              │
│  ⚠ MANUAL MEASUREMENT METHOD (API MPMS 18.1)                │
│  Reason: Radar communication lost                           │
└─────────────────────────────────────────────────────────────┘

TANK INFORMATION:
Tank: TK-102 (Diesel Storage)
Product: Diesel

OPENING GAUGE (MANUAL):
Date/Time: 2025-12-10 08:00:00 UTC
Operator: Juan Pérez
Method: Manual tape measurement (15m measuring tape)
Instrument: Cinta métrica 15m calibrada (Cal. Date: 2025-01-15)

⚠ Manual measurement performed due to:
   "Radar communication lost - maintenance scheduled"

Level: 8,320.5 mm (manual)
Temperature: 20.1°C (manual - 3-point sample average)
  - Top: 19.8°C
  - Middle: 20.1°C
  - Bottom: 20.4°C
API Gravity: 35.0°API (laboratory sample)
BS&W: 0.5% (centrifuge test)

TOV: 10,485 bbl
GOV: 10,433 bbl
GSV: 10,398 bbl
NSV: 10,385 bbl
Mass: 1,454,200 kg

CLOSING GAUGE (AUTOMATIC):
Date/Time: 2025-12-10 10:00:00 UTC
Operator: System (Radar TRL2-001)
Method: Automatic radar measurement (API MPMS 18.2)

✓ Radar communication restored

Level: 7,120.2 mm (automatic)
Temperature: 19.8°C (RTD sensor)
API Gravity: 35.0°API
BS&W: 0.5%

TOV: 8,900 bbl
GOV: 8,856 bbl
GSV: 8,826 bbl
NSV: 8,815 bbl
Mass: 1,235,600 kg

TRANSFERRED QUANTITIES:
NSV Transferred: 1,570 bbl
Mass Transferred: 218,600 kg

DATA QUALITY NOTE:
Opening: Manual measurement (API MPMS 18.1)
Closing: Automatic measurement (API MPMS 18.2)
Mixed method batch - see audit trail for details

[QR CODE]

Report ID: BTR-20251210-001-TK102
Generated: 2025-12-10 10:05:00 UTC
GDT Tank Gauging System v1.0 | Certified OIML R85
```

#### 5. Tabla Comparativa en UI

En la página de batch management, mostrar claramente el método:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HISTORIAL DE BATCHES                                                         │
│                                                                              │
│ Filtros: [Todos▼] [2025-12▼] [Buscar________________]                      │
│                                                                              │
│ ┌──────┬───────┬───────┬────────┬──────────┬─────────┬────────┬─────────┐ │
│ │Batch │Tank   │Type   │Method  │Opening   │Closing  │NSV     │Status   │ │
│ ├──────┼───────┼───────┼────────┼──────────┼─────────┼────────┼─────────┤ │
│ │BT-001│TK-101 │Disp.  │🤖 Auto │Dec 10 08│Dec 10 10│1,500 bbl│Closed   │ │
│ │BT-002│TK-102 │Disp.  │✋Manual│Dec 10 08│Dec 10 10│1,570 bbl│Closed   │ │
│ │      │       │       │        │          │         │         │⚠ Mixed  │ │
│ │BT-003│TK-103 │Receiv.│🤖 Auto │Dec 10 14│Dec 10 16│2,100 bbl│Closed   │ │
│ └──────┴───────┴───────┴────────┴──────────┴─────────┴────────┴─────────┘ │
│                                                                              │
│ Leyenda:                                                                     │
│ 🤖 Auto  = API MPMS 18.2 (Automatic)                                        │
│ ✋ Manual = API MPMS 18.1 (Manual)                                           │
│ ⚠ Mixed  = Opening y Closing usan métodos diferentes                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Análisis del Sistema de Reportes

### Resumen de Reportes Especificados

Según [REPORTES_E_INFORMES.md](REPORTES_E_INFORMES.md), el sistema debe generar **25 tipos de reportes**:

```
CATEGORÍAS:
1. Inventario          → 7 reportes
2. Custody Transfer    → 4 reportes (incluyendo batches)
3. Análisis            → 5 reportes
4. Históricos          → 6 reportes
5. Cumplimiento        → 3 reportes
```

### Estado Actual vs Requerido

| # | Reporte | Prioridad | Estado Actual | Implementado |
|---|---------|-----------|---------------|--------------|
| **INVENTARIO** | | | | |
| 1 | Daily Inventory Report | 🔴 Alta | No implementado | ❌ |
| 2 | Tank Inventory Summary | 🔴 Alta | No implementado | ❌ |
| 3 | Product Inventory by Group | 🟡 Media | No implementado | ❌ |
| 4 | Tank Status Report | 🟡 Media | Parcial (UI) | ⚠️ |
| 5 | Capacity Utilization Report | 🟢 Baja | No implementado | ❌ |
| 6 | Low Stock Alert Report | 🟡 Media | No implementado | ❌ |
| 7 | Overfill Risk Report | 🔴 Alta | No implementado | ❌ |
| **CUSTODY TRANSFER** | | | | |
| 8 | Batch Transfer Report | 🔴 CRÍTICO | ✅ Implementado | ✅ |
| 9 | Batch History Report | 🟠 Alta | Parcial (UI) | ⚠️ |
| 10 | Mass Balance Report | 🔴 CRÍTICO | No implementado | ❌ |
| 11 | Transfer Reconciliation | 🟡 Media | No implementado | ❌ |
| **ANÁLISIS** | | | | |
| 12 | Laboratory Analysis Report | 🟡 Media | No implementado | ❌ |
| 13 | Manual Gauging Report | 🟡 Media | No implementado | ❌ |
| 14 | Deviation Analysis Report | 🟡 Media | No implementado | ❌ |
| 15 | Temperature Profile Report | 🟢 Baja | No implementado | ❌ |
| 16 | Density Variation Report | 🟢 Baja | No implementado | ❌ |
| **HISTÓRICOS** | | | | |
| 17 | Historical Level Trends | 🟡 Media | Parcial (gráficos) | ⚠️ |
| 18 | Historical Volume Trends | 🟡 Media | No implementado | ❌ |
| 19 | Alarm History Report | 🟠 Alta | No implementado | ❌ |
| 20 | Event Log Report (OIML R85) | 🔴 CRÍTICO | No implementado | ❌ |
| 21 | Configuration Change History | 🟡 Media | No implementado | ❌ |
| 22 | Performance Metrics Report | 🟢 Baja | No implementado | ❌ |
| **CUMPLIMIENTO** | | | | |
| 23 | OIML R85 Compliance Report | 🔴 CRÍTICO | No implementado | ❌ |
| 24 | Audit Trail Summary | 🔴 Alta | No implementado | ❌ |
| 25 | Calibration Status Report | 🟡 Media | No implementado | ❌ |

**Resumen:**
- ✅ Implementado: 1 (Batch Transfer Report)
- ⚠️ Parcial: 3
- ❌ No implementado: 21

### Análisis de Reportes Críticos

#### 🔴 REPORTE CRÍTICO #10: Mass Balance Report

**¿Por qué es crítico?**
- Detecta **fugas y robos**
- Requerido por **regulación petrolera**
- Base para **reconciliación contable**
- Alerta temprana de **problemas operacionales**

**Cálculo:**
```
Opening Inventory (NSV at start)
+ Receipts (suma de batches receiving)
- Deliveries (suma de batches dispensing)
= Expected Closing

Actual Closing (NSV at end)
- Expected Closing
= Discrepancy

Discrepancy % = (Discrepancy / Expected Closing) × 100

Thresholds:
✅ < 0.5%  = Aceptable
⚠️ 0.5-1% = Revisar
❌ > 1%    = Crítico (investigar fuga/error)
```

**Ejemplo Real:**

```
Tank TK-102 - Period: Dec 1-7, 2025

Opening Inventory (Dec 1, 00:00):  10,400 bbl
Receipts:
  - Batch BT-001: +8,500 bbl
  - Batch BT-005: +3,200 bbl
  Total Receipts:                   11,700 bbl

Deliveries:
  - Batch BT-002: -5,100 bbl
  - Batch BT-003: -4,800 bbl
  - Batch BT-007: -5,300 bbl
  Total Deliveries:                 15,200 bbl

Expected Closing:
  10,400 + 11,700 - 15,200 =       6,900 bbl

Actual Closing (Dec 7, 23:59):     6,830 bbl

Discrepancy:
  6,830 - 6,900 =                   -70 bbl

Discrepancy %:
  (-70 / 6,900) × 100 =             -1.01%

❌ STATUS: CRITICAL - Exceeds 1% threshold
   → ACTION: Inspect for leaks, verify calibration, review batches
```

**Implementación:**

```typescript
// mass-balance-report.service.ts

interface MassBalanceResult {
  tankId: string;
  tankName: string;
  period: {
    startDate: number;
    endDate: number;
  };
  openingInventory: number; // NSV
  receipts: number; // NSV
  deliveries: number; // NSV
  expectedClosing: number; // NSV
  actualClosing: number; // NSV
  discrepancy: number; // NSV
  discrepancyPercent: number;
  status: 'acceptable' | 'review' | 'critical';
  batches: {
    receiving: Batch[];
    dispensing: Batch[];
  };
}

async generateMassBalanceReport(params: {
  tankIds: string[];
  startDate: number;
  endDate: number;
}): Promise<MassBalanceResult[]> {

  const results: MassBalanceResult[] = [];

  for (const tankId of params.tankIds) {
    // 1. Obtener opening inventory
    const openingNSV = await this.telemetryService
      .getTelemetryAtTimestamp(tankId, params.startDate, ['nsv']);

    // 2. Obtener batches del período
    const batches = await this.batchService.getBatches({
      tankId,
      startDate: params.startDate,
      endDate: params.endDate,
      status: 'closed' // Solo batches cerrados
    });

    // 3. Calcular receipts y deliveries
    const receipts = batches
      .filter(b => b.batchType === 'receiving')
      .reduce((sum, b) => sum + b.transferredNSV, 0);

    const deliveries = batches
      .filter(b => b.batchType === 'dispensing')
      .reduce((sum, b) => sum + b.transferredNSV, 0);

    // 4. Expected closing
    const expectedClosing = openingNSV + receipts - deliveries;

    // 5. Actual closing
    const actualClosing = await this.telemetryService
      .getTelemetryAtTimestamp(tankId, params.endDate, ['nsv']);

    // 6. Discrepancy
    const discrepancy = actualClosing - expectedClosing;
    const discrepancyPercent = (discrepancy / expectedClosing) * 100;

    // 7. Status
    let status: 'acceptable' | 'review' | 'critical';
    if (Math.abs(discrepancyPercent) < 0.5) {
      status = 'acceptable';
    } else if (Math.abs(discrepancyPercent) < 1.0) {
      status = 'review';
    } else {
      status = 'critical';
    }

    results.push({
      tankId,
      tankName: await this.getTankName(tankId),
      period: {
        startDate: params.startDate,
        endDate: params.endDate
      },
      openingInventory: openingNSV,
      receipts,
      deliveries,
      expectedClosing,
      actualClosing,
      discrepancy,
      discrepancyPercent,
      status,
      batches: {
        receiving: batches.filter(b => b.batchType === 'receiving'),
        dispensing: batches.filter(b => b.batchType === 'dispensing')
      }
    });
  }

  return results;
}

// Generar PDF del reporte
async generateMassBalancePdf(
  results: MassBalanceResult[]
): Promise<Blob> {

  const pdf = new jsPDF();
  let yPos = 20;

  // Header
  pdf.setFontSize(16);
  pdf.text('MASS BALANCE REPORT', 105, yPos, { align: 'center' });
  yPos += 10;

  pdf.setFontSize(10);
  const period = `Period: ${formatDate(results[0].period.startDate)} - ${formatDate(results[0].period.endDate)}`;
  pdf.text(period, 105, yPos, { align: 'center' });
  yPos += 15;

  // Tabla
  const tableData = results.map(r => [
    r.tankName,
    r.openingInventory.toFixed(0),
    r.receipts.toFixed(0),
    r.deliveries.toFixed(0),
    r.expectedClosing.toFixed(0),
    r.actualClosing.toFixed(0),
    r.discrepancy.toFixed(0),
    r.discrepancyPercent.toFixed(2) + '%',
    this.getStatusIcon(r.status)
  ]);

  autoTable(pdf, {
    startY: yPos,
    head: [[
      'Tank',
      'Opening',
      'Receipts',
      'Deliveries',
      'Expected',
      'Actual',
      'Discrepancy',
      '%',
      'Status'
    ]],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 115, 119] }
  });

  yPos = (pdf as any).lastAutoTable.finalY + 10;

  // Tanks requiring attention
  const critical = results.filter(r => r.status === 'critical');
  const review = results.filter(r => r.status === 'review');

  if (critical.length > 0 || review.length > 0) {
    pdf.setFontSize(12);
    pdf.text('TANKS REQUIRING ATTENTION:', 20, yPos);
    yPos += 8;

    pdf.setFontSize(10);

    critical.forEach(r => {
      pdf.setTextColor(255, 0, 0);
      pdf.text(`❌ ${r.tankName}: ${r.discrepancyPercent.toFixed(2)}% discrepancy (exceeds 1% threshold)`, 25, yPos);
      yPos += 5;
      pdf.setTextColor(0, 0, 0);
      pdf.text(`   → Recommended Action: Inspect for leaks, verify calibration`, 25, yPos);
      yPos += 8;
    });

    review.forEach(r => {
      pdf.setTextColor(255, 165, 0);
      pdf.text(`⚠ ${r.tankName}: ${r.discrepancyPercent.toFixed(2)}% discrepancy (review recommended)`, 25, yPos);
      yPos += 5;
      pdf.setTextColor(0, 0, 0);
      pdf.text(`   → Recommended Action: Verify batch records`, 25, yPos);
      yPos += 8;
    });
  }

  // Footer
  const pageCount = pdf.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.text(
      `Generated: ${formatDateTime(Date.now())} | Page ${i}/${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
  }

  return pdf.output('blob');
}
```

#### 🔴 REPORTE CRÍTICO #20: Event Log Report (OIML R85)

**¿Por qué es crítico?**
- **Requerido por OIML R85** para certificación
- **Audit trail obligatorio** para custody transfer
- **Trazabilidad completa** de cambios
- **Compliance regulatorio**

**Eventos a registrar:**

```typescript
enum EventType {
  // Configuración
  TANK_CREATED = 'tank_created',
  TANK_MODIFIED = 'tank_modified',
  TANK_DELETED = 'tank_deleted',
  STRAPPING_TABLE_UPDATED = 'strapping_table_updated',
  ALARM_THRESHOLD_CHANGED = 'alarm_threshold_changed',

  // Batches
  BATCH_CREATED_AUTOMATIC = 'batch_created_automatic',
  BATCH_CREATED_MANUAL = 'batch_created_manual',
  BATCH_CLOSED = 'batch_closed',
  BATCH_RECALCULATED = 'batch_recalculated',
  BATCH_VOIDED = 'batch_voided',

  // Radar/Device
  RADAR_CONFIGURATION_CHANGED = 'radar_configuration_changed',
  DEVICE_SEALED = 'device_sealed',
  DEVICE_UNSEALED = 'device_unsealed',
  CALIBRATION_PERFORMED = 'calibration_performed',

  // Laboratorio
  LAB_RESULT_RECORDED = 'lab_result_recorded',
  LAB_RESULT_UPDATED = 'lab_result_updated',

  // Aforo manual
  MANUAL_GAUGE_RECORDED = 'manual_gauge_recorded',

  // Usuarios
  USER_CREATED = 'user_created',
  USER_PERMISSION_CHANGED = 'user_permission_changed',
  USER_DELETED = 'user_deleted',

  // Sistema
  SYSTEM_PARAMETER_CHANGED = 'system_parameter_changed',
  BACKUP_PERFORMED = 'backup_performed'
}

interface AuditEvent {
  id: string;
  timestamp: number; // NTP-synced
  eventType: EventType;
  userId: string;
  userName: string;
  entityType: 'tank' | 'batch' | 'radar' | 'user' | 'system';
  entityId: string;
  entityName: string;
  action: 'create' | 'read' | 'update' | 'delete';
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>;
  digitalSignature: string; // SHA-256
  verified: boolean; // Si firma es válida
}
```

**Ejemplo de Event Log:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EVENT LOG REPORT (OIML R85 COMPLIANT)                                      │
│                                                                             │
│  Period: December 1-7, 2025                                                 │
│  Report ID: ELR-20251207-001                                                │
│  Generated: 2025-12-07 23:59:00 UTC                                         │
└─────────────────────────────────────────────────────────────────────────────┘

EVENTS:

[2025-12-01 08:00:15] BATCH_CREATED_AUTOMATIC
  User: operator@company.com (Juan Pérez)
  Entity: Batch BT-2025-001 (Tank TK-102)
  Action: Created batch for dispensing operation
  Method: Automatic gauge capture (API MPMS 18.2)
  Signature: a3f5d2b8...c4e1f9a2 ✓ VERIFIED

[2025-12-01 08:05:22] BATCH_CREATED_MANUAL
  User: operator@company.com (Juan Pérez)
  Entity: Batch BT-2025-002 (Tank TK-103)
  Action: Created batch with manual gauge (API MPMS 18.1)
  Reason: Radar communication lost
  Method: Manual tape measurement
  Signature: b7c2e4d1...f3a8b5c9 ✓ VERIFIED

[2025-12-01 10:30:45] BATCH_CLOSED
  User: operator@company.com (María García)
  Entity: Batch BT-2025-001 (Tank TK-102)
  Action: Closed batch
  Transferred NSV: 1,500 bbl
  Signature: c9d4f1a2...e7b3c8d5 ✓ VERIFIED

[2025-12-01 14:15:33] STRAPPING_TABLE_UPDATED
  User: engineer@company.com (Carlos López)
  Entity: Tank TK-101
  Action: Updated strapping table
  Changes:
    - Strapping table version: v1.0 → v1.1
    - Calibration date: 2024-11-15 → 2025-12-01
  Reason: Annual recalibration
  Signature: d2e5a3b4...f8c1d9e6 ✓ VERIFIED

[2025-12-02 09:00:00] BATCH_RECALCULATED
  User: supervisor@company.com (Ana Martínez)
  Entity: Batch BT-2025-001 (Tank TK-102)
  Action: Recalculated batch
  Reason: Updated API Gravity from laboratory
  Changes:
    - Opening API Gravity: 35.0° → 35.2°
    - Closing API Gravity: 35.0° → 35.2°
    - Transferred NSV: 1,500 bbl → 1,485 bbl
  Impact: -15 bbl (-1.0%)
  Signature: e4f7b2c5...a9d3e1f8 ✓ VERIFIED

[2025-12-03 11:45:12] DEVICE_SEALED
  User: engineer@company.com (Carlos López)
  Entity: Radar TRL2-001 (Tank TK-102)
  Action: Device sealed (write-protected)
  Seal ID: SEAL-2025-001
  Signature: f1a8c3d6...b4e9f2a7 ✓ VERIFIED

[2025-12-05 16:20:05] ALARM_THRESHOLD_CHANGED
  User: engineer@company.com (Carlos López)
  Entity: Tank TK-103
  Action: Updated alarm threshold
  Changes:
    - HH (High-High): 9,500 mm → 9,800 mm
  Reason: Increased storage capacity after maintenance
  Signature: a2d5f8c1...e3b7a9f4 ✓ VERIFIED

SUMMARY:
Total Events: 47
Events by Type:
  - Batch Operations: 15
  - Configuration Changes: 8
  - Device Management: 5
  - Laboratory: 12
  - User Management: 3
  - System: 4

Signature Verification:
✓ All 47 events have valid digital signatures
✓ No corrupted or tampered events detected

Compliance Status: ✅ OIML R85 COMPLIANT

Generated by GDT Tank Gauging System v1.0
NTP Server: time.google.com (synchronized)
Report Signature: g3h6j9k2...m5n8p1q4 ✓
```

---

## Integración Batches-Reportes

### Cómo los Batches Alimentan los Reportes

```
┌──────────────────────────────────────────────────────┐
│  BATCHES                                             │
│  (Custody Transfer Operations)                       │
└─────────────────┬────────────────────────────────────┘
                  │
                  ├─────────────────────────────────────────────┐
                  │                                             │
                  ▼                                             ▼
     ┌────────────────────────┐               ┌────────────────────────┐
     │  MASS BALANCE REPORT   │               │  BATCH HISTORY REPORT  │
     │                        │               │                        │
     │  - Opening inventory   │               │  - Lista de batches    │
     │  - Receipts (batches)  │               │  - Totales por tipo    │
     │  - Deliveries (batches)│               │  - Filtros             │
     │  - Discrepancy         │               └────────────────────────┘
     └────────────────────────┘
                  │
                  ├─────────────────────────────────────────────┐
                  │                                             │
                  ▼                                             ▼
     ┌────────────────────────┐               ┌────────────────────────┐
     │  EVENT LOG REPORT      │               │  TRANSFER RECONCILIATION│
     │  (OIML R85)            │               │                        │
     │                        │               │  - Source batch        │
     │  - Batch created       │               │  - Destination batch   │
     │  - Batch closed        │               │  - Loss/gain           │
     │  - Batch recalculated  │               └────────────────────────┘
     └────────────────────────┘
                  │
                  ▼
     ┌────────────────────────┐
     │  DAILY INVENTORY       │
     │                        │
     │  - Current inventory   │
     │  - Batches today       │
     │  - Status              │
     └────────────────────────┘
```

### Ejemplo: Mass Balance usa Batches

```typescript
// Pseudocódigo de relación

// 1. Usuario solicita Mass Balance Report
const report = await massBalanceService.generate({
  tankId: 'TK-102',
  startDate: '2025-12-01',
  endDate: '2025-12-07'
});

// 2. Service consulta batches del período
const batches = await batchService.getBatches({
  tankId: 'TK-102',
  startDate: '2025-12-01',
  endDate: '2025-12-07',
  status: 'closed'
});

// 3. Calcula receipts
const receipts = batches
  .filter(b => b.batchType === 'receiving')
  .reduce((sum, b) => sum + b.transferredNSV, 0);

// 4. Calcula deliveries
const deliveries = batches
  .filter(b => b.batchType === 'dispensing')
  .reduce((sum, b) => sum + b.transferredNSV, 0);

// 5. Genera PDF con detalles de cada batch
```

---

## Mejoras Propuestas para Reportes

### Priorización de Implementación

#### FASE 3.1: Reportes Críticos (1 mes)

| # | Reporte | Días | Razón |
|---|---------|------|-------|
| 10 | Mass Balance Report | 5 | Detecta fugas/robos |
| 20 | Event Log Report | 5 | OIML R85 obligatorio |
| 9 | Batch History Report | 3 | Complementa batches |
| 1 | Daily Inventory Report | 4 | Operación diaria |
| 19 | Alarm History Report | 3 | Seguridad operacional |

**Total:** 20 días (1 mes)

#### FASE 3.2: Reportes Importantes (1 mes)

| # | Reporte | Días | Razón |
|---|---------|------|-------|
| 2 | Tank Inventory Summary | 3 | Análisis ejecutivo |
| 7 | Overfill Risk Report | 4 | Prevención incidentes |
| 23 | OIML R85 Compliance | 5 | Certificación |
| 24 | Audit Trail Summary | 3 | Compliance general |
| 12 | Laboratory Analysis | 4 | Calidad de producto |
| 13 | Manual Gauging Report | 3 | Verificación mediciones |

**Total:** 22 días (1 mes)

#### FASE 3.3: Reportes Complementarios (2 semanas)

Resto de reportes de análisis e históricos

### Arquitectura del Sistema de Reportes

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Angular)                                         │
│  ┌────────────────────┐    ┌─────────────────────────┐     │
│  │  Reportes Page     │    │  Export Configurator    │     │
│  │  - Catálogo        │    │  - Scheduled reports    │     │
│  │  - Parámetros      │    │  - Destinations         │     │
│  │  - Previsualización│    │  - Cron config          │     │
│  └────────────────────┘    └─────────────────────────┘     │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP POST /api/reports/generate
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  REPORT SERVICE (Python/Node.js)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Report Generator                                     │  │
│  │  - Fetch data from ThingsBoard API                   │  │
│  │  - Calculate aggregations                            │  │
│  │  - Apply business logic (mass balance, etc.)         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PDF Generator                                        │  │
│  │  - jsPDF / reportlab                                 │  │
│  │  - Templates with placeholders                       │  │
│  │  - Charts embedding                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Excel Generator                                      │  │
│  │  - xlsx (SheetJS) / openpyxl                         │  │
│  │  - Multiple sheets                                   │  │
│  │  - Formulas and formatting                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Scheduler                                            │  │
│  │  - APScheduler / node-cron                           │  │
│  │  - Cron expressions                                  │  │
│  │  - Retry logic                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Export Manager                                       │  │
│  │  - Email sending                                     │  │
│  │  - FTP/SFTP upload                                   │  │
│  │  - S3 upload                                         │  │
│  │  - Webhook notifications                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Roadmap Actualizado

### FASE 2.5: Mejoras Críticas de Batches (3 semanas)

**Sprint 1: Captura Automática + Manual**
- Tarea 1.1: Captura automática (como definido anteriormente)
- Tarea 1.2: Validación de estado
- **Tarea 1.3: Modo manual con toggle** ⭐ NUEVO
- **Tarea 1.4: Indicadores de método en PDF** ⭐ NUEVO

**Sprint 2: Rango de Fechas**
- (Como definido anteriormente)

**Sprint 3: Recálculo Robusto**
- (Como definido anteriormente)

**Duración:** 3 semanas
**Story Points:** 42 → 50 (con modo manual)

---

### FASE 3.1: Reportes Críticos (1 mes)

**Sprint 6: Mass Balance + Event Log**
- Tarea 6.1: Service de Mass Balance (3 días)
- Tarea 6.2: UI de Mass Balance Report (2 días)
- Tarea 6.3: Service de Event Log (3 días)
- Tarea 6.4: UI de Event Log Report (2 días)
- Testing (2 días)

**Sprint 7: Batch History + Daily Inventory**
- Tarea 7.1: Service de Batch History (2 días)
- Tarea 7.2: UI de Batch History Report (2 días)
- Tarea 7.3: Service de Daily Inventory (2 días)
- Tarea 7.4: UI de Daily Inventory Report (2 días)
- Tarea 7.5: Scheduler para Daily Inventory (1 día)
- Testing (1 día)

**Sprint 8: Alarm History**
- Tarea 8.1: Service de Alarm History (2 días)
- Tarea 8.2: UI de Alarm History Report (2 días)
- Tarea 8.3: Estadísticas y gráficos (2 días)
- Testing (1 día)

**Duración:** 4 semanas
**Story Points:** 80

---

### FASE 3.2: Reportes Importantes (1 mes)

**Sprint 9: Inventory Summary + Overfill Risk**
- Tarea 9.1: Tank Inventory Summary (3 días)
- Tarea 9.2: Overfill Risk Report (4 días)
- Testing (2 días)

**Sprint 10: Compliance Reports**
- Tarea 10.1: OIML R85 Compliance Report (5 días)
- Tarea 10.2: Audit Trail Summary (3 días)
- Testing (2 días)

**Sprint 11: Laboratory + Manual Gauging**
- Tarea 11.1: Laboratory Analysis Report (4 días)
- Tarea 11.2: Manual Gauging Report (3 días)
- Testing (2 días)

**Duración:** 4 semanas
**Story Points:** 70

---

### FASE 3.3: Export Configurator (2 semanas)

**Sprint 12: Scheduled Reports**
- Tarea 12.1: UI de configurador (3 días)
- Tarea 12.2: Backend scheduler (3 días)
- Tarea 12.3: Email integration (2 días)
- Tarea 12.4: FTP/S3 integration (2 días)
- Testing (2 días)

**Duración:** 2 semanas
**Story Points:** 40

---

## Resumen del Roadmap Completo

```
TIMELINE:

Semanas 1-3:   FASE 2.5 - Mejoras Batches
               ├─ Captura automática + manual
               ├─ Rango de fechas
               └─ Recálculo robusto

Semanas 4-5:   FASE 3.5 - Automatización
               ├─ Detección de movimiento
               └─ Integración laboratorio

Semanas 6-9:   FASE 3.1 - Reportes Críticos
               ├─ Mass Balance
               ├─ Event Log (OIML R85)
               ├─ Batch History
               ├─ Daily Inventory
               └─ Alarm History

Semanas 10-13: FASE 3.2 - Reportes Importantes
               ├─ Inventory Summary
               ├─ Overfill Risk
               ├─ OIML R85 Compliance
               ├─ Audit Trail Summary
               ├─ Laboratory Analysis
               └─ Manual Gauging

Semanas 14-15: FASE 3.3 - Export Configurator
               └─ Scheduled reports + destinos
```

**TOTAL:** 15 semanas (3.75 meses) con 1 desarrollador

### Estimación Total

| Fase | Duración | Story Points | Prioridad |
|------|----------|--------------|-----------|
| FASE 2.5: Mejoras Batches | 3 semanas | 50 | 🔴 Crítica |
| FASE 3.5: Automatización | 2 semanas | 26 | 🟡 Media |
| FASE 3.1: Reportes Críticos | 4 semanas | 80 | 🔴 Crítica |
| FASE 3.2: Reportes Importantes | 4 semanas | 70 | 🟠 Alta |
| FASE 3.3: Export Configurator | 2 semanas | 40 | 🟠 Alta |
| **TOTAL** | **15 semanas** | **266 SP** | |

---

## Conclusiones

### Hallazgos Clave

1. **Batches Manuales son Esenciales**
   - No se pueden ignorar casos sin telemetría
   - Debe haber toggle Automático/Manual
   - Marcar claramente el método en PDFs
   - Audit trail de decisión manual

2. **Sistema de Reportes es Fundamental**
   - 25 tipos de reportes especificados
   - Solo 1 implementado actualmente
   - 4 reportes son críticos (Mass Balance, Event Log, etc.)
   - Necesita servicio dedicado de generación

3. **Integración Batches-Reportes es Natural**
   - Batches alimentan Mass Balance
   - Batches aparecen en Event Log
   - Batches generan Batch History
   - Daily Inventory incluye batches del día

### Recomendaciones Finales

1. **Priorizar FASE 2.5** (Mejoras Batches)
   - Incluir modo manual obligatoriamente
   - Captura automática como default
   - 3 semanas de desarrollo

2. **Ejecutar FASE 3.1** inmediatamente después
   - Mass Balance Report es crítico
   - Event Log Report es obligatorio para OIML
   - 4 semanas de desarrollo

3. **Considerar Report Service independiente**
   - Python o Node.js dedicado
   - Más fácil de escalar
   - Permite reutilización

4. **Planificar Export Configurator desde el inicio**
   - Automatización es clave
   - Scheduler robusto
   - Múltiples destinos

---

**Fin del Análisis Ampliado**

**Próximos pasos:**
1. Revisar y aprobar análisis ampliado
2. Decidir priorización: ¿Batches primero o Reportes primero?
3. Asignar recursos
4. Comenzar implementación

**Contacto:** Para preguntas o inicio de implementación, contactar al equipo GDT.
