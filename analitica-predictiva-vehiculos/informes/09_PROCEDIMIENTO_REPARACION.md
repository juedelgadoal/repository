# Procedimiento de Reparación — Macro Dashboard de Planeación de Vehículos
### Guía paso a paso para dejar la macro funcionando (≈ 10 minutos)

**Problema que se corrige:** el proyecto VBA tiene los 7 módulos **importados dos
veces** (copias con sufijo `1`), lo que provoca *"Nombre ambiguo detectado"* y **la
macro no compila ni corre**. Este procedimiento elimina las copias y carga los 7
módulos corregidos.

> **Qué necesita a la mano:** el archivo `Dashboard_Planeacion_Vehiculos.xlsm` y la
> carpeta con los **7 módulos corregidos** (`Modulo1_Principal.bas` …
> `Modulo7_PowerPoint.bas`) del ZIP `Macro_Corregida_y_Auditoria.zip`.

---

## Paso 0 — Haga una copia de seguridad (1 min)

Antes de tocar nada, **duplique el archivo**: clic derecho sobre
`Dashboard_Planeacion_Vehiculos.xlsm` → *Copiar* → *Pegar*. Trabaje sobre la copia.
Así, si algo sale mal, no pierde el original.

---

## Paso 1 — Abra el archivo y habilite las macros (1 min)

1. Abra `Dashboard_Planeacion_Vehiculos.xlsm`.
2. Si aparece la barra amarilla de seguridad, pulse **"Habilitar contenido"**.

> Si Excel no deja ejecutar macros: *Archivo → Opciones → Centro de confianza →
> Configuración del Centro de confianza → Configuración de macros →* marque
> **"Deshabilitar macros con notificación"** y acepte. Luego reabra el archivo y
> pulse *Habilitar contenido*.

---

## Paso 2 — Abra el Editor de VBA (30 seg)

Pulse **`Alt + F11`**. Se abre el *Editor de Visual Basic*.

Si no ve el árbol de la izquierda (*Explorador de proyectos*), actívelo con
**`Ctrl + R`**.

---

## Paso 3 — Identifique qué borrar y qué conservar (1 min)

En el *Explorador de proyectos* verá algo así. **Solo se eliminan los MÓDULOS; nunca
las Hojas ni ThisWorkbook:**

```
VBAProject (Dashboard_Planeacion_Vehiculos.xlsm)
│
├── Microsoft Excel Objetos
│    ├── Hoja1 (Portada)        ←  NO TOCAR
│    ├── Hoja2 (Tablero)        ←  NO TOCAR
│    ├── …                      ←  NO TOCAR
│    ├── Hoja11 (Parametros)    ←  NO TOCAR
│    └── ThisWorkbook           ←  NO TOCAR
│
└── Módulos
     ├── Modulo1_Principal      ←  ELIMINAR
     ├── Modulo1_Principal1     ←  ELIMINAR
     ├── Modulo2_Importar       ←  ELIMINAR
     ├── Modulo2_Importar1      ←  ELIMINAR
     ├── …                      ←  ELIMINAR (todos los "Modulo…")
     ├── Modulo7_PowerPoint     ←  ELIMINAR
     └── Modulo7_PowerPoint1    ←  ELIMINAR
```

> **Regla simple:** borre **todo lo que esté bajo la carpeta "Módulos"** (los 14).
> **No** borre nada bajo "Microsoft Excel Objetos".

---

## Paso 4 — Elimine los 14 módulos (2 min)

Para **cada** módulo dentro de la carpeta *Módulos*:

1. **Clic derecho** sobre el módulo (p. ej. `Modulo1_Principal`).
2. Elija **"Quitar Modulo1_Principal…"**.
3. Cuando pregunte *"¿Desea exportar Modulo1_Principal antes de quitarlo?"* pulse
   **"No"**.
4. Repita hasta que la carpeta **Módulos quede vacía** (o desaparezca).

> Al terminar, bajo *Módulos* no debe quedar ningún elemento.

---

## Paso 5 — Importe los 7 módulos corregidos (2 min)

