# Auditoría del Flujo de Ejecución de la Macro
### Diagnóstico definitivo con evidencia del Log — Dashboard_Planeacion_Vehiculos__copia.xlsm

**Insumos auditados:** el `.xlsm` con la macro (copia en uso) y el archivo de
alimentación `Plantilla_Carga_DATA.xlsx` con 6.000 registros sintéticos.
**Método:** extracción del VBA real cargado (`olevba`), lectura de la hoja oculta
`Log` (bitácora de 5 corridas), validación del archivo de datos y **corrida en seco**
del flujo completo replicando la lógica paso a paso.

---

## 1. Veredicto: el flujo se rompe en DOS puntos encadenados

La hoja `Log` del libro registra **5 corridas idénticas**. Esta es la cadena real de
cada una:

```
 Paso 1  ImportarNuevosArchivos   "Carpeta Entrada no existe; se omite importacion."   ← RUPTURA #1
 Paso 2  ConsolidarHistorico      "Historico consolidado. Registros: 0"                ← DATA queda vacía
 Paso 3  LimpiarDatos             (sale sin procesar: no hay filas)
 Paso 4  RecalcularIndicadores    "BASE_Diaria: DATA vacia, se omite."                 ← BASE_Diaria nunca se crea
 Paso 5  EjecutarModeloOLS        "ERROR 9: Subíndice fuera del intervalo"             ← RUPTURA #2 (crash)
         └─ el manejador antiguo borra el número antes de mostrarlo → ventana "[0]"
```

### Ruptura #1 (causa raíz): la carpeta `Entrada` no se encuentra
La macro busca `Entrada` **junto al archivo `.xlsm` que se está ejecutando** y no la
halla, por lo que **nunca importa nada** y `DATA` queda en 0 registros. Causas
típicas (todas compatibles con la evidencia):
- La carpeta no se creó, o se creó **junto a otra copia** del libro (el archivo en
  uso se llama "…**__copia**.xlsm": hay varias copias circulando y la carpeta debe
  estar junto a la que se ejecuta).
- El libro está en **OneDrive con Autoguardado**: la ruta interna es una URL
  `https://…` y VBA no puede leer carpetas sobre una URL.

### Ruptura #2 (el crash visible): acceso sin protección a `BASE_Diaria`
Con `DATA` vacía, `BASE_Diaria` nunca se crea; el módulo del modelo (versión
antigua) hace `Worksheets("BASE_Diaria")` sin manejo de error → **Error 9**. El
manejador antiguo llama al Log antes de leer el número del error (VBA lo reinicia a
0) → por eso la ventana muestra el críptico **"[0]"**.

## 2. Hallazgo crítico adicional: el código cargado sigue siendo el ORIGINAL

El proyecto VBA del `.xlsm` auditado ya **no tiene módulos duplicados** (bien: por
eso compila y corre), pero **no contiene ninguna de las correcciones** entregadas
(cero apariciones de los marcadores `gPaso`, `NormHdr`, `FilasDatos`). Es decir, se
eliminaron los duplicados pero **se conservaron los módulos viejos**; el código
corregido nunca se importó en esta copia.

## 3. El archivo de alimentación está PERFECTO (no es el problema)

| Verificación | Resultado |
|---|---|
| Hoja de datos | `CARGA` (detectable: fila 1 contiene "PLACA") ✓ |
| Registros | 6.000, sin `No. Viaje` duplicados ✓ |
| Encabezados | 17/17 columnas mapeables (orden y tildes correctos) ✓ |
| Fechas | 6.000 válidas, 0 inválidas · 182 días (2026-01-15 → 2026-07-15) ✓ |
| PLACA / PESO | 0 vacías · 6.000 numéricos ✓ |

## 4. Corrida en seco: el flujo corregido termina BIEN con estos mismos archivos

Se replicó la lógica de la macro corregida paso a paso sobre los dos archivos
subidos:

```
[1-2] Importado+consolidado: 6.000 registros (17/17 columnas mapeadas)
[3]   Limpieza: 6.000 válidas, 0 eliminadas
[4]   BASE_Diaria: 182 días continuos
[5]   LINEST OK: 154 observaciones, 16 variables — WAPE 7,5 %
[5b]  Pronóstico 30 días generado — 7d = 212 vehículos
       (perfil correcto: ~40/día hábil; domingo 6; festivo 20-jul 4)
[8]   Semáforo: capacidad ≈ 238/sem vs demanda 212 → VERDE
```

**Conclusión:** con el código corregido y la carpeta en su sitio, **estos dos
archivos exactos producen el pronóstico sin ningún error**.

## 5. Corrección aplicada al código (definitiva, ya incluida en el consolidado)

Además de las correcciones previas, la nueva versión de `MacroDIC_Consolidada.bas`
**elimina la Ruptura #1 para siempre**:

- Si `Entrada` no existe → **la macro la crea automáticamente** junto al libro y le
  indica al usuario dónde quedó y qué poner dentro.
- Si el libro está en **OneDrive/SharePoint** (ruta URL) → aviso claro con la
  solución (guardar en carpeta local o pegar los datos directamente en `DATA`).
- Si el libro no se ha guardado nunca → aviso de guardarlo primero.
- (Ya incluidas) Error real con número y paso, aviso amable si `DATA` tiene < 60
  días, y protecciones de `BASE_Diaria`, `LINEST` y `Names.Add`.

## 6. Plan de acción (5 minutos, en ESTA copia del archivo)

1. `Alt + F11` → carpeta **Módulos** → **eliminar los 7** (`Modulo1_…` a `Modulo7_…`),
   sin exportar. *(No tocar Hoja1…Hoja15 ni ThisWorkbook.)*
2. **Archivo → Importar archivo…** → importar **solo** `MacroDIC_Consolidada.bas`
   (versión nueva). Debe quedar **1** módulo llamado `MacroDIC`.
3. **Depuración → Compilar VBAProject** → sin errores.
4. Botón **ACTUALIZAR TODO** → *Asignar macro* → `EjecutarTodo`.
5. Pulsar el botón:
   - 1.ª vez: si `Entrada` no existía, la macro **la crea** y te dice dónde.
   - Copiar `Plantilla_Carga_DATA.xlsx` dentro de `Entrada` → pulsar de nuevo →
     "Actualización completada" y la hoja `Pronostico` llena.

> **Cómo saber que ya corre el código nuevo:** cualquier error futuro mostrará
> "Paso: … / Codigo: [N] …" con número real; el "[0]" desaparece. Y si falta algo,
> recibirás avisos con instrucciones, no errores.

## 7. Verificación esperada tras la corrección

- [ ] Hoja `Log`: aparece "Carpeta Entrada creada…" (1.ª corrida) y luego
  "Archivos importados: 1", "Historico consolidado. Registros: 6000", "FIN OK".
- [ ] Hoja `Pronostico` (filas 40+): 30 fechas con vehículos previstos (~35-46 en
  hábiles, ~5 domingos).
- [ ] Dos corridas seguidas terminan bien.
