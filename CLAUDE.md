# CLAUDE.md — Manual de Trabajos en Tensión en Baja Tensión (TETBT), formación visual

**Objetivo:** convertir el manual escaneado (`fuentes/Manual_TETBT.pdf`, 92 págs.) en una web de formación con **animaciones 3D (three.js) que muestran paso a paso cada procedimiento**, con el texto de cada paso sincronizado con la animación. El usuario la consulta sobre todo **desde el iPhone** (GitHub Pages): móvil primero, táctil, ligero.
**Web:** https://luk224.github.io/Trabajos-en-Tension-BT/ · **Repo:** `git@github.com:luk224/Trabajos-en-Tension-BT.git` (público, rama `main`, Pages desde la raíz, hay `.nojekyll`). Carpeta local: `/home/luk/TET_BT`.

Idioma: español. Es material de formación de seguridad: **fidelidad total al manual** (no inventar pasos, distancias ni EPI; si algo falta, decirlo). Cada paso cita la página **impresa** del manual (impresa = página PDF + 2). Lo que el manual no detalla se anima solo lo mínimo y se marca «ilustrativo».

## Estado (7-nov-2026)
- **Hecho y publicado:** toda la sección 5 «Procedimientos de ejecución»: A.1, A.2 · B.1, B.2, B.3 · C.1, C.2, C.3 · D.1 · E.1, E.2 (11 procedimientos, ya enlazados como «Listo» en `index.html`).
- **Pendiente:** las secciones 1-4 del manual (teoría; ver «Siguiente paso»). Sin empezar.
- **Sin verificar nunca:** rendimiento y Safari de un iPhone REAL (solo se probó en Chrome headless con swiftshader/emulación 390×844), fps reales de los puntos de corriente (solo simulación del bucle), GLB con meshopt+WebP en iOS. Pedir al usuario que lo pruebe y lo cuente.
- **Duda abierta del usuario:** si el «puente auxiliar» de C.3 es como se hace en obra. Solo se garantiza lo que dicen el texto y las figuras 1-5 (p. 79); equipo real, secciones, orden fase a fase → que lo valide un instructor/procedimiento interno de la empresa (AMYS). Todo lo no manual está marcado «ilustrativo» en pantalla.

## Estructura
```
index.html                      portada: cards con miniatura por procedimiento (secciones 1-5; clase card listo/pend)
assets/miniaturas/<id>.webp     miniaturas 640×400 de cada procedimiento (captura 3D al ~55 % de los pasos, sin UI); regenerar con cdp.py si cambia una escena
procedimientos/<id>_<slug>.html un HTML por procedimiento (a1…e2); escritos A MANO/por ediciones, sin generador
assets/tet.js, tet.css          motor y estilo del reproductor de pasos COMPARTIDOS (API en la cabecera de tet.js)
assets/escenas/corriente.js     módulo de puntos de corriente (TET.corriente; API y convención de sentido en su cabecera)
assets/escenas/apoyo-bt.js (+ -pasos.js)   red aérea convencional (A): apoyo, personas, metales, escalera con correas, CGP, protecciones, TET.fundaOvalada
assets/escenas/red-trenzada.js (+ -pasos)   B; envuelve a apoyo-bt vía base._dbg()  (frágil: si cambia _dbg() se rompe B y E)
assets/escenas/red-subterranea.js (+ -pasos) C: cala, cables pasantes, puente auxiliar, caja de acometida (escena propia, no usa apoyo-bt)
assets/escenas/cuadro-bt.js     D: centro de transformación y cuadro de BT (escena propia)
assets/escenas/caja-derivacion.js (+ -pasos) E: envuelve a apoyo-bt vía _dbg() (lista blanca de piezas)
assets/modelos/*.glb            modelos NVIDIA SimReady (CC BY 4.0; créditos en CREDITOS.md; el pie de cada página enlaza)
assets/epis/*.webp              fotos de EPI, EPC, herramientas y materiales (32 tarjetas de «Medios materiales»; borde naranja EPI, azul EPC, verde herramientas, gris materiales; créditos en assets/epis/CREDITOS.md). Catálogo `TET.CATALOGO_EPP` (+ `TET.ALIAS_EPP`) en tet.js: texto exacto del ítem → {img, norma orientativa}; clic en la tarjeta = lightbox. Ítem sin catálogo → chip de texto
Medios humanos                  infografía generada por `infoHumanos()` en tet.js (figuras SVG, escala de capacitación orientativa RD 614/2001, cita literal del manual; variante «1 + n» si el texto empieza por «El número de trabajadores», caso B.3)
assets/three/                   three.js r147 local + OrbitControls + GLTFLoader + meshopt_decoder (sin CDN, sin build)
fuentes/*_procedimientos.md     transcripción fiel de cada apartado (A…E) con páginas impresas; FUENTE DE VERDAD de los textos
fuentes/Manual_TETBT.pdf        el manual original (ignorado por git)
paginas/pdf-NN.png              páginas rasterizadas a 110 ppp (NN = página PDF; 01-92; ignorado por git; paginas/pNNN.png son del OCR)
fuentes/ocr/                    OCR en bruto (RapidOCR; sin espacios/tildes; ignorado)
herramientas/cdp.py             controlador de Chrome en tiempo real por CDP para capturas (ver «Verificación»)
herramientas/ocr.py             OCR (RapidOCR en .venv con uv; easyocr da «Illegal instruction» en esta CPU)
.claude/agents/                 constructor-animaciones, revisor-fidelidad (instrucciones resumidas; las reglas completas están aquí)
```
Mapa de páginas (PDF → impresa = PDF+2): índice 3 · 1 Introducción 4 · 2 Estructuras y componentes 5-21 (2.1 CT 5, 2.2 puesta a tierra 7, 2.3 estructura de la red 10, 2.4 componentes 11) · 3 Prevención de riesgos 22-28 (3.1 RD 614/2001 22, 3.2 recomendaciones 23, 3.3 distancias de seguridad 24) · 4 Instrucción general AMYS 29-38 (4.1 método de trabajo en tensión 29, 4.2 equipos de protección 32) · 5 Procedimientos 39+ : A PDF 38-47 · B.1 48-52, B.2 53-57, B.3 58-62 · C.1 63-67, C.2 67/68-72, C.3 73-77 · D.1 78-81 · E.1 82-86, E.2 87-91 · fin 92.

