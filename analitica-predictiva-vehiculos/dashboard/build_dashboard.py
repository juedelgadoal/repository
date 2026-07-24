"""
Constructor del Dashboard profesional en Excel — Planeación Predictiva de Vehículos (DIC).
Compatible con Excel 2016. Genera Dashboard_Planeacion_Vehiculos.xlsx con:
Portada, Tablero (KPIs+alertas+gráficos), Pronóstico, Demanda, Clientes, Corredores,
Flota/Placas, Retornos Vacíos, Modelo, Correlaciones y Parámetros.

Los gráficos son nativos de Excel (openpyxl) para que sean editables. Las tablas de
ranking son Tablas de Excel (ListObjects) filtrables; la macro VBA agrega las
Tablas Dinámicas y Segmentadores al refrescar.
"""
import os, json
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, NamedStyle
from openpyxl.chart import LineChart, BarChart, PieChart, Reference, Series
from openpyxl.chart.label import DataLabelList
from openpyxl.formatting.rule import CellIsRule, ColorScaleRule
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.utils import get_column_letter
from openpyxl.utils.dataframe import dataframe_to_rows
from openpyxl.drawing.image import Image as XLImage

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAB = os.path.join(BASE, "outputs", "tablas")
FIG = os.path.join(BASE, "outputs", "graficos")
OUT = os.path.join(BASE, "dashboard", "Dashboard_Planeacion_Vehiculos.xlsx")

def R(name):  # lee CSV de outputs/tablas
    return pd.read_csv(os.path.join(TAB, name))
def J(name):
    return json.load(open(os.path.join(TAB, name)))

kpis = J("dash_kpis.json")
sel = J("fase7_seleccion.json")
recs = J("fase9_recomendaciones.json")

# ---------- paleta / estilos ----------
NAVY = "1F4E79"; AZUL = "2E75B6"; NAR = "E07B39"; VERDE = "2E8B57"; ROJO = "C0392B"
GRIS = "F2F4F7"; GRISD = "D6DCE5"; AMAR = "FFF2CC"; BLANCO = "FFFFFF"
FUENTE = "Arial"

def font(sz=10, b=False, color="000000", it=False):
    return Font(name=FUENTE, size=sz, bold=b, color=color, italic=it)
def fill(c): return PatternFill("solid", fgColor=c)
thin = Side(style="thin", color="BFBFBF")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
center = Alignment(horizontal="center", vertical="center", wrap_text=True)
left = Alignment(horizontal="left", vertical="center", wrap_text=True)
right = Alignment(horizontal="right", vertical="center")

wb = Workbook()

def titulo(ws, texto, sub=None, cols=8):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=cols)
    c = ws.cell(1, 1, texto); c.font = font(16, True, BLANCO); c.fill = fill(NAVY)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 30
    if sub:
        ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=cols)
        s = ws.cell(2, 1, sub); s.font = font(9, False, "595959"); s.fill = fill(GRIS)
        s.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        ws.row_dimensions[2].height = 18

def escribe_df(ws, df, start_row, start_col=1, tabla=None, num_cols=None, pct_cols=None,
               header_fill=NAVY):
    num_cols = num_cols or []; pct_cols = pct_cols or []
    for j, col in enumerate(df.columns):
        c = ws.cell(start_row, start_col + j, str(col))
        c.font = font(9, True, BLANCO); c.fill = fill(header_fill)
        c.alignment = center; c.border = border
    for i, (_, row) in enumerate(df.iterrows(), 1):
        for j, col in enumerate(df.columns):
            v = row[col]
            c = ws.cell(start_row + i, start_col + j, v)
            c.font = font(9); c.border = border
            c.alignment = right if (col in num_cols or col in pct_cols) else left
            if col in num_cols: c.number_format = '#,##0'
            if col in pct_cols: c.number_format = '0.0%'
            if (start_row + i) % 2 == 0: c.fill = fill(GRIS)
    if tabla:
        ref = f"{get_column_letter(start_col)}{start_row}:{get_column_letter(start_col+len(df.columns)-1)}{start_row+len(df)}"
        t = Table(displayName=tabla, ref=ref)
        t.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
        ws.add_table(t)
    return start_row + len(df) + 1

