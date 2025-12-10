# Port Manager UI - Implementación Frontend

**Fecha**: Diciembre 01, 2025
**Autor**: Claude Code
**Épica**: FASE 1.5 - Gateway Configuration
**Story Points**: 26 SP (TB-GW-1)

---

## 📋 Resumen Ejecutivo

Se ha implementado la interfaz de usuario completa para la gestión dinámica de puertos seriales del Gateway GDT. Esta implementación permite a los usuarios configurar, monitorear y gestionar puertos seriales desde la interfaz web de ThingsBoard sin necesidad de reiniciar el servicio Gateway.

### Componentes Implementados

1. **Modelos TypeScript** (`gateway-port.model.ts`) - 190 líneas
2. **PortListComponent** - Tabla de gestión de puertos (450 líneas)
3. **AddPortDialogComponent** - Diálogo de configuración (380 líneas)
4. **Integración en GatewayConfigurationComponent** - Sistema de pestañas

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                  ThingsBoard UI (Angular)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GatewayConfigurationComponent                        │  │
│  │  ┌────────────────────┬───────────────────────────┐  │  │
│  │  │  Credenciales MQTT │  Puertos Seriales         │  │  │
│  │  │  (Existente)       │  (NUEVO)                  │  │  │
│  │  └────────────────────┴───────────────────────────┘  │  │
│  │                               │                       │  │
│  │                               ▼                       │  │
│  │                    ┌──────────────────────┐           │  │
│  │                    │  PortListComponent   │           │  │
│  │                    │  - Tabla de puertos  │           │  │
│  │                    │  - Estados en tiempo │           │  │
│  │                    │  - Acciones CRUD     │           │  │
│  │                    └──────────┬───────────┘           │  │
│  │                               │                       │  │
│  │                               ▼                       │  │
│  │                ┌──────────────────────────┐           │  │
│  │                │ AddPortDialogComponent   │           │  │
│  │                │ - Formulario reactivo    │           │  │
│  │                │ - Validación             │           │  │
│  │                │ - Selector de puertos    │           │  │
│  │                └──────────┬───────────────┘           │  │
│  └───────────────────────────┼───────────────────────────┘  │
│                               │                             │
│                               ▼                             │
│                    ┌─────────────────────┐                  │
│                    │  GatewayApiService  │                  │
│                    │  - HTTP Client      │                  │
│                    │  - REST API calls   │                  │
│                    └──────────┬──────────┘                  │
└────────────────────────────────┼──────────────────────────┘
                                 │ HTTP REST
                                 ▼
                    ┌─────────────────────┐
                    │  Gateway Python     │
                    │  FastAPI Server     │
                    │  (localhost:8080)   │
                    └─────────────────────┘
