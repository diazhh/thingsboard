# Backend Integration Guide - Sistema de Reportes

**Fecha:** 2 de diciembre de 2025  
**Versión:** 1.0  
**Estado:** Documentación para implementación

---

## 📋 Resumen Ejecutivo

Este documento detalla los requisitos y pasos necesarios para implementar el backend del sistema de reportes en ThingsBoard, permitiendo la generación de reportes con datos reales en lugar de mock data.

### Estado Actual
- ✅ **Frontend:** 100% completado (Angular)
- ✅ **Mock Data:** Funcional para desarrollo
- ✅ **Exportación CSV:** Completamente funcional
- 🔴 **Backend:** No implementado
- 🔴 **Integración con datos reales:** Pendiente

---

## 🏗️ Arquitectura del Sistema

### Componentes Actuales (Frontend)

```
┌─────────────────────────────────────────────────────┐
│                   ANGULAR FRONTEND                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  ReportsComponent                             │  │
│  │  - UI principal de reportes                   │  │
│  │  - Navegación por categorías                  │  │
│  │  - Búsqueda y filtrado                        │  │
│  └──────────────────────────────────────────────┘  │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  ReportService                                │  │
│  │  - Gestión de reportes                        │  │
│  │  - Mock data (temporal)                       │  │
│  └──────────────────────────────────────────────┘  │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  InventoryReportGeneratorService              │  │
│  │  - Generadores de reportes                    │  │
│  │  - Mock data (temporal)                       │  │
│  └──────────────────────────────────────────────┘  │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  ReportExportService                          │  │
│  │  - Exportación CSV (funcional)                │  │
│  │  - Exportación PDF (pendiente backend)        │  │
│  │  - Exportación Excel (pendiente librería)     │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Arquitectura Objetivo (Con Backend)

```
┌─────────────────────────────────────────────────────┐
│                   ANGULAR FRONTEND                   │
├─────────────────────────────────────────────────────┤
│  ReportsComponent → ReportService                    │
│                          │                           │
│                          │ HTTP REST API             │
└──────────────────────────┼───────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│              THINGSBOARD BACKEND (Java)              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  ReportController (REST)                      │  │
│  │  - POST /api/reports/generate                 │  │
│  │  - GET  /api/reports/{id}                     │  │
│  │  - GET  /api/reports/history                  │  │
│  └──────────────────────────────────────────────┘  │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  ReportService (Java)                         │  │
│  │  - Lógica de negocio                          │  │
│  │  - Validaciones                               │  │
│  │  - Orquestación                               │  │
│  └──────────────────────────────────────────────┘  │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  ReportGeneratorFactory                       │  │
│  │  - InventoryReportGenerator                   │  │
│  │  - CustodyTransferReportGenerator             │  │
│  │  - AnalysisReportGenerator                    │  │
│  └──────────────────────────────────────────────┘  │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  DataAccessLayer                              │  │
│  │  - TelemetryService                           │  │
│  │  - AttributeService                           │  │
│  │  - DeviceService                              │  │
│  │  - TimeseriesService                          │  │
│  └──────────────────────────────────────────────┘  │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  ReportExportService (Java)                   │  │
│  │  - PDF Generator (Apache PDFBox)              │  │
│  │  - Excel Generator (Apache POI)               │  │
│  │  - CSV Generator                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  Cassandra   │
                    └──────────────┘
```

---

## 🔧 Implementación Backend - Paso a Paso

### 1. Estructura de Paquetes Java

```
org.thingsboard.server.dao.gdt.report/
├── controller/
│   └── ReportController.java
├── service/
│   ├── ReportService.java
│   ├── ReportServiceImpl.java
│   └── ReportExportService.java
├── generator/
│   ├── ReportGenerator.java (interface)
│   ├── ReportGeneratorFactory.java
│   ├── InventoryReportGenerator.java
│   ├── CustodyTransferReportGenerator.java
│   ├── AnalysisReportGenerator.java
│   ├── HistoricalReportGenerator.java
│   └── ComplianceReportGenerator.java
├── model/
│   ├── ReportRequest.java
│   ├── ReportResponse.java
│   ├── ReportType.java (enum)
│   ├── ReportFormat.java (enum)
│   ├── ReportStatus.java (enum)
│   └── report/
│       ├── DailyInventoryReportData.java
│       ├── TankInventorySummaryData.java
│       └── ... (otros DTOs)
└── repository/
    └── ReportExecutionRepository.java (opcional)
