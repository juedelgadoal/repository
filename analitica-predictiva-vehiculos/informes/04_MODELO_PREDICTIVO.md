# Modelo Predictivo Seleccionado y Justificación Técnica
### Fase 7 (Comparación de modelos) y Fase 8 (Pronósticos)

---

## 1. Definición del problema de pronóstico

**Objetivo:** anticipar la demanda de vehículos (viajes) con 7 días de antelación. Se
modela en las **dos unidades reales de decisión**:

- **Semanal** — *"¿cuántos vehículos reservar/contratar para la próxima semana?"* Es la
  decisión de planeación; su meta de error es **≤ 10 %**.
- **Diario a 7 días** — el perfil día a día para distribuir la reserva y asignar
  operativamente.

## 2. Protocolo de validación (evita autoengaño)

Se usó **backtesting de origen rodante** (rolling origin), no una partición aleatoria:

1. Se fija un origen (una fecha de corte).
2. Se entrena con **toda** la historia hasta ese origen.
3. Se pronostica el horizonte siguiente (7 días / 1 semana).
4. Se avanza el origen y se repite (14 orígenes diario, 16 semanal).
5. Se agrupan los errores de todos los orígenes.

**Todos los rezagos usan valores reales conocidos al momento del origen**, por lo que
no hay fuga de información. Métricas: MAE, RMSE, **MAPE**, **WAPE** (error absoluto
ponderado, robusto ante días de baja demanda) y **R²**. Para la selección se prioriza
**WAPE**, la métrica estándar en pronóstico de demanda operativa.

## 3. Resultados de la comparación (los 9 modelos)

### 3.1 Horizonte SEMANAL (decisión de reserva, meta ≤ 10 %)

| Modelo | MAE | RMSE | MAPE | **WAPE** | R² |
|---|---|---|---|---|---|
| **Regresión Múltiple (OLS)** | 120,4 | 154,8 | 10,1 % | **7,4 %** ✅ | 0,83 |
| Gradient Boosting | 170,1 | 295,0 | 25,8 % | 10,5 % | 0,40 |
| XGBoost | 173,4 | 292,4 | 25,6 % | 10,7 % | 0,41 |
| Random Forest | 197,5 | 326,1 | 28,7 % | 12,1 % | 0,26 |
| Prophet | 246,2 | 403,9 | 33,9 % | 15,1 % | −0,13 |
| Árbol de Decisión | 252,1 | 364,4 | 32,5 % | 15,5 % | 0,08 |
| ARIMA (2,1,2) | 256,0 | 399,1 | 35,5 % | 15,7 % | −0,11 |
| Regresión Lineal (solo tendencia) | 259,5 | 422,1 | 37,5 % | 16,0 % | −0,24 |
| SARIMA (1,0,1)(1,1,1)₅₂ | 779,1 | 2017 | 59,1 % | 47,9 % | −27,3 |

### 3.2 Horizonte DIARIO a 7 días (perfil operativo)

| Modelo | MAE | RMSE | MAPE | **WAPE** | R² |
|---|---|---|---|---|---|
| **Regresión Múltiple (OLS)** | 29,6 | 36,9 | 23,1 % | **12,2 %** | 0,89 |
| Random Forest | 30,2 | 40,1 | 42,8 % | 12,4 % | 0,87 |
| XGBoost | 30,9 | 39,8 | 77,7 % | 12,7 % | 0,88 |
| Gradient Boosting | 33,0 | 41,8 | 79,5 % | 13,6 % | 0,86 |
| Árbol de Decisión | 33,4 | 46,6 | 47,6 % | 13,8 % | 0,83 |
| Prophet | 33,6 | 43,0 | 94,8 % | 13,8 % | 0,86 |
| SARIMA (1,0,1)(1,1,1)₇ | 53,3 | 80,4 | 356 % | 22,0 % | 0,49 |
| Regresión Lineal (tendencia) | 74,6 | 95,6 | 433 % | 30,7 % | 0,29 |
| ARIMA (2,1,2) | 90,3 | 112,7 | 413 % | 37,2 % | 0,01 |

## 4. Modelo seleccionado: Regresión Múltiple (OLS)

**Gana en ambos horizontes.** En el semanal alcanza **WAPE 7,4 % (≤ 10 %, meta
cumplida)** con R² 0,83; en el diario, WAPE 12,2 % con R² 0,89. El residuo diario se
concentra en domingos y festivos (días de muy baja operación que inflan el MAPE pero
pesan poco en la planeación): en **días hábiles** el WAPE del modelo es **11,1 %**.

