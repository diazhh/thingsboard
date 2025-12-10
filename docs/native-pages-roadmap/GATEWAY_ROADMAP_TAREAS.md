# Roadmap de Tareas - Gateway Configuration

**Fecha:** 1 de diciembre de 2025
**Versión:** 1.0
**Integración con:** ROADMAP_PRINCIPAL.md

---

## Índice

1. [Introducción](#introducción)
2. [Estado Actual del Gateway](#estado-actual-del-gateway)
3. [Tareas del Gateway Service](#tareas-del-gateway-service)
4. [Tareas de Páginas Gateway en ThingsBoard](#tareas-de-páginas-gateway-en-thingsboard)
5. [Integración en Roadmap Principal](#integración-en-roadmap-principal)
6. [Estimaciones de Tiempo](#estimaciones-de-tiempo)

---

## Introducción

Este documento detalla las tareas específicas para completar el sistema de Gateway GDT, incluyendo:
- Mejoras al GDT Gateway Service (Python)
- Páginas de configuración en ThingsBoard (Angular)
- Comunicación bidireccional con radares
- Discovery de dispositivos

---

## Estado Actual del Gateway

### Servicios Existentes

#### 1. TRL2 Service (Original)
**Ubicación:** `gdt-tb-widgets/trl2/`

**Estado:** ✅ Funcional pero limitado
- ✅ Lectura de telemetría Modbus RTU
- ✅ Publicación MQTT a ThingsBoard
- ❌ Puerto serial fijo (hardcoded)
- ❌ No soporta multi-puerto
- ❌ No tiene discovery

#### 2. GDT Gateway Service (Nuevo)
**Ubicación:** `gdt-tb-widgets/gdt-gateway-service/`

**Estado:** 🔶 Parcialmente implementado
- ✅ Estructura base del proyecto
- ✅ Cliente REST para ThingsBoard Gateway
- ✅ Protocolo Modbus RTU (migrado desde TRL2)
- ✅ Discovery Service (básico)
- ❌ Port Manager (falta implementar)
- ❌ RPC handler bidireccional (incompleto)
- ❌ API REST (falta implementar)
- ❌ Protocolo Modbus TCP
- ❌ Protocolos Enraf y Varec

#### 3. GDT Gateway (Alternativo)
**Ubicación:** `gdt-tb-widgets/gdt-gateway/`

**Estado:** 🔶 En construcción
- ✅ Estructura con Redis y web UI
- ✅ Configuración dinámica (Pydantic Settings)
- ❌ Integración con Port Manager
- ❌ Dashboard web completo

### Página Gateway Configuration en ThingsBoard
**Ubicación:** `thingsboard/ui-ngx/src/app/modules/home/pages/gdt/gateway-configuration/`

**Estado:** 🔶 Básica, requiere expansión
- ✅ Componente principal creado
- ❌ Port Manager UI (falta implementar)
- ❌ Device Discovery UI (falta implementar)
- ❌ Protocol Configuration UI (falta implementar)

---

## Tareas del Gateway Service

### Epic GW-1: Port Manager Implementation

**Duración:** 2 semanas

#### Tarea GW-1.1: Implementar Port Manager Core
**Descripción:** Crear módulo `gateway/port_manager.py` con gestión dinámica de puertos

**Funcionalidades:**
- Clase `PortConfiguration` con todos los parámetros
- Clase `PortManager` con métodos:
  - `add_port(config)`
  - `remove_port(port_name)`
  - `enable_port(port_name)`
  - `disable_port(port_name)`
  - `update_port_config(port_name, **kwargs)`
  - `get_connection(port_name)`
  - `get_all_ports()`
  - `list_available_ports()`
  - `start_monitoring()` / `stop_monitoring()` (hot-plugging)

**Archivos:**
- `gateway/port_manager.py` (nuevo)
- `tests/test_port_manager.py` (nuevo)

**Estimación:** 5 días

---

#### Tarea GW-1.2: Integrar Port Manager con Gateway Client
**Descripción:** Conectar Port Manager con el flujo de telemetría

**Cambios:**
- Modificar `main.py` para usar Port Manager
- Cargar configuración de puertos desde `config/port_mappings.json`
- Crear thread por cada puerto habilitado
- Gestionar lifecycle de conexiones

**Archivos:**
- `main.py` (modificar)
- `config/port_mappings.json` (nuevo)
- `gateway/gateway_client.py` (modificar)

**Estimación:** 3 días

---

#### Tarea GW-1.3: Implementar Callbacks y Notificaciones
**Descripción:** Sistema de eventos para cambios en puertos

**Funcionalidades:**
- Callbacks para eventos:
  - `port_connected`
  - `port_disconnected`
  - `port_error`
  - `new_ports_detected` (hot-plug)
  - `ports_removed` (hot-unplug)
- Notificaciones a ThingsBoard

**Archivos:**
- `gateway/port_manager.py` (modificar)
- `gateway/event_notifier.py` (nuevo)

**Estimación:** 2 días

---

### Epic GW-2: Gateway REST API

**Duración:** 2 semanas

#### Tarea GW-2.1: Setup FastAPI Server
**Descripción:** Crear servidor FastAPI para exposición de API

**Funcionalidades:**
- Estructura de API con FastAPI
- CORS configurado para ThingsBoard
- Health check endpoint
- Autenticación básica (opcional)

**Archivos:**
- `api/__init__.py` (nuevo)
- `api/gateway_api.py` (nuevo)
- `requirements.txt` (actualizar con fastapi, uvicorn)

**Estimación:** 2 días

---

#### Tarea GW-2.2: Endpoints de Port Management
**Descripción:** Crear endpoints REST para gestión de puertos

**Endpoints:**
- `GET /api/ports` - Listar puertos configurados
- `GET /api/ports/available` - Listar puertos disponibles del sistema
- `POST /api/ports` - Agregar puerto
- `PUT /api/ports/{port_name}` - Actualizar configuración
- `DELETE /api/ports/{port_name}` - Remover puerto
- `POST /api/ports/{port_name}/enable` - Habilitar puerto
- `POST /api/ports/{port_name}/disable` - Deshabilitar puerto
- `GET /api/ports/{port_name}/status` - Estado del puerto

**Archivos:**
- `api/port_api.py` (nuevo)

**Estimación:** 3 días

---

#### Tarea GW-2.3: Endpoints de Discovery
**Descripción:** Crear endpoints para discovery de dispositivos

**Endpoints:**
- `POST /api/discovery/modbus-rtu` - Iniciar discovery Modbus RTU
- `POST /api/discovery/modbus-tcp` - Iniciar discovery Modbus TCP
- `GET /api/discovery/results` - Obtener resultados
- `GET /api/discovery/status` - Estado de discovery
- `DELETE /api/discovery/results` - Limpiar resultados

**Archivos:**
- `api/discovery_api.py` (nuevo)
- `services/discovery_service.py` (modificar)

**Estimación:** 3 días

---

#### Tarea GW-2.4: Endpoints de Device Provisioning
**Descripción:** Endpoints para provisioning de dispositivos a ThingsBoard

**Endpoints:**
- `POST /api/devices/provision` - Provision dispositivo individual
- `POST /api/devices/provision-batch` - Provision múltiples dispositivos
- `GET /api/devices/provisioned` - Listar dispositivos provisionados

**Archivos:**
- `api/device_api.py` (nuevo)
- `gateway/device_provisioner.py` (modificar)

**Estimación:** 3 días

---

#### Tarea GW-2.5: Testing de API
**Descripción:** Tests unitarios e integración de API

**Tests:**
- Tests de endpoints con pytest
- Mock de Port Manager
- Mock de ThingsBoard API
- Tests de CORS

**Archivos:**
- `tests/test_gateway_api.py` (nuevo)
- `tests/test_port_api.py` (nuevo)
- `tests/test_discovery_api.py` (nuevo)

**Estimación:** 3 días

---

### Epic GW-3: RPC Handler Bidireccional

**Duración:** 1.5 semanas

#### Tarea GW-3.1: Implementar RPC Handler Completo
**Descripción:** Completar `gateway/rpc_handler.py` con soporte de comandos

**Comandos RPC a Soportar:**
- `set_tank_height` - Configurar altura del tanque
- `set_offset_distance` - Configurar offset del radar
- `set_calibration_distance` - Configurar distancia de calibración
- `read_register` - Leer registro específico
- `write_register` - Escribir registro específico
- `get_config` - Obtener configuración completa del radar
- `reset_radar` - Reiniciar radar (si soportado)

**Validaciones:**
- Verificar seal_status antes de escrituras
- Validar permisos de usuario
- Validar rangos de valores
- Log de todos los comandos (event logger)

**Archivos:**
- `gateway/rpc_handler.py` (modificar)
- `tests/test_rpc_handler.py` (modificar)

**Estimación:** 4 días

---

#### Tarea GW-3.2: Integrar RPC con Port Manager
**Descripción:** Permitir envío de comandos a radares específicos por puerto

**Funcionalidades:**
- Routing de comandos RPC al puerto correcto
- Soporte de múltiples radares en mismo puerto (slave_id)
- Cola de comandos por puerto
- Timeout y retry logic

**Archivos:**
- `gateway/rpc_handler.py` (modificar)
- `gateway/port_manager.py` (modificar)

**Estimación:** 3 días

---

#### Tarea GW-3.3: Testing de RPC
**Descripción:** Tests de comandos RPC con simulador

**Tests:**
- Mock de Modbus RTU slave
- Tests de cada comando RPC
- Tests de validaciones
- Tests de error handling

**Archivos:**
- `tests/test_rpc_integration.py` (nuevo)
- `tests/mocks/modbus_slave_mock.py` (nuevo)

**Estimación:** 3 días

---

### Epic GW-4: Multi-Protocol Support

**Duración:** 3 semanas

#### Tarea GW-4.1: Implementar Modbus TCP
**Descripción:** Protocolo Modbus TCP para radares ethernet

**Funcionalidades:**
- Cliente Modbus TCP
- Configuración por IP y puerto
- Register mapping igual que TRL/2
- Discovery TCP en red

**Archivos:**
- `protocols/modbus_tcp.py` (completar)
- `tests/test_modbus_tcp.py` (actualizar)

**Estimación:** 5 días

---

#### Tarea GW-4.2: Implementar Enraf GPU Protocol
**Descripción:** Protocolo Enraf para servo gauges

**Funcionalidades:**
- Cliente Enraf GPU
- Parsing de mensajes Enraf
- Register mapping a telemetría estándar
- Soporte de comandos Enraf

**Archivos:**
- `protocols/enraf_gpu.py` (implementar)
- `tests/test_enraf_gpu.py` (nuevo)
- `docs/ENRAF_PROTOCOL.md` (documentación)

**Estimación:** 8 días

---

#### Tarea GW-4.3: Implementar Varec Mark/Space Protocol
**Descripción:** Protocolo Varec Mark/Space

**Funcionalidades:**
- Cliente Varec
- Parsing de protocolo Mark/Space
- Register mapping

**Archivos:**
- `protocols/varec_markspace.py` (implementar)
- `tests/test_varec.py` (nuevo)

**Estimación:** 5 días

---

### Epic GW-5: Configuration Persistence

**Duración:** 1 semana

#### Tarea GW-5.1: Save/Load Port Configuration
**Descripción:** Persistencia de configuración de puertos

**Funcionalidades:**
- Guardar config a JSON file
- Cargar config al inicio
- Validación de config
- Migración de config antiguo

**Archivos:**
- `config/port_mappings.json` (schema)
- `gateway/config_manager.py` (nuevo)
- `tests/test_config_manager.py` (nuevo)

**Estimación:** 3 días

---

#### Tarea GW-5.2: Auto-reload Configuration
**Descripción:** Recargar configuración sin reiniciar gateway

**Funcionalidades:**
- File watcher para cambios en config
- Hot-reload de puertos
- Validación antes de aplicar
- Rollback en caso de error

**Archivos:**
- `gateway/config_manager.py` (modificar)
- `gateway/config_watcher.py` (nuevo)

**Estimación:** 2 días

---

### Epic GW-6: Monitoring y Logging

**Duración:** 1 semana

#### Tarea GW-6.1: Health Monitor por Puerto
**Descripción:** Monitor de salud de cada puerto serial

**Métricas:**
- Connection status
- Last successful read
- Failed read count
- Communication errors
- Data rate

**Archivos:**
- `services/health_monitor.py` (modificar)
- `gateway/port_manager.py` (integrar)

**Estimación:** 3 días

---

#### Tarea GW-6.2: Structured Logging
**Descripción:** Logging estructurado con contexto

**Funcionalidades:**
- Log format JSON
- Contexto por request
- Log levels configurables
- Rotation de logs
- Integración con ELK (opcional)

**Archivos:**
- `shared/logger.py` (modificar)
- `config/logging_config.json` (nuevo)

**Estimación:** 2 días

---

## Tareas de Páginas Gateway en ThingsBoard

### Epic TB-GW-1: Port Manager UI

**Duración:** 2.5 semanas

#### Tarea TB-GW-1.1: Componente Port Manager
**Descripción:** Crear componente principal de gestión de puertos

**Funcionalidades:**
- Tabla de puertos configurados
- Status indicators (connected, disconnected, error)
- Filtros y búsqueda
- Acciones: Edit, Remove, Enable/Disable

**Archivos:**
- `gateway-configuration/components/port-manager/port-manager.component.ts` (nuevo)
- `gateway-configuration/components/port-manager/port-manager.component.html` (nuevo)
- `gateway-configuration/components/port-manager/port-manager.component.scss` (nuevo)

**Estimación:** 4 días

---

#### Tarea TB-GW-1.2: Diálogo Add/Edit Port
**Descripción:** Diálogo para agregar/editar configuración de puerto

**Funcionalidades:**
- Form validation
- Selector de puerto disponible
- Selector de baudrate
- Selector de protocolo
- Advanced settings (parity, stop bits, etc.)
- Preview de configuración

**Archivos:**
- `gateway-configuration/components/port-manager/port-dialog.component.ts` (nuevo)
- `gateway-configuration/components/port-manager/port-dialog.component.html` (nuevo)

**Estimación:** 3 días

---

#### Tarea TB-GW-1.3: Available Ports Viewer
**Descripción:** Vista de puertos disponibles del sistema

**Funcionalidades:**
- Lista de puertos detectados
- Información de hardware
- Indicador de si está gestionado
- Refresh automático
- Add port directo desde lista

**Archivos:**
- `gateway-configuration/components/port-manager/available-ports.component.ts` (nuevo)
- `gateway-configuration/components/port-manager/available-ports.component.html` (nuevo)

**Estimación:** 2 días

---

#### Tarea TB-GW-1.4: Port Status Monitor
**Descripción:** Monitor en tiempo real del estado de puertos

**Funcionalidades:**
- Real-time status updates (WebSocket)
- Connection health indicators
- Error messages display
- Telemetry rate
- Last communication timestamp

**Archivos:**
- `gateway-configuration/components/port-manager/port-status.component.ts` (nuevo)
- `gateway-configuration/components/port-manager/port-status.component.html` (nuevo)

**Estimación:** 3 días

---

### Epic TB-GW-2: Device Discovery UI

**Duración:** 2 semanas

#### Tarea TB-GW-2.1: Discovery Configuration Form
**Descripción:** Formulario para configurar parámetros de discovery

**Funcionalidades:**
- Selector de puerto(s)
- Selector de baudrates
- Address range (start, end)
- Timeout configuration
- Protocol selection

**Archivos:**
- `gateway-configuration/components/device-discovery/discovery-config.component.ts` (nuevo)
- `gateway-configuration/components/device-discovery/discovery-config.component.html` (nuevo)

**Estimación:** 3 días

---

#### Tarea TB-GW-2.2: Discovery Progress Viewer
**Descripción:** Vista de progreso de discovery en tiempo real

**Funcionalidades:**
- Progress bar
- Current scanning parameters
- Devices found counter
- Live updates
- Stop/Cancel button

**Archivos:**
- `gateway-configuration/components/device-discovery/discovery-progress.component.ts` (nuevo)
- `gateway-configuration/components/device-discovery/discovery-progress.component.html` (nuevo)

**Estimación:** 2 días

---

#### Tarea TB-GW-2.3: Discovered Devices Table
**Descripción:** Tabla de dispositivos descubiertos

**Funcionalidades:**
- Tabla con información de dispositivos:
  - Device name (sugerido)
  - Type
  - Port, Baudrate, Address
  - Model (si detectado)
  - Actions: Provision, Edit name
- Selección múltiple
- Provision batch
- Export to config

**Archivos:**
- `gateway-configuration/components/device-discovery/discovered-devices.component.ts` (nuevo)
- `gateway-configuration/components/device-discovery/discovered-devices.component.html` (nuevo)

**Estimación:** 4 días

---

#### Tarea TB-GW-2.4: Device Provisioning Dialog
**Descripción:** Diálogo para provisioning de dispositivo a ThingsBoard

**Funcionalidades:**
- Editar device name
- Seleccionar device profile
- Asignar a customer (opcional)
- Configurar atributos iniciales
- Preview de configuración

**Archivos:**
- `gateway-configuration/components/device-discovery/provision-dialog.component.ts` (nuevo)
- `gateway-configuration/components/device-discovery/provision-dialog.component.html` (nuevo)

**Estimación:** 3 días

---

### Epic TB-GW-3: Protocol Configuration UI

**Duración:** 1 semana

#### Tarea TB-GW-3.1: Protocol Settings Component
**Descripción:** Configuración de parámetros por protocolo

**Funcionalidades:**
- Tabs por protocolo (TRL/2, Enraf, Varec)
- Settings específicos por protocolo
- Register mappings
- Float byte order (CDAB, ABCD, etc.)

**Archivos:**
- `gateway-configuration/components/protocol-config/protocol-settings.component.ts` (nuevo)
- `gateway-configuration/components/protocol-config/protocol-settings.component.html` (nuevo)

**Estimación:** 4 días

---

#### Tarea TB-GW-3.2: Register Mapping Editor
**Descripción:** Editor de mapeo de registros Modbus

**Funcionalidades:**
- Tabla de register mappings
- Add/Edit/Delete mappings
- Data type selector
- Test read register
- Save to config

**Archivos:**
- `gateway-configuration/components/protocol-config/register-mapping.component.ts` (nuevo)
- `gateway-configuration/components/protocol-config/register-mapping.component.html` (nuevo)

**Estimación:** 3 días

---

### Epic TB-GW-4: Gateway Service Integrations

**Duración:** 1.5 semanas

#### Tarea TB-GW-4.1: Gateway Service Angular Service
**Descripción:** Servicio Angular para comunicación con Gateway API

**Funcionalidades:**
- HTTPClient wrapper para todos los endpoints
- Error handling
- Retry logic
- Caching (donde aplique)
- Type safety con interfaces

**Archivos:**
- `shared/services/gateway.service.ts` (nuevo)
- `shared/models/port-config.model.ts` (nuevo)
- `shared/models/discovery.model.ts` (nuevo)

**Estimación:** 3 días

---

#### Tarea TB-GW-4.2: WebSocket Integration for Real-time Updates
**Descripción:** WebSocket para updates en tiempo real

**Funcionalidades:**
- Subscribe a eventos de gateway
- Port status changes
- Discovery progress updates
- Device telemetry preview

**Archivos:**
- `shared/services/gateway-websocket.service.ts` (nuevo)

**Estimación:** 3 días

---

#### Tarea TB-GW-4.3: Gateway Configuration Storage
**Descripción:** Persistir configuración de gateway en ThingsBoard

**Funcionalidades:**
- Save port configuration to gateway device attributes
- Load configuration from attributes
- Sync with gateway service
- Versioning de configuración

**Archivos:**
- `shared/services/gateway-config-storage.service.ts` (nuevo)

**Estimación:** 3 días

---

### Epic TB-GW-5: Testing y Documentation

**Duración:** 1 semana

#### Tarea TB-GW-5.1: Unit Tests de Componentes
**Descripción:** Tests unitarios de componentes Angular

**Tests:**
- Port Manager component
- Discovery components
- Services
- Dialogs

**Archivos:**
- `*.component.spec.ts` (múltiples)

**Estimación:** 3 días

---

#### Tarea TB-GW-5.2: E2E Tests
**Descripción:** Tests end-to-end del flujo completo

**Escenarios:**
- Agregar puerto → Discovery → Provision device
- Editar configuración de puerto
- Deshabilitar/habilitar puerto
- RPC command flow

**Archivos:**
- `e2e/gateway-configuration.e2e.spec.ts` (nuevo)

**Estimación:** 2 días

---

#### Tarea TB-GW-5.3: User Documentation
**Descripción:** Documentación de usuario para páginas de gateway

**Documentos:**
- Guía de configuración de puertos
- Guía de discovery
- Guía de troubleshooting
- Video tutorial (opcional)

**Archivos:**
- `docs/GATEWAY_USER_GUIDE.md` (nuevo)
- `docs/GATEWAY_TROUBLESHOOTING.md` (nuevo)

**Estimación:** 2 días

---

## Integración en Roadmap Principal

### Propuesta: Nueva Fase 1.5 - Gateway Configuration

**Ubicación:** Entre FASE 1 (Separación) y FASE 2 (Batch Management)

**Duración:** 2 meses

**Justificación:**
- Gateway es infraestructura fundamental
- Batch Management depende de telemetría confiable
- Discovery simplifica deployment
- Configuración dinámica es requirement

### Desglose de Fase 1.5

#### Mes 1: Gateway Service Backend
- Semana 1-2: Port Manager + API REST
- Semana 3: RPC Handler Bidireccional
- Semana 4: Testing y Bug Fixes

#### Mes 2: Gateway Configuration UI
- Semana 1-2: Port Manager UI
- Semana 3: Device Discovery UI
- Semana 4: Protocol Configuration UI + Testing

---

## Estimaciones de Tiempo

### Gateway Service (Backend)

| Epic | Duración | Story Points |
|------|----------|-------------|
| **GW-1: Port Manager** | 2 semanas | 25 |
| **GW-2: REST API** | 2 semanas | 30 |
| **GW-3: RPC Handler** | 1.5 semanas | 20 |
| **GW-4: Multi-Protocol** | 3 semanas | 35 |
| **GW-5: Configuration** | 1 semana | 12 |
| **GW-6: Monitoring** | 1 semana | 13 |
| **TOTAL BACKEND** | **10.5 semanas** | **135 SP** |

### ThingsBoard Pages (Frontend)

| Epic | Duración | Story Points |
|------|----------|-------------|
| **TB-GW-1: Port Manager UI** | 2.5 semanas | 30 |
| **TB-GW-2: Discovery UI** | 2 semanas | 28 |
| **TB-GW-3: Protocol Config UI** | 1 semana | 15 |
| **TB-GW-4: Service Integration** | 1.5 semanas | 20 |
| **TB-GW-5: Testing & Docs** | 1 semana | 12 |
| **TOTAL FRONTEND** | **8 semanas** | **105 SP** |

### Total Gateway Configuration

**Duración Total:** 10.5 semanas (Backend) + 8 semanas (Frontend) = **18.5 semanas**

Si se desarrolla en paralelo (1 backend dev + 1 frontend dev):
**Duración Real:** **10.5 semanas (~2.5 meses)**

---

## Priorización

### Prioridad Alta (Must Have)
1. ✅ Port Manager (GW-1)
2. ✅ REST API básica (GW-2.1, GW-2.2)
3. ✅ RPC Handler (GW-3)
4. ✅ Port Manager UI (TB-GW-1)
5. ✅ Gateway Service Integration (TB-GW-4)

### Prioridad Media (Should Have)
6. Discovery Service (GW-2.3, TB-GW-2)
7. Configuration Persistence (GW-5)
8. Health Monitoring (GW-6)
9. Protocol Configuration UI (TB-GW-3)

### Prioridad Baja (Nice to Have)
10. Modbus TCP (GW-4.1)
11. Enraf Protocol (GW-4.2)
12. Varec Protocol (GW-4.3)
13. Advanced monitoring features

---

## Roadmap Visual

```
FASE 1 (Separación) - 2 meses
    ↓
FASE 1.5 (Gateway Configuration) - 2.5 meses  ← NUEVA FASE
    │
    ├─ Mes 1: Gateway Service Backend
    │   ├─ Week 1-2: Port Manager + API
    │   ├─ Week 3: RPC Handler
    │   └─ Week 4: Testing
    │
    └─ Mes 2-2.5: Gateway UI + Integration
        ├─ Week 1-2: Port Manager UI
        ├─ Week 3: Discovery UI
        └─ Week 4-5: Protocol Config + Testing
    ↓
FASE 2 (Batch Management) - 2.5 meses
    ↓
FASE 3 (Reportes) - 2.5 meses
    ↓
...
```

---

## Dependencias

### Para Fase 2 (Batch Management)
- ✅ Port Manager funcional (telemetría confiable)
- ✅ RPC Handler (para comandos de batch)
- ⚠️ Discovery (opcional, facilita setup)

### Para Fase 3 (Reportes)
- ⚠️ Gateway estable con telemetría continua
- ⚠️ Health monitoring (para reportes de uptime)

---

## Riesgos

### Técnicos
1. **Compatibilidad de Hardware**
   - Riesgo: Puertos USB no reconocidos en Linux
   - Mitigación: Testing con múltiples adaptadores USB-Serial

2. **Performance con Múltiples Puertos**
   - Riesgo: Degradación con 10+ puertos simultáneos
   - Mitigación: Threading optimizado, benchmarking

3. **Discovery Accuracy**
   - Riesgo: False positives en detection
   - Mitigación: Validación de respuestas, timeouts apropiados

### De Proyecto
1. **Scope Creep**
   - Riesgo: Agregar demasiados protocolos
   - Mitigación: Priorizar TRL/2, postponar Enraf/Varec a Fase 7

2. **Testing con Hardware**
   - Riesgo: No tener acceso a todos los radares
   - Mitigación: Simuladores Modbus, testing en campo piloto

---

## Criterios de Aceptación

### Port Manager
- ✅ Agregar/remover puertos sin reiniciar
- ✅ Soportar 10+ puertos simultáneos
- ✅ Hot-plugging detection
- ✅ Error recovery automático

### Discovery
- ✅ Detectar radares TRL/2 correctamente
- ✅ Scan completo en < 5 minutos (1-247, 2 baudrates)
- ✅ Auto-provision a ThingsBoard

### RPC Handler
- ✅ Ejecutar comandos con confirmación
- ✅ Validación de seal_status
- ✅ Timeout y retry logic
- ✅ Event logging de comandos

### UI
- ✅ Responsive design
- ✅ Real-time status updates
- ✅ Error messages claros
- ✅ User-friendly (no técnico)

---

## Conclusión

Este roadmap detalla **63 tareas específicas** para completar el sistema de Gateway Configuration, con una duración estimada de **2.5 meses** si se desarrolla en paralelo Backend + Frontend.

**Recomendación:** Insertar como **FASE 1.5** en el roadmap principal, entre Separación (FASE 1) y Batch Management (FASE 2).

**Beneficios:**
- ✅ Infraestructura sólida antes de features avanzadas
- ✅ Simplifica deployment y configuración
- ✅ Reduce dependencia de configuración manual
- ✅ Mejora troubleshooting con monitoring

---

## Referencias

- [GATEWAY_COMUNICACION_RADARES.md](./GATEWAY_COMUNICACION_RADARES.md) - Documentación técnica completa
- [ROADMAP_PRINCIPAL.md](./ROADMAP_PRINCIPAL.md) - Roadmap general del proyecto
- [DESARROLLO_NATIVO_TB.md](./DESARROLLO_NATIVO_TB.md) - Guía de desarrollo
- Código existente: `gdt-gateway-service/` y `gdt-gateway/`
