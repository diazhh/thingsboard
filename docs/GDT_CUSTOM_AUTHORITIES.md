# Sistema de Authorities Personalizadas GDT para ThingsBoard

## Resumen

Este documento describe las modificaciones realizadas al sistema de autenticación y autorización de ThingsBoard para soportar authorities (roles) personalizadas específicas para el proyecto GDT:

- **INGENIERO** - Rol de ingeniería con permisos similares a TENANT_ADMIN
- **OPERADOR** - Rol de operaciones con permisos de lectura/escritura limitados
- **REPORTES** - Rol de reportes con permisos de solo lectura
- **LABORATORIO** - Rol de laboratorio con permisos similares a OPERADOR

---

## Arquitectura del Sistema de Autorización

ThingsBoard utiliza un sistema de autorización en capas:

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Angular)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   AuthGuard     │  │  Route Config   │  │  AuthService    │  │
│  │  (auth.guard.ts)│  │ (data.auth[])   │  │(auth.service.ts)│  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Spring)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  @PreAuthorize  │  │AccessControl    │  │  Permissions    │  │
│  │  (Controllers)  │──▶│    Service      │──▶│   Classes       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Archivos Modificados

### 1. Backend - Definición del Enum Authority

**Archivo:** `common/data/src/main/java/org/thingsboard/server/common/data/security/Authority.java`

```java
public enum Authority {
    SYS_ADMIN(0),
    TENANT_ADMIN(1),
    CUSTOMER_USER(2),
    OPERADOR(3),      // ← GDT Custom
    INGENIERO(4),     // ← GDT Custom
    REPORTES(5),      // ← GDT Custom
    LABORATORIO(6),   // ← GDT Custom
    
    REFRESH_TOKEN(10),
    PRE_VERIFICATION_TOKEN(11),
    MFA_CONFIGURATION_TOKEN(12);
    // ...
}
```

**Cuándo modificar:** Cuando se necesite agregar una nueva authority personalizada.

---

### 2. Backend - Clases de Permisos

**Ubicación:** `application/src/main/java/org/thingsboard/server/service/security/permission/`

#### 2.1 IngenieroPermissions.java

Define los permisos para usuarios con authority INGENIERO. Similar a TENANT_ADMIN pero con restricciones:

```java
@Component
public class IngenieroPermissions extends AbstractPermissions {
    public IngenieroPermissions() {
        super();
        put(Resource.ALARM, tenantEntityPermissionChecker);
        put(Resource.ASSET, tenantEntityPermissionChecker);
        put(Resource.DEVICE, tenantEntityPermissionChecker);
        put(Resource.CUSTOMER, tenantEntityPermissionChecker);
        put(Resource.DASHBOARD, tenantEntityPermissionChecker);
        put(Resource.USER, userPermissionChecker);
        // ... más recursos
    }
}
```

**Permisos de INGENIERO:**
- ✅ Lectura/escritura de dispositivos, assets, dashboards, alarmas
- ✅ Lectura de usuarios del tenant
- ✅ Modificación de usuarios (excepto TENANT_ADMIN y SYS_ADMIN)
- ❌ No puede modificar configuración del tenant
- ❌ No puede eliminar el tenant

#### 2.2 OperadorPermissions.java

Define permisos para usuarios OPERADOR con capacidades de operación:

**Permisos de OPERADOR:**
- ✅ Lectura de dispositivos, assets, dashboards
- ✅ Escritura de atributos y telemetría
- ✅ Llamadas RPC a dispositivos
- ✅ Reconocimiento/limpieza de alarmas
- ❌ No puede crear/eliminar entidades
- ❌ No puede modificar otros usuarios

#### 2.3 ReportesPermissions.java

Define permisos de solo lectura para usuarios REPORTES:

**Permisos de REPORTES:**
- ✅ Lectura de dispositivos, assets, dashboards
- ✅ Lectura de telemetría y atributos
- ✅ Lectura de alarmas
- ❌ No puede escribir nada
- ❌ No puede modificar alarmas

#### 2.4 LaboratorioPermissions.java

Similar a OPERADOR, para usuarios de laboratorio:

**Permisos de LABORATORIO:**
- ✅ Lectura/escritura de dispositivos y assets
- ✅ Escritura de atributos y telemetría
- ✅ Reconocimiento de alarmas
- ❌ No puede crear/eliminar entidades principales

---

### 3. Backend - Registro de Permisos

