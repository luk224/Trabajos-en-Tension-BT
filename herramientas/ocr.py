"""OCR del manual (PDF escaneado) con easyocr -> fuentes/ocr/pNNN.txt (NNN = página PDF).
Página impresa = página PDF + 2. Uso: python herramientas/ocr.py <manual.pdf> [desde] [hasta]"""
import sys, pathlib, warnings
warnings.filterwarnings("ignore")
import pymupdf, easyocr, numpy as np

pdf = sys.argv[1]
doc = pymupdf.open(pdf)
a = int(sys.argv[2]) if len(sys.argv) > 2 else 1
b = int(sys.argv[3]) if len(sys.argv) > 3 else len(doc)
out = pathlib.Path(__file__).resolve().parent.parent / "fuentes" / "ocr"
img = pathlib.Path(__file__).resolve().parent.parent / "paginas"
out.mkdir(parents=True, exist_ok=True); img.mkdir(exist_ok=True)
rd = easyocr.Reader(["es"], gpu=False, verbose=False)
for n in range(a, b + 1):
    pix = doc[n - 1].get_pixmap(dpi=170)
    pix.save(img / f"p{n:03d}.png")
    arr = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3]
    res = rd.readtext(arr, paragraph=True, x_ths=1.0, y_ths=0.6)
    res.sort(key=lambda r: (round(r[0][0][1] / 25), r[0][0][0]))
    (out / f"p{n:03d}.txt").write_text("\n".join(r[1] for r in res), encoding="utf8")
    print(n, flush=True)
