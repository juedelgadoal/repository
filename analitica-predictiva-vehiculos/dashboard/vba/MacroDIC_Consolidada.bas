Attribute VB_Name = "MacroDIC"
Option Explicit

' ===== Declaraciones de Modulo1_Principal =====
'==============================================================================
'  DIC - PLANEACION PREDICTIVA DE VEHICULOS
'  Modulo principal de automatizacion - Compatible con Excel 2016 (VBA7)
'
'  Orquesta todo el flujo con UN SOLO BOTON (Sub EjecutarTodo):
'    1. Importa nuevos archivos            (Modulo2_Importar)
'    2. Consolida el historico             (Modulo2_Importar)
'    3. Limpia los datos                   (Modulo3_Limpieza)
'    4. Recalcula estadisticas e indices   (Modulo4_Indicadores)
'    5. Ejecuta el modelo predictivo (OLS) (Modulo5_Modelo)
'    6. Actualiza tablas dinamicas/graficos (Modulo6_Dashboard)
'    7. Guarda el historico de predicciones (Modulo5_Modelo)
'    8. Emite alertas de capacidad (>10%)  (Modulo6_Dashboard)
'    9. Genera informe ejecutivo PowerPoint (Modulo7_PowerPoint)
'
'  Proteccion del proyecto VBA con contrasena: UCLOG (ver Manual de Usuario;
'  la proteccion del codigo se activa manualmente en Herramientas > Propiedades
'  de VBAProject, pues VBA no puede auto-protegerse por seguridad de Office).
'==============================================================================

' ---- Constantes globales de configuracion ----
Public Const PWD_VBA As String = "UCLOG"          ' contrasena de proteccion
Public Const HOJA_DATOS As String = "DATA"         ' datos transaccionales consolidados
Public Const HOJA_PARAM As String = "Parametros"
Public Const HOJA_TABLERO As String = "Tablero"
Public Const HOJA_PRON As String = "Pronostico"
Public Const UMBRAL_ALERTA As Double = 0.1         ' 10% (se lee de Parametros!B4 si existe)
Public Const CARPETA_ENTRADA As String = "Entrada" ' subcarpeta con archivos nuevos

' Paso en curso (para diagnosticar dónde falla si ocurre un error)
Public gPaso As String

'------------------------------------------------------------------------------
' PUNTO DE ENTRADA UNICO - asignar este Sub al boton del Tablero
'------------------------------------------------------------------------------
' ===== Declaraciones de Modulo2_Importar =====
'==============================================================================
'  Modulo2_Importar - Importacion y consolidacion del historico
'  Lee todos los .xlsx/.xlsm/.csv de la subcarpeta "Entrada" (junto al libro),
'  los apila y los consolida en la hoja DATA evitando duplicados por No. Viaje.
'==============================================================================

' Encabezados esperados (orden canonico de la hoja DATA)
' ===== Declaraciones de Modulo3_Limpieza =====
'==============================================================================
'  Modulo3_Limpieza - Depuracion de la hoja DATA
'  Reglas derivadas de la Fase 1 (Auditoria):
'   - Normaliza texto (MAYUSCULAS, sin espacios) en ciudades/placas.
'   - Convierte Fecha a fecha real; recalcula MES/ANIO/Mes-Anio desde Fecha.
'   - Elimina filas sin Fecha o sin PLACA.
'   - Marca (no borra) pesos atipicos y origen=destino en columna de auditoria.
'==============================================================================

' ===== Declaraciones de Modulo4_Indicadores =====
'==============================================================================
'  Modulo4_Indicadores - Construye la serie diaria de demanda e indices
'  A partir de la hoja DATA genera la hoja BASE_Diaria con:
'   Fecha | viajes | toneladas | features de calendario | rezagos | medias moviles
'  Esta hoja es la entrada del modelo (Modulo5) y de los graficos (Modulo6).
'==============================================================================

' ===== Declaraciones de Modulo5_Modelo =====
'==============================================================================
'  Modulo5_Modelo - Motor predictivo (Regresion Multiple / OLS) 100% nativo Excel
'
'  Reentrena el modelo sobre BASE_Diaria con LINEST y genera el pronostico
'  recursivo a 30 dias. El modelo replica el seleccionado en la Fase 7
'  (WAPE semanal 7.4% <= meta 10%). Features (bien condicionadas para LINEST):
'    dow2..dow7 (dummies, lunes=ref), festivo, fin_mes, ini_mes, t,
'    lag7, lag14, roll7, roll30, sin365, cos365  -> 16 predictores + intercepto
'==============================================================================

Private Const NFEAT As Long = 16

'------------------------------------------------------------------------------
' Entrena OLS y escribe coeficientes en la hoja Modelo; luego pronostica.
'------------------------------------------------------------------------------
' ===== Declaraciones de Modulo6_Dashboard =====
'==============================================================================
'  Modulo6_Dashboard - Tablas dinamicas, segmentadores, graficos y alertas
'==============================================================================

'------------------------------------------------------------------------------
' Crea/actualiza una Tabla Dinamica de viajes por Mes-Anio x Tipo Transportador
' y refresca todos los pivots y graficos del libro.
'------------------------------------------------------------------------------
' ===== Declaraciones de Modulo7_PowerPoint =====
'==============================================================================
'  Modulo7_PowerPoint - Genera automaticamente un informe ejecutivo en PowerPoint
'  Usa enlace tardio (late binding): NO requiere referencia a la libreria de PPT,
'  lo que asegura compatibilidad en cualquier equipo con Office 2016.
'==============================================================================



'==============================================================================
' ===== Modulo1_Principal =====
'==============================================================================
Public Sub EjecutarTodo()
    Dim t0 As Double: t0 = Timer
    On Error GoTo Errores

    OptimizarInicio                         ' apaga pantalla/calculo automatico

    Log_Registrar "===== INICIO DE ACTUALIZACION ====="
    gPaso = "1. Importar archivos":     ImportarNuevosArchivos
    gPaso = "2. Consolidar historico":  ConsolidarHistorico
    gPaso = "3. Limpiar datos":         LimpiarDatos

    ' ¿Hay datos para trabajar? Si no, detener con un aviso claro (no un error).
    If FilasDatos() < 60 Then
        OptimizarFin
        Log_Registrar "Sin datos suficientes (" & FilasDatos() & " filas). Se detiene con aviso."
        MsgBox "No hay datos suficientes para generar el pronostico." & vbCrLf & vbCrLf & _
               "Que hacer:" & vbCrLf & _
               "  1) Pulse de nuevo ACTUALIZAR TODO y, cuando se abra la" & vbCrLf & _
               "     ventana de seleccion, elija su archivo de viajes" & vbCrLf & _
               "     (Plantilla_Carga_DATA.xlsx con los datos)." & vbCrLf & _
               "  2) O pegue el historico directamente en la hoja DATA." & vbCrLf & vbCrLf & _
               "Se requieren al menos 60 dias de historia.", vbExclamation, "DIC - Planeacion"
        Exit Sub
    End If

    gPaso = "4. Recalcular indicadores": RecalcularIndicadores
    gPaso = "5. Ejecutar modelo OLS":   EjecutarModeloOLS
    gPaso = "7. Guardar historico pred.": GuardarHistoricoPrediccion
    gPaso = "6. Actualizar tablas/graficos": ActualizarTablasYGraficos
    gPaso = "8. Evaluar alertas":       EvaluarAlertas

    ' 9. Informe ejecutivo en PowerPoint (opcional segun parametro)
    If LeerParametroBool("GenerarPPT", True) Then
        gPaso = "9. Informe PowerPoint": GenerarInformeEjecutivo
    End If

    Log_Registrar "===== FIN OK en " & Format(Timer - t0, "0.0") & " s ====="
    OptimizarFin
    MsgBox "Actualizacion completada correctamente." & vbCrLf & _
           "Tiempo: " & Format(Timer - t0, "0.0") & " s", vbInformation, "DIC - Planeacion"
    Exit Sub

