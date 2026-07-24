# Análisis Logístico y Retornos Vacíos
### Fase 5 (Clientes, Placas, Flota, Corredores) y Fase 6 (Retornos vacíos)

---

## 1. Clientes

Top por demanda (viajes) — el 68 % se concentra en tres unidades de negocio:

| Negocio | Viajes | % | Toneladas | Corredores | Perfil |
|---|---|---|---|---|---|
| REVESTIMIENTO | 43.897 | 33,3 % | 829.514 | 562 | Volumen + peso alto |
| PORCELANA SANITARIA | 25.500 | 19,3 % | 159.567 | 237 | Volumen, carga liviana |
| SUMICOL | 20.026 | 15,2 % | 361.934 | 282 | Volumen + peso alto |
| CORLANC | 12.012 | 9,1 % | 147.205 | 208 | Regional |
| ALION | 10.320 | 7,8 % | 132.192 | 224 | Cemento |

**Top por toneladas:** Revestimiento (830 mil t), Sumicol (362 mil t), Porcelana
(160 mil t). **Top por frecuencia de corredores:** Revestimiento (562 corredores
distintos) es el más disperso geográficamente y por tanto el más difícil de planear
sin anticipación.

## 2. Flota

| Tipo de transportador | Viajes | % | Placas | Viajes/placa | Lectura |
|---|---|---|---|---|---|
| **Terceros** | 104.243 | **79,0 %** | 1.740 | 59,9 | Dependencia alta; tarifa spot |
| Empresas (afiliadas) | 16.124 | 12,2 % | 3.753 | 4,3 | Muchas placas de uso esporádico |
| **Flota Propia** | 11.609 | **8,8 %** | **75** | **154,8** | Pocas placas muy exigidas |

**Participación propia+afiliada = 21 %.** La flota propia estricta son solo **75 placas**
pero con la mayor intensidad de uso (154,8 viajes/placa en 18 meses). La composición por
tipología muestra que **la flota propia es casi exclusivamente tractomula** (9.540 de
11.609 viajes), es decir, está especializada en larga distancia; el reparto urbano
depende casi por completo de terceros.

**Utilización promedio y demanda insatisfecha:** con ~340 viajes/semana de capacidad
propia+afiliada reciente frente a una demanda de ~1.831 viajes en 7 días, la flota
propia cubre estructuralmente ~19–21 % y el resto se contrata. La "demanda insatisfecha"
no es de mercado sino de **capacidad propia**: el 79 % restante se resuelve con terceros,
hoy sin anticipación.

## 3. Placas — utilización

- **Mayor utilización:** TMZ413 (67 viajes/mes, afiliada, tractomula), SNU310 (57/mes,
  terceros, turbo), SSQ211 y TJW794 (57/mes, propias, tractomula). Las placas propias de
  cabecera están cerca de su techo operativo.
- **Menor utilización (subutilizadas):** decenas de placas propias/afiliadas con 3
  viajes en 3 meses (índice de utilización ~0,02). Son candidatas a **reasignación,
  devolución o rotación**, pues inmovilizan capacidad sin uso.
- **Estabilidad:** placas con actividad en los 18 meses (estabilidad 1,0) son las
  idóneas para comprometer en contratos de volumen; las de baja estabilidad convienen
  para picos.

## 4. Corredores

**Top por demanda** (18 meses):

| Corredor | Viajes | CV mensual | Crecimiento | Nota |
|---|---|---|---|---|
| MADRID → BOGOTÁ | 6.522 | 8,8 % | +3,3 % | Muy estable; planta→ciudad |
| SOPÓ → BOGOTÁ | 4.820 | 11,1 % | −8,6 % | Estable |
| SABANETA → MEDELLÍN | 4.656 | 17,2 % | **+18,6 %** | Creciente |
| SOACHA → BOGOTÁ | 4.289 | 15,4 % | **+25,4 %** | Creciente |
| CARTAGENA → CARTAGENA | 3.881 | 53,5 % | −8,3 % | Intraurbano portuario, volátil |
| YUMBO → CALI | 3.695 | 14,1 % | **+34,0 %** | Alto crecimiento |

- **Mayor crecimiento:** Sopó→Madrid (+69 %), Yumbo→Cali (+34 %), Soacha→Bogotá (+25 %).
  Son los corredores que exigirán **más capacidad futura**.
- **Mayor variabilidad:** los intraurbanos de puerto (Cartagena→Cartagena, CV 53,5 %) y
  corredores de exportación esporádica; requieren colchón mayor.
- **Corredores críticos** (alta demanda × alta variabilidad): Madrid→Bogotá,
  Cartagena→Cartagena, Sabaneta→Medellín, Sopó→Bogotá, Soacha→Bogotá. Son los que más se
  benefician de anticipación (`fase5_corredores_criticos.csv`).

