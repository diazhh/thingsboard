# Guía de Compilación - Backend de Reportes

**Fecha:** 2 de diciembre de 2025  
**Versión:** 1.0  
**Estado:** Listo para compilar

---

## 📋 Resumen

Este documento proporciona instrucciones paso a paso para compilar el backend de ThingsBoard con el nuevo sistema de reportes integrado.

---

## ✅ Requisitos Previos

### 1. Java Development Kit (JDK)
```bash
# Verificar versión (debe ser 11 o superior)
java -version
# Salida esperada: openjdk version "11.0.x" o superior
```

### 2. Apache Maven
```bash
# Verificar versión (debe ser 3.6.0 o superior)
mvn -version
# Salida esperada: Apache Maven 3.6.x o superior
```

### 3. Git
```bash
# Verificar versión
git --version
```

---

## 🔧 Pasos de Compilación

### Paso 1: Navegar al Directorio del Proyecto

```bash
cd /home/jsalazar/Documentos/github/gdt/thingsboard
```

### Paso 2: Limpiar Compilaciones Anteriores (Recomendado)

```bash
mvn clean
```

**Salida esperada:**
```
[INFO] Scanning for projects...
[INFO] 
[INFO] --------< org.thingsboard:thingsboard >--------
[INFO] Building ThingsBoard Server 4.3.0-SNAPSHOT
[INFO] --------
[INFO] 
[INFO] --- maven-clean-plugin:3.x.x:clean (default-clean) @ thingsboard ---
[INFO] Deleting /home/jsalazar/Documentos/github/gdt/thingsboard/target
[INFO] BUILD SUCCESS
```

### Paso 3: Descargar Dependencias

```bash
mvn dependency:resolve
```

**Nota:** Este paso descargará todas las dependencias, incluyendo las nuevas:
- Apache PDFBox 2.0.29
- Apache POI 5.2.3
- Commons CSV 1.10.0

**Salida esperada:**
```
[INFO] Scanning for projects...
[INFO] 
[INFO] --------< org.thingsboard:thingsboard >--------
[INFO] Building ThingsBoard Server 4.3.0-SNAPSHOT
[INFO] --------
[INFO] 
[INFO] --- maven-dependency-plugin:3.x.x:resolve (default-cli) @ thingsboard ---
[INFO] The following files have been resolved:
[INFO]    org.apache.pdfbox:pdfbox:jar:2.0.29:compile
[INFO]    org.apache.poi:poi-ooxml:jar:5.2.3:compile
[INFO]    org.apache.commons:commons-csv:jar:1.10.0:compile
[INFO]    ... (muchas más dependencias)
[INFO] BUILD SUCCESS
```

### Paso 4: Compilar el Proyecto

```bash
mvn clean install -DskipTests
```

**Opciones:**
- `-DskipTests`: Omite los tests (recomendado para la primera compilación)
- `-X`: Modo debug (si hay problemas)
- `-T 1C`: Usa un thread por core del CPU (acelera la compilación)

**Compilación completa (recomendado):**
```bash
mvn clean install -DskipTests -T 1C
```

**Salida esperada (últimas líneas):**
```
[INFO] Building jar: /home/jsalazar/Documentos/github/gdt/thingsboard/application/target/thingsboard-4.3.0-SNAPSHOT.jar
[INFO] 
[INFO] --------< org.thingsboard:thingsboard >--------
[INFO] Building ThingsBoard Server 4.3.0-SNAPSHOT
[INFO] --------
[INFO] BUILD SUCCESS
[INFO] Total time: XX minutes XX seconds
[INFO] Finished at: 2025-12-02T14:XX:XX+00:00
```

---

## 🚀 Verificación de la Compilación

### 1. Verificar que el JAR se creó

```bash
ls -lh /home/jsalazar/Documentos/github/gdt/thingsboard/application/target/thingsboard-*.jar
```

**Salida esperada:**
```
-rw-r--r-- 1 user group 250M Dec  2 14:30 thingsboard-4.3.0-SNAPSHOT.jar
```

### 2. Verificar que las clases fueron compiladas

```bash
jar tf /home/jsalazar/Documentos/github/gdt/thingsboard/application/target/thingsboard-4.3.0-SNAPSHOT.jar | grep "gdt/report"
```

