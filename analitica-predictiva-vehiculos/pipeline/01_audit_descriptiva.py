"""
FASE 1 — Auditoría de calidad de datos
FASE 2 — Estadística descriptiva y análisis temporal / estacional
Genera tablas (CSV) y gráficos (PNG) + un informe de calidad en JSON.
"""
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from lib import cargar_data, construir_serie_diaria, OUT_TAB, OUT_FIG, DOW_ES

plt.rcParams.update({"figure.dpi": 110, "font.size": 10, "axes.grid": True,
                     "grid.alpha": 0.25, "axes.spines.top": False, "axes.spines.right": False})
AZUL, NAR, VER, ROJO = "#1f4e79", "#e07b39", "#2e8b57", "#c0392b"

df = cargar_data()
daily = construir_serie_diaria(df)

# ==========================================================================
# FASE 1 — AUDITORÍA
# ==========================================================================
audit = {}
audit["n_registros"] = int(len(df))
audit["n_columnas"] = int(df.shape[1])
audit["rango_fechas"] = [str(df["Fecha"].min().date()), str(df["Fecha"].max().date())]
audit["dias_calendario"] = int((df["Fecha"].max() - df["Fecha"].min()).days) + 1
audit["dias_con_operacion"] = int(df["Fecha"].dt.normalize().nunique())

# Nulos
audit["nulos_por_columna"] = {c: int(df[c].isnull().sum()) for c in df.columns
                              if df[c].isnull().sum() > 0}
audit["total_nulos"] = int(df.isnull().sum().sum())

# Duplicados
audit["filas_duplicadas_exactas"] = int(df.duplicated().sum())
dup_viaje = df[df.duplicated(subset=["No. Viaje"], keep=False)]
audit["ids_viaje_duplicados"] = int(df.duplicated(subset=["No. Viaje"]).sum())
audit["registros_con_id_repetido"] = int(len(dup_viaje))
# ¿los duplicados de ID son idénticos salvo la fecha?
if len(dup_viaje):
    cols_sin_fecha = [c for c in ["No. Viaje", "PLACA", "Ciudad Origen", "Ciudad Destino",
                                  "peso_ton", "CLIENTE"] ]
    same_but_date = dup_viaje.duplicated(subset=cols_sin_fecha, keep=False).sum()
    audit["dup_id_identicos_salvo_fecha"] = int(same_but_date)

# Consistencia de campos derivados
audit["inconsistencia_MES"] = int((df["MES"] != df["Fecha"].dt.month).sum())
audit["inconsistencia_ANIO"] = int((df["AÑO"] != df["Fecha"].dt.year).sum())

# Atípicos de peso (regla IQR y regla física)
q1, q3 = df["peso_ton"].quantile([.25, .75])
iqr = q3 - q1
lim_sup = q3 + 1.5 * iqr
audit["peso_outliers_IQR_sup"] = int((df["peso_ton"] > lim_sup).sum())
audit["peso_min"] = float(df["peso_ton"].min())
audit["peso_max"] = float(df["peso_ton"].max())
audit["peso_ceros"] = int((df["peso_ton"] == 0).sum())
audit["peso_negativos"] = int((df["peso_ton"] < 0).sum())
# Pesos improbables por tipología (una tractomula > 40 t o una camioneta > 5 t)
audit["camioneta_sobrepeso_>5t"] = int(((df["Tipología de camión"] == "CAMIONETA") & (df["peso_ton"] > 5)).sum())

# Anomalías logísticas
audit["origen_igual_destino"] = int((df["Ciudad Origen"] == df["Ciudad Destino"]).sum())
plate_fleet = df.groupby("PLACA")["Tipo Transportador"].nunique()
audit["placas_multi_flota"] = int((plate_fleet > 1).sum())

# Cardinalidad
audit["cardinalidad"] = {c: int(df[c].nunique()) for c in
                         ["CLIENTE", "Negocio", "PLACA", "corredor", "par_ciudades",
                          "Ciudad Origen", "Ciudad Destino", "Zona Origen", "Zona Destino",
                          "Tipología de camión", "Tipo Transportador", "Tipo Viaje"]}

