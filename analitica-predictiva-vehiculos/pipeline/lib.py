"""
Librería compartida del pipeline predictivo de planeación de vehículos — DIC / Corona.
Carga, valida y enriquece la base histórica. Todas las fases la reutilizan.

Autor: Equipo Analítica Predictiva
Compatibilidad: Python 3.11+, pandas 2/3, numpy 2
"""
from __future__ import annotations
import os
import numpy as np
import pandas as pd

# ----------------------------------------------------------------------------
# Rutas
# ----------------------------------------------------------------------------
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE, "_data")
OUT_TAB = os.path.join(BASE, "outputs", "tablas")
OUT_FIG = os.path.join(BASE, "outputs", "graficos")
F_MAIN = os.path.join(DATA_DIR, "Data_depurada_final.xlsx")
F_RUTAS = os.path.join(DATA_DIR, "Analisis_7_Rutas.xlsx")

for d in (OUT_TAB, OUT_FIG):
    os.makedirs(d, exist_ok=True)

# ----------------------------------------------------------------------------
# Festivos de Colombia (Ley Emiliani) 2025-2026 — se calculan sin dependencias
# externas para que el pipeline sea reproducible aun sin el paquete `holidays`.
# ----------------------------------------------------------------------------
def _festivos_colombia() -> set:
    try:
        import holidays
        h = holidays.Colombia(years=[2024, 2025, 2026, 2027])
        return set(pd.to_datetime(list(h.keys())).date)
    except Exception:
        # Respaldo estático (fechas oficiales 2025-2026)
        fechas = [
            # 2025
            "2025-01-01", "2025-01-06", "2025-03-24", "2025-04-17", "2025-04-18",
            "2025-05-01", "2025-06-02", "2025-06-23", "2025-06-30", "2025-07-20",
            "2025-08-07", "2025-08-18", "2025-10-13", "2025-11-03", "2025-11-17",
            "2025-12-08", "2025-12-25",
            # 2026
            "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
            "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29",
            "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02",
            "2026-11-16", "2026-12-08", "2026-12-25",
        ]
        return set(pd.to_datetime(fechas).date)

FESTIVOS = _festivos_colombia()

DOW_ES = {0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves",
          4: "Viernes", 5: "Sábado", 6: "Domingo"}


# ----------------------------------------------------------------------------
# Carga y enriquecimiento a nivel registro (viaje)
# ----------------------------------------------------------------------------
def cargar_data() -> pd.DataFrame:
    """Carga la hoja 'Data' y enriquece con variables de calendario y logística."""
    df = pd.read_excel(F_MAIN, sheet_name="Data")
    df["Fecha"] = pd.to_datetime(df["Fecha"])

    # Normalización de texto
    for c in ["Ciudad Origen", "Ciudad Destino"]:
        df[c] = df[c].astype(str).str.strip().str.upper()

    # ---- Variables de calendario (Fase 4) ----
    f = df["Fecha"]
    df["dow"] = f.dt.dayofweek
    df["dia_semana"] = df["dow"].map(DOW_ES)
    df["semana_iso"] = f.dt.isocalendar().week.astype(int)
    df["mes"] = f.dt.month
    df["trimestre"] = f.dt.quarter
    df["anio"] = f.dt.year
    df["dia_mes"] = f.dt.day
    df["dia_anio"] = f.dt.dayofyear
    dim = f.dt.days_in_month
    df["fin_de_mes"] = (df["dia_mes"] >= (dim - 2)).astype(int)
    df["inicio_de_mes"] = (df["dia_mes"] <= 3).astype(int)
    df["fin_de_semana"] = (df["dow"] >= 5).astype(int)
    df["festivo"] = f.dt.date.map(lambda d: 1 if d in FESTIVOS else 0)
    df["habil"] = ((df["fin_de_semana"] == 0) & (df["festivo"] == 0)).astype(int)

    # ---- Variables logísticas (Fase 4) ----
    df["corredor"] = df["Ciudad Origen"] + " -> " + df["Ciudad Destino"]
    # Par no dirigido (para balance de flujos / retornos vacíos)
    a = np.where(df["Ciudad Origen"] <= df["Ciudad Destino"],
                 df["Ciudad Origen"], df["Ciudad Destino"])
    b = np.where(df["Ciudad Origen"] <= df["Ciudad Destino"],
                 df["Ciudad Destino"], df["Ciudad Origen"])
    df["par_ciudades"] = pd.Series(a, index=df.index) + " <-> " + pd.Series(b, index=df.index)
    df["intraurbano_mismo"] = (df["Ciudad Origen"] == df["Ciudad Destino"]).astype(int)

    # Flota propia ampliada (Propia + Empresas afiliadas) vs Terceros
    df["flota_propia_amplia"] = df["Tipo Transportador"].isin(
        ["Flota Propia", "Empresas"]).astype(int)
    df["es_propia_estricta"] = (df["Tipo Transportador"] == "Flota Propia").astype(int)
    df["es_terceros"] = (df["Tipo Transportador"] == "Terceros").astype(int)

    df = df.rename(columns={"PESO CARGADO (ton)": "peso_ton"})
    return df