# ============================================================ 1) PORTADA
ws = wb.active; ws.title = "Portada"
ws.sheet_view.showGridLines = False
for col, w in {"A": 3, "B": 40, "C": 40, "D": 20}.items(): ws.column_dimensions[col].width = w
ws.merge_cells("B2:D2"); c = ws["B2"]; c.value = "DIC — OPERACIÓN LOGÍSTICA"
c.font = font(12, True, AZUL)
ws.merge_cells("B3:D4"); c = ws["B3"]
c.value = "MODELO PREDICTIVO PARA LA\nPLANEACIÓN DE VEHÍCULOS"
c.font = font(20, True, NAVY); c.alignment = Alignment(wrap_text=True, vertical="center")
ws.merge_cells("B5:D5"); ws["B5"] = "Herramienta de planeación con 7 días de anticipación"
ws["B5"].font = font(11, False, "595959")
info = [
    ("Base analizada", f"{kpis['registros']:,} viajes · {kpis['meses_historia']} meses"),
    ("Periodo", f"{kpis['rango'][0]} a {kpis['rango'][1]}"),
    ("Modelo seleccionado", kpis["modelo_seleccionado"]),
    ("Precisión (WAPE semanal)", f"{kpis['wape_semanal_%']}%  (meta ≤ 10%)"),
    ("Demanda media hábil", f"{kpis['vehiculos_dia_habil_prom']:.0f} vehículos/día"),
    ("Participación terceros", f"{kpis['part_terceros_%']}%"),
    ("Retorno vacío (rango)", f"{kpis['deadhead_ratio_zonal_%']}% – {kpis['deadhead_ratio_pairwise_%']}%"),
    ("Costo retorno vacío", f"${kpis['costo_retorno_vacio_anual_COP']/1e9:.1f} mil millones COP/año (est.)"),
]
r = 7
for k, v in info:
    ws.cell(r, 2, k).font = font(10, True, NAVY)
    ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=4)
    ws.cell(r, 3, v).font = font(10)
    ws.cell(r, 2).fill = fill(GRIS); ws.cell(r, 3).fill = fill(GRIS)
    ws.row_dimensions[r].height = 20; r += 1
r += 1
ws.cell(r, 2, "CONTENIDO").font = font(11, True, AZUL); r += 1
indice = ["Tablero — KPIs, alertas y gráficos", "Pronóstico — 1/3/7/15/30 días",
          "Demanda — series diaria y mensual", "Clientes — rankings",
          "Corredores — demanda y criticidad", "Flota y Placas — utilización",
          "Retornos Vacíos — desbalance y costo", "Modelo — comparación y coeficientes",
          "Correlaciones", "Parámetros — variables editables"]
for it in indice:
    ws.cell(r, 2, "• " + it).font = font(10); r += 1
ws.cell(r+1, 2, "Generado por el pipeline analítico. Cifras de costo/retorno vacío son estimaciones (ver Parámetros y hoja Retornos Vacíos).").font = font(8, False, "808080", it=True)