### 4.1 Por qué gana el modelo más simple

La demanda es **estructuralmente lineal en el calendario**: total semanal ≈ (días
hábiles × tasa diaria) + estacionalidad semanal + inercia reciente + tendencia suave.
Una regresión con **dummies de día de la semana + conteo de días hábiles + festivos +
rezagos semanales** captura casi toda la señal. Con solo ~70 semanas de historia, los
modelos de árboles (RF, GBM, XGBoost) **sobreajustan** (R² semanal 0,26–0,41) mientras
el OLS **regulariza** por su parsimonia. Es un resultado de navaja de Occam: el modelo
adecuado más simple domina.

### 4.2 Ventaja decisiva para la adopción

El OLS se reduce a una **lista de coeficientes** que se incrustan directamente en
Excel/VBA (`fase8_coeficientes_OLS_diario.csv` y hoja *Modelo*). La herramienta queda
**transparente, auditable y sin dependencias externas** — cualquier analista puede ver
y ajustar el modelo. Ningún otro candidato ofrece esto: Prophet y XGBoost requieren
Python; ARIMA/SARIMA, librerías especializadas.

## 5. Por qué se descartan los demás (justificación explícita)

- **Regresión Lineal (solo tendencia):** ignora el día de la semana; WAPE 16–31 %.
  Sirve como *baseline* que demuestra cuánta señal aporta el calendario.
- **Árbol de Decisión:** inestable, escalonado; WAPE 13,8–15,5 %.
- **Random Forest / Gradient Boosting / XGBoost:** competitivos en diario (12,4–13,6 %)
  pero **sobreajustan en semanal** (R² 0,26–0,41) con historia corta, y no son
  desplegables en Excel puro. Se conservan como *challengers* para cuando la historia
  crezca (ver §7).
- **Prophet:** razonable (WAPE 13,8 % diario) pero peor que OLS, más pesado y no
  incrustable en Excel.
- **ARIMA:** univariado; **no** ingiere festivos ni días hábiles → WAPE 37 % diario. La
  variable que domina la varianza le es invisible.
- **SARIMA:** el estacional semanal (m=7) mejora sobre ARIMA (WAPE 22 % diario) pero
  sigue lejos; el estacional anual (m=52) con serie corta es inestable (WAPE 48 %).

## 6. Fase 8 — Pronósticos generados

Ajustado el OLS sobre toda la historia, se genera un pronóstico **recursivo** (los
rezagos se realimentan con las predicciones) para 1/3/7/15/30 días. La demanda total se
descompone por flota, tipología, zona, corredor y cliente aplicando las
**participaciones de las últimas 8 semanas**.

| Horizonte | Vehículos | Toneladas | Veh/día | Propia | Afiliadas | Terceros |
|---|---|---|---|---|---|---|
| 1 día | 298 | 4.296 | 298 | 20 | 36 | 240 |
| 3 días | 859 | 12.384 | 286 | 59 | 104 | 694 |
| **7 días** | **1.831** | **26.398** | **262** | 126 | 223 | 1.480 |
| 15 días | 3.775 | 54.424 | 252 | 261 | 460 | 3.052 |
| 30 días | 7.777 | 112.121 | 259 | 538 | 949 | 6.288 |

Reparto por tipología (7 días): tractomula 633, sencillo 537, turbo 365, dobletroque
232. Desgloses por corredor/zona/cliente en `fase8_pronostico7_por_*.csv`.

**Reserva recomendada 7 días:** demanda 1.831 + colchón del 9,5 % (z·WAPE para 90 % de
nivel de servicio) = **~2.004 vehículos**.

## 7. Mantenimiento del modelo

- **Reentrenamiento:** la macro VBA recalcula los coeficientes con `LINEST` sobre la
  base actualizada en cada corrida (autocontenido en Excel). El pipeline Python permite
  un reentrenamiento completo con los 9 modelos.
- **Re-evaluación:** a medida que la historia supere ~100–120 semanas, conviene
  re-comparar OLS vs Gradient Boosting/XGBoost; con más datos los árboles podrían
  alcanzar al OLS y capturar no linealidades. El protocolo de backtesting queda listo
  en `04_modelos.py`.
- **Meta de control:** disparar alerta si el WAPE semanal observado supera 10 % en 4
  semanas consecutivas.

*Gráfico:* `outputs/graficos/fase8_pronostico.png` (histórico 90 días + pronóstico 30).