## Decisiones del usuario (no revertir)
- **Solo modo claro.** Sin botón de tema, sin `localStorage 'tema'`, sin `prefers-color-scheme`. Las comprobaciones visuales son solo en claro (escritorio y móvil). `grep -rIn -i -E "btn-tema|data-theme|prefers-color-scheme" procedimientos index.html assets` debe salir vacío.
- **No actualizar herramientas/librerías** (three.js se queda en r147; no hay Node ni hace falta). No instalar paquetes externos (el sistema lo bloquea: `sand3d` se evaluó y no se instaló).
- **No regenerar las páginas de procedimientos desde generadores/scripts antiguos** (los de los agentes viven en su scratchpad y ya reintrodujeron el botón de modo oscuro y la leyenda duplicada): ediciones puntuales. Comprobar que la leyenda de colores sale UNA vez (la pinta `tet.js`; no hay párrafo propio en las páginas).
- Puntos de corriente: visibles por defecto; el botón «Corriente» solo sirve para ocultarlos. En A.1 conexión la derivación NO lleva puntos al empezar (aún no tiene tensión).
- Escalera: correas, calzo al pie, ayudante sujetándola y cinturón amarrado son **ilustrativos** (criterio general de trabajo en altura, RD 1215/1997 anexo II mod. RD 2177/2004, citado de memoria: «confirmar con el procedimiento de prevención de la empresa»). El manual solo dice «Sujeción escalera» (p. 44), «escalera aislante» y «cinturón de seguridad».

