"""
Módulo geográfico y de tarifas (aproximación tipo SICETAC).

- Coordenadas de los municipios que concentran >99% de los viajes.
- Distancia carretera estimada = haversine * 1.30 (factor de sinuosidad vial).
- Modelo de costo de flete parametrizado por tipología de vehículo, calibrado en
  el orden de magnitud de los valores públicos del SICETAC (Colombia, 2024-2025).

IMPORTANTE: los valores COP/km y los mínimos son PARÁMETROS EDITABLES. Para uso
en producción reemplácelos por la consulta oficial del SICETAC
(https://www.sicetac.gov.co) origen-destino-configuración. El pipeline y el
dashboard leen estos parámetros desde aquí, de modo que actualizar la tarifa es
cambiar una sola tabla.
"""
from __future__ import annotations
import math

# Coordenadas (lat, lon) — municipios principales de la operación
COORDS = {
    "MADRID": (4.732, -74.264), "SOPO": (4.907, -73.940), "GIRARDOTA": (6.379, -75.446),
    "SABANETA": (6.151, -75.616), "SOACHA": (4.579, -74.217), "YUMBO": (3.585, -76.498),
    "SABANAGRANDE": (10.792, -74.922), "CARTAGENA": (10.391, -75.479), "RIONEGRO": (6.155, -75.374),
    "BOGOTA D.C.": (4.711, -74.072), "BOGOTA": (4.711, -74.072), "FUNZA": (4.716, -74.211),
    "BUENAVENTURA": (3.884, -77.020), "CALDAS": (6.091, -75.636), "SONSON": (5.711, -75.310),
    "IBAGUE": (4.439, -75.232), "ENVIGADO": (6.166, -75.582), "LA ESTRELLA": (6.157, -75.643),
    "COTA": (4.809, -74.102), "PALMAR DE VARELA": (10.740, -74.755), "MALAMBO": (10.859, -74.774),
    "PUERTO TEJADA": (3.234, -76.419), "BUCARAMANGA": (7.119, -73.122), "MANIZALES": (5.070, -75.517),
    "CALI": (3.452, -76.532), "SANTA MARTA": (11.241, -74.199), "NOBSA": (5.767, -72.937),
    "MIRANDA": (3.253, -76.228), "ITAGUI": (6.172, -75.612), "MEDELLIN": (6.244, -75.573),
    "EL CERRITO": (3.686, -76.313), "SOGAMOSO": (5.714, -72.933), "SESQUILE": (5.044, -73.797),
    "COELLO": (4.288, -74.893), "BARRANQUILLA": (10.969, -74.796), "LA TEBAIDA": (4.451, -75.790),
    "MOSQUERA": (4.706, -74.230), "ZIPAQUIRA": (5.022, -74.004), "GUADALAJARA DE BUGA": (3.901, -76.298),
    "PALMIRA": (3.539, -76.303), "VILLAVICENCIO": (4.142, -73.626), "BELLO": (6.337, -75.558),
    "CUCUTA": (7.894, -72.507), "PEREIRA": (4.813, -75.696), "PASTO": (1.214, -77.281),
    "ARMENIA": (4.535, -75.681), "DOSQUEBRADAS": (4.836, -75.677), "SINCELEJO": (9.304, -75.397),
    "VALLEDUPAR": (10.463, -73.253), "POPAYAN": (2.444, -76.614), "MONTERIA": (8.748, -75.881),
    "CARTAGO": (4.746, -75.912), "TULUA": (4.085, -76.196), "MAICAO": (11.378, -72.239),
    "TOCANCIPA": (4.964, -73.912), "UBAQUE": (4.484, -73.933), "CHIA": (4.862, -74.058),
    "FACATATIVA": (4.816, -74.355), "GIRON": (7.069, -73.169), "FLORIDABLANCA": (7.063, -73.086),
    "TENJO": (4.870, -74.145), "CAJICA": (4.918, -74.026), "APARTADO": (7.884, -76.627),
    "MAGANGUE": (9.241, -74.755), "TULA": (4.085, -76.196), "NEIVA": (2.937, -75.281),
    "GIRARDOT": (4.303, -74.801), "DUITAMA": (5.827, -73.034), "TUNJA": (5.539, -73.368),
}

# Centroides de zona (respaldo cuando la ciudad no está geocodificada)
ZONA_CENTROIDE = {
    "Zona Cundinamarca": (4.711, -74.072), "Zona Noroccidental": (6.244, -75.573),
    "Zona Costa Atlántica": (10.969, -74.796), "Zona Sur Occidental": (3.452, -76.532),
    "Zona Centro": (4.439, -75.232), "Zona Nororiental": (7.119, -73.122),
    "Zona Eje Cafetero": (4.813, -75.696), "Zona Sur": (2.937, -75.281),
}

FACTOR_VIA = 1.30  # sinuosidad: km carretera ~ 1.3 * distancia en línea recta

# Modelo de costo tipo SICETAC (COP) — EDITABLE
TARIFA = {
    #                 COP/km   mínimo COP
    "TRACTOMULA":   (5500,   350000),
    "CUATROMANOS":  (4500,   320000),
    "DOBLETROQUE":  (4200,   280000),
    "SENCILLO":     (3200,   200000),
    "TURBO":        (2600,   160000),
    "CAMIONETA":    (1800,   120000),
}
TARIFA_DEFAULT = (3500, 220000)


def haversine(a, b) -> float:
    (la1, lo1), (la2, lo2) = a, b
    R = 6371.0
    p1, p2 = math.radians(la1), math.radians(la2)
    dphi = math.radians(la2 - la1)
    dlmb = math.radians(lo2 - lo1)
    h = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dlmb/2)**2
    return 2 * R * math.asin(math.sqrt(h))


def coord(ciudad: str, zona: str | None = None):
    ciudad = str(ciudad).strip().upper()
    if ciudad in COORDS:
        return COORDS[ciudad]
    if zona in ZONA_CENTROIDE:
        return ZONA_CENTROIDE[zona]
    return None


def distancia_km(o_ciudad, d_ciudad, o_zona=None, d_zona=None) -> float | None:
    co, cd = coord(o_ciudad, o_zona), coord(d_ciudad, d_zona)
    if co is None or cd is None:
        return None
    km = haversine(co, cd) * FACTOR_VIA
    return round(km, 1)


def costo_flete(km: float | None, tipologia: str) -> float | None:
    if km is None:
        return None
    cpk, minimo = TARIFA.get(str(tipologia).upper(), TARIFA_DEFAULT)
    return round(max(minimo, km * cpk), 0)


if __name__ == "__main__":
    for o, d, t in [("MADRID", "BOGOTA D.C.", "SENCILLO"),
                    ("SOPO", "CARTAGENA", "TRACTOMULA"),
                    ("GIRARDOTA", "CALI", "TRACTOMULA")]:
        km = distancia_km(o, d)
        print(f"{o} -> {d} [{t}]: {km} km  |  flete ~ ${costo_flete(km, t):,.0f} COP")
