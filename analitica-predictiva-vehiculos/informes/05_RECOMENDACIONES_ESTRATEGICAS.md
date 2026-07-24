# Recomendaciones Estratégicas
### Fase 9 — De una operación reactiva a una predictiva

Cada recomendación se acompaña de su **soporte estadístico** y de una **acción
concreta**. El objetivo es reducir sobrecostos y anticipar la capacidad con 7 días.

---

## A. Planeación de capacidad (la decisión semanal)

**1. Reservar la demanda pronosticada + colchón, en vez de conseguir vehículos día a día.**
- *Soporte:* la demanda hábil tiene CV de solo 20,7 % y el modelo pronostica la semana
  con WAPE 7,4 %. Para la próxima semana: **1.831 vehículos esperados → reservar ~2.004**
  (colchón 9,5 % = 90 % de nivel de servicio).
- *Acción:* emitir la reserva los **jueves** para la semana siguiente, usando la hoja
  *Pronóstico* del dashboard.

**2. Dimensionar para el pico martes-miércoles, no para el promedio.**
- *Soporte:* índice de demanda martes 1,31× y miércoles 1,27× del promedio; usar el
  promedio dejaría ~30 % del martes descubierto.
- *Acción:* concentrar la mayor contratación en la primera mitad de la semana; liberar
  capacidad el domingo (0,16×).

**3. Leer el calendario de festivos antes de programar los lunes.**
- *Soporte:* los lunes promedian 234 viajes (por debajo del sábado) por los "puentes"
  de la Ley Emiliani; un festivo reduce la demanda ~91 %.
- *Acción:* el modelo ya incorpora `festivo`; validar puentes en el horizonte de 15-30
  días para no sobre-contratar.

## B. Flota propia vs terceros (poder de negociación)

**4. Saturar primero la flota propia y afiliada; contratar terceros para el excedente con anticipación.**
- *Soporte:* terceros = 79 % de los viajes; la flota propia (75 placas) solo 8,8 %, pero
  con la mayor intensidad (154,8 viajes/placa). Capacidad propia+afiliada reciente ~340
  viajes/semana (~19 %).
- *Acción:* asignar el 100 % de la flota propia a los corredores estables de alto volumen
  (Madrid→Bogotá, Sopó→Bogotá) y **contratar terceros con 7 días** para el resto (~1.491
  viajes/semana), pasando de tarifa spot a tarifa negociada.

**5. Racionalizar las placas propias subutilizadas.**
- *Soporte:* decenas de placas propias/afiliadas con ~3 viajes en 3 meses (índice de
  utilización ~0,02) inmovilizan capacidad.
- *Acción:* reasignar, rotar o devolver placas con utilización < 0,1 sostenida; redirigir
  esa capacidad a los corredores en crecimiento (Yumbo→Cali +34 %, Soacha→Bogotá +25 %).

## C. Retornos vacíos (la mayor palanca de ahorro)

**6. Activar carga de compensación (backhaul) en los corredores planta→ciudad de mayor desbalance.**
- *Soporte:* deadhead estimado 21 %–76 %; costo ~$42.700 M COP/año. Rutas críticas:
  Madrid→Bogotá (6.489 retornos vacíos), Sopó→Bogotá (4.808), Sabaneta→Medellín (4.652),
  Soacha→Bogotá (4.246), Yumbo→Cali (3.679).
- *Acción:* buscar carga de retorno ciudad→planta (proveedores de insumos, terceros) para
  las zonas destino netas (Costa +7.277, Centro +5.265, Sur Occidental +5.016). **Cada
  punto de reducción vale ~$425 M COP/año.**

**7. Priorizar acuerdos con los clientes que más desbalance generan.**
- *Soporte:* Corlanc (97,5 % deadhead), Alion (91,4 %), Sumicol (87,7 %), Revestimiento
  (85,1 %).
- *Acción:* negociar ventanas de recogida de retorno o tarifas ida-y-vuelta con estos
  negocios.

## D. Gobierno de la demanda (clientes)

**8. Exigir programación con 7 días de anticipación a los clientes de mayor volumen.**
- *Soporte:* Revestimiento, Porcelana Sanitaria y Sumicol concentran el **68 %** de la
  demanda; Revestimiento opera 562 corredores distintos (máxima dispersión).
- *Acción:* acuerdo de nivel de servicio (SLA) de pre-aviso a 7 días con estos tres
  negocios; su sola alineación hace planeable casi toda la operación.

**9. Anticipar capacidad en los corredores críticos y en crecimiento.**
- *Soporte:* corredores críticos (demanda × variabilidad): Madrid→Bogotá,
  Cartagena→Cartagena, Sabaneta→Medellín, Sopó→Bogotá, Soacha→Bogotá. Mayor crecimiento:
  Sopó→Madrid (+69 %), Yumbo→Cali (+34 %).
- *Acción:* contratos de volumen en corredores estables; colchón mayor en los volátiles
  (Cartagena intraurbano, CV 53,5 %).

## E. Control y alertas

**10. Operar con semáforo de capacidad automático.**
- *Soporte:* la meta operativa es no exceder ±10 % entre demanda esperada y capacidad.
- *Acción:* la macro emite **alerta roja** cuando el pronóstico semanal supera la
  capacidad comprometida en > 10 %, indicando cuántos vehículos adicionales contratar.

---

## Hoja de ruta de adopción (90 días)

| Fase | Semanas | Acción | Métrica de éxito |
|---|---|---|---|
| Piloto | 1–4 | Reserva semanal con el dashboard en los 3 clientes top | % demanda cubierta con reserva ≥ 80 % |
| Backhaul | 5–8 | Acuerdos de retorno en 5 rutas críticas | Reducción deadhead ≥ 3 pp |
| Escala | 9–12 | Extender a todos los negocios; SLA de pre-aviso 7 días | WAPE semanal ≤ 10 % sostenido |
| Institucional | 13+ | Macro un-botón semanal + informe PPT a gerencia | Ahorro spot vs negociado medido |

## Valor económico esperado (orden de magnitud)

- **Retornos vacíos:** reducir 5 pp de deadhead ≈ **$2.100 M COP/año**.
- **Tarifa:** migrar contratación de spot a negociada anticipada en el 79 % de terceros
  reduce el flete unitario (típico 5–12 % en el mercado colombiano).
- **Flota propia:** subir su utilización recupera capacidad hoy ociosa (placas < 0,1 de
  índice).

> Todas las cifras económicas son estimaciones de orden de magnitud sujetas a la carga
> de tarifas oficiales SICETAC; el valor estructural del cambio (pasar de reactivo a
> predictivo con 7 días) es independiente de la precisión exacta del costeo.