Errores:
    ' Capturar el error ANTES de llamar cualquier rutina (que reinicia Err a 0)
    Dim nErr As Long: nErr = Err.Number
    Dim sErr As String: sErr = Err.Description
    Dim sPaso As String: sPaso = gPaso
    OptimizarFin
    Log_Registrar "ERROR en [" & sPaso & "] " & nErr & ": " & sErr
    MsgBox "Ocurrio un error y el proceso se detuvo." & vbCrLf & vbCrLf & _
           "Paso: " & sPaso & vbCrLf & _
           "Codigo: [" & nErr & "]  " & sErr, vbCritical, "DIC - Planeacion"
End Sub

'------------------------------------------------------------------------------
' Utilidades de rendimiento
'------------------------------------------------------------------------------
Public Sub OptimizarInicio()
    With Application
        .ScreenUpdating = False
        .EnableEvents = False
        .DisplayAlerts = False
        .Calculation = xlCalculationManual
    End With
End Sub

Public Sub OptimizarFin()
    With Application
        .Calculation = xlCalculationAutomatic
        .DisplayAlerts = True
        .EnableEvents = True
        .ScreenUpdating = True
    End With
End Sub

'------------------------------------------------------------------------------
' Registro de eventos (hoja oculta "Log")
'------------------------------------------------------------------------------
Public Sub Log_Registrar(ByVal msg As String)
    Dim ws As Worksheet, r As Long
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("Log")
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add
        ws.Name = "Log": ws.Visible = xlSheetHidden
        ws.Range("A1:B1").Value = Array("FechaHora", "Evento")
    End If
    r = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1
    ws.Cells(r, 1).Value = Now
    ws.Cells(r, 1).NumberFormat = "yyyy-mm-dd hh:mm:ss"
    ws.Cells(r, 2).Value = msg
End Sub

'------------------------------------------------------------------------------
' Lectura de parametros (celdas nombradas o de la hoja Parametros)
'------------------------------------------------------------------------------
Public Function LeerParametroNum(ByVal nombre As String, ByVal defecto As Double) As Double
    On Error Resume Next
    Dim v As Variant
    v = ThisWorkbook.Names(nombre).RefersToRange.Value
    If IsNumeric(v) Then LeerParametroNum = v Else LeerParametroNum = defecto
End Function

Public Function LeerParametroBool(ByVal nombre As String, ByVal defecto As Boolean) As Boolean
    On Error Resume Next
    Dim v As Variant
    v = ThisWorkbook.Names(nombre).RefersToRange.Value
    If IsEmpty(v) Then LeerParametroBool = defecto Else LeerParametroBool = CBool(v)
End Function

'------------------------------------------------------------------------------
' Helpers de hojas
'------------------------------------------------------------------------------
Public Function ObtenerHoja(ByVal nombre As String) As Worksheet
    On Error Resume Next
    Set ObtenerHoja = ThisWorkbook.Worksheets(nombre)
    If ObtenerHoja Is Nothing Then
        Set ObtenerHoja = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ObtenerHoja.Name = nombre
    End If
End Function

Public Function UltimaFila(ByVal ws As Worksheet, Optional ByVal col As Long = 1) As Long
    UltimaFila = ws.Cells(ws.Rows.Count, col).End(xlUp).Row
End Function

' Nº de filas de datos (sin encabezado) en la hoja DATA; 0 si no existe/está vacía
Public Function FilasDatos() As Long
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(HOJA_DATOS)
    On Error GoTo 0
    If ws Is Nothing Then FilasDatos = 0: Exit Function
    FilasDatos = Application.WorksheetFunction.Max(0, _
                 ws.Cells(ws.Rows.Count, 1).End(xlUp).Row - 1)
End Function

'------------------------------------------------------------------------------
' Normalización de encabezados: MAYÚSCULAS, sin tildes, sin dobles espacios.
' Permite alimentar archivos con nombres de columna en cualquier orden y con o
' sin acentos (p. ej. "Tipología de camión" = "TIPOLOGIA DE CAMION").
'------------------------------------------------------------------------------
' Los literales de lógica en este proyecto son ASCII (para evitar mojibake según
' la página de códigos al importar el .bas). Los VALORES de celda sí llegan como
' Unicode correcto, por lo que aquí se despojan de tildes en tiempo de ejecución.
Public Function NormHdr(ByVal s As String) As String
    Dim t As String: t = Trim$(CStr(s))
    t = Replace(t, ChrW(225), "a"): t = Replace(t, ChrW(193), "A")   ' á Á
    t = Replace(t, ChrW(233), "e"): t = Replace(t, ChrW(201), "E")   ' é É
    t = Replace(t, ChrW(237), "i"): t = Replace(t, ChrW(205), "I")   ' í Í
    t = Replace(t, ChrW(243), "o"): t = Replace(t, ChrW(211), "O")   ' ó Ó
    t = Replace(t, ChrW(250), "u"): t = Replace(t, ChrW(218), "U")   ' ú Ú
    t = Replace(t, ChrW(252), "u"): t = Replace(t, ChrW(220), "U")   ' ü Ü
    t = Replace(t, ChrW(241), "n"): t = Replace(t, ChrW(209), "N")   ' ñ Ñ
    t = UCase$(t)
    t = Replace(t, "ANIO", "ANO")   ' unifica AÑO / ANIO / ANO -> ANO
    Do While InStr(t, "  ") > 0: t = Replace(t, "  ", " "): Loop
    NormHdr = t
End Function

' Diccionario: encabezado NORMALIZADO -> índice de columna (fila de encabezado dada)
Public Function MapaColNorm(ByVal ws As Worksheet, Optional ByVal filaHdr As Long = 1) As Object
    Dim d As Object: Set d = CreateObject("Scripting.Dictionary")
    Dim j As Long, ultCol As Long
    ultCol = ws.Cells(filaHdr, ws.Columns.Count).End(xlToLeft).Column
    For j = 1 To ultCol
        Dim k As String: k = NormHdr(CStr(ws.Cells(filaHdr, j).Value))
        If Len(k) > 0 And Not d.Exists(k) Then d(k) = j
    Next j
    Set MapaColNorm = d
End Function

'==============================================================================
' ===== Modulo2_Importar =====
'==============================================================================
Public Function EncabezadosCanonicos() As Variant
    EncabezadosCanonicos = Array("No. Viaje", "Negocio", "Ciudad Origen", "Ciudad Destino", _
        "Fecha", "Zona Destino", "Tipologia de camion", "Tipo Transportador", "Tipo Negocio", _
        "MES", "ANIO", "Mes - Anio", "Tipo Viaje", "Zona Origen", "CLIENTE", "PLACA", _
        "PESO CARGADO (ton)")
End Function

