"""
FASE 4 — Ingeniería de variables (frecuencias, demanda acumulada/móvil, utilización)
FASE 5 — Análisis logístico (clientes, placas, flota, corredores)
FASE 6 — Retornos vacíos (desbalance direccional + costo estimado SICETAC)
"""
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from lib import cargar_data, OUT_TAB, OUT_FIG
from geo_tarifas import distancia_km, costo_flete

plt.rcParams.update({"figure.dpi": 110, "font.size": 9, "axes.grid": True, "grid.alpha": .25})
AZUL, NAR, ROJO, VER = "#1f4e79", "#e07b39", "#c0392b", "#2e8b57"

df = cargar_data()
N = len(df)

# ==========================================================================
# FASE 4 — INGENIERÍA DE VARIABLES (frecuencias y utilización)
# ==========================================================================
# Frecuencias
df["frec_cliente"] = df.groupby("CLIENTE")["No. Viaje"].transform("size")
df["frec_corredor"] = df.groupby("corredor")["No. Viaje"].transform("size")
df["frec_placa"] = df.groupby("PLACA")["No. Viaje"].transform("size")

# Toneladas por vehículo ya es peso_ton; peso promedio por corredor
df["peso_prom_corredor"] = df.groupby("corredor")["peso_ton"].transform("mean")

# "Pedido" = (Fecha, CLIENTE, corredor); vehículos por pedido
ped = df.groupby(["Fecha", "CLIENTE", "corredor"]).size().rename("veh_por_pedido")
df = df.merge(ped, on=["Fecha", "CLIENTE", "corredor"], how="left")

feat_just = pd.DataFrame([
    ("dia_semana / dow", "Captura la estacionalidad semanal (Domingo≈0.16x, Martes≈1.31x del promedio). Spearman vs demanda -0.48."),
    ("festivo", "Los 26 festivos promedian 25 viajes/día vs 299 hábiles. Reduce la demanda ~91%."),
    ("habil", "Variable exógena con mayor correlación con la demanda (Pearson 0.70)."),
    ("fin_de_semana", "Sábado opera pero Domingo casi no. Pearson -0.54 con la demanda."),
    ("semana_iso / mes / trimestre", "Estacionalidad de mediano plazo; base de la agregación semanal de planeación."),
    ("fin_de_mes / inicio_de_mes", "Picos de cierre comercial; fin_de_mes Spearman +0.16."),
    ("lag7, lag14, lag21, lag28", "Autocorrelación semanal (lag14 Pearson 0.59). Predictores utilizables a 7+ días."),
    ("roll7/14/30_mean", "Nivel reciente de demanda; suaviza ruido diario. Base del pronóstico."),
    ("sin7/cos7, sin365/cos365", "Términos de Fourier: estacionalidad continua sin explosión de dummies."),
    ("frec_cliente/corredor/placa", "Intensidad estructural de cada entidad; segmenta demanda estable vs esporádica."),
    ("veh_por_pedido", "Vehículos por (fecha, cliente, corredor): tamaño de despacho; dimensiona lotes."),
    ("peso_prom_corredor", "Determina la tipología requerida por corredor (eta tipología->peso = 0.895)."),
    ("indice_utilizacion_placa", "Viajes/mes por placa vs capacidad teórica; mide ociosidad de flota propia."),
], columns=["variable_derivada", "justificacion_estadistica"])
feat_just.to_csv(f"{OUT_TAB}/fase4_justificacion_variables.csv", index=False)
print("=== FASE 4: VARIABLES DERIVADAS (justificación) ===")
print(feat_just.to_string(index=False))

# ==========================================================================
# FASE 5 — ANÁLISIS LOGÍSTICO
# ==========================================================================
# ---- Clientes (Negocio) ----
cli = df.groupby("Negocio").agg(
    viajes=("No. Viaje", "size"), toneladas=("peso_ton", "sum"),
    ton_prom=("peso_ton", "mean"), corredores=("corredor", "nunique")).round(1)
cli["part_viajes_%"] = (cli["viajes"] / N * 100).round(1)
cli = cli.sort_values("viajes", ascending=False)
cli.to_csv(f"{OUT_TAB}/fase5_clientes.csv")
print("\n=== TOP CLIENTES (Negocio) POR DEMANDA ===")
print(cli.head(10).to_string())

# ---- Placas / utilización ----
dias_op = (df["Fecha"].max() - df["Fecha"].min()).days + 1
meses_op = dias_op / 30.44
pl = df.groupby("PLACA").agg(
    viajes=("No. Viaje", "size"), toneladas=("peso_ton", "sum"),
    dias_activos=("Fecha", lambda s: s.dt.normalize().nunique()),
    corredores=("corredor", "nunique"),
    flota=("Tipo Transportador", lambda s: s.mode().iloc[0]),
    tipologia=("Tipología de camión", lambda s: s.mode().iloc[0]))