```

### 2. REST API Endpoints

#### 2.1 Generar Reporte

```java
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    /**
     * Generate a report
     * POST /api/reports/generate
     */
    @PostMapping("/generate")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER', 'REPORTES')")
    public DeferredResult<ResponseEntity> generateReport(
            @RequestBody ReportRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        
        // Validar request
        validateReportRequest(request);
        
        // Generar reporte de forma asíncrona
        DeferredResult<ResponseEntity> result = new DeferredResult<>();
        
        CompletableFuture.supplyAsync(() -> 
            reportService.generateReport(request, user.getTenantId())
        ).thenAccept(reportResponse -> {
            result.setResult(ResponseEntity.ok(reportResponse));
        }).exceptionally(e -> {
            result.setErrorResult(ResponseEntity.status(500)
                .body(new ErrorResponse(e.getMessage())));
            return null;
        });
        
        return result;
    }

    /**
     * Get report by ID
     * GET /api/reports/{reportId}
     */
    @GetMapping("/{reportId}")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER', 'REPORTES')")
    public ResponseEntity<ReportResponse> getReport(
            @PathVariable String reportId,
            @AuthenticationPrincipal SecurityUser user) {
        
        ReportResponse report = reportService.getReport(reportId, user.getTenantId());
        return ResponseEntity.ok(report);
    }

    /**
     * Get report history
     * GET /api/reports/history
     */
    @GetMapping("/history")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER', 'REPORTES')")
    public ResponseEntity<PageData<ReportResponse>> getReportHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @AuthenticationPrincipal SecurityUser user) {
        
        PageData<ReportResponse> history = reportService.getReportHistory(
            user.getTenantId(), page, pageSize);
        return ResponseEntity.ok(history);
    }

    /**
     * Download report file
     * GET /api/reports/{reportId}/download
     */
    @GetMapping("/{reportId}/download")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER', 'REPORTES')")
    public ResponseEntity<Resource> downloadReport(
            @PathVariable String reportId,
            @AuthenticationPrincipal SecurityUser user) {
        
        ReportFile file = reportService.getReportFile(reportId, user.getTenantId());
        
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(file.getContentType()))
            .header(HttpHeaders.CONTENT_DISPOSITION, 
                "attachment; filename=\"" + file.getFilename() + "\"")
            .body(new ByteArrayResource(file.getData()));
    }
}
```

### 3. Servicio de Reportes

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    private final ReportGeneratorFactory generatorFactory;
    private final ReportExportService exportService;
    private final TelemetryService telemetryService;
    private final DeviceService deviceService;
    private final AttributeService attributeService;

    @Override
    public ReportResponse generateReport(ReportRequest request, TenantId tenantId) {
        log.info("Generating report: {} for tenant: {}", 
            request.getReportType(), tenantId);

        try {
            // 1. Obtener generador apropiado
            ReportGenerator generator = generatorFactory.getGenerator(
                request.getReportType());

            // 2. Recopilar datos
            Object reportData = generator.generateReportData(
                request, tenantId, this);

            // 3. Exportar a formato solicitado
            byte[] fileData = exportService.exportReport(
                reportData, 
                request.getReportType(), 
                request.getFormat());

            // 4. Guardar archivo (opcional - puede ser S3, filesystem, etc.)
            String fileUrl = saveReportFile(fileData, request);

            // 5. Crear respuesta
            return ReportResponse.builder()
                .reportId(UUID.randomUUID().toString())
                .reportType(request.getReportType())
                .format(request.getFormat())
                .status(ReportStatus.COMPLETED)
                .generatedAt(System.currentTimeMillis())
                .downloadUrl(fileUrl)
                .fileSize(fileData.length)
                .build();

        } catch (Exception e) {
            log.error("Error generating report", e);
            return ReportResponse.builder()
                .reportType(request.getReportType())
                .status(ReportStatus.FAILED)
                .errorMessage(e.getMessage())
                .build();
        }
    }

    // Métodos helper para acceso a datos
    public List<Device> getTankDevices(TenantId tenantId) {
        // Implementar query de dispositivos tipo "Tank"
        return deviceService.findDevicesByTenantIdAndType(
            tenantId, "Tank", new PageLink(1000)).getData();
    }

    public Map<String, Object> getLatestTelemetry(DeviceId deviceId) {
        // Obtener última telemetría
        List<String> keys = Arrays.asList(
            "level", "temperature", "tov", "gov", "gsv", "nsv", 
            "density", "mass", "capacity");
        return telemetryService.findLatest(
            TenantId.SYS_TENANT_ID, deviceId, keys)
            .get()
            .stream()
            .collect(Collectors.toMap(
                TsKvEntry::getKey, 
                TsKvEntry::getValue));
    }

    public List<TsKvEntry> getHistoricalTelemetry(
            DeviceId deviceId, 
            List<String> keys, 
            long startTs, 
            long endTs) {
        // Obtener telemetría histórica
        return telemetryService.findAll(
            TenantId.SYS_TENANT_ID, 
            deviceId, 
            new BaseReadTsKvQuery(keys, startTs, endTs, 0, 10000, 
                Aggregation.NONE))
            .get();
    }
}
```

