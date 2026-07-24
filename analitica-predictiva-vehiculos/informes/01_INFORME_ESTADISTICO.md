# Informe Estadístico Completo
### Fases 1 (Auditoría de datos) y 2 (Estadística descriptiva)

---

## 1. Fase 1 — Auditoría de calidad de datos

La base entregada (`Data_depurada_final.xlsx`, hoja *Data*) contiene **131.976
registros y 17 columnas**, cada registro un viaje (`No. Viaje`) que corresponde a
**un vehículo despachado**. Esta equivalencia 1 viaje = 1 vehículo es la base de toda
la medición de "demanda de vehículos".

### 1.1 Resultados de la auditoría

| Verificación | Resultado | Lectura |
|---|---|---|
| Rango temporal | 2025-01-02 a 2026-06-30 (545 días) | 18 meses; 543 días con operación |
| Valores nulos | **0** en todas las columnas | Base efectivamente depurada |
| Filas duplicadas exactas | **0** | Sin duplicación total de registros |
| `No. Viaje` repetidos | **177 ids** (354 filas) | 312 filas son idénticas salvo la fecha → doble digitación |
| Consistencia MES/AÑO vs Fecha | **0 inconsistencias** | Campos derivados confiables |
| Peso: ceros / negativos | **0 / 0** | Sin errores de signo o vacíos numéricos |
| Peso: atípicos IQR superior | **0** | Distribución ancha pero sin colas absurdas |
| Peso improbable por tipología | **1** (camioneta con 8,75 t) | Único error de tipificación a corregir |
| Origen = Destino | **11.219** (8,5 %) | Movimientos intraurbanos (puerto/planta-bodega), no error |
| Placas con >1 tipo de flota | **183** | El mapeo placa→flota no es 1:1; se resuelve por moda |

### 1.2 Cardinalidad de las variables categóricas

| Variable | Valores únicos | | Variable | Valores únicos |
|---|---|---|---|---|
| CLIENTE | 20 | | Negocio | 14 |
| PLACA | 5.385 | | Corredor (O→D) | 1.752 |
| Ciudad Origen | 64 | | Ciudad Destino | 387 |
| Zona Origen / Destino | 8 / 8 | | Tipología de camión | 6 |
| Tipo Transportador | 3 | | Tipo Viaje | 6 |

### 1.3 Decisiones de tratamiento (documentadas)

- **Duplicados por `No. Viaje`:** se conservan en el análisis de volumen porque son
  filas distintas de la base, pero se **marcan** como riesgo de doble conteo; la macro
  VBA los elimina con `RemoveDuplicates` sobre la columna clave al consolidar.
- **Origen = Destino:** se **excluyen** del análisis de retornos vacíos (no generan
  desbalance direccional) pero se conservan como demanda intraurbana.
- **Placas multi-flota:** se asigna a cada placa su flota por **moda** (valor más
  frecuente).
- **Camioneta de 8,75 t:** se señala como error de tipificación; no altera resultados
  agregados.

> **Conclusión de la Fase 1:** la base es de **alta calidad** (sin nulos, sin ceros de
> peso, campos temporales consistentes). Los únicos hallazgos accionables son los 177
> ids repetidos y un registro mal tipificado. No se requiere imputación.

---

## 2. Fase 2 — Estadística descriptiva

### 2.1 Peso cargado (toneladas)

| Estadístico | Valor | | Estadístico | Valor |
|---|---|---|---|---|
| Media | 14,67 t | | Desv. estándar | 11,15 t |
| Mediana | 9,47 t | | **Coef. variación** | **76,0 %** |
| Moda | 34,0 t | | Mín / Máx | 0,05 / 39,46 t |
| p25 / p75 | 5,41 / 25,0 t | | p95 | 34,0 t |

La distribución es **bimodal** (ver `outputs/graficos/fase2_hist_peso.png`): un grupo
liviano de reparto urbano (turbos y sencillos, 3–9 t) y un grupo pesado de larga
distancia (tractomulas ~34 t). La media (14,67) cae en el "valle" entre ambos modos,
por lo que **usar la media como carga típica sería un error**; la planeación debe
segmentar por tipología.

**Peso por tipología** (la variable que casi determina la capacidad, ver Fase 3):

| Tipología | n | Media (t) | Mediana (t) | CV | Rol logístico |
|---|---|---|---|---|---|
| CAMIONETA | 3.153 | 1,26 | 1,00 | 71 % | Mensajería / urbano ligero |
| TURBO | 24.592 | 3,48 | 3,86 | 45 % | Distribución urbana |
| SENCILLO | 40.835 | 7,86 | 8,72 | 28 % | Urbano-regional |
| DOBLETROQUE | 17.527 | 15,24 | 16,00 | 17 % | Regional |
| CUATROMANOS | 842 | 16,95 | 16,42 | 19 % | Regional pesado |
| TRACTOMULA | 45.027 | 27,65 | 31,82 | 29 % | Larga distancia / exportación |

