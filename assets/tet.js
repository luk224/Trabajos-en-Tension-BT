/* ============================================================
   Manual TETBT — motor compartido: fichas y
   «reproductor de pasos» (three.js r147 global, sin módulos ni CDN).

   Un procedimiento se declara como datos (ver procedimientos/*.html):
   TET.montar({
     id, titulo, escena:'apoyo-bt',
     fichas:{definicion:{texto,pag}, riesgos:[…], humanos:{texto,pag},
             medios:{epi:{items,nota,pag}, epc:{…}, herramientas:{…}, materiales:{…}}},
     selector:{etiqueta, param, opciones:[{id,etiqueta,desc}], defecto},
     construir(sel) → {fases:[{nombre, pasos:[{texto,pag,anim,cam?,nota?,ilus?,dur?}]}], escena:{…opciones}}
   })
   Cada escena (assets/escenas/*.js) se registra en TET.escenas[nombre] = ctx => ({
     configurar(opts), reset(), aplicar(anim, t, activo), camaras:{}, tema(), dispose()
   }). aplicar() debe ser determinista: el estado «tras el paso N» se obtiene con
   reset() + aplicar(paso_k, 1, false) para k<N + aplicar(paso_N, t, true).

   PLANO DE DETALLE (picture-in-picture): un paso puede llevar
     det:{cam:'dCapuchon', txt:'Detalle: capuchón o protector aislante de aislador (Manual p. 49)'}
   o una lista [{cam,txt},{cam,txt}] (el recuadro ofrece «Siguiente detalle»). `cam` es una clave de
   escena.camaras con el mismo formato {p:[x,y,z], t:[x,y,z], fov?:grados} (fov por defecto 28).
   El reproductor dibuja la MISMA escena con una segunda cámara en un recuadro (esquina inferior derecha del lienzo,
   ~38 % del ancho, mín. 140 px) con scissor/viewport, solo mientras el paso está activo; el usuario puede
   ocultarlo/mostrarlo. Si la cámara no existe o no hay WebGL, el detalle no se dibuja y su texto pasa a la nota del paso.
   ============================================================ */