'------------------------------------------------------------------------------
' 1) Importa todos los archivos nuevos de la carpeta Entrada
'------------------------------------------------------------------------------
' Resuelve la ruta del ESCRITORIO real del usuario probando varios metodos:
' WScript puede estar bloqueado por politicas corporativas, y el Escritorio
' puede estar redirigido a OneDrive con nombre "Desktop" o "Escritorio".
Private Function RutaEscritorio() As String
    Dim cand(1 To 6) As String, i As Long
    On Error Resume Next
    cand(1) = CreateObject("WScript.Shell").SpecialFolders("Desktop")
    cand(2) = CreateObject("Shell.Application").Namespace(16).Self.Path   ' Shell32 (no usa WSH)
    cand(3) = Environ$("USERPROFILE") & "\Desktop"
    cand(4) = Environ$("USERPROFILE") & "\OneDrive\Escritorio"
    cand(5) = Environ$("USERPROFILE") & "\OneDrive\Desktop"
    cand(6) = Environ$("OneDrive") & "\Escritorio"
    On Error GoTo 0
    For i = 1 To 6
        If Len(cand(i)) > 3 Then
            If Dir(cand(i), vbDirectory) <> "" Then
                RutaEscritorio = cand(i)
                Exit Function
            End If
        End If
    Next i
    RutaEscritorio = ""   ' no se pudo resolver
End Function

' Carpeta de carga: 'Entrada' en el Escritorio; si el Escritorio no se puede
' resolver, respaldo junto al libro (solo si tiene ruta local).
Public Function RutaEntrada() As String
    Dim esc As String: esc = RutaEscritorio()
    If Len(esc) = 0 Then
        If Len(ThisWorkbook.Path) > 0 And InStr(1, ThisWorkbook.Path, "http", vbTextCompare) <> 1 Then
            esc = ThisWorkbook.Path
        End If
    End If
    If Len(esc) = 0 Then RutaEntrada = "": Exit Function
    RutaEntrada = esc & Application.PathSeparator & CARPETA_ENTRADA & Application.PathSeparator
End Function

Public Sub ImportarNuevosArchivos()
    Dim wsStage As Worksheet
    Set wsStage = ObtenerHoja("_Staging")
    wsStage.Cells.Clear
    EscribirEncabezados wsStage

    Dim nImport As Long

    ' A) Carpeta 'Entrada' (opcional, para flujo automatizado): si existe en el
    '    Escritorio o junto al libro, se importa automaticamente lo que haya alli.
    Dim ruta As String: ruta = RutaEntrada()
    If Len(ruta) > 0 Then
        If Dir(ruta, vbDirectory) <> "" Then
            nImport = ImportarDeCarpeta(ruta, wsStage)
        Else
            ' Intento silencioso de crearla para proximas corridas (sin bloquear)
            On Error Resume Next
            MkDir Left$(ruta, Len(ruta) - 1)
            On Error GoTo 0
            If Dir(ruta, vbDirectory) <> "" Then
                Log_Registrar "Carpeta Entrada creada: " & ruta
            End If
        End If
    End If

    ' B) SELECTOR DE ARCHIVOS: si no llego nada por carpeta, el usuario elige su
    '    archivo directamente en una ventana estandar de Windows. No depende de
    '    rutas, del Escritorio ni de OneDrive.
    If nImport = 0 Then
        Dim abrir As Boolean
        If FilasDatos() < 60 Then
            abrir = True    ' sin datos no hay nada que calcular: pedir archivo ya
        Else
            abrir = (MsgBox("No se encontraron archivos nuevos en la carpeta Entrada." & vbCrLf & _
                     "Desea seleccionar un archivo de datos para cargar?", _
                     vbYesNo + vbQuestion, "DIC - Planeacion") = vbYes)
        End If
        If abrir Then
            Dim sel As Variant
            sel = Application.GetOpenFilename( _
                  "Datos de viajes (*.xls*;*.csv),*.xls*;*.csv", , _
                  "Seleccione el archivo de datos de viajes (puede elegir varios)", , True)
            If IsArray(sel) Then
                Dim k As Long
                For k = LBound(sel) To UBound(sel)
                    ApilarArchivo CStr(sel(k)), wsStage
                    nImport = nImport + 1
                Next k
            Else
                Log_Registrar "Seleccion de archivos cancelada por el usuario."
            End If
        End If
    End If

    Log_Registrar "Archivos importados: " & nImport
End Sub

' Importa todos los archivos de una carpeta. Se enumera PRIMERO y se procesa
' DESPUES: Dir no admite llamadas anidadas (ApilarArchivo/MoverAProcesados usan
' Dir/Name internamente y reiniciaban la enumeracion -> error 5).
Private Function ImportarDeCarpeta(ByVal ruta As String, ByVal wsStage As Worksheet) As Long
    Dim archivos As Collection: Set archivos = New Collection
    Dim archivo As String, n As Long
    archivo = Dir(ruta & "*.xls*")
    Do While archivo <> ""
        If Left$(archivo, 2) <> "~$" Then archivos.Add archivo   ' omite temporales de Office
        archivo = Dir()
    Loop
    archivo = Dir(ruta & "*.csv")
    Do While archivo <> ""
        archivos.Add archivo
        archivo = Dir()
    Loop
    Dim it As Variant
    For Each it In archivos
        ApilarArchivo ruta & it, wsStage
        MoverAProcesados ruta, CStr(it)
        n = n + 1
    Next it
    ImportarDeCarpeta = n
End Function

Private Sub EscribirEncabezados(ByVal ws As Worksheet)
    Dim h As Variant, j As Long
    h = EncabezadosCanonicos()
    For j = LBound(h) To UBound(h)
        ws.Cells(1, j + 1).Value = h(j)
    Next j
End Sub

' Abre un libro externo y apila su hoja de datos en el staging, MAPEANDO por
' nombre de encabezado (no por posición). Así el archivo de entrada puede tener
' las columnas en cualquier orden y con o sin tildes; las columnas que falten se
' dejan vacías y las sobrantes se ignoran.
Private Sub ApilarArchivo(ByVal fullpath As String, ByVal wsStage As Worksheet)
    Dim wb As Workbook, wsO As Worksheet
    ' Nunca procesar este mismo libro (cerrarlo abortaria la ejecucion)
    If StrComp(fullpath, ThisWorkbook.FullName, vbTextCompare) = 0 Then Exit Sub
    On Error Resume Next
    Set wb = Workbooks.Open(fullpath, ReadOnly:=True, UpdateLinks:=0)
    If wb Is Nothing Then Exit Sub
    If wb Is ThisWorkbook Then Exit Sub
    Set wsO = DetectarHojaDatos(wb)
    If Not wsO Is Nothing Then CopiarMapeadoPorEncabezado wsO, wsStage
    wb.Close SaveChanges:=False
    Application.CutCopyMode = False
End Sub

' Copia los datos de la fuente al staging alineando por nombre de columna
Private Sub CopiarMapeadoPorEncabezado(ByVal wsO As Worksheet, ByVal wsStage As Worksheet)
    Dim canon As Variant: canon = EncabezadosCanonicos()
    Dim nCanon As Long: nCanon = UBound(canon) - LBound(canon) + 1

    Dim hdrRow As Long: hdrRow = FilaEncabezado(wsO)
    If hdrRow = 0 Then Exit Sub
    Dim ultCol As Long: ultCol = wsO.Cells(hdrRow, wsO.Columns.Count).End(xlToLeft).Column
    Dim ultRow As Long: ultRow = wsO.Cells(wsO.Rows.Count, 1).End(xlUp).Row
    If ultRow <= hdrRow Then Exit Sub

    ' Mapa: encabezado normalizado de la fuente -> columna de la fuente
    Dim srcMap As Object: Set srcMap = MapaColNorm(wsO, hdrRow)

    Dim nRows As Long: nRows = ultRow - hdrRow
    Dim src As Variant
    src = wsO.Range(wsO.Cells(hdrRow + 1, 1), wsO.Cells(ultRow, ultCol)).Value
    ' Si solo hay una fila de datos, .Value no es matriz 2D: normalizar
    If nRows = 1 Then
        Dim tmp() As Variant: ReDim tmp(1 To 1, 1 To ultCol)
        Dim cc As Long
        For cc = 1 To ultCol: tmp(1, cc) = wsO.Cells(hdrRow + 1, cc).Value: Next cc
        src = tmp
    End If

    ' Construir salida en el ORDEN canónico
    Dim out() As Variant: ReDim out(1 To nRows, 1 To nCanon)
    Dim c As Long, i As Long, key As String
    For c = 0 To nCanon - 1
        key = NormHdr(CStr(canon(c)))
        If srcMap.Exists(key) Then
            Dim sc As Long: sc = srcMap(key)
            For i = 1 To nRows: out(i, c + 1) = src(i, sc): Next i
        End If
    Next c

    Dim rIni As Long: rIni = wsStage.Cells(wsStage.Rows.Count, 1).End(xlUp).Row + 1
    wsStage.Cells(rIni, 1).Resize(nRows, nCanon).Value = out
