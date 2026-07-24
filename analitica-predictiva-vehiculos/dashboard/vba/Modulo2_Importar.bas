Attribute VB_Name = "Modulo2_Importar"
'==============================================================================
'  Modulo2_Importar - Importacion y consolidacion del historico
'  Lee todos los .xlsx/.xlsm/.csv de la subcarpeta "Entrada" (junto al libro),
'  los apila y los consolida en la hoja DATA evitando duplicados por No. Viaje.
'==============================================================================
Option Explicit

' Encabezados esperados (orden canonico de la hoja DATA)
Public Function EncabezadosCanonicos() As Variant
    EncabezadosCanonicos = Array("No. Viaje", "Negocio", "Ciudad Origen", "Ciudad Destino", _
        "Fecha", "Zona Destino", "Tipologia de camion", "Tipo Transportador", "Tipo Negocio", _
        "MES", "ANIO", "Mes - Anio", "Tipo Viaje", "Zona Origen", "CLIENTE", "PLACA", _
        "PESO CARGADO (ton)")
End Function

'------------------------------------------------------------------------------
' 1) Importa todos los archivos nuevos de la carpeta Entrada
'------------------------------------------------------------------------------
Public Sub ImportarNuevosArchivos()
    Dim ruta As String, archivo As String, nImport As Long
    ruta = ThisWorkbook.Path & Application.PathSeparator & Modulo1_Principal.CARPETA_ENTRADA & Application.PathSeparator

    If Dir(ruta, vbDirectory) = "" Then
        Modulo1_Principal.Log_Registrar "Carpeta Entrada no existe; se omite importacion."
        Exit Sub
    End If

    Dim wsStage As Worksheet
    Set wsStage = Modulo1_Principal.ObtenerHoja("_Staging")
    wsStage.Cells.Clear
    EscribirEncabezados wsStage

    archivo = Dir(ruta & "*.xls*")
    Do While archivo <> ""
        ApilarArchivo ruta & archivo, wsStage
        MoverAProcesados ruta, archivo
        nImport = nImport + 1
        archivo = Dir()
    Loop
    ' CSV
    archivo = Dir(ruta & "*.csv")
    Do While archivo <> ""
        ApilarCSV ruta & archivo, wsStage
        MoverAProcesados ruta, archivo
        nImport = nImport + 1
        archivo = Dir()
    Loop

    Modulo1_Principal.Log_Registrar "Archivos importados: " & nImport
End Sub

Private Sub EscribirEncabezados(ByVal ws As Worksheet)
    Dim h As Variant, j As Long
    h = EncabezadosCanonicos()
    For j = LBound(h) To UBound(h)
        ws.Cells(1, j + 1).Value = h(j)
    Next j
End Sub

' Abre un libro externo y apila su primera hoja de datos en el staging
Private Sub ApilarArchivo(ByVal fullpath As String, ByVal wsStage As Worksheet)
    Dim wb As Workbook, wsO As Worksheet, rIni As Long, rFin As Long
    On Error Resume Next
    Set wb = Workbooks.Open(fullpath, ReadOnly:=True, UpdateLinks:=0)
    If wb Is Nothing Then Exit Sub
    Set wsO = DetectarHojaDatos(wb)
    If Not wsO Is Nothing Then
        rIni = wsStage.Cells(wsStage.Rows.Count, 1).End(xlUp).Row + 1
        Dim ultO As Long: ultO = wsO.Cells(wsO.Rows.Count, 1).End(xlUp).Row
        If ultO > 1 Then
            wsO.Range(wsO.Rows(2), wsO.Rows(ultO)).Copy
            wsStage.Cells(rIni, 1).PasteSpecial xlPasteValues
        End If
    End If
    wb.Close SaveChanges:=False
    Application.CutCopyMode = False
End Sub

Private Sub ApilarCSV(ByVal fullpath As String, ByVal wsStage As Worksheet)
    Dim wb As Workbook
    On Error Resume Next
    Set wb = Workbooks.Open(fullpath, ReadOnly:=True)
    ApilarArchivo fullpath, wsStage
    If Not wb Is Nothing Then wb.Close SaveChanges:=False
End Sub

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
    If Dir(destino, vbDirectory) = "" Then MkDir destino
    On Error Resume Next
    Name ruta & archivo As destino & Format(Now, "yyyymmdd_hhmmss_") & archivo
End Sub

'------------------------------------------------------------------------------
' 2) Consolida staging + DATA existente, elimina duplicados por No. Viaje
'------------------------------------------------------------------------------
Public Sub ConsolidarHistorico()
    Dim wsData As Worksheet, wsStage As Worksheet
    Set wsData = Modulo1_Principal.ObtenerHoja(Modulo1_Principal.HOJA_DATOS)
    Set wsStage = Modulo1_Principal.ObtenerHoja("_Staging")

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
    Modulo1_Principal.Log_Registrar "Historico consolidado. Registros: " & _
        (wsData.Cells(wsData.Rows.Count, 1).End(xlUp).Row - 1)
End Sub
