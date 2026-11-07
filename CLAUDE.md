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
3. Colores solo con variables CSS; **solo modo claro (el modo oscuro se eliminó por decisión del usuario: no reintroducirlo, ni botón de tema ni `prefers-color-scheme`)**; `prefers-reduced-motion` respetado; sin WebGL → imagen estática o lista de pasos igualmente utilizable.
4. Tras cada cambio: commit en español + `git push origin main` (Pages desde `main`, raíz, `.nojekyll`). Pipeline: constructor → revisor-fidelidad → corregir → publicar → avisar al usuario.
5. Los PDF, páginas rasterizadas y el OCR en bruto no se suben (material de la empresa).

## Estado
- Listo: 5.A (A.1, A.2), 5.B (B.1-B.3), 5.C (C.1-C.3) con reproductor 3D (`assets/tet.js`, escena `assets/escenas/apoyo-bt.js`), revisado por `revisor-fidelidad`. 5.D (D.1) y 5.E (E.1, E.2) listos; pendiente: secciones 1-4 del manual (fichas).
- Modelos 3D reales: `assets/modelos/` (NVIDIA SimReady, CC BY 4.0, ver CREDITOS.md). Cargador GLTF + meshopt en `assets/three/`.
- OCR: easyocr falla en esta CPU (Illegal instruction); `herramientas/ocr.py` usa RapidOCR (sin espacios/tildes, solo para buscar). Citar leyendo `paginas/pdf-NN.png` (`pdftoppm -r 110 -f N -l M`).
- Móvil: lienzo con `touch-action:pan-y` (arrastre vertical = scroll; horizontal/pellizco = escena).
- Mapa de páginas (PDF → impresa = PDF+2): A 38-47 · B.1 48-52, B.2 53-57, B.3 58-62 · C.1 63-67, C.2 67/68-72, C.3 73-77 · D.1 78-81 · E.1 82-86, E.2 87-91 · fin 92. Imágenes en `paginas/pdf-NN.png`.

## Reglas de animación (acordadas con el usuario)
1. **Cobertura de fases:** mientras se trabaja en un conductor/fase/conector, los demás permanecen cubiertos (tela, perfiles, capuchones, dedales, alfombras). Solo se destapa la «ventana» de la fase en curso y se repone el aislamiento al terminar. Se comprueba en cada procedimiento nuevo (paso a paso, en las dos variantes).
2. **La tarea animada = la tarea del manual**, no solo su texto: antes de dar un procedimiento por bueno, comparar los esquemas del manual (a ~200 ppp) con capturas del estado inicial / intermedio / final de la animación (qué se conecta, corta o sustituye, entre qué elementos, cómo queda). Ej.: en C.3 la línea principal se CORTA y el puente auxiliar la mantiene; los extremos cortados se unen a entrada y salida de la caja (figs. 1-5, p. 79). El informe del agente debe decir «qué hace el manual / qué hace la animación».
3. **Colores de conductores** (convención de cables de BT; el manual no los indica → ilustrativo, con leyenda visible): neutro N **azul**, R **marrón**, S **negro** (con halo claro para destacar sobre el fondo), T **gris**. Solo vía tokens `--e-N/R/S/T` (y `--e-halo`); nunca rojo/verde/violeta para fases.
4. **Planos de detalle (vistas detalladas del PDF):** cuando el esquema del manual incluye una vista ampliada/recuadro de un elemento o de un paso (capuchón o protector de aislador, dedal, cuñas, conector con protección, manguito termorretráctil, cuchillas de la caja, etc.), (a) inventariar TODAS esas vistas de los esquemas de cada procedimiento (págs. de esquemas: A p.44, 49 · B p.54, 59, 64 · C p.69, 74, 79 · D, E al hacerlos); (b) el elemento debe estar modelado con el detalle suficiente para verse de cerca y (c) el paso correspondiente lleva un **plano detalle** en la animación 3D: campo `det:{cam, txt}` del paso → el reproductor muestra una segunda vista (recuadro) con cámara de primer plano y la etiqueta «Detalle: … (Manual p. NN)». Las imágenes del manual no se publican; el detalle se hace en 3D.
5. **Objetos metálicos del personaje:** el paso «Desprenderse de los objetos metálicos» debe verse: ambos trabajadores llevan, **pegados al cuerpo** (anclados a cuello, muñeca, dedo, cinturón, bolsillo), objetos metálicos reconocibles con material metálico (cadena/colgante, reloj, anillo, pulsera, hebilla del cinturón, bolígrafo, navaja, llaves…) y en el paso se los quitan y los dejan fuera de la zona de trabajo (p. ej. en la lona/caja). Modelos GLB usados: `cadena_metalica`, `boligrafo_metal`, `navaja` (el dataset no tiene relojes/anillos/pulseras: se modelan proceduralmente con material metálico).
6. Los textos de los pasos se ven **enteros** en escritorio (panel con scroll propio, texto del manual primero, notas plegables), también a 1280×800 y 1366×768.