# ============================================================ 2) DEMANDA (datos base)
wsd = wb.create_sheet("Demanda")
titulo(wsd, "DEMANDA — Series base", "Serie diaria (últimos 120 días) y serie mensual con split de flota", 8)
daily = R("fase8_pronostico_diario_30d.csv")  # placeholder; usamos series reales:
serie_diaria = pd.read_csv(os.path.join(TAB, "dash_serie_semanal.csv"))
# Serie diaria real: reconstruimos de la mensual + perfil; mejor cargar del pipeline:
serie_mensual = R("dash_serie_mensual_flota.csv")
# --- Serie mensual (para gráfico apilado) ---
wsd.cell(4, 1, "SERIE MENSUAL (viajes por flota)").font = font(11, True, NAVY)
cols_m = [c for c in ["Mes - Año", "Flota Propia", "Empresas", "Terceros", "Total", "Toneladas"] if c in serie_mensual.columns]
sm = serie_mensual[cols_m]
next_r = escribe_df(wsd, sm, 5, num_cols=["Flota Propia", "Empresas", "Terceros", "Total", "Toneladas"])
# gráfico apilado de flota
ch = BarChart(); ch.type = "col"; ch.grouping = "stacked"; ch.overlap = 100
ch.title = "Viajes mensuales por tipo de flota"; ch.height = 7.5; ch.width = 18
data = Reference(wsd, min_col=2, max_col=4, min_row=5, max_row=5+len(sm))
cats = Reference(wsd, min_col=1, min_row=6, max_row=5+len(sm))
ch.add_data(data, titles_from_data=True); ch.set_categories(cats)
ch.y_axis.title = "Viajes"; ch.x_axis.delete = False; ch.y_axis.delete = False
wsd.add_chart(ch, f"H5")
# línea de toneladas
ch2 = LineChart(); ch2.title = "Toneladas mensuales"; ch2.height = 7.5; ch2.width = 18
d2 = Reference(wsd, min_col=cols_m.index("Toneladas")+1, min_row=5, max_row=5+len(sm))
ch2.add_data(d2, titles_from_data=True); ch2.set_categories(cats)
ch2.y_axis.delete = False; ch2.x_axis.delete = False
wsd.add_chart(ch2, "H20")
for i, w in enumerate([12, 12, 12, 12, 12, 14], 1): wsd.column_dimensions[get_column_letter(i)].width = w

# perfil por día de semana
perfil = R("fase2_perfil_dia_semana.csv").rename(columns={"Unnamed: 0": "dia_semana"})
if "dia_semana" not in perfil.columns: perfil.columns = ["dia_semana"] + list(perfil.columns[1:])
pr_r = next_r + 1
wsd.cell(pr_r, 1, "PERFIL POR DÍA DE LA SEMANA").font = font(11, True, NAVY)
pcols = [c for c in perfil.columns if c in ["dia_semana", "mean", "std", "indice_vs_prom"]]
escribe_df(wsd, perfil[pcols], pr_r+1, num_cols=["mean", "std"])
chp = BarChart(); chp.type = "col"; chp.title = "Demanda promedio por día de semana"; chp.height = 7; chp.width = 16
dref = Reference(wsd, min_col=pcols.index("mean")+1, min_row=pr_r+1, max_row=pr_r+1+len(perfil))
cref = Reference(wsd, min_col=1, min_row=pr_r+2, max_row=pr_r+1+len(perfil))
chp.add_data(dref, titles_from_data=True); chp.set_categories(cref); chp.legend = None
chp.y_axis.delete = False; chp.x_axis.delete = False
wsd.add_chart(chp, f"H35")

