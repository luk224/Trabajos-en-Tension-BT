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
