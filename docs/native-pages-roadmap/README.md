# Roadmap de Desarrollo Nativo para ThingsBoard

**Fecha de Creación:** 1 de diciembre de 2025
**Versión:** 1.0
**Proyecto:** Sistema de Medición de Tanques GDT - Desarrollo Nativo en ThingsBoard PE

---

## Índice de Documentación

Este directorio contiene la documentación completa del roadmap para el desarrollo de páginas nativas en ThingsBoard PE, reemplazando el enfoque anterior basado en widgets.

### Documentos Principales

0. **[INDICE_VISUAL.md](./INDICE_VISUAL.md)** ⭐ **EMPEZAR AQUÍ** - Índice completo con guía de lectura por rol
1. **[RESUMEN_EJECUTIVO.md](./RESUMEN_EJECUTIVO.md)** - Executive summary para stakeholders (415 líneas)
2. **[ROADMAP_PRINCIPAL.md](./ROADMAP_PRINCIPAL.md)** - Roadmap completo: 6 fases, 77 tareas, 12-14 meses (769 líneas)
3. **[DESARROLLO_NATIVO_TB.md](./DESARROLLO_NATIVO_TB.md)** - Guía técnica para desarrollo Angular/ThingsBoard (1,156 líneas)
4. **[REPORTES_E_INFORMES.md](./REPORTES_E_INFORMES.md)** - Sistema de reportes: 25 tipos especificados (1,076 líneas)
5. **[CARACTERISTICAS_ADICIONALES.md](./CARACTERISTICAS_ADICIONALES.md)** - 20 features de TankMaster/Enraf investigadas (752 líneas)
6. **[BACKEND_THINGSBOARD_INTEGRACION.md](./BACKEND_THINGSBOARD_INTEGRACION.md)** - Integración con backend Java (1,060 líneas)
7. **[GATEWAY_COMUNICACION_RADARES.md](./GATEWAY_COMUNICACION_RADARES.md)** - Gateway y comunicación con radares (1,493 líneas)
8. **[GATEWAY_ROADMAP_TAREAS.md](./GATEWAY_ROADMAP_TAREAS.md)** - 63 tareas del Gateway, Fase 1.5 (940 líneas)

**Total:** 9 documentos, 7,902 líneas, 236 KB

---

## Contexto del Proyecto

### Estado Anterior: Widgets de ThingsBoard

Previamente se estaban desarrollando widgets personalizados de ThingsBoard en:
- `gdt-tb-widgets/tbwc/src/app/components/tank-configuration`
- `gdt-tb-widgets/tbwc/src/app/components/tank-fleet-monitoring`

Estos componentes implementaban características solicitadas en `gdt-tb-widgets/ROADMAP_TANKMASTER_REPLICATION.md`.

### Nueva Dirección: Páginas Nativas

Se ha decidido cambiar el enfoque de desarrollo de widgets a **páginas nativas de ThingsBoard**, similar a la estructura existente en:
- `thingsboard/ui-ngx/src/app/modules/home/pages/gdt`

### Ventajas del Desarrollo Nativo

1. **Mejor Integración**: Las páginas nativas se integran completamente con el ecosistema de ThingsBoard
2. **Mayor Flexibilidad**: No hay limitaciones de sandbox de widgets
3. **Separación de Características**: Cada característica puede tener su propia página dedicada
4. **Mejor UX**: Navegación más fluida y consistente con ThingsBoard
5. **Mantenibilidad**: Código más organizado y fácil de mantener

---

## Migración de Características

### Características Implementadas en Widgets

Las siguientes características ya estaban parcialmente implementadas en widgets:

#### Tank Configuration (tank-configuration)
- Gestión de tanques (crear, editar, eliminar)
- Asignación de radares
- Configuración de parámetros (geometría, producto, API gravity)
- Configuración de umbrales de alarma
- Strapping tables (importación, edición)
- Radar configuration (parámetros TRL/2)

#### Tank Fleet Monitoring (tank-fleet-monitoring)
- Vista de flota (grid/list)
- Visualización en tiempo real (TOV, GOV, GSV, NSV)
- SVG de tanques proporcionales
- Estados del tanque (receiving, dispensing, idle)
- Indicadores de alarmas
- Tank Detail con gauge animado
- Gráfico histórico de nivel
- **Registro manual de aforo** (actualmente en tank-detail)
- **Registro manual de laboratorio** (actualmente en tank-detail)
- Tabla de telemetrías históricas

### Características a Separar

Las siguientes características deben moverse a páginas dedicadas:

1. **Registro Manual de Aforo**
   - Nueva página: `aforo-manual`
   - Funcionalidad: Interfaz para registrar mediciones manuales de nivel
   - Listado de mediciones históricas

2. **Registro Manual de Laboratorio**
   - Nueva página: `laboratorio-manual`
   - Funcionalidad: Registro de valores de API Gravity, BS&W, densidad, temperatura
   - Listado de análisis históricos

