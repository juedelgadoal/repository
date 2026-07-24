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
' Carpeta de carga: 'Entrada' EN EL ESCRITORIO del usuario (independiente de
' donde este guardado el libro, funciona aun con el libro en OneDrive).
' WScript.Shell resuelve el Escritorio real, incluso redirigido a OneDrive o
' con Windows en espanol ("Escritorio").
Public Function RutaEntrada() As String
    Dim esc As String
    On Error Resume Next
    esc = CreateObject("WScript.Shell").SpecialFolders("Desktop")
    On Error GoTo 0
    If Len(esc) = 0 Then esc = Environ$("USERPROFILE") & Application.PathSeparator & "Desktop"
    RutaEntrada = esc & Application.PathSeparator & Modulo1_Principal.CARPETA_ENTRADA & Application.PathSeparator
End Function

Public Sub ImportarNuevosArchivos()
    Dim ruta As String, archivo As String, nImport As Long
    ruta = RutaEntrada()

    ' Si la carpeta no existe en el Escritorio -> se CREA automaticamente y se avisa
    If Dir(ruta, vbDirectory) = "" Then
        On Error Resume Next
        MkDir Left$(ruta, Len(ruta) - 1)
        On Error GoTo 0
        Modulo1_Principal.Log_Registrar "Carpeta Entrada creada en el Escritorio: " & ruta
        MsgBox "La carpeta 'Entrada' fue creada en su ESCRITORIO:" & vbCrLf & _
               ruta & vbCrLf & vbCrLf & _
               "Coloque alli su archivo de viajes (Plantilla_Carga_DATA.xlsx) " & _
               "y vuelva a pulsar ACTUALIZAR TODO.", _
               vbInformation, "DIC - Planeacion"
        Exit Sub
    End If

    Dim wsStage As Worksheet
    Set wsStage = Modulo1_Principal.ObtenerHoja("_Staging")
    wsStage.Cells.Clear
    EscribirEncabezados wsStage

    ' 1) Enumerar PRIMERO todos los archivos y luego procesarlos.
    '    (Dir no admite llamadas anidadas: ApilarArchivo/MoverAProcesados usan
    '    Dir/Name internamente, lo que reiniciaba la enumeracion y provocaba el
    '    error 5 "Argumento o llamada a procedimiento no valida" en Dir().)
    Dim archivos As Collection: Set archivos = New Collection
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

    ' 2) Procesar la lista ya cerrada
    Dim it As Variant
    For Each it In archivos
        ApilarArchivo ruta & it, wsStage
        MoverAProcesados ruta, CStr(it)
        nImport = nImport + 1
    Next it

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
    On Error Resume Next
    If Dir(destino, vbDirectory) = "" Then MkDir Left$(destino, Len(destino) - 1)
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
