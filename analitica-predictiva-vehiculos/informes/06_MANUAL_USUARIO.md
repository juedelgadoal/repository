# Manual de Usuario
### Dashboard Excel 2016 + Macro VBA — Planeación Predictiva de Vehículos (DIC)

---

## 1. Contenido del entregable

| Archivo | Descripción |
|---|---|
| `dashboard/Dashboard_Planeacion_Vehiculos.xlsx` | Tablero con KPIs, gráficos, rankings y pronóstico |
| `dashboard/vba/Modulo1_Principal.bas` … `Modulo7_PowerPoint.bas` | Código de la macro (7 módulos) |
| `dashboard/build_dashboard.py` | Constructor del tablero (por si se desea regenerar) |

## 2. El Dashboard — recorrido por hojas

| Hoja | Qué contiene | Uso |
|---|---|---|
| **Portada** | Identificación, KPIs de cabecera, índice | Punto de entrada |
| **Tablero** | Tarjetas KPI, **alertas**, semáforo de capacidad, recomendaciones | Vista gerencial diaria |
| **Pronostico** | Horizontes 1/3/7/15/30, pronóstico diario 30 d, reserva sugerida, desglose por corredor | Decisión de reserva |
| **Demanda** | Serie mensual por flota, perfil por día de semana | Contexto histórico |
| **Clientes** | Ranking por viajes/toneladas/frecuencia (Tabla filtrable) | Gobierno de la demanda |
| **Corredores** | Top corredores + corredores críticos | Anticipación por ruta |
| **Flota_Placas** | Participación de flota, top placas por utilización | Gestión de flota |
| **Retornos_Vacios** | Desbalance, rutas de riesgo, costo estimado, balance por zona | Ahorro / backhaul |
| **Modelo** | Comparación de los 9 modelos, coeficientes OLS | Auditoría técnica |
| **Correlaciones** | Variables que explican la demanda | Soporte estadístico |
| **Parametros** | **Celdas editables (amarillas)**: umbral de alerta, colchón, tarifas SICETAC, contraseña | Configuración |

**Celda clave (fórmula viva):** en *Pronostico*, la **reserva sugerida** se calcula como
`=ROUND(vehículos_7d × (1 + Parametros!$B$5), 0)`. Si cambia el colchón en *Parámetros!B5*,
la reserva se recalcula sola.

## 3. Instalación de la macro VBA (una sola vez)

> Los módulos se entregan como `.bas` para máxima compatibilidad. Importarlos toma 2
> minutos.

1. Abra `Dashboard_Planeacion_Vehiculos.xlsx`.
2. **Guarde como** `.xlsm` (Libro de Excel habilitado para macros): *Archivo → Guardar
   como → tipo "Libro de Excel habilitado para macros (*.xlsm)"*.
3. Abra el editor VBA con **Alt + F11**.
4. *Archivo → Importar archivo…* e importe **los 7 módulos** de `dashboard/vba/`:
   `Modulo1_Principal.bas` … `Modulo7_PowerPoint.bas`.
5. Cierre el editor. Habilite macros si Excel lo solicita (*Habilitar contenido*).

### 3.1 Crear el botón único

1. En la hoja **Tablero**: *Insertar → Formas → Rectángulo* (o *Programador → Insertar →
   Botón*).
2. Escríbale el texto **"ACTUALIZAR TODO"**.
3. Clic derecho → *Asignar macro…* → seleccione **`EjecutarTodo`** → Aceptar.

### 3.2 Proteger el código con la contraseña UCLOG

1. En el editor VBA (**Alt + F11**): *Herramientas → Propiedades de VBAProject…*
2. Pestaña **Protección** → marque *"Bloquear proyecto para visualización"*.
3. Contraseña: **`UCLOG`** (mayúsculas), confírmela y Aceptar.
4. Guarde y cierre el libro. Al reabrir, el código queda protegido.

> Nota técnica: por seguridad de Office, un proyecto VBA **no puede auto-protegerse** por
> código; la protección se activa manualmente una sola vez (paso anterior). La contraseña
> también queda registrada en *Parámetros!B18* como referencia.