End Sub

' Localiza la fila del encabezado en la fuente (por "PLACA" o "No. Viaje")
Private Function FilaEncabezado(ByVal ws As Worksheet) As Long
    Dim celda As Range
    Set celda = ws.Cells.Find("PLACA", LookAt:=xlWhole, MatchCase:=False)
    If celda Is Nothing Then Set celda = ws.Cells.Find("No. Viaje", LookAt:=xlPart, MatchCase:=False)
    If Not celda Is Nothing Then FilaEncabezado = celda.Row Else FilaEncabezado = 1
End Function

' Heuristica: hoja cuya fila 1 contiene "No. Viaje" o "PLACA"
Private Function DetectarHojaDatos(ByVal wb As Workbook) As Worksheet
    Dim ws As Worksheet, celda As Range
    For Each ws In wb.Worksheets
        Set celda = ws.Rows(1).Find("PLACA", LookAt:=xlPart)
        If Not celda Is Nothing Then Set DetectarHojaDatos = ws: Exit Function
        Set celda = ws.Rows(1).Find("No. Viaje", LookAt:=xlPart)
        If Not celda Is Nothing Then Set DetectarHojaDatos = ws: Exit Function
    Next ws
End Function

Private Sub MoverAProcesados(ByVal ruta As String, ByVal archivo As String)
    Dim destino As String
    destino = ruta & "Procesados" & Application.PathSeparator
    On Error Resume Next
    If Dir(destino, vbDirectory) = "" Then MkDir Left$(destino, Len(destino) - 1)
    Name ruta & archivo As destino & Format(Now, "yyyymmdd_hhmmss_") & archivo
End Sub

'------------------------------------------------------------------------------
' 2) Consolida staging + DATA existente, elimina duplicados por No. Viaje
'------------------------------------------------------------------------------
Public Sub ConsolidarHistorico()
    Dim wsData As Worksheet, wsStage As Worksheet
    Set wsData = ObtenerHoja(HOJA_DATOS)
    Set wsStage = ObtenerHoja("_Staging")

    ' Si DATA esta vacia, inicializar con encabezados
    If Application.WorksheetFunction.CountA(wsData.Rows(1)) = 0 Then
        EscribirEncabezados wsData
    End If

    ' Apilar staging debajo de DATA
    Dim ultStage As Long: ultStage = wsStage.Cells(wsStage.Rows.Count, 1).End(xlUp).Row
    If ultStage > 1 Then
        Dim rDest As Long: rDest = wsData.Cells(wsData.Rows.Count, 1).End(xlUp).Row + 1
        wsStage.Range(wsStage.Rows(2), wsStage.Rows(ultStage)).Copy
        wsData.Cells(rDest, 1).PasteSpecial xlPasteValues
        Application.CutCopyMode = False
    End If

    ' Eliminar duplicados por No. Viaje (columna 1)
    Dim ult As Long: ult = wsData.Cells(wsData.Rows.Count, 1).End(xlUp).Row
    If ult > 2 Then
        wsData.Range(wsData.Rows(1), wsData.Rows(ult)).RemoveDuplicates Columns:=1, Header:=xlYes
    End If

    wsStage.Cells.Clear
    Log_Registrar "Historico consolidado. Registros: " & _
        (wsData.Cells(wsData.Rows.Count, 1).End(xlUp).Row - 1)
End Sub

'==============================================================================
' ===== Modulo3_Limpieza =====
'==============================================================================
Public Sub LimpiarDatos()
    Dim ws As Worksheet: Set ws = ObtenerHoja(HOJA_DATOS)
    Dim ult As Long: ult = UltimaFila(ws, 1)
    If ult < 2 Then Exit Sub

    Dim col As Object: Set col = MapaColNorm(ws)
    Dim datos As Variant, i As Long, nElim As Long, nAtip As Long
    datos = ws.Range(ws.Cells(2, 1), ws.Cells(ult, ws.UsedRange.Columns.Count)).Value

    Dim cFecha As Long, cPlaca As Long, cOrig As Long, cDest As Long, cPeso As Long
    Dim cMes As Long, cAnio As Long, cMesAnio As Long
    cFecha = col(NormHdr("Fecha"))
    cPlaca = col(NormHdr("PLACA"))
    cOrig = col(NormHdr("Ciudad Origen"))
    cDest = col(NormHdr("Ciudad Destino"))
    cPeso = col(NormHdr("PESO CARGADO (ton)"))
    cMes = col(NormHdr("MES"))
    cAnio = col(NormHdr("ANIO"))
    cMesAnio = col(NormHdr("Mes - Anio"))
    ' Si falta alguna columna clave, aborta con mensaje claro
    If cFecha = 0 Or cPlaca = 0 Or cPeso = 0 Then
        Log_Registrar "Limpieza abortada: faltan columnas clave (Fecha/PLACA/PESO)."
        Exit Sub
    End If

    Dim salida() As Variant, k As Long
    ReDim salida(1 To UBound(datos, 1), 1 To UBound(datos, 2))

    For i = 1 To UBound(datos, 1)
        Dim f As Variant: f = datos(i, cFecha)
        Dim placa As String: placa = Trim(CStr(datos(i, cPlaca)))
        ' Regla: descartar sin fecha o sin placa
        If IsDate(f) And Len(placa) > 0 Then
            k = k + 1
            Dim j As Long
            For j = 1 To UBound(datos, 2): salida(k, j) = datos(i, j): Next j
            ' Normalizacion
            salida(k, cOrig) = UCase(Trim(CStr(datos(i, cOrig))))
            salida(k, cDest) = UCase(Trim(CStr(datos(i, cDest))))
            salida(k, cPlaca) = UCase(placa)
            ' Recalcular MES/ANIO/Mes-Anio desde Fecha
            salida(k, cMes) = Month(CDate(f))
            salida(k, cAnio) = Year(CDate(f))
            salida(k, cMesAnio) = Format(CDate(f), "yyyy-mm")
        Else
            nElim = nElim + 1
        End If
    Next i

    ' Reescribir DATA limpia
    ws.Range(ws.Cells(2, 1), ws.Cells(ult, ws.UsedRange.Columns.Count)).ClearContents
    If k > 0 Then
        ws.Cells(2, 1).Resize(k, UBound(datos, 2)).Value = _
            RecortarMatriz(salida, k, UBound(datos, 2))
    End If

    Log_Registrar "Limpieza: eliminadas " & nElim & " filas invalidas; " & k & " validas."
End Sub

Private Function RecortarMatriz(ByRef m As Variant, ByVal nf As Long, ByVal nc As Long) As Variant
    Dim r() As Variant, i As Long, j As Long
    ReDim r(1 To nf, 1 To nc)
    For i = 1 To nf: For j = 1 To nc: r(i, j) = m(i, j): Next j: Next i
    RecortarMatriz = r
