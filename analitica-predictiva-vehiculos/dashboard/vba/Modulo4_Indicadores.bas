Attribute VB_Name = "Modulo4_Indicadores"
'==============================================================================
'  Modulo4_Indicadores - Construye la serie diaria de demanda e indices
'  A partir de la hoja DATA genera la hoja BASE_Diaria con:
'   Fecha | viajes | toneladas | features de calendario | rezagos | medias moviles
'  Esta hoja es la entrada del modelo (Modulo5) y de los graficos (Modulo6).
'==============================================================================
Option Explicit

Public Sub RecalcularIndicadores()
    Dim wsData As Worksheet: Set wsData = Modulo1_Principal.ObtenerHoja(Modulo1_Principal.HOJA_DATOS)
    Dim ult As Long: ult = Modulo1_Principal.UltimaFila(wsData, 1)
    If ult < 2 Then
        Modulo1_Principal.Log_Registrar "BASE_Diaria: DATA vacia, se omite."
        Exit Sub
    End If

    ' --- Agregar viajes y toneladas por fecha usando un Dictionary ---
    Dim col As Object: Set col = Modulo1_Principal.MapaColNorm(wsData)
    Dim cFecha As Long: cFecha = col(Modulo1_Principal.NormHdr("Fecha"))
    Dim cPeso As Long: cPeso = col(Modulo1_Principal.NormHdr("PESO CARGADO (ton)"))
    If cFecha = 0 Or cPeso = 0 Then
        Modulo1_Principal.Log_Registrar "BASE_Diaria abortada: faltan columnas Fecha/PESO."
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

    Dim ws As Worksheet: Set ws = Modulo1_Principal.ObtenerHoja("BASE_Diaria")
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
        ws.Cells(r, 7).Value = IIf(Modulo5_Modelo.EsFestivo(fecha), 1, 0)
        ws.Cells(r, 8).Value = IIf(Modulo5_Modelo.EsFestivo(fecha - 1), 1, 0)
        ws.Cells(r, 9).Value = IIf(Modulo5_Modelo.EsFestivo(fecha + 1), 1, 0)
        ws.Cells(r, 10).Value = IIf(Day(fecha) >= Day(DateSerial(Year(fecha), Month(fecha) + 1, 0)) - 2, 1, 0)
        ws.Cells(r, 11).Value = IIf(Day(fecha) <= 3, 1, 0)
        ws.Cells(r, 12).Value = d - fmin                             ' tendencia t
        ws.Cells(r, 20).Value = Sin(2 * 3.14159265 * DatePart("y", fecha) / 365.25)
        ws.Cells(r, 21).Value = Cos(2 * 3.14159265 * DatePart("y", fecha) / 365.25)
        ws.Cells(r, 22).Value = IIf(Weekday(fecha, vbMonday) <= 5 And Not Modulo5_Modelo.EsFestivo(fecha), 1, 0)
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

    Modulo1_Principal.Log_Registrar "BASE_Diaria reconstruida: " & (ultF - 1) & " dias."
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

