"""
Genera DATA_Sintetica_6000.xlsx: 6.000 viajes ficticios con la MISMA estructura
que Plantilla_Carga_DATA (hoja CARGA), para probar la macro de punta a punta.

Calibrado con los patrones de la operación real: mezcla de negocios, corredores
planta->ciudad, tipologías con su peso característico, split de flota y
estacionalidad semanal (domingos y festivos bajos) + tendencia suave.

TODO ES FICTICIO: placas, No. Viaje y volúmenes son simulados.
"""
import os, sys, random
import numpy as np
import pandas as pd

# Uso: python3 build_datos_sinteticos.py [semilla] [archivo_salida] [base_no_viaje]
SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 7
NOMBRE = sys.argv[2] if len(sys.argv) > 2 else "DATA_Sintetica_6000.xlsx"
ID_BASE = int(sys.argv[3]) if len(sys.argv) > 3 else 6100600000
random.seed(SEED); np.random.seed(SEED)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), NOMBRE)
N_OBJETIVO = 6000
FECHA_INI = pd.Timestamp("2026-01-15")
FECHA_FIN = pd.Timestamp("2026-07-24")

# Festivos de Colombia en la ventana (para deprimir la demanda esos días)
FESTIVOS = set(pd.to_datetime([
    "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-01", "2026-05-18",
    "2026-06-08", "2026-06-15", "2026-06-29"]).date)

# Perfil por día de semana (0=Lunes..6=Domingo) tomado del análisis real
DOW_FACTOR = {0: 0.97, 1: 1.31, 2: 1.27, 3: 1.15, 4: 1.12, 5: 1.03, 6: 0.16}

# --- Zonas por ciudad (para coherencia origen/destino) ---
ZONA = {
    "MADRID": "Zona Cundinamarca", "SOPO": "Zona Cundinamarca", "SOACHA": "Zona Cundinamarca",
    "FUNZA": "Zona Cundinamarca", "MOSQUERA": "Zona Cundinamarca", "COTA": "Zona Cundinamarca",
    "BOGOTA D.C.": "Zona Cundinamarca", "TOCANCIPA": "Zona Cundinamarca",
    "GIRARDOTA": "Zona Noroccidental", "SABANETA": "Zona Noroccidental", "RIONEGRO": "Zona Noroccidental",
    "MEDELLIN": "Zona Noroccidental", "BELLO": "Zona Noroccidental", "ITAGUI": "Zona Noroccidental",
    "ENVIGADO": "Zona Noroccidental", "LA ESTRELLA": "Zona Noroccidental", "CALDAS": "Zona Noroccidental",
    "YUMBO": "Zona Sur Occidental", "CALI": "Zona Sur Occidental", "PALMIRA": "Zona Sur Occidental",
    "BUENAVENTURA": "Zona Sur Occidental",
    "SABANAGRANDE": "Zona Costa Atlántica", "BARRANQUILLA": "Zona Costa Atlántica",
    "CARTAGENA": "Zona Costa Atlántica", "SANTA MARTA": "Zona Costa Atlántica", "MALAMBO": "Zona Costa Atlántica",
    "IBAGUE": "Zona Centro", "NEIVA": "Zona Sur", "PASTO": "Zona Sur",
    "BUCARAMANGA": "Zona Nororiental", "CUCUTA": "Zona Nororiental",
    "PEREIRA": "Zona Eje Cafetero", "MANIZALES": "Zona Eje Cafetero", "ARMENIA": "Zona Eje Cafetero",
}