**Archivo:** `application/src/main/java/org/thingsboard/server/service/security/permission/DefaultAccessControlService.java`

```java
@Service
public class DefaultAccessControlService implements AccessControlService {

    private final Map<Authority, Permissions> authorityPermissions = new HashMap<>();

    public DefaultAccessControlService(
            SysAdminPermissions sysAdminPermissions,
            TenantAdminPermissions tenantAdminPermissions,
            CustomerUserPermissions customerUserPermissions,
            MfaConfigurationPermissions mfaConfigurationPermissions,
            IngenieroPermissions ingenieroPermissions,        // ← GDT
            OperadorPermissions operadorPermissions,          // ← GDT
            ReportesPermissions reportesPermissions,          // ← GDT
            LaboratorioPermissions laboratorioPermissions) {  // ← GDT
        
        authorityPermissions.put(Authority.SYS_ADMIN, sysAdminPermissions);
        authorityPermissions.put(Authority.TENANT_ADMIN, tenantAdminPermissions);
        authorityPermissions.put(Authority.CUSTOMER_USER, customerUserPermissions);
        authorityPermissions.put(Authority.MFA_CONFIGURATION_TOKEN, mfaConfigurationPermissions);
        
        // Custom GDT authorities
        authorityPermissions.put(Authority.INGENIERO, ingenieroPermissions);
        authorityPermissions.put(Authority.OPERADOR, operadorPermissions);
        authorityPermissions.put(Authority.REPORTES, reportesPermissions);
        authorityPermissions.put(Authority.LABORATORIO, laboratorioPermissions);
    }
}
```

**Cuándo modificar:** Cuando se agregue una nueva clase de permisos.

---

### 4. Backend - Controladores REST

**Ubicación:** `application/src/main/java/org/thingsboard/server/controller/`

Todos los controladores que usan `@PreAuthorize` fueron actualizados para incluir las authorities personalizadas:

```java
// ANTES
@PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN', 'CUSTOMER_USER')")

// DESPUÉS
@PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN', 'CUSTOMER_USER', 'INGENIERO', 'OPERADOR', 'REPORTES', 'LABORATORIO')")
```

**Controladores principales modificados:**
- `AuthController.java` - Endpoints de autenticación
- `UserController.java` - Gestión de usuarios
- `TwoFactorAuthConfigController.java` - Configuración 2FA
- `TelemetryController.java` - Telemetría
- `DashboardController.java` - Dashboards
- `AlarmController.java` - Alarmas
- `EntityRelationController.java` - Relaciones
- Y muchos más...

**Cuándo modificar:** Cuando se necesite restringir o permitir acceso a endpoints específicos para ciertas authorities.

---

### 5. Frontend - Enum Authority

**Archivo:** `ui-ngx/src/app/shared/models/authority.enum.ts`

```typescript
export enum Authority {
  SYS_ADMIN = 'SYS_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  CUSTOMER_USER = 'CUSTOMER_USER',
  OPERADOR = 'OPERADOR',       // ← GDT Custom
  INGENIERO = 'INGENIERO',     // ← GDT Custom
  REPORTES = 'REPORTES',       // ← GDT Custom
  LABORATORIO = 'LABORATORIO', // ← GDT Custom
  REFRESH_TOKEN = 'REFRESH_TOKEN',
  PRE_VERIFICATION_TOKEN = 'PRE_VERIFICATION_TOKEN',
  MFA_CONFIGURATION_TOKEN = 'MFA_CONFIGURATION_TOKEN'
}
```

---

### 6. Frontend - Configuración de Rutas

Las rutas de Angular usan la propiedad `data.auth` para definir qué authorities pueden acceder:

#### 6.1 Home Links

**Archivo:** `ui-ngx/src/app/modules/home/pages/home-links/home-links-routing.module.ts`

```typescript
const routes: Routes = [
  {
    path: 'home',
    component: HomeLinksComponent,
    data: {
      auth: [
        Authority.SYS_ADMIN, 
        Authority.TENANT_ADMIN, 
        Authority.CUSTOMER_USER,
        Authority.INGENIERO,    // ← GDT
        Authority.OPERADOR,     // ← GDT
        Authority.REPORTES,     // ← GDT
        Authority.LABORATORIO   // ← GDT
      ],
      title: 'home.home',
      // ...
    }
  }
];
```

También contiene la lógica para cargar el dashboard correcto según la authority:

```typescript
const getHomeDashboard = (store: Store<AppState>, resourcesService: ResourcesService) => {
  const authority = getCurrentAuthUser(store).authority;
  switch (authority) {
    case Authority.SYS_ADMIN:
      return applySystemParametersToHomeDashboard(store, resourcesService.loadJsonResource(sysAdminHomePageJson), authority);
    case Authority.TENANT_ADMIN:
    case Authority.INGENIERO:  // ← Usa dashboard de TENANT_ADMIN
      return applySystemParametersToHomeDashboard(store, resourcesService.loadJsonResource(tenantAdminHomePageJson), authority);
    case Authority.CUSTOMER_USER:
    case Authority.OPERADOR:     // ← Usa dashboard de CUSTOMER_USER
    case Authority.REPORTES:     // ← Usa dashboard de CUSTOMER_USER
    case Authority.LABORATORIO:  // ← Usa dashboard de CUSTOMER_USER
      return applySystemParametersToHomeDashboard(store, resourcesService.loadJsonResource(customerUserHomePageJson), authority);
    default:
      return of(null);
  }
};
```

#### 6.2 Otras Rutas Modificadas

| Archivo | Descripción |
|---------|-------------|
| `profile-routing.module.ts` | Página de perfil de usuario |
| `account-routing.module.ts` | Configuración de cuenta |
| `alarm-routing.module.ts` | Gestión de alarmas |
| `dashboard-routing.module.ts` | Visualización de dashboards |
| `notification-routing.module.ts` | Notificaciones |
| `security-routing.module.ts` | Configuración de seguridad |
| `notification-settings-routing.modules.ts` | Configuración de notificaciones |

**Cuándo modificar:** Cuando se necesite dar o quitar acceso a páginas específicas para ciertas authorities.

---

### 7. Frontend - Auth Service

**Archivo:** `ui-ngx/src/app/core/auth/auth.service.ts`

Métodos modificados:

#### 7.1 forceDefaultPlace()

```typescript
private forceDefaultPlace(authState: AuthState, path: string, params?: any): boolean {
  // ...
  if (authState.authUser.authority === Authority.TENANT_ADMIN || 
      authState.authUser.authority === Authority.CUSTOMER_USER ||
      authState.authUser.authority === Authority.INGENIERO ||    // ← GDT
      authState.authUser.authority === Authority.OPERADOR ||     // ← GDT
      authState.authUser.authority === Authority.REPORTES ||     // ← GDT
      authState.authUser.authority === Authority.LABORATORIO) {  // ← GDT
    // Verificar dashboard por defecto
  }
}
```

#### 7.2 defaultUrl()

```typescript
defaultUrl(isAuthenticated: boolean, authState?: AuthState, path?: string, params?: any): string {
  // ...
  if (authState.authUser.authority === Authority.TENANT_ADMIN || 
      authState.authUser.authority === Authority.CUSTOMER_USER ||
      authState.authUser.authority === Authority.INGENIERO ||
      authState.authUser.authority === Authority.OPERADOR ||
      authState.authUser.authority === Authority.REPORTES ||
      authState.authUser.authority === Authority.LABORATORIO) {
    // Redirigir a dashboard por defecto si existe
  }
}
```

---

### 8. Widget - Modelo de Roles

**Archivo:** `gdt-tb-widgets/tbwc/src/app/components/tank-visualization/models/user-role.model.ts`

Mapeo de authorities de ThingsBoard a roles del widget:

```typescript
export const TB_AUTHORITY_TO_ROLE: Record<string, UserRole> = {
  'SYS_ADMIN': UserRole.ADMIN,
  'TENANT_ADMIN': UserRole.ADMIN,
  'CUSTOMER_USER': UserRole.VIEWER,
  // GDT Custom Authorities
  'INGENIERO': UserRole.ENGINEER,
  'OPERADOR': UserRole.OPERATOR,
  'REPORTES': UserRole.VIEWER,
  'LABORATORIO': UserRole.OPERATOR,
};
```

---

## Guía de Modificación

### Agregar una Nueva Authority

1. **Backend - Authority.java**
   ```java
   // Agregar al enum
   NUEVA_AUTHORITY(7),
   ```

2. **Backend - Crear clase de permisos**
   ```java
   // Crear NuevaAuthorityPermissions.java
   @Component
   public class NuevaAuthorityPermissions extends AbstractPermissions {
       public NuevaAuthorityPermissions() {
           super();
           // Definir permisos por recurso
           put(Resource.DEVICE, ...);
       }
   }
   ```

