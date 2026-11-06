/* ============================================================
   Escena reutilizable «apoyo de red aérea convencional de BT».
   Eje x = dirección de la línea, y = vertical, z = hacia la cámara.
   Unidades: metros. Todo el estado vive en `st`; las acciones solo
   modifican `st` y `draw()` lo vuelca a la escena → determinista y
   reversible (reset() + repetir acciones a t=1).
   Colores: solo paleta CSS (--e-*), vía ctx.pal().
   ============================================================ */
(function () {
  'use strict';
  window.TET = window.TET || {}; TET.escenas = TET.escenas || {};

  TET.escenas['apoyo-bt'] = function (ctx) {
    var T = ctx.THREE, scene = ctx.scene, pal = ctx.pal, pedir = ctx.pedir;
    var V = function (x, y, z) { return new T.Vector3(x, y, z); };
    var cl = function (x, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.min(b, Math.max(a, x)); };
    var seg = function (t, a, b) { return cl((t - a) / (b - a)); };
    var ss = function (x) { x = cl(x); return x * x * (3 - 2 * x); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var PI = Math.PI;

    /* ---------- constantes geométricas ---------- */
    var FA = ['N', 'R', 'S', 'T'];                         // de arriba abajo
    var YF = [8.1, 7.75, 7.4, 7.05];                        // altura de cada conductor en el apoyo
    var ZC = 0.42, LTOT = 20, SAG = 0.6, POLE_H = 8.6, IS = 2; // IS = fase cuyo aislador se sustituye (S)
    var XJ = 1.3;                                           // x de la derivación sobre la línea (A.1)
    var CG = V(5.4, 3.35, 2.1);                             // centro de la CGP
    var LB = V(2.0, 0, 0.22), LT = V(0.18, 6.9, 0.22);      // base y cabeza de la escalera
    var HEAD = 1.75, HCOT = 0.4;                            // altura del trabajador y cota de 40 cm
    var HAPOYO = 0.2, HFIN = 0.2;                         // elevación del conductor
    function kern(x) { var k = Math.max(0, 1 - Math.abs(x) / 3.5); return k * k; }
    function yC(i, x, hh) { var u = Math.min(1, Math.abs(x) / LTOT); return YF[i] - 4 * SAG * u * (1 - u) + (hh || 0) * kern(x); }
    function ladX(y) { return LB.x + (LT.x - LB.x) * (y / LT.y); }
    var SIDE = 1, AY0 = -1.3, XW = 0.7, YFEET = 0;

    /* ---------- estado ---------- */
    var opt = { fin: false, acometida: true, desconexion: false, sust: false, izq: false };
    /* opt.izq: escalera a la izquierda y derivación pegada al apoyo, como en el esquema de la p. 44 (A.1) */
    function lado() {
      SIDE = opt.izq ? -1 : 1; AY0 = opt.izq ? 1.3 : -1.3; XJ = opt.izq ? 0.8 : 1.3;
      LB.set(2.0 * SIDE, 0, 0.22); LT.set(0.18 * SIDE, 6.9, 0.22); XW = 0.7 * SIDE;
      for (var k = 0; k < 6; k++) { YFEET = yC(3, XW, 0) - HCOT - HEAD; XW = ladX(YFEET); }
      var cs = camaras, wx = 2.9 * SIDE; if (!cs) return;
      cs.dDedal.t = [XJ, YF[0], ZC]; cs.dDedal.p = [XJ + 0.6, YF[0] - 0.05, 1.2]; cs.dDedal2.t = [XJ, YF[1], ZC]; cs.dDedal2.p = [XJ + 0.6, YF[1] - 0.05, 1.2];
      cs.dSujecion.t = [LT.x, 6.8, 0.2]; cs.dSujecion.p = [LT.x + 0.9 * SIDE, 6.9, 1.5];
      cs.dObjetos.t = [wx, 1.28, 0.9]; cs.dObjetos.p = [wx - SIDE * 1.5, 1.45, 1.45]; cs.objetos.t = [(wx + AY0) * 0.5, 1.0, 1.3]; cs.objetos.p = [(wx + AY0) * 0.5 + 1.5, 4.8, 6.6];
      cs.dObjetosAy.t = [AY0, 1.3, 1.3]; cs.dObjetosAy.p = [AY0 + 0.3, 1.45, -0.3];
    }
    lado();
    var G = null, O = null, st = null, own = [];
    var mats = {}, sprites = [], geos = {};

    function M(k, extra) {
      var key = k + (extra ? JSON.stringify(extra) : '');
      if (!mats[key]) { var m = new T.MeshLambertMaterial(Object.assign({ color: pal(k) }, extra || {})); m.userData.k = k; mats[key] = m; }
      return mats[key];
    }
    function Mt(k, op) { return M(k, { transparent: true, opacity: op == null ? 0.5 : op, depthWrite: false, side: T.DoubleSide }); }
    function MB(k) { var key = 'B' + k; if (!mats[key]) { var m = new T.MeshBasicMaterial({ color: pal(k) }); m.userData.k = k; mats[key] = m; } return mats[key]; }
    function geo(key, fn) { return geos[key] || (geos[key] = fn()); }
    function box(w, h, d) { return geo('b' + w + ',' + h + ',' + d, function () { return new T.BoxGeometry(w, h, d); }); }
    function cylU(r, seg) { return geo('c' + r + ',' + (seg || 7), function () { return new T.CylinderGeometry(r, r, 1, seg || 7); }); }
    function cylZ(r, len, seg) { return geo('cz' + r + ',' + len, function () { var g = new T.CylinderGeometry(r, r, len, seg || 10); g.rotateX(PI / 2); return g; }); }
    function cylX(r, len, seg) { return geo('cx' + r + ',' + len, function () { var g = new T.CylinderGeometry(r, r, len, seg || 10); g.rotateZ(PI / 2); return g; }); }
    function sph(r, ws, hs) { return geo('s' + r + ',' + ws, function () { return new T.SphereGeometry(r, ws || 10, hs || 8); }); }
    function mk(g, m, x, y, z, parent) { var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(o); return o; }
    function grp(parent, x, y, z) { var g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }

    var _d = V(0, 0, 0), _q = new T.Quaternion(), UP = V(0, 1, 0);
    function place(m, a, b) {            // coloca un cilindro unidad entre a y b
      _d.subVectors(b, a); var L = _d.length();
      if (L < 1e-3) { m.visible = false; return; }
      m.visible = true; m.position.copy(a).addScaledVector(_d, 0.5);
      m.quaternion.setFromUnitVectors(UP, _d.normalize()); m.scale.set(1, L, 1);
    }
    function tubo(n, rad, mat) {
      var R = 5, g = new T.BufferGeometry(), idx = [], i, j;
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * R * 3), 3));
      for (i = 0; i < n - 1; i++) for (j = 0; j < R; j++) {
        var a = i * R + j, b = i * R + (j + 1) % R, c = (i + 1) * R + j, d = (i + 1) * R + (j + 1) % R; idx.push(a, c, b, b, c, d);
      }
      g.setIndex(idx); var m = new T.Mesh(g, mat); m.frustumCulled = false; m.userData.rad = rad; m.userData.R = R; own.push(g); return m;
    }
    var _t = V(0, 0, 0), _n1 = V(0, 0, 0), _n2 = V(0, 0, 0);
    function tuboSet(m, pts) {
      var g = m.geometry, pos = g.attributes.position.array, R = m.userData.R, r = m.userData.rad, n = pts.length, i, j, k = 0;
      for (i = 0; i < n; i++) {
        _t.subVectors(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)]).normalize();
        _n1.set(-_t.z, 0, _t.x); if (_n1.lengthSq() < 1e-4) _n1.set(1, 0, 0); _n1.normalize();
        _n2.crossVectors(_t, _n1);
        for (j = 0; j < R; j++) {
          var a = j / R * PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
          pos[k++] = pts[i].x + ca * _n1.x + sa * _n2.x; pos[k++] = pts[i].y + ca * _n1.y + sa * _n2.y; pos[k++] = pts[i].z + ca * _n1.z + sa * _n2.z;
        }
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
    }
    function etq(txt, k, w, h, tc) {
      var c = document.createElement('canvas'); c.width = 192; c.height = 96;
      var tex = new T.CanvasTexture(c); var mt = new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
      var s = new T.Sprite(mt); s.scale.set(w, h, 1); s.renderOrder = 20;
      var o = { s: s, c: c, tex: tex, txt: txt, k: k, tc: tc || 'blanco' }; sprites.push(o); dibujaEtq(o); return s;
    }
    function dibujaEtq(o) {
      var c = o.c, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
      var W = c.width, H = c.height, r = 20;
      g.fillStyle = o.k === 'check' ? pal('ok') : pal(o.k); g.beginPath();
      if (o.txt === '✓') { g.arc(W / 2, H / 2, 40, 0, PI * 2); } else { g.moveTo(r, 6); g.lineTo(W - r, 6); g.quadraticCurveTo(W - 6, 6, W - 6, r); g.lineTo(W - 6, H - r); g.quadraticCurveTo(W - 6, H - 6, W - r, H - 6); g.lineTo(r, H - 6); g.quadraticCurveTo(6, H - 6, 6, H - r); g.lineTo(6, r); g.quadraticCurveTo(6, 6, r, 6); }
      g.fill(); g.lineWidth = 5; g.strokeStyle = pal('texto'); g.globalAlpha = 0.9; g.stroke(); g.globalAlpha = 1;
      var cc = new T.Color(pal(o.k)), lum = 0.299 * cc.r + 0.587 * cc.g + 0.114 * cc.b, osc = o.tc === 'oscuro' || (o.tc === 'auto' && lum > 0.5);
      g.fillStyle = osc ? '#14181d' : '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (o.txt === '✓') { g.strokeStyle = '#fff'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(W / 2 - 20, H / 2 + 2); g.lineTo(W / 2 - 5, H / 2 + 18); g.lineTo(W / 2 + 22, H / 2 - 16); g.stroke(); }
      else { var fs = o.txt.length > 3 ? 44 : 64; g.font = '800 ' + fs + 'px "Avenir Next Condensed","Bahnschrift","Arial Narrow",system-ui,sans-serif'; g.fillText(o.txt, W / 2, H / 2 + 3); }
      o.tex.needsUpdate = true;
    }


    /* ---------- material metálico (envMap procedural: sirve en claro y en oscuro) ---------- */
    var envTex = null;
    function env() {
      if (envTex) return envTex;
      var faces = [], i;
      for (i = 0; i < 6; i++) {
        var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 32);
        if (i === 2) { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e6eef6'); }
        else if (i === 3) { gr.addColorStop(0, '#59636d'); gr.addColorStop(1, '#3d454d'); }
        else { gr.addColorStop(0, '#f4f8fc'); gr.addColorStop(0.45, '#cfdbe6'); gr.addColorStop(0.55, '#5f6b76'); gr.addColorStop(1, '#8a97a3'); }
        g.fillStyle = gr; g.fillRect(0, 0, 32, 32); if (i === 0 || i === 4) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(8, 4, 10, 8); }
        faces.push(c);
      }
      envTex = new T.CubeTexture(faces); envTex.needsUpdate = true; return envTex;
    }
    function MM(k) { // metal brillante; k = clave de paleta ('metal' dorado, 'halo' acero)
      var key = 'MM' + k;
      if (!mats[key]) { var m = new T.MeshStandardMaterial({ color: pal(k), metalness: 0.95, roughness: 0.26, envMap: env(), envMapIntensity: 1.3 }); m.userData.k = k; mats[key] = m; }
      return mats[key];
    }
    function metalizaGLB(o) { o.traverse(function (x) { if (x.isMesh && x.material) { var ms = Array.isArray(x.material) ? x.material : [x.material]; ms.forEach(function (m) { m.envMap = env(); m.envMapIntensity = 1.3; if (m.metalness < 0.7) m.metalness = 0.85; if (m.roughness > 0.45) m.roughness = 0.35; }); } }); }
    /* modelo GLB normalizado: eje más largo → ejeL, más fino → ejeF (axes 'x'|'y'|'z'), centrado, largo en metros */
    function envolverOr(src, largo, ejeL, ejeF) {
      var m = src.clone(true), b = new T.Box3().setFromObject(m), sz = b.getSize(V(0, 0, 0)), c = b.getCenter(V(0, 0, 0));
      var a = [sz.x, sz.y, sz.z], idx = [0, 1, 2].sort(function (p, q) { return a[q] - a[p]; }), iL = idx[0], iM = idx[1], iF = idx[2];
      var E = { x: V(1, 0, 0), y: V(0, 1, 0), z: V(0, 0, 1) }, eL = E[ejeL], eF = E[ejeF], eM = new T.Vector3().crossVectors(eL, eF);
      var cols = []; cols[iL] = eL; cols[iF] = eF; cols[iM] = eM;
      var Mx = new T.Matrix4().makeBasis(cols[0], cols[1], cols[2]); if (Mx.determinant() < 0) { cols[iM] = eM.clone().negate(); Mx.makeBasis(cols[0], cols[1], cols[2]); }
      m.position.set(-c.x, -c.y, -c.z); var inner = new T.Group(); inner.add(m); inner.scale.setScalar(largo / a[iL]); inner.quaternion.setFromRotationMatrix(Mx);
      var g = new T.Group(); g.add(inner); return g;
    }
    /* capuchón o protector aislante de aislador: arco en U sobre el aislador con lengüetas (esquema p. 49) */
    function capuchon(opac) {
      var g = new T.Group(), ge = geo('capuchonArco', function () { var q = new T.CylinderGeometry(0.14, 0.14, 0.3, 14, 1, true, 0, PI); q.rotateZ(PI / 2); return q; });
      var arco = new T.Mesh(ge, Mt('aisl', opac || 0.5)); g.add(arco);
      mk(geo('capuchonTapa', function () { var q = new T.CircleGeometry(0.14, 14, 0, PI); q.rotateY(PI / 2); return q; }), Mt('aisl', opac || 0.5), 0.15, 0, 0, g);
      mk(geo('capuchonTapa', function () { var q = new T.CircleGeometry(0.14, 14, 0, PI); q.rotateY(PI / 2); return q; }), Mt('aisl', opac || 0.5), -0.15, 0, 0, g);
      for (var q = -1; q <= 1; q++) { mk(box(0.04, 0.075, 0.012), M('aisl'), q * 0.1, -0.035, 0.14, g); mk(box(0.04, 0.075, 0.012), M('aisl'), q * 0.1, -0.035, -0.14, g); }
      return g;
    }
    /* dedal aislante: caperuza cilíndrica con extremo redondeado y borde */
    function dedal() {
      var g = new T.Group();
      mk(geo('dedalCil', function () { return new T.CylinderGeometry(0.055, 0.055, 0.13, 12, 1, true); }), Mt('aisl', 0.7), 0, -0.065, 0, g);
      mk(geo('dedalCup', function () { return new T.SphereGeometry(0.055, 12, 6, 0, PI * 2, 0, PI / 2); }), Mt('aisl', 0.7), 0, 0, 0, g);
      mk(geo('dedalRim', function () { var q = new T.TorusGeometry(0.055, 0.009, 6, 14); q.rotateX(PI / 2); return q; }), M('aisl'), 0, -0.13, 0, g);
      return g;
    }
    /* polea: garganta, placas laterales, eje y gancho */
    function polea(par) {
      mk(geo('polRueda', function () { var q = new T.TorusGeometry(0.06, 0.016, 8, 18); q.rotateY(PI / 2); return q; }), MM('halo'), 0, 0, 0, par);
      mk(box(0.012, 0.15, 0.11), MM('metal'), 0.035, 0.015, 0, par); mk(box(0.012, 0.15, 0.11), MM('metal'), -0.035, 0.015, 0, par);
      mk(cylX(0.012, 0.09, 8), MM('halo'), 0, 0, 0, par);
      mk(geo('polGancho', function () { var q = new T.TorusGeometry(0.03, 0.007, 6, 12); return q; }), MM('metal'), 0, 0.105, 0, par);
      mk(box(0.04, 0.04, 0.62), M('metal'), 0, 0, -0.31, par);
    }

    /* ---------- objetos metálicos que lleva cada trabajador (anclados al cuerpo) ---------- */
    function llevaMetal(P) {
      var it = [], g = P.g;
      function add(o, home, x, y, z, rx, ry, rz) { o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); home.add(o); var r = { o: o, home: home, lp: V(x, y, z), lr: V(rx || 0, ry || 0, rz || 0) }; it.push(r); return r; }
      var neck = grp(g, 0, 1.5, 0.05), cint = grp(g, 0, 0.93, 0), pocket = grp(g, 0.1, 1.34, 0.125);
      mk(box(0.43, 0.045, 0.255), M('ropa2'), 0, 0.0, 0, cint);
      // cadena con colgante (el GLB sustituye al fallback)
      var cad = new T.Group(); mk(geo('cadTor', function () { return new T.TorusGeometry(0.085, 0.01, 6, 18); }), MM('metal'), 0, -0.07, 0.01, cad).rotation.x = 0.35;
      mk(box(0.04, 0.05, 0.012), MM('metal'), 0, -0.16, 0.085, cad);
      var rCad = add(cad, neck, 0, 0, 0.03, 0, 0, 0);
      // reloj, pulsera, anillo
      var rel = new T.Group(); mk(box(0.135, 0.05, 0.135), MM('halo'), 0, 0, 0, rel); mk(box(0.07, 0.012, 0.07), MB('texto'), 0, 0.03, 0.0, rel).rotation.set(0, 0, 0);
      add(rel, P.aL, 0, -0.52, 0, 0, 0, 0);
      add(mk(geo('pulsT', function () { var q = new T.TorusGeometry(0.075, 0.014, 6, 16); q.rotateX(PI / 2); return q; }), MM('metal'), 0, 0, 0), P.aR, 0, -0.5, 0, 0, 0, 0);
      add(mk(geo('anilT', function () { var q = new T.TorusGeometry(0.034, 0.009, 6, 12); q.rotateX(PI / 2); return q; }), MM('metal'), 0, 0, 0), P.aR, 0, -0.68, 0, 0, 0, 0);
      // hebilla del cinturón
      var heb = new T.Group(); mk(box(0.085, 0.07, 0.014), MM('halo'), 0, 0, 0, heb); mk(box(0.045, 0.04, 0.02), M('ropa2'), 0, 0, 0.004, heb);
      add(heb, cint, 0, 0, 0.133, 0, 0, 0);
      // bolígrafo en el bolsillo del pecho
      var bol = new T.Group(); mk(geo('bolCil', function () { return new T.CylinderGeometry(0.009, 0.009, 0.15, 8); }), MM('halo'), 0, 0, 0, bol); mk(box(0.012, 0.05, 0.01), MM('metal'), 0.012, 0.045, 0, bol);
      var rBol = add(bol, pocket, 0, 0.045, 0.012, 0, 0, 0);
      // navaja y llaves en el cinturón
      var nav = new T.Group(); mk(box(0.1, 0.022, 0.03), MM('halo'), 0, 0, 0, nav); mk(box(0.04, 0.024, 0.032), M('ropa2'), 0.035, 0, 0, nav);
      var rNav = add(nav, cint, 0.19, -0.01, 0.1, 0, 0.3, 0);
      var llv = new T.Group(); mk(geo('llvT', function () { return new T.TorusGeometry(0.028, 0.006, 6, 12); }), MM('halo'), 0, 0.03, 0, llv);
      mk(box(0.02, 0.075, 0.006), MM('metal'), -0.012, -0.03, 0, llv); mk(box(0.02, 0.065, 0.006), MM('halo'), 0.012, -0.025, 0, llv);
      add(llv, cint, -0.17, -0.05, 0.12, 0, 0, 0.15);
      // GLB: sustituyen a los fallback cuando cargan
      usar('cadena_metalica', function (src) { var w = envolverOr(src, 0.3, 'x', 'z'); metalizaGLB(w); cad.children.forEach(function (c) { c.visible = false; }); w.position.set(0, -0.12, 0.07); cad.add(w); });
      usar('boligrafo_metal', function (src) { var w = envolverOr(src, 0.15, 'y', 'z'); metalizaGLB(w); bol.children.forEach(function (c) { c.visible = false; }); bol.add(w); });
      usar('navaja', function (src) { var w = envolverOr(src, 0.11, 'x', 'z'); metalizaGLB(w); nav.children.forEach(function (c) { c.visible = false; }); nav.add(w); });
      return it;
    }

    /* ---------- personas ---------- */
    function persona(cascoK) {
      var g = new T.Group(), P = { g: g };
      function pierna(x) { var pv = grp(g, x, 0.92, 0); mk(box(0.16, 0.86, 0.2), M('ropa2'), 0, -0.46, 0, pv); mk(box(0.19, 0.1, 0.3), M('viejo'), 0, -0.9, 0.05, pv); return pv; }
      P.lL = pierna(-0.1); P.lR = pierna(0.1);
      mk(box(0.4, 0.58, 0.24), M('ropa'), 0, 1.22, 0, g);
      mk(sph(0.105, 10, 8), M('piel'), 0, 1.6, 0, g);
      var casco = mk(geo('casco', function () { return new T.SphereGeometry(0.125, 10, 6, 0, PI * 2, 0, PI / 2); }), M(cascoK), 0, 1.62, 0, g);
      mk(box(0.3, 0.025, 0.1), M(cascoK), 0, 1.625, 0.1, g);
      P.visor = grp(g, 0, 1.74, 0.1); mk(box(0.25, 0.2, 0.015), Mt('casco', 0.35), 0, -0.1, 0.05, P.visor);
      P.belt = mk(box(0.43, 0.07, 0.26), M('aislador'), 0, 0.93, 0, g); P.belt.visible = false;
      function brazo(x) {
        var a = grp(g, x, 1.46, 0); mk(box(0.11, 0.6, 0.11), M('ropa'), 0, -0.3, 0, a); mk(box(0.1, 0.09, 0.1), M('piel'), 0, -0.64, 0, a);
        var gl = mk(box(0.14, 0.13, 0.14), M('guante'), 0, -0.65, 0, a); gl.visible = false; a.userData.gl = gl; return a;
      }
      P.aL = brazo(-0.26); P.aR = brazo(0.26);
      P.pose = function (o) {
        P.visor.rotation.x = o.visor == null ? 0 : o.visor; P.aL.userData.gl.visible = P.aR.userData.gl.visible = !!o.guantes; P.belt.visible = !!o.cinto;
        P.aL.rotation.x = o.armL || 0; P.aR.rotation.x = o.armR || 0; P.lL.rotation.x = Math.sin(o.w || 0) * 0.55; P.lR.rotation.x = -Math.sin(o.w || 0) * 0.55;
      };
      return P;
    }

    function aislador(k, dir) { // pin horizontal con dos campanas; centro en el origen, apunta a +z (dir=-1: a -z)
      var g = new T.Group(); mk(box(0.09, 0.09, 0.2), M('poste'), 0, 0, -0.14, g);
      mk(cylZ(0.035, 0.22), M(k), 0, 0, 0.03, g); mk(cylZ(0.085, 0.035, 12), M(k), 0, 0, 0.0, g); mk(cylZ(0.07, 0.035, 12), M(k), 0, 0, 0.07, g);
      if (dir < 0) g.rotation.y = PI; return g;
    }


    /* ---------- modelos GLB (NVIDIA SimReady, CC BY 4.0), carga perezosa con respaldo procedural ---------- */
    var MBASE = (function () { var sc = document.querySelectorAll('script[src*="apoyo-bt.js"]'); return sc.length ? sc[0].src.replace('escenas/apoyo-bt.js', 'modelos/') : '../assets/modelos/'; })();
    var GL = { state: {}, src: {}, wait: {} }, glLoader = null;
    function usar(name, fn) {
      var s = GL.state[name];
      if (s === 'ok') { fn(GL.src[name]); return; }
      if (s === 'err' || !T.GLTFLoader) return;
      (GL.wait[name] = GL.wait[name] || []).push(fn);
      if (s === 'load') return;
      GL.state[name] = 'load';
      if (!glLoader) {
        glLoader = new T.GLTFLoader();
        if (window.MeshoptDecoder) glLoader.setMeshoptDecoder(window.MeshoptDecoder);
        glLoader.setKTX2Loader({ detectSupport: function () { return this; }, load: function (u, ok) { var t = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; ok(t); } });
      }
      glLoader.load(MBASE + name + '.glb', function (g) {
        g.scene.traverse(function (o) { if (o.isMesh && o.material) { var ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(function (m) { if (m.metalness > 0.35) m.metalness = 0.35; }); } });
        GL.src[name] = g.scene; GL.state[name] = 'ok'; var w = GL.wait[name] || []; GL.wait[name] = []; w.forEach(function (f) { try { f(g.scene); } catch (e) { if (window.console) console.warn(e); } }); if (st) draw(); else pedir();
      }, undefined, function (e) { GL.state[name] = 'err'; GL.wait[name] = []; if (window.console) console.warn('GLB', name, e && e.message); });
    }
    function envolver(src, tam, eje) { // copia centrada en x/z, apoyada en y=0 y escalada para que la dimensión `eje` mida `tam` metros
      var m = src.clone(true), b = new T.Box3().setFromObject(m), sz = b.getSize(V(0, 0, 0)), c = b.getCenter(V(0, 0, 0));
      var d = eje === 'x' ? sz.x : eje === 'y' ? sz.y : eje === 'z' ? sz.z : Math.max(sz.x, sz.y, sz.z);
      m.position.set(-c.x, -b.min.y, -c.z); var inner = new T.Group(); inner.add(m); inner.scale.setScalar(tam / d);
      var g = new T.Group(); g.add(inner); g.userData.inner = inner; return g;
    }
    function ocultaHijos(g, n) { for (var i = 0; i < (n == null ? g.children.length : n); i++) g.children[i].visible = false; }
    function lazy() {
      var o = O, s = st;
      if (s.cl > 0.01 && !o.escG) { o.escG = 1; usar('escalera_aislante', function (src) {
        if (o !== O) return;
        var m = src.clone(true); m.traverse(function (x) { if (x.isMesh) { var mm = x.material.clone(); mm.map = mm.normalMap = mm.metalnessMap = mm.roughnessMap = mm.aoMap = null; mm.metalness = 0; mm.roughness = 0.7; mm.color.set(pal('esc')); mm.userData.k = 'esc'; mats['gl' + x.id] = mm; x.material = mm; } });
        var b = new T.Box3().setFromObject(m), sz = b.getSize(V(0, 0, 0)), c = b.getCenter(V(0, 0, 0)), L = V(LT.x - LB.x, LT.y, 0).length();
        m.position.set(-c.x, -b.min.y, -c.z); var inner = new T.Group(); inner.add(m); inner.scale.set(0.46 / sz.x, L / sz.y, 0.26 / sz.z);
        var dir = V(LT.x - LB.x, LT.y, 0).normalize(), zA = V(0, 0, 1), nrm = new T.Vector3().crossVectors(zA, dir);
        var g = new T.Group(); g.add(inner); g.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(zA, dir, nrm));
        ocultaHijos(o.esc); o.esc.add(g);
      }); }
      if (s.valla > 0.01 && !o.valG) { o.valG = 1;
        usar('valla', function (src) { if (o !== O) return; o.val.forEach(function (pg) { ocultaHijos(pg); var w = envolver(src, 1.12, 'x'); pg.add(w); }); });
        usar('barricada', function (src) { if (o !== O) return;
          [[-3.0, 3.2, PI / 2], [4.9, 3.2, PI / 2]].forEach(function (p) { var w = envolver(src, 1.3, 'z'); w.position.set(p[0], 0, p[1]); w.rotation.y = p[2]; w.visible = false; G.add(w); o.extras.push(w); }); });
        usar('cinta_balizamiento', function (src) { if (o !== O) return;
          [[-3.0, 1.0], [1.0, 5.0]].forEach(function (p) {
            var w = envolver(src, 4.0, 'x'); w.rotation.x = PI / 2; w.position.set(p[0] + 2.0, 0.9, -1.4); w.rotation.z = 0; w.visible = false; G.add(w); o.extras.push(w);
          });
          [-3.0, 1.0, 5.0].forEach(function (x) { var pl = mk(cylU(0.03, 6), M('ropa2'), x, 0.5, -1.4, G); pl.scale.set(1, 1.0, 1); pl.visible = false; o.extras.push(pl); });
        }); }
      if (s.verif > 0.01 && !o.verG) { o.verG = 1;
        function item(name, tam, eje, x, z, ocultar, extra) { usar(name, function (src) { if (o !== O) return;
          var w = envolver(src, tam, eje); w.position.set(x, 0.03, z); O.lona.add(w); if (ocultar != null) o.items[ocultar].visible = false;
          if (extra) { var c = etq('✓', 'ok', 0.34, 0.17); c.position.set(x, 0.55, z); c.visible = false; O.lona.add(c); O.checks.push(c); } }); }
        item('bolsa_herramientas', 0.5, 'z', -0.7, 0, 0, false);
        item('guantes', 0.3, 'x', 0.75, -0.1, 4, false);
        item('casco_pantalla', 0.3, 'x', -0.45, 0.3, null, true);
        item('gafas', 0.2, 'x', 0.3, 0.3, null, true);
      }
      if (s.vial > 0.4 && !o.senG) { o.senG = 1; usar('senal_aviso', function (src) { if (o !== O) return;
        var w = envolver(src, 1.4, 'y'); w.position.set(-14.2, 0, 5.6); w.rotation.y = PI / 2; w.visible = false; G.add(w); o.senM = w; o.sign.userData.gl = o.signP.userData.gl = 1; }); }
      if (s.tr && s.tr.a === 'pinza' && !o.pinG) { o.pinG = 1; usar('pinza_amperimetrica', function (src) { if (o !== O) return;
        var w = envolver(src, 0.62, 'x'); w.rotation.x = -PI / 2; w.position.y = 0.0; var g = new T.Group(); g.add(w); g.position.set(0, -0.08, 0.05);
        ocultaHijos(o.pinza, 2); o.pinza.add(g); }); }
    }

    /* ---------- construcción ---------- */
    function construir() {
      if (G) { scene.remove(G); own.forEach(function (g) { g.dispose(); }); own = []; sprites = []; }
      G = new T.Group(); scene.add(G); O = { extras: [] };
      var i, k;
      /* suelo, calzada */
      mk(geo('suelo', function () { var g = new T.PlaneGeometry(120, 90); g.rotateX(-PI / 2); return g; }), M('suelo'), 0, 0, 5, G);
      mk(geo('calz', function () { var g = new T.PlaneGeometry(120, 6); g.rotateX(-PI / 2); return g; }), M('calzada'), 0, 0.015, 7.2, G);
      /* poste */
      var pole = mk(geo('poste', function () { return new T.CylinderGeometry(0.13, 0.22, POLE_H, 12); }), M('poste'), 0, POLE_H / 2, 0, G);
      O.alv = []; for (k = 0; k < 5; k++) { var a = mk(box(0.1, 0.34, 0.03), M('texto'), 0, 2.0 + k * 0.9, 0.2 - k * 0.012, G); a.material = M('ropa2'); O.alv.push(a); }
      O.alvM = mk(box(0.16, 0.42, 0.03), MB('marca'), 0, 0, 0.2, G); O.alvM.visible = false;
      /* aisladores + soportes */
      O.ais = []; for (i = 0; i < 4; i++) { var ag = aislador(i === IS && opt.sust ? 'viejo' : 'aislador', 1); ag.position.set(0, YF[i], 0.3); G.add(ag); O.ais.push(ag); }
      O.aisNuevo = aislador('nuevo', 1); O.aisNuevo.position.set(0, YF[IS], 0.3); G.add(O.aisNuevo);
      /* conductores del circuito 1 */
      var xp = [0, 0.25, 0.6, 1.1, 1.7, 2.4, 3.2, 4.2, 5.5, 7, 9, 12, 16, 20], xs = [], j;
      if (opt.fin) { xs.push(-0.35); for (j = 0; j < xp.length; j++) xs.push(xp[j]); }
      else { for (j = xp.length - 1; j > 0; j--) xs.push(-xp[j]); for (j = 0; j < xp.length; j++) xs.push(xp[j]); }
      O.xs = xs; O.cond = []; O.condPts = [];
      for (i = 0; i < 4; i++) {
        var tb = tubo(xs.length, 0.03, M(FA[i], { side: T.DoubleSide })); G.add(tb); O.cond.push(tb);
        O.condPts.push(xs.map(function () { return V(0, 0, 0); }));
      }
      O.condH = [null, null, null, null];
      O.halo = tubo(xs.length, 0.042, new T.MeshBasicMaterial({ color: pal('halo'), side: T.BackSide })); O.halo.material.userData.k = 'halo'; mats['Kh'] = O.halo.material; G.add(O.halo);
      /* postes lejanos */
      [-LTOT, LTOT].forEach(function (x) { if (opt.fin && x < 0) return; mk(cylU(0.13, 8), M('poste'), x, POLE_H / 2, 0, G).scale.set(1, POLE_H, 1); });
      /* circuito 2 (doble circuito, detrás del apoyo) */
      O.c2 = grp(G, 0, 0, 0); O.c2.visible = false; O.c2c = []; O.c2p = [];
      var xs2 = []; for (j = xp.length - 1; j > 0; j--) xs2.push(-xp[j]); for (j = 0; j < xp.length; j++) xs2.push(xp[j]);
      for (i = 0; i < 4; i++) {
        var t2 = tubo(xs2.length, 0.03, M(FA[i], { side: T.DoubleSide })); O.c2.add(t2);
        tuboSet(t2, xs2.map(function (x) { return V(x, yC(i, x, 0), -ZC); })); O.c2c.push(t2);
        var a2 = aislador('aislador', -1); a2.position.set(0, YF[i], -0.3); O.c2.add(a2);
        var pf = [mk(cylU(0.05, 8), Mt('aisl', 0.45), 0, 0, 0, O.c2), mk(cylU(0.05, 8), Mt('aisl', 0.45), 0, 0, 0, O.c2)];
        var cp = capuchon(0.5); cp.position.set(0, YF[i], -ZC); O.c2.add(cp);
        O.c2p.push({ pf: pf, cp: cp, i: i });
      }
      O.c2tela = mk(box(0.5, 1.9, 0.45), Mt('tela', 0.38), 0, 7.6, -0.02, O.c2);
      /* protecciones del circuito 1 */
      O.pr = []; var segsD = opt.acometida ? [[0.3, XJ - 0.3], [XJ - 0.3, XJ + 0.3, 'w'], [XJ + 0.3, 3.0]] : [[0.3, 3.0]];
      for (i = 0; i < 4; i++) {
        var pr = { pieces: [], cap: null, ded: null, der: null };
        var lista = opt.fin ? segsD : [[-0.3, -3.0]].concat(segsD);
        lista.forEach(function (s) { var m = mk(cylU(0.05, 8), Mt('aisl', 0.45), 0, 0, 0, G); m.visible = false; pr.pieces.push({ win: s[2] === 'w', m: m, a: V(s[0], yC(i, s[0], 0), ZC), b: V(s[1], yC(i, s[1], 0), ZC) }); });
        pr.cap = capuchon(0.5); pr.cap.position.set(0, YF[i], ZC); G.add(pr.cap); pr.cap.scale.set(0.001, 0.001, 0.001); pr.cap.visible = false;
        O.pr.push(pr);
      }
      O.tela = mk(box(0.5, 1.9, 0.45), Mt('tela', 0.38), 0, 7.6, -0.02, G); O.tela.visible = false;
      /* retención, polea, cuerda, rana y aparejo */
      O.ret = mk(box(0.1, 0.1, 0.07), M('metal'), 0, YF[IS], ZC, G);
      O.dedS = dedal(); O.dedS.position.set(0.3, YF[IS], ZC); G.add(O.dedS); O.dedS.visible = false;
      O.pul = grp(G, 0, 0, 0); O.pul.visible = false;
      polea(O.pul);
      O.rope = tubo(24, 0.02, M('texto', { side: T.DoubleSide })); O.rope.visible = false; G.add(O.rope);
      O.rana = grp(G, 0, 0, 0); O.rana.visible = false; mk(box(0.16, 0.12, 0.1), M('metal'), 0, 0, 0, O.rana); mk(box(0.06, 0.06, 0.2), M('texto'), 0, 0, 0.12, O.rana);
      O.apar = grp(G, 0, 0, 0); O.apar.visible = false; mk(box(0.09, 0.16, 0.07), M('ropa2'), 0, 0, 0, O.apar); mk(box(0.09, 0.16, 0.07), M('ropa2'), 0.2, 0, 0, O.apar);
      /* tela inferior de apoyo: marcador del aislador viejo retirado */
      /* etiquetas de fase */
      O.lab = FA.map(function (f, i) { var s = etq(f, f, 0.62, 0.31, 'auto'); s.position.set(-1.25, YF[i], 0.75); G.add(s); return s; });
      O.labAc = FA.map(function (f, i) { var s = etq(f, f, 0.5, 0.25, 'auto'); s.position.set(XJ + 0.35, YF[i] - 0.45, 0.8); s.visible = false; G.add(s); return s; });
      /* escalera */
      O.esc = grp(G, LB.x, 0, LB.z); O.esc.visible = false;
      var top = V(LT.x - LB.x, LT.y, 0), base = V(0, 0, 0), L = top.length();
      [-0.2, 0.2].forEach(function (dz) { var r = mk(cylU(0.035, 6), M('esc'), 0, 0, 0, O.esc); place(r, V(0, 0, dz), V(top.x, top.y, dz)); });
      var nr = Math.floor(L / 0.45); for (k = 1; k <= nr; k++) { var f = k / (nr + 1); mk(cylZ(0.022, 0.4, 6), M('esc'), top.x * f, top.y * f, 0, O.esc); }
      O.sujeta = mk(cylU(0.16, 12), M('marca'), LT.x, LT.y - 0.15, 0, G); O.sujeta.scale.set(1, 0.07, 1); O.sujeta.visible = false;
      /* trabajadores */
      O.w = persona('casco'); G.add(O.w.g); O.mItems = llevaMetal(O.w); O.w.g.rotation.y = -SIDE * PI / 2;
      O.ay = persona('casco2'); G.add(O.ay.g); O.mItems = O.mItems.concat(llevaMetal(O.ay));
      /* cota de 40 cm */
      O.cota = grp(G, XW, 0, 0.5); O.cota.visible = false;
      var yh = YFEET + HEAD, yt = yh + HCOT;
      mk(cylU(0.012, 6), MB('cota'), 0, (yh + yt) / 2, 0, O.cota).scale.set(1, HCOT, 1);
      mk(cylX(0.012, 0.22, 6), MB('cota'), 0, yh, 0, O.cota); mk(cylX(0.012, 0.22, 6), MB('cota'), 0, yt, 0, O.cota);
      O.cotaL = etq('≈ 40 cm', 'cota', 1.15, 0.5); O.cotaL.position.set(0.7 * SIDE, (yh + yt) / 2, 0); O.cota.add(O.cotaL);
      /* acometida, edificio y CGP */
      O.J = FA.map(function (f, i) { return V(XJ, yC(i, XJ, 0), ZC); });
      O.C = FA.map(function (f, i) { return V(CG.x - 0.12 + 0.08 * i, CG.y + 0.42, CG.z); });
      O.cab = []; O.cabPts = [];
      O.der = []; O.dedal = [];
      if (opt.acometida) {
        mk(box(7.5, 6.6, 6.0), M('edificio'), 7.9, 3.3, -1.0, G); mk(box(7.7, 0.25, 6.2), M('techo'), 7.9, 6.7, -1.0, G);
        [[6.4, 4.6], [9.3, 4.6], [9.3, 1.9]].forEach(function (w) { mk(box(1.0, 1.2, 0.04), MB('texto'), w[0], w[1], 2.02, G).material = M('ropa2'); });
        mk(box(0.9, 2.0, 0.04), M('ropa2'), 7.2, 1.0, 2.02, G);
        for (i = 0; i < 4; i++) {
          var cb = tubo(14, 0.016, M(FA[i], { side: T.DoubleSide })); G.add(cb); O.cab.push(cb); O.cabPts.push(Array.apply(null, Array(14)).map(function () { return V(0, 0, 0); }));
          var dd = dedal(); dd.position.set(O.J[i].x, O.J[i].y - 0.02, O.J[i].z); G.add(dd); dd.visible = false; O.dedal.push(dd);
          var cn = mk(box(0.075, 0.05, 0.06), MM('metal'), O.J[i].x, O.J[i].y, O.J[i].z, G); cn.visible = false; (O.conn = O.conn || []).push(cn);
          var dv = mk(cylU(0.045, 8), Mt('aisl', 0.45), 0, 0, 0, G); dv.visible = false; O.der.push(dv);
        }
        /* CGP */
        O.cgp = grp(G, CG.x, CG.y, CG.z);
        mk(box(0.6, 0.84, 0.03), M('ropa2'), 0, 0, -0.085, O.cgp);
        mk(box(0.03, 0.84, 0.2), M('cgp'), -0.285, 0, 0, O.cgp); mk(box(0.03, 0.84, 0.2), M('cgp'), 0.285, 0, 0, O.cgp);
        mk(box(0.6, 0.03, 0.2), M('cgp'), 0, 0.405, 0, O.cgp); mk(box(0.6, 0.03, 0.2), M('cgp'), 0, -0.405, 0, O.cgp);
        O.fus = grp(O.cgp, 0, 0, -0.03);
        [-0.15, 0, 0.15].forEach(function (x, q) { mk(cylU(0.035, 8), M(FA[q + 1]), x, 0.03, 0, O.fus).scale.set(1, 0.3, 1); mk(box(0.07, 0.04, 0.04), M('metal'), x, 0.2, 0, O.fus); });
        mk(box(0.4, 0.05, 0.05), M(FA[0]), 0, -0.2, 0, O.fus);
        O.plI = mk(geo('tri', function () { return new T.CircleGeometry(0.1, 3); }), MB('marca'), 0, 0.2, 0.115, O.cgp); O.plI.rotation.z = PI / 2; O.plI.visible = false;
        O.door = grp(O.cgp, -0.28, 0, 0.115); mk(box(0.56, 0.78, 0.03), M('cgp'), 0.28, 0, 0.01, O.door);
        O.plE = mk(geo('tri', function () { return new T.CircleGeometry(0.1, 3); }), MB('marca'), 0.28, 0.12, 0.04, O.door); O.plE.rotation.z = PI / 2; O.plE.visible = false;
        O.seal = mk(sph(0.03, 8, 6), MB('cota'), 0.52, -0.05, 0.05, O.door); O.seal.visible = false;
        O.cgpL = etq('CGP', 'ropa2', 0.4, 0.2); O.cgpL.position.set(CG.x, CG.y - 0.72, CG.z + 0.25); G.add(O.cgpL);
      }
      /* sustitución: viejo / nuevo */
      O.aisNuevo.visible = false;
      /* vial */
      O.van = grp(G, -24, 0, 7.2);
      mk(box(3.4, 1.7, 1.8), M('furgo'), 0, 1.15, 0, O.van); mk(box(1.2, 1.2, 1.78), M('furgo'), 2.2, 0.95, 0, O.van);
      mk(box(0.5, 0.5, 1.8), MB('texto'), 2.55, 1.3, 0, O.van).material = M('ropa2');
      [[-1.1, 0.95], [1.1, 0.95], [-1.1, -0.95], [1.1, -0.95], [2.4, 0.95], [2.4, -0.95]].forEach(function (w, q) { if (q < 4 || true) mk(cylZ(0.36, 0.2, 10), M('texto'), w[0] + (q > 3 ? 0 : 0), 0.36, w[1], O.van); });
      O.van.children.slice(-6).forEach(function (m) { m.material = M('ropa2'); });
      mk(box(0.5, 0.18, 0.3), M('cono'), 0.4, 2.1, 0, O.van); mk(box(3.4, 0.12, 1.84), M('cono'), 0, 0.55, 0, O.van);
      O.van.visible = false;
      O.cones = []; for (i = 0; i < 4; i++) { var cn = mk(geo('cono', function () { return new T.ConeGeometry(0.17, 0.6, 8); }), M('cono'), -10.5 - i * 1.7, 0.3, 5.2 + i * 0.35, G); cn.visible = false; O.cones.push(cn); }
      O.sign = mk(geo('tri2', function () { return new T.CircleGeometry(0.6, 3); }), MB('marca'), -14.2, 1.4, 5.6, G); O.sign.rotation.z = PI / 2; O.sign.visible = false;
      O.signP = mk(cylU(0.03, 6), M('texto'), -14.2, 0.7, 5.6, G); O.signP.scale.set(1, 1.4, 1); O.signP.visible = false;
      /* valla */
      O.val = [];
      for (i = 0; i < 7; i++) O.val.push([-2.4 + i * 1.2, 3.2, 0]);
      for (i = 0; i < 4; i++) O.val.push([-3.0, 2.6 - i * 1.2, PI / 2]);
      O.val = O.val.map(function (p) {
        var g = grp(G, p[0], 0, p[1]); g.rotation.y = p[2];
        mk(box(1.1, 0.7, 0.05), M('valla'), 0, 0.65, 0, g); mk(box(1.1, 0.16, 0.06), M('furgo'), 0, 0.65, 0, g);
        mk(box(0.05, 0.3, 0.45), M('valla'), -0.5, 0.15, 0, g); mk(box(0.05, 0.3, 0.45), M('valla'), 0.5, 0.15, 0, g); g.visible = false; return g;
      });
      /* lona y equipos a verificar */
      O.lona = grp(G, -1.6, 0, 1.7); O.lona.visible = false;
      mk(box(1.9, 0.02, 1.0), M('lona'), 0, 0.02, 0, O.lona);
      O.items = [
        mk(box(0.34, 0.14, 0.2), M('aislador'), -0.7, 0.1, 0, O.lona),
        mk(cylX(0.07, 0.5, 8), Mt('tela', 0.8), -0.2, 0.1, 0.2, O.lona),
        mk(cylX(0.045, 0.7, 8), Mt('aisl', 0.8), 0.0, 0.07, -0.15, O.lona),
        mk(sph(0.11, 8, 6), Mt('aisl', 0.8), 0.45, 0.1, 0.05, O.lona),
        mk(box(0.14, 0.05, 0.2), M('guante'), 0.75, 0.06, -0.1, O.lona)];
      O.checks = O.items.map(function (m) { var s = etq('✓', 'ok', 0.34, 0.17); s.position.set(m.position.x, 0.55, m.position.z); s.visible = false; O.lona.add(s); return s; });
      /* objetos metálicos que se retiran */
      O.bandeja = grp(G, -0.9, 0, 2.4); O.bandeja.visible = false;
      mk(box(0.66, 0.04, 0.46), M('ropa2'), 0, 0.03, 0, O.bandeja);
      [[0.33, 0, 0.02, 0.46], [-0.33, 0, 0.02, 0.46], [0, 0.23, 0.66, 0.02], [0, -0.23, 0.66, 0.02]].forEach(function (b) { mk(box(b[2], 0.06, b[3]), M('ropa2'), b[0], 0.06, b[1], O.bandeja); });
      O.bolsa = mk(sph(0.28, 8, 6), M('techo'), 0, 0, 0, G); O.bolsa.visible = false;
      /* efectos transitorios */
      O.sol = mk(sph(1.3, 12, 8), MB('sol'), -15, 15, -12, G); O.sol.visible = false;
      O.nube = grp(G, 0, 0, 0); O.nube.visible = false;
      [[0, 0, 0, 1.6], [1.6, -0.2, 0.3, 1.2], [-1.5, -0.3, 0, 1.2]].forEach(function (c) { mk(sph(c[3], 10, 8), M('nube'), c[0], c[1], c[2], O.nube); });
      O.okSol = etq('✓', 'ok', 1.6, 0.8); O.okSol.position.set(-15, 11, -11); O.okSol.visible = false; G.add(O.okSol);
      O.ring = mk(geo('ring', function () { var g = new T.RingGeometry(0.75, 0.9, 32); g.rotateX(-PI / 2); return g; }), MB('marca'), 0, 0.05, 0, G); O.ring.visible = false;
      O.flecha = mk(geo('fl', function () { var g = new T.ConeGeometry(0.28, 0.7, 4); g.rotateX(PI); return g; }), MB('marca'), 0, 9.9, 0, G); O.flecha.visible = false;
      O.cepillo = grp(G, 0, 0, 0); O.cepillo.visible = false; mk(box(0.3, 0.06, 0.12), MB('cota'), 0, 0, 0, O.cepillo); mk(cylX(0.02, 0.3, 6), M('metal'), 0.3, 0.05, 0, O.cepillo);
      O.pinza = grp(G, 0, 0, 0); O.pinza.visible = false;
      mk(geo('torus', function () { return new T.TorusGeometry(0.075, 0.018, 6, 12, PI * 1.5); }), M('texto'), 0, 0, 0, O.pinza);
      mk(box(0.11, 0.2, 0.06), M('aisl'), 0, -0.2, 0, O.pinza); O.pinzaD = mk(box(0.07, 0.05, 0.02), MB('ok'), 0, -0.17, 0.04, O.pinza);
      O.pinzaK = etq('✓', 'ok', 0.4, 0.2); O.pinzaK.position.set(0, 0.28, 0.1); O.pinza.add(O.pinzaK);
      O.compr = grp(G, 0, 0, 0); O.compr.visible = false; mk(box(0.3, 0.2, 0.08), M('ropa2'), 0, 0, 0, O.compr);
      O.comprL = [0, 1, 2].map(function (q) { return mk(sph(0.03, 6, 5), MB(FA[q + 1]), -0.08 + q * 0.08, 0, 0.05, O.compr); });
      /* luces y niebla */
      O.hemi = new T.HemisphereLight(0xffffff, 0x8899aa, 0.62); G.add(O.hemi);
      O.sun = new T.DirectionalLight(0xffffff, 0.55); O.sun.position.set(-8, 14, 12); G.add(O.sun);
      aplicaTema();
    }
    function aplicaTema() {
      Object.keys(mats).forEach(function (k) { mats[k].color.set(pal(mats[k].userData.k)); });
      sprites.forEach(dibujaEtq);
      var f = pal('fondo'); scene.background = new T.Color(f); scene.fog = new T.Fog(new T.Color(f), 55, 130);
      var d = document.documentElement.getAttribute('data-theme') === 'dark';
      if (O && O.hemi) { O.hemi.intensity = d ? 0.75 : 0.62; O.sun.intensity = d ? 0.45 : 0.55; O.hemi.groundColor.set(d ? 0x202a30 : 0x8899aa); }
    }

    /* ---------- estado por defecto ---------- */
    function defaults() {
      var d = opt.desconexion ? 1 : 0;
      return { tr: null, vial: 0, valla: 0, verif: 0, guardar: 0, metal: 0, epi: 0, bolsa: 0,
        ay: { x: AY0, z: 1.3, ry: PI, w: 0, tira: 0 }, cl: 0, sujeta: 0, climb: 0, arm: 0, cota: 0,
        p: [0, 0, 0, 0], open: [0, 0, 0, 0], tela: 0, cgp: { door: 0, fus: 1, seal: 0, plE: 0, plI: 0 },
        s: [d, d, d, d], ded: [d, d, d, d], labAc: 0, labP: opt.acometida ? 0 : 1, dobl: 0, doblP: 0,
        h: 0, ret: 1, pul: 0, rope: 0, ten: 0, rana: 0, pull: 0, sust: 0, bolsaT: 0 };
    }

    /* ---------- volcado del estado ---------- */
    var cache = {};
    function chg(key, val) { if (cache[key] === val) return false; cache[key] = val; return true; }
    function draw() {
      var i, k, e, s = st;
      /* conductores: solo se reconstruye el que cambia */
      for (i = 0; i < 4; i++) {
        var hh = (i === IS) ? s.h : 0;
        if (chg('c' + i, hh)) { var P = O.condPts[i]; for (k = 0; k < O.xs.length; k++) P[k].set(O.xs[k], yC(i, O.xs[k], hh), ZC); tuboSet(O.cond[i], P); if (i === 2) tuboSet(O.halo, P); }
      }
      O.dedS.visible = !opt.acometida && s.p[3] > 0.9 && s.p[IS] < 0.5; O.dedS.position.set(0.3, yC(IS, 0.3, s.h) - 0.02, ZC);
      O.ret.visible = s.ret > 0.5; O.ret.position.set(0, YF[IS], ZC);
      /* aislador viejo/nuevo */
      var ov = O.ais[IS], a0 = ss(seg(s.sust, 0, 0.5)), a1 = ss(seg(s.sust, 0.5, 1));
      ov.visible = a0 < 0.99; ov.position.set(0.5 * a0, YF[IS] - 0.7 * a0, 0.3 + 0.9 * a0); ov.scale.setScalar(Math.max(0.001, 1 - a0 * 0.6));
      O.aisNuevo.visible = a1 > 0.01; O.aisNuevo.scale.setScalar(Math.max(0.001, a1));
      /* protecciones */
      for (i = 0; i < 4; i++) {
        var p = s.p[i], pr = O.pr[i];
        pr.cap.visible = p > 0.01; pr.cap.scale.setScalar(Math.max(0.001, ss(seg(p, 0, 0.4))));
        var g = ss(seg(p, 0.25, 1));
        pr.pieces.forEach(function (q) { if (g < 0.01 || (q.win && s.open[i] > 0.5)) q.m.visible = false; else { _d.copy(q.b).sub(q.a).multiplyScalar(g).add(q.a); place(q.m, q.a, _d.clone()); } });
        if (O.der[i]) {
          var C = O.C[i], J = O.J[i], dv = O.der[i];
          if (g < 0.01 || s.open[i] > 0.5) dv.visible = false; else place(dv, J, V(lerp(J.x, C.x, 0.22 * g), lerp(J.y, C.y, 0.22 * g), lerp(J.z, C.z, 0.22 * g)));
        }
      }
      O.tela.visible = s.tela > 0.01; O.tela.scale.setScalar(Math.max(0.001, ss(s.tela)));
      /* circuito 2 */
      O.c2.visible = s.dobl > 0.01;
      O.c2p.forEach(function (q) {
        var gp = ss(seg(s.doblP, 0.15 + q.i * 0.0, 1)); q.cp.visible = s.doblP > 0.01; q.cp.scale.setScalar(Math.max(0.001, ss(seg(s.doblP, 0, 0.4))));
        var iA = q.i, a = V(-0.3, yC(iA, -0.3, 0), -ZC), b = V(-3, yC(iA, -3, 0), -ZC), a2 = V(0.3, yC(iA, 0.3, 0), -ZC), b2 = V(3, yC(iA, 3, 0), -ZC);
        if (gp < 0.01) { q.pf[0].visible = q.pf[1].visible = false; }
        else { place(q.pf[0], a, V(lerp(a.x, b.x, gp), lerp(a.y, b.y, gp), -ZC)); place(q.pf[1], a2, V(lerp(a2.x, b2.x, gp), lerp(a2.y, b2.y, gp), -ZC)); }
      });
      O.c2tela.visible = s.doblP > 0.01; O.c2tela.scale.setScalar(Math.max(0.001, ss(seg(s.doblP, 0, 0.3))));
      /* acometida */
      if (opt.acometida) {
        for (i = 0; i < 4; i++) {
          var sv = s.s[i];
          if (chg('a' + i, sv)) {
            var J2 = O.J[i], C2 = O.C[i], f0 = 0.15 * (1 - sv);
            var E = V(lerp(J2.x, C2.x, f0) + 0.25 * (1 - sv), lerp(J2.y, C2.y, f0) - 0.75 * (1 - sv), lerp(J2.z, C2.z, f0) + 0.15 * (1 - sv)), pp = O.cabPts[i];
            for (k = 0; k < pp.length; k++) { var u = k / (pp.length - 1); pp[k].set(lerp(E.x, C2.x, u), lerp(E.y, C2.y, u) - 0.3 * 4 * u * (1 - u), lerp(E.z, C2.z, u)); }
            tuboSet(O.cab[i], pp);
          }
          if (O.conn) O.conn[i].visible = s.s[i] > 0.5; O.dedal[i].visible = s.ded[i] > 0.01; O.dedal[i].scale.setScalar(Math.max(0.001, ss(s.ded[i])));
          O.labAc[i].visible = s.labAc > 0.01; O.labAc[i].scale.set(0.5 * ss(s.labAc), 0.25 * ss(s.labAc), 1);
        }
        var c = s.cgp; O.door.rotation.y = -c.door * 1.9;
        O.fus.visible = c.fus > 0.02; O.fus.position.set(0, 0.3 * (1 - c.fus), -0.03 + 0.6 * (1 - c.fus)); O.fus.scale.setScalar(Math.max(0.001, c.fus));
        O.seal.visible = c.seal > 0.5; O.plE.visible = c.plE > 0.01; O.plE.scale.setScalar(Math.max(0.001, ss(c.plE))); O.plI.visible = c.plI > 0.5;
      }
      /* polea, cuerda, rana, aparejo */
      var Pp = opt.fin ? V(0.2, 7.22, 0.62) : V(0, 8.5, 0.62);
      O.pul.visible = s.pul > 0.01; O.pul.position.copy(Pp); O.pul.scale.setScalar(Math.max(0.001, ss(s.pul)));
      var xr = 1.1 - 0.45 * s.pull, ylift = yC(IS, xr, s.h);
      var A = opt.fin ? V(xr, ylift, 0.5) : V(0.35, yC(IS, 0.35, s.h), 0.5);
      var Hh = V(0.55, 1.06, 1.3);
      O.rana.visible = opt.fin && s.rana > 0.01; O.rana.position.set(xr, ylift, ZC); O.rana.scale.setScalar(Math.max(0.001, ss(s.rana)));
      O.apar.visible = opt.fin && s.rana > 0.01; O.apar.position.set((A.x + Pp.x) / 2 - 0.1, (A.y + Pp.y) / 2 - 0.02, 0.58); O.apar.scale.setScalar(Math.max(0.001, ss(s.rana)));
      O.rope.visible = s.rope > 0.5;
      if (O.rope.visible) {
        var key = [A.x.toFixed(3), A.y.toFixed(3), s.ten.toFixed(3)].join(); if (chg('rope', key)) {
          var pts = [], q2;
          for (q2 = 0; q2 < 6; q2++) pts.push(V(lerp(A.x, Pp.x, q2 / 5), lerp(A.y, Pp.y, q2 / 5), lerp(A.z, Pp.z, q2 / 5)));
          for (q2 = 1; q2 <= 17; q2++) { var u2 = q2 / 17, sg = (1 - s.ten) * 0.55 * Math.sin(u2 * PI); pts.push(V(lerp(Pp.x, Hh.x, u2) + sg * 0.5, lerp(Pp.y, Hh.y, u2) - sg * 0.2 * (1 - u2), lerp(Pp.z, Hh.z, u2) + sg)); }
          tuboSet(O.rope, pts);
        }
      }
      /* trabajador */
      var w = O.w, y, x, z, ww = 0, climbing = false;
      if (s.climb < 0.15) { var q3 = ss(s.climb / 0.15); x = lerp(2.9 * SIDE, LB.x - 0.05 * SIDE, q3); z = lerp(0.9, 0.22, q3); y = 0; ww = q3 > 0 && q3 < 1 ? s.climb * 60 : 0; }
      else { y = YFEET * seg(s.climb, 0.15, 1); x = ladX(y) - 0.05 * SIDE; z = 0.22; ww = s.climb >= 0.999 ? 0 : y * 7; climbing = true; }
      w.g.position.set(x, y, z);
      var epi = ss(s.epi), armW = Math.max(-2.7 * s.arm, climbing && s.arm < 0.01 ? -0.9 : 0);
      w.pose({ visor: lerp(-1.6, 0, epi), guantes: epi > 0.4, cinto: epi > 0.7, w: ww, armL: armW, armR: armW });
      var ay = O.ay, ax = s.ay;
      ay.g.position.set(ax.x, 0, ax.z); ay.g.rotation.y = ax.ry;
      ay.pose({ visor: lerp(-1.6, 0, epi), guantes: epi > 0.4, cinto: false, w: ax.w, armL: -0.95 * s.ten - 0.9 * ax.tira, armR: -0.95 * s.ten - 0.9 * ax.tira });
      /* escalera y cota */
      O.esc.visible = s.cl > 0.01; O.esc.scale.setScalar(Math.max(0.001, ss(s.cl))); O.sujeta.visible = s.sujeta > 0.5 && s.cl > 0.5;
      var sc0 = Math.max(0.001, ss(s.cota)); O.cota.visible = s.cota > 0.01; O.cota.scale.set(1, sc0, 1); O.cota.position.y = (YFEET + HEAD) * (1 - sc0);
      O.cotaL.visible = s.cota > 0.95;
      /* vial */
      var vv = s.vial, vVan = ss(seg(vv, 0, 0.55)), vCon = seg(vv, 0.45, 1);
      O.van.visible = vVan > 0.001; O.van.position.x = lerp(-24, -6.5, vVan);
      for (i = 0; i < 4; i++) { var cs = ss(seg(vCon, i * 0.2, i * 0.2 + 0.4)); O.cones[i].visible = cs > 0.01; O.cones[i].scale.setScalar(Math.max(0.001, cs)); }
      O.sign.visible = O.signP.visible = vCon > 0.85;
      /* valla */
      for (i = 0; i < O.val.length; i++) { var vs = ss(seg(s.valla, i / O.val.length * 0.7, i / O.val.length * 0.7 + 0.3)); O.val[i].visible = vs > 0.01; O.val[i].scale.setScalar(Math.max(0.001, vs)); }
      /* lona y equipos */
      var vi = ss(seg(s.verif, 0, 0.35)) * (1 - ss(s.guardar));
      O.lona.visible = vi > 0.01; O.lona.scale.setScalar(Math.max(0.001, vi));
      O.checks.forEach(function (c, q) { c.visible = s.verif > 0.4 + q * 0.08 && s.guardar < 0.5; });
      drawMetal();
      /* bolsa de desecho */
      var bb = s.bolsaT; O.bolsa.visible = bb > 0.02 && bb < 0.98;
      var b1 = ss(seg(bb, 0, 0.35)), b2 = ss(seg(bb, 0.45, 1));
      O.bolsa.position.set(lerp(-1.9, -6.5, b2), lerp(0.28, 1.2, b2), lerp(1.8, 7.2, b2)); O.bolsa.scale.setScalar(Math.max(0.001, b1 * (1 - 0.7 * b2)));
      O.lab.forEach(function (l) { l.visible = s.labP > 0.5; });
      lazy();
      var ex = ss(seg(s.valla, 0.7, 1)); O.extras.forEach(function (w) { w.visible = ex > 0.01; });
      if (O.senM) { O.senM.visible = vCon > 0.85; O.sign.visible = O.signP.visible = false; }
      /* transitorios */
      drawTr();
      pedir();
    }
    function drawMetal() {
      var m = st.metal; O.bandeja.visible = m > 0.03; G.updateMatrixWorld(true);
      O.mItems.forEach(function (r, k) {
        var e = ss(seg(m, k * 0.028, k * 0.028 + 0.55)), o = r.o, sl = V(-0.24 + (k % 6) * 0.095, 0.075, -0.1 + Math.floor(k / 6) * 0.1);
        if (e <= 0.0005) { if (o.parent !== r.home) r.home.add(o); o.position.copy(r.lp); o.rotation.set(r.lr.x, r.lr.y, r.lr.z); }
        else if (e >= 0.999) { if (o.parent !== O.bandeja) O.bandeja.add(o); o.position.copy(sl); o.rotation.set(0, k * 0.8, 0); }
        else {
          if (o.parent !== G) G.add(o);
          var a = r.home.localToWorld(r.lp.clone()), b = O.bandeja.localToWorld(sl.clone());
          o.position.set(lerp(a.x, b.x, e), lerp(a.y, b.y, e) + 0.5 * Math.sin(e * PI), lerp(a.z, b.z, e)); o.rotation.set(e * 6, e * 4 + k, 0);
        }
      });
    }
    function drawTr() {
      var tr = st.tr, a = tr && tr.a, t = tr ? tr.t : 0, p = tr ? tr.p : {}, i;
      O.sol.visible = O.nube.visible = O.okSol.visible = false; O.ring.visible = O.flecha.visible = false; O.alvM.visible = false;
      O.cepillo.visible = O.pinza.visible = O.compr.visible = false;
      O.lab.forEach(function (l) { l.scale.set(0.62, 0.31, 1); });
      if (!a) return;
      if (a === 'clima') {
        O.sol.visible = true; O.nube.visible = true; O.nube.position.set(lerp(-15, -36, ss(seg(t, 0.15, 1))), 15, -12); O.okSol.visible = t > 0.8;
      } else if (a === 'identificar') {
        O.ring.visible = true; O.ring.position.y = 0.05; var r = 1 + 0.35 * Math.sin(t * PI * 4); O.ring.scale.set(r, 1, r);
        O.flecha.visible = true; O.flecha.position.y = 9.9 + 0.3 * Math.sin(t * PI * 6);
      } else if (a === 'inspeccion') {
        O.ring.visible = true; O.ring.scale.set(0.55, 1, 0.55); O.ring.position.y = 0.05 + (POLE_H + 0.3) * ss(t);
      } else if (a === 'alveolos') {
        for (i = 0; i < O.alv.length; i++) { O.alvM.visible = true; }
        var q = Math.floor(t * 4.99); O.alvM.position.set(0, 2.0 + q * 0.9, 0.2 - q * 0.012);
      } else if (a === 'cepillo') {
        var n = 4, k = Math.min(n - 1, Math.floor(t * n)), w = (t * n) % 1, J = O.J[k];
        O.cepillo.visible = true; O.cepillo.position.set(J.x + 0.15 * Math.sin(w * PI * 6), J.y + 0.07, J.z + 0.06);
      } else if (a === 'pinza') {
        var n2 = p.fases || 4, k2 = Math.min(n2 - 1, Math.floor(t * n2)), w2 = (t * n2) % 1, J3 = O.J[p.solo != null ? p.solo : k2];
        O.pinza.visible = true; O.pinza.position.set(J3.x + (p.dx || 0), J3.y + 0.0, J3.z + 0.05); O.pinza.scale.setScalar(1.6 * ss(seg(w2, 0, 0.2)) * (1 - ss(seg(w2, 0.9, 1))) + 0.0001);
        O.pinzaK.visible = w2 > 0.5;
      } else if (a === 'comprobador') {
        O.compr.visible = true; var k4 = Math.min(2, Math.floor(t * 3)); O.compr.position.set(CG.x, CG.y + 0.8, CG.z + 0.3);
        O.comprL.forEach(function (l, q) { l.scale.setScalar(q <= k4 ? 1.8 : 0.8); });
      } else if (a === 'resaltaN') {
        var s2 = 1 + 0.5 * Math.abs(Math.sin(t * PI * 3)); O.lab[0].scale.set(0.62 * s2, 0.31 * s2, 1);
        O.ring.visible = false;
      }
    }

    /* ---------- acciones ---------- */
    var U = function (t, p) { return p && p.inv ? 1 - t : t; };
    /* ventana de trabajo: solo la fase que se trata (k de n, de N a T) abre un hueco en su protección; las demás siguen cubiertas */
    function ventanas(t, n) { for (var k = 0; k < 4; k++) { var w = k < n ? seg(t, k / n, (k + 1) / n) : 0; st.open[k] = (w > 0 && w < 1) ? ss(seg(w, 0, 0.12)) * (1 - ss(seg(w, 0.88, 1))) : 0; } }
    var A = {
      identificar: function (t, p, act) { if (act) st.tr = { a: 'identificar', t: t }; },
      clima: function (t, p, act) { if (act) st.tr = { a: 'clima', t: t }; },
      inspeccion: function (t, p, act) { if (act) st.tr = { a: 'inspeccion', t: t }; },
      alveolos: function (t, p, act) { if (act) st.tr = { a: 'alveolos', t: t }; },
      cepillo: function (t, p, act) { if (act) st.tr = { a: 'cepillo', t: t }; st.arm = 0.7; ventanas(t, 4); },
      pinza: function (t, p, act) { if (act) st.tr = { a: 'pinza', t: t, p: p }; if (!p.sinBrazos) st.arm = 0.7; ventanas(t, p.fases || 4); },
      comprobador: function (t, p, act) { if (act) st.tr = { a: 'comprobador', t: t }; },
      resaltaN: function (t, p, act) { if (act) st.tr = { a: 'resaltaN', t: t }; },
      vial: function (t, p) { st.vial = ss(U(t, p)); },
      valla: function (t, p) { st.valla = U(t, p); },
      verificar: function (t) { st.verif = t; },
      metal: function (t) { st.metal = t; },
      epi: function (t) { st.epi = t; },
      desecho: function (t) { st.bolsaT = t; },
      guardar: function (t) { st.arm = 0; st.guardar = t; st.cl = 1 - ss(t); st.sujeta = t < 0.2 ? 1 : 0; },
      ayVa: function (t, p) {
        var q = ss(t), dx = p.b[0] - p.a[0], dz = p.b[1] - p.a[1];
        st.ay.x = lerp(p.a[0], p.b[0], q); st.ay.z = lerp(p.a[1], p.b[1], q);
        st.ay.ry = (t >= 1 && p.ry != null) ? p.ry : Math.atan2(dx, dz); st.ay.w = t < 1 ? t * 14 : 0;
      },
      polea: function (t, p) {
        st.pul = ss(seg(t, 0, 0.5)); if (p.cuerda) st.rope = t > 0.4 ? 1 : 0;
        if (p.ayuda) A.ayVa(t, { a: [AY0, 1.3], b: [0.55, 1.5], ry: PI });
        st.arm = 0.0;
      },
      tensar: function (t) { st.ten = ss(t); },
      elevar: function (t) { st.ret = t < 0.2 ? 1 : 0; st.h = HAPOYO * ss(seg(t, 0.2, 1)); st.arm = 0.6; },
      cambiaAislador: function (t) { st.sust = t; st.arm = 0.6; },
      retencionar: function (t, p) { var h0 = p.fin ? HFIN : HAPOYO; st.h = h0 * (1 - ss(seg(t, 0, 0.7))); st.ret = t > 0.7 ? 1 : 0; st.arm = 0.6; if (!p.fin) st.sust = 1; },
      quitaEquipo: function (t, p) { st.rope = t < 0.6 ? 1 : 0; st.ten = 1 - ss(seg(t, 0, 0.6)); st.pul = 1 - ss(seg(t, 0.5, 1)); st.rana = 1 - ss(seg(t, 0.2, 0.7)); st.pull = st.rana > 0.01 ? 1 : 0; if (t >= 1) { st.pull = 0; } },
      destensar: function (t) {
        st.rope = t > 0.1 ? 1 : 0; st.rana = ss(seg(t, 0, 0.2));
        A.ayVa(seg(t, 0, 0.3), { a: [AY0, 1.3], b: [0.55, 1.5], ry: PI });
        st.ten = ss(seg(t, 0.3, 0.6)); st.pull = ss(seg(t, 0.4, 0.8)); st.ret = t < 0.35 ? 1 : 0;
        st.h = HFIN * ss(seg(t, 0.7, 1)); st.arm = 0.5;
      },
      cgpAbre: function (t) { st.cgp.door = ss(seg(t, 0.55, 1)); A.ayVa(seg(t, 0, 0.6), { a: [AY0, 1.3], b: [CG.x, 2.85], ry: PI }); },
      cgpFus: function (t, p) { st.cgp.fus = p.inv ? ss(seg(t, 0.3, 1)) : 1 - ss(t); if (p.inv) { st.cgp.door = ss(seg(t, 0, 0.3)); st.cgp.seal = 0; } st.ay.tira = 0.5 * Math.sin(t * PI); },
      cgpCierra: function (t) { st.cgp.door = 1 - ss(seg(t, 0, 0.5)); st.cgp.seal = t > 0.6 ? 1 : 0; },
      senalCgp: function (t) {
        st.cgp.door = ss(seg(t, 0, 0.2)) * 0.65 * (1 - ss(seg(t, 0.5, 0.7)));
        st.cgp.plI = t > 0.2 ? 1 : 0; st.cgp.plE = ss(seg(t, 0.7, 1));
      },
      quitaSenal: function (t) { st.cgp.plE = 1 - ss(t); st.cgp.plI = 0; },
      asciende: function (t) { st.cl = ss(seg(t, 0, 0.12)); st.climb = seg(t, 0.12, 1); st.sujeta = t > 0.9 ? 1 : 0; st.cota = ss(seg(t, 0.9, 1)); },
      descenso: function (t) { st.arm = 0; st.cl = 1; st.sujeta = 1; st.climb = 1 - ss(t); st.cota = 0; },
      aislar: function (t, p) {
        var ord = [3, 2, 1, 0], skip = p.skip || [];
        st.cl = 1; st.climb = 1; st.sujeta = 1; st.cota = 1 - ss(seg(t, 0, 0.08)); st.arm = 0.8 * ss(seg(t, 0, 0.1));
        ord.forEach(function (i, k) { if (skip.indexOf(FA[i]) < 0) st.p[i] = ss(seg(t, k * 0.2, k * 0.2 + 0.3)); });
        st.tela = ss(seg(t, 0.85, 1));
        if (p.deriv !== false) { /* las derivaciones cuelgan de p[i] */ }
      },
      proteger: function (t, p) { (p.fases || []).forEach(function (f) { st.p[FA.indexOf(f)] = ss(t); }); st.arm = 0.6; },
      quitarProt: function (t) {
        st.arm = 0.8; for (var k = 0; k < 4; k++) st.p[k] = 1 - ss(seg(t, 0.2 + k * 0.17, 0.2 + k * 0.17 + 0.29)); st.tela = 1 - ss(seg(t, 0, 0.22));
      },
      etiquetas: function (t, p, act) { st.labAc = ss(t); st.labP = 1; if (act) st.tr = { a: 'resaltaN', t: t }; },
      conecta: function (t, p) {
        var fs = p.fases, n = fs.length; st.arm = 0.8;
        fs.forEach(function (f, k) {
          var i = FA.indexOf(f), w = seg(t, k / n, (k + 1) / n);
          st.open[i] = ss(seg(w, 0, 0.12)) * (1 - ss(seg(w, 0.88, 1)));
          if (p.inv) { st.ded[i] = 1 - ss(seg(w, 0, 0.35)); st.s[i] = 1 - ss(seg(w, 0.3, 1)); }
          else { st.s[i] = ss(seg(w, 0, 0.65)); st.ded[i] = ss(seg(w, 0.65, 1)); }
        });
      },
      doble: function (t) { st.dobl = ss(seg(t, 0, 0.3)); st.doblP = ss(seg(t, 0.3, 1)); st.arm = 0; }
    };

    function norm(anim) { return anim == null ? [] : Array.isArray(anim) ? anim.map(n1) : [n1(anim)]; }
    function n1(a) { return typeof a === 'string' ? { a: a } : a; }

    /* ---------- cámaras ---------- */
    var camaras = {
      general: { p: [6, 5.8, 17], t: [1.5, 3.9, 1.5] },
      cielo: { p: [2, 6, 18], t: [-6, 9, -4] },
      vial: { p: [-2, 3.5, 17], t: [-9, 0.8, 5.5] },
      poste: { p: [4, 5.2, 12], t: [0.6, 4.2, 0.6] },
      suelo: { p: [-3, 2.8, 8.5], t: [0, 1.8, 1.5] },
      cgp: { p: [7.9, 4.5, 6.6], t: [5.3, 3.1, 2.1] },
      ascenso: { p: [5.8, 5.6, 11.5], t: [0.9, 4.5, 0.4] },
      cabeza: { p: [3.4, 7.8, 6.8], t: [0.7, 6.9, 0.4] },
      cabeza2: { p: [3.2, 7.2, 6.6], t: [0.6, 6.7, 0.5] },
      atras: { p: [-3.2, 7.6, -6.2], t: [0, 7.4, -0.2] },
      suelo2: { p: [4.5, 5.6, 9.8], t: [1.0, 1.1, 1.3] },
      sust: { p: [2.2, 7.9, 3.6], t: [0.3, 7.35, 0.4] },
      objetos: { p: [1.5, 4.8, 6.6], t: [0.0, 1.0, 1.2] },
      dObjetos: { p: [-1.2, 1.5, 1.6], t: [-2.9, 1.3, 0.9], fov: 30 },
      dBandeja: { p: [-0.2, 1.3, 3.0], t: [-0.9, 0.08, 2.4], fov: 30 },
      dObjetosAy: { p: [-1.3, 1.45, -0.3], t: [-1.3, 1.3, 1.3], fov: 32 },
      dCapuchon: { p: [0.5, 8.0, 1.2], t: [0, 7.75, 0.44], fov: 26 },
      dPerfil: { p: [2.3, 7.95, 1.4], t: [1.8, 7.75, 0.42], fov: 30 },
      dTela: { p: [1.5, 8.2, 1.8], t: [0, 7.6, 0.05], fov: 38 },
      dDedal: { p: [1.4, 8.05, 1.2], t: [0.8, 8.1, 0.42], fov: 26 },
      dDedalS: { p: [0.9, 7.5, 1.1], t: [0.15, 7.4, 0.42], fov: 28 },
      dDedal2: { p: [1.4, 7.7, 1.2], t: [0.8, 7.75, 0.42], fov: 26 },
      dPolea: { p: [0.9, 8.8, 1.5], t: [0, 8.5, 0.62], fov: 28 },
      dPoleaFin: { p: [1.0, 7.5, 1.5], t: [0.2, 7.22, 0.62], fov: 28 },
      dAislador: { p: [0.8, 7.65, 1.1], t: [0, 7.4, 0.3], fov: 28 },
      dSujecion: { p: [1.0, 6.9, 1.5], t: [0.18, 6.8, 0.2], fov: 36 },
      lona: { p: [0.5, 5.6, 8.2], t: [-1.4, 0.4, 1.7] }
    };

    var api = {
      camaras: camaras,
      configurar: function (o) { opt = Object.assign({ fin: false, acometida: true, desconexion: false, sust: false, izq: false }, o || {}); lado(); cache = {}; construir(); api.reset(); },
      reset: function () { st = defaults(); cache = {}; draw(); },
      aplicar: function (anim, t, activo) {
        if (activo) st.tr = null;
        norm(anim).forEach(function (a) { var f = A[a.a]; if (f) f(t, a, activo); else if (window.console) console.warn('acción desconocida', a.a); });
        draw();
      },
      tema: function () { aplicaTema(); draw(); },
      _dbg: function () { return { O: O, GL: GL }; },
      dispose: function () { own.forEach(function (g) { g.dispose(); }); }
    };
    return api;
  };
})();