# ============================================================ 3) PRONOSTICO
wsp = wb.create_sheet("Pronostico")
titulo(wsp, "PRONÓSTICO DE DEMANDA", "Horizontes 1/3/7/15/30 días · vehículos, toneladas y desglose de flota/tipología", 12)
ph = R("fase8_pronostico_horizontes.csv")
wsp.cell(4, 1, "RESUMEN POR HORIZONTE").font = font(11, True, NAVY)
numcols = [c for c in ph.columns if c not in ["horizonte"]]
nr = escribe_df(wsp, ph, 5, num_cols=numcols)
# KPI: reserva próxima semana (formula sobre la fila de 7 días)
fila7 = 5 + 1 + list(ph["horizonte"]).index("7 días")  # fila datos de 7 días
col_total = list(ph.columns).index("vehiculos_totales") + 1
wsp.cell(nr+1, 1, "Reserva sugerida próxima semana (demanda + colchón nivel servicio 90%):").font = font(10, True, NAVY)
letra = get_column_letter(col_total)
wsp.cell(nr+1, 6, f"=ROUND({letra}{fila7}*(1+Parametros!$B$5),0)").font = font(12, True, ROJO)
wsp.cell(nr+1, 6).number_format = '#,##0'
# Pronóstico diario 30d + gráfico
fd = R("fase8_pronostico_diario_30d.csv")[["fecha", "dia_semana", "viajes_pred", "toneladas_pred", "festivo"]]
dr = nr + 3
wsp.cell(dr, 1, "PRONÓSTICO DIARIO (30 días)").font = font(11, True, NAVY)
escribe_df(wsp, fd, dr+1, tabla="TablaPronostico", num_cols=["viajes_pred", "toneladas_pred"])
chf = LineChart(); chf.title = "Pronóstico diario de vehículos (30 días)"; chf.height = 8; chf.width = 20
dref = Reference(wsp, min_col=3, min_row=dr+1, max_row=dr+1+len(fd))
cref = Reference(wsp, min_col=1, min_row=dr+2, max_row=dr+1+len(fd))
chf.add_data(dref, titles_from_data=True); chf.set_categories(cref); chf.legend = None
chf.y_axis.delete = False; chf.x_axis.delete = False
wsp.add_chart(chf, "H5")
# desglose por corredor/zona/cliente (7d)
cor7 = R("fase8_pronostico7_por_corredor.csv"); cor7.columns = ["corredor", "veh_7d"]
zon7 = R("fase8_pronostico7_por_zona.csv"); zon7.columns = ["zona", "veh_7d"]
cli7 = R("fase8_pronostico7_por_cliente.csv"); cli7.columns = ["cliente", "veh_7d"]
wsp.cell(dr, 8, "TOP CORREDORES (7d)").font = font(10, True, NAVY)
escribe_df(wsp, cor7.head(12), dr+1, start_col=8, num_cols=["veh_7d"])
for i, w in enumerate([12, 12, 12, 14, 8], 1): wsp.column_dimensions[get_column_letter(i)].width = w
wsp.column_dimensions["H"].width = 26

# ============================================================ 4) CLIENTES
wsc = wb.create_sheet("Clientes")
titulo(wsc, "CLIENTES — Rankings", "Demanda, toneladas y frecuencia por unidad de negocio", 8)
cli = R("fase5_clientes.csv").rename(columns={"Unnamed: 0": "Negocio"})
if "Negocio" not in cli.columns: cli.rename(columns={cli.columns[0]: "Negocio"}, inplace=True)
cli["part_viajes"] = cli["part_viajes_%"] / 100
show = cli[["Negocio", "viajes", "toneladas", "ton_prom", "corredores", "part_viajes"]]
escribe_df(wsc, show, 4, tabla="TablaClientes", num_cols=["viajes", "toneladas", "ton_prom", "corredores"], pct_cols=["part_viajes"])
chc = BarChart(); chc.type = "bar"; chc.title = "Top clientes por viajes"; chc.height = 9; chc.width = 16
dref = Reference(wsc, min_col=2, min_row=4, max_row=4+min(10, len(show)))
cref = Reference(wsc, min_col=1, min_row=5, max_row=4+min(10, len(show)))
chc.add_data(dref, titles_from_data=True); chc.set_categories(cref); chc.legend = None
chc.y_axis.delete = False; chc.x_axis.delete = False
wsc.add_chart(chc, "H4")
for i, w in enumerate([22, 10, 12, 10, 12, 12], 1): wsc.column_dimensions[get_column_letter(i)].width = w

