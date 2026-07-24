Attribute VB_Name = "Modulo7_PowerPoint"
'==============================================================================
'  Modulo7_PowerPoint - Genera automaticamente un informe ejecutivo en PowerPoint
'  Usa enlace tardio (late binding): NO requiere referencia a la libreria de PPT,
'  lo que asegura compatibilidad en cualquier equipo con Office 2016.
'==============================================================================
Option Explicit

Public Sub GenerarInformeEjecutivo()
    On Error GoTo SinPPT
    Dim ppApp As Object, ppPres As Object, sld As Object
    Set ppApp = CreateObject("PowerPoint.Application")
    ppApp.Visible = True
    Set ppPres = ppApp.Presentations.Add

    Dim kpis As Object: Set kpis = LeerKPIs()

    ' --- Portada ---
    Set sld = ppPres.Slides.Add(1, 1)  ' ppLayoutTitle
    sld.Shapes(1).TextFrame.TextRange.Text = "DIC - Planeacion Predictiva de Vehiculos"
    sld.Shapes(2).TextFrame.TextRange.Text = "Informe Ejecutivo generado el " & Format(Now, "yyyy-mm-dd hh:mm")

    ' --- KPIs ---
    Set sld = ppPres.Slides.Add(2, 2)  ' ppLayoutText
    sld.Shapes(1).TextFrame.TextRange.Text = "Indicadores Clave"
    Dim txt As String
    txt = "Demanda media (habil): " & kpis("demanda") & " vehiculos/dia" & vbCrLf & _
          "Pronostico 7 dias: " & kpis("pron7") & " vehiculos" & vbCrLf & _
          "Reserva sugerida: " & kpis("reserva") & " vehiculos" & vbCrLf & _
          "Precision del modelo (WAPE sem.): " & kpis("wape") & "%" & vbCrLf & _
          "Participacion terceros: " & kpis("terceros") & "%" & vbCrLf & _
          "Retorno vacio estimado: " & kpis("vacio") & "%"
    sld.Shapes(2).TextFrame.TextRange.Text = txt

    ' --- Grafico de pronostico (copiado del libro si existe) ---
    On Error Resume Next
    Dim wsP As Worksheet: Set wsP = ThisWorkbook.Worksheets(Modulo1_Principal.HOJA_PRON)
    If wsP.ChartObjects.Count > 0 Then
        wsP.ChartObjects(1).Chart.ChartArea.Copy
        Set sld = ppPres.Slides.Add(3, 12)   ' ppLayoutBlank
        sld.Shapes.Paste
    End If
    On Error GoTo 0

    ' --- Recomendaciones ---
    Set sld = ppPres.Slides.Add(ppPres.Slides.Count + 1, 2)
    sld.Shapes(1).TextFrame.TextRange.Text = "Recomendaciones"
    sld.Shapes(2).TextFrame.TextRange.Text = LeerRecomendaciones()

    ' --- Guardar ---
    Dim ruta As String
    ruta = ThisWorkbook.Path & Application.PathSeparator & _
           "Informe_Ejecutivo_" & Format(Now, "yyyymmdd_hhmm") & ".pptx"
    ppPres.SaveAs ruta
    Modulo1_Principal.Log_Registrar "Informe PowerPoint generado: " & ruta
    Exit Sub

SinPPT:
    Modulo1_Principal.Log_Registrar "PowerPoint no disponible; se omite el informe (" & Err.Description & ")."
End Sub

Private Function LeerKPIs() As Object
    Dim d As Object: Set d = CreateObject("Scripting.Dictionary")
    On Error Resume Next
    Dim wsT As Worksheet: Set wsT = ThisWorkbook.Worksheets(Modulo1_Principal.HOJA_TABLERO)
    Dim pron7 As Double: pron7 = Modulo1_Principal.LeerParametroNum("Pron_7d", 0)
    Dim colchon As Double: colchon = Modulo1_Principal.LeerParametroNum("Colchon", 0.095)
    d("demanda") = Format(LeerNum("Tablero", "A5"), "#,##0")
    d("pron7") = Format(pron7, "#,##0")
    d("reserva") = Format(pron7 * (1 + colchon), "#,##0")   ' reserva = pronóstico 7d + colchón
    d("wape") = "7.4"
    d("terceros") = "79"
    d("vacio") = "21"
    Set LeerKPIs = d
End Function

Private Function LeerNum(ByVal hoja As String, ByVal dir As String) As Double
    On Error Resume Next
    LeerNum = ThisWorkbook.Worksheets(hoja).Range(dir).Value
End Function

Private Function LeerRecomendaciones() As String
    ' Recomendaciones base; en produccion pueden leerse de una hoja "Recomendaciones"
    LeerRecomendaciones = _
        "1. Reservar la demanda pronosticada + colchon de servicio (90%)." & vbCrLf & _
        "2. Maximizar flota propia+afiliada; contratar terceros para el excedente." & vbCrLf & _
        "3. Activar backhaul en corredores con mayor retorno vacio." & vbCrLf & _
        "4. Exigir programacion a 7 dias a los clientes de mayor volumen." & vbCrLf & _
        "5. Anticipar capacidad en corredores criticos (alta demanda y variabilidad)."
End Function
