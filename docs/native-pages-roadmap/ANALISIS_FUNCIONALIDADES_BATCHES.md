# Análisis de Funcionalidades de Batches - Comparación con TankMaster

**Fecha:** 10 de diciembre de 2025
**Versión:** 1.0
**Autor:** Análisis técnico basado en investigación de TankMaster/Enraf

---

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [¿Qué es un Batch? Contexto de Custody Transfer](#qué-es-un-batch-contexto-de-custody-transfer)
3. [Cómo Funciona en TankMaster Real](#cómo-funciona-en-tankmaster-real)
4. [Análisis de la Implementación Actual en GDT](#análisis-de-la-implementación-actual-en-gdt)
5. [Problemas Identificados](#problemas-identificados)
6. [Mejoras Propuestas](#mejoras-propuestas)
7. [Comparación Funcional](#comparación-funcional)
8. [Recomendaciones](#recomendaciones)

---

## Resumen Ejecutivo

### Hallazgos Clave

🔴 **PROBLEMA CRÍTICO IDENTIFICADO:** La implementación actual requiere ingresar el nivel manualmente durante la creación del batch, cuando en realidad el sistema **ya tiene capacidad de captura automática** desde los radares TRL/2.

🟢 **BUENAS NOTICIAS:**
- La estructura de datos implementada es correcta y completa
- Los cálculos de volúmenes (TOV, GOV, GSV, NSV) ya están funcionando
- El sistema de generación de PDFs está bien diseñado
- La arquitectura soporta tanto API MPMS 18.1 (manual) como 18.2 (automático)

⚠️ **MEJORAS NECESARIAS:**
1. Captura automática de gauges desde telemetría en tiempo real
2. Selección de rango de fechas para batch en lugar de nivel manual
3. Validación de estado del tanque antes de crear batch
4. Mejor flujo de trabajo para operadores
5. Funcionalidad de recálculo más robusta

---

## ¿Qué es un Batch? Contexto de Custody Transfer

### Definición Oficial

Un **batch** en el contexto de tanques de almacenamiento representa una operación de **transferencia de custodia (custody transfer)** donde se transfiere un volumen específico de producto petrolero entre tanques, camiones cisterna, ferrocarriles o embarcaciones.

**Según la documentación técnica:**

> "Custody transfer es una medición que proporciona información de cantidad y calidad que puede ser utilizada como base para un cambio de propiedad y/o un cambio de responsabilidad de materiales"
> — *Measurement Terms and Definitions*

### ¿Por Qué es Crítico?

Los batches son críticos porque:
- ✅ Documentan oficialmente el **cambio de custodia** del producto
- ✅ Sirven como **base para facturación** y auditoría
- ✅ Proporcionan **registro legal** para resolución de disputas
- ✅ Aseguran la **precisión en las transacciones comerciales**
- ✅ Son requeridos para **cumplimiento regulatorio** (API, OIML)

### Ejemplo de Uso Real

```
Escenario: Terminal petrolera recibe camión cisterna para carga de diesel

1. ANTES DE LA CARGA (Opening Gauge):
   - Tank TK-102: 8,320 bbl (65% capacidad)
   - Temperatura: 68°F
   - API Gravity: 35.0°

2. SE CREA EL BATCH:
   - Batch Number: BATCH-2025-001
   - Tipo: DISPENSING (salida de producto)
   - Vehículo: Camión ABC-123
   - Conductor: Juan Pérez

3. DESPUÉS DE LA CARGA (Closing Gauge):
   - Tank TK-102: 7,120 bbl (56% capacidad)
   - Temperatura: 67°F
   - API Gravity: 35.0°

4. RESULTADO:
   - Volumen transferido: 1,200 bbl (NSV)
   - Masa transferida: 168,240 kg
   - Batch Report PDF generado para facturación
```

---

## Cómo Funciona en TankMaster Real

### Sistema de Honeywell/Enraf (Emerson Rosemount TankMaster)

Basado en la investigación de documentación oficial de TankMaster:

#### 1. Creación de Batch

**TankMaster permite DOS métodos:**

##### Método 1: API MPMS 18.1 (Manual)
- **Para instalaciones remotas sin instrumentación**
- El conductor sube al tanque con cinta métrica
- Ingresa manualmente: nivel, temperatura, muestras de calidad
- **Uso:** Operaciones en campo sin ATG

##### Método 2: API MPMS 18.2 (Automático) ⭐ **ESTO ES LO IMPORTANTE**
- **Para terminales con ATG (Automatic Tank Gauging)**
- El sistema **captura automáticamente** desde sensores:
  - Nivel (desde radar nivel)
  - Temperatura (desde múltiples sensores)
  - Presión (desde sensores de presión)
  - Densidad (calculada o medida)
- **El operador SOLO especifica:**
  - Tanque involucrado
  - Tipo de operación (receiving/dispensing)
  - Información del vehículo/destino
  - **Timestamps de inicio y fin**

#### 2. Proceso de Opening/Closing Gauge

```
┌─────────────────────────────────────────────────────────────┐
│  PROCESO AUTOMÁTICO (API MPMS 18.2)                         │
│                                                               │
│  1. OPERADOR: "Iniciar batch para TK-102"                   │
│     └─> Sistema toma SNAPSHOT automático:                    │
│         - Timestamp: 2025-12-10 08:00:00                     │
│         - Nivel: 8,320.5 mm (desde radar)                    │
│         - Temp: 20.1°C (desde RTD)                           │
│         - Presión: 1.013 bar (desde sensor)                  │
│         - API Gravity: 35.0° (desde configuración/lab)       │
│                                                               │
│  2. OPERACIÓN DE CARGA: 2 horas                              │
│     └─> Sistema monitorea continuamente                      │
│         - Rate of change                                      │
│         - Detección de movimiento                            │
│         - Alarmas de seguridad                               │
│                                                               │
│  3. OPERADOR: "Cerrar batch"                                 │
│     └─> Sistema toma SEGUNDO SNAPSHOT automático:            │
│         - Timestamp: 2025-12-10 10:00:00                     │
│         - Nivel: 7,120.2 mm (desde radar)                    │
│         - Temp: 19.8°C (desde RTD)                           │
│         - Presión: 1.013 bar (desde sensor)                  │
│         - API Gravity: 35.0°                                 │
│                                                               │
│  4. SISTEMA CALCULA AUTOMÁTICAMENTE:                         │
│     - TOV, GOV, GSV, NSV (usando tablas API)                 │
│     - Correcciones CTL, CPL                                  │
│     - Masa transferida                                       │
│     - WIA (Water in Air)                                     │
│     - Genera PDF con QR code y firma digital                 │
└─────────────────────────────────────────────────────────────┘
```

#### 3. Datos Capturados Automáticamente

**En cada gauge (opening/closing):**

| Parámetro | Fuente | Ejemplo |
|-----------|--------|---------|
| **Timestamp** | Sistema | 2025-12-10 08:00:00 UTC |
| **Nivel** | Radar (TRL/2, 970MFR, etc.) | 8,320.5 mm |
| **Temperatura** | RTD multi-punto | 20.1°C (promedio) |
| **Presión** | Sensor de presión | 1.013 bar |
| **API Gravity** | Lab o densímetro | 35.0° |
| **BS&W** | Lab o analizador | 0.5% |
| **TOV** | Calculado (strapping table) | 10,500.25 bbl |
| **GOV** | Calculado (TOV - free water) | 10,450.12 bbl |
| **GSV** | Calculado (GOV × CTL) | 10,425.80 bbl |
| **NSV** | Calculado (GSV - BS&W) | 10,400.50 bbl |
| **Masa** | Calculado (NSV × density) | 1,456,789 kg |
| **WIA** | Calculado | 0.25% |

#### 4. Recálculo de Batches

**TankMaster permite recalcular batches cerrados por hasta 365 días**

**Razones para recálculo:**
1. Actualización de temperatura de laboratorio (más precisa)
2. Actualización de API Gravity de laboratorio
3. Corrección de error en datos
4. Cambio en tabla de strapping
5. Resolución de disputas comerciales

**Proceso de recálculo:**
```
1. Operador selecciona batch cerrado
2. Sistema presenta datos originales
3. Operador modifica valores (temperatura, API gravity, BS&W)
4. Sistema recalcula:
   - CTL (correction for temperature)
   - CPL (correction for pressure)
   - GSV, NSV, Masa
5. Genera NUEVO PDF con watermark "RECALCULATED"
6. Mantiene audit trail completo
7. PDF original permanece disponible
```

#### 5. Almacenamiento y Reportes

**TankMaster almacena:**
- ✅ Batches cerrados por 365 días
- ✅ PDFs generados permanentemente
- ✅ Audit trail completo de recálculos
- ✅ Firma digital SHA-256 para cada batch
- ✅ QR code para verificación rápida

---

## Análisis de la Implementación Actual en GDT

### Lo Que Está Bien Implementado ✅

#### 1. Estructura de Datos Completa

```typescript
interface Batch {
  id: string;
  batchNumber: string;
  tankId: string;
  tankName: string;
  batchType: 'receiving' | 'dispensing';
  status: 'open' | 'closed' | 'recalculated' | 'voided';

  // Opening Gauge - COMPLETO
  openingTime: number;
  openingOperator: string;
  openingLevel: number;
  openingTemperature: number;
  openingApiGravity: number;
  openingTOV: number;
  openingGOV: number;
  openingGSV: number;
  openingNSV: number;
  openingMass: number;
  openingWIA: number;

  // Closing Gauge - COMPLETO
  closingTime?: number;
  closingOperator?: string;
  // ... mismo que opening

  // Transfer - CORRECTO
  transferredNSV?: number;
  transferredMass?: number;
  transferredWIA?: number;

  // Metadata - BIEN
  destination?: string;
  transportVehicle?: string;
  sealNumbers?: string[];
  notes?: string;
}
```

**✅ Comentario:** La estructura de datos es **100% correcta** y alineada con estándares API e ISO.

#### 2. Sistema de Generación de PDF

**✅ Implementado:**
- Backend Java con Apache PDFBox
- Frontend JavaScript con jsPDF (fallback)
- QR Code con ZXing
- Firma digital SHA-256
- Layout profesional

**✅ Comentario:** El sistema de PDFs es **profesional y completo**.

#### 3. Cálculos de Volúmenes

**✅ Ya implementados en el sistema:**
- Tablas de strapping (calibración)
- Cálculo de TOV desde nivel
- Cálculo de GOV (corrección por agua libre)
- Cálculo de GSV (corrección por temperatura CTL)
- Cálculo de NSV (corrección por BS&W)
- Cálculo de masa (NSV × densidad)

**✅ Comentario:** Los cálculos volumétricos **ya están funcionando correctamente** en el sistema actual.

---

## Problemas Identificados

### 🔴 PROBLEMA #1: Ingreso Manual de Nivel Innecesario

**Situación Actual:**
```typescript
// En batch-management.component.ts (actual)
createBatch() {
  const formData = {
    tankId: this.selectedTankId,
    batchType: 'dispensing',
    openingLevel: this.form.value.level,  // ❌ MANUAL
    openingTemperature: this.form.value.temp,  // ❌ MANUAL
    openingOperator: this.currentUser.name
  };
}
```

**¿Por Qué es un Problema?**

1. **El sistema YA tiene los datos en tiempo real**
   - Los radares TRL/2 están enviando nivel cada 10 segundos
   - La temperatura está disponible en telemetría
   - La presión está disponible (si hay sensor)

2. **Introduce errores humanos**
   - El operador puede transcribir mal el valor
   - Puede haber delay entre lectura del sistema y entrada manual
   - No hay sincronización de timestamp

3. **Contradice el estándar API MPMS 18.2**
   - El estándar específicamente permite captura automática
   - TankMaster lo hace automáticamente
   - Es más seguro (operador no sube al tanque)

4. **Duplica trabajo innecesariamente**
   - El operador ve el nivel en pantalla
   - Lo copia manualmente al formulario
   - El sistema lo vuelve a almacenar

### 🔴 PROBLEMA #2: Concepto de "Nivel Inicial/Final" vs "Timestamps"

**Pregunta Clave:** ¿Qué define realmente un batch?

**Respuesta:** **NO es el nivel**, sino **el PERÍODO DE TIEMPO de la operación**.

**Ejemplo Real:**

```
Escenario: Tanque recibe producto de pipeline

ENFOQUE INCORRECTO (actual):
- "Ingrese nivel inicial: 5000 mm"
- "Ingrese nivel final: 8000 mm"
- Problema: ¿CUÁNDO ocurrió esto? ¿Qué temperatura había?

ENFOQUE CORRECTO (TankMaster):
- "Inicio de recepción: 2025-12-10 08:00:00"
- "Fin de recepción: 2025-12-10 10:00:00"
- Sistema busca automáticamente:
  * Telemetría a las 08:00:00 → nivel: 5,000 mm, temp: 20°C
  * Telemetría a las 10:00:00 → nivel: 8,000 mm, temp: 21°C
  * Calcula volúmenes con datos REALES del momento exacto
```

### 🔴 PROBLEMA #3: Falta de Validación de Estado del Tanque

**Situación Actual:**
- No se valida si el tanque está en movimiento
- No se detecta automáticamente si es receiving o dispensing
- No hay alertas de movimiento inesperado

**Debería Hacer:**
```typescript
// Antes de crear batch
validateTankState(tankId) {
  const currentRate = this.calculateLevelRate(tankId);

  if (abs(currentRate) < IDLE_THRESHOLD) {
    return { valid: false, error: 'Tank is idle, no movement detected' };
  }

  if (currentRate > 0) {
    return { valid: true, detectedType: 'receiving' };
  } else {
    return { valid: true, detectedType: 'dispensing' };
  }
}
```

### 🔴 PROBLEMA #4: Recálculo Limitado

**Situación Actual:**
- Se menciona recálculo en documentación
- Pero no hay interfaz clara para:
  - Actualizar API Gravity de laboratorio
  - Actualizar temperatura promedio
  - Recalcular con nuevas tablas de strapping
  - Ver comparación antes/después

**Debería Tener:**
- Dialog de recálculo con campos editables
- Comparación lado a lado (original vs recalculado)
- Audit trail de cambios
- Generación de PDF con watermark "RECALCULATED"

### 🟡 PROBLEMA #5: Falta de Integración con Laboratorio

**En TankMaster Real:**
- Los resultados de laboratorio se integran al batch
- Se pueden actualizar API Gravity, BS&W después del cierre
- Esto dispara recálculo automático

**En GDT Actual:**
- Página de laboratorio existe (implementada en FASE 1)
- PERO no está conectada al sistema de batches
- Los valores de API Gravity son estáticos

---

## Mejoras Propuestas

### MEJORA #1: Captura Automática de Gauges ⭐ **PRIORIDAD ALTA**

#### Cambio en el Flujo de Creación de Batch

**ANTES (actual):**
```
1. Usuario: "Crear batch"
2. Formulario: "Ingrese nivel inicial"  ❌
3. Usuario ingresa: 5000 mm
4. Sistema guarda: openingLevel = 5000
```

**DESPUÉS (propuesto):**
```
1. Usuario: "Crear batch"
2. Formulario: "Confirmar datos automáticos"  ✅
3. Sistema muestra:
   ┌──────────────────────────────────────────┐
   │ OPENING GAUGE (Automático)               │
   │                                          │
   │ Timestamp: 2025-12-10 08:00:00 (ahora)  │
   │ Nivel:     8,320.5 mm ⚡ (from radar)    │
   │ Temp:      20.1°C     ⚡ (from RTD)      │
   │ Presión:   1.013 bar  ⚡ (from sensor)   │
   │ API:       35.0°      ⚡ (from config)   │
   │                                          │
   │ TOV:       10,500.25 bbl (calculated)    │
   │ GOV:       10,450.12 bbl (calculated)    │
   │ GSV:       10,425.80 bbl (calculated)    │
   │ NSV:       10,400.50 bbl (calculated)    │
   │ Masa:      1,456,789 kg (calculated)     │
   │                                          │
   │ [✓] Datos correctos - Crear Batch       │
   │ [ ] Necesito ajustar manualmente →      │
   └──────────────────────────────────────────┘
```

4. Si usuario confirma → Batch creado con snapshot automático
5. Si necesita ajuste → Permite override manual (modo API 18.1)

#### Implementación Técnica

```typescript
// batch.service.ts

async captureOpeningGauge(tankId: string): Promise<GaugeSnapshot> {
  // 1. Obtener telemetría actual del tanque
  const telemetry = await this.telemetryService.getLatestTelemetry(tankId, [
    'level',
    'temperature',
    'pressure',
    'apiGravity',
    'bsw'
  ]);

  // 2. Obtener configuración del tanque
  const tankConfig = await this.tankService.getTankConfig(tankId);

  // 3. Calcular volúmenes usando rule engine existente
  const volumes = await this.volumeCalculationService.calculateVolumes({
    level: telemetry.level,
    temperature: telemetry.temperature,
    pressure: telemetry.pressure || 1.013, // atmospheric
    apiGravity: telemetry.apiGravity || tankConfig.defaultApiGravity,
    bsw: telemetry.bsw || 0,
    strappingTable: tankConfig.strappingTable
  });

  // 4. Crear snapshot
  return {
    timestamp: Date.now(),
    operator: this.authService.getCurrentUser().name,

    // Datos directos de telemetría
    level: telemetry.level,
    temperature: telemetry.temperature,
    pressure: telemetry.pressure || 1.013,
    apiGravity: telemetry.apiGravity || tankConfig.defaultApiGravity,
    bsw: telemetry.bsw || 0,

    // Volúmenes calculados
    tov: volumes.tov,
    gov: volumes.gov,
    gsv: volumes.gsv,
    nsv: volumes.nsv,
    mass: volumes.mass,
    wia: volumes.wia,

    // Metadatos
    captureMethod: 'automatic', // vs 'manual'
    dataSource: 'telemetry',
    radarDeviceId: tankConfig.radarDeviceId
  };
}

// Método para crear batch
async createBatch(params: CreateBatchParams): Promise<Batch> {
  // Validar estado del tanque
  const validation = await this.validateTankState(params.tankId);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Capturar opening gauge automáticamente
  const openingGauge = await this.captureOpeningGauge(params.tankId);

  // Crear batch
  const batch: Batch = {
    id: this.generateBatchId(),
    batchNumber: this.generateBatchNumber(),
    tankId: params.tankId,
    tankName: params.tankName,
    batchType: params.batchType || validation.detectedType,
    status: 'open',

    // Opening gauge
    openingTime: openingGauge.timestamp,
    openingOperator: openingGauge.operator,
    openingLevel: openingGauge.level,
    openingTemperature: openingGauge.temperature,
    openingApiGravity: openingGauge.apiGravity,
    openingTOV: openingGauge.tov,
    openingGOV: openingGauge.gov,
    openingGSV: openingGauge.gsv,
    openingNSV: openingGauge.nsv,
    openingMass: openingGauge.mass,
    openingWIA: openingGauge.wia,

    // Metadata
    destination: params.destination,
    transportVehicle: params.transportVehicle,
    sealNumbers: params.sealNumbers,
    notes: params.notes,

    createdAt: Date.now()
  };

  // Guardar en ThingsBoard
  await this.saveBatch(batch);

  // Registrar evento en audit trail
  await this.auditService.logEvent('BATCH_CREATED', {
    batchId: batch.id,
    tankId: batch.tankId,
    captureMethod: 'automatic'
  });

  return batch;
}
```

### MEJORA #2: Batch Basado en Timestamps (No en Nivel)

#### Nuevo Flujo de Usuario

```
┌─────────────────────────────────────────────────────────────┐
│  CREAR BATCH - OPCIÓN A: TIEMPO REAL                        │
│                                                               │
│  Tanque: [TK-102 - Diesel ▼]                                │
│                                                               │
│  ⚡ Crear batch con datos actuales                           │
│                                                               │
│  Tipo de operación:                                          │
│  ⦿ Receiving   ○ Dispensing   (auto-detectado: Dispensing)  │
│                                                               │
│  Información del transporte:                                 │
│  Vehículo:    [ABC-123____________]                          │
│  Conductor:   [Juan Pérez_________]                          │
│  Destino:     [Cliente XYZ________]                          │
│  Sellos:      [S001, S002_________]                          │
│                                                               │
│  Notas:       [_________________________]                    │
│               [_________________________]                    │
│                                                               │
│  [Crear Batch con Opening Gauge Actual]                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CREAR BATCH - OPCIÓN B: RANGO DE FECHAS (Histórico)        │
│                                                               │
│  📅 Crear batch desde datos históricos                       │
│                                                               │
│  Tanque: [TK-102 - Diesel ▼]                                │
│                                                               │
│  Período de la operación:                                    │
│                                                               │
│  Inicio:  [2025-12-10] [08:00:00] 🕐                        │
│  Fin:     [2025-12-10] [10:00:00] 🕐                        │
│                                                               │
│  ⚠️ El sistema obtendrá telemetría de estos timestamps      │
│                                                               │
│  Preview de datos:                                           │
│  ┌──────────────────────────────────────────────┐           │
│  │ Opening (08:00):  8,320 mm | 20°C | 10,400 bbl │        │
│  │ Closing (10:00):  7,120 mm | 19°C |  8,900 bbl │        │
│  │ Transferido:                       -1,500 bbl │        │
│  └──────────────────────────────────────────────┘           │
│                                                               │
│  [Crear Batch desde Histórico]                              │
└─────────────────────────────────────────────────────────────┘
```

#### Implementación

```typescript
// Crear batch desde rango de fechas
async createBatchFromDateRange(params: {
  tankId: string;
  startTime: number;
  endTime: number;
  batchType: 'receiving' | 'dispensing';
  metadata: BatchMetadata;
}): Promise<Batch> {

  // 1. Validar que hay datos históricos disponibles
  const dataAvailable = await this.telemetryService.checkDataAvailability(
    params.tankId,
    params.startTime,
    params.endTime
  );

  if (!dataAvailable) {
    throw new Error('No telemetry data available for specified time range');
  }

  // 2. Obtener snapshot de opening (startTime)
  const openingGauge = await this.captureHistoricalGauge(
    params.tankId,
    params.startTime
  );

  // 3. Obtener snapshot de closing (endTime)
  const closingGauge = await this.captureHistoricalGauge(
    params.tankId,
    params.endTime
  );

  // 4. Calcular cantidades transferidas
  const transferred = this.calculateTransferred(openingGauge, closingGauge);

  // 5. Crear batch ya cerrado (histórico)
  const batch: Batch = {
    id: this.generateBatchId(),
    batchNumber: this.generateBatchNumber(),
    tankId: params.tankId,
    batchType: params.batchType,
    status: 'closed', // Ya cerrado porque es histórico

    // Opening gauge
    ...this.mapGaugeToFields('opening', openingGauge),

    // Closing gauge
    ...this.mapGaugeToFields('closing', closingGauge),

    // Transferred
    transferredNSV: transferred.nsv,
    transferredMass: transferred.mass,
    transferredWIA: transferred.wia,

    // Metadata
    ...params.metadata,

    createdAt: Date.now(),
    closedAt: params.endTime
  };

  await this.saveBatch(batch);

  return batch;
}

// Capturar gauge histórico
private async captureHistoricalGauge(
  tankId: string,
  timestamp: number
): Promise<GaugeSnapshot> {

  // Buscar telemetría más cercana al timestamp
  const telemetry = await this.telemetryService.getTelemetryAtTimestamp(
    tankId,
    timestamp,
    ['level', 'temperature', 'pressure', 'apiGravity', 'bsw'],
    { tolerance: 60000 } // 1 minuto de tolerancia
  );

  if (!telemetry) {
    throw new Error(`No telemetry found near timestamp ${new Date(timestamp)}`);
  }

  // Calcular volúmenes
  const tankConfig = await this.tankService.getTankConfig(tankId);
  const volumes = await this.volumeCalculationService.calculateVolumes({
    level: telemetry.level,
    temperature: telemetry.temperature,
    pressure: telemetry.pressure || 1.013,
    apiGravity: telemetry.apiGravity || tankConfig.defaultApiGravity,
    bsw: telemetry.bsw || 0,
    strappingTable: tankConfig.strappingTable
  });

  return {
    timestamp: telemetry.timestamp,
    operator: 'SYSTEM', // Histórico
    level: telemetry.level,
    temperature: telemetry.temperature,
    pressure: telemetry.pressure || 1.013,
    apiGravity: telemetry.apiGravity || tankConfig.defaultApiGravity,
    bsw: telemetry.bsw || 0,
    ...volumes,
    captureMethod: 'historical',
    dataSource: 'telemetry_history'
  };
}
```

### MEJORA #3: Detección Automática de Movimiento

```typescript
// movement-detection.service.ts

/**
 * Detecta automáticamente inicio de movimiento de producto en tanque
 */
detectMovement(tankId: string): Observable<MovementEvent> {
  return this.telemetryService.observeTelemetry(tankId, 'level').pipe(

    // Buffer de 5 lecturas (50 segundos si frecuencia es 10s)
    bufferCount(5, 1),

    // Calcular rate of change
    map(levels => {
      const timeSpan = (levels.length - 1) * 10; // segundos
      const levelChange = levels[levels.length - 1] - levels[0];
      const rate = levelChange / timeSpan; // mm/s

      return {
        tankId,
        timestamp: Date.now(),
        currentLevel: levels[levels.length - 1],
        rate, // mm/s
        ratePerHour: rate * 3600 // mm/h
      };
    }),

    // Clasificar estado
    map(data => {
      const IDLE_THRESHOLD = 5; // mm/h

      if (Math.abs(data.ratePerHour) < IDLE_THRESHOLD) {
        return { ...data, status: 'idle', movement: null };
      }

      if (data.ratePerHour > 0) {
        return { ...data, status: 'active', movement: 'receiving' };
      } else {
        return { ...data, status: 'active', movement: 'dispensing' };
      }
    }),

    // Detectar cambios de estado
    distinctUntilChanged((prev, curr) =>
      prev.status === curr.status && prev.movement === curr.movement
    ),

    // Solo emitir cuando cambia
    filter(data => data.status === 'active'),

    // Emitir evento
    tap(data => {
      this.auditService.logEvent('MOVEMENT_DETECTED', {
        tankId: data.tankId,
        movementType: data.movement,
        rate: data.ratePerHour
      });

      // Opcional: Crear alarma si es movimiento inesperado
      if (!this.isScheduledMovement(data.tankId)) {
        this.alarmService.createAlarm({
          type: 'UNEXPECTED_MOVEMENT',
          severity: 'WARNING',
          tankId: data.tankId,
          message: `Unexpected ${data.movement} detected`
        });
      }
    })
  );
}

// Sugerencia automática de batch
suggestBatchCreation(movementEvent: MovementEvent): BatchSuggestion {
  return {
    suggested: true,
    tankId: movementEvent.tankId,
    batchType: movementEvent.movement,
    reason: 'Movement detected automatically',
    confidence: this.calculateConfidence(movementEvent),
    estimatedDuration: this.estimateDuration(movementEvent),
    message: `${movementEvent.movement} operation detected. Create batch?`
  };
}
```

### MEJORA #4: Sistema de Recálculo Robusto

```typescript
// Interfaz de recálculo
interface BatchRecalculationParams {
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
}

async recalculateBatch(params: BatchRecalculationParams): Promise<Batch> {
  // 1. Obtener batch original
  const originalBatch = await this.getBatchById(params.batchId);

  if (originalBatch.status !== 'closed') {
    throw new Error('Can only recalculate closed batches');
  }

  // 2. Crear copia del batch original para audit trail
  const batchHistory = { ...originalBatch };
  await this.saveBatchHistory(batchHistory);

  // 3. Aplicar nuevos valores
  const updatedBatch = { ...originalBatch };

  if (params.updatedValues.openingTemperature !== undefined) {
    updatedBatch.openingTemperature = params.updatedValues.openingTemperature;
  }
  // ... aplicar otros valores

  // 4. Recalcular volúmenes de opening
  if (params.updatedValues.openingTemperature ||
      params.updatedValues.openingApiGravity ||
      params.updatedValues.openingBsw) {

    const tankConfig = await this.tankService.getTankConfig(updatedBatch.tankId);
    const openingVolumes = await this.volumeCalculationService.calculateVolumes({
      level: updatedBatch.openingLevel,
      temperature: updatedBatch.openingTemperature,
      pressure: updatedBatch.openingPressure || 1.013,
      apiGravity: updatedBatch.openingApiGravity,
      bsw: updatedBatch.openingBsw || 0,
      strappingTable: tankConfig.strappingTable
    });

    updatedBatch.openingTOV = openingVolumes.tov;
    updatedBatch.openingGOV = openingVolumes.gov;
    updatedBatch.openingGSV = openingVolumes.gsv;
    updatedBatch.openingNSV = openingVolumes.nsv;
    updatedBatch.openingMass = openingVolumes.mass;
    updatedBatch.openingWIA = openingVolumes.wia;
  }

  // 5. Recalcular volúmenes de closing
  // ... similar al opening

  // 6. Recalcular transferred quantities
  updatedBatch.transferredNSV = Math.abs(
    updatedBatch.closingNSV - updatedBatch.openingNSV
  );
  updatedBatch.transferredMass = Math.abs(
    updatedBatch.closingMass - updatedBatch.openingMass
  );

  // 7. Actualizar status y metadata
  updatedBatch.status = 'recalculated';
  updatedBatch.recalculatedAt = Date.now();
  updatedBatch.recalculatedBy = params.recalculatedBy;
  updatedBatch.recalculationReason = params.reason;

  // 8. Guardar batch recalculado
  await this.saveBatch(updatedBatch);

  // 9. Registrar en audit trail
  await this.auditService.logEvent('BATCH_RECALCULATED', {
    batchId: updatedBatch.id,
    reason: params.reason,
    changes: this.compareObjects(originalBatch, updatedBatch),
    recalculatedBy: params.recalculatedBy
  });

  // 10. Generar nuevo PDF con watermark "RECALCULATED"
  await this.batchPdfService.regenerateBatchPdf(
    updatedBatch.tenantId,
    updatedBatch,
    params.recalculatedBy
  );

  return updatedBatch;
}
```

### MEJORA #5: Integración con Laboratorio

```typescript
// Conectar resultados de laboratorio con batches abiertos

interface LabResult {
  id: string;
  tankId: string;
  timestamp: number;
  apiGravity: number;
  bsw: number;
  density?: number;
  sampleTemperature: number;
  analyst: string;
  notes?: string;
}

async associateLabResultWithBatch(labResult: LabResult): Promise<void> {
  // Buscar batch abierto o reciente para este tanque
  const openBatches = await this.findOpenBatches(labResult.tankId);

  if (openBatches.length === 0) {
    // No hay batch abierto, solo guardar resultado
    return;
  }

  // Sugerir asociación al operador
  const batch = openBatches[0];

  // Verificar si hay diferencia significativa
  const apiDifference = Math.abs(
    batch.openingApiGravity - labResult.apiGravity
  );

  if (apiDifference > 0.5) {
    // Diferencia significativa, sugerir recálculo
    await this.notificationService.notify({
      type: 'LAB_RESULT_VARIANCE',
      message: `Lab result shows API Gravity ${labResult.apiGravity}°, ` +
               `batch ${batch.batchNumber} used ${batch.openingApiGravity}°. ` +
               `Recalculate batch?`,
      actions: [
        { label: 'Recalculate', action: 'recalculate' },
        { label: 'Ignore', action: 'ignore' }
      ]
    });
  }
}
```

---

## Comparación Funcional

### Tabla Comparativa: TankMaster vs GDT Actual vs GDT Propuesto

| Funcionalidad | TankMaster | GDT Actual | GDT Propuesto |
|---------------|------------|------------|---------------|
| **Creación de Batch** |
| Captura automática de nivel | ✅ Sí | ❌ No (manual) | ✅ Sí |
| Captura automática de temperatura | ✅ Sí | ❌ No | ✅ Sí |
| Soporte API MPMS 18.2 | ✅ Sí | ❌ No | ✅ Sí |
| Soporte API MPMS 18.1 (manual) | ✅ Sí | ⚠️ Parcial | ✅ Sí |
| Detección automática de tipo | ✅ Sí | ❌ No | ✅ Sí |
| Validación de estado del tanque | ✅ Sí | ❌ No | ✅ Sí |
| **Batch desde histórico** |
| Crear batch con rango de fechas | ✅ Sí | ❌ No | ✅ Sí |
| Búsqueda de telemetría histórica | ✅ Sí | ⚠️ Manual | ✅ Sí |
| **Closing Gauge** |
| Captura automática al cerrar | ✅ Sí | ❌ No | ✅ Sí |
| Cálculo automático de transferred | ✅ Sí | ✅ Sí | ✅ Sí |
| **Recálculo** |
| Recalcular batches cerrados | ✅ Sí (365 días) | ⚠️ Limitado | ✅ Sí |
| Actualizar API Gravity de lab | ✅ Sí | ❌ No | ✅ Sí |
| Actualizar temperatura | ✅ Sí | ❌ No | ✅ Sí |
| Audit trail de recálculos | ✅ Sí | ⚠️ Básico | ✅ Sí |
| Comparación antes/después | ✅ Sí | ❌ No | ✅ Sí |
| **PDFs** |
| Generación automática | ✅ Sí | ✅ Sí | ✅ Sí |
| QR Code | ✅ Sí | ✅ Sí | ✅ Sí |
| Firma digital | ✅ Sí | ✅ Sí (SHA-256) | ✅ Sí |
| Watermark "RECALCULATED" | ✅ Sí | ⚠️ Mencionado | ✅ Sí |
| **Integraciones** |
| Integración con laboratorio | ✅ Sí | ❌ No | ✅ Sí |
| Detección de movimiento | ✅ Sí | ❌ No | ✅ Sí |
| Alertas de movimiento inesperado | ✅ Sí | ❌ No | ✅ Sí |
| **Almacenamiento** |
| Retención de batches | ✅ 365 días | ✅ Ilimitado | ✅ Ilimitado |
| Almacenamiento de PDFs | ✅ Permanente | ⚠️ No impl. | ✅ Permanente |
| **Cumplimiento** |
| OIML R85 ready | ✅ Sí | ⚠️ Parcial | ✅ Sí |
| API MPMS compliant | ✅ Sí | ⚠️ Parcial | ✅ Sí |
| Audit trail completo | ✅ Sí | ⚠️ Básico | ✅ Sí |

**Leyenda:**
- ✅ Sí: Implementado completamente
- ⚠️ Parcial: Implementado parcialmente o con limitaciones
- ❌ No: No implementado

---

## Recomendaciones

### Priorización de Mejoras

#### 🔴 CRÍTICAS (Implementar Inmediatamente)

**1. Captura Automática de Gauges**
- **Razón:** Elimina errores humanos, cumple API MPMS 18.2
- **Esfuerzo:** 3-4 días
- **Impacto:** Alto - Cambia toda la experiencia de usuario
- **Dependencias:** Ninguna, telemetría ya existe

**2. Validación de Estado del Tanque**
- **Razón:** Previene batches inválidos
- **Esfuerzo:** 2 días
- **Impacto:** Medio - Mejora calidad de datos
- **Dependencias:** Movement detection (puede ser básico)

#### 🟠 ALTAS (Implementar en FASE 2.5)

**3. Batch desde Rango de Fechas**
- **Razón:** Permite crear batches de operaciones pasadas
- **Esfuerzo:** 4-5 días
- **Impacto:** Alto - Muy útil para correcciones
- **Dependencias:** Captura automática

**4. Sistema de Recálculo Robusto**
- **Razón:** Necesario para auditoría y disputas
- **Esfuerzo:** 5-6 días
- **Impacto:** Alto - Cumplimiento regulatorio
- **Dependencias:** Audit trail mejorado

#### 🟡 MEDIAS (Implementar en FASE 3)

**5. Detección Automática de Movimiento**
- **Razón:** Automatización completa, proactivo
- **Esfuerzo:** 1 semana
- **Impacto:** Medio - Conveniencia
- **Dependencias:** Rule engine de ThingsBoard

**6. Integración con Laboratorio**
- **Razón:** Actualización automática de API Gravity
- **Esfuerzo:** 1 semana
- **Impacto:** Medio - Mejora precisión
- **Dependencias:** Página de laboratorio ya existe

### Plan de Implementación Sugerido

```
FASE 2.5 - MEJORAS DE BATCHES (3 semanas)
├─ Sprint 1 (1 semana)
│  ├─ Captura automática de gauges
│  ├─ Validación de estado del tanque
│  └─ Testing
│
├─ Sprint 2 (1 semana)
│  ├─ Batch desde rango de fechas
│  ├─ Preview de datos históricos
│  └─ Testing
│
└─ Sprint 3 (1 semana)
   ├─ Sistema de recálculo robusto
   ├─ Comparación antes/después
   ├─ PDF con watermark "RECALCULATED"
   └─ Testing end-to-end

FASE 3 - AUTOMATIZACIÓN AVANZADA (2 semanas)
├─ Sprint 4 (1 semana)
│  ├─ Detección automática de movimiento
│  ├─ Sugerencia de creación de batch
│  └─ Testing
│
└─ Sprint 5 (1 semana)
   ├─ Integración con laboratorio
   ├─ Notificaciones de variación
   └─ Testing end-to-end
```

### Estimación de Esfuerzo Total

| Mejora | Story Points | Días | Prioridad |
|--------|-------------|------|-----------|
| Captura automática gauges | 13 | 3-4 | 🔴 Crítica |
| Validación estado tanque | 8 | 2 | 🔴 Crítica |
| Batch desde rango fechas | 13 | 4-5 | 🟠 Alta |
| Recálculo robusto | 21 | 5-6 | 🟠 Alta |
| Detección movimiento | 13 | 5 | 🟡 Media |
| Integración laboratorio | 13 | 5 | 🟡 Media |
| **TOTAL** | **81 SP** | **24-30 días** | |

**Con 1 desarrollador full-time: 5-6 semanas**
**Con 2 desarrolladores: 3-4 semanas**

---

## Conclusiones Finales

### Resumen de Hallazgos

1. **La implementación actual tiene una base sólida**
   - Estructura de datos correcta ✅
   - Cálculos volumétricos funcionando ✅
   - Sistema de PDFs profesional ✅

2. **Pero tiene un concepto incorrecto fundamental**
   - Requiere ingreso manual de nivel ❌
   - No aprovecha la telemetría automática ❌
   - No cumple API MPMS 18.2 completamente ❌

3. **Las mejoras propuestas son viables**
   - No requieren cambios de arquitectura
   - Aprovechan infraestructura existente
   - Son incrementales y probables

4. **El sistema puede superar a TankMaster**
   - Con estas mejoras, GDT sería más flexible
   - Mejor integración con ThingsBoard
   - Más opciones de automatización

### Próximos Pasos Recomendados

1. **Revisar y aprobar** este documento
2. **Priorizar** mejoras críticas (captura automática)
3. **Crear** issues/tickets en el backlog
4. **Planificar** Sprint 1 de FASE 2.5
5. **Implementar** y validar con usuario final
6. **Iterar** basado en feedback

---

**Fin del Análisis**

**Contacto:** Para preguntas o aclaraciones sobre este análisis, contactar al equipo de desarrollo GDT.
