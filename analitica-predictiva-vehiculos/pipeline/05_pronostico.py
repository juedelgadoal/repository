"""
FASE 8 — Pronósticos (1, 3, 7, 15, 30 días) con el modelo seleccionado
         (Regresión Múltiple / OLS). Descompone la demanda total en flota,
         tipología, zona, corredor y cliente con participaciones recientes.
FASE 9 — Recomendaciones automáticas soportadas estadísticamente.

Además exporta los COEFICIENTES del modelo para incrustarlos en Excel/VBA.
"""
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from lib import cargar_data, construir_serie_diaria, metricas, OUT_TAB, OUT_FIG, FESTIVOS, DOW_ES

plt.rcParams.update({"figure.dpi": 110, "font.size": 9, "axes.grid": True, "grid.alpha": .25})
AZUL, NAR, ROJO, VER = "#1f4e79", "#e07b39", "#c0392b", "#2e8b57"

df = cargar_data()
daily = construir_serie_diaria(df)
for k in range(7):
    daily[f"dow_{k}"] = (daily["dow"] == k).astype(int)
daily["post_festivo"] = daily["festivo"].shift(1).fillna(0).astype(int)
daily["pre_festivo"] = daily["festivo"].shift(-1).fillna(0).astype(int)
d = daily.dropna(subset=["lag28", "roll30_mean"]).copy()

FEATS = [f"dow_{k}" for k in range(7)] + ["mes", "trimestre", "festivo", "post_festivo",
         "pre_festivo", "fin_de_mes", "inicio_de_mes", "t", "lag7", "lag14", "lag21",
         "lag28", "roll7_mean", "roll14_mean", "roll30_mean", "sin365", "cos365"]

# ---- Ajuste final del modelo diario sobre TODO el histórico ----
model = LinearRegression().fit(d[FEATS].values, d["viajes"].values)
insample = np.clip(model.predict(d[FEATS].values), 0, None)
m_in = metricas(d["viajes"].values, insample)
# rendimiento en días operativos (excluye domingos y festivos)
op = d[d["habil"] == 1]
m_op = metricas(op["viajes"].values, np.clip(model.predict(op[FEATS].values), 0, None))
print("=== MODELO DIARIO (OLS) — ajuste ===")
print("Global :", {k: round(v, 2) for k, v in m_in.items()})
print("Hábiles:", {k: round(v, 2) for k, v in m_op.items()})

# Coeficientes -> para Excel/VBA
coef = pd.Series(model.coef_, index=FEATS)
coef["(intercepto)"] = model.intercept_
coef.round(4).to_csv(f"{OUT_TAB}/fase8_coeficientes_OLS_diario.csv", header=["coeficiente"])

# ---- Pronóstico recursivo diario a 30 días ----
def features_dia(fecha, serie):
    dow = fecha.dayofweek
    row = {f"dow_{k}": int(dow == k) for k in range(7)}
    row["mes"] = fecha.month; row["trimestre"] = fecha.quarter
    row["festivo"] = int(fecha.date() in FESTIVOS)
    row["post_festivo"] = int((fecha - pd.Timedelta(days=1)).date() in FESTIVOS)
    row["pre_festivo"] = int((fecha + pd.Timedelta(days=1)).date() in FESTIVOS)
    dim = fecha.days_in_month
    row["fin_de_mes"] = int(fecha.day >= dim - 2); row["inicio_de_mes"] = int(fecha.day <= 3)
    row["t"] = (fecha - d.index[0]).days
    hist = serie
    row["lag7"] = hist.get(fecha - pd.Timedelta(days=7), hist.iloc[-1])
    row["lag14"] = hist.get(fecha - pd.Timedelta(days=14), hist.iloc[-1])
    row["lag21"] = hist.get(fecha - pd.Timedelta(days=21), hist.iloc[-1])
    row["lag28"] = hist.get(fecha - pd.Timedelta(days=28), hist.iloc[-1])
    last7 = serie.loc[fecha - pd.Timedelta(days=13): fecha - pd.Timedelta(days=7)]
    row["roll7_mean"] = last7.mean() if len(last7) else hist.iloc[-1]
    last14 = serie.loc[fecha - pd.Timedelta(days=20): fecha - pd.Timedelta(days=7)]
    row["roll14_mean"] = last14.mean() if len(last14) else hist.iloc[-1]
    last30 = serie.loc[fecha - pd.Timedelta(days=36): fecha - pd.Timedelta(days=7)]
    row["roll30_mean"] = last30.mean() if len(last30) else hist.iloc[-1]
    row["sin365"] = np.sin(2*np.pi*fecha.dayofyear/365.25)
    row["cos365"] = np.cos(2*np.pi*fecha.dayofyear/365.25)
    return np.array([row[f] for f in FEATS], float)