# --- Corredores (origen, destino, tipo_viaje, peso relativo) ---
CORREDORES = [
    ("MADRID", "BOGOTA D.C.", "URBANO", 11), ("SOPO", "BOGOTA D.C.", "URBANO", 8),
    ("SOACHA", "BOGOTA D.C.", "URBANO", 7), ("MADRID", "FUNZA", "URBANO", 5),
    ("SABANETA", "MEDELLIN", "URBANO", 8), ("GIRARDOTA", "MEDELLIN", "URBANO", 4),
    ("RIONEGRO", "MEDELLIN", "URBANO", 3), ("YUMBO", "CALI", "URBANO", 6),
    ("SABANAGRANDE", "BARRANQUILLA", "URBANO", 4), ("CARTAGENA", "CARTAGENA", "EXPORTACION", 4),
    ("MADRID", "MEDELLIN", "NACIONAL", 5), ("SOPO", "CALI", "NACIONAL", 4),
    ("MADRID", "BARRANQUILLA", "NACIONAL", 3), ("SOPO", "CARTAGENA", "NACIONAL", 3),
    ("SABANETA", "BOGOTA D.C.", "NACIONAL", 4), ("YUMBO", "BOGOTA D.C.", "NACIONAL", 3),
    ("MADRID", "BUCARAMANGA", "NACIONAL", 2), ("MADRID", "PEREIRA", "NACIONAL", 3),
    ("SABANETA", "PASTO", "NACIONAL", 1), ("MADRID", "IBAGUE", "NACIONAL", 2),
    ("SABANAGRANDE", "CARTAGENA", "EXPORTACION", 3), ("YUMBO", "BUENAVENTURA", "EXPORTACION", 3),
    ("MADRID", "SANTA MARTA", "NACIONAL", 2), ("GIRARDOTA", "ARMENIA", "NACIONAL", 2),
    ("SOPO", "CUCUTA", "NACIONAL", 1), ("MADRID", "NEIVA", "NACIONAL", 2),
]
cor_pesos = np.array([c[3] for c in CORREDORES], float); cor_pesos /= cor_pesos.sum()

NEGOCIOS = ["REVESTIMIENTO", "PORCELANA SANITARIA", "SUMICOL", "CORLANC", "ALION", "LOCERIA",
            "TERNIUM", "GRIFERIA", "CLIENTES TERCEROS", "ESTUDIO CERAMICO", "AGROMIL", "GAMMA",
            "ALMACENES CORONA", "ERECOS"]
neg_pesos = np.array([43897, 25500, 20026, 12012, 10320, 4170, 3417, 3342, 3084, 2031,
                      2023, 1116, 591, 447], float); neg_pesos /= neg_pesos.sum()

# Tipología según tipo de viaje
TIPOS = ["TRACTOMULA", "DOBLETROQUE", "SENCILLO", "TURBO", "CUATROMANOS", "CAMIONETA"]
TIPOL_POR_VIAJE = {
    "URBANO":      [0.02, 0.12, 0.38, 0.35, 0.01, 0.12],
    "NACIONAL":    [0.48, 0.22, 0.20, 0.07, 0.02, 0.01],
    "EXPORTACION": [0.85, 0.10, 0.05, 0.00, 0.00, 0.00],
    "IMPORTACION": [0.80, 0.12, 0.08, 0.00, 0.00, 0.00],
}
# Peso ~ N(media, sd) recortado por tipología (toneladas)
PESO = {"CAMIONETA": (1.3, 0.8, 0.1, 8), "TURBO": (3.5, 1.5, 0.1, 18),
        "SENCILLO": (7.9, 2.2, 0.1, 34), "DOBLETROQUE": (15.2, 2.6, 0.5, 35),
        "CUATROMANOS": (17.0, 3.2, 3, 32), "TRACTOMULA": (28.0, 7.0, 1, 39.5)}
# Probabilidad de flota propia/empresas según tipología (resto Terceros)
P_PROPIA = {"TRACTOMULA": 0.18, "SENCILLO": 0.02, "TURBO": 0.05}
P_EMPRESAS = {"TRACTOMULA": 0.25, "DOBLETROQUE": 0.03, "SENCILLO": 0.06, "TURBO": 0.04}

def placa():
    L = "ABCDEFGHJKLMNPRSTUVWXYZ"
    return "".join(random.choice(L) for _ in range(3)) + f"{random.randint(0,999):03d}"

POOL = {"Flota Propia": [placa() for _ in range(80)],
        "Empresas": [placa() for _ in range(400)],
        "Terceros": [placa() for _ in range(1500)]}

