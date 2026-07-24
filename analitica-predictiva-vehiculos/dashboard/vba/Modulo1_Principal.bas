Attribute VB_Name = "Modulo1_Principal"
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
Option Explicit

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
Public Sub EjecutarTodo()
    Dim t0 As Double: t0 = Timer
    On Error GoTo Errores

    OptimizarInicio                         ' apaga pantalla/calculo automatico

    Log_Registrar "===== INICIO DE ACTUALIZACION ====="
    gPaso = "1. Importar archivos":     Modulo2_Importar.ImportarNuevosArchivos
    gPaso = "2. Consolidar historico":  Modulo2_Importar.ConsolidarHistorico
    gPaso = "3. Limpiar datos":         Modulo3_Limpieza.LimpiarDatos

    ' ¿Hay datos para trabajar? Si no, detener con un aviso claro (no un error).
    If FilasDatos() < 60 Then
        OptimizarFin
        Log_Registrar "Sin datos suficientes (" & FilasDatos() & " filas). Se detiene con aviso."
        MsgBox "No hay datos suficientes para generar el pronostico." & vbCrLf & vbCrLf & _
               "Que hacer:" & vbCrLf & _
               "  1) Abra la carpeta 'Entrada' de su ESCRITORIO" & vbCrLf & _
               "     (la macro la crea automaticamente si no existe)." & vbCrLf & _
               "  2) Coloque alli su archivo de viajes (use la plantilla), o" & vbCrLf & _
               "     pegue el historico directamente en la hoja DATA." & vbCrLf & _
               "  3) Vuelva a pulsar el boton ACTUALIZAR TODO." & vbCrLf & vbCrLf & _
               "Se requieren al menos 60 dias de historia.", vbExclamation, "DIC - Planeacion"
        Exit Sub
    End If

    gPaso = "4. Recalcular indicadores": Modulo4_Indicadores.RecalcularIndicadores
    gPaso = "5. Ejecutar modelo OLS":   Modulo5_Modelo.EjecutarModeloOLS
    gPaso = "7. Guardar historico pred.": Modulo5_Modelo.GuardarHistoricoPrediccion
    gPaso = "6. Actualizar tablas/graficos": Modulo6_Dashboard.ActualizarTablasYGraficos
    gPaso = "8. Evaluar alertas":       Modulo6_Dashboard.EvaluarAlertas

    ' 9. Informe ejecutivo en PowerPoint (opcional segun parametro)
    If LeerParametroBool("GenerarPPT", True) Then
        gPaso = "9. Informe PowerPoint": Modulo7_PowerPoint.GenerarInformeEjecutivo
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
