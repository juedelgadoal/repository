# Auditoría de la Macro VBA Consolidada
### Dashboard_Planeacion_Vehiculos.xlsm — Diagnóstico y correcciones

**Alcance:** revisión del proyecto VBA extraído del `.xlsm` entregado (14 módulos
estándar + 12 módulos de hoja), en busca de la causa de los fallos reportados.
**Método:** extracción del código con `olevba`, análisis estático de compilación y
revisión lógica procedimiento por procedimiento.

---

## 1. Diagnóstico principal (causa raíz del fallo)

> **Los 7 módulos están importados DOS VECES.** El proyecto contiene
> `Modulo1_Principal` … `Modulo7_PowerPoint` **y** sus copias
> `Modulo1_Principal1` … `Modulo7_PowerPoint1`, byte a byte idénticas.

Esto genera **43 procedimientos con nombre duplicado** (más constantes `Public Const`
repetidas como `PWD_VBA`, `HOJA_DATOS`, etc.). Al compilar, VBA lanza:

```
Error de compilación: Nombre ambiguo detectado: EjecutarTodo
(Ambiguous name detected)
```

Como el error es de **compilación**, **ningún procedimiento del proyecto puede
ejecutarse** — el botón "ACTUALIZAR TODO" falla antes de correr la primera línea.
Esta es, con casi total certeza, la razón por la que "falla en ciertas partes".

**Procedimientos duplicados (muestra):** `EjecutarTodo`, `ImportarNuevosArchivos`,
`ConsolidarHistorico`, `LimpiarDatos`, `RecalcularIndicadores`, `EjecutarModeloOLS`,
`ActualizarTablasYGraficos`, `EvaluarAlertas`, `GenerarInformeEjecutivo`,
`Log_Registrar`, `ObtenerHoja`, `EsFestivo`… (43 en total).

### Corrección
Eliminar las 7 copias duplicadas. **Recomendado (limpio):** eliminar los 14 módulos
estándar e importar los **7 módulos corregidos** que se adjuntan (ver §4 y §5).

---

## 2. Fallas adicionales encontradas (más allá de la duplicación)

Aunque la duplicación bloquea todo, al revisar la lógica se encontraron **otros
defectos reales** que habrían aparecido una vez resuelta la compilación. Todos están
corregidos en los módulos adjuntos.

| # | Sev. | Módulo | Defecto | Síntoma | Corrección |
|---|------|--------|---------|---------|------------|
| 1 | 🔴 Crítico | (proyecto) | 7 módulos duplicados → nombres ambiguos | No compila; nada corre | Eliminar duplicados / reimportar |
| 2 | 🟠 Alto | Modulo5 | `Names.Add "Pron_7d"` sin borrar el nombre previo | **Error 1004 en la 2.ª ejecución** (nombre ya existe) → aborta tras el pronóstico; no corren alertas ni PPT | Borrado idempotente antes de `Add` |
| 3 | 🟠 Alto | Modulo2 | Importación **posicional** (copia filas enteras) | Si el archivo de entrada trae las columnas en otro orden, los datos caen en la columna equivocada (corrupción silenciosa; luego la limpieza descarta casi todo) | Importación **por nombre de encabezado** |
| 4 | 🟡 Medio | Modulo3 | Búsqueda de columna por texto exacto (`col("Mes - Anio")`, `col("ANIO")`) | Si `DATA` trae encabezados con tilde ("Mes - Año", "AÑO") → índice 0 → **Error 9 "Subíndice fuera del intervalo"** | Búsqueda **normalizada** (sin tildes) `NormHdr` |
| 5 | 🟡 Medio | Modulo3/4 | Sin validación si faltan columnas clave | Crash críptico a mitad de proceso | Aborta con mensaje claro en `Log` |
| 6 | 🟡 Medio | Modulo2 | `ApilarCSV` abre el archivo **dos veces** | El `.csv` puede no importarse | Se usa `ApilarArchivo` directamente |
| 7 | 🟡 Medio | Modulo5 | `LinEst` vía `WorksheetFunction` | Si la matriz es singular/colineal, **lanza excepción dura** y aborta | `Application.LinEst` + `IsError` |
| 8 | 🟢 Bajo | Modulo7 | `LeerNum("Pronostico","F0")` — celda inválida (fila 0) | La "Reserva sugerida" del PPT sale en **0** | Se calcula `pron7 × (1+colchón)` |
| 9 | 🟢 Bajo | Modulo5 | `Worksheets("BASE_Diaria")` sin `On Error` | Falla si se ejecuta suelto sin la hoja | Acceso protegido + mensaje |
| 10 | ⚪ Info | Modulo6 | `SlicerCaches.Add2` | Requiere Excel 2013+; ya va protegido con `On Error` | Sin cambio (correcto) |