```

---

## 📁 Estructura de Archivos

### Modelos

**Archivo**: `shared/models/gateway-port.model.ts`
**Líneas**: 190
**Ubicación**: `/ui-ngx/src/app/modules/home/pages/gdt/shared/models/`

```typescript
// Enums
export enum PortStatus {
  DISABLED = 'disabled',
  ENABLED = 'enabled',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

// Interfaces
export interface PortConfig { ... }
export interface PortInfo { ... }
export interface AvailablePort { ... }
export interface GatewayStatus { ... }

// Constants
export const BAUDRATE_OPTIONS = [9600, 19200, 38400, ...];
export const PARITY_OPTIONS = [{ value: 'N', label: 'None' }, ...];
export const DEFAULT_PORT_CONFIG = { ... };

// Helper Functions
export function getStatusLabel(status: PortStatus): string { ... }
export function getStatusColor(status: PortStatus): string { ... }
```

**Características**:
- ✅ Tipado fuerte para todas las entidades
- ✅ Constantes de configuración reutilizables
- ✅ Funciones helper para UI
- ✅ Valores por defecto definidos

---

### Port List Component

**Archivos**:
- `port-list.component.ts` (290 líneas)
- `port-list.component.html` (160 líneas)
- `port-list.component.scss` (380 líneas)

**Ubicación**: `/ui-ngx/src/app/modules/home/pages/gdt/gateway-configuration/components/port-list/`

#### Funcionalidades

##### 1. Tarjeta de Estado del Gateway

```typescript
<div class="status-card" *ngIf="gatewayStatus">
  <div class="status-header">
    <mat-icon [class.running]="gatewayStatus.running">
      {{ gatewayStatus.running ? 'check_circle' : 'cancel' }}
    </mat-icon>
    <h3>Estado del Gateway</h3>
  </div>
  <div class="status-metrics">
    <div class="metric">
      <span class="metric-value">{{ gatewayStatus.total_ports }}</span>
      <span class="metric-label">Total</span>
    </div>
    <!-- ... más métricas ... -->
  </div>
</div>
```

**Métricas mostradas**:
- Total de puertos
- Puertos conectados (verde)
- Puertos habilitados (azul)
- Puertos deshabilitados (naranja)
- Puertos con error (rojo)

##### 2. Tabla de Puertos

**Columnas**:
- **Nombre**: Identificador del puerto
- **Dispositivo**: Ruta del dispositivo serial (`/dev/ttyUSB0`)
- **Protocolo**: Tipo de protocolo (Modbus RTU, etc.)
- **Baudrate**: Velocidad de transmisión
- **Estado**: Estado actual con icono y color
- **Descripción**: Texto descriptivo
- **Acciones**: Botones de control

**Acciones disponibles**:
```typescript
togglePortEnabled(port: PortInfo): void {
  if (port.enabled) {
    this.disablePort(port);
  } else {
    this.enablePort(port);
  }
}

openEditPortDialog(port: PortInfo): void { ... }
deletePort(port: PortInfo): void { ... }
```

##### 3. Auto-refresh

```typescript
private refreshInterval$ = interval(5000); // 5 segundos

ngOnInit(): void {
  this.loadPorts();

  this.refreshInterval$
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.loadPorts(true); // Silent refresh
      this.loadGatewayStatus();
    });
}
```

**Características**:
- ✅ Actualización automática cada 5 segundos
- ✅ Refresh silencioso (sin spinner)
- ✅ Cleanup automático con `takeUntil`

##### 4. Lista de Puertos Disponibles

```html
<div class="available-ports-info">
  <details>
    <summary>
      <mat-icon>usb</mat-icon>
      <span>Puertos disponibles en el sistema ({{ availablePorts.length }})</span>
    </summary>
    <div class="available-ports-list">
      <div class="available-port-item" *ngFor="let port of availablePorts">
        <code>{{ port.device }}</code>
        <span>{{ port.description }}</span>
      </div>
    </div>
  </details>
</div>
```

**Características**:
- ✅ Detección automática de puertos USB/Serial
- ✅ Información del fabricante y producto
- ✅ UI expandible/colapsable

---

### Add Port Dialog Component

**Archivos**:
- `add-port-dialog.component.ts` (150 líneas)
- `add-port-dialog.component.html` (230 líneas)
- `add-port-dialog.component.scss` (220 líneas)

**Ubicación**: `/ui-ngx/src/app/modules/home/pages/gdt/gateway-configuration/components/add-port-dialog/`

#### Funcionalidades

##### 1. Selector de Puertos Disponibles

Solo en modo creación (`!isEdit`):

```html
<div class="available-ports-section">
  <h3>Puertos Disponibles</h3>
  <div class="available-ports-grid">
    <button *ngFor="let port of availablePorts"
            (click)="selectAvailablePort(port)">
      <code>{{ port.device }}</code>
      <span>{{ port.description }}</span>
    </button>
  </div>