## Reglas de animación (acordadas con el usuario)
1. **Cobertura de fases:** mientras se trabaja en un conductor/fase/conector, los demás siguen cubiertos (tela, perfiles, capuchones, alfombras). Solo se destapa la «ventana» de la fase en curso y se repone el aislamiento al terminar. Se comprueba paso a paso y en todas las variantes.
2. **La tarea animada = la tarea del manual**, no solo su texto: comparar los esquemas (a ~200-250 ppp) con capturas del estado inicial/intermedio/final de la animación (qué se conecta/corta/sustituye, entre qué, cómo queda). Ej.: C.3 → la línea principal se CORTA y el puente la mantiene; los extremos cortados se unen a entrada/salida de la caja (figs. 1-5, p. 79). Los informes deben decir «qué hace el manual / qué hace la animación».
3. **Colores de conductores** (convención de cables de BT; el manual no los da → ilustrativo, con leyenda): N **azul**, R **marrón**, S **negro** (con halo claro), T **gris**. Solo tokens `--e-N/R/S/T` y `--e-halo`; nunca rojo/verde/violeta para fases. Los puntos de T gris sobre cable gris necesitan contraste (halo/offset).
4. **Dedales/capuchones solo para aislar PUNTAS LIBRES** de cables (coaxiales con el cable: eje = tangente local en la punta, abertura hacia el cable, alineados entre sí) y se retiran al conectar. **Las conexiones se hacen con conector + funda aislante OVALADA** (`TET.fundaOvalada`; nunca piezas en T ni capuchones). La caja de derivación en T de C.2 y los manguitos termorretráctiles SÍ son del manual y se conservan. Tubos/perfiles protectores: coaxiales con su cable y se mueven con él.
5. **Planos de detalle** (vistas ampliadas del PDF): inventariar TODAS las vistas/etiquetas de cada esquema (págs.: A 44, 49 · B 54, 59, 64 · C 69, 74, 79 · D 83 · E 88, 93); el elemento se modela con detalle suficiente para verse de cerca y su paso lleva `det:{cam, txt}` (admite lista con ‹ ›). El recuadro es compacto (~29 % escritorio, ~40 % móvil), sin barra de texto, con ✕ dentro; el texto «Detalle: … (Manual p. NN)» va en la nota del paso y en `aria-label`/`title`. Las imágenes del manual no se publican: el detalle es 3D.
6. **Objetos metálicos del personaje:** en «Desprenderse de los objetos metálicos» ambos trabajadores llevan objetos metálicos ANCLADOS al cuerpo (cadena/colgante, reloj, anillo, pulsera, hebilla, bolígrafo, navaja, llaves) con material metálico y en el paso se los quitan y los dejan en una bandeja sobre la lona; luego ya no los llevan.
7. **Protecciones amarillas** (tela, alfombras, prismas): se retiran al terminar la fase «Ejecución del trabajo» (antes de «Operaciones finales»); donde el manual no tiene ese paso, se retiran al final del último paso de ejecución y se marca ilustrativo.
8. **Corriente (puntos animados):** sentido «aguas abajo»: de la línea principal/transformador hacia la CGP/caja/salidas y hacia el interior del edificio; la acometida exterior va línea → CGP, nunca al revés; en C.3 línea de Entrada (derecha) a Salida (izquierda), el puente en ese sentido y, tras cortar, línea → entrada → caja (cuchillas) → salida → línea. El estado «en tensión» depende del PASO, no del tiempo (determinista al saltar). Sin corriente en lo desconectado/sin fusibles. Leyenda: «Puntos = conductor en tensión (ilustrativo; no indica el sentido real de la corriente alterna)».
9. Los textos de los pasos se ven **enteros** en escritorio (1280×800 y 1366×768): panel con scroll propio, texto del manual primero, notas plegables.

## Recetas técnicas (three.js r147)
- **Halo del conductor negro S:** tubo paralelo de 1,3–1,4× el radio con `MeshBasicMaterial({color: pal('halo'), side: DoubleSide, depthWrite:false})`, `renderOrder=-10`; núcleo `MeshLambertMaterial` sin envMap/metalness/brillo. Nunca FrontSide/BackSide con depthWrite (el bobinado de `tubo()` deja caras al revés y el halo tapa el conductor → «cable negro gris»).
- **Anti z-fighting:** cada cara ≥1,5 cm de otra coplanar, sin cajas solapadas del mismo ancho, `depthWrite:false` en lo transparente, `renderOrder` por capa (tela 1, perfiles/tubos 2, capuchones 3, dedales/mangos/fundas 4), near/far 0,25/150 (cámara del recuadro det 0,1), `polygonOffset` si hace falta.
- **Corriente:** `const cor = TET.corriente.crear(ctx)`; `addPath(id, puntos|función, color, opts)`, `setLive(id, 0..1)` desde el estado del paso; los puntos avanzan del primer al último punto de la polilínea (`opts.sentido:-1` invierte); ~30 fps solo mientras haya `live>0`, lienzo visible y botón activo; con `prefers-reduced-motion` quedan quietos. La escena publica `api.corriente = cor`.
- **Metal:** `MeshStandardMaterial` metalness ~0,95, roughness ~0,26 + envMap cúbico procedural (en apoyo-bt.js).
- **Datos de paso:** `{fase?, texto (del manual), pag, anim, cam, nota?, ilus?, dur?, det?}` (ver cabecera de `tet.js`). Variantes por URL: `?op=` (A.1, A.2, B.1, B.2), `?puente=interruptor|unipolar` (C.3), `?prot=tela|rigido` (D.1), resina/termorretráctil (C.2); salto a un paso con `#p=N` (muestra el estado al INICIO del paso N; para ver el final, el N+1).
- GLB cargados bajo demanda con fallback procedural; `touch-action:pan-y` en el lienzo móvil (vertical = scroll, horizontal/pellizco = escena).

