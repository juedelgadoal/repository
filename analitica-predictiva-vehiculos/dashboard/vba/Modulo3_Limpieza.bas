Attribute VB_Name = "Modulo3_Limpieza"
'==============================================================================
'  Modulo3_Limpieza - Depuracion de la hoja DATA
'  Reglas derivadas de la Fase 1 (Auditoria):
'   - Normaliza texto (MAYUSCULAS, sin espacios) en ciudades/placas.
'   - Convierte Fecha a fecha real; recalcula MES/ANIO/Mes-Anio desde Fecha.
'   - Elimina filas sin Fecha o sin PLACA.
'   - Marca (no borra) pesos atipicos y origen=destino en columna de auditoria.
'==============================================================================
Option Explicit

Public Sub LimpiarDatos()
    Dim ws As Worksheet: Set ws = Modulo1_Principal.ObtenerHoja(Modulo1_Principal.HOJA_DATOS)
    Dim ult As Long: ult = Modulo1_Principal.UltimaFila(ws, 1)
    If ult < 2 Then Exit Sub

    Dim col As Object: Set col = MapaColumnas(ws)
    Dim datos As Variant, i As Long, nElim As Long, nAtip As Long
    datos = ws.Range(ws.Cells(2, 1), ws.Cells(ult, ws.UsedRange.Columns.Count)).Value

    Dim cFecha As Long, cPlaca As Long, cOrig As Long, cDest As Long, cPeso As Long
    Dim cMes As Long, cAnio As Long, cMesAnio As Long
    cFecha = col("Fecha"): cPlaca = col("PLACA")
    cOrig = col("Ciudad Origen"): cDest = col("Ciudad Destino"): cPeso = col("PESO CARGADO (ton)")
    cMes = col("MES"): cAnio = col("ANIO"): cMesAnio = col("Mes - Anio")

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

    Modulo1_Principal.Log_Registrar "Limpieza: eliminadas " & nElim & " filas invalidas; " & k & " validas."
End Sub

' Devuelve un Dictionary encabezado -> indice de columna
Private Function MapaColumnas(ByVal ws As Worksheet) As Object
    Dim d As Object: Set d = CreateObject("Scripting.Dictionary")
    Dim j As Long, ultCol As Long
    ultCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
    For j = 1 To ultCol
        d(CStr(ws.Cells(1, j).Value)) = j
    Next j
    ' Tolerancia a variantes de acentos
    If Not d.Exists("ANIO") And d.Exists("A" & Chr(209) & "O") Then d("ANIO") = d("A" & Chr(209) & "O")
    Set MapaColumnas = d
End Function

Private Function RecortarMatriz(ByRef m As Variant, ByVal nf As Long, ByVal nc As Long) As Variant
    Dim r() As Variant, i As Long, j As Long
    ReDim r(1 To nf, 1 To nc)
    For i = 1 To nf: For j = 1 To nc: r(i, j) = m(i, j): Next j: Next i
    RecortarMatriz = r
End Function
