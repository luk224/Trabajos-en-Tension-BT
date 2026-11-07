/* ============================================================
   Escena «caja de derivación sobre fachada, en red trenzada» (apartado 5.E del manual): E.1 y E.2.
   Se apoya en la escena `apoyo-bt` (personas, objetos metálicos, vallas, vial, lona, clima, ayudante…)
   a la que delega las acciones genéricas, y añade lo propio: fachada, caja de derivación aislante con
   bases de fusibles y bornas, red trenzada de entrada y conductores de salida, escalera aislante con
   correas, tela aislante, fundas, dedales, cintas, comprobadores y puntos de corriente.
   No modifica `apoyo-bt.js`: usa su `_dbg()` (como red-trenzada.js) para ocultar el apoyo, los conductores
   y demás piezas de A que aquí no proceden, y para recolocar al trabajador sobre la escalera.
   Eje x = a lo largo de la fachada, y = vertical, z = hacia la cámara (la fachada está en z = 0). Metros.
   Opciones de configurar(): { modo:'e1'|'e2' }.  Colores solo con la paleta CSS (--e-*), vía ctx.pal().
   ============================================================ */
(function () {
  'use strict';
  window.TET = window.TET || {}; TET.escenas = TET.escenas || {};

  TET.escenas['caja-derivacion'] = function (ctx) {
    var T = ctx.THREE, scene = ctx.scene, pal = ctx.pal, pedir = ctx.pedir;
    var base = TET.escenas['apoyo-bt'](ctx);
    var V = function (x, y, z) { return new T.Vector3(x, y, z); };
    var cl = function (x, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.min(b, Math.max(a, x)); };
    var seg = function (t, a, b) { return cl((t - a) / (b - a)); };
    var ss = function (x) { x = cl(x); return x * x * (3 - 2 * x); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var PI = Math.PI, UP = V(0, 1, 0);

    /* ---------- geometría ---------- */
    var FA = ['N', 'R', 'S', 'T'];
    var BX = 1.2, BY = 3.75, BZ = 0.02;               // origen local de la caja (centro, cara trasera)
    var XT = [-0.25, -0.11, 0.03, 0.17];              // x local de las bornas N, R, S, T (y de las bases R, S, T)
    var XL = 2.0, LZ0 = 1.1, LZT = 0.08, LH = 4.2, YW = 2.7;   // escalera: x, z del pie, z de la cabeza, altura; y de los pies al trabajar
    var HX = BX - 0.58, HY0 = 7.2, HY1 = 4.75, TT = 7.2;             // trenzado de entrada (baja por la fachada)
    var OX = BX + 0.15, OY0 = 1.75, OY1 = 2.5;             // trenzado de salida (hacia el edificio)
    var P1L = V(0.9, 3.75, 0.85);                      // punto intermedio al sacar / meter la caja
    var LONA_OLD = V(-1.9, 0.12, 2.0), LONA_NEW = V(-1.1, 0.12, 2.05);
    function zl(y) { return LZ0 + (LZT - LZ0) * (y / LH); }

    /* ---------- estado ---------- */
    var opt = { modo: 'e1' };
    var cor = null, G2 = null, AO = null, X = null, st = null, own = [], mats = {}, geos = {}, sprites = [], cache = {}, fwd = [], hid = [];
    var ovr = { on: false, x: 0, y: 0, z: 0, arm: 0, w: 0 };

    function M(k, extra) {
      var key = k + (extra ? JSON.stringify(extra) : '');
      if (!mats[key]) { var m = new T.MeshLambertMaterial(Object.assign({ color: pal(k) }, extra || {})); m.userData.k = k; mats[key] = m; }
      return mats[key];
    }
    function Mt(k, op) { return M(k, { transparent: true, opacity: op == null ? 0.5 : op, depthWrite: false, side: T.DoubleSide }); }
    function MB(k, extra) { var key = 'B' + k + (extra ? JSON.stringify(extra) : ''); if (!mats[key]) { var m = new T.MeshBasicMaterial(Object.assign({ color: pal(k) }, extra || {})); m.userData.k = k; mats[key] = m; } return mats[key]; }
    function geo(key, fn) { return geos[key] || (geos[key] = fn()); }
    function box(w, h, d) { return geo('b' + w + ',' + h + ',' + d, function () { return new T.BoxGeometry(w, h, d); }); }
    function cylU(r, n) { return geo('c' + r + ',' + (n || 8), function () { return new T.CylinderGeometry(r, r, 1, n || 8); }); }
    function cylZ(r, len, n) { return geo('cz' + r + ',' + len, function () { var g = new T.CylinderGeometry(r, r, len, n || 10); g.rotateX(PI / 2); return g; }); }
    function cylX(r, len, n) { return geo('cx' + r + ',' + len, function () { var g = new T.CylinderGeometry(r, r, len, n || 10); g.rotateZ(PI / 2); return g; }); }
    function sph(r, a, b) { return geo('s' + r + ',' + a, function () { return new T.SphereGeometry(r, a || 10, b || 8); }); }
    function mk(g, m, x, y, z, parent) { var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(o); return o; }
    function grp(parent, x, y, z) { var g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }
    function ro(o, n) { o.traverse(function (x) { x.renderOrder = n; }); return o; }
    function hide(o) { if (o) Object.defineProperty(o, 'visible', { get: function () { return false; }, set: function () {}, configurable: true }); }

    var _d = V(0, 0, 0);
    function place(m, a, b) {
      _d.subVectors(b, a); var L = _d.length();
      if (L < 1e-3) { m.visible = false; return; }
      m.visible = true; m.position.copy(a).addScaledVector(_d, 0.5);
      m.quaternion.setFromUnitVectors(UP, _d.normalize()); m.scale.set(1, L, 1);
    }
    var _o = V(0, 0, 0);
    function orient(g, pos, dir) { g.position.copy(pos); g.quaternion.setFromUnitVectors(UP, _o.copy(dir).normalize()); }
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
      if (m.userData.halo) tuboSet(m.userData.halo, pts);
    }
    /* halo claro (--e-halo) del conductor negro S: tubo 1,3x, MeshBasicMaterial DoubleSide, sin escribir profundidad, renderOrder -10 */
    function conHalo(tb, q) {
      if (FA[q] !== 'S') return tb;
      var h = tubo(tb.geometry.attributes.position.count / 5, tb.userData.rad * 1.3, new T.MeshBasicMaterial({ color: pal('halo'), side: T.DoubleSide, depthWrite: false }));
      h.material.userData.k = 'halo'; h.renderOrder = -10; mats['halo' + tb.id] = h.material; tb.add(h); tb.userData.halo = h; return tb;
    }
    function etq(txt, k, w, h) {
      var c = document.createElement('canvas'); c.width = 192; c.height = 96;
      var tex = new T.CanvasTexture(c); var mt = new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
      var s = new T.Sprite(mt); s.scale.set(w, h, 1); s.renderOrder = 20; s.visible = false;
      var o = { s: s, c: c, tex: tex, txt: txt, k: k }; sprites.push(o); dibujaEtq(o); return s;
    }
    function dibujaEtq(o) {
      var c = o.c, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
      var W = c.width, H = c.height, r = 20;
      g.fillStyle = o.k === 'ok' ? pal('ok') : pal(o.k); g.beginPath();
      if (o.txt === '✓') { g.arc(W / 2, H / 2, 40, 0, PI * 2); } else { g.moveTo(r, 6); g.lineTo(W - r, 6); g.quadraticCurveTo(W - 6, 6, W - 6, r); g.lineTo(W - 6, H - r); g.quadraticCurveTo(W - 6, H - 6, W - r, H - 6); g.lineTo(r, H - 6); g.quadraticCurveTo(6, H - 6, 6, H - r); g.lineTo(6, r); g.quadraticCurveTo(6, 6, r, 6); }
      g.fill(); g.lineWidth = 5; g.strokeStyle = pal('texto'); g.globalAlpha = 0.9; g.stroke(); g.globalAlpha = 1;
      g.fillStyle = o.k === 'T' ? '#14181d' : '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (o.txt === '✓') { g.strokeStyle = '#fff'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(W / 2 - 20, H / 2 + 2); g.lineTo(W / 2 - 5, H / 2 + 18); g.lineTo(W / 2 + 22, H / 2 - 16); g.stroke(); }
      else { g.font = '800 64px "Avenir Next Condensed","Bahnschrift","Arial Narrow",system-ui,sans-serif'; g.fillText(o.txt, W / 2, H / 2 + 3); }
      o.tex.needsUpdate = true;
    }
    /* hélice de un conductor alrededor de una trayectoria (cable trenzado) */
    function helix(path, i, amp, P) {
      var out = [], s = 0, k, n = path.length;
      for (k = 0; k < n; k++) {
        if (k > 0) s += path[k].distanceTo(path[k - 1]);
        _t.subVectors(path[Math.min(k + 1, n - 1)], path[Math.max(k - 1, 0)]).normalize();
        _n1.crossVectors(_t, UP); if (_n1.lengthSq() < 1e-4) _n1.set(1, 0, 0); _n1.normalize(); _n2.crossVectors(_t, _n1);
        var a = s / P * PI * 2 + i * PI / 2, c = Math.cos(a) * amp, d = Math.sin(a) * amp;
        out.push(V(path[k].x + c * _n1.x + d * _n2.x, path[k].y + c * _n1.y + d * _n2.y, path[k].z + c * _n1.z + d * _n2.z));
      }
      return out;
    }
    function curva(a, b, c, n) { return new T.CatmullRomCurve3([a, b, c], false, 'catmullrom', 0.5).getPoints(n); }

    /* ---------- piezas ---------- */
    function dedal() {   // caperuza aislante: casquete en y=0 y cuerpo hacia -y
      var g = new T.Group();
      mk(geo('dedalCil', function () { return new T.CylinderGeometry(0.055, 0.055, 0.13, 12, 1, true); }), Mt('aisl', 0.7), 0, -0.065, 0, g);
      mk(geo('dedalCup', function () { return new T.SphereGeometry(0.055, 12, 6, 0, PI * 2, 0, PI / 2); }), Mt('aisl', 0.7), 0, 0, 0, g);
      mk(geo('dedalRim', function () { var q = new T.TorusGeometry(0.055, 0.009, 6, 14); q.rotateX(PI / 2); return q; }), M('aisl'), 0, -0.13, 0, g);
      return ro(g, 4);
    }
    function funda(largo, radio) {   // funda ovalada reutilizable de apoyo-bt (TET.fundaOvalada), puesta en vertical
      var g = new T.Group(), w = grp(g, 0, 0, 0); w.rotation.z = PI / 2;
      w.add(window.TET.fundaOvalada(T, Mt('aisl', 0.55), largo, radio)); return g;
    }
    function pinzaRopa(x, y, z, par) {   // pinza aislante de sujeción de la tela (pinza de la ropa)
      var g = grp(par, x, y, z);
      [-1, 1].forEach(function (s) { var b = mk(box(0.024, 0.13, 0.03), M('guante'), 0.013 * s, 0.02, 0, g); b.rotation.z = -0.1 * s; });
      mk(cylZ(0.012, 0.045, 8), M('metal'), 0, 0.01, 0, g); mk(box(0.05, 0.07, 0.034), M('texto'), 0, -0.07, 0, g);
      return g;
    }
    function mkBase(parent, x, colK) {   // base portafusibles: cuerpo, dos bornas, tornillos y pletinas
      var g = grp(parent, x, 0, 0);
      mk(box(0.1, 0.46, 0.05), M(colK), 0, 0, 0.045, g);
      [0.265, -0.265].forEach(function (y) {
        mk(box(0.08, 0.06, 0.07), M('techo'), 0, y, 0.055, g);
        mk(cylZ(0.013, 0.02, 8), M('metal'), 0, y, 0.1, g);
      });
      [0.18, -0.18].forEach(function (y) { mk(box(0.03, 0.1, 0.012), M('metal'), 0, y, 0.077, g); });
      return g;
    }
    function mkBox(nuevo) {
      var g = grp(G2, BX, BY, BZ), B = { g: g, fus: [], bas: [], cv: [[], []] };
      mk(box(0.58, 0.76, 0.02), M('ropa2'), 0, 0, 0.01, g);
      mk(box(0.62, 0.02, 0.2), M('cgp'), 0, 0.39, 0.1, g); mk(box(0.62, 0.02, 0.2), M('cgp'), 0, -0.39, 0.1, g);
      mk(box(0.02, 0.76, 0.2), M('cgp'), -0.30, 0, 0.1, g); mk(box(0.02, 0.76, 0.2), M('cgp'), 0.30, 0, 0.1, g);
      /* neutro: pletina vertical con dos bornas */
      var ng = grp(g, XT[0], 0, 0); mk(box(0.03, 0.56, 0.03), M('metal'), 0, 0, 0.04, ng);
      [0.265, -0.265].forEach(function (y) { mk(box(0.08, 0.06, 0.07), M('techo'), 0, y, 0.055, ng); mk(cylZ(0.013, 0.02, 8), M('metal'), 0, y, 0.1, ng); });
      B.n = ng;
      for (var f = 0; f < 3; f++) {
        var q = f + 1;
        B.bas.push(mkBase(g, XT[q], nuevo ? 'nuevo' : (opt.modo === 'e2' && f === 1 ? 'viejo' : 'poste')));
        var fu = grp(g, XT[q], 0, 0.1);
        mk(cylU(0.026, 10), M('nube'), 0, 0, 0, fu).scale.set(1, 0.22, 1);
        [0.115, -0.115].forEach(function (y) { mk(box(0.05, 0.03, 0.05), M('metal'), 0, y, 0, fu); });
        B.fus.push(fu);
      }
      for (var k = 0; k < 4; k++) {
        [1, -1].forEach(function (sg, gi) { var fg = funda(0.17, 0.052); fg.position.set(XT[k], 0.275 * sg, 0.06); fg.visible = false; g.add(fg); B.cv[gi][k] = fg; });
      }
      var dp = grp(g, -0.31, 0, 0.225); B.door = dp;
      mk(box(0.62, 0.78, 0.02), M('cgp'), 0.31, 0, 0, dp); mk(box(0.04, 0.1, 0.025), M('ropa2'), 0.52, 0, 0.02, dp);
      B.seal = grp(dp, 0.57, -0.14, 0.025); mk(sph(0.028, 8, 6), MB('cota'), 0, 0, 0, B.seal); B.seal.visible = false;
      return B;
    }

    /* ---------- construcción ---------- */
    function construir() {
      var q, f, e2 = opt.modo === 'e2';
      if (G2) { scene.remove(G2); own.forEach(function (g) { g.dispose(); }); own = []; sprites = []; }
      base.configurar({ fin: false, acometida: false });
      if (typeof base._dbg !== 'function' || !base._dbg() || !base._dbg().O) {   // dependencia frágil: ver red-trenzada.js
        if (window.console) console.warn('caja-derivacion: apoyo-bt.js no expone _dbg().O; se muestra solo la escena base.');
        X = null; AO = null; return;
      }
      AO = base._dbg().O; G2 = new T.Group(); scene.add(G2); X = {};
      /* piezas de A que aquí no proceden: apoyo, conductores, protecciones… (lista blanca de lo que sí se usa) */
      var Gb = scene.children[scene.children.indexOf(G2) - 1];
      var keep = [AO.van, AO.sign, AO.signP, AO.lona, AO.bandeja, AO.bolsa, AO.sol, AO.nube, AO.okSol, AO.w.g, AO.ay.g, AO.hemi, AO.sun].concat(AO.cones, AO.val);
      Gb.children.forEach(function (c, i) { if (i < 2 || keep.indexOf(c) >= 0) return; hide(c); });
      AO.val.forEach(function (v, i) { if (i >= 9) hide(v); });   // vallas laterales que atravesarían la fachada
      /* el trabajador de A se recoloca sobre la escalera: se interceptan su posición y sus brazos (también en los redibujos asíncronos de A) */
      var W = AO.w, rawSet = T.Vector3.prototype.set, rawPose = W.pose;
      W.g.position.set = function (x, y, z) { return ovr.on ? rawSet.call(this, ovr.x, ovr.y, ovr.z) : rawSet.call(this, x, y, z); };
      W.pose = function (o) { rawPose(o); if (ovr.on) { W.aL.rotation.x = W.aR.rotation.x = ovr.arm; W.lL.rotation.x = Math.sin(ovr.w) * 0.55; W.lR.rotation.x = -Math.sin(ovr.w) * 0.55; } };

      /* fachada */
      mk(box(10, 7.6, 0.3), M('edificio'), 1.5, 3.8, -0.15, G2);
      mk(box(10.3, 0.22, 0.5), M('techo'), 1.5, 7.65, -0.05, G2);
      [[-1.0, 3.9], [4.6, 3.9]].forEach(function (w) { mk(box(1.0, 1.3, 0.04), M('lona'), w[0], w[1], 0.03, G2); mk(box(1.12, 0.07, 0.07), M('poste'), w[0], w[1] - 0.69, 0.05, G2); mk(box(0.04, 1.3, 0.05), M('poste'), w[0], w[1], 0.06, G2); });
      mk(box(0.9, 2.0, 0.04), M('ropa2'), 3.4, 1.0, 0.03, G2);

      /* cajas de derivación (aislantes); en E.1 hay caja vieja y caja nueva */
      X.bo = mkBox(false); X.bn = e2 ? null : mkBox(true); if (X.bn) X.bn.g.visible = false;
      if (e2) { X.nb = mkBase(X.bo.g, XT[2], 'nuevo'); X.nb.visible = false; }

      /* trenzado de entrada (baja por la fachada) y de salida (hacia el edificio), con bridas */
      var pin = [], pout = [], y;
      for (y = HY0; y >= HY1 - 1e-6; y -= 0.1) pin.push(V(HX, y, 0.09));
      for (y = OY0; y <= OY1 + 1e-6; y += 0.1) pout.push(V(OX, y, 0.09));
      [6.9, 6.0, 5.2].forEach(function (yy) { mk(box(0.1, 0.07, 0.04), M('ropa2'), HX, yy, 0.045, G2); });
      [2.3, 1.95].forEach(function (yy) { mk(box(0.1, 0.07, 0.04), M('ropa2'), OX, yy, 0.045, G2); });
      mk(box(0.2, 0.22, 0.14), M('ropa2'), OX, 1.62, 0.07, G2);
      X.cin = []; X.cout = [];
      [[pin, X.cin, true], [pout, X.cout, false]].forEach(function (cfg) {
        for (q = 0; q < 4; q++) {
          var hel = helix(cfg[0], q, 0.03, 0.5), n = hel.length + 8;
          var tb = conHalo(tubo(n, 0.022, M(FA[q], { side: T.DoubleSide })), q); G2.add(tb);
          var o = { q: q, hel: hel, pts: [], tube: tb, tip: V(0, 0, 0), dir: V(0, 1, 0), isIn: cfg[2] };
          o.ded = dedal(); o.ded.visible = false; G2.add(o.ded);
          o.bare = mk(cylU(0.011, 6), M('metal'), 0, 0, 0, G2); o.bare.visible = false;
          o.tape = mk(geo('tape', function () { return new T.CylinderGeometry(0.034, 0.034, 0.05, 12, 1, true); }), MB(['lona', 'cota', 'ok', 'nuevo'][q], { side: T.DoubleSide }), 0, 0, 0, G2); o.tape.visible = false; o.tape.renderOrder = 2;
          o.lab = etq(FA[q], FA[q], 0.17, 0.085); G2.add(o.lab);
          cfg[1].push(o);
          buildPts(o, cfg[2], q, 1); tuboSet(tb, o.pts);
        }
      });

      /* escalera aislante con correas (ilustrativo) */
      X.lad = grp(G2, XL, 0, LZ0); X.lad.visible = false;
      var top = V(0, LH, LZT - LZ0), nr = Math.floor(top.length() / 0.4);
      [-0.23, 0.23].forEach(function (dx) {
        var r = mk(cylU(0.035, 6), M('esc'), 0, 0, 0, X.lad); place(r, V(dx, 0, 0), V(dx, top.y, top.z));
        mk(box(0.1, 0.07, 0.16), M('ropa2'), dx, 0.035, 0, X.lad);
        var rc = mk(cylU(0.016, 6), M('guante'), 0, 0, 0, X.lad); place(rc, V(dx, 0.3, zl(0.3) - LZ0), V(dx * 1.3, 0.03, 0.62));   // correas inferiores al suelo
        mk(box(0.08, 0.04, 0.08), M('ropa2'), dx * 1.3, 0.02, 0.62, X.lad);
      });
      for (var k = 1; k <= nr; k++) { var fr = k / (nr + 1); mk(cylX(0.022, 0.46, 6), M('esc'), 0, top.y * fr, top.z * fr, X.lad); }
      var tc = mk(cylU(0.016, 6), M('guante'), 0, 0, 0, X.lad); place(tc, V(0.23, top.y - 0.05, top.z), V(0.35, top.y + 0.1, top.z - 0.05));   // correa de cabeza a la fachada
      X.strap = mk(cylU(0.035, 8), M('texto'), 0, 0, 0, G2); X.buckle = mk(box(0.1, 0.08, 0.03), M('metal'), 0, 0, 0, G2); X.buckle.visible = false; X.buckle.renderOrder = 3; X.strap.visible = false;
      X.ring = mk(geo('sujAro', function () { var qq = new T.TorusGeometry(0.07, 0.025, 8, 14); return qq; }), M('texto'), 0, 0, 0, G2); X.ring.visible = false;

      /* tela aislante de la zona de trabajo (con ventana para la caja), cuerda y pinzas */
      X.tela = grp(G2, 0, TT, 0.03); X.tela.visible = false;
      [[BX - 1.3, BX - 0.62, 2.8, TT], [BX + 0.6, BX + 1.3, 2.8, TT], [BX - 0.62, BX + 0.6, 4.2, TT], [BX - 0.62, BX + 0.6, 2.8, 3.3]].forEach(function (r) {
        var p = mk(geo('pl' + r.join(), function () { return new T.PlaneGeometry(r[1] - r[0], r[3] - r[2]); }), Mt('tela', 0.45), (r[0] + r[1]) / 2, (r[2] + r[3]) / 2 - TT, 0, X.tela); p.renderOrder = 1;
      });
      X.cord = grp(G2, 0, 0, 0); X.cord.visible = false;   // sin cordón: la tela cuelga directamente de las pinzas
      X.pins = [BX - 1.2, BX + 1.2].map(function (x) { var p = pinzaRopa(x, TT - 0.12, 0.06, G2); p.scale.setScalar(2.4); p.visible = false; return p; });
      /* tela interior (E.2): protege el resto de bases de fusibles */
      if (e2) {
        X.inner = grp(X.bo.g, 0, 0.225, 0.15); X.inner.visible = false; X.innP = [];
        [[-0.295, -0.045], [0.1, 0.29]].forEach(function (r, i) {
          var gp = grp(X.inner, 0, 0, 0); X.innP.push(gp);
          var p = mk(geo('pi' + r.join(), function () { return new T.PlaneGeometry(r[1] - r[0], 0.6); }), Mt('tela', 0.6), (r[0] + r[1]) / 2, -0.3, 0, gp); p.renderOrder = 1;
          pinzaRopa((r[0] + r[1]) / 2, 0.0, 0.01, gp).scale.setScalar(1.4);
        });
      }

      /* transitorios: herramienta aislada, pinza aislante, cepillo, discriminador bipolar, pinza voltio-amperimétrica, aro, flecha, visto bueno */
      X.tool = grp(G2, 0, 0, 0); X.tool.visible = false;
      mk(cylZ(0.006, 0.1, 6), M('metal'), 0, 0, 0.05, X.tool); mk(cylZ(0.022, 0.13, 8), M('ropa'), 0, 0, 0.165, X.tool);
      X.tongs = grp(G2, 0, 0, 0); X.tongs.visible = false;
      [-1, 1].forEach(function (s) { var j = mk(box(0.02, 0.026, 0.22), M('cota'), 0.016 * s, 0, 0.11, X.tongs); j.rotation.y = -0.09 * s; });
      mk(box(0.07, 0.05, 0.22), M('texto'), 0, 0, 0.33, X.tongs);
      X.brush = grp(G2, 0, 0, 0); X.brush.visible = false; mk(box(0.07, 0.03, 0.03), MB('cota'), 0, 0, 0, X.brush); mk(box(0.03, 0.03, 0.14), M('ropa'), 0, 0.02, 0.09, X.brush);
      X.disc = grp(G2, 0, 0, 0); X.disc.visible = false;
      mk(box(0.045, 0.26, 0.035), M('ropa2'), 0, 0.17, 0, X.disc);
      [-1, 1].forEach(function (s) { mk(cylU(0.005, 6), M('metal'), 0.014 * s, 0.02, 0, X.disc).scale.set(1, 0.1, 1); });
      X.discOk = mk(sph(0.018, 8, 6), MB('ok'), 0, 0.28, 0.022, X.disc); X.discNo = mk(sph(0.018, 8, 6), MB('cota'), 0, 0.28, 0.022, X.disc);
      X.pin = grp(G2, 0, 0, 0); X.pin.visible = false;
      mk(geo('pinzaT', function () { var qq = new T.TorusGeometry(0.06, 0.014, 6, 16, PI * 1.6); qq.rotateX(PI / 2); return qq; }), M('texto'), 0, 0, 0, X.pin);
      mk(box(0.07, 0.14, 0.04), M('aisl'), 0.06, -0.01, 0.05, X.pin); mk(box(0.04, 0.03, 0.02), MB('ok'), 0.06, 0.03, 0.075, X.pin);
      X.ok = etq('✓', 'ok', 0.3, 0.15); G2.add(X.ok);
      X.chk = [0, 1, 2].map(function () { var c = etq('✓', 'ok', 0.28, 0.14); G2.add(c); return c; });
      X.mark = mk(geo('anilloF', function () { return new T.RingGeometry(0.5, 0.58, 40); }), MB('marca'), 0, 0, 0, G2); X.mark.visible = false;
      X.arrow = mk(geo('flechaF', function () { var qq = new T.ConeGeometry(0.16, 0.38, 4); qq.rotateX(PI); return qq; }), MB('marca'), 0, 0, 0, G2); X.arrow.visible = false;

      /* puntos de corriente (ilustrativo). Se filtran los caminos de apoyo-bt que aquí no proceden. */
      cor = base.corriente || null;
      if (cor) {
        if (!cor._cdFiltro) { cor._cdFiltro = true; var raw = cor.setLive; cor.setLive = function (id, v) { return raw.call(cor, id, /^(ent|bas|sal)-/.test(id) ? v : 0); }; }
        var ofp = function (arr, k) { return function () { return arr[k].pts; }; };
        for (q = 0; q < 4; q++) {
          cor.addPath('ent-' + FA[q], ofp(X.cin, q), FA[q], { size: 0.1 });
          cor.addPath('bas-' + FA[q], [V(BX + XT[q], BY + 0.29, BZ + 0.12), V(BX + XT[q], BY - 0.29, BZ + 0.12)], FA[q], { size: 0.07, dens: 8 });
          cor.addPath('sal-' + FA[q], ofp(X.cout, q), FA[q], { size: 0.1, sentido: -1 });
        }
      }
      aplicaTema();
    }
    function aplicaTema() {
      Object.keys(mats).forEach(function (k) { mats[k].color.set(pal(mats[k].userData.k)); });
      sprites.forEach(dibujaEtq);
    }

    /* puntos de un conductor (entrada: de la red a la borna; salida: del trenzado a la borna) según su grado de conexión s (1 = en la borna) */
    function buildPts(o, isIn, q, s) {
      var sg = isIn ? 1 : -1, x = BX + XT[q];
      var Tq = V(x, BY + 0.29 * sg, BZ + 0.055), Eq = V(x, BY + 0.46 * sg, BZ + 0.07), Fq = V(x, isIn ? 5.2 : 2.98, 0.36);
      var tip = V(0, 0, 0).lerpVectors(Fq, Tq, s), end = o.hel[o.hel.length - 1];
      var mid = V(0, 0, 0).addVectors(end, tip).multiplyScalar(0.5); mid.z += 0.06;
      var c1 = V(0, 0, 0).lerpVectors(mid, Eq, s);
      o.pts = o.hel.concat(curva(end, c1, tip, 8).slice(1));
    }
    function tipOf(isIn, q) { return (isIn ? X.cin : X.cout)[q].tip; }
    function termW(isIn, q, dz) { return V(BX + XT[q], BY + (isIn ? 0.3 : -0.3), BZ + 0.1 + (dz || 0)); }

    /* ---------- estado por defecto ---------- */
    function defaults() {
      return { tr: null, lad: 0, climb: 0, tela: 0, door: 0, seal: 0, lab: 0, tpI: [0, 0, 0, 0], tpO: [0, 0, 0, 0],
        cvI: [0, 0, 0, 0], cvO: [0, 0, 0, 0], opI: [0, 0, 0, 0], opO: [0, 0, 0, 0], sI: [1, 1, 1, 1], dI: [0, 0, 0, 0], sO: [1, 1, 1, 1], dO: [0, 0, 0, 0],
        fO: [1, 1, 1], fN: [0, 0, 0], swap: 0, bsw: 0, inner: 0, inn: [0, 0], dsc: 0, rx: 2.9 };
    }
    function chg(key, val) { if (cache[key] === val) return false; cache[key] = val; return true; }

    /* ---------- volcado ---------- */
    function pathBox(g, u, a, b, rotEnd) {   // sale de la fachada (u = 0) hasta a (u = 1) pasando por P1L; rotación a tumbada
      var wall = V(BX, BY, BZ), p;
      if (u < 0.45) p = V(0, 0, 0).lerpVectors(wall, P1L, ss(u / 0.45)); else p = V(0, 0, 0).lerpVectors(P1L, a, ss((u - 0.45) / 0.55));
      g.position.copy(p); g.rotation.x = rotEnd * ss(seg(u, 0.45, 1));
    }
    function drawBoxes() {
      var e2 = opt.modo === 'e2', bo = X.bo, bn = X.bn, sw = st.swap, dr = -1.9 * ss(st.door);
      if (!e2) {
        pathBox(bo.g, ss(seg(sw, 0, 0.5)), LONA_OLD, null, -PI / 2); bo.g.visible = st.dsc < 0.7;
        bn.g.visible = sw > 0.5; pathBox(bn.g, 1 - ss(seg(sw, 0.5, 1)), LONA_NEW, null, -PI / 2);
      }
      [bo, bn].forEach(function (B, bi) {
        if (!B) return;
        B.door.rotation.y = dr; B.seal.visible = st.seal > 0.5 && (e2 || bi === (sw >= 0.5 ? 1 : 0));
        var F = bi ? st.fN : st.fO;
        for (var f = 0; f < 3; f++) {
          var p = F[f], fu = B.fus[f]; fu.visible = p > 0.02; fu.position.z = 0.1 + 0.24 * (1 - p); fu.scale.setScalar(Math.max(0.001, ss(seg(p, 0, 0.4))));
        }
        for (var k = 0; k < 4; k++) {
          var oc = (!e2 && bi === 0 && st.oc) ? st.oc : st;
          var ci = ss(oc.cvI[k]), co = ss(oc.cvO[k]), fi = B.cv[0][k], fo = B.cv[1][k];
          fi.visible = ci > 0.01; fi.scale.setScalar(Math.max(0.001, ci)); fi.position.y = 0.275 + 0.17 * ss(oc.opI[k]);
          fo.visible = co > 0.01; fo.scale.setScalar(Math.max(0.001, co)); fo.position.y = -0.275 - 0.17 * ss(oc.opO[k]);
        }
      });
      if (e2) {   // sustitución de la base de la fase S: la vieja sale a la lona, la nueva entra
        var x0 = XT[2], fr = V(x0, -0.1, 0.6), lonaL = V(LONA_OLD.x - BX, LONA_OLD.y - BY + 0.1, LONA_OLD.z - BZ), wallL = V(x0, 0, 0);
        var pl = function (g, u) {
          if (u < 0.45) g.position.lerpVectors(wallL, fr, ss(u / 0.45)); else g.position.lerpVectors(fr, lonaL, ss((u - 0.45) / 0.55));
          g.rotation.x = -PI / 2 * ss(seg(u, 0.45, 1));
        };
        var bs = bo.bas[1]; pl(bs, ss(seg(st.bsw, 0, 0.5))); bs.visible = st.dsc < 0.7;
        var nb = X.nb; nb.visible = st.bsw > 0.5; pl(nb, 1 - ss(seg(st.bsw, 0.5, 1)));
        X.inner.visible = st.inner > 0.01;
        X.inner.scale.set(1, Math.max(0.001, ss(st.inner)), 1);
        X.innP.forEach(function (gp, i) { gp.scale.set(1, Math.max(0.05, 1 - 0.9 * ss(st.inn[i])), 1); });
      }
    }
    function drawCond() {
      [true, false].forEach(function (isIn) {
        for (var q = 0; q < 4; q++) {
          var o = (isIn ? X.cin : X.cout)[q], s = isIn ? st.sI[q] : st.sO[q], d = isIn ? st.dI[q] : st.dO[q], tp = isIn ? st.tpI[q] : st.tpO[q];
          if (chg((isIn ? 'i' : 'o') + q, s.toFixed(3))) { buildPts(o, isIn, q, s); tuboSet(o.tube, o.pts); }
          var n = o.pts.length, tip = o.pts[n - 1], dir = V(0, 0, 0).subVectors(tip, o.pts[n - 3]).normalize();
          o.tip.copy(tip); o.dir.copy(dir);
          var dv = ss(d); o.ded.visible = dv > 0.01;
          if (o.ded.visible) { orient(o.ded, V(0, 0, 0).copy(tip).addScaledVector(dir, 0.03), dir); o.ded.scale.setScalar(Math.max(0.001, dv)); }
          o.bare.visible = d < 0.9 && s < 0.98; if (o.bare.visible) place(o.bare, tip, V(0, 0, 0).copy(tip).addScaledVector(dir, 0.07));
          o.tape.visible = tp > 0.01;
          if (o.tape.visible) { var k = n - 6; orient(o.tape, o.pts[k], V(0, 0, 0).subVectors(o.pts[k + 1], o.pts[k - 1])); o.tape.scale.set(1, Math.max(0.001, ss(tp)), 1); }
          o.lab.visible = st.lab > 0.5 && tp > 0.5; if (o.lab.visible) o.lab.position.set(o.pts[n - 6].x, o.pts[n - 6].y + 0.09, o.pts[n - 6].z + 0.1);
        }
      });
    }
    function drawWorker() {
      var W = AO.w, c = st.climb; ovr.on = c > 0.0005;
      if (!ovr.on) { W.g.position.set(st.rx, 0, 0.9); W.g.rotation.y = -PI / 2; X.strap.visible = X.ring.visible = X.buckle.visible = false; return; }
      var x, y, z, yaw, arm, w = 0, u = 0;
      if (c < 0.2) { var q = ss(c / 0.2); x = lerp(st.rx, XL - 0.1, q); z = lerp(0.9, zl(0) + 0.3, q); y = 0; yaw = lerp(-PI / 2, -PI, q); w = q > 0 && q < 1 ? c * 60 : 0; arm = 0; }
      else { u = (c - 0.2) / 0.8; y = YW * u; x = XL - 0.1; z = zl(y) + 0.26; yaw = -PI + (PI / 4) * ss(seg(u, 0.85, 1)); w = u < 0.999 ? y * 7 : 0; arm = u < 0.999 ? -0.9 : -1.3; }
      ovr.x = x; ovr.y = y; ovr.z = z; ovr.arm = arm; ovr.w = w;
      W.g.position.set(x, y, z); W.g.rotation.y = yaw; W.aL.rotation.x = W.aR.rotation.x = arm; W.lL.rotation.x = Math.sin(w) * 0.55; W.lR.rotation.x = -Math.sin(w) * 0.55;
      var sv = u > 0.3 && W.belt.visible;
      X.strap.visible = X.ring.visible = X.buckle.visible = sv;
      if (sv) { var ra = V(XL + 0.23, y + 1.25, zl(y + 1.25)); var wp = V(x, y + 0.93, z), fw = V(ra.x - x, 0, ra.z - z).normalize(), bp = wp.clone().addScaledVector(fw, 0.2); place(X.strap, bp, ra); X.buckle.position.copy(bp).addScaledVector(fw, 0.05); X.buckle.scale.setScalar(1.4); X.buckle.rotation.y = Math.atan2(fw.x, fw.z); X.ring.position.copy(ra); X.ring.rotation.set(PI / 2, 0, 0); }
    }
    function drawMisc() {
      X.lad.visible = st.lad > 0.01; X.lad.scale.setScalar(Math.max(0.001, ss(st.lad)));
      var tl = st.tela; X.tela.visible = tl > 0.02; X.tela.scale.set(1, Math.max(0.001, ss(seg(tl, 0.25, 1))), 1);
      X.cord.visible = tl > 0.02; X.pins.forEach(function (p) { p.visible = tl > 0.05; p.scale.setScalar(2.4 * Math.max(0.001, ss(seg(tl, 0, 0.3)))); });
    }
    function drawTr() {
      var tr = st.tr, a = tr && tr.a, t = tr ? tr.t : 0;
      [X.tool, X.tongs, X.brush, X.disc, X.pin, X.mark, X.arrow, X.ok].forEach(function (m) { m.visible = false; }); X.chk.forEach(function (c) { c.visible = false; });
      if (!a) return;
      var P;
      if (a === 'tool') { P = termW(tr.I, tr.q, 0.0); X.tool.visible = true; X.tool.position.set(P.x, P.y, P.z + 0.02); X.tool.rotation.set(0, 0, Math.sin(t * PI * 8) * 0.9); }
      else if (a === 'tongs') { P = tr.p; X.tongs.visible = true; X.tongs.position.set(P.x, P.y + 0.1 * (1 - tr.t), P.z + 0.12 + 0.06 * Math.sin(t * PI * 2)); X.tongs.rotation.set(0.3 * (1 - tr.t), 0, 0); }
      else if (a === 'brush') { P = tipOf(tr.I, tr.q); X.brush.visible = true; X.brush.position.set(P.x + 0.02 * Math.sin(t * PI * 10), P.y + 0.04, P.z + 0.07); X.brush.rotation.set(0.4, 0, 0); }
      else if (a === 'disc') { P = tr.p; X.disc.visible = true; X.disc.position.set(P.x, P.y - 0.02, P.z + 0.06); X.disc.rotation.set(0.45, 0, 0.1); X.discOk.visible = tr.ok; X.discNo.visible = !tr.ok; }
      else if (a === 'pin') {
        P = tipOf(tr.I, tr.q).clone(); P.y += tr.I ? 0 : 0.02; var sc = 1.2 * ss(seg(t, 0, 0.2)) * (1 - ss(seg(t, 0.9, 1))) + 0.0001;
        X.pin.visible = true; X.pin.position.set(P.x, P.y - (tr.I ? 0.0 : 0.0), P.z); X.pin.scale.setScalar(sc);
        X.ok.visible = t > 0.5; X.ok.position.set(P.x, P.y + 0.25, P.z + 0.15);
      }
      else if (a === 'ring') {
        X.mark.visible = true; X.mark.position.set(BX, BY, 0.4);
        if (tr.k === 'ident') { var r = 1 + 0.2 * Math.sin(t * PI * 4); X.mark.scale.setScalar(r); X.arrow.visible = true; X.arrow.position.set(BX, 4.9 + 0.12 * Math.sin(t * PI * 6), 0.4); }
        else if (tr.k === 'insp') { X.mark.position.y = lerp(0.6, BY, ss(t)); X.mark.scale.setScalar(0.6 + 0.4 * ss(t)); }
        else { X.mark.scale.setScalar(1.05 + 0.1 * Math.sin(t * PI * 4)); X.ok.visible = t > 0.75; X.ok.position.set(BX, BY + 0.55, 0.45); }
      }
      else if (a === 'chk') { for (var k = 0; k < 3; k++) { var c = X.chk[k]; c.visible = t > 0.2 + k * 0.22; c.position.set(BX + XT[k + 1], BY + 0.12, BZ + 0.3); } }
    }
    function flow(q) {
      var F = (opt.modo === 'e1' && st.swap >= 0.5) ? st.fN : st.fO, fu = q === 0 ? Math.max(F[0], F[1], F[2]) : F[q - 1];
      return ss(seg(st.sI[q], 0.95, 1)) * ss(seg(st.sO[q], 0.95, 1)) * fu;
    }
    function drawCor() {
      if (!cor) return;
      for (var q = 0; q < 4; q++) { var f = FA[q], fl = flow(q); cor.setLive('ent-' + f, 1); cor.setLive('bas-' + f, fl); cor.setLive('sal-' + f, fl); }
      cor.refresh();
    }
    function draw2() { drawBoxes(); drawCond(); drawWorker(); drawMisc(); drawTr(); drawCor(); pedir(); }

    /* ---------- acciones propias ---------- */
    var win = function (w) { return ss(seg(w, 0, 0.12)) * (1 - ss(seg(w, 0.88, 1))); };
    function grpS(g) { return g === 'I' ? { S: st.sI, D: st.dI, OP: st.opI, CV: st.cvI, I: true } : { S: st.sO, D: st.dO, OP: st.opO, CV: st.cvO, I: false }; }
    var A = {
      identificar: function (t, p, act) { if (act) st.tr = { a: 'ring', k: 'ident', t: t }; },
      inspeccion: function (t, p, act) { if (act) st.tr = { a: 'ring', k: 'insp', t: t }; },
      observa: function (t, p, act) { if (act) st.tr = { a: 'ring', k: 'obs', t: t }; },
      sube: function (t) { st.rx = 2.9; st.lad = ss(seg(t, 0, 0.12)); st.climb = seg(t, 0.1, 1); fwd.push({ anim: { a: 'asciende' }, t: t }); },
      baja: function (t) { st.rx = 3.6; st.climb = 1 - ss(t); st.lad = 1; fwd.push({ anim: { a: 'descenso' }, t: t }); },
      guardar: function (t) { st.lad = 1 - ss(seg(t, 0.2, 1)); fwd.push({ anim: { a: 'guardar' }, t: t }); },
      desecho: function (t) { st.dsc = t; fwd.push({ anim: { a: 'desecho' }, t: t }); },
      tela: function (t) { st.tela = ss(t); },
      quitaTela: function (t) { st.tela = 1 - ss(t); },
      abre: function (t) { st.door = ss(t); },
      cierra: function (t, p) { st.door = 1 - ss(seg(t, 0, 0.6)); st.seal = (p.seal && t > 0.7) ? 1 : 0; },
      revisa: function (t, p, act) { if (act) st.tr = { a: 'chk', t: t }; },
      inner: function (t) { st.inner = ss(t); },
      cintas: function (t) { for (var q = 0; q < 4; q++) { st.tpI[q] = ss(seg(t, q * 0.1, q * 0.1 + 0.2)); st.tpO[q] = ss(seg(t, 0.4 + q * 0.1, 0.6 + q * 0.1)); } st.lab = t > 0.04 ? 1 : 0; },
      cubre: function (t, p) { st.lab = 0; var n = p.q.length, G = grpS(p.g); p.q.forEach(function (q, k) { G.CV[q] = ss(seg(t, k / n, (k + 1) / n)); }); },
      quitaProt: function (t, p) {
        if (!p.keepTela) st.tela = 1 - ss(seg(t, 0, 0.6));
        if (p.inner) st.inner = 1 - ss(seg(t, 0, 0.6));
        for (var q = 0; q < 4; q++) { var w = 1 - ss(seg(t, 0.15 + q * 0.12, 0.5 + q * 0.12)); st.cvI[q] = Math.min(st.cvI[q], w); st.cvO[q] = Math.min(st.cvO[q], w); }
      },
      desc: function (t, p, act) {
        var G = grpS(p.g), n = p.q.length;
        p.q.forEach(function (q, k) {
          var w = seg(t, k / n, (k + 1) / n), a1 = p.brush ? 0.2 : 0.25;
          G.OP[q] = win(w);
          G.S[q] = 1 - 0.22 * ss(seg(w, 0, a1)) - 0.78 * ss(seg(w, p.brush ? 0.65 : 0.5, p.brush ? 0.95 : 0.9));
          G.D[q] = p.brush ? ss(seg(w, 0.45, 0.65)) : ss(seg(w, 0.25, 0.5));
          if (act && w > 0 && w < 1) { if (w < a1) st.tr = { a: 'tool', I: G.I, q: q, t: w / a1 }; else if (p.brush && w < 0.45) st.tr = { a: 'brush', I: G.I, q: q, t: seg(w, a1, 0.45) }; }
        });
      },
      con: function (t, p, act) {
        var G = grpS(p.g), n = p.q.length, a0 = p.test ? 0.22 : 0;
        p.q.forEach(function (q, k) {
          var w = seg(t, k / n, (k + 1) / n), u = seg(w, a0, 1);
          G.S[q] = 0.78 * ss(seg(u, 0, 0.35)) + 0.22 * ss(seg(u, 0.6, 0.85)); G.D[q] = 1 - ss(seg(u, 0.3, 0.5));
          G.OP[q] = win(w);   // solo se destapa la borna en curso; las demás siguen con su funda
          if (act && w > 0 && w < 1) {
            if (w < a0) st.tr = { a: 'disc', p: tipOf(G.I, q).clone(), t: w / a0, ok: w / a0 > 0.55 };
            else if (u > 0.5 && u < 0.85) st.tr = { a: 'tool', I: G.I, q: q, t: seg(u, 0.5, 0.85) };
          }
        });
      },
      swap: function (t) {   // las fundas puestas en la caja vieja salen con ella; la caja nueva empieza sin fundas
        if (!st.oc) st.oc = { cvI: st.cvI.slice(), cvO: st.cvO.slice(), opI: st.opI.slice(), opO: st.opO.slice() };
        st.swap = t; st.cvI = [1, 1, 1, 1]; st.cvO = [1, 1, 1, 1]; st.opI = [0, 0, 0, 0]; st.opO = [0, 0, 0, 0];
      },
      baseSw: function (t) { st.bsw = t; },
      fusQuita: function (t, p, act) {
        for (var f = 0; f < 3; f++) {
          var w = seg(t, f / 3, (f + 1) / 3); st.fO[f] = 1 - ss(seg(w, 0.25, 0.85));
          if (act && w > 0 && w < 1) st.tr = { a: 'tongs', p: V(BX + XT[f + 1], BY, BZ + 0.1), t: ss(seg(w, 0.25, 0.85)) };
        }
      },
      fusPon: function (t, p, act) {
        var F = p.box === 'N' ? st.fN : st.fO;
        for (var f = 0; f < 3; f++) {
          var w = seg(t, f / 3, (f + 1) / 3), a1 = p.volt ? 0.3 : 0.3, a2 = p.volt ? 0.7 : 1;
          F[f] = ss(seg(w, a1, a2));
          if (p.inn && f !== 1) st.inn[f === 0 ? 0 : 1] = ss(seg(w, 0, 0.12)) * (1 - ss(seg(w, 0.88, 1)));
          if (act && w > 0 && w < 1) {
            if (w < a1) st.tr = { a: 'disc', p: V(BX + XT[f + 1], BY + 0.31, BZ + 0.1), t: w / a1, ok: w / a1 > 0.55 };
            else if (w < a2) st.tr = { a: 'tongs', p: V(BX + XT[f + 1], BY, BZ + 0.1), t: 1 - ss(seg(w, a1, a2)) };
            else if (p.volt) st.tr = { a: 'pin', I: false, q: f + 1, t: seg(w, a2, 1) };
          }
        }
      },
      mide: function (t, p, act) { var n = p.q.length; if (act && t > 0 && t < 1) { var k = Math.min(n - 1, Math.floor(t * n)); st.tr = { a: 'pin', I: false, q: p.q[k], t: (t * n) % 1 }; } }
    };
    function norm(anim) { return anim == null ? [] : Array.isArray(anim) ? anim.map(n1) : [n1(anim)]; }
    function n1(a) { return typeof a === 'string' ? { a: a } : a; }
    function apl(anim, t, activo) {
      var mine = [], theirs = []; fwd = [];
      norm(anim).forEach(function (a) {
        if (a.a === 'seq') { a.items.forEach(function (it) { var fw = fwd; apl(it.anim, seg(t, it.w[0], it.w[1]), activo); fwd = fw.concat(fwd); }); return; }
        (A[a.a] ? mine : theirs).push(a);
      });
      mine.forEach(function (a) { A[a.a](t, a, activo); });
      base.aplicar(theirs.length ? theirs : null, t, activo);
      fwd.forEach(function (f) { base.aplicar([f.anim], f.t, activo); });
    }

    /* ---------- cámaras ---------- */
    var camaras = Object.assign({}, base.camaras, {
      general: { p: [7.5, 5.0, 12.5], t: [1.2, 3.2, 0.6] },
      fachada: { p: [0.6, 4.3, 5.0], t: [1.2, 3.8, 0.2] },
      caja: { p: [-0.9, 4.5, 4.4], t: [1.1, 3.8, 0.2] },
      trabajo: { p: [4.8, 4.4, 7.4], t: [1.2, 3.4, 0.4] },
      ascenso: { p: [6.6, 3.6, 8.6], t: [1.9, 2.6, 0.5] },
      sal: { p: [-0.9, 3.4, 4.2], t: [1.2, 3.3, 0.2] },
      /* cámaras de primer plano para los planos de detalle (campo `det` de los pasos) */
      dTela: { p: [0.4, 7.4, 1.4], t: [0.0, 7.05, 0.07], fov: 34 },
      dTelaInt: { p: [1.1, 4.1, 0.9], t: [1.2, 3.7, 0.15], fov: 30 },
      dCinturon: { p: [3.1, 3.9, 1.7], t: [2.1, 3.75, 0.74], fov: 28 },
      dEscalera: { p: [3.0, 0.9, 3.0], t: [2.0, 0.5, 1.0], fov: 30 },
      dDedales: { p: [1.2, 5.2, 1.5], t: [1.2, 4.7, 0.3], fov: 30 },
      dDedalesSal: { p: [1.2, 2.8, 1.5], t: [1.2, 3.2, 0.3], fov: 30 },
      dBase: { p: [1.2, 3.8, 1.0], t: [1.2, 3.75, 0.1], fov: 30 },
      dFunda: { p: [1.1, 4.5, 1.0], t: [1.2, 4.1, 0.1], fov: 28 },
      dCintas: { p: [1.2, 4.6, 1.6], t: [1.2, 4.5, 0.2], fov: 30 }
    });

    var api = {
      camaras: camaras,
      corriente: base.corriente,
      configurar: function (o) { opt = Object.assign({ modo: 'e1' }, o || {}); cache = {}; construir(); api.reset(); },
      reset: function () { base.reset(); if (!X) return; st = defaults(); cache = {}; draw2(); },
      aplicar: function (anim, t, activo) { if (!X) { base.aplicar(null, t, activo); return; } if (activo) st.tr = null; apl(anim, t, activo); draw2(); },
      detVista: function (on) { base.detVista && base.detVista(on); if (on) { hid = []; sprites.forEach(function (o) { if (o.s.visible) { o.s.visible = false; hid.push(o.s); } }); } else { hid.forEach(function (x) { x.visible = true; }); hid = []; } },
      tema: function () { base.tema(); if (!X) return; aplicaTema(); draw2(); },
      dispose: function () { own.forEach(function (g) { g.dispose(); }); base.dispose && base.dispose(); }
    };
    return api;
  };
})();
