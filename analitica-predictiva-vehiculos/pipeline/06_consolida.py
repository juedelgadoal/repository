"""
Consolida KPIs y series de apoyo para el Dashboard y los informes.
Genera kpis.json y tablas tidy (mensual con flota, semanal, top rankings).
"""
import json
import numpy as np
import pandas as pd
from lib import cargar_data, construir_serie_diaria, construir_serie_semanal, OUT_TAB

df = cargar_data()
daily = construir_serie_diaria(df)
N = len(df)
meses = df["Mes - Año"].nunique()

# ---- Serie mensual con split de flota (para gráficos apilados) ----
mens = df.pivot_table(index="Mes - Año", columns="Tipo Transportador",
                      values="No. Viaje", aggfunc="size", fill_value=0)
mens["Total"] = mens.sum(axis=1)
mens["Toneladas"] = df.groupby("Mes - Año")["peso_ton"].sum().round(0)
mens.to_csv(f"{OUT_TAB}/dash_serie_mensual_flota.csv")

# ---- Serie semanal ----
wk = construir_serie_semanal(daily)
wk.to_csv(f"{OUT_TAB}/dash_serie_semanal.csv")

# ---- KPIs globales ----
festivos_json = json.load(open(f"{OUT_TAB}/fase6_resumen.json"))
sel = json.load(open(f"{OUT_TAB}/fase7_seleccion.json"))
recs = json.load(open(f"{OUT_TAB}/fase9_recomendaciones.json"))

kpis = {
    "registros": int(N),
    "meses_historia": int(meses),
    "rango": [str(df['Fecha'].min().date()), str(df['Fecha'].max().date())],
    "vehiculos_dia_prom": round(daily["viajes"].mean(), 0),
    "vehiculos_dia_habil_prom": round(daily.loc[daily["habil"] == 1, "viajes"].mean(), 0),
    "toneladas_totales": round(df["peso_ton"].sum(), 0),
    "toneladas_dia_prom": round(daily["toneladas"].mean(), 0),
    "ton_por_viaje": round(df["peso_ton"].mean(), 2),
    "placas_unicas": int(df["PLACA"].nunique()),
    "clientes": int(df["Negocio"].nunique()),
    "corredores": int(df["corredor"].nunique()),
    "part_flota_propia_amplia_%": round(df["flota_propia_amplia"].mean() * 100, 1),
    "part_terceros_%": round(df["es_terceros"].mean() * 100, 1),
    "deadhead_ratio_pairwise_%": festivos_json["deadhead_ratio_pairwise_%"],
    "deadhead_ratio_zonal_%": festivos_json["deadhead_ratio_zonal_%"],
    "costo_retorno_vacio_anual_COP": festivos_json["costo_anual_realista_COP"],
    "modelo_seleccionado": sel["semanal"]["mejor"],
    "wape_semanal_%": round(sel["semanal"]["metricas"]["WAPE"], 1),
    "wape_diario_%": round(sel["diario"]["metricas"]["WAPE"], 1),
    "r2_semanal": round(sel["semanal"]["metricas"]["R2"], 2),
    "reserva_proxima_semana": recs["reserva_proxima_semana"],
    "demanda_esperada_7d": recs["demanda_esperada_7d"],
}
with open(f"{OUT_TAB}/dash_kpis.json", "w") as fh:
    json.dump(kpis, fh, indent=2, ensure_ascii=False)
print("=== KPIs CONSOLIDADOS ===")
print(json.dumps(kpis, indent=2, ensure_ascii=False))
print("\n[OK] Consolidación completada.")
