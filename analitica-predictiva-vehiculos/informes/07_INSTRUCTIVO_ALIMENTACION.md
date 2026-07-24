# Instructivo — Cómo alimentar la macro para generar predicciones
### Herramienta de Planeación Predictiva de Vehículos (DIC)

Este instructivo explica, paso a paso, **cómo cargar datos nuevos y obtener el
pronóstico cada vez que se requiera**. La operación recurrente toma menos de 2
minutos y se hace con **un solo botón**.

---

## 1. Idea central (30 segundos)

- **Una fila = un viaje = un vehículo despachado.** La macro cuenta esas filas por
  día para medir y predecir la demanda de vehículos.
- Usted **agrega los viajes nuevos**; la macro **reentrena el modelo y pronostica**
  1, 3, 7, 15 y 30 días, y actualiza el tablero y las alertas.
- Solo necesita mantener **actualizada la base**. El resto es automático.

---

## 2. Preparación por única vez (5 minutos)

> Si ya lo hizo al instalar la macro (Manual de Usuario §3), salte al punto 3.

1. Guarde `Dashboard_Planeacion_Vehiculos.xlsx` como **`.xlsm`** (libro con macros)
   e importe los 7 módulos VBA (Manual §3).
2. Cree, **en la misma carpeta del Dashboard**, una subcarpeta llamada exactamente
   **`Entrada`**.
3. **Carga inicial del histórico:** coloque en `Entrada` su base histórica completa
   (el archivo depurado de 18 meses, o cuantos meses tenga) y pulse el botón
   **ACTUALIZAR TODO** una vez. Esto llena la hoja `DATA` y entrena el modelo por
   primera vez. *(Mínimo 60 días de historia; ideal, todo el histórico.)*

Estructura de carpetas resultante:

```
📁 Carpeta del Dashboard
 ├── Dashboard_Planeacion_Vehiculos.xlsm   ← el libro con el botón
 └── 📁 Entrada                             ← aquí deja los archivos nuevos
      └── 📁 Procesados                      ← la macro mueve aquí lo ya cargado
```

---

## 3. Alimentación recurrente — el ciclo de cada vez (2 minutos)

```
   ┌─────────────┐   ┌──────────────┐   ┌───────────────┐   ┌──────────────┐
   │ 1. Llenar   │ → │ 2. Guardar   │ → │ 3. Pulsar     │ → │ 4. Leer el   │
   │ la plantilla│   │ en 'Entrada' │   │ ACTUALIZAR    │   │ pronóstico   │
   └─────────────┘   └──────────────┘   │    TODO       │   │ y alertas    │
                                        └───────────────┘   └──────────────┘
```

### Paso 1 — Prepare el archivo de datos nuevos
Use la **`Plantilla_Carga_DATA.xlsx`** incluida (hoja *CARGA*): reemplace la fila de
ejemplo (amarilla) por sus viajes nuevos. Puede pegar miles de filas.
- Alternativamente, exporte de su TMS un archivo con **las mismas columnas** (ver §4).
- El **orden de las columnas puede variar** y las **tildes son opcionales**: la macro
  reconoce las columnas por su nombre (AÑO = ANIO, Tipología = Tipologia).

### Paso 2 — Deje el archivo en `Entrada`
Guarde el archivo (`.xlsx`, `.xlsm` o `.csv`) en la carpeta **`Entrada`**. Puede dejar
**varios archivos** a la vez; la macro los procesa todos.

### Paso 3 — Pulse **ACTUALIZAR TODO**
Abra el Dashboard y pulse el botón del **Tablero**. En una sola pasada la macro:

| # | Acción automática |
|---|---|
| 1 | Importa los archivos de `Entrada` y los mueve a `Entrada/Procesados` |
| 2 | Consolida en `DATA` y **elimina viajes duplicados** por `No. Viaje` |
| 3 | Limpia (normaliza texto, recalcula MES/AÑO desde la fecha, descarta filas sin fecha o sin placa) |
| 4 | Reconstruye la serie diaria e índices |
| 5 | **Reentrena el modelo OLS y pronostica 30 días** |
| 6 | Actualiza tablas dinámicas, gráficos y KPIs |
| 7 | Guarda el pronóstico en el histórico de predicciones |
| 8 | Evalúa el **semáforo de capacidad** (alerta si demanda > capacidad +10 %) |
| 9 | Genera el informe ejecutivo en PowerPoint (si está activado) |

