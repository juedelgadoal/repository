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

'------------------------------------------------------------------------------
' PUNTO DE ENTRADA UNICO - asignar este Sub al boton del Tablero
'------------------------------------------------------------------------------
Public Sub EjecutarTodo()
    Dim t0 As Double: t0 = Timer
    On Error GoTo Errores

    OptimizarInicio                         ' apaga pantalla/calculo automatico

    Log_Registrar "===== INICIO DE ACTUALIZACION ====="
    Modulo2_Importar.ImportarNuevosArchivos ' 1
    Modulo2_Importar.ConsolidarHistorico    ' 2
    Modulo3_Limpieza.LimpiarDatos           ' 3
    Modulo4_Indicadores.RecalcularIndicadores ' 4
    Modulo5_Modelo.EjecutarModeloOLS        ' 5
    Modulo5_Modelo.GuardarHistoricoPrediccion ' 7
    Modulo6_Dashboard.ActualizarTablasYGraficos ' 6
    Modulo6_Dashboard.EvaluarAlertas        ' 8

    ' 9. Informe ejecutivo en PowerPoint (opcional segun parametro)
    If LeerParametroBool("GenerarPPT", True) Then
        Modulo7_PowerPoint.GenerarInformeEjecutivo
    End If

    Log_Registrar "===== FIN OK en " & Format(Timer - t0, "0.0") & " s ====="
    OptimizarFin
    MsgBox "Actualizacion completada correctamente." & vbCrLf & _
           "Tiempo: " & Format(Timer - t0, "0.0") & " s", vbInformation, "DIC - Planeacion"
    Exit Sub

Errores:
    OptimizarFin
    Log_Registrar "ERROR " & Err.Number & ": " & Err.Description
    MsgBox "Ocurrio un error y el proceso se detuvo:" & vbCrLf & _
           "[" & Err.Number & "] " & Err.Description, vbCritical, "DIC - Planeacion"
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