pl["viajes_mes"] = (pl["viajes"] / meses_op).round(2)
# Estabilidad: nº de meses distintos con actividad / meses totales
mes_placa = df.groupby("PLACA")["Mes - Año"].nunique()
pl["meses_activos"] = mes_placa
pl["estabilidad"] = (pl["meses_activos"] / 18).round(2)
# Índice de utilización: viajes/mes normalizado al máximo del percentil 95
cap95 = pl["viajes_mes"].quantile(.95)
pl["indice_utilizacion"] = (pl["viajes_mes"] / cap95).clip(upper=1.5).round(2)
pl.to_csv(f"{OUT_TAB}/fase5_placas.csv")

propia = pl[pl["flota"].isin(["Flota Propia", "Empresas"])]
print(f"\n=== PLACAS: {len(pl)} totales | propia+empresas: {len(propia)} ===")
print("Top 10 placas por utilización (viajes/mes):")
print(pl.sort_values("viajes_mes", ascending=False).head(10)[
    ["viajes", "viajes_mes", "dias_activos", "flota", "tipologia", "estabilidad"]].to_string())
print("\nPlacas propias con MENOR utilización (subutilizadas, >=3 meses activas):")
sub = propia[propia["meses_activos"] >= 3].sort_values("viajes_mes").head(10)
print(sub[["viajes", "viajes_mes", "meses_activos", "tipologia", "indice_utilizacion"]].to_string())

# ---- Flota ----
flota = df.groupby("Tipo Transportador").agg(
    viajes=("No. Viaje", "size"), toneladas=("peso_ton", "sum"),
    placas=("PLACA", "nunique")).round(1)
flota["part_%"] = (flota["viajes"] / N * 100).round(1)
flota["viajes_por_placa"] = (flota["viajes"] / flota["placas"]).round(1)
flota.to_csv(f"{OUT_TAB}/fase5_flota.csv")
print("\n=== PARTICIPACIÓN DE FLOTA ===")
print(flota.to_string())

# ---- Corredores ----
cor = df.groupby("corredor").agg(
    viajes=("No. Viaje", "size"), toneladas=("peso_ton", "sum"),
    ton_prom=("peso_ton", "mean")).sort_values("viajes", ascending=False)
# Variabilidad y crecimiento por corredor (mensual)
cm = df.groupby(["corredor", "Mes - Año"]).size().unstack(fill_value=0)
cor["cv_mensual_%"] = (cm.std(axis=1) / cm.mean(axis=1) * 100).round(1)
# Crecimiento: pendiente OLS normalizada sobre los 18 meses
def slope(row):
    y = row.values.astype(float); x = np.arange(len(y))
    if y.sum() == 0: return 0.0
    return np.polyfit(x, y, 1)[0]
cor["tendencia_mes"] = cm.apply(slope, axis=1).round(2)
cor["crecimiento_%"] = (cor["tendencia_mes"] * 18 / cm.mean(axis=1).replace(0, np.nan) * 100).round(1)
# Criticidad = alta demanda * alta variabilidad (z-scores). Umbral 200 viajes
# para que el índice sea relevante a la decisión (evita corredores marginales
# de altísima varianza pero volumen despreciable).
sig = cor[cor["viajes"] >= 200].copy()
sig["z_dem"] = (sig["viajes"] - sig["viajes"].mean()) / sig["viajes"].std()
sig["z_var"] = (sig["cv_mensual_%"] - sig["cv_mensual_%"].mean()) / sig["cv_mensual_%"].std()
sig["indice_criticidad"] = (sig["z_dem"] + sig["z_var"]).round(2)
cor.to_csv(f"{OUT_TAB}/fase5_corredores.csv")
sig.sort_values("indice_criticidad", ascending=False).head(20).to_csv(
    f"{OUT_TAB}/fase5_corredores_criticos.csv")
print("\n=== TOP 12 CORREDORES POR DEMANDA ===")
print(cor.head(12)[["viajes", "toneladas", "ton_prom", "cv_mensual_%", "crecimiento_%"]].to_string())
print("\n=== TOP 10 CORREDORES CRÍTICOS (demanda x variabilidad) ===")
print(sig.sort_values("indice_criticidad", ascending=False).head(10)[
    ["viajes", "cv_mensual_%", "crecimiento_%", "indice_criticidad"]].to_string())