serie = daily["viajes"].copy()
ultimo = serie.index.max()
horizonte = 30
fut_idx = pd.date_range(ultimo + pd.Timedelta(days=1), periods=horizonte, freq="D")
fpred = []
for fecha in fut_idx:
    x = features_dia(fecha, serie).reshape(1, -1)
    yhat = float(np.clip(model.predict(x)[0], 0, None))
    serie.loc[fecha] = yhat
    fpred.append(yhat)
fc = pd.DataFrame({"fecha": fut_idx, "viajes_pred": np.round(fpred, 0)})
fc["dia_semana"] = fc["fecha"].dt.dayofweek.map(DOW_ES)
fc["festivo"] = fc["fecha"].dt.date.map(lambda x: int(x in FESTIVOS))

# toneladas: viajes * ton/viaje reciente (últimas 8 semanas)
ton_por_viaje = df[df["Fecha"] >= ultimo - pd.Timedelta(days=56)]["peso_ton"].mean()
fc["toneladas_pred"] = (fc["viajes_pred"] * ton_por_viaje).round(0)

# ---- Participaciones recientes (últimas 8 semanas) para descomposición ----
rec = df[df["Fecha"] >= ultimo - pd.Timedelta(days=56)]
def shares(col):
    s = rec[col].value_counts(normalize=True)
    return s
sh_flota = shares("Tipo Transportador")
sh_tipo = shares("Tipología de camión")
sh_zona = shares("Zona Destino")
sh_neg = shares("Negocio")
sh_cor = rec["corredor"].value_counts(normalize=True)

# ---- Resúmenes por horizonte 1/3/7/15/30 ----
horizontes = {"1 día": 1, "3 días": 3, "7 días": 7, "15 días": 15, "30 días": 30}
tabla_h = []
for nombre, hh in horizontes.items():
    v = fc["viajes_pred"].iloc[:hh].sum()
    t = fc["toneladas_pred"].iloc[:hh].sum()
    tabla_h.append({
        "horizonte": nombre, "dias": hh,
        "vehiculos_totales": int(v), "toneladas": int(t),
        "veh_dia_prom": round(v / hh, 1),
        "veh_propia": int(v * sh_flota.get("Flota Propia", 0)),
        "veh_empresas": int(v * sh_flota.get("Empresas", 0)),
        "veh_terceros": int(v * sh_flota.get("Terceros", 0)),
        "veh_tractomula": int(v * sh_tipo.get("TRACTOMULA", 0)),
        "veh_sencillo": int(v * sh_tipo.get("SENCILLO", 0)),
        "veh_turbo": int(v * sh_tipo.get("TURBO", 0)),
        "veh_dobletroque": int(v * sh_tipo.get("DOBLETROQUE", 0)),
    })
tabla_h = pd.DataFrame(tabla_h)
tabla_h.to_csv(f"{OUT_TAB}/fase8_pronostico_horizontes.csv", index=False)
fc.to_csv(f"{OUT_TAB}/fase8_pronostico_diario_30d.csv", index=False)
print("\n=== PRONÓSTICO POR HORIZONTE ===")
print(tabla_h.to_string(index=False))

# Descomposición del horizonte de 7 días por corredor/zona/cliente
v7 = fc["viajes_pred"].iloc[:7].sum()
desc7 = pd.DataFrame({
    "corredor_top10": (sh_cor.head(10) * v7).round(0),
})
(sh_cor.head(15) * v7).round(0).to_csv(f"{OUT_TAB}/fase8_pronostico7_por_corredor.csv", header=["veh_7d"])
(sh_zona * v7).round(0).to_csv(f"{OUT_TAB}/fase8_pronostico7_por_zona.csv", header=["veh_7d"])
(sh_neg * v7).round(0).to_csv(f"{OUT_TAB}/fase8_pronostico7_por_cliente.csv", header=["veh_7d"])

