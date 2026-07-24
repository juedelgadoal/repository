Attribute VB_Name = "Modulo6_Dashboard"
'==============================================================================
'  Modulo6_Dashboard - Tablas dinamicas, segmentadores, graficos y alertas
'==============================================================================
Option Explicit

'------------------------------------------------------------------------------
' Crea/actualiza una Tabla Dinamica de viajes por Mes-Anio x Tipo Transportador
' y refresca todos los pivots y graficos del libro.
'------------------------------------------------------------------------------
Public Sub ActualizarTablasYGraficos()
    On Error Resume Next
    Dim wsData As Worksheet: Set wsData = ThisWorkbook.Worksheets(Modulo1_Principal.HOJA_DATOS)
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
    Modulo1_Principal.Log_Registrar "Tablas dinamicas y graficos actualizados."
End Sub

Private Sub CrearPivotSiFalta(ByVal wsData As Worksheet)
    Dim wsPiv As Worksheet: Set wsPiv = Modulo1_Principal.ObtenerHoja("Pivot_Flota")
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
    Dim wsT As Worksheet: Set wsT = ThisWorkbook.Worksheets(Modulo1_Principal.HOJA_TABLERO)
    If wsT Is Nothing Then Exit Sub

    Dim demanda7 As Double, capacidad7 As Double, umbral As Double
    demanda7 = Modulo1_Principal.LeerParametroNum("Pron_7d", 0)
    If demanda7 = 0 Then demanda7 = LeerCelda("Pronostico", "N2")
    capacidad7 = CapacidadComprometida()
    umbral = Modulo1_Principal.LeerParametroNum("Umbral_Alerta", Modulo1_Principal.UMBRAL_ALERTA)

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
    Modulo1_Principal.Log_Registrar "Alerta capacidad: brecha=" & Format(brecha, "0.0%")
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