Al terminar aparece un mensaje con el tiempo de proceso. Todo queda en la hoja `Log`.

### Paso 4 — Lea los resultados
- Hoja **Pronostico**: vehículos por horizonte (1/3/7/15/30 días), pronóstico diario y
  **reserva sugerida** para la próxima semana.
- Hoja **Tablero**: KPIs, alertas y **semáforo de capacidad** (🟢/🟠/🔴).

---

## 4. Columnas que debe traer el archivo (referencia)

La macro reconoce estas 17 columnas por nombre. Solo **Fecha, PLACA, PESO, Ciudad
Origen/Destino y No. Viaje** son imprescindibles; MES/AÑO/Mes-Año se **recalculan
solos** desde la Fecha.

| Columna | ¿Obligatoria? | Formato / valores |
|---|---|---|
| No. Viaje | **Sí** | Id único (número o texto); los repetidos se eliminan |
| Negocio | Recom. | REVESTIMIENTO, SUMICOL, ALION, … |
| Ciudad Origen | **Sí** | Texto (MADRID, SOPO, YUMBO) |
| Ciudad Destino | **Sí** | Texto (BOGOTA D.C., MEDELLIN) |
| **Fecha** | **Sí** | **Fecha real (aaaa-mm-dd). Variable crítica** |
| Zona Destino | Recom. | Zona Cundinamarca, Zona Costa Atlántica, … |
| Tipología de camión | Recom. | TRACTOMULA, SENCILLO, TURBO, DOBLETROQUE, CUATROMANOS, CAMIONETA |
| Tipo Transportador | Recom. | Flota Propia, Empresas, Terceros |
| Tipo Negocio | Opc. | CI, Alion, VT |
| MES / AÑO / Mes - Año | Auto | Se recalculan desde Fecha; pueden ir vacías |
| Tipo Viaje | Opc. | URBANO, NACIONAL, EXPORTACION, … |
| Zona Origen | Recom. | Zona logística de origen |
| CLIENTE | Recom. | CI (propia) o nombre del cliente externo |
| PLACA | **Sí** | Texto; sin ella la fila se descarta |
| PESO CARGADO (ton) | **Sí** | Número decimal (9.5, 34.0) |

---

## 5. ¿Cada cuánto alimentarla?

| Frecuencia | Cuándo conviene | Beneficio |
|---|---|---|
| **Semanal (recomendada)** | Cada lunes/jueves, con los viajes de la semana | Pronóstico fresco para reservar la semana siguiente |
| Diaria | Operaciones muy dinámicas | Máxima actualización; el modelo usa los rezagos más recientes |
| Mensual | Mínimo aceptable | Suficiente para tendencias, pierde reacción semanal |

Como el modelo usa **rezagos de 7 y 14 días**, lo ideal es cargar datos **al menos una
vez por semana** para que el pronóstico refleje el nivel más reciente.

---

## 6. Reglas de calidad (para que el pronóstico sea confiable)

- **No deje filas en blanco** intermedias dentro de los datos.
- La **Fecha debe ser fecha real** (no texto). Si viene como texto "01/07/2026",
  conviértala a fecha antes de cargar.
- Cargue **solo viajes nuevos** o el histórico completo; los **duplicados por
  No. Viaje se eliminan solos**, así que no hay problema si se solapa algún periodo.
- Mantenga **coherentes los nombres** de ciudades y tipologías (MADRID vs Madrid da
  igual —se normaliza— pero "MADRID CUND" sería otra ciudad).

---

## 7. Errores comunes y solución

| Síntoma | Causa | Solución |
|---|---|---|
| "No se pueden ejecutar macros" | Libro en `.xlsx` | Guardar como `.xlsm` y *Habilitar contenido* |
| No importó nada | Carpeta `Entrada` inexistente o vacía | Crear `Entrada` y dejar el archivo dentro |
| El pronóstico no cambió | Menos de 60 días de historia en `DATA` | Cargar más historia |
| Faltan columnas (queda en `Log`) | El archivo no trae Fecha/PLACA/PESO | Use la plantilla; verifique esas 3 columnas |
| No generó PowerPoint | PowerPoint no instalado | La macro lo omite y continúa |
| Olvidó la contraseña del código | — | Es **UCLOG** (hoja *Parámetros!B18*) |

---

## 8. Resumen en una línea

> **Llene la plantilla → guárdela en `Entrada` → pulse ACTUALIZAR TODO → lea la hoja
> Pronostico.** Eso es todo lo que se necesita para predecir cada vez.
