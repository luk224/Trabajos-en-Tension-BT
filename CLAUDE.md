# CLAUDE.md — Manual de Trabajos en Tensión en Baja Tensión (TETBT), formación visual

**Objetivo:** convertir el manual escaneado (`Manual_TETBT`, 92 págs.) en una web de formación con **animaciones 3D (three.js) que muestran paso a paso cada procedimiento de ejecución**, con el texto de cada paso sincronizado con la animación. El usuario lo consulta sobre todo **desde el iPhone** (GitHub Pages): móvil primero, táctil, ligero.

Idioma: español. Es material de formación de seguridad: **fidelidad total al manual** (no inventar pasos, distancias ni EPI; si algo falta, decirlo). Cada paso cita la página impresa del manual (impresa = PDF + 2).

## Estructura
```
index.html                    portada: mapa del manual (secciones 1-5) y estado de cada procedimiento
procedimientos/<id>_<slug>.html   un HTML por procedimiento (a1, a2, b1, …)
assets/tet.css, tet.js        estilo y motor del "reproductor de pasos" COMPARTIDOS
assets/three/                 three.js r147 local (sin CDN)
assets/escenas/               escenas 3D reutilizables (apoyo, conductores, trabajador, escalera, protecciones…)
fuentes/                      transcripciones fieles (A_procedimientos.md…); fuentes/ocr/ y paginas/ NO se suben
herramientas/ocr.py           OCR del PDF (easyocr, .venv con uv)
.claude/agents/               constructor-animaciones, revisor-fidelidad
```
## Reglas
1. Un procedimiento = definición, riesgos, medios humanos, medios materiales (EPI/EPC/herramientas/materiales) y **secuencia** (previas → ejecución → finales). La animación cubre la secuencia; el resto va como fichas.
2. Cada paso: `{fase, texto (fiel al manual), pag, anim}`. La animación de un paso nunca contradice el texto; si el manual no detalla un gesto, se anima lo mínimo y se marca «ilustrativo».
3. Colores solo con variables CSS; claro/oscuro; `prefers-reduced-motion` respetado; sin WebGL → imagen estática o lista de pasos igualmente utilizable.
4. Tras cada cambio: commit en español + `git push origin main` (Pages desde `main`, raíz, `.nojekyll`). Pipeline: constructor → revisor-fidelidad → corregir → publicar → avisar al usuario.
5. Los PDF, páginas rasterizadas y el OCR en bruto no se suben (material de la empresa).

## Estado
- Listo: 5.A (A.1, A.2) con reproductor 3D (`assets/tet.js`, escena `assets/escenas/apoyo-bt.js`), revisado por `revisor-fidelidad`. Pendiente: B.1-E.1 y secciones 1-4 (fichas).
- Modelos 3D reales: `assets/modelos/` (NVIDIA SimReady, CC BY 4.0, ver CREDITOS.md). Cargador GLTF + meshopt en `assets/three/`.
- OCR: easyocr falla en esta CPU (Illegal instruction); `herramientas/ocr.py` usa RapidOCR (sin espacios/tildes, solo para buscar). Citar leyendo `paginas/pdf-NN.png` (`pdftoppm -r 110 -f N -l M`).
- Móvil: lienzo con `touch-action:pan-y` (arrastre vertical = scroll; horizontal/pellizco = escena).
- Mapa de páginas (PDF → impresa = PDF+2): A 38-47 · B.1 48-52, B.2 53-57, B.3 58-62 · C.1 63-67, C.2 67/68-72, C.3 73-77 · D.1 78-81 · E.1 82-86, E.2 87-91 · fin 92. Imágenes en `paginas/pdf-NN.png`.