### 2.2 Demanda diaria de vehículos

| Serie | Media | Mediana | Desv. | **CV** | Máx |
|---|---|---|---|---|---|
| Todos los días | 242 | 277 | 115 | **47,6 %** | 676 |
| **Solo días hábiles** | **299** | 297 | 62 | **20,7 %** | 676 |

Este es el hallazgo estadístico central: **al aislar los días hábiles, la variabilidad
se reduce a menos de la mitad**. La demanda operativa es estable y por lo tanto
pronosticable. Toneladas por día: media 3.553 t; total del periodo 1.936.583 t.

### 2.3 Comportamiento por día de la semana (estacionalidad semanal)

| Día | Viajes/día | Índice vs promedio | Interpretación |
|---|---|---|---|
| Lunes | 234 | 0,97 | Deprimido por festivos "puente" (Ley Emiliani mueve festivos a lunes) |
| **Martes** | **316** | **1,31** | **Pico semanal** |
| Miércoles | 308 | 1,27 | Pico |
| Jueves | 278 | 1,15 | Alta |
| Viernes | 270 | 1,12 | Alta |
| Sábado | 249 | 1,03 | Media |
| Domingo | 39 | 0,16 | Operación mínima |

**Lectura operativa:** la capacidad debe dimensionarse para el pico martes-miércoles,
no para el promedio. Reservar según el promedio dejaría ~30 % de la demanda del martes
sin cubrir. Los lunes exigen leer el calendario de festivos antes de programar.

### 2.4 Comportamiento por tipo de día

| Tipo de día | n días | Viajes/día promedio |
|---|---|---|
| Hábil | 364 | 299 |
| Fin de semana | 155 | 145 |
| Festivo | 26 | 25,5 |

Un festivo reduce la demanda **~91 %** frente a un hábil. Por eso el conteo de días
hábiles de la semana es el predictor más potente del total semanal (ver Fase 7).

### 2.5 Estacionalidad y tendencia mensual

Los viajes mensuales oscilan entre **6.304 (jun-2025)** y **8.322 (oct-2025)**, con un
segundo semestre de 2025 más alto (sep-oct pico) y una tendencia de crecimiento
**suave** (~+30 viajes/mes en la regresión lineal, apenas perceptible sobre ~7.300/mes).
No hay estacionalidad anual marcada; el motor de la variación es semanal + festivos.

### 2.6 Comportamiento por cliente (unidad de negocio)

| Negocio | Viajes | % | Toneladas | Ton/viaje | CV ton |
|---|---|---|---|---|---|
| REVESTIMIENTO | 43.897 | 33,3 % | 829.514 | 18,9 | 58 % |
| PORCELANA SANITARIA | 25.500 | 19,3 % | 159.567 | 6,3 | 86 % |
| SUMICOL | 20.026 | 15,2 % | 361.934 | 18,1 | 56 % |
| CORLANC | 12.012 | 9,1 % | 147.205 | 12,3 | 68 % |
| ALION (cemento) | 10.320 | 7,8 % | 132.192 | 12,8 | 89 % |
| LOCERIA | 4.170 | 3,2 % | 59.071 | 14,2 | 76 % |
| TERNIUM (acero) | 3.417 | 2,6 % | 56.603 | 16,6 | 70 % |

Los tres primeros negocios concentran el **68 %** de los viajes. Porcelana Sanitaria
mueve mucho volumen con carga liviana (6,3 t/viaje) → intensiva en vehículos pequeños;
Revestimiento y Sumicol combinan volumen y peso → intensivas en tractomula/dobletroque.

---

## 3. Significado logístico de los hallazgos (síntesis)

1. **La demanda es calendario-dependiente y estable en días hábiles** → se puede
   planear a 7 días con bajo error.
2. **La tipología del camión define la capacidad** → la planeación debe hacerse por
   tipo de vehículo, no en "vehículos" genéricos.
3. **Pocos clientes concentran la demanda** → alinear su programación resuelve la
   mayor parte del problema.
4. **El pico martes-miércoles y la caída de domingos/festivos** son la firma que el
   modelo debe reproducir; cualquier modelo que ignore el calendario fracasa.

*Gráficos de soporte:* `fase2_hist_peso.png`, `fase2_box_peso_tipologia.png`,
`fase2_serie_diaria.png`, `fase2_perfil_dow.png`, `fase2_serie_mensual.png`.
