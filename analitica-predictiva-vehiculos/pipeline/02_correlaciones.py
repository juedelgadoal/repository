"""
FASE 3 — Correlaciones (Pearson, Spearman, Kendall), multicolinealidad (VIF),
variables explicativas de la demanda, redundancia y razón de correlación (eta)
para variables categóricas. Genera mapas de calor y tablas.
"""
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from lib import cargar_data, construir_serie_diaria, OUT_TAB, OUT_FIG

plt.rcParams.update({"figure.dpi": 110, "font.size": 9})

df = cargar_data()
daily = construir_serie_diaria(df)

# Solo días con operación normal para no contaminar con ceros de festivos/domingos
d = daily.copy()

FEATS = ["viajes", "toneladas", "ton_prom", "placas_activas", "clientes_activos",
         "corredores_activos", "viajes_propia", "viajes_terceros",
         "dow", "mes", "trimestre", "festivo", "habil", "fin_de_semana",
         "fin_de_mes", "t", "lag7", "lag14", "roll7_mean", "roll30_mean",
         "sin7", "cos7"]
M = d[FEATS].dropna()

# ---- Matrices de correlación ----
mats = {}
for metodo in ["pearson", "spearman", "kendall"]:
    C = M.corr(method=metodo)
    C.to_csv(f"{OUT_TAB}/fase3_corr_{metodo}.csv")
    mats[metodo] = C

def heatmap(C, titulo, archivo):
    fig, ax = plt.subplots(figsize=(11, 9))
    im = ax.imshow(C.values, cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(C))); ax.set_xticklabels(C.columns, rotation=90, fontsize=7)
    ax.set_yticks(range(len(C))); ax.set_yticklabels(C.index, fontsize=7)
    for i in range(len(C)):
        for j in range(len(C)):
            v = C.values[i, j]
            if abs(v) >= 0.3:
                ax.text(j, i, f"{v:.2f}", ha="center", va="center",
                        color="white" if abs(v) > 0.6 else "black", fontsize=6)
    fig.colorbar(im, fraction=0.046, pad=0.04)
    ax.set_title(titulo)
    fig.tight_layout(); fig.savefig(archivo, dpi=120); plt.close(fig)

heatmap(mats["pearson"], "Matriz de correlación de Pearson (variables diarias)",
        f"{OUT_FIG}/fase3_heatmap_pearson.png")
heatmap(mats["spearman"], "Matriz de correlación de Spearman",
        f"{OUT_FIG}/fase3_heatmap_spearman.png")

# ---- Correlación de cada variable con la DEMANDA (viajes) ----
target = "viajes"
rank = pd.DataFrame({
    "pearson": mats["pearson"][target],
    "spearman": mats["spearman"][target],
    "kendall": mats["kendall"][target],
}).drop(index=target)
rank["abs_spearman"] = rank["spearman"].abs()
rank = rank.sort_values("abs_spearman", ascending=False).round(3)
rank.to_csv(f"{OUT_TAB}/fase3_correlacion_con_demanda.csv")
print("=== CORRELACIÓN DE VARIABLES CON LA DEMANDA DIARIA (viajes) ===")
print(rank.to_string())

# ---- Multicolinealidad: VIF ----
from statsmodels.stats.outliers_influence import variance_inflation_factor
from statsmodels.tools.tools import add_constant
X = M.drop(columns=["viajes"])
Xc = add_constant(X)
vif = pd.DataFrame({
    "variable": Xc.columns,
    "VIF": [variance_inflation_factor(Xc.values, i) for i in range(Xc.shape[1])]
}).query("variable != 'const'").sort_values("VIF", ascending=False).round(2)
vif.to_csv(f"{OUT_TAB}/fase3_vif.csv", index=False)
print("\n=== VIF (multicolinealidad) ===")
print(vif.to_string(index=False))

# ---- Pares redundantes (|r|>=0.9) ----
Cp = mats["pearson"].abs()
red = []
cols = Cp.columns
for i in range(len(cols)):
    for j in range(i + 1, len(cols)):
        if Cp.iloc[i, j] >= 0.9:
            red.append((cols[i], cols[j], round(mats["pearson"].iloc[i, j], 3)))
pd.DataFrame(red, columns=["var1", "var2", "pearson"]).to_csv(
    f"{OUT_TAB}/fase3_pares_redundantes.csv", index=False)
print("\n=== PARES REDUNDANTES (|Pearson|>=0.9) ===")
for r in red:
    print(r)

# ---- Razón de correlación (eta) categórica -> peso_ton y -> demanda-de-viajes ----
def eta_squared(cat: pd.Series, num: pd.Series) -> float:
    """Proporción de varianza de `num` explicada por la categórica `cat`."""
    grand = num.mean()
    ss_between = cat.to_frame("c").assign(n=num.values).groupby("c")["n"].apply(
        lambda g: len(g) * (g.mean() - grand) ** 2).sum()
    ss_total = ((num - grand) ** 2).sum()
    return ss_between / ss_total if ss_total else np.nan

eta_peso = {c: round(np.sqrt(eta_squared(df[c], df["peso_ton"])), 3) for c in
            ["Tipología de camión", "Tipo Viaje", "Negocio", "Tipo Transportador",
             "Zona Destino", "Zona Origen", "CLIENTE"]}
eta_peso = pd.Series(eta_peso).sort_values(ascending=False)
eta_peso.to_csv(f"{OUT_TAB}/fase3_eta_categoricas_peso.csv", header=["eta"])
print("\n=== RAZÓN DE CORRELACIÓN (eta) categóricas -> PESO ===")
print(eta_peso.to_string())

resumen = {
    "correlacion_demanda_top": rank.head(8)["spearman"].to_dict(),
    "vif_max": vif.iloc[0].to_dict(),
    "pares_redundantes": red,
    "eta_peso": eta_peso.to_dict(),
}
with open(f"{OUT_TAB}/fase3_resumen.json", "w") as fh:
    json.dump(resumen, fh, indent=2, ensure_ascii=False, default=float)

print("\n[OK] Fase 3 completada.")