# ---- 1) Conteo de viajes por día (estacionalidad + tendencia + ruido) ----
dias = pd.date_range(FECHA_INI, FECHA_FIN, freq="D")
w = []
for i, d in enumerate(dias):
    f = DOW_FACTOR[d.dayofweek]
    if d.date() in FESTIVOS: f *= 0.15
    f *= (1 + 0.0008 * i)                       # tendencia suave
    f *= np.random.uniform(0.85, 1.15)          # ruido diario
    w.append(f)
w = np.array(w); conteo = np.maximum(0, np.round(w / w.sum() * N_OBJETIVO)).astype(int)
# Ajuste fino para totalizar exactamente 6000
dif = N_OBJETIVO - conteo.sum()
habiles = [i for i, d in enumerate(dias) if d.dayofweek < 5 and d.date() not in FESTIVOS]
i = 0
while dif != 0 and habiles:
    j = habiles[i % len(habiles)]
    conteo[j] += 1 if dif > 0 else -1
    dif += -1 if dif > 0 else 1
    i += 1

# ---- 2) Generar las filas ----
filas = []
nviaje = ID_BASE
for d, n in zip(dias, conteo):
    for _ in range(int(n)):
        ci = np.random.choice(len(CORREDORES), p=cor_pesos)
        o, dest, tviaje, _pw = CORREDORES[ci]
        neg = np.random.choice(NEGOCIOS, p=neg_pesos)
        tip = np.random.choice(TIPOS, p=TIPOL_POR_VIAJE.get(tviaje, TIPOL_POR_VIAJE["NACIONAL"]))
        mu, sd, lo, hi = PESO[tip]
        peso = round(float(np.clip(np.random.normal(mu, sd), lo, hi)), 2)
        # flota condicionada a la tipología
        r = np.random.random()
        if r < P_PROPIA.get(tip, 0): flota = "Flota Propia"
        elif r < P_PROPIA.get(tip, 0) + P_EMPRESAS.get(tip, 0): flota = "Empresas"
        else: flota = "Terceros"
        # cliente / tipo negocio
        if neg == "ALION":
            tneg, cliente = "Alion", "CEMENTOS"
        elif neg == "TERNIUM":
            tneg, cliente = "CI", "TERNIUM"
        elif np.random.random() < 0.05:
            tneg, cliente = "VT", "CI"
        else:
            tneg, cliente = "CI", "CI"
        nviaje += 1
        filas.append([
            nviaje, neg, o, dest, d, ZONA.get(dest, "Zona Cundinamarca"), tip, flota, tneg,
            d.month, d.year, f"{d.year}-{d.month:02d}", tviaje, ZONA.get(o, "Zona Cundinamarca"),
            cliente, random.choice(POOL[flota]), peso])

COLS = ["No. Viaje", "Negocio", "Ciudad Origen", "Ciudad Destino", "Fecha", "Zona Destino",
        "Tipología de camión", "Tipo Transportador", "Tipo Negocio", "MES", "AÑO", "Mes - Año",
        "Tipo Viaje", "Zona Origen", "CLIENTE", "PLACA", "PESO CARGADO (ton)"]
df = pd.DataFrame(filas, columns=COLS).sample(frac=1, random_state=SEED).reset_index(drop=True)

with pd.ExcelWriter(OUT, engine="openpyxl", datetime_format="yyyy-mm-dd") as xw:
    df.to_excel(xw, sheet_name="CARGA", index=False)

print(f"Generados {len(df)} registros | {df['Fecha'].dt.date.nunique()} días "
      f"({df['Fecha'].min().date()} a {df['Fecha'].max().date()})")
print("\nPor tipo de transportador:\n", df["Tipo Transportador"].value_counts(normalize=True).round(3).to_string())
print("\nPeso medio por tipología:\n", df.groupby("Tipología de camión")["PESO CARGADO (ton)"].mean().round(2).to_string())
print("\nViajes por día de semana (0=Lun):\n", df["Fecha"].dt.dayofweek.value_counts().sort_index().to_string())
print("\nArchivo:", OUT)