3. **Backend - Registrar en DefaultAccessControlService**
   ```java
   // Agregar al constructor
   NuevaAuthorityPermissions nuevaAuthorityPermissions
   
   // Agregar al mapa
   authorityPermissions.put(Authority.NUEVA_AUTHORITY, nuevaAuthorityPermissions);
   ```

4. **Backend - Actualizar controladores**
   ```java
   @PreAuthorize("hasAnyAuthority('...', 'NUEVA_AUTHORITY')")
   ```

5. **Frontend - authority.enum.ts**
   ```typescript
   NUEVA_AUTHORITY = 'NUEVA_AUTHORITY',
   ```

6. **Frontend - Actualizar rutas**
   ```typescript
   data: {
     auth: [..., Authority.NUEVA_AUTHORITY]
   }
   ```

7. **Frontend - auth.service.ts**
   - Actualizar `forceDefaultPlace()` y `defaultUrl()` si aplica

8. **Widget - user-role.model.ts**
   ```typescript
   'NUEVA_AUTHORITY': UserRole.SOME_ROLE,
   ```

### Modificar Permisos de una Authority Existente

1. Editar la clase de permisos correspondiente:
   - `IngenieroPermissions.java`
   - `OperadorPermissions.java`
   - `ReportesPermissions.java`
   - `LaboratorioPermissions.java`

2. Modificar los `PermissionChecker` para cada `Resource`

### Restringir Acceso a un Endpoint Específico

1. Modificar el `@PreAuthorize` del método en el controlador correspondiente
2. Ejemplo para restringir solo a INGENIERO:
   ```java
   @PreAuthorize("hasAuthority('INGENIERO')")
   @GetMapping("/api/custom/endpoint")
   public ResponseEntity<?> customEndpoint() { ... }
   ```

### Restringir Acceso a una Página del Frontend

1. Modificar el array `auth` en la configuración de la ruta
2. Ejemplo:
   ```typescript
   {
     path: 'restricted-page',
     data: {
       auth: [Authority.INGENIERO, Authority.TENANT_ADMIN]
     }
   }
   ```

---

## Flujo de Autenticación

```
1. Usuario ingresa credenciales
   │
2. POST /api/auth/login
   │
3. Backend valida credenciales y genera JWT
   │ JWT contiene: userId, tenantId, customerId, scopes: ["INGENIERO"]
   │
4. Frontend recibe JWT y lo almacena
   │
5. Frontend decodifica JWT y obtiene authority
   │
6. AuthGuard verifica si authority está en data.auth de la ruta
   │
7. Si está permitido, carga la página
   │
8. Cada llamada API incluye JWT en header Authorization
   │
9. Backend verifica:
   │ a) @PreAuthorize - ¿Authority permitida para este endpoint?
   │ b) AccessControlService - ¿Tiene permiso sobre este recurso específico?
   │
10. Si ambas verificaciones pasan, ejecuta la operación
```

---

## Troubleshooting

### Error 403 Forbidden en endpoint

1. Verificar que la authority esté en `@PreAuthorize` del controlador
2. Verificar que exista una clase de permisos para la authority
3. Verificar que la clase de permisos esté registrada en `DefaultAccessControlService`
4. Verificar que el recurso tenga un `PermissionChecker` definido

### Usuario no puede acceder a una página

1. Verificar que la authority esté en `data.auth` de la ruta
2. Verificar que el `AuthGuard` esté funcionando correctamente
3. Revisar la consola del navegador para errores

### Dashboard incorrecto después del login

1. Verificar el switch en `getHomeDashboard()` de `home-links-routing.module.ts`
2. Verificar `forceDefaultPlace()` y `defaultUrl()` en `auth.service.ts`

---

## Compilación

Después de cualquier cambio:

```bash
# Backend
cd /home/diazhh/dev/gdt/thingsboard
mvn compile -pl application -am -DskipTests

# Frontend
cd /home/diazhh/dev/gdt/thingsboard/ui-ngx
yarn build

# Reiniciar ThingsBoard
cd /home/diazhh/dev/gdt/thingsboard/application
mvn spring-boot:run
```

---

## Contacto

Para dudas sobre este sistema, contactar al equipo de desarrollo GDT.

**Última actualización:** Noviembre 2025