with open(f"{OUT_TAB}/fase1_auditoria.json", "w") as fh:
    json.dump(audit, fh, indent=2, ensure_ascii=False)
print("=== FASE 1: AUDITORÍA ===")
print(json.dumps(audit, indent=2, ensure_ascii=False))

# ==========================================================================
# FASE 2 — ESTADÍSTICA DESCRIPTIVA
# ==========================================================================
def resumen(s: pd.Series) -> dict:
    s = s.dropna()
    moda = s.mode()
    return {
        "n": int(s.count()), "media": float(s.mean()), "mediana": float(s.median()),
        "moda": float(moda.iloc[0]) if len(moda) else np.nan,
        "std": float(s.std()), "cv_%": float(s.std() / s.mean() * 100) if s.mean() else np.nan,
        "min": float(s.min()), "p05": float(s.quantile(.05)), "p25": float(s.quantile(.25)),
        "p50": float(s.quantile(.50)), "p75": float(s.quantile(.75)),
        "p95": float(s.quantile(.95)), "max": float(s.max()),
    }

desc = {
    "peso_ton_global": resumen(df["peso_ton"]),
    "demanda_diaria_viajes": resumen(daily["viajes"]),
    "demanda_diaria_habiles": resumen(daily.loc[daily["habil"] == 1, "viajes"]),
    "toneladas_diarias": resumen(daily["toneladas"]),
}
pd.DataFrame(desc).T.to_csv(f"{OUT_TAB}/fase2_resumen_estadistico.csv")
print("\n=== FASE 2: RESUMEN ESTADÍSTICO ===")
print(pd.DataFrame(desc).T.round(2).to_string())

# Peso por tipología
peso_tipo = df.groupby("Tipología de camión")["peso_ton"].agg(
    ["count", "mean", "median", "std", "min", "max"]).round(2)
peso_tipo["cv_%"] = (peso_tipo["std"] / peso_tipo["mean"] * 100).round(1)
peso_tipo.to_csv(f"{OUT_TAB}/fase2_peso_por_tipologia.csv")
print("\n=== PESO POR TIPOLOGÍA ===")
print(peso_tipo.to_string())

# Perfil por día de la semana
dow_prof = daily.groupby("dia_semana")["viajes"].agg(["mean", "std", "sum"]).round(1)
orden = [DOW_ES[i] for i in range(7)]
dow_prof = dow_prof.reindex(orden)
dow_prof["indice_vs_prom"] = (dow_prof["mean"] / daily["viajes"].mean()).round(3)
dow_prof.to_csv(f"{OUT_TAB}/fase2_perfil_dia_semana.csv")
print("\n=== PERFIL DÍA DE LA SEMANA (viajes/día) ===")
print(dow_prof.to_string())

# Estacionalidad mensual
mens = df.groupby("Mes - Año").agg(viajes=("No. Viaje", "size"),
                                   toneladas=("peso_ton", "sum")).round(1)
mens.to_csv(f"{OUT_TAB}/fase2_serie_mensual.csv")
idx_mes = df.groupby("mes").size()
idx_mes = (idx_mes / idx_mes.mean()).round(3)
idx_mes.to_csv(f"{OUT_TAB}/fase2_indice_estacional_mes.csv", header=["indice"])
print("\n=== VIAJES POR MES-AÑO ===")
print(mens.to_string())

# Festivo vs hábil vs fin de semana
tipo_dia = daily.assign(
    tipo=np.where(daily["festivo"] == 1, "Festivo",
                  np.where(daily["fin_de_semana"] == 1, "Fin de semana", "Hábil"))
).groupby("tipo")["viajes"].agg(["count", "mean", "std"]).round(1)
tipo_dia.to_csv(f"{OUT_TAB}/fase2_tipo_dia.csv")
print("\n=== DEMANDA POR TIPO DE DÍA ===")
print(tipo_dia.to_string())