# ==========================================================================
# FASE 6 — RETORNOS VACÍOS
# ==========================================================================
# Flujo por corredor dirigido
flow = df.groupby(["Ciudad Origen", "Ciudad Destino"]).agg(
    viajes=("No. Viaje", "size"),
    zona_o=("Zona Origen", "first"), zona_d=("Zona Destino", "first"),
    tipologia=("Tipología de camión", lambda s: s.mode().iloc[0])).reset_index()
flow = flow[flow["Ciudad Origen"] != flow["Ciudad Destino"]]  # excluye intraurbano exacto

# Emparejar cada corredor con su reverso
rev = flow.rename(columns={"Ciudad Origen": "Ciudad Destino", "Ciudad Destino": "Ciudad Origen",
                           "viajes": "viajes_rev"})[["Ciudad Origen", "Ciudad Destino", "viajes_rev"]]
m = flow.merge(rev, on=["Ciudad Origen", "Ciudad Destino"], how="left")
m["viajes_rev"] = m["viajes_rev"].fillna(0).astype(int)
# Dirección dominante: excedente que retorna vacío
m["excedente"] = (m["viajes"] - m["viajes_rev"]).clip(lower=0)
m["dist_km"] = m.apply(lambda r: distancia_km(r["Ciudad Origen"], r["Ciudad Destino"],
                                              r["zona_o"], r["zona_d"]), axis=1)
m["costo_retorno_unit"] = m.apply(lambda r: costo_flete(r["dist_km"], r["tipologia"]), axis=1)
m["costo_retorno_vacio_est"] = (m["excedente"] * m["costo_retorno_unit"]).fillna(0)