### 4. Generador de Reportes de Inventario

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryReportGenerator implements ReportGenerator {

    @Override
    public boolean supports(ReportType reportType) {
        return reportType == ReportType.DAILY_INVENTORY ||
               reportType == ReportType.TANK_INVENTORY_SUMMARY ||
               reportType == ReportType.PRODUCT_INVENTORY_BY_GROUP ||
               reportType == ReportType.TANK_STATUS ||
               reportType == ReportType.CAPACITY_UTILIZATION ||
               reportType == ReportType.LOW_STOCK_ALERT ||
               reportType == ReportType.OVERFILL_RISK;
    }

    @Override
    public Object generateReportData(
            ReportRequest request, 
            TenantId tenantId, 
            ReportService reportService) {

        switch (request.getReportType()) {
            case DAILY_INVENTORY:
                return generateDailyInventory(request, tenantId, reportService);
            case TANK_INVENTORY_SUMMARY:
                return generateTankInventorySummary(request, tenantId, reportService);
            // ... otros casos
            default:
                throw new IllegalArgumentException(
                    "Unsupported report type: " + request.getReportType());
        }
    }

    private DailyInventoryReportData generateDailyInventory(
            ReportRequest request, 
            TenantId tenantId, 
            ReportService reportService) {

        log.info("Generating Daily Inventory Report for tenant: {}", tenantId);

        // 1. Obtener todos los tanques
        List<Device> tanks = reportService.getTankDevices(tenantId);

        // 2. Recopilar datos de cada tanque
        List<TankInventoryData> tankDataList = tanks.stream()
            .map(tank -> {
                Map<String, Object> telemetry = 
                    reportService.getLatestTelemetry(tank.getId());

                return TankInventoryData.builder()
                    .tankId(tank.getName())
                    .tankName(tank.getLabel())
                    .product(getProductFromAttributes(tank))
                    .level(getDoubleValue(telemetry, "level"))
                    .temperature(getDoubleValue(telemetry, "temperature"))
                    .tov(getDoubleValue(telemetry, "tov"))
                    .gov(getDoubleValue(telemetry, "gov"))
                    .gsv(getDoubleValue(telemetry, "gsv"))
                    .nsv(getDoubleValue(telemetry, "nsv"))
                    .density(getDoubleValue(telemetry, "density"))
                    .mass(getDoubleValue(telemetry, "mass"))
                    .capacity(getDoubleValue(telemetry, "capacity"))
                    .utilization(calculateUtilization(telemetry))
                    .status(determineStatus(telemetry))
                    .lastUpdate(System.currentTimeMillis())
                    .build();
            })
            .collect(Collectors.toList());

        // 3. Calcular totales y resumen
        double totalVolume = tankDataList.stream()
            .mapToDouble(TankInventoryData::getTov)
            .sum();

        double totalCapacity = tankDataList.stream()
            .mapToDouble(TankInventoryData::getCapacity)
            .sum();

        double averageUtilization = totalCapacity > 0 
            ? (totalVolume / totalCapacity) * 100 
            : 0;

        // 4. Construir respuesta
        return DailyInventoryReportData.builder()
            .reportDate(System.currentTimeMillis())
            .generatedAt(System.currentTimeMillis())
            .totalTanks(tanks.size())
            .activeTanks((int) tankDataList.stream()
                .filter(t -> "ACTIVE".equals(t.getStatus()))
                .count())
            .totalVolume(totalVolume)
            .totalCapacity(totalCapacity)
            .averageUtilization(averageUtilization)
            .tanks(tankDataList)
            .summary(generateSummary(tankDataList))
            .build();
    }

    // Helper methods
    private String getProductFromAttributes(Device tank) {
        // Obtener producto de los atributos del dispositivo
        return "Crude Oil"; // Implementar lógica real
    }

    private double getDoubleValue(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return 0.0;
    }

    private double calculateUtilization(Map<String, Object> telemetry) {
        double tov = getDoubleValue(telemetry, "tov");
        double capacity = getDoubleValue(telemetry, "capacity");
        return capacity > 0 ? (tov / capacity) * 100 : 0;
    }

    private String determineStatus(Map<String, Object> telemetry) {
        // Implementar lógica de determinación de estado
        return "ACTIVE";
    }

    private Map<String, Object> generateSummary(List<TankInventoryData> tanks) {
        // Generar resumen por producto, estado, etc.
        return new HashMap<>();
    }
}
```

### 5. Servicio de Exportación

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportExportService {

    /**
     * Export report to requested format
     */
    public byte[] exportReport(
            Object reportData, 
            ReportType reportType, 
            ReportFormat format) {

        switch (format) {
            case CSV:
                return exportToCSV(reportData, reportType);
            case PDF:
                return exportToPDF(reportData, reportType);
            case EXCEL:
                return exportToExcel(reportData, reportType);
            default:
                throw new IllegalArgumentException("Unsupported format: " + format);
        }
    }

    /**
     * Export to CSV
     */
    private byte[] exportToCSV(Object reportData, ReportType reportType) {
        StringBuilder csv = new StringBuilder();

        if (reportData instanceof DailyInventoryReportData) {
            DailyInventoryReportData data = (DailyInventoryReportData) reportData;
            
            // Headers
            csv.append("Tank ID,Tank Name,Product,Level (mm),Temperature (°C),")
               .append("TOV (L),GOV (L),GSV (L),NSV (L),Density (kg/L),")
               .append("Mass (kg),Capacity (L),Utilization (%),Status,Last Update\n");

            // Data rows
            data.getTanks().forEach(tank -> {
                csv.append(String.format("%s,%s,%s,%.2f,%.2f,%.2f,%.2f,%.2f,%.2f,%.3f,%.2f,%.2f,%.2f,%s,%s\n",
                    tank.getTankId(),
                    tank.getTankName(),
                    tank.getProduct(),
                    tank.getLevel(),
                    tank.getTemperature(),
                    tank.getTov(),
                    tank.getGov(),
                    tank.getGsv(),
                    tank.getNsv(),
                    tank.getDensity(),
                    tank.getMass(),
                    tank.getCapacity(),
                    tank.getUtilization(),
                    tank.getStatus(),
                    new Date(tank.getLastUpdate()).toString()
                ));
            });
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Export to PDF using Apache PDFBox
     */
    private byte[] exportToPDF(Object reportData, ReportType reportType) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream contentStream = 
                    new PDPageContentStream(document, page)) {

                // Add title
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 18);
                contentStream.newLineAtOffset(50, 750);
                contentStream.showText("Daily Inventory Report");
                contentStream.endText();

                // Add content
                if (reportData instanceof DailyInventoryReportData) {
                    DailyInventoryReportData data = 
                        (DailyInventoryReportData) reportData;
                    
                    // Add summary
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA, 12);
                    contentStream.newLineAtOffset(50, 700);
                    contentStream.showText(String.format(
                        "Total Tanks: %d | Active: %d | Total Volume: %.2f L",
                        data.getTotalTanks(),
                        data.getActiveTanks(),
                        data.getTotalVolume()
                    ));
                    contentStream.endText();

                    // Add table (simplified)
                    float yPosition = 650;
                    for (TankInventoryData tank : data.getTanks()) {
                        contentStream.beginText();
                        contentStream.setFont(PDType1Font.HELVETICA, 10);
                        contentStream.newLineAtOffset(50, yPosition);
                        contentStream.showText(String.format(
                            "%s - %s: %.2f L (%.1f%%)",
                            tank.getTankId(),
                            tank.getProduct(),
                            tank.getTov(),
                            tank.getUtilization()
                        ));
                        contentStream.endText();
                        yPosition -= 20;

                        if (yPosition < 50) {
                            // Add new page if needed
                            break;
                        }
                    }
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();

        } catch (IOException e) {
            log.error("Error generating PDF", e);
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    /**
     * Export to Excel using Apache POI
     */
    private byte[] exportToExcel(Object reportData, ReportType reportType) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Daily Inventory");

            if (reportData instanceof DailyInventoryReportData) {
                DailyInventoryReportData data = 
                    (DailyInventoryReportData) reportData;

                // Create header row
                Row headerRow = sheet.createRow(0);
                String[] headers = {
                    "Tank ID", "Tank Name", "Product", "Level (mm)", 
                    "Temperature (°C)", "TOV (L)", "GOV (L)", "GSV (L)", 
                    "NSV (L)", "Density (kg/L)", "Mass (kg)", "Capacity (L)", 
                    "Utilization (%)", "Status", "Last Update"
                };

                for (int i = 0; i < headers.length; i++) {
                    Cell cell = headerRow.createCell(i);
                    cell.setCellValue(headers[i]);
                }

                // Create data rows
                int rowNum = 1;
                for (TankInventoryData tank : data.getTanks()) {
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(tank.getTankId());
                    row.createCell(1).setCellValue(tank.getTankName());
                    row.createCell(2).setCellValue(tank.getProduct());
                    row.createCell(3).setCellValue(tank.getLevel());
                    row.createCell(4).setCellValue(tank.getTemperature());
                    row.createCell(5).setCellValue(tank.getTov());
                    row.createCell(6).setCellValue(tank.getGov());
                    row.createCell(7).setCellValue(tank.getGsv());
                    row.createCell(8).setCellValue(tank.getNsv());
                    row.createCell(9).setCellValue(tank.getDensity());
                    row.createCell(10).setCellValue(tank.getMass());
                    row.createCell(11).setCellValue(tank.getCapacity());
                    row.createCell(12).setCellValue(tank.getUtilization());
                    row.createCell(13).setCellValue(tank.getStatus());
                    row.createCell(14).setCellValue(
                        new Date(tank.getLastUpdate()).toString());
                }

                // Auto-size columns
                for (int i = 0; i < headers.length; i++) {
                    sheet.autoSizeColumn(i);
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();

        } catch (IOException e) {
            log.error("Error generating Excel", e);
            throw new RuntimeException("Failed to generate Excel", e);
        }
    }
}
```