</div>
```

**Comportamiento al seleccionar**:
- Auto-completa campo `device`
- Genera nombre sugerido (`port-ttyUSB0`)
- Completa descripción con info del fabricante

##### 2. Formulario Reactivo

```typescript
this.portForm = this.fb.group({
  name: [
    { value: '', disabled: this.isEdit },
    [Validators.required, Validators.minLength(3),
     Validators.pattern(/^[a-zA-Z0-9_-]+$/)]
  ],
  device: ['', Validators.required],
  baudrate: [9600, Validators.required],
  bytesize: [8, Validators.required],
  parity: ['N', Validators.required],
  stopbits: [1.0, Validators.required],
  timeout: [1.0, [Validators.required, Validators.min(0.1), Validators.max(10)]],
  protocol: ['modbus_rtu', Validators.required],
  enabled: [true],
  auto_reconnect: [true],
  description: ['', Validators.maxLength(200)]
});
```

**Validaciones**:
- ✅ Nombre: requerido, mínimo 3 caracteres, solo alfanuméricos
- ✅ Dispositivo: requerido
- ✅ Timeout: entre 0.1 y 10 segundos
- ✅ Descripción: máximo 200 caracteres

##### 3. Secciones del Formulario

**Información Básica**:
- Nombre del puerto
- Dispositivo serial
- Descripción

**Parámetros Seriales**:
- Baudrate (dropdown con opciones estándar)
- Bytesize (5, 6, 7, 8 bits)
- Parity (None, Even, Odd, Mark, Space)
- Stop bits (1, 1.5, 2)
- Timeout (input numérico con validación)
- Protocolo (Modbus RTU, Modbus TCP, Enraf, Varec)

**Opciones Avanzadas**:
- ☑️ Habilitar puerto (conectar automáticamente)
- ☑️ Auto-reconexión (reconectar si se pierde conexión)

##### 4. Modo Edición vs. Creación

```typescript
onSubmit(): void {
  const formValue = this.portForm.getRawValue();

  if (this.isEdit) {
    // Solo enviar campos modificados
    const updates: Partial<PortConfig> = {};
    Object.keys(formValue).forEach(key => {
      if (key !== 'name' && this.portForm.get(key).dirty) {
        updates[key] = formValue[key];
      }
    });
    this.dialogRef.close(updates);
  } else {
    // Enviar configuración completa
    this.dialogRef.close(formValue as PortConfig);
  }
}
```

**Diferencias**:
- **Creación**: Campo nombre habilitado, selector de puertos visible
- **Edición**: Campo nombre deshabilitado, solo campos modificados se envían

---

### Integración con Gateway Configuration

**Archivo modificado**: `gateway-configuration.component.html`

**Cambios realizados**:

```html
<mat-tab-group class="gateway-tabs">
  <!-- Pestaña existente: Credenciales MQTT -->
  <mat-tab label="Credenciales MQTT">
    <ng-template matTabLabel>
      <mat-icon class="tab-icon">vpn_key</mat-icon>
      Credenciales MQTT
    </ng-template>
    <div class="tab-content">
      <!-- Contenido existente -->
    </div>
  </mat-tab>

  <!-- Nueva pestaña: Puertos Seriales -->
  <mat-tab label="Puertos Seriales">
    <ng-template matTabLabel>
      <mat-icon class="tab-icon">settings_input_component</mat-icon>
      Puertos Seriales
    </ng-template>
    <div class="tab-content">
      <tb-port-list></tb-port-list>
    </div>
  </mat-tab>
</mat-tab-group>
```

**Estilos agregados** (`gateway-configuration.component.scss`):

```scss
.gateway-tabs {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .tab-icon {
    margin-right: 8px;
    font-size: 20px;
  }

  .tab-content {
    padding: 24px;
    min-height: 400px;
  }
}
```

---

## 🎨 Diseño Visual

### Paleta de Colores

**Estados de Puerto**:
- 🟢 **Conectado** (`#4caf50`) - Verde
- 🔵 **Habilitado** (`#2196f3`) - Azul
- 🟠 **Deshabilitado/Error** (`#ff9800`) - Naranja
- 🔴 **Error Crítico** (`#f44336`) - Rojo

**Gradientes**:
- Tarjeta de estado: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

### Iconografía

| Icono | Uso |
|-------|-----|
| `check_circle` | Puerto conectado |
| `cancel` | Puerto desconectado |
| `power` | Habilitar/Deshabilitar |
| `edit` | Editar configuración |
| `delete` | Eliminar puerto |
| `usb` | Puertos disponibles |
| `settings_input_component` | Puertos seriales |
| `vpn_key` | Credenciales |

### Responsive Design

```scss
@media (max-width: 600px) {
  .form-row.two-columns {
    grid-template-columns: 1fr; // Una columna en móvil
  }
}
```

### Dark Mode Support

```scss
@media (prefers-color-scheme: dark) {
  .table-container {
    background: rgba(255, 255, 255, 0.05);
  }

  .device-path {
    background: rgba(255, 255, 255, 0.05);
  }
}
```

---

## 🔌 Integración con Gateway API

### Service Injection

```typescript
constructor(
  private gatewayApiService: GatewayApiService,
  private dialog: MatDialog,
  private dialogService: DialogService,
  private store: Store<AppState>
) {}
```

### Operaciones CRUD

#### Listar Puertos