# ---- Gráfico: histórico + pronóstico ----
fig, ax = plt.subplots(figsize=(11, 4.2))
hist_plot = daily["viajes"].iloc[-90:]
ax.plot(hist_plot.index, hist_plot.values, color=AZUL, lw=1.2, label="Histórico (90d)")
ax.plot(fc["fecha"], fc["viajes_pred"], color=ROJO, lw=2, marker="o", ms=3, label="Pronóstico 30d")
ax.axvline(ultimo, color="gray", ls="--", lw=.8)
ax.set(title="Demanda de vehículos: histórico reciente y pronóstico a 30 días", ylabel="Viajes/día")
ax.legend(); fig.tight_layout(); fig.savefig(f"{OUT_FIG}/fase8_pronostico.png"); plt.close(fig)

# =====================================================================
# FASE 9 — RECOMENDACIONES
# =====================================================================
# Nivel de servicio: reservar demanda + colchón (percentil 85 del error semanal)
res_w = pd.read_csv(f"{OUT_TAB}/fase7_comparacion_SEMANAL.csv", index_col=0)
wape_w = res_w["WAPE"].min() / 100
veh_prox_sem = int(fc["viajes_pred"].iloc[:7].sum())
colchon = 1.28 * wape_w   # z(0.90) * error relativo -> reserva con 90% de servicio
reserva = int(round(veh_prox_sem * (1 + colchon)))
prop_propia = sh_flota.get("Flota Propia", 0) + sh_flota.get("Empresas", 0)
capacidad_propia_sem = int(df[df["flota_propia_amplia"] == 1].groupby(
    df["Fecha"].dt.isocalendar().week).size().tail(12).mean())

recs = []
recs.append(f"Reservar ~{reserva:,} vehículos para la próxima semana "
            f"(demanda esperada {veh_prox_sem:,} + colchón {colchon*100:.0f}% para 90% de nivel de servicio).")
recs.append(f"Usar la flota propia+afiliada al máximo: capacidad reciente ~{capacidad_propia_sem:,} viajes/sem "
            f"({prop_propia*100:.0f}% de la demanda); contratar terceros para el resto "
            f"(~{max(0, veh_prox_sem - capacidad_propia_sem):,} viajes).")
# corredores críticos y de riesgo de retorno vacío
cor_crit = pd.read_csv(f"{OUT_TAB}/fase5_corredores_criticos.csv", index_col=0).head(5)
recs.append("Anticipar capacidad en corredores críticos (alta demanda + variabilidad): "
            + "; ".join(cor_crit.index[:5]) + ".")
vac = pd.read_csv(f"{OUT_TAB}/fase6_rutas_retorno_vacio.csv").head(5)
recs.append("Buscar carga de compensación (backhaul) en las rutas con mayor retorno vacío: "
            + "; ".join((vac["Ciudad Origen"] + "→" + vac["Ciudad Destino"]).tolist()) + ".")
cli = pd.read_csv(f"{OUT_TAB}/fase5_clientes.csv", index_col=0)
top_cli = cli.head(3).index.tolist()
recs.append(f"Exigir programación con 7 días de anticipación a los clientes de mayor volumen "
            f"({', '.join(top_cli)}), que concentran {cli.head(3)['part_viajes_%'].sum():.0f}% de la demanda.")
recs.append("Alertar por capacidad cuando la demanda semanal pronosticada supere en >10% la "
            "capacidad comprometida de flota propia+terceros habituales.")

with open(f"{OUT_TAB}/fase9_recomendaciones.json", "w") as fh:
    json.dump({"reserva_proxima_semana": reserva, "demanda_esperada_7d": veh_prox_sem,
               "colchon_%": round(colchon*100, 1), "capacidad_propia_sem": capacidad_propia_sem,
               "recomendaciones": recs}, fh, indent=2, ensure_ascii=False)
print("\n=== FASE 9: RECOMENDACIONES ===")
for i, r in enumerate(recs, 1):
    print(f"{i}. {r}")

print("\n[OK] Fases 8-9 completadas.")
