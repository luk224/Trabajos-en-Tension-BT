"""OCR bruto del manual (PDF escaneado) con RapidOCR -> fuentes/ocr/pNNN.txt (NNN = página PDF; impresa = PDF + 2).
Pierde espacios y tildes: sirve para buscar, no para citar. Para citar se lee la imagen (paginas/pNNN.png).
Uso: python herramientas/ocr.py <manual.pdf> [desde] [hasta]"""
import sys, pathlib
import pymupdf
from rapidocr_onnxruntime import RapidOCR

doc = pymupdf.open(sys.argv[1])
a = int(sys.argv[2]) if len(sys.argv) > 2 else 1
b = int(sys.argv[3]) if len(sys.argv) > 3 else len(doc)
raiz = pathlib.Path(__file__).resolve().parent.parent
out, img = raiz / "fuentes" / "ocr", raiz / "paginas"
out.mkdir(parents=True, exist_ok=True); img.mkdir(exist_ok=True)
ocr = RapidOCR()
for n in range(a, b + 1):
    png = img / f"p{n:03d}.png"
    doc[n - 1].get_pixmap(dpi=150).save(png)
    res, _ = ocr(str(png))
    (out / f"p{n:03d}.txt").write_text("\n".join(r[1] for r in (res or [])), encoding="utf8")
    print(n, flush=True)
