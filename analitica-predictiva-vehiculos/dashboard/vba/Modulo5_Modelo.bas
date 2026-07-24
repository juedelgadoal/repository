Attribute VB_Name = "Modulo5_Modelo"
'==============================================================================
'  Modulo5_Modelo - Motor predictivo (Regresion Multiple / OLS) 100% nativo Excel
'
'  Reentrena el modelo sobre BASE_Diaria con LINEST y genera el pronostico
'  recursivo a 30 dias. El modelo replica el seleccionado en la Fase 7
'  (WAPE semanal 7.4% <= meta 10%). Features (bien condicionadas para LINEST):
'    dow2..dow7 (dummies, lunes=ref), festivo, fin_mes, ini_mes, t,
'    lag7, lag14, roll7, roll30, sin365, cos365  -> 16 predictores + intercepto
'==============================================================================
Option Explicit

Private Const NFEAT As Long = 16

'------------------------------------------------------------------------------
' Entrena OLS y escribe coeficientes en la hoja Modelo; luego pronostica.
'------------------------------------------------------------------------------
Public Sub EjecutarModeloOLS()
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("BASE_Diaria")
    On Error GoTo 0
    If ws Is Nothing Then
        Modulo1_Principal.Log_Registrar "Modelo: falta la hoja BASE_Diaria; se omite."
        Exit Sub
    End If
    Dim ult As Long: ult = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If ult < 60 Then
        Modulo1_Principal.Log_Registrar "Modelo: historia insuficiente (<60 dias)."
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
        Modulo1_Principal.Log_Registrar "Modelo: observaciones insuficientes para LINEST (" & filas & ")."
        Exit Sub
    End If

    ' --- LINEST: coeficientes (orden inverso; intercepto al final) ---
    ' Se usa Application.LinEst (no WorksheetFunction): ante matriz singular o
    ' colineal devuelve un valor de error en vez de lanzar una excepción.
    Dim res As Variant
    res = Application.LinEst(Y, X, True, False)
    If IsError(res) Then
        Modulo1_Principal.Log_Registrar "Modelo: LINEST no ajustó (datos colineales/insuficientes)."
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
    Modulo1_Principal.Log_Registrar "Modelo OLS reentrenado (" & filas & " obs) y pronostico generado."
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
    Dim ws As Worksheet: Set ws = Modulo1_Principal.ObtenerHoja(Modulo1_Principal.HOJA_PRON)
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
    Dim ws As Worksheet: Set ws = Modulo1_Principal.ObtenerHoja("Modelo")
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
    Set wsP = ThisWorkbook.Worksheets(Modulo1_Principal.HOJA_PRON)
    On Error GoTo 0
    If wsP Is Nothing Then
        Modulo1_Principal.Log_Registrar "Historico pred.: falta la hoja Pronostico; se omite."
        Exit Sub
    End If
    Dim wsH As Worksheet: Set wsH = Modulo1_Principal.ObtenerHoja("Hist_Predicciones")
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
    Modulo1_Principal.Log_Registrar "Historico de predicciones actualizado (fila " & r & ")."
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
