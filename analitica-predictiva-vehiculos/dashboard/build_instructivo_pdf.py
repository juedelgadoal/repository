"""
Genera el PDF del instructivo de alimentación a partir del Markdown.
Convierte informes/07_INSTRUCTIVO_ALIMENTACION.md -> HTML estilizado -> PDF
usando Chromium headless (no requiere LibreOffice).

Uso:  python3 build_instructivo_pdf.py
"""
import os, subprocess, glob, markdown

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MD = os.path.join(BASE, "informes", "07_INSTRUCTIVO_ALIMENTACION.md")
HTML = os.path.join(BASE, "dashboard", "_instructivo.html")
PDF = os.path.join(BASE, "informes", "Instructivo_Alimentacion_Macro.pdf")

CSS = """
@page { size: A4; margin: 16mm 15mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color:#1a1a1a; font-size:10.5pt; line-height:1.45; }
h1 { color:#1F4E79; font-size:19pt; margin:0 0 2px; border-bottom:3px solid #E07B39; padding-bottom:6px; }
h2 { color:#1F4E79; font-size:13.5pt; margin:16px 0 6px; border-left:5px solid #E07B39; padding-left:8px; page-break-after:avoid; }
h3 { color:#2E75B6; font-size:11.5pt; margin:10px 0 4px; }
table { border-collapse:collapse; width:100%; margin:8px 0; font-size:9pt; page-break-inside:avoid; }
th { background:#1F4E79; color:#fff; text-align:left; padding:5px 7px; border:1px solid #bcc4d0; }
td { padding:4px 7px; border:1px solid #cfd6e0; vertical-align:top; }
tr:nth-child(even) td { background:#F2F4F7; }
code, pre { font-family:Consolas,monospace; font-size:8.7pt; }
pre { background:#0f2233; color:#e6edf3; padding:10px 12px; border-radius:6px; overflow-x:auto; white-space:pre; }
blockquote { background:#FFF6E9; border-left:4px solid #E07B39; margin:8px 0; padding:6px 12px; color:#5a4a33; }
strong { color:#12385c; } ul,ol { margin:4px 0 4px 18px; } li { margin:2px 0; }
hr { border:none; border-top:1px solid #d6dce5; margin:12px 0; }
"""

def find_chrome():
    for p in glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome"):
        return p
    for p in ("chromium", "chromium-browser", "google-chrome"):
        return p
    return None

def main():
    body = markdown.markdown(open(MD, encoding="utf-8").read(),
                             extensions=["tables", "fenced_code", "sane_lists"])
    open(HTML, "w", encoding="utf-8").write(
        f'<!doctype html><html lang="es"><head><meta charset="utf-8"><style>{CSS}</style>'
        f'</head><body>{body}</body></html>')
    chrome = find_chrome()
    subprocess.run([chrome, "--headless", "--no-sandbox", "--disable-gpu",
                    f"--print-to-pdf={PDF}", "--print-to-pdf-no-header",
                    f"file://{HTML}"], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(HTML)
    print("PDF generado:", PDF)

if __name__ == "__main__":
    main()
