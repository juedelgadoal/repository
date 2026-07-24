"""
FASE 7 — Comparación de modelos predictivos de demanda de vehículos.

Se evalúa en las DOS unidades de decisión reales de la planeación:
  A) DIARIO a 7 días (perfil día a día para asignación operativa)
  B) SEMANAL a 1 semana (total de vehículos a reservar/contratar — meta <=10%)

Protocolo: BACKTEST DE ORIGEN RODANTE, sin fuga de información (los rezagos usan
solo valores reales conocidos al momento del origen). Errores agrupados de todos
los orígenes -> MAE, RMSE, MAPE, WAPE, R².

Modelos: Regresión Lineal, Regresión Múltiple, Árbol de Decisión, Random Forest,
Gradient Boosting, XGBoost, Prophet, ARIMA, SARIMA.
"""
import json, warnings, time
import numpy as np
import pandas as pd
warnings.filterwarnings("ignore")
from lib import cargar_data, construir_serie_diaria, construir_serie_semanal, metricas, OUT_TAB, FESTIVOS

from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

df = cargar_data()
daily = construir_serie_diaria(df)

# ---- Features enriquecidas para ML (one-hot de día de semana + banderas) ----
for k in range(7):
    daily[f"dow_{k}"] = (daily["dow"] == k).astype(int)
daily["post_festivo"] = daily["festivo"].shift(1).fillna(0).astype(int)
daily["pre_festivo"] = daily["festivo"].shift(-1).fillna(0).astype(int)
daily["roll7_mean"] = daily["roll7_mean"]  # ya existe
daily = daily.dropna(subset=["lag28", "roll30_mean"]).copy()

DOW_OH = [f"dow_{k}" for k in range(7)]
ML_FEATS = DOW_OH + ["mes", "trimestre", "festivo", "post_festivo", "pre_festivo",
            "fin_de_mes", "inicio_de_mes", "t", "lag7", "lag14", "lag21", "lag28",
            "roll7_mean", "roll14_mean", "roll30_mean", "sin365", "cos365"]
TARGET = "viajes"
fechas = daily.index
H = 7

# ============================================================ backtest común
def backtest(serie_df, feats, target, horizonte, n_orig, paso, min_hist,
             hacer_ts=True, ts_seasonal=7):
    fechas_ = serie_df.index
    origenes = [len(serie_df) - 1 - horizonte - k * paso for k in range(n_orig)][::-1]
    origenes = [o for o in origenes if o > min_hist]
    preds = {}

    def reg(modelo, idx_test, yhat):
        yhat = np.clip(np.asarray(yhat, float), 0, None)
        for i, pos in enumerate(idx_test):
            preds.setdefault(modelo, []).append(
                (fechas_[pos], serie_df[target].iloc[pos], yhat[i]))

    try:
        from xgboost import XGBRegressor
        HAS_XGB = True
    except Exception:
        HAS_XGB = False
    if hacer_ts:
        from statsmodels.tsa.statespace.sarimax import SARIMAX
        try:
            from prophet import Prophet
            import logging
            logging.getLogger("prophet").setLevel(logging.CRITICAL)
            logging.getLogger("cmdstanpy").setLevel(logging.CRITICAL)
            HAS_PROPHET = True
        except Exception:
            HAS_PROPHET = False

    for o in origenes:
        idx_tr = list(range(0, o + 1)); idx_te = list(range(o + 1, o + 1 + horizonte))
        tr = serie_df.iloc[idx_tr]; te = serie_df.iloc[idx_te]
        Xtr, ytr = tr[feats].values, tr[target].values
        Xte = te[feats].values

        # Regresión lineal simple (tendencia + Fourier)
        base_cols = [c for c in ["t", "sin7", "cos7", "sin365", "cos365"] if c in serie_df.columns]
        lm = LinearRegression().fit(tr[base_cols].values, ytr)
        reg("Regresión Lineal (tendencia)", idx_te, lm.predict(te[base_cols].values))

        reg("Regresión Múltiple (OLS)", idx_te, LinearRegression().fit(Xtr, ytr).predict(Xte))
        reg("Árbol de Decisión", idx_te, DecisionTreeRegressor(max_depth=6, min_samples_leaf=8,
             random_state=42).fit(Xtr, ytr).predict(Xte))
        reg("Random Forest", idx_te, RandomForestRegressor(n_estimators=300, max_depth=12,
             min_samples_leaf=3, n_jobs=-1, random_state=42).fit(Xtr, ytr).predict(Xte))
        reg("Gradient Boosting", idx_te, GradientBoostingRegressor(n_estimators=400, max_depth=3,
             learning_rate=0.05, subsample=0.9, random_state=42).fit(Xtr, ytr).predict(Xte))
        if HAS_XGB:
            reg("XGBoost", idx_te, XGBRegressor(n_estimators=500, max_depth=4, learning_rate=0.04,
                 subsample=0.9, colsample_bytree=0.9, random_state=42, n_jobs=-1,
                 verbosity=0).fit(Xtr, ytr).predict(Xte))
        if hacer_ts:
            try:
                reg("ARIMA (2,1,2)", idx_te, SARIMAX(ytr, order=(2, 1, 2),
                    enforce_stationarity=False, enforce_invertibility=False
                    ).fit(disp=False, maxiter=60).forecast(horizonte))
            except Exception:
                pass
            try:
                reg(f"SARIMA (1,0,1)(1,1,1){ts_seasonal}", idx_te, SARIMAX(ytr, order=(1, 0, 1),
                    seasonal_order=(1, 1, 1, ts_seasonal), enforce_stationarity=False,
                    enforce_invertibility=False).fit(disp=False, maxiter=60).forecast(horizonte))
            except Exception:
                pass
            if HAS_PROPHET:
                try:
                    dfp = pd.DataFrame({"ds": fechas_[idx_tr], "y": ytr})
                    hol = pd.DataFrame({"holiday": "festivo_col", "ds": pd.to_datetime(list(FESTIVOS))})
                    mp = Prophet(weekly_seasonality=True, yearly_seasonality=True,
                                 daily_seasonality=False, holidays=hol,
                                 seasonality_mode="multiplicative").fit(dfp)
                    reg("Prophet", idx_te, mp.predict(pd.DataFrame({"ds": fechas_[idx_te]}))["yhat"].values)
                except Exception:
                    pass

    filas = []
    for modelo, r in preds.items():
        yt = np.array([x[1] for x in r]); yp = np.array([x[2] for x in r])
        m = metricas(yt, yp); m["modelo"] = modelo; m["n"] = len(r)
        filas.append(m)
    res = pd.DataFrame(filas).set_index("modelo")[["MAE", "RMSE", "MAPE", "WAPE", "R2", "n"]]
    return res.sort_values("WAPE").round(2), preds