# ============================================================ 5) CORREDORES
wsco = wb.create_sheet("Corredores")
titulo(wsco, "CORREDORES — Demanda y Criticidad", "Top corredores por volumen y corredores críticos (demanda × variabilidad)", 10)
cor = R("fase5_corredores.csv").rename(columns={"Unnamed: 0": "corredor"})
if "corredor" not in cor.columns: cor.rename(columns={cor.columns[0]: "corredor"}, inplace=True)
top = cor.head(15)[["corredor", "viajes", "toneladas", "ton_prom", "cv_mensual_%", "crecimiento_%"]]
wsco.cell(4, 1, "TOP 15 CORREDORES").font = font(11, True, NAVY)
nr = escribe_df(wsco, top, 5, tabla="TablaCorredores", num_cols=["viajes", "toneladas", "ton_prom"])
crit = R("fase5_corredores_criticos.csv").rename(columns={"Unnamed: 0": "corredor"})
if "corredor" not in crit.columns: crit.rename(columns={crit.columns[0]: "corredor"}, inplace=True)
crit = crit[["corredor", "viajes", "cv_mensual_%", "crecimiento_%", "indice_criticidad"]].head(10)
wsco.cell(nr+1, 1, "CORREDORES CRÍTICOS").font = font(11, True, ROJO)
escribe_df(wsco, crit, nr+2, num_cols=["viajes"], header_fill=ROJO)
for i, w in enumerate([30, 10, 12, 10, 12, 14], 1): wsco.column_dimensions[get_column_letter(i)].width = w
chco = BarChart(); chco.type = "bar"; chco.title = "Top corredores por viajes"; chco.height = 10; chco.width = 16
dref = Reference(wsco, min_col=2, min_row=5, max_row=5+12)
cref = Reference(wsco, min_col=1, min_row=6, max_row=5+12)
chco.add_data(dref, titles_from_data=True); chco.set_categories(cref); chco.legend = None
chco.y_axis.delete = False; chco.x_axis.delete = False
wsco.add_chart(chco, "H5")

# ============================================================ 6) FLOTA / PLACAS
wsf = wb.create_sheet("Flota_Placas")
titulo(wsf, "FLOTA Y PLACAS — Utilización", "Participación por tipo de transportador y utilización de placas", 9)
flota = R("fase5_flota.csv").rename(columns={"Unnamed: 0": "Tipo Transportador"})
if "Tipo Transportador" not in flota.columns: flota.rename(columns={flota.columns[0]: "Tipo Transportador"}, inplace=True)
flota["part"] = flota["part_%"] / 100
wsf.cell(4, 1, "PARTICIPACIÓN DE FLOTA").font = font(11, True, NAVY)
escribe_df(wsf, flota[["Tipo Transportador", "viajes", "toneladas", "placas", "part", "viajes_por_placa"]], 5,
           num_cols=["viajes", "toneladas", "placas", "viajes_por_placa"], pct_cols=["part"])
chpie = PieChart(); chpie.title = "Participación de viajes por flota"; chpie.height = 8; chpie.width = 12
dref = Reference(wsf, min_col=2, min_row=5, max_row=5+len(flota))
cref = Reference(wsf, min_col=1, min_row=6, max_row=5+len(flota))
chpie.add_data(dref, titles_from_data=True); chpie.set_categories(cref)
chpie.dataLabels = DataLabelList(); chpie.dataLabels.showPercent = True
wsf.add_chart(chpie, "H4")
# top placas por utilización
pl = R("fase5_placas.csv").rename(columns={"Unnamed: 0": "PLACA"})
if "PLACA" not in pl.columns: pl.rename(columns={pl.columns[0]: "PLACA"}, inplace=True)
topp = pl.sort_values("viajes_mes", ascending=False).head(15)[
    ["PLACA", "viajes", "viajes_mes", "dias_activos", "flota", "tipologia", "estabilidad"]]
r2 = escribe_df(wsf, topp, 24, tabla="TablaPlacasTop", num_cols=["viajes", "dias_activos"])
wsf.cell(23, 1, "TOP 15 PLACAS POR UTILIZACIÓN (viajes/mes)").font = font(11, True, NAVY)
for i, w in enumerate([12, 10, 12, 12, 14, 14, 12], 1): wsf.column_dimensions[get_column_letter(i)].width = w

