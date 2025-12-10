# Roadmap Principal - Desarrollo Nativo ThingsBoard GDT

**Fecha:** 1 de diciembre de 2025
**Versión:** 1.0
**Duración Estimada:** 10-12 meses

---

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Fases del Proyecto](#fases-del-proyecto)
3. [Tareas Detalladas](#tareas-detalladas)
4. [Estimaciones de Tiempo](#estimaciones-de-tiempo)
5. [Dependencias](#dependencias)
6. [Recursos Necesarios](#recursos-necesarios)

---

## Resumen Ejecutivo

Este roadmap define el desarrollo completo del sistema GDT Tank Gauging usando páginas nativas de ThingsBoard PE, reemplazando el enfoque anterior basado en widgets.

### Objetivos Clave

1. Separar funcionalidades en páginas dedicadas
2. Implementar sistema completo de batch management
3. Crear sistema robusto de reportes e informes
4. Implementar visualización de históricos y tendencias
5. Cumplir con requisitos OIML R85

### Métricas de Éxito

- ✅ Todas las funcionalidades de widgets migradas a páginas nativas
- ✅ Sistema de batch management certificable
- ✅ Al menos 8 tipos de reportes disponibles
- ✅ Event logger OIML R85 operacional
- ✅ Exportaciones automáticas configurables

---

## Fases del Proyecto

### FASE 1: Separación y Migración (2 meses)

**Objetivo:** Migrar funcionalidades existentes de widgets a páginas dedicadas

**Entregables:**
- Página de Aforo Manual independiente
- Página de Laboratorio independiente
- Tank Monitoring sin formularios manuales (delegados a páginas dedicadas)

---

### FASE 2: Batch Management System (2.5 meses)

**Objetivo:** Implementar sistema completo de gestión de batches para custody transfer

**Entregables:**
- Gestión de batches (abrir, cerrar, recalcular)
- Opening/closing gauges automáticos
- Batch reports PDF
- Historial de batches

---

### FASE 3: Sistema de Reportes e Informes (2.5 meses)

**Objetivo:** Crear sistema completo de reportes, exportaciones y análisis

**Entregables:**
- 8+ tipos de reportes
- Exportaciones CSV/Excel/PDF
- Configurador de exportaciones automáticas
- Reportes programados

---

### FASE 4: Históricos y Tendencias (1.5 meses)

**Objetivo:** Visualización avanzada de datos históricos

**Entregables:**
- Visualizador de tendencias
- Comparación de datos históricos
- Análisis de periodos
- Gráficos interactivos

---

### FASE 5: Auditoría y Cumplimiento (1.5 meses)

**Objetivo:** Cumplir requisitos OIML R85

**Entregables:**
- Event logger completo
- Compliance reports
- Sellado electrónico
- Audit trail viewer

---

### FASE 6: Integraciones y Optimización (2 meses)

**Objetivo:** Integraciones externas y optimizaciones finales

**Entregables:**
- Configuración de OPC UA
- APIs de integración
- Optimizaciones de performance
- Documentación completa

---

## Tareas Detalladas

### FASE 1: Separación y Migración

#### Epic 1.1: Página de Aforo Manual

**Duración:** 3 semanas

##### Tarea 1.1.1: Crear estructura de página Aforo Manual
- **Descripción:** Crear componente principal y estructura de archivos
- **Archivos:**
  - `aforo-manual/aforo-manual.component.ts`
  - `aforo-manual/aforo-manual.component.html`
  - `aforo-manual/aforo-manual.component.scss`
- **Estimación:** 2 días

##### Tarea 1.1.2: Componente de Formulario de Aforo
- **Descripción:** Crear formulario para registrar medición manual de nivel
- **Funcionalidades:**
  - Selector de tanque
  - Input de nivel (ft/in con fracciones)
  - Input de temperatura
  - Input de fecha/hora
  - Campo de notas
  - Validaciones
- **Archivos:**
  - `aforo-manual/components/aforo-form/aforo-form.component.ts`
- **Estimación:** 4 días

##### Tarea 1.1.3: Componente de Historial de Aforos
- **Descripción:** Tabla con historial de mediciones manuales
- **Funcionalidades:**
  - Tabla Material con paginación
  - Filtros por tanque y fecha
  - Exportación a CSV
  - Comparación automático vs manual
  - Cálculo de desviación
- **Archivos:**
  - `aforo-manual/components/aforo-history/aforo-history.component.ts`
- **Estimación:** 4 días

##### Tarea 1.1.4: Servicio de Aforo Manual
- **Descripción:** Servicio para gestionar mediciones manuales
- **Métodos:**
  - `saveManualGauge(tankId, entry)`
  - `getManualGaugeHistory(tankId, startDate, endDate)`
  - `compareWithAutomatic(tankId, timestamp)`
  - `exportToCSV(data)`
- **Archivos:**
  - `aforo-manual/services/aforo.service.ts`
- **Estimación:** 3 días

##### Tarea 1.1.5: Integración y Testing
- **Descripción:** Integrar con ThingsBoard API y testing
- **Estimación:** 2 días

---

#### Epic 1.2: Página de Laboratorio

**Duración:** 3 semanas

##### Tarea 1.2.1: Crear estructura de página Laboratorio
- **Descripción:** Crear componente principal
- **Estimación:** 2 días

##### Tarea 1.2.2: Componente de Formulario de Laboratorio
- **Descripción:** Formulario para registrar análisis de laboratorio
- **Funcionalidades:**
  - Selector de tanque
  - Input de API Gravity
  - Input de BS&W (%)
  - Input de densidad (opcional)
  - Input de temperatura de muestra
  - Fecha/hora de análisis
  - Campo de observaciones
  - ID de analista
- **Estimación:** 4 días

##### Tarea 1.2.3: Componente de Historial de Análisis
- **Descripción:** Tabla con historial de análisis de laboratorio
- **Funcionalidades:**
  - Tabla con paginación
  - Filtros por tanque, fecha, analista
  - Gráfico de tendencia de API Gravity
  - Gráfico de tendencia de BS&W
  - Alertas de valores fuera de rango
  - Exportación
- **Estimación:** 5 días

##### Tarea 1.2.4: Servicio de Laboratorio
- **Descripción:** Servicio para gestionar análisis de laboratorio
- **Estimación:** 3 días

##### Tarea 1.2.5: Integración y Testing
- **Estimación:** 2 días

---

#### Epic 1.3: Actualización de Tank Monitoring

**Duración:** 1 semana

##### Tarea 1.3.1: Remover Formularios Manuales
- **Descripción:** Eliminar formularios de aforo y laboratorio de tank-detail
- **Estimación:** 2 días

##### Tarea 1.3.2: Agregar Enlaces a Páginas Dedicadas
- **Descripción:** Botones para navegar a aforo-manual y laboratorio
- **Estimación:** 1 día

##### Tarea 1.3.3: Testing de Integración
- **Estimación:** 2 días

---

### FASE 2: Batch Management System

#### Epic 2.1: Modelo de Datos de Batch

**Duración:** 1 semana

##### Tarea 2.1.1: Definir Modelo de Batch
- **Descripción:** Crear modelos TypeScript para batches
- **Modelo:**
  ```typescript
  interface Batch {
    id: string;
    batchNumber: string;
    tankId: string;
    tankName: string;
    batchType: 'receiving' | 'dispensing';
    status: 'open' | 'closed' | 'recalculated' | 'voided';

    // Opening Gauge
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

    // Closing Gauge
    closingTime?: number;
    closingOperator?: string;
    closingLevel?: number;
    closingTemperature?: number;
    closingApiGravity?: number;
    closingTOV?: number;
    closingGOV?: number;
    closingGSV?: number;
    closingNSV?: number;
    closingMass?: number;
    closingWIA?: number;

    // Transfer
    transferredNSV?: number;
    transferredMass?: number;
    transferredWIA?: number;

    // Metadata
    destination?: string;
    transportVehicle?: string;
    sealNumbers?: string[];
    notes?: string;

    // Timestamps
    createdAt: number;
    closedAt?: number;
    recalculatedAt?: number;

    // Report
    reportPdfUrl?: string;
  }
  ```
- **Estimación:** 3 días

##### Tarea 2.1.2: Crear Batch Asset Type en ThingsBoard
- **Descripción:** Configurar asset type "Batch" en ThingsBoard
- **Estimación:** 2 días

---

#### Epic 2.2: Gestión de Batches

**Duración:** 3 semanas

##### Tarea 2.2.1: Componente de Lista de Batches
- **Descripción:** Lista de batches con filtros
- **Funcionalidades:**
  - Tabla con todos los batches
  - Filtros: tanque, tipo, estado, rango de fechas
  - Indicadores de estado (open, closed, etc.)
  - Acciones: Ver detalle, Ver PDF, Recalcular
- **Estimación:** 4 días

##### Tarea 2.2.2: Componente de Crear Batch
- **Descripción:** Formulario para abrir nuevo batch
- **Funcionalidades:**
  - Selector de tanque
  - Input de batch number (auto-generado o manual)
  - Selector de tipo (receiving/dispensing)
  - Inputs: destination, vehicle, seal numbers
  - Captura automática de opening gauge
  - Validaciones
- **Estimación:** 5 días

##### Tarea 2.2.3: Componente de Cerrar Batch
- **Descripción:** Diálogo para cerrar batch
- **Funcionalidades:**
  - Mostrar información de opening gauge
  - Captura automática de closing gauge
  - Cálculo automático de transferred quantities
  - Confirmación con resumen
- **Estimación:** 4 días

##### Tarea 2.2.4: Componente de Recalcular Batch
- **Descripción:** Funcionalidad para recalcular batch cerrado
- **Funcionalidades:**
  - Inputs para nuevos valores (API gravity, temp, BS&W)
  - Recálculo completo de volúmenes
  - Audit trail del recálculo
  - Regeneración de PDF con watermark "RECALCULATED"
- **Estimación:** 5 días

##### Tarea 2.2.5: Servicio de Batch Management
- **Descripción:** Servicio para gestionar batches
- **Métodos:**
  - `createBatch(data)`
  - `closeBatch(batchId)`
  - `recalculateBatch(batchId, newValues)`
  - `voidBatch(batchId, reason)`
  - `getBatches(filters)`
  - `getBatchById(batchId)`
- **Estimación:** 4 días

---

#### Epic 2.3: Batch Reports PDF

**Duración:** 2 semanas

##### Tarea 2.3.1: Backend Service para PDF Generation
- **Descripción:** Servicio Python/Node.js para generar PDFs
- **Tecnología:** jsPDF o Python reportlab
- **Estimación:** 5 días

##### Tarea 2.3.2: Template de Batch Report
- **Descripción:** Diseñar template de batch report
- **Contenido:**
  - Header con logo y título
  - Batch information
  - Opening gauge table
  - Closing gauge table
  - Transferred quantities
  - API MPMS calculations breakdown
  - Signatures
  - QR code
  - Watermark si recalculado
- **Estimación:** 4 días

##### Tarea 2.3.3: Integración con Frontend
- **Descripción:** Botón para descargar/ver PDF desde frontend
- **Estimación:** 2 días

##### Tarea 2.3.4: Almacenamiento de PDFs
- **Descripción:** Configurar almacenamiento (S3, local, etc.)
- **Estimación:** 2 días

---

### FASE 3: Sistema de Reportes e Informes

**[Ver REPORTES_E_INFORMES.md para detalles completos]**

#### Epic 3.1: Reportes de Inventario

**Duración:** 2 semanas

Tipos de reportes:
1. Daily Inventory Report
2. Tank Inventory Summary
3. Product Inventory by Group
4. Tank Status Report

---

#### Epic 3.2: Mass Balance Report

**Duración:** 2 semanas

Funcionalidades:
- Cálculo de balance por tanque
- Detección de discrepancias
- Alertas de fugas potenciales
- Reporte por grupo de tanques

---

#### Epic 3.3: Reportes Históricos

**Duración:** 1.5 semanas

Tipos:
1. Historical Level Trends
2. Historical Volume Trends
3. Temperature Profile Report
4. Alarm History Report

---

#### Epic 3.4: Configurador de Exportaciones

**Duración:** 2 semanas

Funcionalidades:
- Configurar exportaciones automáticas
- Scheduling (cron expressions)
- Formatos: CSV, Excel, PDF
- Destinos: Email, FTP, local
- Notificaciones

---

### FASE 4: Históricos y Tendencias

#### Epic 4.1: Visualizador de Tendencias

**Duración:** 3 semanas

##### Tarea 4.1.1: Componente de Trend Viewer
- **Descripción:** Gráfico interactivo de tendencias
- **Tecnología:** ECharts
- **Funcionalidades:**
  - Selector de variables (nivel, temp, volúmenes)
  - Selector de rango de tiempo
  - Zoom y pan
  - Múltiples tanques en un gráfico
  - Export de imagen
- **Estimación:** 8 días

##### Tarea 4.1.2: Comparación de Datos
- **Descripción:** Comparar datos entre tanques o periodos
- **Estimación:** 5 días

##### Tarea 4.1.3: Análisis Estadístico
- **Descripción:** Cálculos estadísticos (promedio, min, max, desviación)
- **Estimación:** 3 días

---

#### Epic 4.2: Data Table Histórica

**Duración:** 1.5 semanas

##### Tarea 4.2.1: Tabla de Datos Históricos
- **Descripción:** Tabla con datos históricos
- **Funcionalidades:**
  - Paginación server-side
  - Filtros por fecha, tanque, variable
  - Exportación CSV/Excel
  - Agregaciones (hourly, daily, monthly)
- **Estimación:** 5 días

---

### FASE 5: Auditoría y Cumplimiento

#### Epic 5.1: Event Logger OIML R85

**Duración:** 3 semanas

##### Tarea 5.1.1: Event Logger Service
- **Descripción:** Servicio para registrar eventos metrológicos
- **Eventos a registrar:**
  - Cambios de configuración
  - Cambios de parámetros de radar
  - Apertura/cierre de batches
  - Recálculo de batches
  - Sellado/desellado de dispositivos
  - Cambios de strapping tables
- **Estimación:** 6 días

##### Tarea 5.1.2: Componente de Event Log Viewer
- **Descripción:** Visualizador de audit trail
- **Funcionalidades:**
  - Tabla de eventos
  - Filtros: tipo, usuario, fecha, dispositivo
  - Búsqueda
  - Exportación
  - Verificación de firmas
- **Estimación:** 5 días

##### Tarea 5.1.3: Firmas Digitales
- **Descripción:** Implementar firmas SHA-256 para eventos
- **Estimación:** 4 días

---

#### Epic 5.2: Sellado Electrónico

**Duración:** 1.5 semanas

##### Tarea 5.2.1: Implementar Seal Status
- **Descripción:** Atributo `seal_status` en dispositivos
- **Estimación:** 2 días

##### Tarea 5.2.2: Componente de Seal Management
- **Descripción:** Interfaz para sellar/desellar dispositivos
- **Estimación:** 3 días

##### Tarea 5.2.3: Validación en Gateway
- **Descripción:** Gateway valida seal_status antes de escritura
- **Estimación:** 3 días

---

#### Epic 5.3: Compliance Reports

**Duración:** 1 semana

##### Tarea 5.3.1: OIML R85 Compliance Report
- **Descripción:** Reporte de cumplimiento OIML R85
- **Estimación:** 3 días

##### Tarea 5.3.2: Audit Summary Report
- **Descripción:** Resumen de eventos de auditoría
- **Estimación:** 2 días

---

### FASE 6: Integraciones y Optimización

#### Epic 6.1: Configuración de Integraciones

**Duración:** 3 semanas

##### Tarea 6.1.1: Página de Configuración de OPC UA
- **Descripción:** Interfaz para configurar servidor OPC UA
- **Estimación:** 5 días

##### Tarea 6.1.2: Configuración de Export Scheduler
- **Descripción:** Ya cubierto en FASE 3 Epic 3.4
- **Estimación:** 0 días

##### Tarea 6.1.3: API Configuration
- **Descripción:** Configuración de APIs de integración
- **Estimación:** 5 días

---

#### Epic 6.2: Optimizaciones

**Duración:** 2 semanas

##### Tarea 6.2.1: Performance Optimization
- **Descripción:** Optimizar queries, caching, lazy loading
- **Estimación:** 5 días

##### Tarea 6.2.2: UX Improvements
- **Descripción:** Mejoras de UX basadas en feedback
- **Estimación:** 4 días

##### Tarea 6.2.3: Testing End-to-End
- **Descripción:** Testing completo de todas las páginas
- **Estimación:** 5 días

---

#### Epic 6.3: Documentación

**Duración:** 2 semanas

##### Tarea 6.3.1: Documentación Técnica
- **Descripción:** Documentar arquitectura y código
- **Estimación:** 5 días

##### Tarea 6.3.2: Manual de Usuario
- **Descripción:** Manual de usuario completo
- **Estimación:** 5 días

##### Tarea 6.3.3: Guías de Configuración
- **Descripción:** Guías para configurar sistema
- **Estimación:** 4 días

---

## Estimaciones de Tiempo

### Resumen por Fase

| Fase | Duración | Tareas | Story Points |
|------|----------|--------|-------------|
| **FASE 1: Separación y Migración** | 2 meses | 15 | 80 |
| **FASE 2: Batch Management** | 2.5 meses | 14 | 100 |
| **FASE 3: Reportes e Informes** | 2.5 meses | 20 | 110 |
| **FASE 4: Históricos y Tendencias** | 1.5 meses | 7 | 60 |
| **FASE 5: Auditoría y Cumplimiento** | 1.5 meses | 9 | 65 |
| **FASE 6: Integraciones y Optimización** | 2 meses | 12 | 85 |
| **TOTAL** | **12 meses** | **77 tareas** | **500 SP** |

### Estimación con Buffer

Aplicando buffer del 20% para contingencias:

**Duración Total Estimada: 12-14 meses**

---

## Dependencias

### Dependencias entre Fases

```
FASE 1 (Separación)
    ↓
FASE 2 (Batch Management)
    ↓
FASE 3 (Reportes) ← FASE 4 (Históricos)
    ↓
FASE 5 (Auditoría)
    ↓
FASE 6 (Integraciones)
```

### Dependencias Críticas

1. FASE 2 depende de FASE 1 (necesita servicios de aforo/laboratorio)
2. FASE 3 puede empezar en paralelo con FASE 4
3. FASE 5 depende de FASE 2 y 3 (eventos de batches y reportes)
4. FASE 6 puede ejecutarse en paralelo con FASE 5

---

## Recursos Necesarios

### Equipo de Desarrollo

**Frontend Team (Full time):**
- 1× Senior Angular Developer (todas las fases)
- 1× Mid-level Angular Developer (Fases 2-6)

**Backend Team (Part time):**
- 0.5× Backend Developer (Python/Node.js para PDF generation y servicios)

**Design & QA (Part time):**
- 0.3× UX/UI Designer (diseño de nuevas páginas)
- 0.5× QA Engineer (testing)

**Total FTE:** 2.8 personas

### Tecnologías

- **Frontend:** Angular 15+, Material Design, ECharts
- **Backend Services:** Python (PDF generation, event logger)
- **PDF Generation:** jsPDF o Python reportlab
- **Storage:** S3 o sistema de archivos local
- **Scheduler:** Cron jobs o scheduler de ThingsBoard

### Presupuesto Estimado

**Desarrollo (12 meses):**
- Salarios equipo: $180-240K USD
- Infraestructura: $8K USD
- Software licenses: $3K USD
- **Subtotal:** $191-251K USD

**Buffer (20%):** $38-50K USD

**Total Proyecto:** **$230-300K USD**

---

## Métricas de Progreso

### KPIs por Fase

**FASE 1:**
- ✅ Páginas de aforo y laboratorio funcionando
- ✅ 100% formularios removidos de tank-monitoring

**FASE 2:**
- ✅ Sistema de batches operacional
- ✅ PDFs generándose automáticamente

**FASE 3:**
- ✅ 8 tipos de reportes disponibles
- ✅ Exportaciones automáticas configuradas

**FASE 4:**
- ✅ Gráficos de tendencias interactivos
- ✅ Comparaciones funcionando

**FASE 5:**
- ✅ Event logger registrando todos los eventos
- ✅ Sellado electrónico funcional

**FASE 6:**
- ✅ Integraciones configuradas
- ✅ Documentación completa

---

## Riesgos e Mitigaciones

### Riesgos Identificados

1. **Complejidad de PDF Generation**
   - Mitigación: Usar librería probada (jsPDF)
   - Plan B: Servicio externo de PDF generation

2. **Performance con Grandes Volúmenes de Datos**
   - Mitigación: Implementar paginación server-side
   - Caching agresivo

3. **Integración con ThingsBoard API**
   - Mitigación: Testing exhaustivo
   - Consultar documentación oficial

4. **Cumplimiento OIML R85**
   - Mitigación: Consultar con experto en metrología
   - Pre-assessment con organismo certificador

---

## Próximos Pasos Inmediatos

### Semana 1-2
1. ✅ Aprobar este roadmap con stakeholders
2. ✅ Crear repositorio de documentación
3. ✅ Setup de proyecto (branch, environment)
4. ✅ Diseño de mockups de páginas nuevas

### Mes 1
1. Iniciar FASE 1: Página de Aforo Manual
2. Setup de servicios compartidos
3. Crear modelos de datos

### Mes 2
1. Completar FASE 1
2. Iniciar FASE 2: Batch Management

---

## Conclusión

Este roadmap proporciona una hoja de ruta clara y detallada para el desarrollo del sistema GDT Tank Gauging con páginas nativas de ThingsBoard PE. La ejecución disciplinada de estas fases resultará en un sistema robusto, certificable y mantenible.

**Aprobación Requerida:** Gerente de Proyecto, Tech Lead, Product Owner
**Fecha de Revisión:** 1 de diciembre de 2025
