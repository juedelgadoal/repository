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
    Dim base As String: base = ThisWorkbook.Path

    ' Caso 1: libro nunca guardado (sin ruta en disco)
    If Len(base) = 0 Then
        Modulo1_Principal.Log_Registrar "Importacion omitida: guarde el libro en una carpeta local primero."
        Exit Sub
    End If

    ' Caso 2: libro en OneDrive/SharePoint con Autoguardado (la ruta es una URL
    ' https:// y Dir/MkDir no funcionan sobre URLs). Aviso claro y se omite.
    If InStr(1, base, "http", vbTextCompare) = 1 Then
        Modulo1_Principal.Log_Registrar "Importacion omitida: el libro esta en OneDrive (ruta URL)."
        MsgBox "El libro esta guardado en OneDrive/SharePoint y la macro no puede " & _
               "leer la carpeta 'Entrada' desde una ruta web." & vbCrLf & vbCrLf & _
               "Solucion: guarde este archivo en una carpeta LOCAL (p. ej. C:\DIC\) " & _
               "o desactive Autoguardado, y vuelva a ejecutar." & vbCrLf & vbCrLf & _
               "Alternativa: pegue los datos directamente en la hoja DATA.", _
               vbExclamation, "DIC - Planeacion"
        Exit Sub
    End If

    Dim ruta As String, archivo As String, nImport As Long
    ruta = base & Application.PathSeparator & Modulo1_Principal.CARPETA_ENTRADA & Application.PathSeparator

    ' Caso 3: la carpeta no existe -> se CREA automaticamente y se avisa
    If Dir(ruta, vbDirectory) = "" Then
        On Error Resume Next
        MkDir base & Application.PathSeparator & Modulo1_Principal.CARPETA_ENTRADA
        On Error GoTo 0
        Modulo1_Principal.Log_Registrar "Carpeta Entrada creada en: " & ruta
        MsgBox "La carpeta 'Entrada' no existia y fue creada automaticamente en:" & vbCrLf & _
               ruta & vbCrLf & vbCrLf & _
               "Coloque alli su archivo de viajes y vuelva a pulsar ACTUALIZAR TODO.", _
               vbInformation, "DIC - Planeacion"
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
    ' CSV (Excel los abre igual que un libro)
    archivo = Dir(ruta & "*.csv")
    Do While archivo <> ""
        ApilarArchivo ruta & archivo, wsStage
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

' Abre un libro externo y apila su hoja de datos en el staging, MAPEANDO por
' nombre de encabezado (no por posición). Así el archivo de entrada puede tener
' las columnas en cualquier orden y con o sin tildes; las columnas que falten se
' dejan vacías y las sobrantes se ignoran.
Private Sub ApilarArchivo(ByVal fullpath As String, ByVal wsStage As Worksheet)
    Dim wb As Workbook, wsO As Worksheet
    On Error Resume Next
    Set wb = Workbooks.Open(fullpath, ReadOnly:=True, UpdateLinks:=0)
    If wb Is Nothing Then Exit Sub
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
    Dim srcMap As Object: Set srcMap = Modulo1_Principal.MapaColNorm(wsO, hdrRow)

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
        key = Modulo1_Principal.NormHdr(CStr(canon(c)))
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