# Métrica global de retornos vacíos (pairwise, cota superior)
empty_legs = int(m["excedente"].sum() // 2 * 2)  # evita doble conteo por par
# suma de excedentes de la dirección dominante de cada par:
par_dom = m.copy()
par_dom["par"] = np.where(par_dom["Ciudad Origen"] <= par_dom["Ciudad Destino"],
                          par_dom["Ciudad Origen"] + "|" + par_dom["Ciudad Destino"],
                          par_dom["Ciudad Destino"] + "|" + par_dom["Ciudad Origen"])
dom = par_dom.groupby("par").agg(exc=("excedente", "max")).reset_index()
empty_legs = int(dom["exc"].sum())
deadhead_ratio = empty_legs / N * 100

# Costo estimado de retornos vacíos. Un trayecto vacío NO cuesta el flete completo:
# cuesta el costo variable (combustible, peajes, conductor) ~= 65% del flete cargado.
FACTOR_VARIABLE = 0.65
costo_par = par_dom.sort_values("excedente", ascending=False).drop_duplicates("par")
costo_ceiling = float(costo_par["costo_retorno_vacio_est"].sum())      # cota superior (flete pleno)
costo_realista = costo_ceiling * FACTOR_VARIABLE                        # costo variable del vacío
# Escenario de red (zonal): solo la reposición neta inter-zona, a costo variable
costo_total = costo_ceiling  # se conserva nombre para compatibilidad

# Rutas con mayor riesgo de retorno vacío
top_empty = m[m["viajes"] >= 50].sort_values("excedente", ascending=False).head(20)
top_empty.to_csv(f"{OUT_TAB}/fase6_rutas_retorno_vacio.csv", index=False)

# Desbalance por ZONA (visión de red, más realista)
out_z = df.groupby("Zona Origen").size()
in_z = df.groupby("Zona Destino").size()
zbal = pd.DataFrame({"salidas": out_z, "entradas": in_z}).fillna(0)
zbal["neto"] = zbal["entradas"] - zbal["salidas"]
zbal["desbalance_abs"] = zbal["neto"].abs()
zbal = zbal.sort_values("neto")
zbal.to_csv(f"{OUT_TAB}/fase6_balance_zonas.csv")
repos_red = int(zbal.loc[zbal["neto"] > 0, "neto"].sum())  # vehículos que entran de más
deadhead_red_ratio = repos_red / N * 100

# Clientes que generan mayor desbalance
cli_bal = []
for neg, g in df.groupby("Negocio"):
    o = g.groupby(["Ciudad Origen", "Ciudad Destino"]).size()
    exc = 0
    fl = g.groupby(["Ciudad Origen", "Ciudad Destino"]).size().reset_index(name="v")
    fl = fl[fl["Ciudad Origen"] != fl["Ciudad Destino"]]
    rv = fl.rename(columns={"Ciudad Origen": "Ciudad Destino", "Ciudad Destino": "Ciudad Origen", "v": "vr"})
    mm = fl.merge(rv, on=["Ciudad Origen", "Ciudad Destino"], how="left").fillna(0)
    mm["par"] = np.where(mm["Ciudad Origen"] <= mm["Ciudad Destino"],
                         mm["Ciudad Origen"] + "|" + mm["Ciudad Destino"],
                         mm["Ciudad Destino"] + "|" + mm["Ciudad Origen"])
    exc = mm.assign(e=(mm["v"] - mm["vr"]).clip(lower=0)).groupby("par")["e"].max().sum()
    cli_bal.append((neg, len(g), int(exc), round(exc / len(g) * 100, 1)))
cli_bal = pd.DataFrame(cli_bal, columns=["Negocio", "viajes", "retornos_vacios_est", "%_deadhead"]).sort_values(
    "retornos_vacios_est", ascending=False)
cli_bal.to_csv(f"{OUT_TAB}/fase6_desbalance_clientes.csv", index=False)

resumen6 = {
    "retornos_vacios_estimados_pairwise": empty_legs,
    "deadhead_ratio_pairwise_%": round(deadhead_ratio, 1),
    "reposicion_red_zonal": repos_red,
    "deadhead_ratio_zonal_%": round(deadhead_red_ratio, 1),
    "costo_18m_ceiling_COP": round(costo_ceiling, 0),
    "costo_18m_realista_COP": round(costo_realista, 0),
    "costo_anual_realista_COP": round(costo_realista / 18 * 12, 0),
    "supuesto_factor_variable": FACTOR_VARIABLE,
}
with open(f"{OUT_TAB}/fase6_resumen.json", "w") as fh:
    json.dump(resumen6, fh, indent=2, ensure_ascii=False)
print("\n=== FASE 6: RETORNOS VACÍOS ===")
print(f"Retornos vacíos estimados (pairwise, cota superior): {empty_legs:,} legs ({deadhead_ratio:.1f}% de viajes)")
print(f"Reposición neta por zonas (visión de red, piso): {repos_red:,} ({deadhead_red_ratio:.1f}%)")
print(f"Costo 18m — cota superior (flete pleno):   ${costo_ceiling:,.0f} COP")
print(f"Costo 18m — realista (costo variable 65%):  ${costo_realista:,.0f} COP")
print(f"Costo ANUALIZADO realista:                  ${costo_realista/18*12:,.0f} COP/año")
print("\nTop 8 rutas con mayor riesgo de retorno vacío:")
print(top_empty.head(8)[["Ciudad Origen", "Ciudad Destino", "viajes", "viajes_rev", "excedente", "dist_km", "costo_retorno_vacio_est"]].to_string(index=False))
print("\nBalance por zona (neto = entradas - salidas):")
print(zbal.to_string())
print("\nTop clientes por retornos vacíos:")
print(cli_bal.head(8).to_string(index=False))

# ---- Gráficos ----
fig, ax = plt.subplots(figsize=(9, 4.2))
t8 = top_empty.head(10)
lbl = (t8["Ciudad Origen"].str[:10] + "→" + t8["Ciudad Destino"].str[:10])
ax.barh(range(len(t8)), t8["excedente"], color=ROJO, alpha=.8)
ax.set_yticks(range(len(t8))); ax.set_yticklabels(lbl, fontsize=8); ax.invert_yaxis()
ax.set(title="Top 10 rutas con mayor retorno vacío estimado", xlabel="Vehículos que retornan vacíos (excedente)")
fig.tight_layout(); fig.savefig(f"{OUT_FIG}/fase6_rutas_vacias.png"); plt.close(fig)

fig, ax = plt.subplots(figsize=(8, 4))
c = [VER if v >= 0 else ROJO for v in zbal["neto"]]
ax.barh(zbal.index, zbal["neto"], color=c, alpha=.8)
ax.axvline(0, color="k", lw=.8)
ax.set(title="Balance de flujos por zona (entradas - salidas)", xlabel="Viajes netos")
fig.tight_layout(); fig.savefig(f"{OUT_FIG}/fase6_balance_zonas.png"); plt.close(fig)

fig, ax = plt.subplots(figsize=(8.5, 4))
top_cor = cor.head(12)
ax.barh(range(len(top_cor)), top_cor["viajes"], color=AZUL, alpha=.85)
ax.set_yticks(range(len(top_cor))); ax.set_yticklabels([c[:26] for c in top_cor.index], fontsize=8)
ax.invert_yaxis(); ax.set(title="Top 12 corredores por demanda", xlabel="Viajes (18 meses)")
fig.tight_layout(); fig.savefig(f"{OUT_FIG}/fase5_top_corredores.png"); plt.close(fig)

print("\n[OK] Fases 4-6 completadas.")