# ============================================================ 7) RETORNOS VACIOS
wsr = wb.create_sheet("Retornos_Vacios")
titulo(wsr, "RETORNOS VACÍOS", "Desbalance direccional, rutas de riesgo y costo estimado (SICETAC aprox.)", 10)
r6 = J("fase6_resumen.json")
kb = [("Retornos vacíos (pairwise, cota superior)", f"{r6['retornos_vacios_estimados_pairwise']:,} · {r6['deadhead_ratio_pairwise_%']}%"),
      ("Reposición de red (zonal, piso)", f"{r6['reposicion_red_zonal']:,} · {r6['deadhead_ratio_zonal_%']}%"),
      ("Costo 18m — realista (costo variable)", f"${r6['costo_18m_realista_COP']:,.0f} COP"),
      ("Costo anualizado (realista)", f"${r6['costo_anual_realista_COP']:,.0f} COP/año")]
rr = 4
for k, v in kb:
    wsr.cell(rr, 1, k).font = font(10, True, NAVY); wsr.cell(rr, 1).fill = fill(GRIS)
    wsr.merge_cells(start_row=rr, start_column=3, end_row=rr, end_column=6)
    wsr.cell(rr, 3, v).font = font(10, True, ROJO); rr += 1
vac = R("fase6_rutas_retorno_vacio.csv")[["Ciudad Origen", "Ciudad Destino", "viajes", "viajes_rev", "excedente", "dist_km", "costo_retorno_vacio_est"]]
wsr.cell(rr+1, 1, "TOP RUTAS CON RIESGO DE RETORNO VACÍO").font = font(11, True, NAVY)
nr = escribe_df(wsr, vac.head(15), rr+2, tabla="TablaVacios",
                num_cols=["viajes", "viajes_rev", "excedente", "costo_retorno_vacio_est"])
zb = R("fase6_balance_zonas.csv").rename(columns={"Unnamed: 0": "Zona"})
if "Zona" not in zb.columns: zb.rename(columns={zb.columns[0]: "Zona"}, inplace=True)
wsr.cell(rr+1, 9, "BALANCE POR ZONA").font = font(11, True, NAVY)
escribe_df(wsr, zb[["Zona", "salidas", "entradas", "neto"]], rr+2, start_col=9,
           num_cols=["salidas", "entradas", "neto"])
for i, w in enumerate([16, 16, 10, 10, 10, 10, 18], 1): wsr.column_dimensions[get_column_letter(i)].width = w
wsr.column_dimensions["I"].width = 20

# ============================================================ 8) MODELO
wsm = wb.create_sheet("Modelo")
titulo(wsm, "MODELO PREDICTIVO", "Comparación de 9 modelos · selección · coeficientes del modelo OLS", 8)
wsm.cell(4, 1, "COMPARACIÓN — BACKTEST SEMANAL (horizonte 1 semana, meta ≤10% WAPE)").font = font(11, True, NAVY)
cmpw = R("fase7_comparacion_SEMANAL.csv").rename(columns={"Unnamed: 0": "Modelo"})
if "Modelo" not in cmpw.columns: cmpw.rename(columns={cmpw.columns[0]: "Modelo"}, inplace=True)
nr = escribe_df(wsm, cmpw, 5, num_cols=["n"])
# resaltar el mejor (fila 6)
for j in range(1, len(cmpw.columns)+1):
    wsm.cell(6, j).fill = fill("C6EFCE"); wsm.cell(6, j).font = font(9, True, "006100")
wsm.cell(4, 6, f"Seleccionado: {sel['semanal']['mejor']}").font = font(10, True, VERDE)
cmpd = R("fase7_comparacion_DIARIO.csv").rename(columns={"Unnamed: 0": "Modelo"})
if "Modelo" not in cmpd.columns: cmpd.rename(columns={cmpd.columns[0]: "Modelo"}, inplace=True)
wsm.cell(nr+1, 1, "COMPARACIÓN — BACKTEST DIARIO (horizonte 7 días)").font = font(11, True, NAVY)
nr2 = escribe_df(wsm, cmpd, nr+2, num_cols=["n"])
# coeficientes
coef = R("fase8_coeficientes_OLS_diario.csv"); coef.columns = ["variable", "coeficiente"]
wsm.cell(nr2+1, 1, "COEFICIENTES DEL MODELO OLS DIARIO (para motor Excel/VBA)").font = font(11, True, NAVY)
escribe_df(wsm, coef, nr2+2, num_cols=[])
for i, w in enumerate([30, 12, 12, 12, 12, 10], 1): wsm.column_dimensions[get_column_letter(i)].width = w

