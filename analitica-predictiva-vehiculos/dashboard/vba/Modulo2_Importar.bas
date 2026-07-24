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
    RutaEntrada = esc & Application.PathSeparator & Modulo1_Principal.CARPETA_ENTRADA & Application.PathSeparator
End Function

Public Sub ImportarNuevosArchivos()
    Dim wsStage As Worksheet
    Set wsStage = Modulo1_Principal.ObtenerHoja("_Staging")
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
                Modulo1_Principal.Log_Registrar "Carpeta Entrada creada: " & ruta
            End If
        End If
    End If

    ' B) SELECTOR DE ARCHIVOS: si no llego nada por carpeta, el usuario elige su
    '    archivo directamente en una ventana estandar de Windows. No depende de
    '    rutas, del Escritorio ni de OneDrive.
    If nImport = 0 Then
        Dim abrir As Boolean
        If Modulo1_Principal.FilasDatos() < 60 Then
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
                Modulo1_Principal.Log_Registrar "Seleccion de archivos cancelada por el usuario."
            End If
        End If
    End If

    Modulo1_Principal.Log_Registrar "Archivos importados: " & nImport
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