**Salida esperada:**
```
org/thingsboard/server/dao/gdt/report/model/ReportRequest.class
org/thingsboard/server/dao/gdt/report/model/ReportResponse.class
org/thingsboard/server/dao/gdt/report/model/ReportType.class
org/thingsboard/server/dao/gdt/report/model/ReportFormat.class
org/thingsboard/server/dao/gdt/report/model/ReportStatus.class
org/thingsboard/server/dao/gdt/report/model/report/DailyInventoryReportData.class
org/thingsboard/server/controller/ReportController.class
org/thingsboard/server/dao/gdt/report/service/ReportService.class
org/thingsboard/server/dao/gdt/report/service/ReportServiceImpl.class
org/thingsboard/server/dao/gdt/report/service/ReportExportService.class
org/thingsboard/server/dao/gdt/report/generator/ReportGenerator.class
org/thingsboard/server/dao/gdt/report/generator/ReportGeneratorFactory.class
org/thingsboard/server/dao/gdt/report/generator/InventoryReportGenerator.class
```

---

## 🐛 Solución de Problemas

### Problema 1: Error de Memoria

**Síntoma:**
```
[ERROR] COMPILATION ERROR
[ERROR] Java heap space
```

**Solución:**
```bash
export MAVEN_OPTS="-Xmx2g -Xms1g"
mvn clean install -DskipTests
```

### Problema 2: Dependencias No Encontradas

**Síntoma:**
```
[ERROR] Failed to execute goal on project application: Could not resolve dependencies
```

**Solución:**
```bash
# Limpiar caché local de Maven
rm -rf ~/.m2/repository

# Reintentar descarga
mvn clean install -DskipTests
```

### Problema 3: Versión de Java Incorrecta

**Síntoma:**
```
[ERROR] Source option 11 is no longer supported. Use 17 or later.
```

**Solución:**
```bash
# Verificar versión de Java
java -version

# Si es necesario, establecer JAVA_HOME
export JAVA_HOME=/path/to/jdk11
```

### Problema 4: Error en Tests

**Síntoma:**
```
[ERROR] Tests run: 100, Failures: 5, Errors: 2
```

**Solución:**
```bash
# Usar -DskipTests para omitir tests
mvn clean install -DskipTests

# O ejecutar solo tests específicos
mvn test -Dtest=ReportControllerTest
```

---

## 📊 Tiempo de Compilación Estimado

| Escenario | Tiempo |
|-----------|--------|
| Primera compilación (con descargas) | 15-30 minutos |
| Compilación posterior (sin cambios) | 5-10 minutos |
| Compilación incremental | 1-3 minutos |
| Con tests | +5-10 minutos |

---

## 🔍 Verificación Post-Compilación

### 1. Iniciar ThingsBoard

```bash
java -jar /home/jsalazar/Documentos/github/gdt/thingsboard/application/target/thingsboard-4.3.0-SNAPSHOT.jar
```

**Salida esperada:**
```
2025-12-02 14:30:00 - Starting ThingsBoard Server...
2025-12-02 14:30:05 - ThingsBoard Server started successfully
2025-12-02 14:30:10 - Listening on port 8080
```

### 2. Verificar que los endpoints están disponibles

```bash
curl -X GET http://localhost:8080/api/reports/history
```

**Salida esperada:**
```json
[]
```

### 3. Probar generación de reporte

```bash
curl -X POST http://localhost:8080/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "DAILY_INVENTORY",
    "format": "CSV",
    "parameters": {}
  }'
```

---

## 📝 Dependencias Agregadas

Las siguientes dependencias fueron agregadas al `pom.xml`:

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

<!-- Lombok for code generation -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

---

## 🎯 Próximos Pasos

1. ✅ Compilar el backend
2. ✅ Iniciar ThingsBoard
3. ✅ Verificar que los endpoints funcionan
4. ✅ Probar generación de reportes desde el frontend
5. ⏭️ Implementar PDF y Excel (si es necesario)

---

## 📞 Soporte

Si encuentras problemas durante la compilación:

1. Verifica que todas las dependencias estén disponibles
2. Revisa los logs de compilación
3. Intenta compilar sin tests primero
4. Aumenta la memoria asignada a Maven

---

**Documento creado:** 2 de diciembre de 2025  
**Última actualización:** 2 de diciembre de 2025  
**Versión:** 1.0