(function () {
  'use strict';
  var TET = window.TET = window.TET || {};
  TET.escenas = TET.escenas || {};
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- utilidades ---------- */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (attrs[k] === true) e.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-8 7 8 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l8 7-8 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/></svg>',
    reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.2-5.1M5 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>',
    cam: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5L19 19M19 5l-2.5 2.5M7.5 16.5L5 19" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    corr: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="4" cy="12" r="2.3" fill="currentColor"/><circle cx="12" cy="12" r="2.3" fill="currentColor"/><circle cx="20" cy="12" r="2.3" fill="currentColor"/></svg>',
    auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6l7 6-7 6zM13 6l7 6-7 6z" fill="currentColor"/></svg>',
    sol: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M19.4 4.6l-2.1 2.1M6.7 17.3l-2.1 2.1" stroke="currentColor" stroke-width="2"/></svg>',
    persona: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="12" r="6" fill="currentColor"/><path d="M12 42c0-9 4-16 12-16s12 7 12 16z" fill="currentColor"/></svg>'
  };
  var RIESGO = {
    'contacto': '<path d="M13.5 2L5 13.5h6L9.5 22 19 9.5h-6.2z" fill="currentColor"/>',
    'arco': '<path d="M3 19Q12 1 21 19" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 8l-2.5 5h4L11.5 18" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 21.5h18" stroke="currentColor" stroke-width="2"/>',
    'caida-nivel': '<path d="M3 5h6v5h6v5h6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M5 12v8m-3-3l3 3 3-3" fill="none" stroke="currentColor" stroke-width="2.2"/>',
    'caida-objetos': '<rect x="7" y="2.5" width="10" height="7" fill="currentColor"/><path d="M12 12.5v8m-3.2-3.2L12 20.5l3.2-3.2" fill="none" stroke="currentColor" stroke-width="2.4"/>',
    'choques': '<path d="M2 12h7m-3-3.5L9.5 12 6 15.5M22 12h-7m3-3.5L14.5 12l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 5v3M12 16v3M9 6.5l1.2 2M15 6.5l-1.2 2" stroke="currentColor" stroke-width="2"/>',
    'cortes': '<path d="M3 21L17 4l3 3-14 15z" fill="currentColor"/><path d="M15 2l7 7" stroke="currentColor" stroke-width="2"/>',
    'atrapamientos': '<path d="M12 2v5m-2.5-2.5L12 7l2.5-2.5M12 22v-5m-2.5 2.5L12 17l2.5 2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="7" y="9.5" width="10" height="5" fill="currentColor"/>'
  };
  function claveRiesgo(s) {
    s = s.toLowerCase();
    if (s.indexOf('arco') > -1) return 'arco';
    if (s.indexOf('contacto') > -1) return 'contacto';
    if (s.indexOf('distinto nivel') > -1) return 'caida-nivel';
    if (s.indexOf('objetos') > -1) return 'caida-objetos';
    if (s.indexOf('choque') > -1) return 'choques';
    if (s.indexOf('corte') > -1) return 'cortes';
    if (s.indexOf('atrapa') > -1) return 'atrapamientos';
    return 'contacto';
  }
  function cita(pag) { return h('span', { class: 'cita', text: 'Manual p. ' + pag }); }

  /* ---------- paleta (solo modo claro) ---------- */
  var palCache = {};
  TET.pal = function (k) {
    if (palCache[k]) return palCache[k];
    var v = getComputedStyle(document.documentElement).getPropertyValue('--e-' + k).trim();
    return (palCache[k] = v || '#ff00ff');
  };
  TET.initTema = function () {   // solo modo claro: se descarta cualquier preferencia oscura guardada antes
    try { localStorage.removeItem('tema'); } catch (e) {}
  };

  /* ---------- fichas ---------- */
  function fichaMedios(m) {
    var cont = h('div');
    [['epi', 'EPI', 'Equipos de protección individual'], ['epc', 'EPC', 'Materiales aislantes'],
     ['herramientas', 'Herramientas', ''], ['materiales', 'Materiales', 'Señalización y delimitación, dispositivos y accesorios, equipos de comprobación']
    ].forEach(function (g) {
      var d = m[g[0]]; if (!d) return;
      var sec = h('div', { class: 'medio' });
      sec.appendChild(h('h4', null, [g[1], d.pag ? cita(d.pag) : null]));
      if (d.nota) sec.appendChild(h('p', { class: 'nota', text: d.nota }));
      var tarj = g[0] === 'epi' || g[0] === 'epc';
      var ul = h('ul', { class: tarj ? 'epp ' + g[0] : 'chips' });
      d.items.forEach(function (i) {
        var ent = tarj && TET.CATALOGO_EPP[claveEPP(i)];
        if (!ent) { if (tarj) ul.className = 'epp ' + g[0]; ul.appendChild(h('li', tarj ? { class: 'chip-txt', text: i } : { text: i })); return; }
        ul.appendChild(h('li', null, [tarjetaEPP(i, ent, g[0])]));
      });
      sec.appendChild(ul); cont.appendChild(sec);
    });
    return cont;
  }

  /* ---------- EPI / EPC como tarjetas con imagen + lightbox ----------
     Añadir un ítem: TET.CATALOGO_EPP['Texto exacto del ítem'] = {img:'epis/slug.webp', norma:'UNE-EN …'};
     (img es relativo a assets/; variantes del mismo texto: TET.ALIAS_EPP['Alfombras aislantes'] = 'Alfombra aislante').
     Si el ítem no está en el catálogo se pinta como chip de texto; si la imagen no carga, tarjeta con icono y sin lightbox. */
  var BASE_ASSETS = (function () {
    var sc = document.currentScript, src = sc && sc.src;
    return src ? src.replace(/[^\/]*$/, '') : '../assets/';
  })();
  TET.CATALOGO_EPP = {
    'Casco de protección': { img: 'epis/casco.webp', norma: 'UNE-EN 397; aislante eléctrico: EN 50365 (1000 V)' },
    'Gafas inactínicas': { img: 'epis/gafas_inactinicas.webp', norma: 'UNE-EN 166 + UNE-EN 170 (filtro UV)' },
    'Pantalla facial': { img: 'epis/pantalla_facial.webp', norma: 'UNE-EN 166, campo de uso 8 (arco eléctrico de cortocircuito)' },
    'Ropa de trabajo': { img: 'epis/ropa_trabajo.webp', norma: 'Ropa antiarco: UNE-EN 61482-2; ignífuga: UNE-EN ISO 11612' },
    'Guantes aislantes': { img: 'epis/guantes_aislantes.webp', norma: 'UNE-EN 60903, clase 00/0 (clase 0: hasta 1000 V CA)' },
    'Guantes ignífugos': { img: 'epis/guantes_ignifugos.webp', norma: 'UNE-EN 407 (calor y llama)' },
    'Guantes de protección mecánica': { img: 'epis/guantes_mecanicos.webp', norma: 'UNE-EN 388 (riesgos mecánicos); sobreguante del guante aislante' },
    'Calzado de seguridad': { img: 'epis/calzado.webp', norma: 'UNE-EN ISO 20345; aislante: UNE-EN 50321-1' },
    'Cinturón de seguridad': { img: 'epis/cinturon_seguridad.webp', norma: 'UNE-EN 358 (posicionamiento) / UNE-EN 361 (arnés anticaídas)' },
    'Tela aislante': { img: 'epis/tela_aislante.webp', norma: 'UNE-EN 61112 (mantas aislantes)' },
    'Perfiles aislantes': { img: 'epis/perfiles_aislantes.webp', norma: 'UNE-EN 61229 / UNE-EN 61479 (cubiertas)' },
    'Protectores aislantes para aisladores': { img: 'epis/protectores_aisladores.webp', norma: 'UNE-EN 61229 (cubiertas protectoras)' },
    'Dedales aislantes': { img: 'epis/dedales_aislantes.webp', norma: 'UNE-EN 61229 (cubiertas protectoras)' },
    'Alfombra aislante': { img: 'epis/alfombra_aislante.webp', norma: 'UNE-EN 61111 (alfombras aislantes)' }
  };
  TET.ALIAS_EPP = { 'Alfombras aislantes': 'Alfombra aislante' };
  function claveEPP(t) { return TET.ALIAS_EPP[t] || t; }
  var EPP_FALLBACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 16H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v5M12 16.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var lb = null;
  function lbCerrar() {
    if (!lb || lb.el.hidden) return;
    lb.el.hidden = true; document.documentElement.classList.remove('lb-abierto');
    var f = lb.foco; lb.foco = null; if (f && f.focus) f.focus();
  }
  function lbMostrar(btn) {
    var grupo = lb.grupo = Array.prototype.filter.call(
      btn.closest('ul').querySelectorAll('button.epp-tarj'), function (b) { return !b.classList.contains('sin-img'); });
    lb.i = grupo.indexOf(btn);
    var d = btn._epp;
    lb.img.src = d.url; lb.img.alt = d.nombre;
    lb.tit.textContent = d.nombre; lb.norma.textContent = d.norma;
    lb.prev.hidden = lb.next.hidden = grupo.length < 2;
  }
  function lbCrear() {
    var el = h('div', { class: 'lb', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lb-tit', hidden: true });
    var img = h('img', { alt: '' });
    var tit = h('h3', { id: 'lb-tit' });
    var norma = h('p', { class: 'lb-norma' });
    var x = h('button', { type: 'button', class: 'lb-x', 'aria-label': 'Cerrar imagen', html: '&#10005;' });
    var prev = h('button', { type: 'button', class: 'lb-nav lb-prev', 'aria-label': 'Anterior', html: ICON.prev });
    var next = h('button', { type: 'button', class: 'lb-nav lb-next', 'aria-label': 'Siguiente', html: ICON.next });
    var pie = h('div', { class: 'lb-pie' }, [tit, h('p', { class: 'lb-et', text: 'Norma orientativa (no figura en el manual)' }), norma]);
    el.appendChild(h('div', { class: 'lb-fig' }, [img])); el.appendChild(pie);
    [x, prev, next].forEach(function (b) { el.appendChild(b); });
    document.body.appendChild(el);
    lb = { el: el, img: img, tit: tit, norma: norma, prev: prev, next: next, foco: null, grupo: [], i: 0 };
    function ir(dlt) {
      var n = lb.grupo.length; if (n < 2) return;
      lbMostrar(lb.grupo[(lb.i + dlt + n) % n]);
    }
    x.addEventListener('click', lbCerrar);
    prev.addEventListener('click', function () { ir(-1); });
    next.addEventListener('click', function () { ir(1); });
    el.addEventListener('click', function (e) { if (e.target === el || e.target.classList.contains('lb-fig')) lbCerrar(); });
    document.addEventListener('keydown', function (e) {
      if (el.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); lbCerrar(); }
      else if (e.key === 'ArrowLeft') ir(-1);
      else if (e.key === 'ArrowRight') ir(1);
      else if (e.key === 'Tab') {   // trampa de foco sencilla
        var fs = [x, prev, next].filter(function (b) { return !b.hidden; });
        var k = fs.indexOf(document.activeElement);
        e.preventDefault(); fs[(k + (e.shiftKey ? -1 : 1) + fs.length) % fs.length].focus();
      }
    });
  }
  function tarjetaEPP(nombre, ent, grupo) {
    var url = BASE_ASSETS + ent.img;
    var b = h('button', { type: 'button', class: 'epp-tarj', 'aria-label': 'Ampliar imagen: ' + nombre });
    b._epp = { nombre: nombre, norma: ent.norma, url: url };
    var marco = h('span', { class: 'epp-marco' });
    var img = h('img', { src: url, alt: nombre + ' (imagen ilustrativa)', loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', function () {
      marco.innerHTML = EPP_FALLBACK; marco.classList.add('falta');
      b.classList.add('sin-img'); b.setAttribute('aria-label', nombre + ' (sin imagen)');
    });
    marco.appendChild(img);
    b.appendChild(marco); b.appendChild(h('span', { class: 'epp-nom', text: nombre }));
    b.addEventListener('click', function () {
      if (b.classList.contains('sin-img')) return;
      if (!lb) lbCrear();
      lb.foco = b; lbMostrar(b);
      lb.el.hidden = false; document.documentElement.classList.add('lb-abierto');
      lb.el.querySelector('.lb-x').focus();
    });
    return b;
  }
  function renderFichas(def, el) {
    var f = def.fichas; el.innerHTML = '';
    el.appendChild(h('h2', { text: 'Antes de empezar' }));
    var g = h('div', { class: 'rejilla' });
    g.appendChild(h('section', { class: 'ficha ancha', 'aria-labelledby': 'f-def' }, [
      h('h3', { id: 'f-def' }, ['Definición del trabajo', cita(f.definicion.pag)]),
      h('p', { text: f.definicion.texto })]));
    var ul = h('ul', { class: 'riesgos' });
    f.riesgos.forEach(function (r) {
      var li = h('li'); li.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + RIESGO[claveRiesgo(r)] + '</svg>';
      li.appendChild(h('span', { text: r })); ul.appendChild(li);
    });
    g.appendChild(h('section', { class: 'ficha ancha', 'aria-labelledby': 'f-rie' }, [
      h('h3', { id: 'f-rie' }, ['Identificación de riesgos', cita(f.riesgosPag || f.definicion.pag)]), ul]));
    var hum = h('div', { class: 'humano' }); hum.innerHTML = ICON.persona;
    hum.appendChild(h('p', { text: f.humanos.texto }));
    g.appendChild(h('section', { class: 'ficha ancha', 'aria-labelledby': 'f-hum' }, [
      h('h3', { id: 'f-hum' }, ['Medios humanos', cita(f.humanos.pag)]), hum]));
    g.appendChild(h('section', { class: 'ficha ancha', 'aria-labelledby': 'f-mat' }, [
      h('h3', { id: 'f-mat' }, ['Medios materiales', cita(f.mediosPag || '')]), fichaMedios(f.medios)]));
    el.appendChild(g);
  }

  /* ---------- reproductor ---------- */
  function Reproductor(root, def) {
    var me = this; me.def = def; me.root = root;
    me.speed = 1; me.playing = false; me.running = false; me.auto = !reduce; me.n = 0; me.t = 0; me.dwell = 0;
    me.pasos = []; me.fases = []; me.escena = null; me.tween = null; me.dirty = true; me.loopOn = false;
    me.ok3d = false; me.pose = null; me.last = 0;
    me.build();
    me.init3d();
    var sel = def.selector ? me.selInicial() : null;
    me.cargar(sel, true);
    document.addEventListener('keydown', function (e) { me.tecla(e); });
  }
  var P = Reproductor.prototype;

  P.selInicial = function () {
    var d = this.def.selector, v = null;
    try { v = new URLSearchParams(location.search).get(d.param || 'op'); } catch (e) {}
    var ok = d.opciones.some(function (o) { return o.id === v; });
    return ok ? v : d.defecto;
  };

  P.build = function () {
    var me = this, root = me.root, def = me.def; root.innerHTML = '';
    var player = h('div', { class: 'player' });
    var stage = h('div', { class: 'stage' });
    me.canvas = h('canvas', { tabindex: '0', 'aria-label': 'Escena 3D del procedimiento. Arrastra para girar, pellizca para acercar.', role: 'img' });
    me.tag = h('div', { class: 'tag', 'aria-hidden': 'true' });
    me.btnCam = h('button', { class: 'btn-cam', type: 'button' });
    me.btnCam.innerHTML = ICON.cam + '<span>Recentrar cámara</span>';
    me.sin3d = h('div', { class: 'sinwebgl', role: 'status', html: '<p>Este dispositivo no puede mostrar la escena 3D (WebGL no disponible). Los pasos siguen funcionando: usa los botones o la lista de pasos.</p>' });
    me.carga = h('div', { class: 'carga', text: 'Cargando escena…' });
    me.pista = h('div', { class: 'pista', 'aria-hidden': 'true', text: 'Desliza en horizontal para girar · pellizca para zoom' });
    stage.appendChild(me.canvas); stage.appendChild(me.pista); stage.appendChild(me.tag); stage.appendChild(me.btnCam); stage.appendChild(me.sin3d); stage.appendChild(me.carga);
    me.detBox = h('div', { class: 'detbox', role: 'group', 'aria-label': 'Plano de detalle' });
    me.detView = h('div', { class: 'detview' });
    me.detBtns = h('div', { class: 'detbtns' });
    me.detPrev = h('button', { class: 'detb', type: 'button', 'aria-label': 'Detalle anterior', text: '‹' });
    me.detNext = h('button', { class: 'detb', type: 'button', 'aria-label': 'Siguiente detalle', text: '›' });
    me.detHide = h('button', { class: 'detb', type: 'button', 'aria-label': 'Cerrar el plano de detalle', text: '×' });
    me.detBtns.appendChild(me.detPrev); me.detBtns.appendChild(me.detNext); me.detBtns.appendChild(me.detHide);
    me.detView.appendChild(me.detBtns); me.detBox.appendChild(me.detView);
    me.detShow = h('button', { class: 'detshow', type: 'button', text: 'Ver detalle' });
    stage.appendChild(me.detBox); stage.appendChild(me.detShow);
    me.detBox.style.display = 'none'; me.detShow.style.display = 'none';
    me.detOn = true; me.detIdx = 0; me.det = null;
    me.detHide.addEventListener('click', function () { me.detOn = false; me.pintaDet(); me.pedir(); });
    me.detShow.addEventListener('click', function () { me.detOn = true; me.pintaDet(); me.pedir(); });
    me.detNext.addEventListener('click', function () { me.detIdx = (me.detIdx + 1) % me.det.length; me.pintaDet(); me.pedir(); });
    me.detPrev.addEventListener('click', function () { me.detIdx = (me.detIdx + me.det.length - 1) % me.det.length; me.pintaDet(); me.pedir(); });
    me.stage = stage;

    var panel = h('div', { class: 'panel' });
    var scroll = h('div', { class: 'scroll' }); me.scrollEl = scroll;
    if (def.selector) {
      var s = def.selector, box = h('div', { class: 'opcion', role: 'group', 'aria-label': s.etiqueta });
      box.appendChild(h('span', { class: 'et', text: s.etiqueta }));
      me.seg = h('div', { class: 'seg' });
      s.opciones.forEach(function (o) {
        var b = h('button', { type: 'button', 'data-id': o.id, text: o.etiqueta, 'aria-pressed': 'false' });
        b.addEventListener('click', function () { me.cargar(o.id); });
        me.seg.appendChild(b);
      });
      box.appendChild(me.seg);
      me.desc = h('p', { class: 'descvar' });
      scroll.appendChild(box);
    }
    me.faseNom = h('div', { class: 'fase-nom' });
    me.fasesBar = h('div', { class: 'fases', role: 'group', 'aria-label': 'Fases del procedimiento' });
    var pasoBox = h('div', { class: 'paso' });
    me.pasoCab = h('div', { class: 'paso-cab' });
    me.pasoTxt = h('p', { class: 'paso-txt', 'aria-live': 'polite', 'aria-atomic': 'true' });
    me.pasoNota = h('div');
    pasoBox.appendChild(me.pasoCab); pasoBox.appendChild(me.pasoTxt); pasoBox.appendChild(me.pasoNota);
    me.pasoBox = pasoBox;
    scroll.appendChild(me.fasesBar); scroll.appendChild(me.faseNom); scroll.appendChild(pasoBox);
    if (me.desc) scroll.appendChild(me.desc);
    if (def.leyendaFases !== false) {
      var ley = h('div', { class: 'leyenda', 'aria-label': 'Leyenda de colores de las fases' });
      [['N', 'neutro azul'], ['R', 'R marrón'], ['S', 'S negro'], ['T', 'T gris']].forEach(function (x) { var b = h('b'); var i = h('i'); i.style.setProperty('--c', 'var(--e-' + x[0] + ')'); b.appendChild(i); b.appendChild(document.createTextNode(x[1])); ley.appendChild(b); });
      ley.appendChild(h('span', { text: 'Colores ilustrativos: el manual no los indica.' }));
      me.leyCor = h('span', { text: 'Puntos = conductor en tensión (ilustrativo; no indica el sentido real de la corriente alterna).' }); me.leyCor.style.display = 'none'; ley.appendChild(me.leyCor);
      scroll.appendChild(ley);
    }

    var det = h('details', { class: 'todos' });
    det.open = window.matchMedia('(min-width:960px)').matches;
    det.appendChild(h('summary', { text: 'Todos los pasos' }));
    me.lista = h('div', { class: 'lista' }); det.appendChild(me.lista); me.det = det;
    scroll.appendChild(det);
    panel.appendChild(scroll);

    var ctrl = h('div', { class: 'ctrl' });
    me.bPrev = h('button', { class: 'b', type: 'button', 'aria-label': 'Paso anterior' }); me.bPrev.innerHTML = ICON.prev + '<span>Anterior</span>';
    me.bPlay = h('button', { class: 'b play', type: 'button' });
    me.bNext = h('button', { class: 'b', type: 'button', 'aria-label': 'Paso siguiente' }); me.bNext.innerHTML = '<span>Siguiente</span>' + ICON.next;
    var c2 = h('div', { class: 'ctrl2' });
    me.bReset = h('button', { class: 'mini rs', type: 'button', 'aria-label': 'Reiniciar desde el primer paso' }); me.bReset.innerHTML = ICON.reset + '<span>Reiniciar</span>';
    me.bAuto = h('button', { class: 'mini', type: 'button', 'aria-pressed': 'false' }); me.bAuto.innerHTML = ICON.auto + '<span class="lg">Autoavance</span><span class="sm">Auto</span>'; me.bAuto.setAttribute('aria-label', 'Autoavance');
    me.verCor = true; try { if (localStorage.getItem('corriente') === '0') me.verCor = false; } catch (e) {}
    me.bCor = h('button', { class: 'mini', type: 'button', 'aria-pressed': me.verCor ? 'true' : 'false', 'aria-label': 'Ver corriente' }); me.bCor.innerHTML = ICON.corr + '<span class="lg">Ver corriente</span><span class="sm">Corriente</span>'; me.bCor.style.display = 'none';
    var vel = h('div', { class: 'seg', role: 'group', 'aria-label': 'Velocidad' });
    me.bVel = [0.5, 1, 2].map(function (v) {
      var b = h('button', { type: 'button', text: (v === 0.5 ? '0,5' : v) + '×', 'aria-pressed': v === 1 ? 'true' : 'false', 'aria-label': 'Velocidad ' + v + ' veces' });
      b.addEventListener('click', function () { me.speed = v; me.bVel.forEach(function (x, i) { x.setAttribute('aria-pressed', [0.5, 1, 2][i] === v ? 'true' : 'false'); }); });
      vel.appendChild(b); return b;
    });
    c2.appendChild(me.bReset); c2.appendChild(vel); c2.appendChild(me.bAuto); c2.appendChild(me.bCor);
    ctrl.appendChild(me.bPrev); ctrl.appendChild(me.bPlay); ctrl.appendChild(me.bNext); ctrl.appendChild(c2);
    panel.appendChild(ctrl);
    player.appendChild(stage); player.appendChild(panel); root.appendChild(player);

    me.bPrev.addEventListener('click', function () { me.pausa(); me.ir(me.n - 1, true); me.alVer(); });
    me.bNext.addEventListener('click', function () { me.pausa(); me.ir(me.n + 1, true); me.alVer(); });
    me.bPlay.addEventListener('click', function () { me.togglePlay(); me.alVer(); });
    me.bReset.addEventListener('click', function () { me.pausa(); me.ir(0, false); });
    me.bCor.addEventListener('click', function () {
      me.verCor = !me.verCor; me.bCor.setAttribute('aria-pressed', me.verCor ? 'true' : 'false');
      try { localStorage.setItem('corriente', me.verCor ? '1' : '0'); } catch (e) {}
      if (me.escena && me.escena.corriente) me.escena.corriente.setEnabled(me.verCor); me.pedir();
    });
    me.bAuto.addEventListener('click', function () { me.auto = !me.auto; me.pintaAuto(); });
    me.btnCam.addEventListener('click', function () { me.aplicaPose(me.pose, false); });
    me.pintaAuto(); me.pintaPlay();

    // gestos táctiles sobre el texto del paso: deslizar izquierda/derecha
    var sx = 0, sy = 0, st = 0;
    pasoBox.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
    pasoBox.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > 1.6 * Math.abs(dy) && Date.now() - st < 700) { me.pausa(); me.ir(me.n + (dx < 0 ? 1 : -1), true); }
    }, { passive: true });
  };

  /* ----- plano de detalle ----- */
  P.pintaDet = function () {
    var d = this.det, ok = !!d && this.ok3d;
    this.stage.classList.toggle('has-det', ok && this.detOn);
    if (!ok) { this.detBox.style.display = 'none'; this.detShow.style.display = 'none'; return; }
    this.detBox.style.display = this.detOn ? '' : 'none'; this.detShow.style.display = this.detOn ? 'none' : '';
    var tx = d[this.detIdx].txt || 'Detalle'; this.detBox.setAttribute('aria-label', tx); this.detBox.title = tx; this.detShow.title = tx;
    this.detNext.style.display = this.detPrev.style.display = d.length > 1 ? '' : 'none';
  };
  P.setDet = function (det) {
    var me = this, arr = !det ? null : (Array.isArray(det) ? det : [det]);
    if (arr) arr = arr.filter(function (x) { return x && me.escena && me.escena.camaras && me.escena.camaras[x.cam]; });
    me.det = arr && arr.length ? arr : null; me.detIdx = 0;
    if (me.det) {
      me.camDet = me.camDet || new THREE.PerspectiveCamera(28, 1, 0.1, 150);
    }
    me.pintaDet();
  };
  P.renderDet = function () {
    var me = this, d = me.det && me.det[me.detIdx];
    if (!d || !me.detOn || !me.ok3d) return;
    var pose = me.escena.camaras[d.cam], c = me.camDet;
    var sr = me.stage.getBoundingClientRect(), vr = me.detView.getBoundingClientRect();
    var x = vr.left - sr.left, w = vr.width, hh = vr.height, y = sr.height - (vr.top - sr.top) - hh;
    if (w < 20 || hh < 20) return;
    c.fov = pose.fov || 28; c.aspect = w / hh; c.near = 0.05; c.updateProjectionMatrix();
    c.position.fromArray(pose.p); c.lookAt(new THREE.Vector3().fromArray(pose.t)); c.updateMatrixWorld();
    var r = me.renderer; r.setScissorTest(true); r.setViewport(x, y, w, hh); r.setScissor(x, y, w, hh);
    if (me.escena.detVista) me.escena.detVista(true);
    r.render(me.scene, c);
    if (me.escena.detVista) me.escena.detVista(false);
    r.setScissorTest(false); r.setViewport(0, 0, sr.width, sr.height);
  };

  P.pintaAuto = function () { this.bAuto.setAttribute('aria-pressed', this.auto ? 'true' : 'false'); };
  P.pintaPlay = function () {
    this.bPlay.innerHTML = (this.playing ? ICON.pause + '<span>Pausa</span>' : ICON.play + '<span>Reproducir</span>');
    this.bPlay.setAttribute('aria-label', this.playing ? 'Pausar' : 'Reproducir');
  };

  /* ----- three.js ----- */
  P.init3d = function () {
    var me = this;
    if (!window.THREE) { me.noGL(); return; }
    try {
      me.renderer = new THREE.WebGLRenderer({ canvas: me.canvas, antialias: true, powerPreference: 'default' });
    } catch (e) { me.noGL(); return; }
    var r = me.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    me.scene = new THREE.Scene(); me.scene.background = new THREE.Color(TET.pal('fondo'));
    me.camera = new THREE.PerspectiveCamera(38, 1, 0.25, 150);
    me.camera.position.set(8, 6, 20);
    me.controls = new THREE.OrbitControls(me.camera, me.canvas);
    me.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }; me.ajustaToque();
    me.controls.enableDamping = false; me.controls.minDistance = 1.2; me.controls.maxDistance = 70;
    me.controls.maxPolarAngle = Math.PI * 0.495; me.controls.screenSpacePanning = true;
    me.controls.addEventListener('change', function () { me.pedir(); });
    me.controls.addEventListener('start', function () { me.tween = null; me.userMoved = true; });
    me.ok3d = true; me.carga.style.display = 'none';
    me.canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); me.noGL(); });
    me.canvas.addEventListener('webglcontextrestored', function () { me.sin3d.classList.remove('on'); me.ok3d = true; me.pedir(); });
    var ro = new ResizeObserver(function () { me.resize(); }); ro.observe(me.stage);
    me.resize();
    var fn = TET.escenas[me.def.escena];
    if (fn) me.escena = fn({ THREE: THREE, scene: me.scene, camera: me.camera, pal: TET.pal, pedir: function () { me.pedir(); }, reducir: reduce });
    var co = me.escena && me.escena.corriente;
    if (co) {
      co.setReducedMotion(reduce); co.setEnabled(me.verCor); me.bCor.style.display = ''; if (me.leyCor) me.leyCor.style.display = '';
      me.enPantalla = true; me.corAcc = 0;
      if (window.IntersectionObserver) new IntersectionObserver(function (en) { me.enPantalla = en[0].isIntersecting; if (me.enPantalla) me.pedir(); }, { threshold: 0.01 }).observe(me.stage);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) me.pedir(); });
    }
  };
  P.ajustaToque = function () { this.canvas.style.touchAction = window.matchMedia('(max-width:959px)').matches ? 'pan-y' : 'none'; };
  P.noGL = function () { this.ok3d = false; this.sin3d.classList.add('on'); this.carga.style.display = 'none'; this.stage.classList.add('nogl'); };
  P.resize = function () {
    if (!this.ok3d) return;
    this.ajustaToque();
    var w = this.stage.clientWidth, hh = this.stage.clientHeight; if (!w || !hh) return;
    this.renderer.setSize(w, hh, false); this.camera.aspect = w / hh; this.camera.updateProjectionMatrix();
    if (this.pose && !this.tween && !this.userMoved) this.aplicaPose(this.pose, true);
    this.pedir();
  };

  /* ----- cámara ----- */
  P.poseDe = function (cam) {
    var cams = (this.escena && this.escena.camaras) || {};
    var c = typeof cam === 'string' ? cams[cam] : cam;
    return c || cams.general || null;
  };
  P.aplicaPose = function (pose, instante) {
    if (!pose || !this.ok3d) return;
    var asp = this.camera.aspect || 1, f = Math.max(1, Math.pow(1.25 / asp, 0.85));
    var t = new THREE.Vector3().fromArray(pose.t), p = new THREE.Vector3().fromArray(pose.p);
    p.sub(t).multiplyScalar(f).add(t);
    if (instante || reduce) {
      this.camera.position.copy(p); this.controls.target.copy(t); this.controls.update(); this.tween = null;
    } else {
      this.tween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: p, t1: t, k: 0 };
    }
    this.pedir();
  };

  /* ----- bucle ----- */
  P.pedir = function () { this.dirty = true; if (!this.loopOn) { this.loopOn = true; this.last = performance.now(); var me = this; requestAnimationFrame(function (n) { me.loop(n); }); } };
  P.loop = function (now) {
    var me = this, dt = Math.min(0.1, (now - me.last) / 1000); me.last = now;
    if (me.tween) {
      me.tween.k = Math.min(1, me.tween.k + dt / 1.1);
      var e = me.tween.k; e = e * e * (3 - 2 * e);
      me.camera.position.lerpVectors(me.tween.p0, me.tween.p1, e);
      me.controls.target.lerpVectors(me.tween.t0, me.tween.t1, e);
      me.controls.update(); me.dirty = true;
      if (me.tween.k >= 1) me.tween = null;
    }
    if (me.running) me.avanza(dt);
    var co = me.escena && me.escena.corriente, corKeep = false;
    if (co && me.ok3d && me.verCor && me.enPantalla && !document.hidden && co.activo()) {   // corriente: ≤30 fps y solo si hay puntos en tensión a la vista
      corKeep = true; me.corAcc += dt;
      if (me.corAcc >= 0.032) { co.update(me.corAcc); me.corAcc = 0; me.dirty = true; }
    }
    if (me.dirty && me.ok3d) { me.dirty = false; me.renderer.render(me.scene, me.camera); me.renderDet(); }
    if (me.running || me.tween || me.dirty || corKeep) requestAnimationFrame(function (n) { me.loop(n); });
    else me.loopOn = false;
  };

  /* ----- pasos ----- */
  P.cargar = function (sel, inicial) {
    var me = this, r = me.def.construir(sel);
    me.sel = sel; me.fases = r.fases; me.pasos = [];
    r.fases.forEach(function (f, fi) { f.pasos.forEach(function (p) { me.pasos.push({ p: p, f: fi, idx: me.pasos.length }); }); });
    if (me.def.selector) {
      Array.prototype.forEach.call(me.seg.children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-id') === sel ? 'true' : 'false'); });
      var o = me.def.selector.opciones.filter(function (x) { return x.id === sel; })[0];
      me.desc.textContent = (o && o.desc) || '';
      try { var u = new URL(location.href); u.searchParams.set(me.def.selector.param || 'op', sel); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
    }
    if (me.escena && me.escena.configurar) me.escena.configurar(r.escena || {});
    me.pausa();
    me.pintaLista(); me.pintaFases();
    var n0 = 0;
    if (inicial) { var m = /[#&]p=(\d+)/.exec(location.hash); if (m) n0 = Math.min(me.pasos.length - 1, Math.max(0, +m[1] - 1)); }
    me.ir(n0, false, true);
  };
  P.pintaFases = function () {
    var me = this; me.fasesBar.innerHTML = '';
    me.fases.forEach(function (f, i) {
      var b = h('button', { type: 'button', 'aria-label': 'Ir a la fase ' + (i + 1) + ': ' + f.nombre }); b.style.setProperty('--w', f.pasos.length);
      b.appendChild(h('span', { class: 'rell' }));
      b.addEventListener('click', function () { me.pausa(); var k = me.pasos.filter(function (x) { return x.f === i; })[0]; me.ir(k.idx, true); });
      me.fasesBar.appendChild(b);
    });
  };
  P.pintaLista = function () {
    var me = this; me.lista.innerHTML = ''; me.items = [];
    me.fases.forEach(function (f, fi) {
      me.lista.appendChild(h('h3', { text: f.nombre }));
      var ol = h('ol');
      f.pasos.forEach(function (p) {
        var g = me.pasos.filter(function (x) { return x.p === p; })[0];
        var li = h('li'), b = h('button', { type: 'button' });
        b.appendChild(h('span', { class: 'n', text: (g.idx + 1) + '.' })); b.appendChild(h('span', { class: 't', text: p.texto })); b.appendChild(h('span', { class: 'p', text: 'p. ' + p.pag }));
        b.addEventListener('click', function () { me.pausa(); me.ir(g.idx, true); me.pasoBox.scrollIntoView && me.alVer(); });
        li.appendChild(b); ol.appendChild(li); me.items[g.idx] = b;
      });
      me.lista.appendChild(ol);
    });
  };
  P.alVer = function () {
    if (window.matchMedia('(min-width:960px)').matches) return;
    var r = this.stage.getBoundingClientRect();
    if (r.top < -20 || r.top > 120) this.stage.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  };
  P.pinta = function () {
    var me = this, g = me.pasos[me.n], p = g.p, f = me.fases[g.f];
    me.faseNom.textContent = 'Fase ' + (g.f + 1) + ' de ' + me.fases.length + ' · ' + f.nombre;
    me.tag.textContent = 'Paso ' + (me.n + 1) + ' / ' + me.pasos.length;
    me.pasoCab.innerHTML = '';
    me.pasoCab.appendChild(h('span', { class: 'paso-n', text: 'Paso ' + (me.n + 1) + ' de ' + me.pasos.length }));
    me.pasoCab.appendChild(cita(p.pag));
    if (p.ilus) me.pasoCab.appendChild(h('span', { class: 'ilus', text: 'Gesto ilustrativo' }));
    me.pasoTxt.textContent = p.texto;
    me.pasoNota.innerHTML = '';
    var nts = [], nch = 0;
    if (p.nota) { nts.push(h('p', { class: 'paso-nota', html: p.nota })); nch += p.nota.length; }
    if (typeof p.ilus === 'string') { nts.push(h('p', { class: 'paso-nota', html: '<strong>Ilustrativo.</strong> ' + p.ilus })); nch += p.ilus.length + 12; }
    var detT = p.det ? [].concat(p.det).map(function (d) { return d && d.txt; }).filter(Boolean) : [];
    detT.forEach(function (t) { nts.push(h('p', { class: 'paso-nota', text: t })); nch += t.length; });
    if (nts.length) {
      var dn = h('details', { class: 'notas' }); dn.open = p.texto.length <= 120 && nch <= 220;
      dn.appendChild(h('summary', { text: (nts.length > 1 ? 'Notas del paso' : (p.nota ? 'Nota del paso' : 'Ilustrativo')) + (dn.open ? '' : ' (tocar para ver)') }));
      nts.forEach(function (n) { dn.appendChild(n); }); me.pasoNota.appendChild(dn);
    }
    if (me.scrollEl && window.matchMedia('(min-width:960px)').matches) me.scrollEl.scrollTop = 0;
    // barra de fases
    var bs = me.fasesBar.children;
    for (var i = 0; i < bs.length; i++) {
      var first = me.pasos.filter(function (x) { return x.f === i; });
      var done = first.filter(function (x) { return x.idx < me.n; }).length;
      var pct = i < g.f ? 100 : i > g.f ? 0 : Math.round(100 * (done + 1) / first.length);
      bs[i].style.setProperty('--p', pct + '%'); bs[i].classList.toggle('hecha', i < g.f);
      bs[i].setAttribute('aria-current', i === g.f ? 'true' : 'false');
    }
    me.items.forEach(function (b, i) {
      b.removeAttribute('aria-current'); b.classList.toggle('pasado', i < me.n);
      if (i === me.n) b.setAttribute('aria-current', 'step');
    });
    me.bPrev.disabled = me.n === 0; me.bNext.disabled = me.n === me.pasos.length - 1;
    try { history.replaceState(null, '', location.pathname + location.search + '#p=' + (me.n + 1)); } catch (e) {}
  };
  /* ir(n): estado determinista «tras el paso n−1» + animación del paso n */
  P.ir = function (n, anima, sinPose) {
    var me = this; n = Math.max(0, Math.min(me.pasos.length - 1, n)); me.n = n;
    var esc = me.escena;
    if (esc) {
      esc.reset();
      for (var k = 0; k < n; k++) esc.aplicar(me.pasos[k].p.anim, 1, false);
      esc.aplicar(me.pasos[n].p.anim, 0, true);
    }
    me.t = 0; me.dwell = 0; me.running = !!anima || me.playing;
    if (reduce) { me.t = 1; if (esc) esc.aplicar(me.pasos[n].p.anim, 1, true); me.running = me.playing; }
    var cams = null, ci;
    for (ci = n; ci >= 0; ci--) { if (me.pasos[ci].p.cam) { cams = me.pasos[ci].p.cam; break; } }
    me.pose = me.poseDe(cams || 'general');
    if (!sinPose || !me.userMoved) me.aplicaPose(me.pose, !!sinPose);
    me.userMoved = false;
    me.setDet(me.pasos[n].p.det);
    me.pinta(); me.pedir();
  };
  P.durPaso = function () { return (this.pasos[this.n].p.dur || 2.6); };
  P.dwellDur = function () { return Math.max(2.4, Math.min(9, 1.4 + this.pasos[this.n].p.texto.length * 0.034)); };
  P.avanza = function (dt) {
    var me = this, esc = me.escena, p = me.pasos[me.n].p;
    if (me.t < 1) {
      me.t = Math.min(1, me.t + dt * me.speed / me.durPaso());
      if (esc) esc.aplicar(p.anim, me.t, true);
      me.dirty = true;
      if (me.t >= 1 && !me.playing) me.running = false;
      return;
    }
    if (!me.playing) { me.running = false; return; }
    me.dwell += dt * me.speed;
    if (me.dwell >= me.dwellDur()) {
      if (!me.auto) { me.pausa(); return; }
      if (me.n >= me.pasos.length - 1) { me.pausa(); return; }
      me.ir(me.n + 1, true);
    }
  };
  P.pausa = function () { this.playing = false; this.running = false; this.pintaPlay(); };
  P.togglePlay = function () {
    var me = this;
    if (me.playing) { me.pausa(); return; }
    if (me.n >= me.pasos.length - 1 && me.t >= 1) me.ir(0, false);
    me.playing = true; me.pintaPlay();
    if (me.t >= 1) { me.running = true; me.dwell = Math.max(me.dwell, me.dwellDur() * 0.55); } // reanuda tras una pausa
    else me.running = true;
    me.pedir();
  };
  P.tecla = function (e) {
    var tg = e.target, tag = tg && tg.tagName;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'SUMMARY') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); this.pausa(); this.ir(this.n + 1, true); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.pausa(); this.ir(this.n - 1, true); }
    else if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A') { e.preventDefault(); this.togglePlay(); }
  };

  /* ---------- montaje ---------- */
  TET.montar = function (def) {
    TET.initTema();
    var rep = document.getElementById('reproductor'), fi = document.getElementById('fichas');
    if (fi) renderFichas(def, fi);
    if (rep) TET.rep = new Reproductor(rep, def);
  };
})();