```typescript
loadPorts(silent: boolean = false): void {
  if (!silent) this.isLoading = true;

  this.gatewayApiService.listPorts().subscribe({
    next: (ports) => {
      this.dataSource.data = ports;
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error loading ports:', error);
      this.store.dispatch(new ActionNotificationShow({
        message: 'Error al cargar los puertos',
        type: 'error'
      }));
    }
  });
}
```

#### Crear Puerto

```typescript
createPort(config: PortConfig): void {
  this.gatewayApiService.createPort(config).subscribe({
    next: (response) => {
      this.store.dispatch(new ActionNotificationShow({
        message: `Puerto "${config.name}" creado exitosamente`,
        type: 'success'
      }));
      this.loadPorts();
    },
    error: (error) => {
      this.store.dispatch(new ActionNotificationShow({
        message: `Error: ${error.error?.message}`,
        type: 'error'
      }));
    }
  });
}
```

#### Actualizar Puerto

```typescript
updatePort(portName: string, updates: Partial<PortConfig>): void {
  this.gatewayApiService.updatePort(portName, updates).subscribe({
    next: () => {
      this.store.dispatch(new ActionNotificationShow({
        message: `Puerto actualizado exitosamente`,
        type: 'success'
      }));
      this.loadPorts();
    }
  });
}
```

#### Eliminar Puerto

```typescript
deletePort(port: PortInfo): void {
  this.dialogService.confirm(
    'Eliminar Puerto',
    `¿Está seguro de eliminar "${port.name}"?`
  ).subscribe((confirmed) => {
    if (confirmed) {
      this.performDeletePort(port.name);
    }
  });
}
```

#### Habilitar/Deshabilitar Puerto

```typescript
enablePort(port: PortInfo): void {
  this.gatewayApiService.enablePort(port.name).subscribe({
    next: () => {
      this.store.dispatch(new ActionNotificationShow({
        message: `Puerto "${port.name}" habilitado`,
        type: 'success'
      }));
      this.loadPorts();
    }
  });
}
```

---

## 📊 Manejo de Estados

### Estados del Componente

```typescript
export class PortListComponent {
  isLoading = false;                          // Indica carga en progreso
  gatewayStatus: GatewayStatus | null = null; // Estado general del gateway
  availablePorts: AvailablePort[] = [];       // Puertos detectados en el sistema
  dataSource = new MatTableDataSource<PortInfo>([]); // Datos de la tabla
}
```

### Loading States

**Operaciones con spinner**:
- Carga inicial de puertos
- Crear puerto
- Actualizar puerto
- Eliminar puerto
- Habilitar/Deshabilitar puerto

**Operaciones silenciosas**:
- Auto-refresh cada 5 segundos
- Actualización de estado del gateway

### Error Handling

```typescript
error: (error) => {
  this.isLoading = false;
  console.error('Error:', error);

  this.store.dispatch(new ActionNotificationShow({
    message: `Error: ${error.error?.message || error.message}`,
    type: 'error',
    duration: 5000
  }));
}
```

**Tipos de errores manejados**:
- ❌ Puerto no encontrado (404)
- ❌ Puerto ya existe (400)
- ❌ Gateway no disponible (500)
- ❌ Error de conexión al dispositivo serial

---

## 🧪 Testing

### Testing Manual

**Pasos para probar**:

1. **Iniciar Gateway Python**:
```bash
cd gdt-gateway-service
python main.py
```

2. **Verificar API REST**:
```bash
curl http://localhost:8080/api/status
curl http://localhost:8080/api/ports
```

3. **Acceder a ThingsBoard UI**:
```
http://localhost:4200/#/gdt/gateway-configuration
```

4. **Navegar a pestaña "Puertos Seriales"**

5. **Probar operaciones**:
   - ✅ Ver lista de puertos
   - ✅ Ver puertos disponibles
   - ✅ Crear nuevo puerto
   - ✅ Editar puerto existente
   - ✅ Habilitar/Deshabilitar puerto
   - ✅ Eliminar puerto
   - ✅ Verificar auto-refresh

### Casos de Prueba

#### CP-001: Crear Puerto desde Puerto Disponible

**Pre-condiciones**:
- Gateway en ejecución
- Al menos un puerto USB disponible

**Pasos**:
1. Click en "Agregar Puerto"
2. Seleccionar puerto de la lista de disponibles
3. Verificar que se auto-complete device y nombre
4. Click en "Crear"