# ============================================================ 9) CORRELACIONES
wsx = wb.create_sheet("Correlaciones")
titulo(wsx, "CORRELACIONES", "Variables con mayor capacidad para explicar la demanda (Pearson/Spearman/Kendall)", 6)
corr = R("fase3_correlacion_con_demanda.csv").rename(columns={"Unnamed: 0": "variable"})
if "variable" not in corr.columns: corr.rename(columns={corr.columns[0]: "variable"}, inplace=True)
escribe_df(wsx, corr[["variable", "pearson", "spearman", "kendall"]], 4)
wsx.cell(4, 6, "Nota").font = font(10, True, NAVY)
nota = ("Las variables con mayor correlación instantánea (placas, terceros, toneladas) son "
        "ENDÓGENAS y no sirven para pronosticar. Las variables PREDICTORAS utilizables son las "
        "de calendario (hábil, fin de semana, festivo) y los rezagos semanales (lag7/lag14).")
wsx.merge_cells("F5:H12"); wsx["F5"] = nota; wsx["F5"].font = font(9); wsx["F5"].alignment = left
for i, w in enumerate([24, 12, 12, 12], 1): wsx.column_dimensions[get_column_letter(i)].width = w
wsx.cell(15, 1, "El mapa de calor de correlaciones está en outputs/graficos y en el informe de correlaciones.").font = font(8, it=True, color="808080")

# ============================================================ 10) PARAMETROS
wpar = wb.create_sheet("Parametros")
titulo(wpar, "PARÁMETROS EDITABLES", "Modifique estas celdas (amarillas) para recalibrar alertas y costos", 4)
wpar.cell(4, 1, "Umbral de alerta capacidad (holgura)").font = font(10, True, NAVY)
wpar.cell(4, 2, 0.10).number_format = '0%'; wpar.cell(4, 2).fill = fill(AMAR); wpar.cell(4, 2).font = font(10, True)
wpar.cell(5, 1, "Colchón de reserva (nivel de servicio 90%)").font = font(10, True, NAVY)
wpar.cell(5, 2, round(recs["colchon_%"]/100, 3)).number_format = '0.0%'; wpar.cell(5, 2).fill = fill(AMAR)
wpar.cell(6, 1, "Factor costo variable retorno vacío").font = font(10, True, NAVY)
wpar.cell(6, 2, 0.65).number_format = '0%'; wpar.cell(6, 2).fill = fill(AMAR)
wpar.cell(8, 1, "TARIFA SICETAC (aprox.) — COP/km por tipología").font = font(11, True, NAVY)
tar = [("TRACTOMULA", 5500, 350000), ("CUATROMANOS", 4500, 320000), ("DOBLETROQUE", 4200, 280000),
       ("SENCILLO", 3200, 200000), ("TURBO", 2600, 160000), ("CAMIONETA", 1800, 120000)]
wpar.cell(9, 1, "Tipología").font = font(9, True, BLANCO); wpar.cell(9, 1).fill = fill(NAVY)
wpar.cell(9, 2, "COP/km").font = font(9, True, BLANCO); wpar.cell(9, 2).fill = fill(NAVY)
wpar.cell(9, 3, "Mínimo COP").font = font(9, True, BLANCO); wpar.cell(9, 3).fill = fill(NAVY)
for i, (t, cpk, mn) in enumerate(tar, 10):
    wpar.cell(i, 1, t).font = font(9)
    wpar.cell(i, 2, cpk).fill = fill(AMAR); wpar.cell(i, 2).number_format = '#,##0'
    wpar.cell(i, 3, mn).fill = fill(AMAR); wpar.cell(i, 3).number_format = '#,##0'