## Pendiente acordado (hacer tras la tanda de correcciones figura-vs-animación)
- **Puntos animados de corriente por los cables en tensión** (petición del usuario): puntos que recorren los conductores energizados (línea principal siempre; acometida/derivación solo mientras esté en tensión: p. ej. sin corriente tras «Retirar fusibles» y de nuevo al «Reponer fusibles»; en C.3 el puente se ilumina al cerrar su interruptor y la corriente rodea el corte sin cruzarlo). Un único módulo compartido (`assets/escenas/corriente.js`, lo crea A) con `addPath(id, puntos, color)`, `setLive(id, 0..1)` y `update(dt)`; los puntos usan los colores de fase (--e-N/R/S/T) y se ocultan en conductores sin tensión. Rendimiento en iPhone: instancias/Points, ~30 fps solo mientras haya puntos visibles, pausa fuera de pantalla y con `prefers-reduced-motion`, botón «Ver corriente» (activado por defecto) y leyenda: «puntos = conductor en tensión (ilustrativo; no indica el sentido real de la corriente alterna)». Determinista al saltar de paso (el estado «en tensión» depende del paso, no del tiempo).
- **Clipping / z-fighting (petición del usuario, hacer tras publicar los puntos de corriente):** (1) caras coplanares que parpadean al rotar la cámara (paredes de la zanja de C y otras): separar las caras unos mm o usar `polygonOffset` en el material, y acotar `near/far` de la cámara; auditar todas las escenas (A, B, C) buscando mallas solapadas/coplanares. (2) El conductor negro S a veces se ve gris entero al rotar la cámara: sospecha de halos `FrontSide` más gruesos que cubren el conductor (B usa FrontSide 1,5×; A usa BackSide) y del brillo/envMap; el halo debe ser `BackSide` (o un tubo detrás con `depthWrite:false`) y el conductor negro no debe aclararse por reflejos. Comprobar girando la cámara en claro y oscuro.
- **Recuadro de detalle más compacto (petición del usuario, tras el z-fighting):** ventana `det` más pequeña (≈28-30 % del ancho en escritorio, ≈40 % en móvil), SIN barra de texto encima y con la X de cerrar dentro de la propia vista (esquina superior). El texto «Detalle: … (Manual p. NN)» pasa a la nota del paso y al `aria-label`/`title` del recuadro (no se pierde la cita de página). Mantener el botón «Ver detalle» para reabrirlo.

## Decisiones del usuario (no revertir)
- **Solo modo claro.** No hay modo oscuro: sin botón de tema, sin `localStorage 'tema'`, sin `prefers-color-scheme: dark`. Las comprobaciones visuales son solo en claro (escritorio y móvil).
- **No regenerar las páginas de procedimientos desde scripts/generadores antiguos** (los de los agentes viven en su scratchpad y reintrodujeron el botón y el script del modo oscuro en B): editar las páginas con ediciones puntuales. Tras cualquier cambio, `grep -rIn -i -E "btn-tema|data-theme|prefers-color-scheme" procedimientos index.html assets` debe salir vacío.
