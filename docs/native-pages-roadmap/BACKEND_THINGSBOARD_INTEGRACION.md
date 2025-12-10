# Integración con Backend de ThingsBoard

**Fecha:** 1 de diciembre de 2025
**Versión:** 1.0

---

## Índice

1. [Introducción](#introducción)
2. [Arquitectura de ThingsBoard](#arquitectura-de-thingsboard)
3. [Extensiones Backend Java](#extensiones-backend-java)
4. [Rule Engine Avanzado](#rule-engine-avanzado)
5. [Sistema de Colas](#sistema-de-colas)
6. [Notificaciones](#notificaciones)
7. [Plugins Personalizados](#plugins-personalizados)
8. [REST API Extensions](#rest-api-extensions)
9. [Batch Processing](#batch-processing)
10. [Casos de Uso Específicos GDT](#casos-de-uso-específicos-gdt)

---

## Introducción

ThingsBoard PE está construido en Java y Spring Boot, lo que permite crear extensiones backend personalizadas. En lugar de depender exclusivamente de servicios externos en Python/Node.js, podemos aprovechar la infraestructura de ThingsBoard para implementar lógica de negocio compleja.

### Ventajas de Usar Backend de ThingsBoard

✅ **Integración Nativa:** Acceso directo a todos los servicios de ThingsBoard
✅ **Performance:** Ejecución en el mismo JVM, sin latencia de red
✅ **Escalabilidad:** Aprovecha el sistema de colas de ThingsBoard (Kafka/RabbitMQ)
✅ **Consistencia:** Mismo stack tecnológico
✅ **Rule Engine:** Motor de reglas potente y visual
✅ **Transacciones:** Soporte de transacciones ACID
✅ **Seguridad:** Integración con sistema de autenticación/autorización

---

## Arquitectura de ThingsBoard

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    THINGSBOARD PE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   UI (Angular)│  │  REST API    │  │  WebSocket   │     │
│  │              │  │  Controllers │  │  Service     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│  ┌────────────────────────┴───────────────────────────┐    │
│  │            CORE SERVICES (Java/Spring)              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ • DeviceService      • AssetService                 │    │
│  │ • TelemetryService   • AttributeService             │    │
│  │ • AlarmService       • RuleEngineService            │    │
│  │ • EntityRelationService • NotificationService       │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│  ┌────────────────────────┴───────────────────────────┐    │
│  │            RULE ENGINE                              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ • Rule Chains        • Transformations              │    │
│  │ • Custom Nodes       • Plugins                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│  ┌────────────────────────┴───────────────────────────┐    │
│  │            QUEUE SYSTEM                             │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ • Kafka / RabbitMQ                                  │    │
│  │ • Message Processing                                │    │
│  │ • Distributed Processing                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│  ┌────────────────────────┴───────────────────────────┐    │
│  │            DATABASE                                 │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ • PostgreSQL (Metadata)                             │    │
│  │ • Cassandra/TimescaleDB (Telemetry)                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Extensiones Backend Java

### Ubicación del Código Backend

ThingsBoard PE backend:
```
thingsboard/application/src/main/java/org/thingsboard/server/
├── controller/          # REST API Controllers
├── service/            # Business Logic Services
├── dao/                # Data Access Objects
├── actors/             # Actor System
├── queue/              # Queue Processors
└── plugins/            # Custom Plugins
```

### Crear Extension GDT Backend

#### Paso 1: Crear Módulo GDT

`thingsboard/application/src/main/java/org/thingsboard/server/gdt/`

```
gdt/
├── config/
│   └── GdtConfiguration.java
├── controller/
│   ├── GdtTankController.java
│   ├── GdtBatchController.java
│   └── GdtReportController.java
├── service/
│   ├── GdtTankService.java
│   ├── GdtBatchService.java
│   ├── GdtCalculationService.java
│   └── GdtReportService.java
├── dao/
│   ├── GdtBatchDao.java
│   └── GdtBatchRepository.java
├── model/
│   ├── Batch.java
│   ├── ManualTelemetry.java
│   └── LaboratoryAnalysis.java
└── queue/
    ├── GdtBatchProcessor.java
    └── GdtReportGenerator.java
```

---

### Ejemplo: REST Controller para Batches

`GdtBatchController.java`

```java
package org.thingsboard.server.gdt.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.thingsboard.server.common.data.exception.ThingsboardException;
import org.thingsboard.server.gdt.model.Batch;
import org.thingsboard.server.gdt.service.GdtBatchService;
import org.thingsboard.server.queue.util.TbCoreComponent;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@TbCoreComponent
@RequestMapping("/api/gdt/batches")
@RequiredArgsConstructor
public class GdtBatchController {

    private final GdtBatchService batchService;

    /**
     * Crear nuevo batch
     */
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER')")
    @PostMapping
    public ResponseEntity<Batch> createBatch(
            @RequestBody Batch batch) throws ThingsboardException {

        log.info("Creating new batch: {}", batch.getBatchNumber());

        Batch createdBatch = batchService.createBatch(batch);

        return ResponseEntity.ok(createdBatch);
    }

    /**
     * Cerrar batch existente
     */
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER')")
    @PostMapping("/{batchId}/close")
    public ResponseEntity<Batch> closeBatch(
            @PathVariable UUID batchId) throws ThingsboardException {

        log.info("Closing batch: {}", batchId);

        Batch closedBatch = batchService.closeBatch(batchId);

        // Trigger async PDF generation
        batchService.generateBatchReportAsync(batchId);

        return ResponseEntity.ok(closedBatch);
    }

    /**
     * Recalcular batch
     */
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER')")
    @PostMapping("/{batchId}/recalculate")
    public ResponseEntity<Batch> recalculateBatch(
            @PathVariable UUID batchId,
            @RequestBody RecalculationParams params) throws ThingsboardException {

        log.info("Recalculating batch: {}", batchId);

        Batch recalculatedBatch = batchService.recalculateBatch(batchId, params);

        return ResponseEntity.ok(recalculatedBatch);
    }

    /**
     * Obtener batches por tanque
     */
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER')")
    @GetMapping("/tank/{tankId}")
    public ResponseEntity<List<Batch>> getBatchesByTank(
            @PathVariable UUID tankId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime) throws ThingsboardException {

        List<Batch> batches = batchService.getBatchesByTank(
                tankId, startTime, endTime);

        return ResponseEntity.ok(batches);
    }

    /**
     * Generar PDF de batch
     */
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER')")
    @GetMapping("/{batchId}/report")
    public ResponseEntity<byte[]> getBatchReport(
            @PathVariable UUID batchId) throws ThingsboardException {

        byte[] pdfBytes = batchService.generateBatchReportPdf(batchId);

        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition",
                        "attachment; filename=batch_" + batchId + ".pdf")
                .body(pdfBytes);
    }
}
```

---

### Ejemplo: Service Layer

`GdtBatchService.java`

```java
package org.thingsboard.server.gdt.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thingsboard.server.common.data.asset.Asset;
import org.thingsboard.server.common.data.exception.ThingsboardException;
import org.thingsboard.server.common.data.id.AssetId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.dao.asset.AssetService;
import org.thingsboard.server.dao.attributes.AttributesService;
import org.thingsboard.server.dao.timeseries.TimeseriesService;
import org.thingsboard.server.gdt.dao.GdtBatchDao;
import org.thingsboard.server.gdt.model.Batch;
import org.thingsboard.server.gdt.model.BatchStatus;
import org.thingsboard.server.gdt.queue.GdtBatchProcessor;
import org.thingsboard.server.queue.TbQueueProducer;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GdtBatchService {

    private final GdtBatchDao batchDao;
    private final AssetService assetService;
    private final AttributesService attributesService;
    private final TimeseriesService timeseriesService;
    private final GdtCalculationService calculationService;
    private final GdtReportService reportService;
    private final TbQueueProducer<GdtBatchProcessor.BatchMessage> batchQueueProducer;

    @Transactional
    public Batch createBatch(Batch batch) throws ThingsboardException {

        // Validar tanque existe
        AssetId tankId = new AssetId(batch.getTankId());
        Asset tank = assetService.findAssetById(batch.getTenantId(), tankId);

        if (tank == null) {
            throw new ThingsboardException("Tank not found",
                    ThingsboardErrorCode.ITEM_NOT_FOUND);
        }

        // Validar no hay batch abierto en este tanque
        List<Batch> openBatches = batchDao.findOpenBatchesByTank(
                batch.getTenantId(), batch.getTankId());

        if (!openBatches.isEmpty()) {
            throw new ThingsboardException("Tank already has an open batch",
                    ThingsboardErrorCode.BAD_REQUEST_PARAMS);
        }

        // Capturar opening gauge (telemetría actual)
        OpeningGauge openingGauge = captureOpeningGauge(
                batch.getTenantId(), tankId);

        batch.setOpeningGauge(openingGauge);
        batch.setStatus(BatchStatus.OPEN);
        batch.setCreatedTime(System.currentTimeMillis());

        // Guardar en DB
        Batch savedBatch = batchDao.save(batch);

        // Crear asset "Batch" en ThingsBoard
        Asset batchAsset = createBatchAsset(savedBatch, tank);
        savedBatch.setBatchAssetId(batchAsset.getId().getId());

        // Log evento
        logBatchEvent(savedBatch, "BATCH_OPENED");

        log.info("Batch created: {}", savedBatch.getBatchNumber());

        return savedBatch;
    }

    @Transactional
    public Batch closeBatch(UUID batchId) throws ThingsboardException {

        Batch batch = batchDao.findById(batchId)
                .orElseThrow(() -> new ThingsboardException("Batch not found",
                        ThingsboardErrorCode.ITEM_NOT_FOUND));

        if (batch.getStatus() != BatchStatus.OPEN) {
            throw new ThingsboardException("Batch is not open",
                    ThingsboardErrorCode.BAD_REQUEST_PARAMS);
        }

        // Capturar closing gauge
        AssetId tankId = new AssetId(batch.getTankId());
        ClosingGauge closingGauge = captureClosingGauge(
                batch.getTenantId(), tankId);

        batch.setClosingGauge(closingGauge);
        batch.setClosedTime(System.currentTimeMillis());

        // Calcular transferred quantities
        TransferredQuantities transferred = calculationService.calculateTransferred(
                batch.getOpeningGauge(), closingGauge);

        batch.setTransferredQuantities(transferred);
        batch.setStatus(BatchStatus.CLOSED);

        // Guardar
        Batch savedBatch = batchDao.save(batch);

        // Log evento
        logBatchEvent(savedBatch, "BATCH_CLOSED");

        log.info("Batch closed: {}", savedBatch.getBatchNumber());

        return savedBatch;
    }

    /**
     * Generar PDF de batch de forma asíncrona usando queue
     */
    public void generateBatchReportAsync(UUID batchId) {

        // Publicar mensaje a queue para procesamiento asíncrono
        GdtBatchProcessor.BatchMessage message =
                new GdtBatchProcessor.BatchMessage(batchId, "GENERATE_PDF");

        batchQueueProducer.send(message);

        log.info("Batch report generation queued: {}", batchId);
    }

    /**
     * Generar PDF de batch (síncrono)
     */
    public byte[] generateBatchReportPdf(UUID batchId) throws ThingsboardException {

        Batch batch = batchDao.findById(batchId)
                .orElseThrow(() -> new ThingsboardException("Batch not found",
                        ThingsboardErrorCode.ITEM_NOT_FOUND));

        // Generar PDF usando report service
        byte[] pdfBytes = reportService.generateBatchPdf(batch);

        // Guardar URL del PDF en batch
        String pdfUrl = uploadPdfToStorage(pdfBytes, batchId);
        batch.setReportPdfUrl(pdfUrl);
        batchDao.save(batch);

        return pdfBytes;
    }

    /**
     * Capturar opening gauge (telemetría actual del tanque)
     */
    private OpeningGauge captureOpeningGauge(TenantId tenantId, AssetId tankId) {

        // Leer telemetría actual
        Map<String, AttributeKvEntry> latestTelemetry =
                timeseriesService.findLatest(tenantId, tankId,
                        Arrays.asList("level", "temperature_avg", "tov", "gov",
                                      "gsv", "nsv", "masa", "wia"));

        OpeningGauge gauge = new OpeningGauge();
        gauge.setTimestamp(System.currentTimeMillis());
        gauge.setLevel(getDoubleValue(latestTelemetry, "level"));
        gauge.setTemperature(getDoubleValue(latestTelemetry, "temperature_avg"));
        gauge.setTov(getDoubleValue(latestTelemetry, "tov"));
        gauge.setGov(getDoubleValue(latestTelemetry, "gov"));
        gauge.setGsv(getDoubleValue(latestTelemetry, "gsv"));
        gauge.setNsv(getDoubleValue(latestTelemetry, "nsv"));
        gauge.setMasa(getDoubleValue(latestTelemetry, "masa"));
        gauge.setWia(getDoubleValue(latestTelemetry, "wia"));

        return gauge;
    }

    private Asset createBatchAsset(Batch batch, Asset tank) {

        Asset batchAsset = new Asset();
        batchAsset.setTenantId(batch.getTenantId());
        batchAsset.setName("Batch " + batch.getBatchNumber());
        batchAsset.setType("Batch");
        batchAsset.setLabel(batch.getBatchNumber());

        Asset savedAsset = assetService.saveAsset(batchAsset);

        // Crear relación Tank -> Batch
        EntityRelation relation = new EntityRelation(
                tank.getId(), savedAsset.getId(),
                EntityRelation.CONTAINS_TYPE);

        entityRelationService.saveRelation(batch.getTenantId(), relation);

        // Guardar atributos del batch
        saveAssetAttributes(savedAsset.getId(), batch);

        return savedAsset;
    }

    private void logBatchEvent(Batch batch, String eventType) {
        // Crear evento de auditoría
        // Usar AuditLogService de ThingsBoard
    }
}
```

---

## Rule Engine Avanzado

### Crear Custom Rule Node

Los custom rule nodes permiten extender el Rule Engine con lógica personalizada.

#### Ejemplo: Node de Cálculo API MPMS

`ApiMpmsCalculationNode.java`

```java
package org.thingsboard.server.gdt.rule.node;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.thingsboard.rule.engine.api.*;
import org.thingsboard.rule.engine.api.util.TbNodeUtils;
import org.thingsboard.server.common.data.plugin.ComponentType;
import org.thingsboard.server.common.msg.TbMsg;

@Slf4j
@RuleNode(
    type = ComponentType.ENRICHMENT,
    name = "API MPMS Calculation",
    configClazz = ApiMpmsCalculationNodeConfiguration.class,
    nodeDescription = "Calculates volumes using API MPMS standards",
    nodeDetails = "Applies CTL, CTSh, CPL corrections and calculates GOV, GSV, NSV, Masa, WIA",
    uiResources = {"static/rulenode/api-mpms-node.js"},
    configDirective = "tbEnrichmentNodeApiMpmsConfig"
)
public class ApiMpmsCalculationNode implements TbNode {

    private ApiMpmsCalculationNodeConfiguration config;
    private GdtCalculationService calculationService;

    @Override
    public void init(TbContext ctx, TbNodeConfiguration configuration)
            throws TbNodeException {

        this.config = TbNodeUtils.convert(configuration,
                ApiMpmsCalculationNodeConfiguration.class);

        this.calculationService = ctx.getApplicationContext()
                .getBean(GdtCalculationService.class);
    }

    @Override
    public void onMsg(TbContext ctx, TbMsg msg) {

        try {
            // Extraer datos del mensaje
            JsonNode data = JacksonUtil.toJsonNode(msg.getData());

            double level = data.get("level").asDouble();
            double temperature = data.get("temperature_avg").asDouble();

            // Cargar atributos del tanque (strapping table, API gravity, etc.)
            TankAttributes tankAttrs = loadTankAttributes(ctx, msg.getOriginator());

            // Calcular TOV desde strapping table
            double tov = calculationService.interpolateStrappingTable(
                    level, tankAttrs.getStrappingTable());

            // Calcular CTL usando API Table 6A/6B/6C/6D
            double ctl = calculationService.calculateCTL(
                    tankAttrs.getApiGravity(), temperature, 60.0,
                    tankAttrs.getApiTableType());

            // Calcular CTSh
            double ctsh = calculationService.calculateCTSh(
                    temperature, tankAttrs.getReferenceTemperature(),
                    tankAttrs.getTankHeight());

            // Calcular CPL (si tanque presurizado)
            double cpl = 1.0; // Default para tanques atmosféricos

            // Calcular volúmenes
            double gov = tov * ctsh;
            double gsv = gov * ctl * cpl;
            double nsv = gsv * (1 - tankAttrs.getBsw() / 100.0);

            // Calcular masa
            double density = calculationService.calculateDensity(
                    tankAttrs.getApiGravity(), temperature);
            double masa = nsv * density;

            // Calcular WIA
            double wia = masa * (1 - tankAttrs.getAirDensity() / density);

            // Crear nuevo mensaje con valores calculados
            JsonNode newData = JacksonUtil.newObjectNode()
                    .put("level", level)
                    .put("temperature_avg", temperature)
                    .put("tov", tov)
                    .put("gov", gov)
                    .put("gsv", gsv)
                    .put("nsv", nsv)
                    .put("masa", masa)
                    .put("wia", wia)
                    .put("ctl", ctl)
                    .put("ctsh", ctsh)
                    .put("cpl", cpl)
                    .put("vcf_factor", ctl) // Para auditoría
                    .put("api_table_used", tankAttrs.getApiTableType());

            TbMsg newMsg = ctx.transformMsg(msg, msg.getType(),
                    msg.getOriginator(), msg.getMetaData(),
                    JacksonUtil.toString(newData));

            ctx.tellSuccess(newMsg);

        } catch (Exception e) {
            log.error("Error in API MPMS calculation", e);
            ctx.tellFailure(msg, e);
        }
    }

    private TankAttributes loadTankAttributes(TbContext ctx, EntityId tankId) {
        // Cargar atributos del tanque desde AttributesService
        // ...
        return tankAttrs;
    }

    @Override
    public void destroy() {
        // Cleanup
    }
}
```

**Configuración UI del Node:**

`static/rulenode/api-mpms-node.js`

```javascript
self.onInit = function() {
    self.config = {
        // Configuración del node
    };
};

self.configTemplate = `
    <mat-form-field>
        <mat-label>API Table Type</mat-label>
        <mat-select formControlName="apiTableType">
            <mat-option value="6A">6A - Crude Oils</mat-option>
            <mat-option value="6B">6B - Refined Products</mat-option>
            <mat-option value="6C">6C - Lubricants</mat-option>
            <mat-option value="6D">6D - Special Applications</mat-option>
        </mat-select>
    </mat-form-field>
`;
```

---

## Sistema de Colas

ThingsBoard usa Kafka o RabbitMQ para procesamiento distribuido. Podemos crear queues personalizadas para GDT.

### Crear Queue Processor

`GdtBatchProcessor.java`

```java
package org.thingsboard.server.gdt.queue;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.thingsboard.server.common.msg.queue.TopicPartitionInfo;
import org.thingsboard.server.gdt.service.GdtBatchService;
import org.thingsboard.server.queue.TbQueueConsumer;
import org.thingsboard.server.queue.common.TbProtoQueueMsg;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Component
@RequiredArgsConstructor
public class GdtBatchProcessor {

    private final GdtBatchService batchService;
    private final TbQueueConsumer<TbProtoQueueMsg<BatchMessage>> consumer;

    private ExecutorService executor;

    @PostConstruct
    public void init() {
        executor = Executors.newFixedThreadPool(4);

        // Subscribir a queue "gdt.batch.processing"
        consumer.subscribe(new TopicPartitionInfo("gdt.batch.processing",
                null, null, false));

        // Iniciar consumidor
        executor.submit(this::processMessages);

        log.info("GDT Batch Processor started");
    }

    private void processMessages() {
        while (!Thread.interrupted()) {
            try {
                List<TbProtoQueueMsg<BatchMessage>> messages =
                        consumer.poll(Duration.ofSeconds(1));

                for (TbProtoQueueMsg<BatchMessage> msg : messages) {
                    processMessage(msg.getValue());
                    consumer.commit();
                }

            } catch (Exception e) {
                log.error("Error processing batch messages", e);
            }
        }
    }

    private void processMessage(BatchMessage message) {

        log.info("Processing batch message: {} - {}",
                message.getBatchId(), message.getAction());

        try {
            switch (message.getAction()) {
                case "GENERATE_PDF":
                    batchService.generateBatchReportPdf(message.getBatchId());
                    break;

                case "RECALCULATE":
                    batchService.recalculateBatch(
                            message.getBatchId(), message.getParams());
                    break;

                case "SEND_EMAIL":
                    sendBatchReportEmail(message.getBatchId());
                    break;

                default:
                    log.warn("Unknown action: {}", message.getAction());
            }

        } catch (Exception e) {
            log.error("Error processing batch message", e);
            // Requeue o dead letter queue
        }
    }

    @PreDestroy
    public void destroy() {
        executor.shutdown();
    }

    @Data
    @AllArgsConstructor
    public static class BatchMessage {
        private UUID batchId;
        private String action;
        private Map<String, Object> params;
    }
}
```

---

## Notificaciones

ThingsBoard tiene sistema de notificaciones integrado. Podemos usarlo para alertas GDT.

### Crear Notificación Personalizada

```java
@Service
@RequiredArgsConstructor
public class GdtNotificationService {

    private final NotificationCenter notificationCenter;

    public void sendBatchClosedNotification(Batch batch) {

        Notification notification = Notification.builder()
                .tenantId(batch.getTenantId())
                .type(NotificationType.GENERAL)
                .subject("Batch Closed")
                .text("Batch " + batch.getBatchNumber() + " has been closed. " +
                      "Transferred NSV: " + batch.getTransferredQuantities().getNsv())
                .additionalInfo(JacksonUtil.newObjectNode()
                        .put("batchId", batch.getId().toString())
                        .put("tankId", batch.getTankId().toString()))
                .build();

        // Enviar a todos los usuarios con role TENANT_ADMIN
        notificationCenter.sendNotificationToTenantAdmins(notification);
    }

    public void sendOverfillAlert(UUID tankId, double currentLevel,
                                   double hhThreshold) {

        Notification notification = Notification.builder()
                .type(NotificationType.ALARM)
                .severity(NotificationSeverity.CRITICAL)
                .subject("Overfill Risk Alert")
                .text("Tank is approaching HH alarm level. " +
                      "Current: " + currentLevel + " mm, HH: " + hhThreshold + " mm")
                .additionalInfo(JacksonUtil.newObjectNode()
                        .put("tankId", tankId.toString())
                        .put("currentLevel", currentLevel)
                        .put("hhThreshold", hhThreshold))
                .build();

        notificationCenter.sendNotificationToTenantAdmins(notification);

        // También enviar email
        sendEmailAlert(notification);
    }
}
```

---

## Plugins Personalizados

ThingsBoard permite crear plugins para funcionalidades complejas.

### Ejemplo: Plugin de Reportes Programados

```java
@Component
@TbCoreComponent
@Slf4j
public class GdtReportSchedulerPlugin implements TbPlugin {

    @Autowired
    private GdtReportService reportService;

    @Autowired
    private TaskScheduler scheduler;

    @Override
    public void init(TbPluginContext ctx) {
        // Cargar configuraciones de reportes programados
        List<ScheduledReport> scheduledReports =
                reportService.loadScheduledReports();

        for (ScheduledReport report : scheduledReports) {
            if (report.isEnabled()) {
                scheduleReport(report);
            }
        }

        log.info("GDT Report Scheduler Plugin initialized");
    }

    private void scheduleReport(ScheduledReport report) {

        CronTrigger trigger = new CronTrigger(report.getCronExpression());

        scheduler.schedule(() -> {
            try {
                log.info("Executing scheduled report: {}", report.getName());

                byte[] reportData = reportService.generateReport(
                        report.getReportType(), report.getParameters());

                // Enviar según destinos configurados
                for (Destination dest : report.getDestinations()) {
                    sendReport(reportData, dest, report);
                }

            } catch (Exception e) {
                log.error("Error executing scheduled report", e);
            }
        }, trigger);
    }

    private void sendReport(byte[] data, Destination dest,
                            ScheduledReport report) {

        switch (dest.getType()) {
            case EMAIL:
                emailService.send(dest.getRecipients(),
                        report.getName(), data);
                break;

            case FTP:
                ftpService.upload(dest.getHost(), dest.getPath(), data);
                break;

            case S3:
                s3Service.upload(dest.getBucket(), dest.getPath(), data);
                break;
        }
    }
}
```

---

## REST API Extensions

Agregar endpoints personalizados a la API REST de ThingsBoard.

### Swagger Documentation

```java
@ApiOperation(value = "Get Batch by ID",
              notes = "Returns a batch by its ID")
@ApiResponses(value = {
    @ApiResponse(code = 200, message = "Success"),
    @ApiResponse(code = 404, message = "Batch not found"),
    @ApiResponse(code = 401, message = "Unauthorized")
})
@GetMapping("/{batchId}")
public ResponseEntity<Batch> getBatchById(
        @ApiParam(value = "Batch ID", required = true)
        @PathVariable UUID batchId) {

    // Implementation
}
```

---

## Batch Processing

Para operaciones pesadas (e.g., generación masiva de reportes).

### Usar Spring Batch

```java
@Configuration
public class GdtBatchConfig {

    @Bean
    public Job monthlyReportJob(JobBuilderFactory jobs,
                                 Step processReportsStep) {
        return jobs.get("monthlyReportJob")
                .start(processReportsStep)
                .build();
    }

    @Bean
    public Step processReportsStep(StepBuilderFactory steps,
                                    ItemReader<Tank> reader,
                                    ItemProcessor<Tank, Report> processor,
                                    ItemWriter<Report> writer) {
        return steps.get("processReportsStep")
                .<Tank, Report>chunk(10)
                .reader(reader)
                .processor(processor)
                .writer(writer)
                .build();
    }
}
```

---

## Casos de Uso Específicos GDT

### 1. PDF Generation en Backend Java

Usar iText o Apache PDFBox:

```xml
<dependency>
    <groupId>com.itextpdf</groupId>
    <artifactId>itext7-core</artifactId>
    <version>7.2.5</version>
</dependency>
```

```java
@Service
public class GdtPdfService {

    public byte[] generateBatchPdf(Batch batch) {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);

        // Header
        document.add(new Paragraph("BATCH TRANSFER REPORT")
                .setFontSize(20).setBold());

        // Batch info
        Table table = new Table(2);
        table.addCell("Batch Number:");
        table.addCell(batch.getBatchNumber());
        table.addCell("Tank:");
        table.addCell(batch.getTankName());
        // ... más campos

        document.add(table);
        document.close();

        return baos.toByteArray();
    }
}
```

### 2. Excel Generation

Usar Apache POI:

```java
@Service
public class GdtExcelService {

    public byte[] generateInventoryExcel(List<Tank> tanks) {

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Inventory");

        // Header row
        Row headerRow = sheet.createRow(0);
        headerRow.createCell(0).setCellValue("Tank");
        headerRow.createCell(1).setCellValue("Product");
        headerRow.createCell(2).setCellValue("Level");
        headerRow.createCell(3).setCellValue("NSV");

        // Data rows
        int rowNum = 1;
        for (Tank tank : tanks) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(tank.getTag());
            row.createCell(1).setCellValue(tank.getProduct());
            row.createCell(2).setCellValue(tank.getLevel());
            row.createCell(3).setCellValue(tank.getNsv());
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();

        return baos.toByteArray();
    }
}
```

### 3. Scheduled Tasks

Usar Spring @Scheduled:

```java
@Component
public class GdtScheduledTasks {

    @Autowired
    private GdtReportService reportService;

    // Generar reporte diario a las 23:59
    @Scheduled(cron = "0 59 23 * * *")
    public void generateDailyInventoryReport() {
        log.info("Generating daily inventory report");
        reportService.generateDailyInventoryReport();
    }

    // Verificar NTP sync cada 5 minutos
    @Scheduled(fixedRate = 300000)
    public void checkNtpSync() {
        // Verificar NTP
    }
}
```

---

## Conclusión

Usar el backend Java de ThingsBoard permite:

✅ **Mejor Integración**: Acceso nativo a servicios
✅ **Performance**: Ejecución en mismo JVM
✅ **Escalabilidad**: Sistema de colas distribuido
✅ **Consistencia**: Un solo stack tecnológico
✅ **Rule Engine**: Lógica visual y extensible
✅ **Transacciones**: ACID compliance

**Recomendación:** Implementar servicios críticos (Batch Management, PDF Generation, Reportes) en backend Java de ThingsBoard, aprovechando su infraestructura robusta.

### Próximos Pasos

1. Crear módulo `gdt` en backend de ThingsBoard
2. Implementar GdtBatchService y GdtBatchController
3. Crear custom rule nodes para cálculos API MPMS
4. Configurar queue processors para tareas asíncronas
5. Implementar PDF/Excel generation en Java
