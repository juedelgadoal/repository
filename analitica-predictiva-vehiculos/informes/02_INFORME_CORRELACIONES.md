# Informe de Correlaciones y Variables Influyentes
### Fase 3 (Correlaciones) y Fase 4 (Ingeniería de variables)

---

## 1. Metodología

Se calcularon las matrices de correlación de **Pearson** (lineal), **Spearman**
(monotónica por rangos) y **Kendall** (concordancia por pares) sobre la tabla diaria
agregada. Para variables categóricas frente a variables numéricas se usó la **razón de
correlación η** (raíz de la proporción de varianza explicada). La multicolinealidad se
midió con el **VIF** (Factor de Inflación de la Varianza). Mapas de calor en
`outputs/graficos/fase3_heatmap_pearson.png` y `_spearman.png`.

## 2. Correlación de cada variable con la demanda diaria de vehículos

| Variable | Pearson | Spearman | Kendall | Tipo |
|---|---|---|---|---|
| placas_activas | 0,986 | 0,964 | 0,855 | **Endógena** |
| viajes_terceros | 0,987 | 0,957 | 0,837 | **Endógena** |
| toneladas | 0,982 | 0,951 | 0,829 | **Endógena** |
| corredores_activos | 0,973 | 0,903 | 0,752 | **Endógena** |
| viajes_propia | 0,692 | 0,666 | 0,495 | Endógena |
| **habil** | **0,702** | **0,665** | **0,544** | **Exógena (predictora)** |
| clientes_activos | 0,629 | 0,602 | 0,448 | Endógena |
| **fin_de_semana** | **-0,536** | **-0,540** | **-0,442** | **Exógena (predictora)** |
| sin7 (Fourier semanal) | 0,484 | 0,522 | 0,364 | Exógena |
| **lag14** (demanda 14 días antes) | 0,589 | 0,498 | 0,354 | **Exógena (predictora)** |
| **lag7** | 0,556 | 0,466 | 0,340 | **Exógena (predictora)** |
| **festivo** | -0,426 | -0,333 | -0,272 | **Exógena (predictora)** |
| roll30_mean | 0,112 | 0,209 | 0,140 | Exógena |
| fin_de_mes | 0,110 | 0,162 | 0,133 | Exógena |
| tendencia (t) | 0,031 | 0,105 | 0,073 | Exógena |

### 2.1 La distinción crítica: correlación ≠ capacidad predictiva

Las variables de mayor correlación (`placas_activas`, `viajes_terceros`, `toneladas`,
`corredores_activos`, con |r| > 0,95) son **endógenas**: se miden *al mismo tiempo* que
la demanda y son prácticamente el mismo número contado de otra forma (más viajes ⇒ más
placas ⇒ más toneladas). **No sirven para pronosticar** porque no se conocen antes de
que ocurra la operación.

Las variables **realmente útiles para anticipar** la demanda son:

- **De calendario** (se conocen con meses de antelación): `habil` (r=0,70), `fin_de_semana`
  (r=−0,54), `festivo` (r=−0,43), términos de Fourier semanales.
- **Rezagos autoregresivos** (se conocen al momento de planear): `lag7` (r=0,56),
  `lag14` (r=0,59), medias móviles.

Esta separación es la que define el conjunto de features del modelo (Fase 7) y evita
la **fuga de información** que inflaría artificialmente la precisión.

## 3. Multicolinealidad y redundancia

**VIF (top):** `fin_de_semana` 137, `habil` 129, `placas_activas` 101,
`corredores_activos` 53, `toneladas` 48, `viajes_terceros` 43. Valores tan altos
confirman redundancia severa entre las variables endógenas y entre `habil`/`fin_de_semana`
(que son casi complementarias).

**Pares redundantes (|Pearson| ≥ 0,9):** `viajes ≈ placas_activas ≈ viajes_terceros ≈
toneladas ≈ corredores_activos` (todos entre sí > 0,94); y `mes ≈ trimestre` (0,97).

**Consecuencia de modelado:** se conserva **una sola** de las variables endógenas como
objetivo (`viajes`) y se descartan las demás como predictoras; de `mes`/`trimestre` se
usa `mes`. `habil` y `fin_de_semana` no se usan simultáneamente en la versión lineal
final (se resuelve con dummies de día de la semana).

## 4. Variables más influyentes (entregable 4)

Combinando correlación, VIF y razón η, el orden de influencia **utilizable** para la
planeación es:

1. **Día de la semana** (dummies) — reproduce el pico martes-miércoles y el mínimo del
   domingo; es el factor de mayor poder explicativo exógeno.
2. **Día hábil / festivo** — un festivo reduce la demanda ~91 %; `habil` es la variable
   exógena de mayor correlación (0,70).
3. **Rezagos semanales `lag7` y `lag14`** — capturan el nivel reciente y la inercia.
4. **Medias móviles `roll7`/`roll30`** — nivel suavizado.
5. **Estacionalidad anual (Fourier `sin365`/`cos365`)** y **fin/inicio de mes** —
   ajustes de segundo orden.

Para el **peso** (que determina la tipología a contratar), la razón de correlación η
ordena así el poder explicativo de las categóricas:

| Variable categórica | η vs peso | Lectura |
|---|---|---|
| **Tipología de camión** | **0,895** | Casi determina el peso: planear tipología = planear capacidad |
| Negocio | 0,494 | Cada negocio tiene un perfil de carga propio |
| Tipo Transportador | 0,362 | Propia/terceros difieren en carga típica |
| Tipo Viaje | 0,340 | Exportación/nacional pesan más que urbano |
| Zona Origen / Destino | 0,23 / 0,18 | Efecto geográfico moderado |

## 5. Fase 4 — Ingeniería de variables (justificación estadística)

Se derivaron variables nuevas, cada una justificada por su aporte medido:

| Variable derivada | Justificación estadística |
|---|---|
| `dow` / dummies día semana | Estacionalidad semanal (domingo 0,16×, martes 1,31×); Spearman −0,48 |
| `festivo` | 26 festivos promedian 25 viajes/día vs 299 hábiles (−91 %) |
| `habil` | Variable exógena de mayor correlación con la demanda (Pearson 0,70) |
| `fin_de_semana` | Sábado opera, domingo casi no; Pearson −0,54 |
| `semana_iso`, `mes`, `trimestre` | Estacionalidad de mediano plazo; base de la agregación semanal |
| `fin_de_mes`, `inicio_de_mes` | Picos de cierre comercial; `fin_de_mes` Spearman +0,16 |
| `lag7…lag28` | Autocorrelación semanal (lag14 Pearson 0,59); predictores a 7+ días |
| `roll7/14/30_mean` | Nivel reciente; suaviza ruido diario |
| `sin7/cos7`, `sin365/cos365` | Fourier: estacionalidad continua sin explosión de dummies |
| `frec_cliente/corredor/placa` | Intensidad estructural; separa demanda estable de esporádica |
| `veh_por_pedido` | Vehículos por (fecha, cliente, corredor): tamaño de despacho |
| `peso_prom_corredor` | Fija la tipología requerida por corredor (η tipología→peso 0,895) |
| `índice_utilización_placa` | Viajes/mes por placa vs capacidad; mide ociosidad de flota propia |

> **Conclusión:** la demanda de vehículos se explica esencialmente por **calendario +
> inercia reciente**; la tipología (y por tanto la capacidad) se explica por el tipo de
> camión y el negocio. Estas dos relaciones sostienen todo el modelo predictivo.