---

## 📦 Dependencias Maven

Agregar al `pom.xml`:

```xml
<!-- Apache PDFBox for PDF generation -->
<dependency>
    <groupId>org.apache.pdfbox</groupId>
    <artifactId>pdfbox</artifactId>
    <version>2.0.29</version>
</dependency>

<!-- Apache POI for Excel generation -->
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.3</version>
</dependency>

<!-- Commons CSV for CSV handling -->
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-csv</artifactId>
    <version>1.10.0</version>
</dependency>
```

---

## 🔄 Integración Frontend-Backend

### Actualizar ReportService (Angular)

```typescript
@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private readonly API_URL = '/api/reports';

  constructor(private http: HttpClient) {}

  /**
   * Generate report (real backend call)
   */
  generateReport(request: ReportGenerationRequest): Observable<ReportGenerationResponse> {
    return this.http.post<ReportGenerationResponse>(
      `${this.API_URL}/generate`, 
      request
    );
  }

  /**
   * Get report by ID
   */
  getReport(reportId: string): Observable<ReportGenerationResponse> {
    return this.http.get<ReportGenerationResponse>(
      `${this.API_URL}/${reportId}`
    );
  }

  /**
   * Get report history
   */
  getReportHistory(page: number = 0, pageSize: number = 10): Observable<PageData<ReportGenerationResponse>> {
    return this.http.get<PageData<ReportGenerationResponse>>(
      `${this.API_URL}/history`,
      { params: { page: page.toString(), pageSize: pageSize.toString() } }
    );
  }

  /**
   * Download report file
   */
  downloadReport(reportId: string): void {
    window.open(`${this.API_URL}/${reportId}/download`, '_blank');
  }
}
```

