# Informe Ejecutivo
### Modelo predictivo para la planeación de vehículos — Operación logística DIC

**Periodo analizado:** 2 de enero de 2025 a 30 de junio de 2026 (18 meses)
**Volumen:** 131.976 viajes · 5.385 placas · 14 unidades de negocio · 1.752 corredores
**Elaborado por:** Equipo de Analítica Predictiva (Ciencia de Datos, Estadística, Ingeniería Industrial, Investigación de Operaciones, Supply Chain, Machine Learning)

---

## 1. El problema y su tamaño

La operación asigna vehículos de forma **reactiva**: se consiguen el mismo día o un
día antes. Esto encarece el flete, reduce la disponibilidad, impide negociar y
desaprovecha la flota propia. El insumo para corregirlo ya existe: **la demanda es
altamente predecible**. La demanda en días hábiles tiene un coeficiente de
variación de apenas **20,7 %** (299 vehículos/día en promedio), frente al 47,6 %
que aparece cuando se mezclan domingos y festivos. Es decir, casi toda la
"aleatoriedad" percibida es en realidad **calendario**, y el calendario se conoce
con meses de anticipación.

## 2. Qué se construyó

Una herramienta de rápida adopción en **Excel 2016** (tablero + macro VBA de un solo
botón) respaldada por un modelo estadístico validado, que pronostica con **7 días de
anticipación**:

- vehículos requeridos por día, semana y mes;
- toneladas;
- reparto por tipo de flota (propia / afiliada / terceros);
- reparto por tipología de camión, zona, corredor y cliente;
- alertas automáticas cuando la demanda esperada supera la capacidad en más de 10 %.

## 3. Resultados que la gerencia debe conocer

| Hallazgo | Cifra | Implicación para la decisión |
|---|---|---|
| **Precisión del pronóstico semanal** | WAPE **7,4 %** (meta ≤ 10 %) | Se puede **reservar capacidad con una semana de anticipación** con confianza. |
| **Concentración de clientes** | 3 negocios = **68 %** de la demanda | Basta alinear la programación de **Revestimiento, Porcelana Sanitaria y Sumicol** para planear casi toda la operación. |
| **Dependencia de terceros** | **79 %** de los viajes | Alta exposición a tarifa spot; la flota propia (75 placas) mueve solo 8,8 %. |
| **Retornos vacíos** | **21 %–76 %** de los viajes | Desbalance estructural planta→ciudad; principal palanca de ahorro. |
| **Costo de retornos vacíos** | **~$42.700 M COP/año** (est.) | Cada punto de reducción vale ~$425 M COP/año. |
| **Estacionalidad semanal** | Domingo = 0,16× del promedio; martes = 1,31× | El pico es martes-miércoles; lunes cae por los "puentes" festivos. |

## 4. El modelo seleccionado y por qué

Se compararon **nueve** familias de modelos (Regresión Lineal y Múltiple, Árbol de
Decisión, Random Forest, Gradient Boosting, XGBoost, Prophet, ARIMA y SARIMA) con un
protocolo de **backtesting de origen rodante** libre de fuga de información. Ganó la
**Regresión Múltiple (OLS)**: mejor error en el horizonte semanal (WAPE 7,4 %, R²
0,83) y en el diario (WAPE 12,2 %, R² 0,89), superando a los modelos de árboles y a
los de series de tiempo clásicas.

La elección no es solo estadística: el OLS es **interpretable, estable con historia
corta y se traduce en coeficientes que se incrustan directamente en Excel/VBA**, lo
que hace la herramienta transparente y de adopción inmediata sin depender de librerías
externas. Los modelos univariados (ARIMA/SARIMA) fallaron porque no incorporan el
calendario de festivos ni el conteo de días hábiles, que explican la mayor parte de
la varianza.

## 5. Recomendaciones prioritarias (detalle en informe 05)

1. **Reservar ~2.000 vehículos para la próxima semana** (demanda esperada 1.831 +
   colchón del 9 % para 90 % de nivel de servicio) en lugar de conseguirlos día a día.
2. **Saturar primero la flota propia y afiliada** (~21 % de capacidad) y contratar
   terceros para el excedente con anticipación, ganando poder de negociación.
3. **Atacar los retornos vacíos** activando carga de compensación (backhaul) en los
   corredores planta→ciudad de mayor desbalance (Madrid→Bogotá, Sopó→Bogotá,
   Sabaneta→Medellín, Soacha→Bogotá, Yumbo→Cali).
4. **Exigir programación a 7 días** a los tres clientes que concentran el 68 % de la
   demanda.
5. **Operar por semáforo de capacidad**: alerta automática cuando el pronóstico supere
   la capacidad comprometida en más del 10 %.

## 6. Impacto esperado

Pasar de reactivo a predictivo permite tres ahorros medibles: (a) menor tarifa por
reservar con antelación en lugar de spot; (b) mejor utilización de la flota propia,
hoy en 8,8 % de participación; y (c) reducción del deadhead, cuya sola mitigación de
5 puntos porcentuales representa del orden de **$2.100 millones COP/año**. La
herramienta entregada convierte estos hallazgos en una rutina semanal ejecutable con
un botón.

---
*Cifras de costo y retorno vacío son estimaciones basadas en reglas estadísticas y
tarifas tipo SICETAC (editables). La base original no contiene flete, costo ni
indicador de retorno vacío; ver nota metodológica en cada informe.*