## 5. Fase 6 — Retornos vacíos

La base **no tiene** indicador de retorno vacío. Se infiere por **desbalance
direccional**: para cada par de ciudades {A,B}, si salen *x* viajes cargados de A→B y
solo *y* de B→A (con x>y), los *x−y* vehículos excedentes deben regresar **vacíos**.

### 5.1 Magnitud (dos estimaciones que acotan el fenómeno)

| Enfoque | Vehículos | % de viajes | Interpretación |
|---|---|---|---|
| **Pairwise** (par a par) | 100.421 | **76,1 %** | **Cota superior**: desbalance estructural puro |
| **Red zonal** (entradas − salidas) | 27.973 | **21,2 %** | **Piso**: reposición mínima entre zonas |

La realidad está en el rango 21 %–76 %; el enfoque pairwise sobreestima porque no
reconoce la **triangulación** (un camión entrega Madrid→Cartagena y toma otra carga
Cartagena→Bogotá). El enfoque zonal reconoce esa compensación de red. Un benchmark
típico para operaciones planta→distribución se ubica en **30–45 %**.

### 5.2 El origen del desbalance

El flujo es abrumadoramente **planta → ciudad**. El caso extremo: **Madrid → Bogotá
6.522 viajes cargados vs Bogotá → Madrid 33**. Las zonas se comportan así:

| Zona | Salidas | Entradas | Neto | Rol |
|---|---|---|---|---|
| Cundinamarca | 65.664 | 46.429 | **−19.235** | Gran origen (plantas Madrid, Sopó, Soacha) |
| Noroccidental | 38.768 | 30.030 | −8.738 | Origen (Sabaneta, Girardota) |
| Costa Atlántica | 14.179 | 21.456 | +7.277 | Destino neto |
| Centro | 1.914 | 7.179 | +5.265 | Destino neto |
| Sur Occidental | 10.611 | 15.627 | +5.016 | Destino neto |

Cundinamarca y Noroccidental (las zonas de planta) **envían 28 mil vehículos más de
los que reciben**: esos vehículos regresan vacíos hacia las plantas.

### 5.3 Rutas de mayor riesgo de retorno vacío

| Ruta (dominante) | Cargados | Reverso | Excedente vacío | Dist. (km) |
|---|---|---|---|---|
| MADRID → BOGOTÁ | 6.522 | 33 | 6.489 | 28 |
| SOPÓ → BOGOTÁ | 4.820 | 12 | 4.808 | 34 |
| SABANETA → MEDELLÍN | 4.656 | 4 | 4.652 | 15 |
| SOACHA → BOGOTÁ | 4.289 | 43 | 4.246 | 28 |
| YUMBO → CALI | 3.695 | 16 | 3.679 | 20 |
| SABANAGRANDE → BARRANQUILLA | 1.987 | 1 | 1.986 | 31 |

Nótese que las de mayor volumen son **urbanas cortas** (28–34 km): su costo unitario es
bajo, pero su frecuencia altísima. Las de larga distancia (Sopó→Cartagena, 823 km)
tienen menos excedente pero costo por retorno mucho mayor.

### 5.4 Clientes que generan más desbalance

| Negocio | Viajes | Retornos vacíos est. | % deadhead |
|---|---|---|---|
| CORLANC | 12.012 | 11.707 | **97,5 %** |
| ALION | 10.320 | 9.437 | 91,4 % |
| SUMICOL | 20.026 | 17.556 | 87,7 % |
| GRIFERIA | 3.342 | 2.958 | 88,5 % |
| REVESTIMIENTO | 43.897 | 37.372 | 85,1 % |

### 5.5 Costo estimado (tarifas tipo SICETAC, editable)

El costo de un trayecto vacío **no es el flete pleno** sino el costo variable
(combustible, peajes, conductor), estimado en **65 %** del flete. Distancias por
haversine × 1,3 (sinuosidad vial) y tarifa COP/km por tipología (ver
`pipeline/geo_tarifas.py`).

| Escenario | Costo 18 meses | Anualizado |
|---|---|---|
| Cota superior (flete pleno) | $98.610 M COP | $65.740 M COP/año |
| **Realista (costo variable 65 %)** | **$64.096 M COP** | **$42.731 M COP/año** |

> Cada punto porcentual de reducción del deadhead vale del orden de **$425 millones
> COP/año**. Es la mayor palanca de ahorro de la operación y el argumento económico más
> fuerte para pasar a planeación anticipada con backhaul.

**Nota metodológica:** todas las cifras de costo son estimaciones de orden de magnitud.
La base no contiene flete ni costo; reemplace las tarifas por la consulta oficial del
SICETAC (origen-destino-configuración) en la hoja *Parámetros* del dashboard.

*Gráficos:* `fase5_top_corredores.png`, `fase6_rutas_vacias.png`, `fase6_balance_zonas.png`.