---

## 3. Detalle de las correcciones clave

### 3.1 Duplicación de módulos (🔴)
No es un error de código sino de **importación**: al importar los `.bas` una segunda
vez, Excel crea copias con sufijo `1`. La solución es eliminarlas.

### 3.2 `Names.Add` no idempotente (🟠, Modulo5)
**Antes** — falla al re-ejecutar porque el nombre ya existe:
```vba
ThisWorkbook.Names.Add Name:="Pron_7d", RefersTo:="='" & ws.Name & "'!$N$2"
```
**Después** — se borra primero, se vuelve a crear:
```vba
On Error Resume Next
ThisWorkbook.Names("Pron_7d").Delete
On Error GoTo 0
ThisWorkbook.Names.Add Name:="Pron_7d", RefersTo:="='" & ws.Name & "'!$N$2"
```
> Este es el defecto que mejor explica el patrón "corre la primera vez y **falla en
> las siguientes**".

### 3.3 Importación por nombre de encabezado (🟠/🟡, Modulo2-4)
La versión previa copiaba las columnas por **posición** y las buscaba por **texto
exacto**. Ahora la macro **mapea cada columna por su nombre normalizado** (sin
tildes, en cualquier orden). Si falta una columna crítica (Fecha/PLACA/PESO), aborta
con un mensaje claro en la hoja `Log` en lugar de corromper datos o cortarse a mitad.

### 3.4 `LinEst` robusto (🟡, Modulo5)
`Application.WorksheetFunction.LinEst` **lanza una excepción** si la regresión es
singular. Se cambió a `Application.LinEst`, que **devuelve un valor de error**
manejable, y se añadió una verificación de mínimo de observaciones.

---

## 4. Remediación paso a paso (10 minutos)

1. Abra el `.xlsm` y entre al editor VBA con **Alt + F11**.
2. En el *Explorador de proyectos*, bajo **Módulos**, elimine **los 14 módulos**
   (clic derecho → *Quitar Modulo…* → *No* a "¿Exportar antes de quitar?").
   > No toque los objetos de Hoja (`Hoja1`…`Hoja11`) ni `ThisWorkbook`.
3. *Archivo → Importar archivo…* e importe los **7 módulos corregidos** adjuntos
   (`Modulo1_Principal.bas` … `Modulo7_PowerPoint.bas`).
4. **Compile** para verificar: menú *Depuración → Compilar VBAProject*. No debe
   aparecer ningún error.
5. Reasigne la macro **`EjecutarTodo`** al botón del *Tablero* (por si se perdió).
6. (Opcional) Reproteja el proyecto con la contraseña **UCLOG**.

## 5. Lista de verificación posterior

- [ ] *Depuración → Compilar VBAProject* sin errores (ya no hay nombres ambiguos).
- [ ] Existe **una sola** copia de cada módulo (sin sufijo `1`).
- [ ] La carpeta **`Entrada`** existe junto al libro.
- [ ] Primera corrida: se crea `DATA`/`BASE_Diaria` y se llena `Pronostico`.
- [ ] **Segunda corrida** seguida: termina sin el error 1004 (fix del nombre `Pron_7d`).
- [ ] La hoja `Log` muestra "FIN OK".

---

## 6. Resumen

La macro no fallaba por su lógica de negocio sino, en primer lugar, por una
**duplicación de módulos al importarlos dos veces** (bloquea la compilación) y, en
segundo lugar, por un **defecto de re-ejecución** (`Names.Add`) y varias
**fragilidades de importación/limpieza** ante archivos con distinto orden o tildes en
los encabezados. Los **7 módulos corregidos adjuntos** resuelven los 9 defectos de
código; la duplicación se corrige eliminando las copias. Con eso, el botón
"ACTUALIZAR TODO" queda operativo y repetible.