# Comportamiento por cliente (Negocio como unidad de negocio real)
cli = df.groupby("Negocio").agg(
    viajes=("No. Viaje", "size"), toneladas=("peso_ton", "sum"),
    ton_prom=("peso_ton", "mean"), corredores=("corredor", "nunique"),
    placas=("PLACA", "nunique")).round(1).sort_values("viajes", ascending=False)
cli["cv_ton"] = (df.groupby("Negocio")["peso_ton"].std() / df.groupby("Negocio")["peso_ton"].mean() * 100).round(1)
cli.to_csv(f"{OUT_TAB}/fase2_comportamiento_negocio.csv")
print("\n=== COMPORTAMIENTO POR NEGOCIO ===")
print(cli.to_string())

# ---------------- GRÁFICOS ----------------
# 1) Histograma de peso
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.hist(df["peso_ton"], bins=60, color=AZUL, alpha=.85)
ax.axvline(df["peso_ton"].median(), color=ROJO, ls="--", label=f"Mediana {df['peso_ton'].median():.1f} t")
ax.set(title="Distribución del peso cargado (ton)", xlabel="Toneladas", ylabel="Frecuencia")
ax.legend(); fig.tight_layout(); fig.savefig(f"{OUT_FIG}/fase2_hist_peso.png"); plt.close(fig)

# 2) Boxplot de peso por tipología
fig, ax = plt.subplots(figsize=(8, 4.2))
orden_tipo = df.groupby("Tipología de camión")["peso_ton"].median().sort_values().index
data = [df.loc[df["Tipología de camión"] == t, "peso_ton"].values for t in orden_tipo]
bp = ax.boxplot(data, tick_labels=orden_tipo, showfliers=False, patch_artist=True)
for p in bp["boxes"]:
    p.set_facecolor(AZUL); p.set_alpha(.6)
ax.set(title="Peso cargado por tipología de camión", ylabel="Toneladas")
plt.xticks(rotation=25, ha="right"); fig.tight_layout()
fig.savefig(f"{OUT_FIG}/fase2_box_peso_tipologia.png"); plt.close(fig)

# 3) Serie temporal de demanda diaria con media móvil 7 y 30
fig, ax = plt.subplots(figsize=(11, 4.2))
ax.plot(daily.index, daily["viajes"], color="#b0b7c3", lw=.8, label="Diario")
ax.plot(daily.index, daily["viajes"].rolling(7).mean(), color=AZUL, lw=1.8, label="Media móvil 7d")
ax.plot(daily.index, daily["viajes"].rolling(30).mean(), color=NAR, lw=2, label="Media móvil 30d")
ax.set(title="Demanda diaria de vehículos (viajes)", ylabel="Viajes/día")
ax.legend(ncol=3); fig.tight_layout(); fig.savefig(f"{OUT_FIG}/fase2_serie_diaria.png"); plt.close(fig)

# 4) Perfil día de semana
fig, ax = plt.subplots(figsize=(7.5, 4))
ax.bar(dow_prof.index, dow_prof["mean"], color=AZUL, alpha=.85, yerr=dow_prof["std"], capsize=3)
ax.set(title="Demanda promedio por día de la semana", ylabel="Viajes/día")
plt.xticks(rotation=20); fig.tight_layout(); fig.savefig(f"{OUT_FIG}/fase2_perfil_dow.png"); plt.close(fig)

# 5) Serie mensual
fig, ax = plt.subplots(figsize=(10, 4))
ax.bar(range(len(mens)), mens["viajes"], color=AZUL, alpha=.85)
ax.set_xticks(range(len(mens))); ax.set_xticklabels(mens.index, rotation=45, ha="right")
ax.set(title="Viajes por mes", ylabel="Viajes")
z = np.polyfit(range(len(mens)), mens["viajes"], 1)
ax.plot(range(len(mens)), np.poly1d(z)(range(len(mens))), color=ROJO, ls="--", label=f"Tendencia ({z[0]:+.0f}/mes)")
ax.legend(); fig.tight_layout(); fig.savefig(f"{OUT_FIG}/fase2_serie_mensual.png"); plt.close(fig)

print("\n[OK] Fase 1-2 completadas. Tablas y gráficos guardados.")