---

## ✅ Checklist de Implementación

### Backend

- [ ] **Estructura de paquetes**
  - [ ] Crear paquete `org.thingsboard.server.dao.gdt.report`
  - [ ] Crear subpaquetes (controller, service, generator, model)

- [ ] **Modelos de datos**
  - [ ] `ReportRequest.java`
  - [ ] `ReportResponse.java`
  - [ ] Enums (ReportType, ReportFormat, ReportStatus)
  - [ ] DTOs para cada tipo de reporte

- [ ] **REST Controller**
  - [ ] `ReportController.java`
  - [ ] Endpoint POST `/api/reports/generate`
  - [ ] Endpoint GET `/api/reports/{id}`
  - [ ] Endpoint GET `/api/reports/history`
  - [ ] Endpoint GET `/api/reports/{id}/download`

- [ ] **Servicios**
  - [ ] `ReportService.java` (interface)
  - [ ] `ReportServiceImpl.java`
  - [ ] `ReportExportService.java`
  - [ ] `ReportGeneratorFactory.java`

- [ ] **Generadores**
  - [ ] `InventoryReportGenerator.java`
  - [ ] Implementar 7 reportes de inventario
  - [ ] `CustodyTransferReportGenerator.java` (futuro)
  - [ ] `AnalysisReportGenerator.java` (futuro)