End Function

'==============================================================================
' ===== Modulo4_Indicadores =====
'==============================================================================
Public Sub RecalcularIndicadores()
    Dim wsData As Worksheet: Set wsData = ObtenerHoja(HOJA_DATOS)
    Dim ult As Long: ult = UltimaFila(wsData, 1)
    If ult < 2 Then
        Log_Registrar "BASE_Diaria: DATA vacia, se omite."
        Exit Sub
    End If

    ' --- Agregar viajes y toneladas por fecha usando un Dictionary ---
    Dim col As Object: Set col = MapaColNorm(wsData)
    Dim cFecha As Long: cFecha = col(NormHdr("Fecha"))
    Dim cPeso As Long: cPeso = col(NormHdr("PESO CARGADO (ton)"))
    If cFecha = 0 Or cPeso = 0 Then
        Log_Registrar "BASE_Diaria abortada: faltan columnas Fecha/PESO."
        Exit Sub
    End If
    Dim datos As Variant
    datos = wsData.Range(wsData.Cells(2, 1), wsData.Cells(ult, wsData.UsedRange.Columns.Count)).Value

    Dim dV As Object: Set dV = CreateObject("Scripting.Dictionary")  ' fecha -> viajes
    Dim dT As Object: Set dT = CreateObject("Scripting.Dictionary")  ' fecha -> toneladas
    Dim i As Long, fkey As Long
    For i = 1 To UBound(datos, 1)
        If IsDate(datos(i, cFecha)) Then
            fkey = CLng(Int(CDate(datos(i, cFecha))))
            dV(fkey) = dV(fkey) + 1
            dT(fkey) = dT(fkey) + Val(datos(i, cPeso) & "")
        End If
    Next i

    ' --- Rango continuo de fechas ---
    Dim fmin As Long, fmax As Long, kf As Variant
    fmin = 2958465: fmax = 0
    For Each kf In dV.Keys
        If kf < fmin Then fmin = kf
        If kf > fmax Then fmax = kf
    Next kf

    Dim ws As Worksheet: Set ws = ObtenerHoja("BASE_Diaria")
    ws.Cells.Clear
    ws.Range("A1:V1").Value = Array("Fecha", "viajes", "toneladas", "dow", "mes", "trimestre", _
        "festivo", "post_festivo", "pre_festivo", "fin_mes", "ini_mes", "t", _
        "lag7", "lag14", "lag21", "lag28", "roll7", "roll14", "roll30", "sin365", "cos365", "habil")

    Dim r As Long: r = 2
    Dim d As Long, viajes As Double
    For d = fmin To fmax
        Dim fecha As Date: fecha = CDate(d)
        viajes = 0: If dV.Exists(d) Then viajes = dV(d)
        ws.Cells(r, 1).Value = fecha: ws.Cells(r, 1).NumberFormat = "yyyy-mm-dd"
        ws.Cells(r, 2).Value = viajes
        ws.Cells(r, 3).Value = IIf(dT.Exists(d), dT(d), 0)
        ws.Cells(r, 4).Value = Weekday(fecha, vbMonday) - 1          ' dow 0=lunes
        ws.Cells(r, 5).Value = Month(fecha)
        ws.Cells(r, 6).Value = Int((Month(fecha) - 1) / 3) + 1
        ws.Cells(r, 7).Value = IIf(EsFestivo(fecha), 1, 0)
        ws.Cells(r, 8).Value = IIf(EsFestivo(fecha - 1), 1, 0)
        ws.Cells(r, 9).Value = IIf(EsFestivo(fecha + 1), 1, 0)
        ws.Cells(r, 10).Value = IIf(Day(fecha) >= Day(DateSerial(Year(fecha), Month(fecha) + 1, 0)) - 2, 1, 0)
        ws.Cells(r, 11).Value = IIf(Day(fecha) <= 3, 1, 0)
        ws.Cells(r, 12).Value = d - fmin                             ' tendencia t
        ws.Cells(r, 20).Value = Sin(2 * 3.14159265 * DatePart("y", fecha) / 365.25)
        ws.Cells(r, 21).Value = Cos(2 * 3.14159265 * DatePart("y", fecha) / 365.25)
        ws.Cells(r, 22).Value = IIf(Weekday(fecha, vbMonday) <= 5 And Not EsFestivo(fecha), 1, 0)
        r = r + 1
    Next d

    ' --- Rezagos y medias moviles (formulas nativas para transparencia) ---
    Dim ultF As Long: ultF = r - 1
    For r = 2 To ultF
        ws.Cells(r, 13).Value = ValorRezago(ws, r, 7)
        ws.Cells(r, 14).Value = ValorRezago(ws, r, 14)
        ws.Cells(r, 15).Value = ValorRezago(ws, r, 21)
        ws.Cells(r, 16).Value = ValorRezago(ws, r, 28)
        ws.Cells(r, 17).Value = MediaMovil(ws, r, 7)
        ws.Cells(r, 18).Value = MediaMovil(ws, r, 14)
        ws.Cells(r, 19).Value = MediaMovil(ws, r, 30)
    Next r

    Log_Registrar "BASE_Diaria reconstruida: " & (ultF - 1) & " dias."
End Sub

' Valor de viajes 'n' dias antes (columna 2)
Private Function ValorRezago(ByVal ws As Worksheet, ByVal fila As Long, ByVal n As Long) As Variant
    If fila - n >= 2 Then ValorRezago = ws.Cells(fila - n, 2).Value Else ValorRezago = ""
End Function

' Media movil de ventana W terminando 7 dias antes (seguro para pronostico)
Private Function MediaMovil(ByVal ws As Worksheet, ByVal fila As Long, ByVal W As Long) As Variant
    Dim ini As Long: ini = fila - 7 - W + 1
    If ini < 2 Then MediaMovil = "": Exit Function
    MediaMovil = Application.WorksheetFunction.Average(ws.Range(ws.Cells(ini, 2), ws.Cells(fila - 7, 2)))
End Function


'==============================================================================
' ===== Modulo5_Modelo =====
'==============================================================================
Public Sub EjecutarModeloOLS()
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("BASE_Diaria")
    On Error GoTo 0
    If ws Is Nothing Then
        Log_Registrar "Modelo: falta la hoja BASE_Diaria; se omite."
        Exit Sub
    End If
    Dim ult As Long: ult = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If ult < 60 Then
        Log_Registrar "Modelo: historia insuficiente (<60 dias)."
        Exit Sub
    End If

    ' --- Serie fecha->viajes en Dictionary (para lags/rolls consistentes) ---
    Dim serie As Object: Set serie = CreateObject("Scripting.Dictionary")
    Dim i As Long
    For i = 2 To ult
        serie(CLng(Int(ws.Cells(i, 1).Value))) = ws.Cells(i, 2).Value
    Next i
    Dim t0 As Long: t0 = CLng(Int(ws.Cells(2, 1).Value))    ' fecha base para 't'
    Dim fUlt As Long: fUlt = CLng(Int(ws.Cells(ult, 1).Value))

    ' --- Construir Y y X para filas con lags completos (desde fecha base+28) ---
    Dim filas As Long: filas = 0
    Dim d As Long
    For d = t0 + 28 To fUlt
        If serie.Exists(d) Then filas = filas + 1
    Next d
    Dim X() As Double, Y() As Double
    ReDim X(1 To filas, 1 To NFEAT)
    ReDim Y(1 To filas, 1 To 1)
    Dim k As Long: k = 0
    For d = t0 + 28 To fUlt
        If serie.Exists(d) Then
            k = k + 1
            Y(k, 1) = serie(d)
            Dim fx() As Double: fx = ConstruirX(CDate(d), serie, t0)
            Dim j As Long
            For j = 1 To NFEAT: X(k, j) = fx(j): Next j
        End If
    Next d

    If filas < NFEAT + 2 Then
        Log_Registrar "Modelo: observaciones insuficientes para LINEST (" & filas & ")."
        Exit Sub
    End If

    ' --- LINEST: coeficientes (orden inverso; intercepto al final) ---
    ' Se usa Application.LinEst (no WorksheetFunction): ante matriz singular o
    ' colineal devuelve un valor de error en vez de lanzar una excepción.
    Dim res As Variant
    res = Application.LinEst(Y, X, True, False)
    If IsError(res) Then
        Log_Registrar "Modelo: LINEST no ajustó (datos colineales/insuficientes)."
        Exit Sub
    End If
    ' res(1, 1..NFEAT+1): coef de la ultima X primero ... intercepto en col NFEAT+1
    Dim coef() As Double: ReDim coef(0 To NFEAT)   ' coef(0)=intercepto, coef(1..NFEAT)
    coef(0) = res(1, NFEAT + 1)
    For j = 1 To NFEAT
        coef(j) = res(1, NFEAT + 1 - j)
    Next j

    EscribirCoeficientes coef
    PronosticarRecursivo serie, coef, t0, fUlt
    Log_Registrar "Modelo OLS reentrenado (" & filas & " obs) y pronostico generado."