wpar.cell(18, 1, "Contraseña de protección VBA").font = font(10, True, NAVY)
wpar.cell(18, 2, "UCLOG").font = font(10, True)
wpar.column_dimensions["A"].width = 42; wpar.column_dimensions["B"].width = 16; wpar.column_dimensions["C"].width = 16
wpar.cell(20, 1, "Nota: las tarifas son estimaciones editables; reemplácelas por la consulta oficial del SICETAC (sicetac.gov.co).").font = font(8, it=True, color="808080")

# ============================================================ 2) TABLERO (al frente)
wst = wb.create_sheet("Tablero", 1)
wst.sheet_view.showGridLines = False
titulo(wst, "TABLERO DE PLANEACIÓN DE VEHÍCULOS — DIC", "Estado de la demanda, flota y pronóstico · alertas de capacidad", 12)
# KPI cards
def card(ws, r, c, label, value, color=AZUL, fmt=None, formula=False):
    ws.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c+1)
    ws.cell(r, c, label).font = font(9, True, BLANCO); ws.cell(r, c).fill = fill(color)
    ws.cell(r, c).alignment = center
    ws.merge_cells(start_row=r+1, start_column=c, end_row=r+2, end_column=c+1)
    cell = ws.cell(r+1, c, value); cell.font = font(18, True, color)
    cell.alignment = center; cell.fill = fill(GRIS)
    if fmt: cell.number_format = fmt
    for rr in (r, r+1, r+2):
        for cc in (c, c+1):
            ws.cell(rr, cc).border = border
cards = [
    ("DEMANDA MEDIA (hábil)", kpis["vehiculos_dia_habil_prom"], AZUL, '#,##0'),
    ("PRONÓSTICO 7 DÍAS (veh.)", kpis["demanda_esperada_7d"], NAR, '#,##0'),
    ("RESERVA SUGERIDA 7D", kpis["reserva_proxima_semana"], ROJO, '#,##0'),
    ("PRECISIÓN (WAPE sem.)", kpis["wape_semanal_%"]/100, VERDE, '0.0%'),
    ("% TERCEROS", kpis["part_terceros_%"]/100, AZUL, '0%'),
    ("% RETORNO VACÍO (zonal)", kpis["deadhead_ratio_zonal_%"]/100, ROJO, '0%'),
]
cc = 1
for i, (lb, val, col, fmt) in enumerate(cards):
    card(wst, 4, cc, lb, val, col, fmt); cc += 2
    if cc > 11: cc = 1
# fila alertas
wst.cell(8, 1, "ALERTAS").font = font(11, True, ROJO)
alertas = [
    (f"Reservar {kpis['reserva_proxima_semana']:,} vehículos la próxima semana (demanda {kpis['demanda_esperada_7d']:,} + colchón).", ROJO),
    (f"Flota propia+afiliada cubre solo ~{kpis['part_flota_propia_amplia_%']:.0f}% — contratar terceros con anticipación.", NAR),
    (f"Retorno vacío {kpis['deadhead_ratio_zonal_%']}–{kpis['deadhead_ratio_pairwise_%']}% de los viajes: activar backhaul en rutas de riesgo.", NAR),
]
for i, (a, col) in enumerate(alertas, 9):
    wst.merge_cells(start_row=i, start_column=1, end_row=i, end_column=12)
    wst.cell(i, 1, "⚠ " + a).font = font(10, True, col); wst.cell(i, 1).fill = fill(AMAR)
    wst.cell(i, 1).alignment = left
# recomendaciones
wst.cell(13, 1, "RECOMENDACIONES CLAVE").font = font(11, True, NAVY)
for i, rrec in enumerate(recs["recomendaciones"][:6], 14):
    wst.merge_cells(start_row=i, start_column=1, end_row=i, end_column=12)
    wst.cell(i, 1, f"{i-13}. {rrec}").font = font(9); wst.cell(i, 1).alignment = left
    wst.row_dimensions[i].height = 26
for i in range(1, 13): wst.column_dimensions[get_column_letter(i)].width = 12

# orden de hojas
wb.move_sheet("Portada", -wb.sheetnames.index("Portada"))
wb.save(OUT)
print("Dashboard guardado en", OUT)
print("Hojas:", wb.sheetnames)