**Resultado esperado**:
- ✅ Puerto creado
- ✅ Aparece en tabla
- ✅ Estado "Conectado" si enabled=true
- ✅ Notificación de éxito

#### CP-002: Editar Configuración de Puerto

**Pre-condiciones**:
- Puerto existente en la tabla

**Pasos**:
1. Click en icono "Editar"
2. Modificar baudrate
3. Click en "Actualizar"

**Resultado esperado**:
- ✅ Puerto se desconecta
- ✅ Configuración actualizada
- ✅ Puerto se reconecta automáticamente
- ✅ Notificación de éxito

#### CP-003: Habilitar/Deshabilitar Puerto

**Pre-condiciones**:
- Puerto existente

**Pasos**:
1. Click en toggle icon
2. Verificar cambio de estado

**Resultado esperado**:
- ✅ Estado cambia inmediatamente
- ✅ Icono actualiza
- ✅ Notificación de éxito

#### CP-004: Eliminar Puerto

**Pre-condiciones**:
- Puerto existente

**Pasos**:
1. Click en icono "Eliminar"
2. Confirmar diálogo
3. Verificar eliminación

**Resultado esperado**:
- ✅ Diálogo de confirmación
- ✅ Puerto eliminado de tabla
- ✅ Puerto desconectado
- ✅ Notificación de éxito

#### CP-005: Auto-refresh

**Pre-condiciones**:
- Gateway en ejecución
- Al menos un puerto configurado

**Pasos**:
1. Conectar/desconectar dispositivo USB físicamente
2. Esperar 5 segundos

**Resultado esperado**:
- ✅ Estado del puerto actualiza automáticamente
- ✅ Sin recarga completa de página
- ✅ Lista de puertos disponibles actualiza

---

## 📦 Deployment

### Build

```bash
cd thingsboard/ui-ngx
npm run build
```

### Verificación de Módulos

Verificar que los componentes están declarados en `gdt.module.ts`:

```typescript
declarations: [
  // ...
  PortListComponent,
  AddPortDialogComponent,
  // ...
]
```

Verificar que los servicios están en providers:

```typescript
providers: [
  // ...
  GatewayApiService,
  // ...
]
```

---

## 🚀 Próximos Pasos

### Inmediatos

1. **Testing en entorno de desarrollo**
   - Probar con Gateway Python ejecutándose
   - Verificar todas las operaciones CRUD
   - Validar auto-refresh

2. **Documentar API Endpoints**
   - Actualizar documentación de Gateway API
   - Agregar ejemplos de uso

### Futuras Mejoras

1. **Device Discovery Automático** (Epic GW-3)
   - Escaneo automático de dispositivos Modbus
   - Auto-configuración de puertos

2. **Advanced Monitoring** (Epic GW-4)
   - Gráficas de actividad del puerto
   - Logs de comunicación
   - Estadísticas de errores

3. **Bulk Operations**
   - Habilitar/deshabilitar múltiples puertos
   - Importar/exportar configuración

4. **Port Templates**
   - Templates predefinidos por tipo de radar
   - Quick setup para configuraciones comunes

---

## 📝 Notas Técnicas

### Consideraciones de Seguridad

- ✅ Validación de inputs en frontend y backend
- ✅ Confirmación de operaciones destructivas (delete)
- ✅ Manejo seguro de errores (no exponer detalles internos)

### Performance

- ✅ Auto-refresh optimizado (silent loading)
- ✅ Cleanup de subscriptions con `takeUntil`
- ✅ Lazy loading de componentes (Material Dialog)

### Accesibilidad

- ✅ Labels en todos los campos de formulario
- ✅ Tooltips informativos
- ✅ Mensajes de error claros
- ✅ Keyboard navigation en diálogos

### Internacionalización

Todos los textos están en español. Para i18n futuro:
- Usar servicio de traducción de ThingsBoard
- Extraer strings a archivos de recursos
- Soportar en/es/pt

---

## 📚 Referencias

- [Gateway API Documentation](./GATEWAY_API_SPEC.md)
- [Port Manager Backend](../../gdt-gateway-service/gateway/port_manager.py)
- [Angular Material Documentation](https://material.angular.io/)
- [ThingsBoard UI Development](https://thingsboard.io/docs/user-guide/contribution/widgets-development/)

---

**Estado**: ✅ **COMPLETADO**
**Próximo Milestone**: Epic GW-3 - Device Discovery (30 SP)
