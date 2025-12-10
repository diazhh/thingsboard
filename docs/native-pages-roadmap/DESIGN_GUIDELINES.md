# Guía de Diseño - Páginas Nativas GDT

**Fecha:** 1 de diciembre de 2025
**Versión:** 1.0
**Aplicable a:** Todas las páginas nativas en `thingsboard/ui-ngx/src/app/modules/home/pages/gdt/`

---

## Introducción

Este documento establece las **reglas de diseño y estándares visuales** para todas las páginas nativas del sistema GDT Tank Gauging. El objetivo es mantener **consistencia visual, usabilidad y profesionalismo** en toda la aplicación.

Las páginas de referencia que establecen el estándar son:
- [user-management](../../../../thingsboard/ui-ngx/src/app/modules/home/pages/gdt/user-management/)
- [tank-monitoring](../../../../thingsboard/ui-ngx/src/app/modules/home/pages/gdt/tank-monitoring/)

---

## Tabla de Contenidos

1. [Estructura de Página](#estructura-de-página)
2. [Tipografía](#tipografía)
3. [Colores](#colores)
4. [Espaciado y Layout](#espaciado-y-layout)
5. [Componentes](#componentes)
6. [Iconografía](#iconografía)
7. [Estados y Feedback](#estados-y-feedback)
8. [Responsividad](#responsividad)
9. [Ejemplos de Código](#ejemplos-de-código)

---

## 1. Estructura de Página

### 1.1 Container Principal

Todas las páginas deben seguir esta estructura:

```html
<div class="gdt-[nombre-pagina]">
  <!-- Header -->
  <div class="page-header">
    <!-- contenido del header -->
  </div>

  <!-- Content -->
  <div class="content-container">
    <!-- contenido principal -->
  </div>
</div>
```

### 1.2 SCSS del Container

```scss
.gdt-[nombre-pagina] {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}
```

**Reglas:**
- ✅ Padding: `24px` en todos los lados
- ✅ Max-width: `1400px` para contenido centrado
- ✅ Margin: `0 auto` para centrar horizontalmente

---

## 2. Tipografía

### 2.1 Títulos Principales (H1)

**Uso:** Título principal de la página

```scss
h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #212529;
}
```

**Reglas:**
- ✅ Font-size: `28px`
- ✅ Font-weight: `700` (bold)
- ✅ Color: `#212529` (gris oscuro)
- ✅ Sin margin

### 2.2 Subtítulos

**Uso:** Descripción bajo el título principal

```scss
.subtitle {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #6c757d;
}
```

**Reglas:**
- ✅ Font-size: `14px`
- ✅ Color: `#6c757d` (gris medio)
- ✅ Margin-top: `4px`

### 2.3 Títulos de Sección (H3)

**Uso:** Títulos de paneles y secciones

```scss
h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #212529;
}
```

**Reglas:**
- ✅ Font-size: `16px`
- ✅ Font-weight: `600` (semi-bold)
- ✅ Color: `#212529`

### 2.4 Headers de Tabla

```scss
th {
  font-size: 13px;
  font-weight: 600;
  color: #212529;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
```

**Reglas:**
- ✅ Font-size: `13px`
- ✅ Text-transform: `uppercase`
- ✅ Letter-spacing: `0.03em`

---

## 3. Colores

### 3.1 Paleta Principal

| Uso | Color | Hex | Ejemplo |
|-----|-------|-----|---------|
| **Primario** | Teal | `#0d7377` | Iconos, acentos |
| **Primario (fondo)** | Teal claro | `rgba(13, 115, 119, 0.1)` | Fondos de iconos |
| **Texto principal** | Gris oscuro | `#212529` | Títulos, texto importante |
| **Texto secundario** | Gris medio | `#6c757d` | Subtítulos, labels |
| **Texto terciario** | Gris | `#495057` | Contenido de tablas |
| **Fondo** | Blanco | `white` | Cards, paneles |
| **Fondo secundario** | Gris muy claro | `#f8f9fa` | Headers de paneles |

### 3.2 Colores de Estado

```scss
// Success/Active
$success-color: #2ecc71;
$success-bg: rgba(46, 204, 113, 0.15);

// Warning/Pending
$warning-color: #f39c12;
$warning-bg: rgba(243, 156, 18, 0.15);

// Error/Critical
$error-color: #e74c3c;
$error-bg: rgba(231, 76, 60, 0.15);

// Info
$info-color: #3498db;
$info-bg: rgba(52, 152, 219, 0.15);
```

### 3.3 Bordes

```scss
// Borde principal
border: 1px solid rgba(0, 0, 0, 0.06);

// Borde de separación
border-bottom: 1px solid rgba(0, 0, 0, 0.06);

// Borde de tabla
border-bottom: 2px solid #e0e0e0; // Para <th>
border-bottom: 1px solid rgba(0, 0, 0, 0.06); // Para <td>
```

---

## 4. Espaciado y Layout

### 4.1 Espaciado del Header

```scss
.page-header {
  margin-bottom: 24px;
}
```

**Reglas:**
- ✅ Margin-bottom: `24px` (separación del contenido)

### 4.2 Gap entre Elementos

```scss
// Gap entre paneles principales
gap: 24px;

// Gap interno de paneles
padding: 20px;

// Gap entre elementos de formulario
fxLayoutGap="16px"
```

**Reglas:**
- ✅ Gap principal: `24px`
- ✅ Padding de cards: `20px`
- ✅ Gap de formularios: `16px`

### 4.3 Border Radius

```scss
border-radius: 12px; // Cards principales
border-radius: 20px; // Badges pequeños
border-radius: 8px;  // Elementos secundarios
```

**Reglas:**
- ✅ Cards/Paneles: `12px`
- ✅ Badges: `20px`
- ✅ Botones secundarios: `8px`

---

## 5. Componentes

### 5.1 Header Principal

**Estructura:**

```html
<div class="page-header">
  <div class="header-content">
    <div class="header-title">
      <mat-icon class="header-icon">[icono]</mat-icon>
      <div>
        <h1>[Título]</h1>
        <p class="subtitle">[Descripción]</p>
      </div>
    </div>
    <div class="header-actions">
      <!-- Botones de acción -->
    </div>
  </div>
</div>
```

**Estilos:**

```scss
.page-header {
  margin-bottom: 24px;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 16px;

    .header-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #0d7377;
      background: rgba(13, 115, 119, 0.1);
      border-radius: 12px;
      padding: 8px;
    }
  }

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}
```

**Reglas:**
- ✅ Icono: `48px` con background circular teal
- ✅ Gap entre icono y texto: `16px`
- ✅ Gap entre botones: `8px`

### 5.2 Cards/Paneles

**Estructura:**

```html
<div class="panel-name">
  <div class="panel-header">
    <h3>[Título]</h3>
  </div>
  <div class="panel-content">
    <!-- Contenido -->
  </div>
</div>
```

**Estilos:**

```scss
.panel-name {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
  overflow: hidden;

  .panel-header {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    background: #f8f9fa;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #212529;
    }
  }

  .panel-content {
    padding: 20px;
  }
}
```

**Reglas:**
- ✅ Sombra: `0 4px 20px rgba(0, 0, 0, 0.08)`
- ✅ Border: `1px solid rgba(0, 0, 0, 0.06)`
- ✅ Header background: `#f8f9fa`
- ✅ Header padding: `16px 20px`
- ✅ Content padding: `20px`

### 5.3 Tablas

**Estructura:**

```html
<div class="table-container">
  <mat-progress-bar *ngIf="loading" mode="indeterminate" color="primary"></mat-progress-bar>

  <div class="table-wrapper">
    <table mat-table [dataSource]="dataSource" class="data-table">
      <!-- columnas -->
    </table>
  </div>
</div>
```

**Estilos:**

```scss
.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;

  th {
    background-color: #f5f5f5;
    font-weight: 600;
    padding: 16px;
    text-align: left;
    border-bottom: 2px solid #e0e0e0;
    color: #212529;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  td {
    padding: 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    color: #495057;
  }

  tr:hover {
    background-color: #f8f9fa;
  }
}
```

**Reglas:**
- ✅ Padding de celdas: `16px`
- ✅ Header background: `#f5f5f5`
- ✅ Hover: `#f8f9fa`

### 5.4 Badges de Estado

**Estilos:**

```scss
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;

  &.status-active {
    background: rgba(46, 204, 113, 0.15);
    color: #27ae60;
  }

  &.status-pending {
    background: rgba(241, 196, 15, 0.15);
    color: #d68910;
  }

  &.status-error {
    background: rgba(231, 76, 60, 0.15);
    color: #c0392b;
  }
}
```

**Reglas:**
- ✅ Padding: `4px 12px`
- ✅ Border-radius: `20px`
- ✅ Font-size: `12px`
- ✅ Uso de colores con transparencia (0.15)

### 5.5 Botones

**Primarios:**
```html
<button mat-raised-button color="primary">
  <mat-icon>add</mat-icon>
  Texto
</button>
```

**Secundarios (icon buttons):**
```html
<button mat-icon-button matTooltip="Tooltip">
  <mat-icon>edit</mat-icon>
</button>
```

**Reglas:**
- ✅ Siempre usar tooltips en icon buttons
- ✅ Gap de `8px` entre botones
- ✅ Iconos de `20px` en action buttons

---

## 6. Iconografía

### 6.1 Iconos de Header

**Tamaño:** `48px x 48px`

**Iconos recomendados por tipo de página:**

| Página | Icono | Material Icon |
|--------|-------|---------------|
| Batch Management | 📦 | `inventory_2` |
| Aforo Manual | ✏️ | `edit` |
| Laboratorio | 🔬 | `science` |
| Usuarios | 👥 | `group` |
| Reportes | 📊 | `assessment` |
| Históricos | 📈 | `trending_up` |
| Auditoría | 📋 | `fact_check` |
| Gateway Config | 🔌 | `router` |
| Integraciones | 🔗 | `integration_instructions` |

### 6.2 Iconos de Acciones

**Tamaño:** `20px x 20px`

| Acción | Icono |
|--------|-------|
| Ver/Visualizar | `visibility` |
| Editar | `edit` |
| Eliminar | `delete` |
| Descargar | `download` |
| Agregar | `add` |
| Actualizar | `refresh` |
| Cerrar | `lock` |
| Buscar | `search` |
| Filtrar | `filter_list` |
| Exportar | `file_download` |

---

## 7. Estados y Feedback

### 7.1 Loading States

**Progress Bar (para tablas):**
```html
<mat-progress-bar *ngIf="loading" mode="indeterminate" color="primary"></mat-progress-bar>
```

**Spinner (para formularios):**
```html
<mat-progress-spinner mode="indeterminate" diameter="20"></mat-progress-spinner>
```

### 7.2 Empty States

```html
<div class="no-data-message">
  <mat-icon>inbox</mat-icon>
  <p>No hay datos disponibles</p>
</div>
```

**Estilos:**

```scss
.no-data-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #6c757d;

  mat-icon {
    font-size: 48px;
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}
```

### 7.3 Error States

```html
<div class="error-message">
  <mat-icon>error_outline</mat-icon>
  <p>{{ errorMessage }}</p>
</div>
```

**Estilos:**

```scss
.error-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(231, 76, 60, 0.1);
  border-left: 4px solid #e74c3c;
  border-radius: 4px;
  color: #c0392b;

  mat-icon {
    font-size: 24px;
    width: 24px;
    height: 24px;
  }
}
```

---

## 8. Responsividad

### 8.1 Breakpoints

```scss
// Mobile
@media (max-width: 600px) {
  .gdt-[nombre-pagina] {
    padding: 16px;
  }
}

// Tablet
@media (max-width: 960px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
}
```

### 8.2 Grid Responsive

```html
<div fxLayout="row wrap" fxLayoutGap="24px">
  <div fxFlex="100" fxFlex.gt-sm="50" fxFlex.gt-md="33">
    <!-- contenido -->
  </div>
</div>
```

---

## 9. Ejemplos de Código

### 9.1 Página Completa - Template

```html
<div class="gdt-example-page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-content">
      <div class="header-title">
        <mat-icon class="header-icon">assessment</mat-icon>
        <div>
          <h1>Título de la Página</h1>
          <p class="subtitle">Descripción breve de la funcionalidad</p>
        </div>
      </div>
      <div class="header-actions">
        <button mat-raised-button color="primary" (click)="onCreate()">
          <mat-icon>add</mat-icon>
          Crear Nuevo
        </button>
        <button mat-icon-button matTooltip="Exportar" (click)="onExport()">
          <mat-icon>download</mat-icon>
        </button>
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="content-container">
    <!-- Panel con filtros -->
    <div class="filters-panel">
      <div class="panel-header">
        <h3>Filtros</h3>
      </div>
      <div class="panel-content">
        <!-- Campos de filtro -->
      </div>
    </div>

    <!-- Tabla de datos -->
    <div class="table-container">
      <mat-progress-bar *ngIf="loading" mode="indeterminate" color="primary"></mat-progress-bar>

      <div *ngIf="!loading && data.length === 0" class="no-data-message">
        <mat-icon>inbox</mat-icon>
        <p>No hay datos disponibles</p>
      </div>

      <div class="table-wrapper" *ngIf="!loading && data.length > 0">
        <table mat-table [dataSource]="dataSource" class="data-table">
          <!-- Columnas -->
        </table>
      </div>
    </div>
  </div>
</div>
```

### 9.2 Página Completa - SCSS

```scss
.gdt-example-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;

  // Header
  .page-header {
    margin-bottom: 24px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 16px;

      .header-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #0d7377;
        background: rgba(13, 115, 119, 0.1);
        border-radius: 12px;
        padding: 8px;
      }

      h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        color: #212529;
      }

      .subtitle {
        margin: 4px 0 0 0;
        font-size: 14px;
        color: #6c757d;
      }
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }

  // Content
  .content-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  // Filters Panel
  .filters-panel {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.06);
    overflow: hidden;

    .panel-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      background: #f8f9fa;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #212529;
      }
    }

    .panel-content {
      padding: 20px;
    }
  }

  // Table Container
  .table-container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;

    th {
      background-color: #f5f5f5;
      font-weight: 600;
      padding: 16px;
      text-align: left;
      border-bottom: 2px solid #e0e0e0;
      color: #212529;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    td {
      padding: 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      color: #495057;
    }

    tr:hover {
      background-color: #f8f9fa;
    }
  }

  .no-data-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px;
    color: #6c757d;

    mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }
}
```

---

## 10. Checklist de Implementación

Al crear una nueva página, verifica:

### Estructura
- [ ] Container principal con clase `.gdt-[nombre]`
- [ ] Padding de `24px` y max-width de `1400px`
- [ ] Header con icono de `48px` y títulos correctos
- [ ] Subtítulo con descripción de la página

### Estilos
- [ ] Colores según paleta definida (`#0d7377` para primario)
- [ ] Tipografía: H1 (`28px`), H3 (`16px`), subtítulos (`14px`)
- [ ] Sombras: `0 4px 20px rgba(0, 0, 0, 0.08)`
- [ ] Border-radius: `12px` para cards
- [ ] Gap: `24px` entre elementos principales

### Componentes
- [ ] Cards con header (`#f8f9fa`) y content
- [ ] Tablas con estilos consistentes
- [ ] Progress bar para loading states
- [ ] Empty states con iconos y mensajes

### UX
- [ ] Tooltips en todos los icon buttons
- [ ] Estados de loading, empty y error
- [ ] Hover effects en elementos interactivos
- [ ] Responsive design implementado

---

## 11. Referencias

### Páginas de Referencia
- [user-management.component.html](../../../../thingsboard/ui-ngx/src/app/modules/home/pages/gdt/user-management/user-management.component.html)
- [user-management.component.scss](../../../../thingsboard/ui-ngx/src/app/modules/home/pages/gdt/user-management/user-management.component.scss)
- [tank-monitoring.component.html](../../../../thingsboard/ui-ngx/src/app/modules/home/pages/gdt/tank-monitoring/tank-monitoring.component.html)
- [tank-monitoring.component.scss](../../../../thingsboard/ui-ngx/src/app/modules/home/pages/gdt/tank-monitoring/tank-monitoring.component.scss)

### Documentación Externa
- [Angular Material Design](https://material.angular.io/)
- [Material Design Guidelines](https://material.io/design)
- [ThingsBoard UI Documentation](https://thingsboard.io/docs/pe/)

---

## 12. Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2025-12-01 | 1.0 | Versión inicial - Establecimiento de estándares basados en user-management y tank-monitoring |

---

**Fin del Documento de Diseño**