## 4. Uso diario/semanal — el botón único

Coloque los archivos nuevos de operación (mismos encabezados que la hoja `DATA`) en una
subcarpeta **`Entrada`** junto al libro. Luego pulse **"ACTUALIZAR TODO"**. La macro
ejecuta, en orden, todo el flujo:

1. **Importa** los archivos de `Entrada` (.xlsx/.xlsm/.csv) y los mueve a `Entrada/Procesados`.
2. **Consolida** el histórico en `DATA` eliminando duplicados por `No. Viaje`.
3. **Limpia** (normaliza texto, recalcula MES/AÑO desde la fecha, descarta filas sin
   fecha/placa).
4. **Recalcula** la serie diaria e índices (hoja `BASE_Diaria`).
5. **Reentrena** el modelo OLS con `LINEST` y **pronostica** 30 días (hoja `Pronostico`).
6. **Actualiza** tablas dinámicas, segmentadores y gráficos.
7. **Guarda** el snapshot en `Hist_Predicciones`.
8. **Evalúa alertas**: semáforo de capacidad (rojo si demanda > capacidad + umbral).
9. **Genera** el informe ejecutivo en PowerPoint (si `GenerarPPT` = Verdadero).

Al terminar muestra un mensaje con el tiempo de ejecución. Todo queda registrado en la
hoja oculta **`Log`**.

## 5. Parámetros editables (hoja *Parametros*)

| Celda | Parámetro | Valor por defecto | Efecto |
|---|---|---|---|
| B4 | Umbral de alerta de capacidad | 10 % | Sobre este exceso, alerta roja |
| B5 | Colchón de reserva (nivel servicio) | 9,5 % | Ajusta la reserva sugerida |
| B6 | Factor de costo variable del vacío | 65 % | Ajusta el costo de retornos vacíos |
| B10:C15 | Tarifa SICETAC por tipología (COP/km, mínimo) | valores estimados | Costeo de rutas |
| B18 | Contraseña VBA | UCLOG | Referencia |

> **Importante:** las tarifas son estimaciones. Para costeo formal, reemplácelas por la
> consulta oficial del SICETAC (https://sicetac.gov.co) por origen-destino-configuración.

## 6. Interpretación de las alertas

- 🟢 **Verde:** capacidad suficiente para la demanda pronosticada.
- 🟠 **Ámbar:** demanda cercana al límite (0 % < exceso ≤ umbral).
- 🔴 **Rojo:** demanda supera la capacidad en más del umbral; indica cuántos vehículos
  adicionales contratar.

## 7. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| "No se pueden ejecutar macros" | Libro en `.xlsx` o macros deshabilitadas | Guardar como `.xlsm`; *Habilitar contenido* |
| No importa archivos | Carpeta `Entrada` inexistente o encabezados distintos | Crear `Entrada`; alinear encabezados con `DATA` |
| El pronóstico no cambia | `DATA` con < 60 días de historia | Cargar más historia |
| No genera PowerPoint | PowerPoint no instalado | La macro lo omite y sigue (queda en `Log`) |
| Segmentadores no aparecen | Versión de Excel < 2013 | Requiere Excel 2013+ (2016 recomendado) |
| Olvidó la contraseña | — | Es **UCLOG** (ver *Parámetros!B18*) |

## 8. Requisitos

- **Excel 2016** o superior (VBA7), Windows.
- Para el informe automático: **PowerPoint 2016** (opcional; si falta, se omite).
- Permisos para ejecutar macros (habilitar en *Centro de confianza* si es necesario).

---

*Arquitectura de la macro:* `Modulo1` orquesta; `Modulo2` importa/consolida; `Modulo3`
limpia; `Modulo4` construye la serie diaria; `Modulo5` es el motor OLS (reentrena con
`LINEST` y pronostica); `Modulo6` actualiza tablas/gráficos y alertas; `Modulo7` genera
el PowerPoint. Todo el código está comentado en español.