# ============================================================ A) DIARIO 7 días
print("=== A) BACKTEST DIARIO — horizonte 7 días ===")
t0 = time.time()
res_d, preds_d = backtest(daily, ML_FEATS, TARGET, H, n_orig=14, paso=7, min_hist=120,
                          hacer_ts=True, ts_seasonal=7)
print(res_d.to_string()); print(f"({time.time()-t0:.0f}s)")
res_d.to_csv(f"{OUT_TAB}/fase7_comparacion_DIARIO.csv")

# ============================================================ B) SEMANAL 1 sem
wk = construir_serie_semanal(daily).copy()
wk = wk[wk["dias_habiles"] >= 0]
wk["t"] = np.arange(len(wk))
wk["woy"] = wk.index.isocalendar().week.astype(int)
wk["mes"] = wk.index.month
wk["sin52"] = np.sin(2*np.pi*wk["woy"]/52); wk["cos52"] = np.cos(2*np.pi*wk["woy"]/52)
wk["sin7"], wk["cos7"] = 0.0, 0.0  # placeholders para base_cols
wk["sin365"], wk["cos365"] = wk["sin52"], wk["cos52"]
for L in (1, 2, 3, 4):
    wk[f"lagw{L}"] = wk["viajes"].shift(L)
wk["rollw4"] = wk["viajes"].shift(1).rolling(4).mean()
wk = wk.dropna(subset=["lagw4", "rollw4"]).copy()
# dias_habiles y festivos de la semana son CONOCIDOS de antemano (calendario)
WK_FEATS = ["dias_habiles", "festivos", "mes", "t", "lagw1", "lagw2", "lagw4",
            "rollw4", "sin52", "cos52"]
print("\n=== B) BACKTEST SEMANAL — horizonte 1 semana (meta <=10%) ===")
t0 = time.time()
res_w, preds_w = backtest(wk, WK_FEATS, "viajes", 1, n_orig=16, paso=1, min_hist=30,
                          hacer_ts=True, ts_seasonal=52)
print(res_w.to_string()); print(f"({time.time()-t0:.0f}s)")
res_w.to_csv(f"{OUT_TAB}/fase7_comparacion_SEMANAL.csv")

# ============================================================ selección
mejor_d = res_d.index[0]; mejor_w = res_w.index[0]
resumen = {
    "diario": {"mejor": mejor_d, "metricas": res_d.loc[mejor_d].to_dict(),
               "cumple_10pct_WAPE": bool(res_d.loc[mejor_d, "WAPE"] <= 10)},
    "semanal": {"mejor": mejor_w, "metricas": res_w.loc[mejor_w].to_dict(),
                "cumple_10pct_WAPE": bool(res_w.loc[mejor_w, "WAPE"] <= 10)},
}
with open(f"{OUT_TAB}/fase7_seleccion.json", "w") as fh:
    json.dump(resumen, fh, indent=2, ensure_ascii=False, default=float)

print(f"\n>>> DIARIO  mejor: {mejor_d}  WAPE={res_d.loc[mejor_d,'WAPE']}%  R2={res_d.loc[mejor_d,'R2']}")
print(f">>> SEMANAL mejor: {mejor_w}  WAPE={res_w.loc[mejor_w,'WAPE']}%  MAPE={res_w.loc[mejor_w,'MAPE']}%  R2={res_w.loc[mejor_w,'R2']}")
print("\n[OK] Fase 7 completada.")
