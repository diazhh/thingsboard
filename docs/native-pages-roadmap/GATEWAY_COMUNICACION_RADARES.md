# GDT Gateway Service - Comunicación con Radares

**Fecha:** 1 de diciembre de 2025
**Versión:** 1.0

---

## Índice

1. [Introducción](#introducción)
2. [Arquitectura del Gateway](#arquitectura-del-gateway)
3. [Comunicación Bidireccional](#comunicación-bidireccional)
4. [Gestión Dinámica de Puertos Seriales](#gestión-dinámica-de-puertos-seriales)
5. [Página de Configuración de Gateway](#página-de-configuración-de-gateway)
6. [Discovery de Dispositivos](#discovery-de-dispositivos)
7. [API del Gateway](#api-del-gateway)
8. [Protocolo TRL/2 (Modbus RTU)](#protocolo-trl2-modbus-rtu)
9. [Integración con ThingsBoard](#integración-con-thingsboard)
10. [Casos de Uso](#casos-de-uso)

---

## Introducción

El **GDT Gateway Service** es el sistema que transmite información de los radares de nivel (Rosemount 5900S y otros) a ThingsBoard mediante comunicación bidireccional. Reemplaza el servicio TRL2 original con una arquitectura más flexible basada en el ThingsBoard IoT Gateway.

### Componentes del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    THINGSBOARD PE                               │
│  - Rule Engine (cálculos volumétricos)                          │
│  - Device Management                                            │
│  - Telemetry Storage                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │ REST API / MQTT
                     │ (Bidireccional)
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│             GDT GATEWAY SERVICE (Python)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Gateway Client (REST/MQTT)                              │  │
│  │  - Publish telemetry                                     │  │
│  │  - Publish attributes                                    │  │
│  │  - Handle RPC requests                                   │  │
│  │  - Device provisioning                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Port Manager (NUEVO)                                    │  │
│  │  - Gestión dinámica de puertos seriales                 │  │
│  │  - Configuración multi-puerto                           │  │
│  │  - Hot-plugging de dispositivos USB                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Protocol Handlers                                       │  │
│  │  - Modbus RTU (TRL/2)                                    │  │
│  │  - Modbus TCP                                            │  │
│  │  - Enraf GPU                                             │  │
│  │  - Varec Mark/Space                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Discovery Service                                       │  │
│  │  - Auto-scan de puertos seriales                        │  │
│  │  - Detección de radares y FCUs                          │  │
│  │  - Identificación de dispositivos                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Web API (FastAPI/Flask)                                │  │
│  │  - Endpoints para configuración                         │  │
│  │  - Discovery API                                        │  │
│  │  - Status monitoring                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │ RS-485 / RS-232
                     │ Modbus RTU (TRL/2)
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DISPOSITIVOS DE CAMPO                        │
│  - Radares Rosemount 5900S (TRL/2)                             │
│  - FCUs (Field Communication Units)                            │
│  - Otros dispositivos Modbus                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquitectura del Gateway

### Estado Actual

#### TRL2 Service (Original)
- **Ubicación:** `gdt-tb-widgets/trl2/`
- **Comunicación:** MQTT directo a ThingsBoard
- **Limitación:** Puerto serial fijo en configuración
- **Protocolo:** Solo TRL/2 (Modbus RTU)

#### GDT Gateway Service (Nuevo)
- **Ubicación:** `gdt-tb-widgets/gdt-gateway-service/`
- **Comunicación:** ThingsBoard IoT Gateway REST API
- **Ventaja:** Gestión dinámica de puertos
- **Protocolos:** Multi-protocolo (TRL/2, Modbus TCP, Enraf, Varec)

#### GDT Gateway (Alternativo)
- **Ubicación:** `gdt-tb-widgets/gdt-gateway/`
- **Stack:** Python con Redis, Web UI
- **Características:** Dashboard web, health monitoring

### Estructura de Archivos GDT Gateway Service

```
gdt-gateway-service/
├── config/
│   ├── tb_gateway.json              # Configuración del gateway
│   ├── device_profiles.json         # Perfiles de dispositivos
│   ├── port_mappings.json           # NUEVO: Mapeo de puertos
│   └── protocol_mappings.json
├── gateway/
│   ├── gateway_client.py            # Cliente REST para TB
│   ├── device_provisioner.py
│   ├── rpc_handler.py               # Manejo de RPC bidireccional
│   └── port_manager.py              # NUEVO: Gestión de puertos
├── protocols/
│   ├── base_protocol.py
│   ├── modbus_rtu.py                # TRL/2
│   ├── modbus_tcp.py
│   ├── enraf_gpu.py
│   └── varec_markspace.py
├── services/
│   ├── discovery_service.py         # Discovery de dispositivos
│   ├── health_monitor.py
│   ├── ntp_monitor.py
│   └── telemetry_publisher.py
├── api/
│   ├── __init__.py
│   ├── gateway_api.py               # NUEVO: API REST
│   ├── discovery_api.py             # NUEVO: API de discovery
│   └── port_api.py                  # NUEVO: API de puertos
├── web/
│   └── dashboard.html               # NUEVO: UI simple
├── main.py
└── requirements.txt
```

---

## Comunicación Bidireccional

### Flujo de Telemetría (Radar → ThingsBoard)

```
1. Radar transmite datos via Modbus RTU
   ↓
2. Gateway lee holding registers
   ↓
3. Gateway parsea datos (nivel, temperatura, etc.)
   ↓
4. Gateway publica telemetría a ThingsBoard via REST API
   ↓
5. ThingsBoard almacena telemetría
   ↓
6. Rule Engine procesa datos (cálculos volumétricos)
   ↓
7. Frontend consume datos procesados
```

### Flujo de Comandos (ThingsBoard → Radar)

```
1. Usuario configura parámetro en frontend (ej: tank height)
   ↓
2. Frontend envía RPC command a ThingsBoard
   ↓
3. ThingsBoard encola RPC request
   ↓
4. Gateway escucha RPC requests (polling o webhook)
   ↓
5. Gateway valida comando (seal status, permissions)
   ↓
6. Gateway ejecuta comando via Modbus RTU (write registers)
   ↓
7. Gateway lee confirmación del radar
   ↓
8. Gateway envía respuesta RPC a ThingsBoard
   ↓
9. Frontend recibe confirmación
```

---

## Gestión Dinámica de Puertos Seriales

### Problema Actual

El servicio TRL2 original tiene el puerto serial hardcoded en configuración:

```python
# config/settings.py
class ModbusSettings(BaseSettings):
    port: str = Field(default="/dev/ttyUSB0", description="Serial port")
    # Puerto fijo, no se puede cambiar sin reiniciar
```

### Solución: Port Manager

Nuevo módulo para gestión dinámica de puertos seriales.

#### Implementación: `gateway/port_manager.py`

```python
"""
Port Manager - Gestión dinámica de puertos seriales.

Permite:
- Agregar/remover puertos en runtime
- Configurar múltiples puertos simultáneamente
- Hot-plugging de dispositivos USB
- Auto-detección de puertos disponibles
"""

import logging
import threading
import time
from typing import Dict, List, Optional, Callable
import serial
import serial.tools.list_ports
from dataclasses import dataclass


logger = logging.getLogger(__name__)


@dataclass
class PortConfiguration:
    """Configuración de un puerto serial."""
    port: str
    baudrate: int = 9600
    timeout: float = 1.0
    parity: str = 'N'
    stopbits: int = 1
    bytesize: int = 8
    protocol: str = 'modbus_rtu'
    enabled: bool = True
    devices: List[Dict] = None  # Lista de dispositivos en este puerto


class PortManager:
    """
    Gestor de puertos seriales con soporte multi-puerto.

    Características:
    - Gestión dinámica de múltiples puertos
    - Hot-plugging detection
    - Health monitoring por puerto
    - Callback notifications
    """

    def __init__(self):
        self.ports: Dict[str, PortConfiguration] = {}
        self.connections: Dict[str, serial.Serial] = {}
        self.port_status: Dict[str, str] = {}  # 'connected', 'disconnected', 'error'
        self.callbacks: List[Callable] = []
        self.monitoring_thread: Optional[threading.Thread] = None
        self.monitoring_active = False

        logger.info("PortManager initialized")

    def add_port(self, config: PortConfiguration) -> bool:
        """
        Agregar puerto serial a la gestión.

        Args:
            config: Configuración del puerto

        Returns:
            True si se agregó correctamente
        """
        port_name = config.port

        if port_name in self.ports:
            logger.warning(f"Port {port_name} already exists, updating configuration")

        self.ports[port_name] = config

        # Intentar conectar si está habilitado
        if config.enabled:
            success = self._connect_port(port_name)
            if success:
                logger.info(f"Port {port_name} added and connected")
            else:
                logger.warning(f"Port {port_name} added but connection failed")
            return success
        else:
            logger.info(f"Port {port_name} added but disabled")
            return True

    def remove_port(self, port_name: str) -> bool:
        """
        Remover puerto serial de la gestión.

        Args:
            port_name: Nombre del puerto (e.g., '/dev/ttyUSB0')

        Returns:
            True si se removió correctamente
        """
        if port_name not in self.ports:
            logger.warning(f"Port {port_name} does not exist")
            return False

        # Desconectar primero
        self._disconnect_port(port_name)

        # Remover configuración
        del self.ports[port_name]
        if port_name in self.port_status:
            del self.port_status[port_name]

        logger.info(f"Port {port_name} removed")
        return True

    def enable_port(self, port_name: str) -> bool:
        """Habilitar puerto y conectar."""
        if port_name not in self.ports:
            logger.error(f"Port {port_name} not found")
            return False

        self.ports[port_name].enabled = True
        return self._connect_port(port_name)

    def disable_port(self, port_name: str) -> bool:
        """Deshabilitar puerto y desconectar."""
        if port_name not in self.ports:
            logger.error(f"Port {port_name} not found")
            return False

        self.ports[port_name].enabled = False
        return self._disconnect_port(port_name)

    def update_port_config(self, port_name: str, **kwargs) -> bool:
        """
        Actualizar configuración de puerto.

        Args:
            port_name: Nombre del puerto
            **kwargs: Parámetros a actualizar (baudrate, timeout, etc.)

        Returns:
            True si se actualizó correctamente
        """
        if port_name not in self.ports:
            logger.error(f"Port {port_name} not found")
            return False

        config = self.ports[port_name]

        # Actualizar parámetros
        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)

        # Reconectar si está activo
        if config.enabled and port_name in self.connections:
            self._disconnect_port(port_name)
            return self._connect_port(port_name)

        return True

    def _connect_port(self, port_name: str) -> bool:
        """Conectar a puerto serial."""
        if port_name not in self.ports:
            return False

        config = self.ports[port_name]

        try:
            connection = serial.Serial(
                port=config.port,
                baudrate=config.baudrate,
                timeout=config.timeout,
                parity=config.parity,
                stopbits=config.stopbits,
                bytesize=config.bytesize
            )

            self.connections[port_name] = connection
            self.port_status[port_name] = 'connected'

            # Notificar callbacks
            self._notify_callbacks('port_connected', port_name)

            logger.info(f"Connected to port {port_name} at {config.baudrate} baud")
            return True

        except serial.SerialException as e:
            logger.error(f"Failed to connect to port {port_name}: {e}")
            self.port_status[port_name] = 'error'
            self._notify_callbacks('port_error', port_name, str(e))
            return False

    def _disconnect_port(self, port_name: str) -> bool:
        """Desconectar de puerto serial."""
        if port_name not in self.connections:
            return True

        try:
            self.connections[port_name].close()
            del self.connections[port_name]
            self.port_status[port_name] = 'disconnected'

            # Notificar callbacks
            self._notify_callbacks('port_disconnected', port_name)

            logger.info(f"Disconnected from port {port_name}")
            return True

        except Exception as e:
            logger.error(f"Error disconnecting from port {port_name}: {e}")
            return False

    def get_connection(self, port_name: str) -> Optional[serial.Serial]:
        """
        Obtener conexión serial activa.

        Args:
            port_name: Nombre del puerto

        Returns:
            Objeto serial.Serial o None si no está conectado
        """
        return self.connections.get(port_name)

    def get_port_status(self, port_name: str) -> str:
        """Obtener estado de puerto."""
        return self.port_status.get(port_name, 'unknown')

    def get_all_ports(self) -> Dict[str, PortConfiguration]:
        """Obtener todas las configuraciones de puertos."""
        return self.ports.copy()

    def get_active_ports(self) -> List[str]:
        """Obtener lista de puertos activos (conectados)."""
        return [port for port, status in self.port_status.items()
                if status == 'connected']

    def list_available_ports(self) -> List[Dict]:
        """
        Listar puertos seriales disponibles en el sistema.

        Returns:
            Lista de puertos con información
        """
        available = []

        for port_info in serial.tools.list_ports.comports():
            available.append({
                'port': port_info.device,
                'description': port_info.description,
                'hwid': port_info.hwid,
                'manufacturer': port_info.manufacturer,
                'product': port_info.product,
                'serial_number': port_info.serial_number,
                'managed': port_info.device in self.ports
            })

        return available

    def register_callback(self, callback: Callable):
        """
        Registrar callback para eventos de puertos.

        Args:
            callback: Función callback(event_type, port_name, *args)
        """
        self.callbacks.append(callback)

    def _notify_callbacks(self, event_type: str, port_name: str, *args):
        """Notificar a todos los callbacks registrados."""
        for callback in self.callbacks:
            try:
                callback(event_type, port_name, *args)
            except Exception as e:
                logger.error(f"Error in callback: {e}")

    def start_monitoring(self, interval: int = 5):
        """
        Iniciar monitoreo de puertos (hot-plugging detection).

        Args:
            interval: Intervalo de verificación en segundos
        """
        if self.monitoring_active:
            logger.warning("Monitoring already active")
            return

        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(
            target=self._monitoring_loop,
            args=(interval,),
            daemon=True
        )
        self.monitoring_thread.start()

        logger.info(f"Port monitoring started (interval: {interval}s)")

    def stop_monitoring(self):
        """Detener monitoreo de puertos."""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=10)

        logger.info("Port monitoring stopped")

    def _monitoring_loop(self, interval: int):
        """Loop de monitoreo de puertos."""
        last_available = set(p['port'] for p in self.list_available_ports())

        while self.monitoring_active:
            time.sleep(interval)

            # Detectar puertos disponibles
            current_available = set(p['port'] for p in self.list_available_ports())

            # Detectar nuevos puertos (hot-plug)
            new_ports = current_available - last_available
            if new_ports:
                logger.info(f"New ports detected: {new_ports}")
                self._notify_callbacks('new_ports_detected', None, list(new_ports))

            # Detectar puertos removidos (hot-unplug)
            removed_ports = last_available - current_available
            if removed_ports:
                logger.warning(f"Ports removed: {removed_ports}")
                self._notify_callbacks('ports_removed', None, list(removed_ports))

                # Desconectar puertos removidos
                for port in removed_ports:
                    if port in self.ports:
                        self._disconnect_port(port)

            last_available = current_available

    def close_all(self):
        """Cerrar todas las conexiones y detener monitoring."""
        self.stop_monitoring()

        for port_name in list(self.connections.keys()):
            self._disconnect_port(port_name)

        logger.info("All ports closed")
```

---

## Página de Configuración de Gateway

### Ubicación en ThingsBoard

Nueva página nativa: `thingsboard/ui-ngx/src/app/modules/home/pages/gdt/gateway-configuration/`

**Ya existe parcialmente**, pero necesita ampliarse para gestión de puertos.

### Funcionalidades Requeridas

#### 1. Vista de Puertos Seriales

**Componente:** `port-manager.component.ts`

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { GatewayService } from '../shared/services/gateway.service';
import { PortConfiguration } from '../shared/models/port-config.model';

@Component({
  selector: 'tb-port-manager',
  templateUrl: './port-manager.component.html',
  styleUrls: ['./port-manager.component.scss']
})
export class PortManagerComponent implements OnInit, OnDestroy {

  ports: PortConfiguration[] = [];
  availablePorts: any[] = [];
  loading = false;

  constructor(private gatewayService: GatewayService) {}

  ngOnInit() {
    this.loadPorts();
    this.loadAvailablePorts();
  }

  loadPorts() {
    this.loading = true;
    this.gatewayService.getAllPorts().subscribe({
      next: (ports) => {
        this.ports = ports;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading ports:', err);
        this.loading = false;
      }
    });
  }

  loadAvailablePorts() {
    this.gatewayService.getAvailablePorts().subscribe({
      next: (ports) => {
        this.availablePorts = ports;
      }
    });
  }

  onAddPort() {
    // Abrir diálogo para agregar puerto
  }

  onEditPort(port: PortConfiguration) {
    // Abrir diálogo para editar puerto
  }

  onRemovePort(port: PortConfiguration) {
    // Confirmar y remover puerto
  }

  onTogglePort(port: PortConfiguration) {
    // Habilitar/deshabilitar puerto
    this.gatewayService.togglePort(port.port, !port.enabled).subscribe({
      next: () => {
        port.enabled = !port.enabled;
      }
    });
  }

  onDiscoverDevices(port: PortConfiguration) {
    // Iniciar discovery en este puerto
    this.gatewayService.discoverDevices(port.port).subscribe({
      next: (devices) => {
        // Mostrar dispositivos descubiertos
      }
    });
  }
}
```

**Template:** `port-manager.component.html`

```html
<mat-card>
  <mat-card-header>
    <mat-card-title>Serial Port Configuration</mat-card-title>
    <mat-card-subtitle>Manage serial ports for radar communication</mat-card-subtitle>
  </mat-card-header>

  <mat-card-content>
    <!-- Available Ports Info -->
    <div class="available-ports-section">
      <h3>Available Serial Ports</h3>
      <mat-chip-list>
        <mat-chip *ngFor="let port of availablePorts"
                  [class.managed]="isManaged(port.port)">
          {{ port.port }} - {{ port.description }}
        </mat-chip>
      </mat-chip-list>
      <button mat-raised-button color="primary" (click)="loadAvailablePorts()">
        <mat-icon>refresh</mat-icon> Refresh
      </button>
    </div>

    <!-- Configured Ports Table -->
    <table mat-table [dataSource]="ports" class="ports-table">

      <!-- Port Column -->
      <ng-container matColumnDef="port">
        <th mat-header-cell *matHeaderCellDef>Port</th>
        <td mat-cell *matCellDef="let port">{{ port.port }}</td>
      </ng-container>

      <!-- Baudrate Column -->
      <ng-container matColumnDef="baudrate">
        <th mat-header-cell *matHeaderCellDef>Baudrate</th>
        <td mat-cell *matCellDef="let port">{{ port.baudrate }}</td>
      </ng-container>

      <!-- Protocol Column -->
      <ng-container matColumnDef="protocol">
        <th mat-header-cell *matHeaderCellDef>Protocol</th>
        <td mat-cell *matCellDef="let port">{{ port.protocol }}</td>
      </ng-container>

      <!-- Status Column -->
      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let port">
          <mat-chip [class.connected]="port.status === 'connected'"
                    [class.disconnected]="port.status === 'disconnected'"
                    [class.error]="port.status === 'error'">
            {{ port.status }}
          </mat-chip>
        </td>
      </ng-container>

      <!-- Devices Column -->
      <ng-container matColumnDef="devices">
        <th mat-header-cell *matHeaderCellDef>Devices</th>
        <td mat-cell *matCellDef="let port">
          {{ port.devices?.length || 0 }}
        </td>
      </ng-container>

      <!-- Enabled Column -->
      <ng-container matColumnDef="enabled">
        <th mat-header-cell *matHeaderCellDef>Enabled</th>
        <td mat-cell *matCellDef="let port">
          <mat-slide-toggle [(ngModel)]="port.enabled"
                           (change)="onTogglePort(port)">
          </mat-slide-toggle>
        </td>
      </ng-container>

      <!-- Actions Column -->
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let port">
          <button mat-icon-button [matMenuTriggerFor]="portMenu">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #portMenu="matMenu">
            <button mat-menu-item (click)="onEditPort(port)">
              <mat-icon>edit</mat-icon> Edit
            </button>
            <button mat-menu-item (click)="onDiscoverDevices(port)">
              <mat-icon>search</mat-icon> Discover Devices
            </button>
            <button mat-menu-item (click)="onRemovePort(port)" color="warn">
              <mat-icon>delete</mat-icon> Remove
            </button>
          </mat-menu>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>

    <!-- Add Port Button -->
    <button mat-fab color="primary"
            class="add-port-button"
            (click)="onAddPort()">
      <mat-icon>add</mat-icon>
    </button>

  </mat-card-content>
</mat-card>
```

#### 2. Diálogo de Agregar/Editar Puerto

**Componente:** `port-dialog.component.ts`

```typescript
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'tb-port-dialog',
  templateUrl: './port-dialog.component.html'
})
export class PortDialogComponent {

  portForm: FormGroup;
  availablePorts: string[] = [];
  baudrates = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
  protocols = ['modbus_rtu', 'modbus_tcp', 'enraf_gpu', 'varec_markspace'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PortDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.availablePorts = data.availablePorts || [];

    this.portForm = this.fb.group({
      port: [data.port?.port || '', Validators.required],
      baudrate: [data.port?.baudrate || 9600, Validators.required],
      timeout: [data.port?.timeout || 1.0, [Validators.required, Validators.min(0.1)]],
      parity: [data.port?.parity || 'N', Validators.required],
      stopbits: [data.port?.stopbits || 1, Validators.required],
      bytesize: [data.port?.bytesize || 8, Validators.required],
      protocol: [data.port?.protocol || 'modbus_rtu', Validators.required],
      enabled: [data.port?.enabled !== false]
    });
  }

  onSave() {
    if (this.portForm.valid) {
      this.dialogRef.close(this.portForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
```

**Template:** `port-dialog.component.html`

```html
<h2 mat-dialog-title>{{ data.port ? 'Edit' : 'Add' }} Serial Port</h2>

<mat-dialog-content>
  <form [formGroup]="portForm">

    <!-- Port Selection -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Serial Port</mat-label>
      <mat-select formControlName="port">
        <mat-option *ngFor="let port of availablePorts" [value]="port">
          {{ port }}
        </mat-option>
      </mat-select>
      <mat-hint>Select from available ports or type custom path</mat-hint>
    </mat-form-field>

    <!-- Baudrate -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Baudrate</mat-label>
      <mat-select formControlName="baudrate">
        <mat-option *ngFor="let rate of baudrates" [value]="rate">
          {{ rate }}
        </mat-option>
      </mat-select>
    </mat-form-field>

    <!-- Protocol -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Protocol</mat-label>
      <mat-select formControlName="protocol">
        <mat-option value="modbus_rtu">Modbus RTU (TRL/2)</mat-option>
        <mat-option value="modbus_tcp">Modbus TCP</mat-option>
        <mat-option value="enraf_gpu">Enraf GPU</mat-option>
        <mat-option value="varec_markspace">Varec Mark/Space</mat-option>
      </mat-select>
    </mat-form-field>

    <!-- Advanced Settings -->
    <mat-expansion-panel>
      <mat-expansion-panel-header>
        <mat-panel-title>Advanced Settings</mat-panel-title>
      </mat-expansion-panel-header>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Timeout (seconds)</mat-label>
        <input matInput type="number" step="0.1" formControlName="timeout">
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Parity</mat-label>
        <mat-select formControlName="parity">
          <mat-option value="N">None</mat-option>
          <mat-option value="E">Even</mat-option>
          <mat-option value="O">Odd</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Stop Bits</mat-label>
        <mat-select formControlName="stopbits">
          <mat-option [value]="1">1</mat-option>
          <mat-option [value]="2">2</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Byte Size</mat-label>
        <mat-select formControlName="bytesize">
          <mat-option [value]="7">7</mat-option>
          <mat-option [value]="8">8</mat-option>
        </mat-select>
      </mat-form-field>

    </mat-expansion-panel>

    <!-- Enabled Toggle -->
    <mat-slide-toggle formControlName="enabled">
      Enable port on save
    </mat-slide-toggle>

  </form>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button (click)="onCancel()">Cancel</button>
  <button mat-raised-button color="primary"
          (click)="onSave()"
          [disabled]="!portForm.valid">
    Save
  </button>
</mat-dialog-actions>
```

---

## Discovery de Dispositivos

### Funcionalidad WinSetup-like

El WinSetup de TankMaster tiene una función de "Scan" para detectar automáticamente FCUs y radares en un puerto serial.

### Implementación en GDT Gateway Service

El `DiscoveryService` ya existe en `gdt-gateway-service/services/discovery_service.py`.

### Página de Discovery en ThingsBoard

**Ubicación:** `gdt/gateway-configuration/device-discovery.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { GatewayService } from '../shared/services/gateway.service';

@Component({
  selector: 'tb-device-discovery',
  templateUrl: './device-discovery.component.html'
})
export class DeviceDiscoveryComponent implements OnInit {

  discoveryInProgress = false;
  discoveredDevices: any[] = [];
  selectedPort: string = '';
  selectedBaudrates: number[] = [9600, 19200];
  addressRange = { start: 1, end: 247 };

  constructor(private gatewayService: GatewayService) {}

  ngOnInit() {}

  startDiscovery() {
    if (!this.selectedPort) {
      return;
    }

    this.discoveryInProgress = true;
    this.discoveredDevices = [];

    const params = {
      ports: [this.selectedPort],
      baudrates: this.selectedBaudrates,
      addressRange: [this.addressRange.start, this.addressRange.end]
    };

    this.gatewayService.discoverModbusRTU(params).subscribe({
      next: (devices) => {
        this.discoveredDevices = devices;
        this.discoveryInProgress = false;
      },
      error: (err) => {
        console.error('Discovery error:', err);
        this.discoveryInProgress = false;
      }
    });
  }

  provisionDevice(device: any) {
    // Provision dispositivo en ThingsBoard
    this.gatewayService.provisionDevice(device).subscribe({
      next: () => {
        device.provisioned = true;
      }
    });
  }

  provisionAll() {
    // Provision todos los dispositivos descubiertos
    this.discoveredDevices.forEach(device => {
      if (!device.provisioned) {
        this.provisionDevice(device);
      }
    });
  }
}
```

**Template:** `device-discovery.component.html`

```html
<mat-card>
  <mat-card-header>
    <mat-card-title>Device Discovery</mat-card-title>
    <mat-card-subtitle>Scan for radars and FCUs on serial ports</mat-card-subtitle>
  </mat-card-header>

  <mat-card-content>

    <!-- Discovery Configuration -->
    <form class="discovery-form">

      <mat-form-field appearance="outline">
        <mat-label>Serial Port</mat-label>
        <mat-select [(ngModel)]="selectedPort" name="port">
          <mat-option value="/dev/ttyUSB0">/dev/ttyUSB0</mat-option>
          <mat-option value="/dev/ttyUSB1">/dev/ttyUSB1</mat-option>
          <!-- Populate from available ports -->
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Baudrates to Try</mat-label>
        <mat-select [(ngModel)]="selectedBaudrates" multiple name="baudrates">
          <mat-option [value]="9600">9600</mat-option>
          <mat-option [value]="19200">19200</mat-option>
          <mat-option [value]="38400">38400</mat-option>
          <mat-option [value]="57600">57600</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="address-range">
        <mat-form-field appearance="outline">
          <mat-label>Start Address</mat-label>
          <input matInput type="number" [(ngModel)]="addressRange.start" name="startAddr">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>End Address</mat-label>
          <input matInput type="number" [(ngModel)]="addressRange.end" name="endAddr">
        </mat-form-field>
      </div>

      <button mat-raised-button color="primary"
              (click)="startDiscovery()"
              [disabled]="discoveryInProgress || !selectedPort">
        <mat-icon>search</mat-icon>
        {{ discoveryInProgress ? 'Scanning...' : 'Start Discovery' }}
      </button>

    </form>

    <!-- Discovery Progress -->
    <mat-progress-bar *ngIf="discoveryInProgress"
                      mode="indeterminate">
    </mat-progress-bar>

    <!-- Discovered Devices -->
    <div *ngIf="discoveredDevices.length > 0" class="discovered-devices">
      <h3>Discovered Devices ({{ discoveredDevices.length }})</h3>

      <button mat-raised-button color="accent" (click)="provisionAll()">
        <mat-icon>cloud_upload</mat-icon>
        Provision All Devices
      </button>

      <table mat-table [dataSource]="discoveredDevices">

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Device Name</th>
          <td mat-cell *matCellDef="let device">{{ device.name }}</td>
        </ng-container>

        <ng-container matColumnDef="type">
          <th mat-header-cell *matHeaderCellDef>Type</th>
          <td mat-cell *matCellDef="let device">{{ device.type }}</td>
        </ng-container>

        <ng-container matColumnDef="port">
          <th mat-header-cell *matHeaderCellDef>Port</th>
          <td mat-cell *matCellDef="let device">{{ device.port }}</td>
        </ng-container>

        <ng-container matColumnDef="baudrate">
          <th mat-header-cell *matHeaderCellDef>Baudrate</th>
          <td mat-cell *matCellDef="let device">{{ device.baudrate }}</td>
        </ng-container>

        <ng-container matColumnDef="address">
          <th mat-header-cell *matHeaderCellDef>Address</th>
          <td mat-cell *matCellDef="let device">{{ device.slave_id }}</td>
        </ng-container>

        <ng-container matColumnDef="model">
          <th mat-header-cell *matHeaderCellDef>Model</th>
          <td mat-cell *matCellDef="let device">{{ device.model }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let device">
            <button mat-raised-button color="primary"
                    (click)="provisionDevice(device)"
                    [disabled]="device.provisioned">
              {{ device.provisioned ? 'Provisioned' : 'Provision' }}
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>

  </mat-card-content>
</mat-card>
```

---

## API del Gateway

### REST API Endpoints

El Gateway Service debe exponer una API REST para ser consumida por la página de ThingsBoard.

**Implementación:** `api/gateway_api.py`

```python
"""
Gateway REST API for configuration and control.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from gateway.port_manager import PortManager, PortConfiguration
from services.discovery_service import DiscoveryService


logger = logging.getLogger(__name__)

app = FastAPI(title="GDT Gateway API", version="1.0.0")

# Enable CORS for ThingsBoard frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
port_manager = PortManager()
discovery_service = DiscoveryService()


# Request/Response Models
class PortConfigRequest(BaseModel):
    port: str
    baudrate: int = 9600
    timeout: float = 1.0
    parity: str = 'N'
    stopbits: int = 1
    bytesize: int = 8
    protocol: str = 'modbus_rtu'
    enabled: bool = True


class PortStatusResponse(BaseModel):
    port: str
    status: str
    enabled: bool
    baudrate: int
    protocol: str
    devices: Optional[List[Dict]] = []


class DiscoveryRequest(BaseModel):
    ports: Optional[List[str]] = None
    baudrates: Optional[List[int]] = None
    address_range: tuple = (1, 247)
    timeout: float = 1.0


# Endpoints

@app.get("/")
def root():
    return {"message": "GDT Gateway API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Port Management

@app.get("/api/ports", response_model=List[PortStatusResponse])
def get_all_ports():
    """Get all configured ports."""
    ports = port_manager.get_all_ports()

    response = []
    for port_name, config in ports.items():
        response.append(PortStatusResponse(
            port=port_name,
            status=port_manager.get_port_status(port_name),
            enabled=config.enabled,
            baudrate=config.baudrate,
            protocol=config.protocol,
            devices=config.devices or []
        ))

    return response


@app.get("/api/ports/available")
def get_available_ports():
    """Get available serial ports in system."""
    return port_manager.list_available_ports()


@app.post("/api/ports")
def add_port(config: PortConfigRequest):
    """Add new serial port configuration."""
    port_config = PortConfiguration(
        port=config.port,
        baudrate=config.baudrate,
        timeout=config.timeout,
        parity=config.parity,
        stopbits=config.stopbits,
        bytesize=config.bytesize,
        protocol=config.protocol,
        enabled=config.enabled
    )

    success = port_manager.add_port(port_config)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to add port")

    return {"message": "Port added successfully", "port": config.port}


@app.put("/api/ports/{port_name}")
def update_port(port_name: str, config: PortConfigRequest):
    """Update port configuration."""
    success = port_manager.update_port_config(
        port_name,
        baudrate=config.baudrate,
        timeout=config.timeout,
        parity=config.parity,
        stopbits=config.stopbits,
        bytesize=config.bytesize,
        protocol=config.protocol,
        enabled=config.enabled
    )

    if not success:
        raise HTTPException(status_code=404, detail="Port not found")

    return {"message": "Port updated successfully"}


@app.delete("/api/ports/{port_name}")
def remove_port(port_name: str):
    """Remove port configuration."""
    success = port_manager.remove_port(port_name)

    if not success:
        raise HTTPException(status_code=404, detail="Port not found")

    return {"message": "Port removed successfully"}


@app.post("/api/ports/{port_name}/enable")
def enable_port(port_name: str):
    """Enable port."""
    success = port_manager.enable_port(port_name)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to enable port")

    return {"message": "Port enabled successfully"}


@app.post("/api/ports/{port_name}/disable")
def disable_port(port_name: str):
    """Disable port."""
    success = port_manager.disable_port(port_name)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to disable port")

    return {"message": "Port disabled successfully"}


# Discovery

@app.post("/api/discovery/modbus-rtu")
def discover_modbus_rtu(request: DiscoveryRequest):
    """Discover Modbus RTU devices."""
    devices = discovery_service.discover_modbus_rtu(
        ports=request.ports,
        baudrates=request.baudrates,
        address_range=request.address_range,
        timeout=request.timeout
    )

    return {
        "device_count": len(devices),
        "devices": devices
    }


@app.post("/api/discovery/modbus-tcp")
def discover_modbus_tcp(ip_range: str, port: int = 502):
    """Discover Modbus TCP devices."""
    devices = discovery_service.discover_modbus_tcp(
        ip_range=ip_range,
        port=port
    )

    return {
        "device_count": len(devices),
        "devices": devices
    }


@app.get("/api/discovery/results")
def get_discovery_results():
    """Get all discovered devices."""
    devices = discovery_service.get_discovered_devices()
    return {
        "device_count": len(devices),
        "devices": devices
    }


@app.delete("/api/discovery/results")
def clear_discovery_results():
    """Clear discovered devices list."""
    discovery_service.clear_discovered_devices()
    return {"message": "Discovery results cleared"}


# Device Provisioning

@app.post("/api/devices/provision")
def provision_device(device_info: Dict[str, Any]):
    """Provision discovered device to ThingsBoard."""
    # Implementation using device_provisioner
    # ...
    return {"message": "Device provisioned successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## Servicio Angular para Gateway

**Ubicación:** `gdt/shared/services/gateway.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PortConfiguration } from '../models/port-config.model';

@Injectable({
  providedIn: 'root'
})
export class GatewayService {

  private apiUrl = 'http://localhost:8000/api';  // Gateway API URL

  constructor(private http: HttpClient) {}

  // Port Management

  getAllPorts(): Observable<PortConfiguration[]> {
    return this.http.get<PortConfiguration[]>(`${this.apiUrl}/ports`);
  }

  getAvailablePorts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ports/available`);
  }

  addPort(config: PortConfiguration): Observable<any> {
    return this.http.post(`${this.apiUrl}/ports`, config);
  }

  updatePort(portName: string, config: PortConfiguration): Observable<any> {
    return this.http.put(`${this.apiUrl}/ports/${portName}`, config);
  }

  removePort(portName: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ports/${portName}`);
  }

  togglePort(portName: string, enabled: boolean): Observable<any> {
    const endpoint = enabled ? 'enable' : 'disable';
    return this.http.post(`${this.apiUrl}/ports/${portName}/${endpoint}`, {});
  }

  // Discovery

  discoverModbusRTU(params: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/discovery/modbus-rtu`, params);
  }

  discoverModbusTCP(ipRange: string, port: number = 502): Observable<any> {
    return this.http.post(`${this.apiUrl}/discovery/modbus-tcp`, { ip_range: ipRange, port });
  }

  getDiscoveryResults(): Observable<any> {
    return this.http.get(`${this.apiUrl}/discovery/results`);
  }

  clearDiscoveryResults(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/discovery/results`);
  }

  // Device Provisioning

  provisionDevice(device: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/devices/provision`, device);
  }
}
```

---

## Protocolo TRL/2 (Modbus RTU)

### Registers Rosemount 5900S

**Telemetry Registers:**
- `0x0000-0x0001`: Level (Float32, mm)
- `0x0002-0x0003`: Temperature Average (Float32, °C)
- `0x0004-0x0005`: Signal Quality (Float32, %)
- `0x0006`: RTG Status (UInt16)

**Configuration Registers:**
- `0x1000-0x1001`: Tank Height (Float32, mm)
- `0x1002-0x1003`: Offset Distance (Float32, mm)
- `0x1004-0x1005`: Calibration Distance (Float32, mm)

### Implementación en Gateway

Ya existe en `protocols/modbus_rtu.py`.

---

## Integración con ThingsBoard

### Flujo Completo

1. **Frontend (Angular)** → Configurar puertos en UI
2. **Gateway API (FastAPI)** → Recibir configuración
3. **Port Manager** → Gestionar puertos dinámicamente
4. **Protocol Handler** → Leer telemetría de radares
5. **Gateway Client** → Publicar a ThingsBoard REST API
6. **ThingsBoard** → Almacenar y procesar datos

---

## Conclusión

La documentación cubre:

✅ **Gestión Dinámica de Puertos** - Port Manager con add/remove en runtime
✅ **Comunicación Bidireccional** - Telemetría + RPC commands
✅ **Discovery de Dispositivos** - Scan automático de radares y FCUs
✅ **Página de Configuración** - UI completa en ThingsBoard
✅ **API REST del Gateway** - Endpoints para todas las operaciones
✅ **Integración ThingsBoard** - Flujo completo de datos

### Tareas Pendientes

1. Implementar Port Manager completo
2. Agregar API REST al Gateway Service
3. Crear páginas de configuración en ThingsBoard
4. Implementar discovery UI
5. Testing con radares reales
6. Documentar protocolos adicionales (Enraf, Varec)

### Próximos Pasos

1. Revisar y aprobar arquitectura de Port Manager
2. Priorizar implementación en roadmap
3. Asignar recursos para desarrollo
4. Planificar testing con hardware
