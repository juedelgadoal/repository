"""
Genera Plantilla_Carga_DATA.xlsx: la plantilla que el usuario llena (o exporta
desde su TMS) y deja en la carpeta 'Entrada' para alimentar la macro.
Encabezados = los que la macro reconoce (tolera orden y tildes).
"""
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Plantilla_Carga_DATA.xlsx")
NAVY, GRIS, AMAR = "1F4E79", "F2F4F7", "FFF2CC"
F = "Arial"
def font(sz=10, b=False, c="000000", it=False): return Font(name=F, size=sz, bold=b, color=c, italic=it)
def fill(c): return PatternFill("solid", fgColor=c)
thin = Side(style="thin", color="BFBFBF"); border = Border(thin, thin, thin, thin)

COLS = ["No. Viaje", "Negocio", "Ciudad Origen", "Ciudad Destino", "Fecha", "Zona Destino",
        "Tipología de camión", "Tipo Transportador", "Tipo Negocio", "MES", "AÑO", "Mes - Año",
        "Tipo Viaje", "Zona Origen", "CLIENTE", "PLACA", "PESO CARGADO (ton)"]
EJEMPLO = [6100999001, "REVESTIMIENTO", "MADRID", "BOGOTA D.C.", "2026-07-01", "Zona Cundinamarca",
           "SENCILLO", "Terceros", "CI", 7, 2026, "2026-07", "URBANO", "Zona Cundinamarca",
           "CI", "ABC123", 9.5]

wb = Workbook()

# ---------- Hoja CARGA (encabezados en fila 1, ejemplo en fila 2) ----------
ws = wb.active; ws.title = "CARGA"
for j, (h, ej) in enumerate(zip(COLS, EJEMPLO), 1):
    c = ws.cell(1, j, h); c.font = font(9, True, "FFFFFF"); c.fill = fill(NAVY)
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True); c.border = border
    e = ws.cell(2, j, ej); e.font = font(9, it=True, c="7F7F7F"); e.fill = fill(AMAR); e.border = border
    if h == "Fecha": e.number_format = "yyyy-mm-dd"
    if h == "PESO CARGADO (ton)": e.number_format = "0.00"
    ws.column_dimensions[get_column_letter(j)].width = max(12, min(20, len(h) + 2))
ws.freeze_panes = "A2"
# marca visual de la fila ejemplo
ws.cell(2, 1).comment = None

# ---------- Hoja LEEME (diccionario y reglas) ----------
wl = wb.create_sheet("LEEME")
wl.sheet_view.showGridLines = False
wl.column_dimensions["A"].width = 26; wl.column_dimensions["B"].width = 16; wl.column_dimensions["C"].width = 60
wl.merge_cells("A1:C1"); t = wl["A1"]; t.value = "PLANTILLA DE CARGA — Cómo llenarla"
t.font = font(14, True, "FFFFFF"); t.fill = fill(NAVY); t.alignment = Alignment(vertical="center", indent=1)
wl.row_dimensions[1].height = 26
reglas = [
    ("", "", ""),
    ("Instrucciones", "", ""),
    ("• En la hoja CARGA, reemplace la fila 2 (EJEMPLO, en amarillo) por sus datos reales.", "", ""),
    ("• Una fila = un viaje = un vehículo despachado. No deje filas en blanco intermedias.", "", ""),
    ("• Puede pegar miles de filas. El orden de las columnas puede variar; la macro las reconoce por nombre.", "", ""),
    ("• Las tildes son opcionales (AÑO = ANIO, Tipología = Tipologia).", "", ""),
    ("• Guarde el archivo en la carpeta 'Entrada' (junto al Dashboard) y pulse ACTUALIZAR TODO.", "", ""),
    ("", "", ""),
    ("Columna", "¿Obligatoria?", "Formato / valores esperados"),
]
r = 2
for a, b, c in reglas:
    ca = wl.cell(r, 1, a); ca.font = font(10, True, NAVY) if b == "" and a and not a.startswith("•") else font(9)
    if a.startswith("•"): ca.font = font(9)
    wl.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3) if b == "" and not a.startswith("Columna") else None
    if a == "Columna":
        for k, txt in enumerate([a, b, c], 1):
            hc = wl.cell(r, k, txt); hc.font = font(9, True, "FFFFFF"); hc.fill = fill(NAVY); hc.border = border
    r += 1
DIC = [
    ("No. Viaje", "Sí", "Identificador único del viaje (número o texto). Los repetidos se eliminan."),
    ("Negocio", "Recom.", "Unidad de negocio (REVESTIMIENTO, SUMICOL, ALION, …)."),
    ("Ciudad Origen", "Sí", "Ciudad de cargue (texto). Ej.: MADRID, SOPO, YUMBO."),
    ("Ciudad Destino", "Sí", "Ciudad de descargue (texto). Ej.: BOGOTA D.C., MEDELLIN."),
    ("Fecha", "Sí", "Fecha del viaje. Formato fecha real (aaaa-mm-dd). Es la variable crítica."),
    ("Zona Destino", "Recom.", "Zona logística de destino (Zona Cundinamarca, Zona Costa Atlántica, …)."),
    ("Tipología de camión", "Recom.", "TRACTOMULA, SENCILLO, TURBO, DOBLETROQUE, CUATROMANOS, CAMIONETA."),
    ("Tipo Transportador", "Recom.", "Flota Propia, Empresas o Terceros."),
    ("Tipo Negocio", "Opc.", "CI, Alion, VT, …"),
    ("MES", "Auto", "Se recalcula desde Fecha; puede dejarse vacío."),
    ("AÑO", "Auto", "Se recalcula desde Fecha; puede dejarse vacío."),
    ("Mes - Año", "Auto", "Se recalcula desde Fecha (aaaa-mm); puede dejarse vacío."),
    ("Tipo Viaje", "Opc.", "URBANO, NACIONAL, EXPORTACION, IMPORTACION, CROSSDOCKING…"),
    ("Zona Origen", "Recom.", "Zona logística de origen."),
    ("CLIENTE", "Recom.", "Cliente (CI para carga propia; nombre real si es externo)."),
    ("PLACA", "Sí", "Placa del vehículo (texto). Sin ella la fila se descarta."),
    ("PESO CARGADO (ton)", "Sí", "Peso en toneladas (número decimal). Ej.: 9.5, 34.0."),
]
for a, b, c in DIC:
    wl.cell(r, 1, a).font = font(9, True); wl.cell(r, 1).border = border
    bc = wl.cell(r, 2, b); bc.font = font(9); bc.alignment = Alignment(horizontal="center"); bc.border = border
    if b == "Sí": bc.fill = fill("C6EFCE")
    elif b == "Auto": bc.fill = fill(GRIS)
    wl.cell(r, 3, c).font = font(9); wl.cell(r, 3).border = border
    r += 1
wl.cell(r+1, 1, "Mínimo para pronosticar: 60 días de historia (idealmente todo el histórico disponible).").font = font(9, it=True, c="7F7F7F")
wb._sheets.sort(key=lambda s: 0 if s.title == "CARGA" else 1)
wb.save(OUT)
print("Plantilla guardada:", OUT, "| Hojas:", wb.sheetnames)