# ----------------------------------------------------------------------------
# Serie diaria agregada (target de demanda de vehículos) + features
# ----------------------------------------------------------------------------
def construir_serie_diaria(df: pd.DataFrame) -> pd.DataFrame:
    """Agrega a nivel día: demanda de vehículos (viajes) y toneladas + features."""
    g = df.groupby(df["Fecha"].dt.normalize())
    daily = pd.DataFrame({
        "viajes": g.size(),
        "toneladas": g["peso_ton"].sum(),
        "ton_prom": g["peso_ton"].mean(),
        "viajes_propia": g["es_propia_estricta"].sum(),
        "viajes_propia_amplia": g["flota_propia_amplia"].sum(),
        "viajes_terceros": g["es_terceros"].sum(),
        "placas_activas": g["PLACA"].nunique(),
        "clientes_activos": g["CLIENTE"].nunique(),
        "corredores_activos": g["corredor"].nunique(),
    })
    # Índice diario continuo (rellena días faltantes con 0)
    idx = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    daily = daily.reindex(idx).fillna(0)
    daily.index.name = "Fecha"

    # Features de calendario
    f = daily.index
    daily["dow"] = f.dayofweek
    daily["dia_semana"] = daily["dow"].map(DOW_ES)
    daily["semana_iso"] = f.isocalendar().week.astype(int)
    daily["mes"] = f.month
    daily["trimestre"] = f.quarter
    daily["anio"] = f.year
    daily["dia_mes"] = f.day
    daily["dia_anio"] = f.dayofyear
    dim = f.days_in_month
    daily["fin_de_mes"] = (daily["dia_mes"] >= (dim - 2)).astype(int)
    daily["inicio_de_mes"] = (daily["dia_mes"] <= 3).astype(int)
    daily["fin_de_semana"] = (daily["dow"] >= 5).astype(int)
    daily["festivo"] = pd.Series(f.date, index=daily.index).map(
        lambda d: 1 if d in FESTIVOS else 0)
    daily["habil"] = ((daily["fin_de_semana"] == 0) & (daily["festivo"] == 0)).astype(int)

    # Términos de Fourier (estacionalidad semanal y anual suave)
    daily["sin7"] = np.sin(2 * np.pi * daily["dow"] / 7)
    daily["cos7"] = np.cos(2 * np.pi * daily["dow"] / 7)
    daily["sin365"] = np.sin(2 * np.pi * daily["dia_anio"] / 365.25)
    daily["cos365"] = np.cos(2 * np.pi * daily["dia_anio"] / 365.25)
    daily["t"] = np.arange(len(daily))  # tendencia lineal

    # Rezagos y medias móviles (seguros para pronóstico a >=7 días)
    for L in (7, 14, 21, 28):
        daily[f"lag{L}"] = daily["viajes"].shift(L)
    for W in (7, 14, 30):
        daily[f"roll{W}_mean"] = daily["viajes"].shift(7).rolling(W).mean()
        daily[f"roll{W}_std"] = daily["viajes"].shift(7).rolling(W).std()
    return daily


def construir_serie_semanal(daily: pd.DataFrame) -> pd.DataFrame:
    """Serie semanal (ISO) — la unidad práctica para planeación a 7 días."""
    w = daily.resample("W-MON", label="left", closed="left").agg(
        viajes=("viajes", "sum"),
        toneladas=("toneladas", "sum"),
        viajes_propia=("viajes_propia", "sum"),
        viajes_terceros=("viajes_terceros", "sum"),
        dias_habiles=("habil", "sum"),
        festivos=("festivo", "sum"),
    )
    return w


# ----------------------------------------------------------------------------
# Métricas de evaluación
# ----------------------------------------------------------------------------
def metricas(y_true, y_pred, eps=1e-9):
    y_true = np.asarray(y_true, float)
    y_pred = np.asarray(y_pred, float)
    err = y_true - y_pred
    mae = np.mean(np.abs(err))
    rmse = np.sqrt(np.mean(err ** 2))
    # MAPE solo sobre días con demanda > 0
    mask = y_true > 0
    mape = np.mean(np.abs(err[mask]) / y_true[mask]) * 100 if mask.any() else np.nan
    # WAPE (error absoluto ponderado) — robusto para demanda con calendario
    wape = np.sum(np.abs(err)) / (np.sum(np.abs(y_true)) + eps) * 100
    ss_res = np.sum(err ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2) + eps
    r2 = 1 - ss_res / ss_tot
    return {"MAE": mae, "RMSE": rmse, "MAPE": mape, "WAPE": wape, "R2": r2}


if __name__ == "__main__":
    d = cargar_data()
    print("Registros:", len(d), "| Columnas:", d.shape[1])
    daily = construir_serie_diaria(d)
    print("Serie diaria:", daily.shape, "| Rango:", daily.index.min().date(), "->", daily.index.max().date())
    print("Festivos cargados:", len(FESTIVOS))