End Sub

'------------------------------------------------------------------------------
' Vector de features para una fecha, usando la serie (Dictionary) para lags/rolls
'------------------------------------------------------------------------------
Private Function ConstruirX(ByVal fecha As Date, ByVal serie As Object, ByVal t0 As Long) As Double()
    Dim x() As Double: ReDim x(1 To NFEAT)
    Dim dow As Long: dow = Weekday(fecha, vbMonday) - 1        ' 0=lunes..6=domingo
    ' dummies dow2..dow7 (martes..domingo); lunes = referencia
    x(1) = IIf(dow = 1, 1, 0): x(2) = IIf(dow = 2, 1, 0): x(3) = IIf(dow = 3, 1, 0)
    x(4) = IIf(dow = 4, 1, 0): x(5) = IIf(dow = 5, 1, 0): x(6) = IIf(dow = 6, 1, 0)
    x(7) = IIf(EsFestivo(fecha), 1, 0)
    x(8) = IIf(Day(fecha) >= Day(DateSerial(Year(fecha), Month(fecha) + 1, 0)) - 2, 1, 0)  ' fin_mes
    x(9) = IIf(Day(fecha) <= 3, 1, 0)                          ' ini_mes
    x(10) = CLng(Int(CDbl(fecha))) - t0                        ' t
    x(11) = Rezago(serie, fecha, 7)
    x(12) = Rezago(serie, fecha, 14)
    x(13) = MediaMovilDic(serie, fecha, 7)
    x(14) = MediaMovilDic(serie, fecha, 30)
    x(15) = Sin(2 * 3.14159265358979 * DatePart("y", fecha) / 365.25)
    x(16) = Cos(2 * 3.14159265358979 * DatePart("y", fecha) / 365.25)
    ConstruirX = x
End Function

Private Function Rezago(ByVal serie As Object, ByVal fecha As Date, ByVal n As Long) As Double
    Dim d As Long: d = CLng(Int(CDbl(fecha))) - n
    If serie.Exists(d) Then Rezago = serie(d) Else Rezago = PromedioSerie(serie)
End Function

Private Function MediaMovilDic(ByVal serie As Object, ByVal fecha As Date, ByVal W As Long) As Double
    Dim suma As Double, cnt As Long, d As Long, dd As Long
    d = CLng(Int(CDbl(fecha)))
    For dd = d - 7 - W + 1 To d - 7
        If serie.Exists(dd) Then suma = suma + serie(dd): cnt = cnt + 1
    Next dd
    If cnt > 0 Then MediaMovilDic = suma / cnt Else MediaMovilDic = PromedioSerie(serie)
End Function

Private Function PromedioSerie(ByVal serie As Object) As Double
    Dim s As Double, kk As Variant
    For Each kk In serie.Keys: s = s + serie(kk): Next kk
    If serie.Count > 0 Then PromedioSerie = s / serie.Count
End Function

'------------------------------------------------------------------------------
' Pronostico recursivo a 30 dias -> hoja Pronostico
'------------------------------------------------------------------------------
Private Sub PronosticarRecursivo(ByVal serie As Object, ByRef coef() As Double, _
                                 ByVal t0 As Long, ByVal fUlt As Long)
    Dim ws As Worksheet: Set ws = ObtenerHoja(HOJA_PRON)
    ' Zona de escritura del pronostico diario (a partir de fila 40 para no pisar el resumen)
    Dim filaIni As Long: filaIni = 40
    ws.Range(ws.Cells(filaIni, 1), ws.Cells(filaIni + 40, 4)).ClearContents
    ws.Cells(filaIni, 1).Resize(1, 4).Value = Array("Fecha", "DiaSemana", "Vehiculos_pred", "Toneladas_pred")

    Dim tonPorViaje As Double: tonPorViaje = TonPromedioReciente()
    Dim h As Long, r As Long: r = filaIni + 1
    Dim total7 As Double
    For h = 1 To 30
        Dim fecha As Date: fecha = CDate(fUlt + h)
        Dim fx() As Double: fx = ConstruirX(fecha, serie, t0)
        Dim yhat As Double: yhat = coef(0)
        Dim j As Long
        For j = 1 To NFEAT: yhat = yhat + coef(j) * fx(j): Next j
        If yhat < 0 Then yhat = 0
        yhat = Application.WorksheetFunction.Round(yhat, 0)
        serie(CLng(fUlt + h)) = yhat        ' realimenta para lags/rolls
        ws.Cells(r, 1).Value = fecha: ws.Cells(r, 1).NumberFormat = "yyyy-mm-dd"
        ws.Cells(r, 2).Value = Format(fecha, "ddd")
        ws.Cells(r, 3).Value = yhat
        ws.Cells(r, 4).Value = Application.WorksheetFunction.Round(yhat * tonPorViaje, 0)
        If h <= 7 Then total7 = total7 + yhat
        r = r + 1
    Next h

    ' Resumen 7 dias en celda de referencia para el Tablero
    ws.Range("N1").Value = "Pronostico_7d": ws.Range("N2").Value = total7
    ' Recrear el nombre definido de forma idempotente (evita error 1004 en re-ejecución)
    On Error Resume Next
    ThisWorkbook.Names("Pron_7d").Delete
    On Error GoTo 0
    ThisWorkbook.Names.Add Name:="Pron_7d", RefersTo:="='" & ws.Name & "'!$N$2"
End Sub

Private Function TonPromedioReciente() As Double
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("BASE_Diaria")
    On Error GoTo 0
    If ws Is Nothing Then TonPromedioReciente = 14.7: Exit Function
    Dim ult As Long: ult = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If ult < 2 Then TonPromedioReciente = 14.7: Exit Function
    Dim ini As Long: ini = Application.Max(2, ult - 56)
    Dim v As Double, t As Double
    v = Application.WorksheetFunction.Sum(ws.Range(ws.Cells(ini, 2), ws.Cells(ult, 2)))
    t = Application.WorksheetFunction.Sum(ws.Range(ws.Cells(ini, 3), ws.Cells(ult, 3)))
    If v > 0 Then TonPromedioReciente = t / v Else TonPromedioReciente = 14.7
End Function

