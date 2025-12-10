# Características Adicionales - TankMaster y Enraf

**Fecha:** 1 de diciembre de 2025
**Versión:** 1.0

---

## Índice

1. [Introducción](#introducción)
2. [Características de TankMaster No en Planificación Actual](#características-de-tankmaster-no-en-planificación-actual)
3. [Características de Enraf No en Planificación](#características-de-enraf-no-en-planificación)
4. [Funcionalidades Avanzadas Investigadas](#funcionalidades-avanzadas-investigadas)
5. [Priorización de Nuevas Características](#priorización-de-nuevas-características)
6. [Roadmap Extendido](#roadmap-extendido)

---

## Introducción

Este documento complementa el roadmap principal con características adicionales de TankMaster y Enraf que no están incluidas en la planificación actual, basadas en investigación de funcionalidades disponibles en estos sistemas comerciales.

### Fuentes de Investigación

- **TankMaster Documentation:**
  - Rosemount TankMaster WinOPI Manual (March 2024)
  - Rosemount TankMaster WinView Manual (June 2023)
  - Rosemount TankMaster Inventory Management Software specs

- **Enraf Documentation:**
  - Honeywell Enraf Tank Gauging system
  - Entis Tank Inventory System

---

## Características de TankMaster No en Planificación Actual

### 1. WinView - Visualización Avanzada 3D

**Descripción:** TankMaster incluye WinView, una aplicación de visualización 3D de tanques y terminales.

**Funcionalidades:**
- Visualización 3D de terminal completo
- Animaciones de nivel de líquido en tiempo real
- Vista de planta (top view)
- Navegación 3D interactiva
- Indicadores visuales de alarmas (colores)
- Click en tanque para ver detalles

**Prioridad:** 🟡 Media

**Complejidad:** Alta (requiere Three.js o similar)

**Beneficios:**
- Mejor visualización para operadores
- Ideal para control rooms
- Impresionante para demos

**Implementación Sugerida:**
- Tecnología: Three.js + Angular
- Nueva página: `gdt/visualizacion-3d`
- Duración estimada: 3-4 semanas

---

### 2. Movement Detection and Alerting

**Descripción:** Detección automática de movimiento de producto (receiving/dispensing) basada en tasa de cambio de nivel.

**Funcionalidades:**
- Detección automática de inicio de movimiento
- Clasificación: receiving, dispensing, o idle
- Alertas de movimiento inesperado
- Registro de eventos de movimiento
- Cálculo de flow rate (bbl/h o m³/h)
- Estimación de tiempo de llenado/vaciado

**Prioridad:** 🔴 Alta

**Complejidad:** Media

**Beneficios:**
- Automatización de detección de operaciones
- Alertas tempranas de problemas
- Mejor seguridad

**Implementación Sugerida:**
- Ubicación: Rule Engine de ThingsBoard
- Rule chain: "Movement Detection"
- Lógica:
  ```javascript
  // Calcular rate of change
  levelRate = (currentLevel - previousLevel) / timeInterval;

  if (abs(levelRate) > thresholdIdle) {
    if (levelRate > 0) {
      status = 'receiving';
    } else {
      status = 'dispensing';
    }

    // Generar evento de movimiento
    generateMovementEvent(tankId, status, levelRate);

    // Alertar si movimiento inesperado
    if (!isScheduledMovement(tankId, currentTime)) {
      createAlarm('UNEXPECTED_MOVEMENT', tankId);
    }
  } else {
    status = 'idle';
  }
  ```
- Duración estimada: 2 semanas

---

### 3. Tank Groups and Virtual Tanks

**Descripción:** Agrupación de tanques físicos y creación de "tanques virtuales" que suman inventario de múltiples tanques.

**Funcionalidades:**
- Crear grupos de tanques por:
  - Producto
  - Ubicación física
  - Criterio personalizado
- Virtual tanks:
  - Suman volumen de tanques del grupo
  - Calculan totales (NSV, Masa, WIA)
  - Se comportan como tanques para reportes
- Gestión jerárquica:
  - Terminal → Tank Farm → Tank Group → Tank

**Prioridad:** 🟡 Media-Alta

**Complejidad:** Media

**Beneficios:**
- Vista consolidada de inventario
- Reportes por grupo
- Simplifica gestión de terminales grandes

**Implementación Sugerida:**
- Modelo en ThingsBoard: Asset Groups
- Nueva página: `gdt/tank-groups`
- Service: `TankGroupService`
- Cálculos en Rule Engine
- Duración estimada: 2-3 semanas

---

### 4. Overfill Prevention System (OPS)

**Descripción:** Sistema avanzado de prevención de sobrellenado con múltiples niveles de protección.

**Funcionalidades:**
- **Nivel 1 - Warning:** Alarma H (High)
- **Nivel 2 - Pre-alarm:** Alarma HH (High-High)
- **Nivel 3 - Overfill alarm:** Nivel crítico
- **Nivel 4 - Emergency shutdown:** Comando automático para cerrar válvula
- Cálculo de tiempo estimado para overfill
- Tasa de llenado máxima permitida
- Interlocks configurables
- Registro de eventos OPS

**Prioridad:** 🔴 Alta (Seguridad crítica)

**Complejidad:** Alta

**Beneficios:**
- Prevención de derrames
- Cumplimiento API RP 2350
- Reducción de riesgos ambientales

**Implementación Sugerida:**
- Rule chain: "Overfill Prevention"
- RPC commands para controlar válvulas
- Integración con PLC/DCS
- Página de configuración de OPS
- Duración estimada: 4-5 semanas

**Requisitos:**
- Integración con control de válvulas
- Sistema de interlocks
- Certificación funcional de seguridad (SIL)

---

### 5. Leak Detection

**Descripción:** Detección automática de fugas basada en análisis de tendencias y balance de masa.

**Funcionalidades:**
- **Método 1 - Rate of change:** Detectar pérdida gradual
- **Método 2 - Mass balance:** Discrepancias no explicadas
- **Método 3 - Overnight test:** Test de estanqueidad nocturno
- Cálculo de tasa de fuga estimada
- Alertas graduales (minor, major, critical)
- Registro de eventos de fuga

**Prioridad:** 🔴 Alta

**Complejidad:** Alta

**Beneficios:**
- Detección temprana de fugas
- Reducción de pérdidas
- Cumplimiento ambiental

**Implementación Sugerida:**
- Rule chain: "Leak Detection"
- Algoritmos:
  ```javascript
  // Overnight test (tanque en idle)
  if (tankStatus == 'idle' && timeInIdle > 8hours) {
    levelChangeOvernight = currentLevel - levelAt8HoursAgo;

    if (abs(levelChangeOvernight) > overnightTestThreshold) {
      // Posible fuga
      estimatedLeakRate = levelChangeOvernight / 8; // mm/h
      createAlarm('POTENTIAL_LEAK', tankId, estimatedLeakRate);
    }
  }

  // Mass balance method
  if (massBalanceDiscrepancy > leakThreshold) {
    createAlarm('MASS_BALANCE_LEAK', tankId, discrepancy);
  }
  ```
- Duración estimada: 3-4 semanas

---

### 6. Temperature Stratification Monitoring

**Descripción:** Monitoreo de estratificación térmica en tanques con múltiples sensores de temperatura.

**Funcionalidades:**
- Múltiples sensores de temperatura (top, middle, bottom)
- Cálculo de temperatura promedio ponderada
- Detección de estratificación (gradiente > threshold)
- Impacto en cálculos de volumen
- Alertas de estratificación excesiva
- Visualización gráfica de perfil térmico

**Prioridad:** 🟡 Media

**Complejidad:** Media

**Beneficios:**
- Cálculos más precisos
- Detección de problemas de mezcla
- Optimización de operaciones

**Implementación Sugerida:**
- Soporte de múltiples sensores por tanque
- Rule chain: "Temperature Profile"
- Visualización: Gráfico de perfil térmico
- Duración estimada: 2-3 semanas

---

### 7. Product Blending Management

**Descripción:** Gestión de mezcla de productos en tanques.

**Funcionalidades:**
- Recetas de blending (Product A + Product B = Product C)
- Cálculo de proporciones
- Tracking de componentes
- Ajuste de API Gravity resultante
- Validación de mezcla compatible
- Batch de blending

**Prioridad:** 🟢 Baja-Media

**Complejidad:** Alta

**Beneficios:**
- Gestión de refinería
- Optimización de producto
- Trazabilidad de mezclas

**Implementación Sugerida:**
- Nueva página: `gdt/blending`
- Service: `BlendingService`
- Duración estimada: 4-5 semanas

---

### 8. Tank Cleaning Management

**Descripción:** Gestión de operaciones de limpieza de tanques.

**Funcionalidades:**
- Registro de eventos de limpieza
- Schedule de limpiezas
- Procedimientos de limpieza
- Checklist de seguridad
- Tracking de tiempo fuera de servicio
- Certificados de limpieza

**Prioridad:** 🟢 Baja

**Complejidad:** Media

**Beneficios:**
- Gestión de mantenimiento
- Cumplimiento de seguridad
- Documentación

**Implementación Sugerida:**
- Nueva página: `gdt/tank-maintenance`
- Duración estimada: 2-3 semanas

---

### 9. Integration with ERP Systems

**Descripción:** Integración bidireccional con sistemas ERP (SAP, Oracle, etc.)

**Funcionalidades:**
- Export de inventory data a ERP
- Import de órdenes de producción desde ERP
- Sincronización de batch data
- APIs REST/SOAP
- Mapping de campos configurable

**Prioridad:** 🟡 Media (depende de cliente)

**Complejidad:** Alta

**Beneficios:**
- Automatización de flujo de datos
- Eliminación de entrada manual
- Integración empresarial

**Implementación Sugerida:**
- Backend service: `gdt-erp-integration`
- Connectors para SAP, Oracle, etc.
- Duración estimada: 6-8 semanas

---

### 10. Mobile Application

**Descripción:** Aplicación móvil para operadores de campo.

**Funcionalidades:**
- Vista de tanques en tiempo real
- Manual gauging desde móvil
- Registro de laboratorio desde móvil
- Notificaciones de alarmas
- Acceso a reportes
- Offline mode con sync

**Prioridad:** 🟡 Media

**Complejidad:** Alta

**Beneficios:**
- Movilidad para operadores
- Entrada de datos en campo
- Respuesta rápida a alarmas

**Implementación Sugerida:**
- Tecnología: Flutter o React Native
- API backend: ThingsBoard REST API
- Duración estimada: 8-10 semanas

---

## Características de Enraf No en Planificación

### 11. Servo Gauge Diagnostics

**Descripción:** Diagnósticos avanzados para gauges servo (Enraf 854).

**Funcionalidades:**
- Wire tension monitoring
- Displacer diagnostics
- Float health check
- Servo motor diagnostics
- Predictive maintenance alerts

**Prioridad:** 🟡 Media (si se usa Enraf hardware)

**Complejidad:** Alta

**Beneficios:**
- Mantenimiento predictivo
- Reducción de downtime
- Alertas tempranas

---

### 12. Density Profile Measurement

**Descripción:** Medición de perfil de densidad en tanque (múltiples niveles).

**Funcionalidades:**
- Múltiples mediciones de densidad
- Detección de capas
- Cálculo de densidad promedio
- Detección de agua libre (free water)
- Impacto en cálculos de masa

**Prioridad:** 🟡 Media

**Complejidad:** Alta

**Beneficios:**
- Cálculos más precisos
- Detección de contaminación
- Mejor gestión de calidad

---

### 13. Advanced Statistical Analysis

**Descripción:** Análisis estadístico avanzado de datos de tanques.

**Funcionalidades:**
- Control charts (SPC)
- Trend analysis con ML
- Anomaly detection
- Forecasting de nivel
- Correlation analysis entre tanques

**Prioridad:** 🟢 Baja-Media

**Complejidad:** Alta

**Beneficios:**
- Insights avanzados
- Optimización de operaciones
- Detección proactiva de problemas

**Implementación Sugerida:**
- Backend service: Python con scikit-learn
- Página: `gdt/analytics`
- Duración estimada: 6-8 semanas

---

### 14. Environmental Monitoring

**Descripción:** Monitoreo de condiciones ambientales.

**Funcionalidades:**
- Weather station integration
- Atmospheric pressure
- Humidity
- Wind speed/direction
- Rainfall
- Impacto en cálculos (pressure correction)

**Prioridad:** 🟢 Baja

**Complejidad:** Media

**Beneficios:**
- Cálculos más precisos
- Contexto para operaciones
- Cumplimiento ambiental

---

### 15. Automated Report Distribution

**Descripción:** Distribución automática y personalizada de reportes.

**Funcionalidades:**
- Subscripciones por usuario
- Filtros personalizados
- Formatos preferidos
- Multi-channel (email, SMS, Slack, Teams)
- Report templates personalizables

**Prioridad:** 🟡 Media

**Complejidad:** Media

**Beneficios:**
- Automatización
- Personalización
- Mejor comunicación

**Implementación Sugerida:**
- Extensión del sistema de reportes (FASE 3)
- User preferences en DB
- Duración estimada: 3-4 semanas

---

## Funcionalidades Avanzadas Investigadas

### 16. Digital Twin

**Descripción:** Gemelo digital del sistema de tanques para simulación y optimización.

**Funcionalidades:**
- Modelo matemático de tanques
- Simulación de operaciones
- What-if analysis
- Optimización de inventory
- Training simulator para operadores

**Prioridad:** 🟢 Baja (innovación)

**Complejidad:** Muy Alta

**Beneficios:**
- Optimización avanzada
- Training sin riesgo
- Predicción de escenarios

---

### 17. Blockchain for Custody Transfer

**Descripción:** Uso de blockchain para inmutabilidad de registros de custody transfer.

**Funcionalidades:**
- Batch records en blockchain
- Smart contracts para validación
- Trazabilidad completa
- Certificación distribuida

**Prioridad:** 🟢 Muy Baja (experimental)

**Complejidad:** Muy Alta

**Beneficios:**
- Máxima trazabilidad
- Confianza entre partes
- Innovación tecnológica

---

### 18. AI-Powered Predictive Maintenance

**Descripción:** Mantenimiento predictivo con inteligencia artificial.

**Funcionalidades:**
- ML models para predecir fallos
- Análisis de vibración (si sensores disponibles)
- Predicción de vida útil de componentes
- Scheduling automático de mantenimiento
- RUL (Remaining Useful Life) estimation

**Prioridad:** 🟡 Media (valor agregado)

**Complejidad:** Muy Alta

**Beneficios:**
- Reducción de mantenimiento correctivo
- Optimización de costos
- Aumento de uptime

---

### 19. Voice Commands and Virtual Assistant

**Descripción:** Asistente virtual para consultas y comandos por voz.

**Funcionalidades:**
- "What's the level of Tank 101?"
- "Show me the inventory report"
- "Are there any alarms?"
- Comandos de voz para operaciones
- Integration con Alexa/Google Assistant

**Prioridad:** 🟢 Baja (nice-to-have)

**Complejidad:** Alta

**Beneficios:**
- UX innovadora
- Manos libres para operadores
- Accesibilidad

---

### 20. Augmented Reality (AR) for Field Operations

**Descripción:** AR para asistir a operadores en campo.

**Funcionalidades:**
- AR overlay con datos de tanque
- Instrucciones de mantenimiento en AR
- Visualización de tuberías y válvulas
- Safety warnings en AR
- Remote assistance con AR

**Prioridad:** 🟢 Muy Baja (innovación)

**Complejidad:** Muy Alta

**Beneficios:**
- Training mejorado
- Safety aumentada
- Eficiencia en mantenimiento

---

## Priorización de Nuevas Características

### Matriz de Priorización

| Característica | Prioridad | Complejidad | Valor de Negocio | ROI | Fase Sugerida |
|---------------|-----------|-------------|------------------|-----|---------------|
| **Movement Detection** | 🔴 Alta | Media | Alto | Alto | **FASE 2.5** |
| **Overfill Prevention System** | 🔴 Alta | Alta | Muy Alto | Alto | **FASE 3.5** |
| **Leak Detection** | 🔴 Alta | Alta | Muy Alto | Alto | **FASE 3.5** |
| **Tank Groups & Virtual Tanks** | 🟡 Media-Alta | Media | Alto | Medio | **FASE 4** |
| **Temperature Stratification** | 🟡 Media | Media | Medio | Medio | **FASE 4** |
| **WinView 3D** | 🟡 Media | Alta | Medio | Bajo | **FASE 7** |
| **Automated Report Distribution** | 🟡 Media | Media | Alto | Alto | **FASE 3.5** |
| **Mobile Application** | 🟡 Media | Alta | Alto | Medio | **FASE 7** |
| **Servo Gauge Diagnostics** | 🟡 Media | Alta | Medio | Medio | **FASE 4.5** |
| **Density Profile** | 🟡 Media | Alta | Medio | Bajo | **FASE 5** |
| **Advanced Statistical Analysis** | 🟢 Baja-Media | Alta | Medio | Bajo | **FASE 8** |
| **ERP Integration** | 🟡 Media | Alta | Alto | Depende | **FASE 6.5** |
| **Product Blending** | 🟢 Baja-Media | Alta | Medio | Bajo | **FASE 8** |
| **Tank Cleaning Management** | 🟢 Baja | Media | Bajo | Bajo | **FASE 8** |
| **Environmental Monitoring** | 🟢 Baja | Media | Bajo | Bajo | **FASE 8** |
| **AI Predictive Maintenance** | 🟡 Media | Muy Alta | Alto | Medio | **FASE 9** |
| **Digital Twin** | 🟢 Baja | Muy Alta | Medio | Bajo | **FASE 9** |
| **Voice Assistant** | 🟢 Baja | Alta | Bajo | Muy Bajo | **FASE 10** |
| **Blockchain** | 🟢 Muy Baja | Muy Alta | Bajo | Muy Bajo | **Futuro** |
| **AR** | 🟢 Muy Baja | Muy Alta | Medio | Muy Bajo | **Futuro** |

---

## Roadmap Extendido

### FASE 2.5: Movement Detection (1 mes)
**Después de FASE 2**
- Implementar Movement Detection en Rule Engine
- Alertas de movimiento inesperado
- Flow rate calculation

### FASE 3.5: Safety & Advanced Reporting (2 meses)
**Después de FASE 3**
- Overfill Prevention System
- Leak Detection
- Automated Report Distribution

### FASE 4: Advanced Features (1.5 meses)
**Ya planificado - Agregar:**
- Tank Groups & Virtual Tanks
- Temperature Stratification

### FASE 4.5: Enraf Diagnostics (1 mes)
**Si se usa hardware Enraf**
- Servo Gauge Diagnostics
- Health monitoring

### FASE 6.5: ERP Integration (2 meses)
**Después de FASE 6 - Si requerido por cliente**
- Connectors para SAP, Oracle
- Bidirectional sync

### FASE 7: Mobile & Visualization (2.5 meses)
**Nuevas interfaces**
- WinView 3D Visualization
- Mobile Application

### FASE 8: Advanced Management (2 meses)
**Funcionalidades adicionales**
- Advanced Statistical Analysis
- Product Blending
- Tank Cleaning Management
- Environmental Monitoring

### FASE 9: AI & Innovation (3 meses)
**Si budget y recursos disponibles**
- AI Predictive Maintenance
- Digital Twin

### FASE 10: Experimental (Variable)
**Investigación y POCs**
- Voice Assistant
- Blockchain
- AR

---

## Recomendaciones

### Características a Incluir en Roadmap Principal

**Inmediatas (agregar a planificación actual):**
1. ✅ **Movement Detection** - Crítico para operaciones
2. ✅ **Automated Report Distribution** - Extensión natural de FASE 3

**Corto Plazo (próximos 6-12 meses después de FASE 6):**
3. ✅ **Overfill Prevention System** - Seguridad crítica
4. ✅ **Leak Detection** - Seguridad y cumplimiento
5. ✅ **Tank Groups & Virtual Tanks** - Escalabilidad

**Mediano Plazo (12-18 meses):**
6. **Mobile Application** - Si demanda de clientes
7. **WinView 3D** - Diferenciación competitiva
8. **ERP Integration** - Si cliente específico lo requiere

**Largo Plazo (18+ meses):**
9. **Advanced Statistical Analysis** - Valor agregado
10. **AI Predictive Maintenance** - Innovación

### Características a Evaluar Caso por Caso

- **Servo Gauge Diagnostics:** Solo si se usa hardware Enraf
- **Density Profile:** Solo si cliente tiene medidores de densidad
- **Product Blending:** Solo para refinerías
- **ERP Integration:** Solo si cliente lo requiere

### Características Experimentales

- **Digital Twin, Voice Assistant, Blockchain, AR:** Considerar solo como POCs de investigación, no para producción inmediata

---

## Conclusión

Se han identificado **20 características adicionales** no incluidas en el roadmap original, clasificadas por prioridad y complejidad. Las **5 características de mayor prioridad** son:

1. 🔴 **Movement Detection** - Debe agregarse inmediatamente
2. 🔴 **Overfill Prevention System** - Crítico para seguridad
3. 🔴 **Leak Detection** - Crítico para seguridad
4. 🟡 **Tank Groups & Virtual Tanks** - Escalabilidad
5. 🟡 **Automated Report Distribution** - UX

**Recomendación:** Incluir Movement Detection y Automated Report Distribution en el roadmap principal. Evaluar Overfill Prevention y Leak Detection para FASE 7 (Security & Safety enhancements).

---

## Referencias

**Sources:**

1. [Rosemount TankMaster Inventory Management Software | Emerson US](https://www.emerson.com/en-us/automation/measurement-instrumentation/tank-gauging-system/about-tankmaster-inventory-management-software)

2. [Rosemount TankMaster WinOPI Manual](https://www.emerson.com/documents/automation/manual-rosemount-tankmaster-winopi-inventory-management-software-en-4886228.pdf)

3. [Rosemount TankMaster WinView Manual](https://www.emerson.com/documents/automation/manual-rosemount-tankmaster-winview-en-81040.pdf)

4. [Honeywell Enraf Tank Gauging | Honeywell](https://process.honeywell.com/us/en/products/terminals/enraf-tank-gauging)

5. [Entis Tank Inventory System | Honeywell](https://process.honeywell.com/us/en/products/terminals/enraf-tank-gauging/entis-tank-inventory-system)

**Investigación realizada:** Diciembre 1, 2025
