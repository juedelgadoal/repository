# Modelo Predictivo para la Planeación de Vehículos — Operación Logística DIC

Herramienta analítica que transforma la asignación **reactiva** de vehículos (se
consiguen el mismo día o un día antes) en una operación **predictiva** con 7 días
de anticipación, a partir de 18 meses de historia (131.976 viajes, ene-2025 a
jun-2026).

> **Resultado principal:** el modelo seleccionado (**Regresión Múltiple / OLS**)
> pronostica la demanda semanal de vehículos con un error **WAPE de 7,4 %**, por
> debajo de la meta del 10 %. El desbalance de flujos (retornos vacíos) se estima
> entre **21 % y 76 %** de los viajes, con un costo de oportunidad de
> **~$42.700 millones COP/año** (estimación editable con tarifas SICETAC).

## Estructura del entregable

```
analitica-predictiva-vehiculos/
├── README.md                     Este índice
├── pipeline/                     Código Python reproducible (Fases 1-9)
│   ├── lib.py                    Carga + enriquecimiento + métricas
│   ├── geo_tarifas.py           Distancias y costo tipo SICETAC (editable)
│   ├── 01_audit_descriptiva.py  Fase 1-2
│   ├── 02_correlaciones.py      Fase 3
│   ├── 03_logistica_retornos.py Fase 4-6
│   ├── 04_modelos.py            Fase 7 (backtest 9 modelos)
│   ├── 05_pronostico.py         Fase 8-9
│   └── 06_consolida.py          KPIs para el dashboard
├── outputs/
│   ├── tablas/                  ~40 CSV/JSON con todos los resultados
│   └── graficos/                11 gráficos (PNG)
├── informes/                     Los entregables solicitados (Markdown)
│   ├── 00_RESUMEN_EJECUTIVO.md
│   ├── 01_INFORME_ESTADISTICO.md
│   ├── 02_INFORME_CORRELACIONES.md
│   ├── 03_ANALISIS_LOGISTICO_RETORNOS.md
│   ├── 04_MODELO_PREDICTIVO.md
│   ├── 05_RECOMENDACIONES_ESTRATEGICAS.md
│   ├── 06_MANUAL_USUARIO.md
│   ├── 07_INSTRUCTIVO_ALIMENTACION.md        Cómo alimentar la macro (paso a paso)
│   └── Instructivo_Alimentacion_Macro.pdf    Versión imprimible del instructivo
└── dashboard/
    ├── Dashboard_Planeacion_Vehiculos.xlsx   Tablero Excel 2016
    ├── Plantilla_Carga_DATA.xlsx             Plantilla para alimentar la macro
    ├── build_dashboard.py                    Constructor del tablero
    ├── build_plantilla.py                    Constructor de la plantilla
    ├── build_instructivo_pdf.py              Genera el PDF del instructivo
    └── vba/                                   Macro profesional (7 módulos .bas)
```

## Cómo reproducir el análisis

```bash
cd pipeline
pip install pandas numpy openpyxl scikit-learn scipy statsmodels xgboost prophet holidays matplotlib
python3 01_audit_descriptiva.py
python3 02_correlaciones.py
python3 03_logistica_retornos.py
python3 04_modelos.py
python3 05_pronostico.py
python3 06_consolida.py
python3 ../dashboard/build_dashboard.py
```

> Las dos bases originales (`Data_depurada_final.xlsx` y `Analisis_7_Rutas.xlsx`)
> se colocan en `_data/` (no versionada por contener datos operativos).

## Los 10 entregables (mapa)

| # | Entregable solicitado | Ubicación |
|---|---|---|
| 1 | Informe ejecutivo | `informes/00_RESUMEN_EJECUTIVO.md` |
| 2 | Informe estadístico completo | `informes/01_INFORME_ESTADISTICO.md` |
| 3 | Informe de correlaciones | `informes/02_INFORME_CORRELACIONES.md` |
| 4 | Variables más influyentes | `informes/02_INFORME_CORRELACIONES.md` (§4) |
| 5 | Modelo predictivo seleccionado | `informes/04_MODELO_PREDICTIVO.md` |
| 6 | Justificación técnica | `informes/04_MODELO_PREDICTIVO.md` (§3-5) |
| 7 | Dashboard propuesto | `dashboard/Dashboard_Planeacion_Vehiculos.xlsx` |
| 8 | Código VBA documentado | `dashboard/vba/*.bas` |
| 9 | Manual de usuario | `informes/06_MANUAL_USUARIO.md` |
| 10 | Recomendaciones estratégicas | `informes/05_RECOMENDACIONES_ESTRATEGICAS.md` |

## Advertencia sobre estimaciones

La base **no contiene** valor de flete, costo de viaje, retorno vacío ni tiempos.
Estas variables se **infieren** con reglas estadísticas y un modelo de tarifas tipo
SICETAC (parámetros editables en `dashboard` → hoja *Parámetros* y en
`pipeline/geo_tarifas.py`). Toda cifra de costo debe leerse como **estimación de
orden de magnitud** hasta cargar las tarifas oficiales del SICETAC por
origen-destino-configuración.