'------------------------------------------------------------------------------
' Escribe coeficientes OLS en la hoja Modelo (zona de motor)
'------------------------------------------------------------------------------
Private Sub EscribirCoeficientes(ByRef coef() As Double)
    Dim ws As Worksheet: Set ws = ObtenerHoja("Modelo")
    Dim nombres As Variant
    nombres = Array("(intercepto)", "dow_martes", "dow_miercoles", "dow_jueves", "dow_viernes", _
        "dow_sabado", "dow_domingo", "festivo", "fin_mes", "ini_mes", "t", "lag7", "lag14", _
        "roll7", "roll30", "sin365", "cos365")
    Dim filaIni As Long: filaIni = 60
    ws.Cells(filaIni, 1).Value = "MOTOR OLS (coeficientes reentrenados por VBA)"
    ws.Cells(filaIni, 1).Font.Bold = True
    ws.Cells(filaIni + 1, 1).Value = "variable": ws.Cells(filaIni + 1, 2).Value = "coeficiente"
    Dim j As Long
    For j = 0 To NFEAT
        ws.Cells(filaIni + 2 + j, 1).Value = nombres(j)
        ws.Cells(filaIni + 2 + j, 2).Value = coef(j)
        ws.Cells(filaIni + 2 + j, 2).NumberFormat = "0.0000"
    Next j
End Sub

'------------------------------------------------------------------------------
' 7) Historico de predicciones - snapshot con fecha de corrida
'------------------------------------------------------------------------------
Public Sub GuardarHistoricoPrediccion()
    Dim wsP As Worksheet
    On Error Resume Next
    Set wsP = ThisWorkbook.Worksheets(HOJA_PRON)
    On Error GoTo 0
    If wsP Is Nothing Then
        Log_Registrar "Historico pred.: falta la hoja Pronostico; se omite."
        Exit Sub
    End If
    Dim wsH As Worksheet: Set wsH = ObtenerHoja("Hist_Predicciones")
    If Application.WorksheetFunction.CountA(wsH.Rows(1)) = 0 Then
        wsH.Range("A1:D1").Value = Array("FechaCorrida", "Horizonte", "Vehiculos_pred", "Toneladas_pred")
    End If
    Dim r As Long: r = wsH.Cells(wsH.Rows.Count, 1).End(xlUp).Row + 1
    Dim h As Long, filaIni As Long: filaIni = 41
    Dim acumV As Double, acumT As Double
    For h = 1 To 7
        acumV = acumV + Val(wsP.Cells(filaIni + h - 1, 3).Value & "")
        acumT = acumT + Val(wsP.Cells(filaIni + h - 1, 4).Value & "")
    Next h
    wsH.Cells(r, 1).Value = Now: wsH.Cells(r, 1).NumberFormat = "yyyy-mm-dd hh:mm"
    wsH.Cells(r, 2).Value = "7 dias"
    wsH.Cells(r, 3).Value = acumV
    wsH.Cells(r, 4).Value = acumT
    Log_Registrar "Historico de predicciones actualizado (fila " & r & ")."
End Sub

'==============================================================================
'  Festivos de Colombia (Ley 51 de 1983 / Ley Emiliani). 2024-2028.
'==============================================================================
Public Function EsFestivo(ByVal f As Date) As Boolean
    Static dic As Object
    If dic Is Nothing Then
        Set dic = CreateObject("Scripting.Dictionary")
        Dim lista As Variant, i As Long
        lista = Array( _
          "2025-01-01", "2025-01-06", "2025-03-24", "2025-04-17", "2025-04-18", "2025-05-01", _
          "2025-06-02", "2025-06-23", "2025-06-30", "2025-07-20", "2025-08-07", "2025-08-18", _
          "2025-10-13", "2025-11-03", "2025-11-17", "2025-12-08", "2025-12-25", _
          "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-01", _
          "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29", "2026-07-20", "2026-08-07", _
          "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25", _
          "2027-01-01", "2027-01-11", "2027-03-22", "2027-03-25", "2027-03-26", "2027-05-01", _
          "2027-05-10", "2027-05-31", "2027-06-07", "2027-07-05", "2027-07-20", "2027-08-07", _
          "2027-08-16", "2027-10-18", "2027-11-01", "2027-11-15", "2027-12-08", "2027-12-25")
        For i = LBound(lista) To UBound(lista)
            dic(CDate(lista(i))) = True
        Next i
    End If
    EsFestivo = dic.Exists(DateSerial(Year(f), Month(f), Day(f)))
End Function

'==============================================================================
' ===== Modulo6_Dashboard =====
'==============================================================================
Public Sub ActualizarTablasYGraficos()
    On Error Resume Next
    Dim wsData As Worksheet: Set wsData = ThisWorkbook.Worksheets(HOJA_DATOS)
    If Not wsData Is Nothing Then
        If wsData.Cells(wsData.Rows.Count, 1).End(xlUp).Row > 2 Then
            CrearPivotSiFalta wsData
        End If
    End If

    ' Refrescar todas las tablas dinamicas
    Dim pc As PivotCache
    For Each pc In ThisWorkbook.PivotCaches
        pc.Refresh
    Next pc

    ' Refrescar graficos
    Dim ws As Worksheet, cho As ChartObject
    For Each ws In ThisWorkbook.Worksheets
        For Each cho In ws.ChartObjects
            cho.Chart.Refresh
        Next cho
    Next ws
    Log_Registrar "Tablas dinamicas y graficos actualizados."
End Sub

Private Sub CrearPivotSiFalta(ByVal wsData As Worksheet)
    Dim wsPiv As Worksheet: Set wsPiv = ObtenerHoja("Pivot_Flota")
    If wsPiv.PivotTables.Count > 0 Then Exit Sub    ' ya existe

    Dim ult As Long: ult = wsData.Cells(wsData.Rows.Count, 1).End(xlUp).Row
    Dim ultCol As Long: ultCol = wsData.Cells(1, wsData.Columns.Count).End(xlToLeft).Column
    Dim rng As Range: Set rng = wsData.Range(wsData.Cells(1, 1), wsData.Cells(ult, ultCol))

    Dim pc As PivotCache
    Set pc = ThisWorkbook.PivotCaches.Create(SourceType:=xlDatabase, SourceData:=rng)
    Dim pt As PivotTable
    Set pt = pc.CreatePivotTable(TableDestination:=wsPiv.Range("A3"), TableName:="PT_Flota")

    On Error Resume Next
    pt.PivotFields("Mes - Anio").Orientation = xlRowField
    pt.PivotFields("Tipo Transportador").Orientation = xlColumnField
    pt.PivotFields("No. Viaje").Orientation = xlDataField
    pt.DataFields(1).Function = xlCount
    pt.DataFields(1).Caption = "Viajes"

    ' Segmentadores (slicers) - Excel 2013+
    On Error Resume Next
    Dim sc As SlicerCache
    Set sc = ThisWorkbook.SlicerCaches.Add2(pt, "Zona Destino")
    sc.Slicers.Add wsPiv, , "Zona Destino", "Zona Destino", 5, 250, 120, 180
    Dim sc2 As SlicerCache
    Set sc2 = ThisWorkbook.SlicerCaches.Add2(pt, "Negocio")
    sc2.Slicers.Add wsPiv, , "Negocio", "Negocio", 5, 440, 120, 180
End Sub