1. Descomprima el ZIP `Macro_Corregida_y_Auditoria.zip` en una carpeta.
2. En el Editor de VBA: menú **Archivo → Importar archivo…** (o `Ctrl + M`).
3. Seleccione **`Modulo1_Principal.bas`** y pulse *Abrir*.
4. Repita *Archivo → Importar archivo…* para los **7** módulos, uno por uno:
   `Modulo1_Principal.bas`, `Modulo2_Importar.bas`, `Modulo3_Limpieza.bas`,
   `Modulo4_Indicadores.bas`, `Modulo5_Modelo.bas`, `Modulo6_Dashboard.bas`,
   `Modulo7_PowerPoint.bas`.

> Al final, bajo *Módulos* deben aparecer **exactamente 7**, **sin** ningún sufijo `1`.

---

## Paso 6 — Compile para verificar (1 min)

En el Editor de VBA: menú **Depuración → Compilar VBAProject**.

- ✅ **Si no pasa nada**, ¡perfecto! El proyecto compila sin errores (el problema del
  nombre ambiguo quedó resuelto).
- ❌ Si aparece un error, anote el mensaje y revise el Paso 4 (¿quedó algún módulo
  duplicado sin borrar?).

---

## Paso 7 — Reasigne la macro al botón (1 min)

1. Vuelva a Excel (`Alt + F11` para alternar).
2. En la hoja **Tablero**, clic derecho sobre el botón **"ACTUALIZAR TODO"** →
   **"Asignar macro…"**.
3. Seleccione **`EjecutarTodo`** → *Aceptar*.

> Si el botón se borró, cree uno nuevo: *Insertar → Formas → Rectángulo*, escríbale
> "ACTUALIZAR TODO", clic derecho → *Asignar macro* → `EjecutarTodo`.

---

## Paso 8 — Pruebe (2 min)

1. Verifique que exista la subcarpeta **`Entrada`** junto al archivo (si no, créela).
2. Pulse **"ACTUALIZAR TODO"**.
3. Debe aparecer el mensaje *"Actualización completada correctamente"*.
4. **Púlselo una segunda vez seguida.** Antes fallaba en la segunda corrida; ahora
   debe terminar igual de bien (se corrigió el defecto del nombre `Pron_7d`).
5. Revise la hoja oculta **`Log`** (para verla: clic derecho en una pestaña →
   *Mostrar…* → `Log`): la última línea debe decir **"FIN OK"**.

---

## Paso 9 — (Opcional) Reproteja el código con UCLOG (1 min)

1. Editor de VBA: menú **Herramientas → Propiedades de VBAProject…**
2. Pestaña **Protección** → marque *"Bloquear proyecto para visualización"*.
3. Contraseña: **`UCLOG`** (mayúsculas) → confirme → *Aceptar*.
4. **Guarde** el archivo (`Ctrl + S`) y ciérrelo. Al reabrir, el código queda protegido.

---

## Verificación final (checklist)

- [ ] Bajo *Módulos* hay **7** módulos, **ninguno** con sufijo `1`.
- [ ] *Depuración → Compilar VBAProject* no muestra errores.
- [ ] El botón ejecuta y muestra "Actualización completada".
- [ ] **Dos** corridas seguidas terminan bien (sin error 1004).
- [ ] La hoja `Log` termina en "FIN OK".
- [ ] El archivo está guardado como **`.xlsm`**.

---

## Si algo falla — solución rápida

| Mensaje / síntoma | Causa | Qué hacer |
|---|---|---|
| "Nombre ambiguo detectado" | Quedó un módulo duplicado | Repita el Paso 4: borre el módulo con sufijo `1` que quedó |
| "No se pueden ejecutar macros" | Archivo en `.xlsx` o macros deshabilitadas | Guarde como `.xlsm`; *Habilitar contenido* (Paso 1) |
| "Error 1004" en la 2.ª corrida | No se importaron los módulos corregidos | Rehaga los Pasos 4–5 con los `.bas` del ZIP corregido |
| "Subíndice fuera del intervalo" | La hoja `DATA` tiene encabezados con otro nombre | Use la plantilla `Plantilla_Carga_DATA.xlsx`; los corregidos ya toleran tildes/orden |
| No genera el PowerPoint | PowerPoint no instalado | La macro lo omite y continúa (queda anotado en `Log`) |
| Olvidó la contraseña | — | Es **`UCLOG`** |

> **Importante:** siempre trabaje sobre la **copia** del Paso 0 hasta confirmar que
> todo funciona. Una vez verificado, esa copia pasa a ser su archivo oficial.