---

## Estructura de Páginas Propuesta

```
thingsboard/ui-ngx/src/app/modules/home/pages/gdt/
├── dashboard/                    # Dashboard principal (existente)
├── tank-monitoring/              # Monitoreo de tanques (existente)
├── tank-configuration/           # Configuración de tanques (existente)
├── gateway-configuration/        # Configuración de gateway (existente)
├── user-management/              # Gestión de usuarios (existente)
│
├── aforo-manual/                 # NUEVO: Registro de aforo manual
│   ├── aforo-manual.component.ts
│   ├── aforo-manual.component.html
│   ├── aforo-manual.component.scss
│   └── components/
│       ├── aforo-form/
│       └── aforo-history/
│
├── laboratorio/                  # NUEVO: Registro de laboratorio
│   ├── laboratorio.component.ts
│   ├── laboratorio.component.html
│   ├── laboratorio.component.scss
│   └── components/
│       ├── laboratorio-form/
│       └── laboratorio-history/
│
├── batch-management/             # NUEVO: Gestión de batches
│   ├── batch-management.component.ts
│   ├── batch-management.component.html
│   ├── batch-management.component.scss
│   └── components/
│       ├── batch-list/
│       ├── batch-form/
│       └── batch-report-viewer/
│
├── reportes/                     # NUEVO: Sistema de reportes
│   ├── reportes.component.ts
│   ├── reportes.component.html
│   ├── reportes.component.scss
│   └── components/
│       ├── inventory-report/
│       ├── mass-balance-report/
│       ├── batch-report/
│       └── export-configurator/
│
├── historicos/                   # NUEVO: Visualización de históricos
│   ├── historicos.component.ts
│   ├── historicos.component.html
│   ├── historicos.component.scss
│   └── components/
│       ├── trend-viewer/
│       ├── data-table/
│       └── comparison-chart/
│
├── auditoria/                    # NUEVO: Auditoría OIML R85
│   ├── auditoria.component.ts
│   ├── auditoria.component.html
│   ├── auditoria.component.scss
│   └── components/
│       ├── event-log-viewer/
│       └── compliance-report/
│
└── integraciones/                # NUEVO: Configuración de integraciones
    ├── integraciones.component.ts
    ├── integraciones.component.html
    ├── integraciones.component.scss
    └── components/
        ├── opc-ua-config/
        ├── export-scheduler/
        └── api-config/
```

---

## Priorización de Desarrollo

### Fase 1: Separación de Funcionalidades Existentes (1 mes)
- Migrar registro de aforo manual a página dedicada
- Migrar registro de laboratorio a página dedicada
- Mejorar tank-monitoring eliminando formularios manuales

### Fase 2: Batch Management System (2 meses)
- Implementar gestión completa de batches
- Opening/closing gauges
- Batch reports PDF
- Historial de batches

### Fase 3: Sistema de Reportes (2 meses)
- Reportes de inventario
- Mass balance reports
- Reportes configurables
- Exportaciones automáticas

### Fase 4: Históricos y Tendencias (1.5 meses)
- Visualización de tendencias
- Comparación de datos históricos
- Análisis de datos

### Fase 5: Auditoría y Cumplimiento (1.5 meses)
- Event logger OIML R85
- Compliance reports
- Sellado electrónico

### Fase 6: Integraciones (2 meses)
- OPC UA server
- Exportaciones avanzadas
- APIs de integración

---

## Recursos Necesarios

### Equipo de Desarrollo
- 1× Frontend Angular Developer (Full time)
- 0.5× Backend Developer (Part time - para servicios de soporte)
- 0.5× UX/UI Designer (Part time - para diseño de nuevas páginas)

### Tecnologías
- Angular 15+
- ThingsBoard PE 3.6+
- Material Design
- ECharts para gráficos
- jsPDF para generación de PDFs

---

## Métricas de Éxito

1. **Separación Completa**: Aforo y laboratorio en páginas independientes
2. **Batch Management**: Sistema completo operacional
3. **Reportes**: Al menos 5 tipos de reportes disponibles
4. **Históricos**: Visualización de tendencias funcional
5. **Cumplimiento**: Event logger OIML R85 certificable

---

## Próximos Pasos

1. Revisar y aprobar este roadmap
2. Crear tickets/issues para cada página nueva
3. Diseñar mockups de nuevas interfaces
4. Comenzar desarrollo de Fase 1

---

## Referencias

- [ROADMAP_TANKMASTER_REPLICATION.md](../../gdt-tb-widgets/ROADMAP_TANKMASTER_REPLICATION.md) - Roadmap anterior de widgets
- Código existente de widgets en `gdt-tb-widgets/tbwc/src/app/components/`
- Código existente de páginas nativas en `thingsboard/ui-ngx/src/app/modules/home/pages/gdt/`