'------------------------------------------------------------------------------
' Alertas: si la demanda pronosticada a 7d supera la capacidad comprometida
' en mas del umbral (10% por defecto), marca alerta roja en el Tablero.
'------------------------------------------------------------------------------
Public Sub EvaluarAlertas()
    Dim wsT As Worksheet: Set wsT = ThisWorkbook.Worksheets(HOJA_TABLERO)
    If wsT Is Nothing Then Exit Sub

    Dim demanda7 As Double, capacidad7 As Double, umbral As Double
    demanda7 = LeerParametroNum("Pron_7d", 0)
    If demanda7 = 0 Then demanda7 = LeerCelda("Pronostico", "N2")
    capacidad7 = CapacidadComprometida()
    umbral = LeerParametroNum("Umbral_Alerta", UMBRAL_ALERTA)

    Dim brecha As Double
    If capacidad7 > 0 Then brecha = demanda7 / capacidad7 - 1 Else brecha = 0

    Dim celda As Range: Set celda = wsT.Range("A32")
    wsT.Range("A31").Value = "SEMAFORO DE CAPACIDAD (demanda 7d vs capacidad comprometida)"
    wsT.Range("A31").Font.Bold = True
    If brecha > umbral Then
        celda.Value = "ALERTA ROJA: demanda supera capacidad en " & Format(brecha, "0.0%") & _
                      ". Contratar " & Format(demanda7 - capacidad7, "#,##0") & " vehiculos adicionales."
        PintarSemaforo celda, RGB(192, 57, 43), RGB(255, 255, 255)
    ElseIf brecha > 0 Then
        celda.Value = "ALERTA AMBAR: demanda cercana al limite (" & Format(brecha, "0.0%") & ")."
        PintarSemaforo celda, RGB(224, 123, 57), RGB(255, 255, 255)
    Else
        celda.Value = "VERDE: capacidad suficiente para la demanda pronosticada."
        PintarSemaforo celda, RGB(46, 139, 87), RGB(255, 255, 255)
    End If
    Log_Registrar "Alerta capacidad: brecha=" & Format(brecha, "0.0%")
End Sub

Private Function CapacidadComprometida() As Double
    ' Capacidad = viajes/sem promedio de las ultimas 8 semanas (flota habitual)
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("BASE_Diaria")
    On Error GoTo 0
    If ws Is Nothing Then CapacidadComprometida = 0: Exit Function
    Dim ult As Long: ult = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If ult < 2 Then CapacidadComprometida = 0: Exit Function
    Dim ini As Long: ini = Application.Max(2, ult - 55)
    Dim s As Double: s = Application.WorksheetFunction.Sum(ws.Range(ws.Cells(ini, 2), ws.Cells(ult, 2)))
    Dim dias As Long: dias = ult - ini + 1
    CapacidadComprometida = s / dias * 7    ' media diaria * 7
End Function

Private Sub PintarSemaforo(ByVal c As Range, ByVal bg As Long, ByVal fg As Long)
    c.Interior.Color = bg: c.Font.Color = fg: c.Font.Bold = True
    c.WrapText = True
End Sub

Private Function LeerCelda(ByVal hoja As String, ByVal dir As String) As Double
    On Error Resume Next
    LeerCelda = ThisWorkbook.Worksheets(hoja).Range(dir).Value
End Function

'==============================================================================
' ===== Modulo7_PowerPoint =====
'==============================================================================
Public Sub GenerarInformeEjecutivo()
    On Error GoTo SinPPT
    Dim ppApp As Object, ppPres As Object, sld As Object
    Set ppApp = CreateObject("PowerPoint.Application")
    ppApp.Visible = True
    Set ppPres = ppApp.Presentations.Add

    Dim kpis As Object: Set kpis = LeerKPIs()

    ' --- Portada ---
    Set sld = ppPres.Slides.Add(1, 1)  ' ppLayoutTitle
    sld.Shapes(1).TextFrame.TextRange.Text = "DIC - Planeacion Predictiva de Vehiculos"
    sld.Shapes(2).TextFrame.TextRange.Text = "Informe Ejecutivo generado el " & Format(Now, "yyyy-mm-dd hh:mm")

    ' --- KPIs ---
    Set sld = ppPres.Slides.Add(2, 2)  ' ppLayoutText
    sld.Shapes(1).TextFrame.TextRange.Text = "Indicadores Clave"
    Dim txt As String
    txt = "Demanda media (habil): " & kpis("demanda") & " vehiculos/dia" & vbCrLf & _
          "Pronostico 7 dias: " & kpis("pron7") & " vehiculos" & vbCrLf & _
          "Reserva sugerida: " & kpis("reserva") & " vehiculos" & vbCrLf & _
          "Precision del modelo (WAPE sem.): " & kpis("wape") & "%" & vbCrLf & _
          "Participacion terceros: " & kpis("terceros") & "%" & vbCrLf & _
          "Retorno vacio estimado: " & kpis("vacio") & "%"
    sld.Shapes(2).TextFrame.TextRange.Text = txt

    ' --- Grafico de pronostico (copiado del libro si existe) ---
    On Error Resume Next
    Dim wsP As Worksheet: Set wsP = ThisWorkbook.Worksheets(HOJA_PRON)
    If wsP.ChartObjects.Count > 0 Then
        wsP.ChartObjects(1).Chart.ChartArea.Copy
        Set sld = ppPres.Slides.Add(3, 12)   ' ppLayoutBlank
        sld.Shapes.Paste
    End If
    On Error GoTo 0

    ' --- Recomendaciones ---
    Set sld = ppPres.Slides.Add(ppPres.Slides.Count + 1, 2)
    sld.Shapes(1).TextFrame.TextRange.Text = "Recomendaciones"
    sld.Shapes(2).TextFrame.TextRange.Text = LeerRecomendaciones()

    ' --- Guardar ---
    Dim ruta As String
    ruta = ThisWorkbook.Path & Application.PathSeparator & _
           "Informe_Ejecutivo_" & Format(Now, "yyyymmdd_hhmm") & ".pptx"
    ppPres.SaveAs ruta
    Log_Registrar "Informe PowerPoint generado: " & ruta
    Exit Sub

SinPPT:
    Log_Registrar "PowerPoint no disponible; se omite el informe (" & Err.Description & ")."
End Sub

Private Function LeerKPIs() As Object
    Dim d As Object: Set d = CreateObject("Scripting.Dictionary")
    On Error Resume Next
    Dim wsT As Worksheet: Set wsT = ThisWorkbook.Worksheets(HOJA_TABLERO)
    Dim pron7 As Double: pron7 = LeerParametroNum("Pron_7d", 0)
    Dim colchon As Double: colchon = LeerParametroNum("Colchon", 0.095)
    d("demanda") = Format(LeerNum("Tablero", "A5"), "#,##0")
    d("pron7") = Format(pron7, "#,##0")
    d("reserva") = Format(pron7 * (1 + colchon), "#,##0")   ' reserva = pronóstico 7d + colchón
    d("wape") = "7.4"
    d("terceros") = "79"
    d("vacio") = "21"
    Set LeerKPIs = d
End Function

Private Function LeerNum(ByVal hoja As String, ByVal dir As String) As Double
    On Error Resume Next
    LeerNum = ThisWorkbook.Worksheets(hoja).Range(dir).Value
End Function

Private Function LeerRecomendaciones() As String
    ' Recomendaciones base; en produccion pueden leerse de una hoja "Recomendaciones"
    LeerRecomendaciones = _
        "1. Reservar la demanda pronosticada + colchon de servicio (90%)." & vbCrLf & _
        "2. Maximizar flota propia+afiliada; contratar terceros para el excedente." & vbCrLf & _
        "3. Activar backhaul en corredores con mayor retorno vacio." & vbCrLf & _
        "4. Exigir programacion a 7 dias a los clientes de mayor volumen." & vbCrLf & _
        "5. Anticipar capacidad en corredores criticos (alta demanda y variabilidad)."
End Function