## Flujo de trabajo con agentes (lo que funcionó)
1. Para cada apartado nuevo: **agente constructor** (transcribe primero las imágenes a `fuentes/X_procedimientos.md`, luego escena + páginas) → **agente revisor independiente de fidelidad, SOLO LECTURA**, que compara el manual con **capturas reales lado a lado** (no solo con el código) → correcciones por el constructor → verificación propia con capturas → publicar. Un revisor que solo lee código deja pasar fallos visuales.
2. Los prompts a los agentes deben incluir: leer este CLAUDE.md, estudiar el código existente como referencia, no tocar archivos compartidos (`tet.*`, `corriente.js`, `apoyo-bt*`, `index.html`) salvo el dueño, un puerto propio para `python3 -m http.server`, no hacer git, informar de «qué hace el manual / qué hace la animación», lo ilustrativo y lo que no pudieron verificar. **Dueños:** el motor (`tet.*`, `corriente.js`) y `apoyo-bt*` los edita un solo agente a la vez; `index.html` lo edita el coordinador.
3. Los agentes pueden cortarse por límite de uso (5 h): su trabajo parcial queda guardado; reanudarlos con SendMessage («continúa donde lo dejaste, revisa primero git diff»).
4. **Prohibido** en comandos de agentes: `pkill -f` con patrón que coincida con la propia orden, `rm` con globs tras `cd` (el sistema lo bloquea). Parar servidores con `kill <PID>`.
5. Tras cualquier cambio: `git status` (que no entre nada de `.gitignore`; archivos temporales `procedimientos/_*.html` están ignorados), commit en español, `git push origin main`, confirmar con `git log -1` y `git status -sb`. Terminar los commits con las líneas de atribución que indique el entorno. Un commit por cambio coherente; si hay trabajo de otro agente a medias, no incluir sus archivos (`git reset` de esos paths).

## Verificación (capturas reales)
- Servidor: `python3 -m http.server 8770 --directory /home/luk/TET_BT` (un puerto distinto por agente) y parar con `kill`.
- Chrome en tiempo real por CDP: `herramientas/cdp.py` (clase `B(w,h)`: `go(url,wait)`, `pump(s)`, `shot(path)`, `js(expr)`, `console()`; usa Chrome de `~/.cache/ms-playwright/chromium-1248/...` con swiftshader). Importar con `sys.path.insert(0,'herramientas')`. Esperar 3-5 s tras cargar; girar la cámara con `Input.dispatchMouseEvent` (arrastre) para ver z-fighting/halos. Las capturas con `--virtual-time-budget` salen en blanco.
- Comprobar siempre: escritorio 1280×800 y 1366×768, móvil 390×844 (sin scroll horizontal, texto entero), solo claro, sin errores de consola (el 404 de favicon es normal), todas las variantes.
- PDF: `pdftoppm -r 220 -f N -l N -png fuentes/Manual_TETBT.pdf /ruta/salida` (o `pymupdf` en `.venv`) para leer esquemas a mayor resolución.

## Siguiente paso: secciones 1-4 del manual (teoría)
Son más texto y esquemas que procedimientos: (1) Introducción (definición de BT ≤1000 V c.a./1500 V c.c., trabajo en tensión según RD 614/2001, maniobra, mediciones/ensayos/verificaciones); (2) estructura y componentes de la red de BT (CT, puesta a tierra, estructura de la red, componentes); (3) prevención de riesgos (RD 614/2001, recomendaciones, **distancias de seguridad**); (4) instrucción general AMYS (método de trabajo en tensión, equipos de protección). Proponer al usuario el enfoque (p. ej. páginas de teoría con figuras 3D/SVG propias y tarjetas, sin copiar imágenes del manual; interactivos para distancias de seguridad y zonas de peligro) antes de construir; mismo pipeline (transcribir → construir → revisar → publicar). `index.html` tiene los grupos de las secciones 1-4 sin enlaces.

## Reglas heredadas
- Un procedimiento = definición, riesgos, medios humanos, medios materiales (EPI/EPC/herramientas/materiales con sus notas de homologación) y **secuencia** (previas → ejecución → finales); la animación cubre la secuencia, el resto va como fichas.
- Sin WebGL: mensaje claro y la lista de pasos sigue siendo utilizable; `prefers-reduced-motion` respetado (sin autoplay).
- Los PDF, páginas rasterizadas y OCR en bruto NO se suben (material de la empresa). Modelos 3D: CC BY 4.0 NVIDIA SimReady (dataset `codepawl/simready-glb` en Hugging Face); el dataset no tiene postes, aisladores, CGP, conductores, trabajadores ni relojes/anillos: esos son procedurales.