- [ ] **Exportación**
  - [ ] Exportación CSV
  - [ ] Exportación PDF (Apache PDFBox)
  - [ ] Exportación Excel (Apache POI)

- [ ] **Dependencias**
  - [ ] Agregar Apache PDFBox al pom.xml
  - [ ] Agregar Apache POI al pom.xml
  - [ ] Agregar Commons CSV al pom.xml

### Frontend

- [ ] **Actualizar servicios**
  - [ ] Modificar `ReportService` para usar API real
  - [ ] Remover mock data
  - [ ] Implementar manejo de errores

- [ ] **Testing**
  - [ ] Probar generación de reportes
  - [ ] Probar descarga de archivos
  - [ ] Probar historial de reportes

### Testing

- [ ] **Unit Tests**
  - [ ] Tests para ReportService
  - [ ] Tests para generadores
  - [ ] Tests para exportación

- [ ] **Integration Tests**
  - [ ] Tests de API endpoints
  - [ ] Tests de generación end-to-end

---

## 📊 Estimación de Esfuerzo

| Tarea | Story Points | Tiempo Estimado |
|-------|--------------|-----------------|
| Estructura y modelos | 5 SP | 1 día |
| REST Controller | 8 SP | 1-2 días |
| ReportService | 13 SP | 2-3 días |
| InventoryReportGenerator | 21 SP | 3-5 días |
| ReportExportService (PDF/Excel) | 13 SP | 2-3 días |
| Integración Frontend | 8 SP | 1-2 días |
| Testing | 13 SP | 2-3 días |
| **TOTAL** | **81 SP** | **12-19 días** |

---

## 🚀 Próximos Pasos

1. **Implementar Backend Base** (Semana 1)
   - Estructura de paquetes
   - Modelos de datos
   - REST Controller básico

2. **Implementar Generadores** (Semana 2-3)
   - InventoryReportGenerator
   - Integración con servicios de telemetría

3. **Implementar Exportación** (Semana 3)
   - PDF con Apache PDFBox
   - Excel con Apache POI

4. **Integración y Testing** (Semana 4)
   - Conectar frontend con backend
   - Testing completo
   - Optimizaciones

---

## 📝 Notas Importantes

1. **Performance:** Para reportes con grandes volúmenes de datos, considerar:
   - Paginación de resultados
   - Procesamiento asíncrono
   - Caching de datos frecuentes

2. **Seguridad:**
   - Validar permisos en cada endpoint
   - Sanitizar parámetros de entrada
   - Limitar tamaño de reportes

3. **Escalabilidad:**
   - Considerar uso de cola de mensajes (RabbitMQ/Kafka)
   - Implementar rate limiting
   - Monitorear uso de recursos

---

**Documento creado:** 2 de diciembre de 2025  
**Última actualización:** 2 de diciembre de 2025  
**Versión:** 1.0
