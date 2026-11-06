/* ============================================================
   Escena «red aérea trenzada» (apartado 5.B del manual): B.1, B.2 y B.3.
   Se apoya en la escena `apoyo-bt` (apoyo, escalera, trabajadores, vallas, vial,
   lona, CGP, protecciones…) a la que delega todas las acciones genéricas, y
   añade encima lo propio del trenzado: cable trenzado (haz helicoidal de 4
   conductores: neutro + 3 fases), conductores abiertos con cuñas aislantes,
   dedales, conectores con protección aislante, tela y la sustitución de un
   vano convencional por una red trenzada.
   No modifica `apoyo-bt.js`: usa su `_dbg()` (ya existente) para ocultar las
   piezas de A que aquí no proceden (acometida de 4 cables, conductores de la
   línea principal en B.2/B.3) y recolocar los puntos de conexión `O.J`.
   Eje x = línea, y = vertical, z = hacia la cámara. Unidades: metros.
   Opciones de configurar(): { modo:'b1'|'b2'|'b3', desconexion:bool }.
   Colores solo con la paleta CSS (--e-*), vía ctx.pal().
   ============================================================ */
(function () {
  'use strict';
  window.TET = window.TET || {}; TET.escenas = TET.escenas || {};

  TET.escenas['red-trenzada'] = function (ctx) {
    var T = ctx.THREE, scene = ctx.scene, pal = ctx.pal, pedir = ctx.pedir;
    var base = TET.escenas['apoyo-bt'](ctx);
    var V = function (x, y, z) { return new T.Vector3(x, y, z); };
    var cl = function (x, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.min(b, Math.max(a, x)); };
    var seg = function (t, a, b) { return cl((t - a) / (b - a)); };
    var ss = function (x) { x = cl(x); return x * x * (3 - 2 * x); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var PI = Math.PI, UP = V(0, 1, 0);

    /* ---------- geometría (coherente con apoyo-bt.js) ---------- */
    var FA = ['N', 'R', 'S', 'T'];
    var YF = [8.1, 7.75, 7.4, 7.05], ZC = 0.42, LTOT = 20, SAG = 0.6;
    function yC(i, x) { var u = Math.min(1, Math.abs(x) / LTOT); return YF[i] - 4 * SAG * u * (1 - u); }
    var XL = [0, 1, 2, 3].map(function (i) { return 1.03 + 0.18 * i; });   // x de conexión de cada fase (B.1 y B.3, extremo izquierdo)
    var XF = 14;                                                             // B.3: x del apoyo del otro extremo (tramo corto, no a escala)
    var XR = XL.map(function (x) { return XF - x; });                        // idem extremo derecho (B.3)
    var XB2 = [0, 1, 2, 3].map(function (i) { return 0.95 + 0.3 * i; });    // B.2: puntos de conexión sobre la red trenzada
    var ZM = 0.45, XC1 = 2.0, XC2 = XF - 2.0, HB0 = -1.4;                       // z de la red principal (B.2), cortes y descenso inicial (B.3)
    function ym(x) { var u = Math.min(1, Math.abs(x) / LTOT); return 6.95 - 4 * SAG * u * (1 - u); }
    function yBun(x) { var u = x / XF; return 6.05 - 2 * u * (1 - u); }
    function yB(i, x) { if (x <= 0) return yC(i, x); if (x >= XF) return YF[i]; var u = x / XF; return YF[i] - 4 * SAG * u * (1 - u); }   // B.3: conductor entre los dos apoyos

    /* ---------- estado ---------- */
    var opt = { modo: 'b1', desconexion: false };
    var G2 = null, AO = null, st = null, own = [], mats = {}, sprites = [], geos = {}, cache = {}, X = null, armReq = false;

    function M(k, extra) {
      var key = k + (extra ? JSON.stringify(extra) : '');
      if (!mats[key]) { var m = new T.MeshLambertMaterial(Object.assign({ color: pal(k) }, extra || {})); m.userData.k = k; mats[key] = m; }
      return mats[key];
    }
    function Mt(k, op) { return M(k, { transparent: true, opacity: op == null ? 0.5 : op, depthWrite: false, side: T.DoubleSide }); }
    function MB(k) { var key = 'B' + k; if (!mats[key]) { var m = new T.MeshBasicMaterial({ color: pal(k) }); m.userData.k = k; mats[key] = m; } return mats[key]; }
    function geo(key, fn) { return geos[key] || (geos[key] = fn()); }
    function box(w, h, d) { return geo('b' + w + ',' + h + ',' + d, function () { return new T.BoxGeometry(w, h, d); }); }
    function cylU(r, n) { return geo('c' + r + ',' + (n || 8), function () { return new T.CylinderGeometry(r, r, 1, n || 8); }); }
    function cylZ(r, len, n) { return geo('cz' + r + ',' + len, function () { var g = new T.CylinderGeometry(r, r, len, n || 10); g.rotateX(PI / 2); return g; }); }
    function sph(r, a, b) { return geo('s' + r + ',' + a, function () { return new T.SphereGeometry(r, a || 10, b || 8); }); }
    function mk(g, m, x, y, z, parent) { var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(o); return o; }
    function grp(parent, x, y, z) { var g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }
    function hide(o) { if (o) Object.defineProperty(o, 'visible', { get: function () { return false; }, set: function () {}, configurable: true }); }

    var _d = V(0, 0, 0), _q = new T.Quaternion();
    function place(m, a, b) {
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
    function etq(txt, k, w, h) {
      var c = document.createElement('canvas'); c.width = 192; c.height = 96;
      var tex = new T.CanvasTexture(c); var mt = new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
      var s = new T.Sprite(mt); s.scale.set(w, h, 1); s.renderOrder = 20;
      var o = { s: s, c: c, tex: tex, txt: txt, k: k, w: w, h: h }; sprites.push(o); dibujaEtq(o); return s;
    }
    function dibujaEtq(o) {
      var c = o.c, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
      var W = c.width, H = c.height, r = 20;
      g.fillStyle = o.k === 'check' ? pal('ok') : pal(o.k); g.beginPath();
      if (o.txt === '✓') { g.arc(W / 2, H / 2, 40, 0, PI * 2); } else { g.moveTo(r, 6); g.lineTo(W - r, 6); g.quadraticCurveTo(W - 6, 6, W - 6, r); g.lineTo(W - 6, H - r); g.quadraticCurveTo(W - 6, H - 6, W - r, H - 6); g.lineTo(r, H - 6); g.quadraticCurveTo(6, H - 6, 6, H - r); g.lineTo(6, r); g.quadraticCurveTo(6, 6, r, 6); }
      g.fill(); g.lineWidth = 5; g.strokeStyle = pal('texto'); g.globalAlpha = 0.9; g.stroke(); g.globalAlpha = 1;
      g.fillStyle = o.k === 'T' ? '#14181d' : '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (o.txt === '✓') { g.strokeStyle = '#fff'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(W / 2 - 20, H / 2 + 2); g.lineTo(W / 2 - 5, H / 2 + 18); g.lineTo(W / 2 + 22, H / 2 - 16); g.stroke(); }
      else { g.font = '800 64px "Avenir Next Condensed","Bahnschrift","Arial Narrow",system-ui,sans-serif'; g.fillText(o.txt, W / 2, H / 2 + 3); }
      o.tex.needsUpdate = true;
    }
    function aislador(k) { // pin horizontal con dos campanas, apunta a +z
      var g = new T.Group(); mk(box(0.09, 0.09, 0.2), M('poste'), 0, 0, -0.14, g);
      mk(cylZ(0.035, 0.22), M(k), 0, 0, 0.03, g); mk(cylZ(0.085, 0.035, 12), M(k), 0, 0, 0.0, g); mk(cylZ(0.07, 0.035, 12), M(k), 0, 0, 0.07, g);
      return g;
    }
    /* hélice de un conductor alrededor de una trayectoria (cable trenzado) */
    function helix(path, i, amp, P, ampFn) {
      var out = [], s = 0, k, n = path.length;
      for (k = 0; k < n; k++) {
        if (k > 0) s += path[k].distanceTo(path[k - 1]);
        _t.subVectors(path[Math.min(k + 1, n - 1)], path[Math.max(k - 1, 0)]).normalize();
        _n1.crossVectors(_t, UP); if (_n1.lengthSq() < 1e-4) _n1.set(1, 0, 0); _n1.normalize(); _n2.crossVectors(_t, _n1);
        var a = s / P * PI * 2 + i * PI / 2, am = ampFn ? ampFn(path[k]) : amp, c = Math.cos(a) * am, d = Math.sin(a) * am;
        out.push(V(path[k].x + c * _n1.x + d * _n2.x, path[k].y + c * _n1.y + d * _n2.y, path[k].z + c * _n1.z + d * _n2.z));
      }
      return out;
    }
    function ssm(x) { return ss(cl(x)); }
    /* B.2: posición de un conductor de la red principal; zs = abierto por las cuñas */
    function bell(x) { return ss(seg(x, 0.5, 0.8)) * (1 - ss(seg(x, 1.9, 2.2))); }
    function coreAt(i, x, zs, out) {
      var amp = 0.035 * (1 - ss(seg((Math.abs(x - 2) - 5) / 2 + 0, 0, 1))), ph = x / 0.6 * PI * 2 + i * PI / 2;
      var hy = amp * Math.cos(ph), hz = amp * Math.sin(ph), sy = (1.5 - i) * 0.1, w = zs * bell(x);
      return (out || V(0, 0, 0)).set(x, ym(x) + lerp(hy, sy, w), ZM + lerp(hz, 0, w));
    }

    /* ---------- construcción ---------- */
    function construir() {
      var i, k, b1 = opt.modo === 'b1', b2 = opt.modo === 'b2', b3 = opt.modo === 'b3';
      if (G2) { scene.remove(G2); own.forEach(function (g) { g.dispose(); }); own = []; sprites = []; }
      base.configurar({ fin: false, acometida: !b3 });
      /* DEPENDENCIA FRÁGIL: se usa base._dbg() (accesor de depuración de apoyo-bt.js) para ocultar piezas de A,
         recolocar O.J y modificar O.pr. Si apoyo-bt.js lo retira o cambia, esta escena NO se rompe: avisa en consola
         y queda solo la escena de A (sin cable trenzado). Si se retira _dbg, exportar en A algo equivalente. */
      if (typeof base._dbg !== 'function' || !base._dbg() || !base._dbg().O) {
        if (window.console) console.warn('red-trenzada: apoyo-bt.js no expone _dbg().O; se muestra solo la escena base, sin cable trenzado.');
        X = null; AO = null; return;
      }
      AO = base._dbg().O;
      G2 = new T.Group(); scene.add(G2);
      X = { b1: b1, b2: b2, b3: b3, ends: [] };
      /* piezas de A que aquí no proceden */
      (AO.cab || []).forEach(hide); (AO.dedal || []).forEach(hide); (AO.der || []).forEach(hide);
      (AO.labAc || []).forEach(hide);   // las etiquetas de la acometida de A se sustituyen por las propias (más pequeñas)
      if (b2) { AO.cond.forEach(hide); AO.ais.forEach(hide); hide(AO.ret); hide(AO.cota); AO.lab.forEach(hide); }
      if (b3) {
        AO.cond.forEach(hide); hide(AO.ret);
        var aG = scene.children[scene.children.indexOf(G2) - 1];
        if (aG) aG.children.forEach(function (o) { if (o.isMesh && o.geometry && o.geometry.type === 'CylinderGeometry' && Math.abs(o.position.x - 20) < 0.01) hide(o); });
        var pl = mk(geo('polo', function () { return new T.CylinderGeometry(0.13, 0.22, 8.6, 12); }), M('poste'), XF, 4.3, 0, G2);
      }
      /* puntos de conexión de A (los usan la pinza y otros gestos) */
      for (i = 0; i < 4; i++) { if (b2) coreAt(i, XB2[i], 0, AO.J[i]); else AO.J[i].set(XL[i], b3 ? yB(i, XL[i]) : yC(i, XL[i]), ZC); }

      /* ----- extremo(s) del cable trenzado ----- */
      function extremo(cfg) {
        var e = { Pe: V(0, 0, 0), J: cfg.J, tubes: [], ded: [], bare: [], con: [], pro: [], labA: [], pts: [], tf: [], dir: V(0, 1, 0) };
        for (var q = 0; q < 4; q++) {
          var tb = tubo(10, 0.02, M(FA[q], { side: T.DoubleSide })); G2.add(tb); e.tubes.push(tb);
          e.pts.push(Array.apply(null, Array(10)).map(function () { return V(0, 0, 0); })); e.tf.push(V(0, 0, 0));
          e.ded.push(mk(cylU(0.05, 8), Mt('aisl', 0.75), 0, 0, 0, G2)); e.ded[q].visible = false;
          e.bare.push(mk(cylU(0.02, 6), M('metal'), 0, 0, 0, G2)); e.bare[q].visible = false;
          var cn = mk(box(0.13, 0.06, 0.07), M('metal'), 0, 0, 0, G2); cn.visible = false; e.con.push(cn);
          var pr = mk(sph(0.13, 10, 8), Mt('aisl', 0.5), 0, 0, 0, G2); pr.visible = false; e.pro.push(pr);
          var lb = etq(FA[q], FA[q], 0.34, 0.17); lb.visible = false; G2.add(lb); e.labA.push(lb);
        }
        e.chk = [0, 1, 2, 3].map(function () { var c = etq('✓', 'ok', 0.3, 0.15); c.visible = false; G2.add(c); return c; });
        e.cfg = cfg; X.ends.push(e); return e;
      }
      X.brush = grp(G2, 0, 0, 0); X.brush.visible = false; mk(box(0.3, 0.06, 0.12), MB('cota'), 0, 0, 0, X.brush); mk(cylU(0.02, 6), M('metal'), 0.3, 0.05, 0, X.brush).rotation.z = PI / 2;
      X.pings = [0, 1].map(function () { var p = mk(sph(0.5, 12, 8), Mt('marca', 0.35), 0, 0, 0, G2); p.visible = false; return p; });

      if (b1 || b2) {
        /* acometida de cable trenzado: haz de 4 conductores desde la CGP hasta el punto de trabajo */
        var C0 = V(5.4, 3.82, 2.16), Pb = b1 ? V(1.3, 6.45, 0.95) : V(1.45, 6.15, 0.78), NP = 64, path = [];
        for (k = 0; k < NP; k++) { var u = k / (NP - 1); path.push(V(lerp(C0.x, Pb.x, u), lerp(C0.y, Pb.y, u) - 0.5 * Math.sin(u * PI), lerp(C0.z, Pb.z, u))); }
        X.acom = [];
        for (i = 0; i < 4; i++) { var ta = tubo(NP, 0.03, M(FA[i], { side: T.DoubleSide })); G2.add(ta); tuboSet(ta, helix(path, i, 0.035, 0.55)); X.acom.push(ta); }
        var e0 = extremo({ J: AO.J, free: 0.72 }); e0.Pe.copy(Pb);
        X.Pb = Pb;
      }
      if (b2) {
        /* red principal trenzada: haz de 4 conductores a lo largo del vano, abierto en la zona de conexión por dos cuñas */
        X.xs = []; var x;
        for (x = -20; x < -5; x += 1) X.xs.push(x);
        for (x = -5; x < 9; x += 0.1) X.xs.push(Math.round(x * 100) / 100);
        for (x = 9; x <= 20; x += 1) X.xs.push(x);
        X.main = [];
        for (i = 0; i < 4; i++) { var tm = tubo(X.xs.length, 0.03, M(FA[i], { side: T.DoubleSide })); G2.add(tm); X.main.push(tm); }
        [-20, 0, 20].forEach(function (xx) { mk(box(0.16, 0.22, 0.3), M('cgp'), xx, 6.95 + (xx === 0 ? 0 : 0.0), 0.28, G2); });
        X.cunas = [0.68, 2.05].map(function (xx, q) { var c = mk(box(0.11, 0.36, 0.14), M('marca'), xx, 6.9, ZM, G2); c.rotation.z = q ? -0.2 : 0.2; c.visible = false; return c; });
        X.tela = mk(geo('tela2', function () { return new T.PlaneGeometry(2.6, 1.0); }), Mt('tela', 0.55), 1.4, 6.85, 0.27, G2); X.tela.visible = false;
        X.labM = FA.map(function (f, q) { var s = etq(f, f, 0.3, 0.15); s.visible = false; G2.add(s); return s; });
        X.labA2 = FA.map(function (f, q) { var s = etq(f, f, 0.3, 0.15); s.visible = false; G2.add(s); return s; });
      }
      if (b3) {
        /* conductores convencionales (los de A se ocultan): izquierdo y derecho permanecen; el vano central se retira */
        var defs = [[-20, XC1, 'L'], [XC1, XC2, 'S'], [XC2, XF + 12, 'R']]; X.conv = { L: [], S: [], R: [], G: [] };
        defs.forEach(function (d) {
          var xs = []; for (var xx = d[0]; xx < d[1]; xx += (d[2] === 'S' ? 1.1 : 1.6)) xs.push(xx); xs.push(d[1]);
          if (d[2] === 'L') { xs = []; for (xx = -20; xx < -4; xx += 2) xs.push(xx); for (xx = -4; xx < d[1]; xx += 0.4) xs.push(xx); xs.push(d[1]); }
          for (var q = 0; q < 4; q++) {
            var tb = tubo(xs.length, 0.03, M(FA[q], { side: T.DoubleSide })); G2.add(tb); X.conv[d[2]].push(tb);
            tuboSet(tb, xs.map(function (x2) { return V(x2, yB(q, x2), ZC); }));
            if (d[2] === 'S') { var gh = tubo(xs.length, 0.03, Mt(FA[q], 0.28)); G2.add(gh); gh.visible = false; X.conv.G.push(gh); tuboSet(gh, xs.map(function (x2) { return V(x2, yB(q, x2), ZC); })); }
          }
        });
        /* apoyo derecho: aisladores */
        for (i = 0; i < 4; i++) { var ag = aislador('aislador'); ag.position.set(XF, YF[i], 0.3); G2.add(ag); }
        /* retenciones y cortes */
        X.ret3 = [];
        for (i = 0; i < 4; i++) { [XC1 - 0.2, XC2 + 0.2].forEach(function (xx) { var r = mk(box(0.1, 0.1, 0.08), M('metal'), xx, yB(i, xx), ZC, G2); r.visible = false; X.ret3.push(r); }); }
        /* protecciones del apoyo de la izquierda: se deja descubierto el punto de conexión (como en B.1) */
        for (i = 0; i < 4; i++) {
          var pr0 = AO.pr[i], p1 = pr0.pieces[1];
          /* como en A.1: pieza completa 0,3-3,0 con una «ventana» (win) que se abre solo en la fase en curso */
          p1.a.set(0.3, yB(i, 0.3), ZC); p1.b.set(1.0, yB(i, 1.0), ZC);
          [[1.0, 1.6, true], [1.6, XC1, false]].forEach(function (sg) {
            var nm = mk(cylU(0.05, 8), Mt('aisl', 0.45), 0, 0, 0, G2); nm.visible = false;
            pr0.pieces.push({ win: sg[2], m: nm, a: V(sg[0], yB(i, sg[0]), ZC), b: V(sg[1], yB(i, sg[1]), ZC) });
          });
        }
        /* protecciones del apoyo de la derecha (propias) */
        X.pF = [];
        for (i = 0; i < 4; i++) {
          var o = { pieces: [], cap: null };
          [[XF - 0.3, XF - 1.0], [XF - 1.0, XF - 1.6, 'w'], [XF - 1.6, XC2]].forEach(function (s2) { var m = mk(cylU(0.05, 8), Mt('aisl', 0.45), 0, 0, 0, G2); m.visible = false; o.pieces.push({ win: s2[2] === 'w', m: m, a: V(s2[0], yB(i, s2[0]), ZC), b: V(s2[1], yB(i, s2[1]), ZC) }); });
          o.cap = mk(sph(0.13, 10, 8), Mt('aisl', 0.45), XF, YF[i], 0.34, G2); o.cap.visible = false; X.pF.push(o);
        }
        X.telaF = mk(box(0.5, 1.9, 0.45), Mt('tela', 0.38), XF, 7.6, -0.02, G2); X.telaF.visible = false;
        /* cable trenzado nuevo */
        X.bundle = []; for (i = 0; i < 4; i++) { var tn = tubo(Math.round((XF - 2.6) / 0.1) + 1, 0.03, M(FA[i], { side: T.DoubleSide })); G2.add(tn); X.bundle.push(tn); }
        var eL = extremo({ J: AO.J, free: 0.72 });
        var Jr = XR.map(function (x2, q) { return V(x2, yB(q, x2), ZC); });
        var eR = extremo({ J: Jr, free: 0.72 });
        X.labF = FA.map(function (f, q) { var s = etq(f, f, 0.5, 0.25); s.position.set(XF - 2.3, YF[q] - 0.02, 0.85); s.visible = false; G2.add(s); return s; });
      }
      aplicaTema();
    }
    function aplicaTema() {
      Object.keys(mats).forEach(function (k) { mats[k].color.set(pal(mats[k].userData.k)); });
      sprites.forEach(dibujaEtq);
    }

    /* ---------- estado por defecto ---------- */
    function defaults() {
      var des = opt.desconexion ? 1 : 0, o = { zs: 0, ci: 0, tela2: 0, lm: 0, la: 0, bun: X && X.b3 ? 0 : 1, hB: HB0, pF: [0, 0, 0, 0], openF: [0, 0, 0, 0], telaF: 0, ret3: 0, cut: 0, labF: 0, tr: null, ends: [] };
      for (var e = 0; e < 2; e++) o.ends.push({ s: [des, des, des, des], d: [1 - des, 1 - des, 1 - des, 1 - des], chk: [0, 0, 0, 0] });
      return o;
    }

    /* ---------- volcado ---------- */
    function chg(key, val) { if (cache[key] === val) return false; cache[key] = val; return true; }
    function drawEnd(ei) {
      var e = X.ends[ei]; if (!e) return; var S = st.ends[ei], i, k, vis = X.b3 ? st.bun > 0.01 : true;
      for (i = 0; i < 4; i++) {
        var s = S.s[i], d = S.d[i], J = e.J[i], ap = ss(seg(s, 0.15, 0.6)), tf = e.tf[i], E = V(0, 0, 0), P = e.pts[i];
        tf.lerpVectors(e.Pe, J, e.cfg.free); tf.y -= 0.16; tf.z += 0.24;
        E.lerpVectors(tf, J, ap); E.z += 0.03 * ap;
        var key = [e.Pe.x, e.Pe.y.toFixed(3), E.x.toFixed(3), E.y.toFixed(3), E.z.toFixed(3), ei, i].join();
        if (chg('br' + ei + i, key)) {
          for (k = 0; k < 10; k++) {
            var u = k / 9, sn = Math.sin(u * PI);
            P[k].set(lerp(e.Pe.x, E.x, u), lerp(e.Pe.y, E.y, u) - 0.10 * sn * (1 - ap), lerp(e.Pe.z, E.z, u) + 0.12 * sn * (1 - ap));
          }
          tuboSet(e.tubes[i], P);
        }
        e.tubes[i].visible = vis;
        _d.subVectors(P[9], P[8]).normalize(); var dir = _d.clone();
        var dv = e.ded[i], en = ss(d); dv.visible = vis && d > 0.01;
        if (dv.visible) { place(dv, E.clone().addScaledVector(dir, 0.02), E.clone().addScaledVector(dir, 0.02 + 0.16 * en)); dv.scale.x = dv.scale.z = Math.max(0.001, en); }
        var bv = e.bare[i]; bv.visible = vis && d < 0.9 && s < 0.65;
        if (bv.visible) place(bv, E, E.clone().addScaledVector(dir, 0.11));
        var cv = e.con[i], cs = ss(seg(s, 0.62, 0.75)); cv.visible = vis && cs > 0.01; cv.position.copy(J); cv.scale.setScalar(Math.max(0.001, cs));
        var pv = e.pro[i], ps = ss(seg(s, 0.75, 1)); pv.visible = vis && ps > 0.01; pv.position.copy(J); pv.scale.set(Math.max(0.001, ps * 1.5), Math.max(0.001, ps), Math.max(0.001, ps));
        var lb = e.labA[i]; lb.visible = X.b1 && st.lm > 0.5 && s < 0.1; lb.position.set(J.x + 0.55, J.y - 0.06, 0.9);
        var ck = e.chk[i]; ck.visible = vis && S.chk[i] > 0.5 && s < 0.99; ck.position.set(J.x, J.y + 0.3, J.z + 0.4);
      }
    }
    function draw2() {
      var s = st, i, k;
      if (X.b2) {
        for (i = 0; i < 4; i++) coreAt(i, XB2[i], s.zs, AO.J[i]);
        if (chg('zs', s.zs.toFixed(3))) {
          for (i = 0; i < 4; i++) tuboSet(X.main[i], X.xs.map(function (x) { return coreAt(i, x, s.zs); }));
        }
        var ci = ss(s.ci);
        X.cunas.forEach(function (c, q) { c.visible = ci > 0.01; c.position.set(q ? 2.05 : 0.68, 6.9 - 0.0, ZM + 0.4 * (1 - ci)); });
        X.tela.visible = s.tela2 > 0.01; X.tela.scale.setScalar(Math.max(0.001, ss(s.tela2)));
        for (i = 0; i < 4; i++) {
          X.labM[i].visible = s.lm > 0.5; X.labM[i].position.set(XB2[i], ym(XB2[i]) + 0.4, 0.82);
          X.labA2[i].visible = s.la > 0.5; X.labA2[i].position.set(XB2[i] - 0.05, 5.85, 1.02);
        }
      }
      if (X.b3) {
        var vb = s.bun > 0.01;
        X.ends[0].Pe.set(1.3, yBun(1.3) + s.hB, 0.9); X.ends[1].Pe.set(XF - 1.3, yBun(XF - 1.3) + s.hB, 0.9);
        if (vb && chg('hBv', s.hB.toFixed(3))) {
          var path = []; for (var x = 1.3; x <= XF - 1.2999; x += 0.1) path.push(V(x, yBun(x) + s.hB, 0.9));
          for (i = 0; i < 4; i++) tuboSet(X.bundle[i], helix(path, i, 0.035, 0.55));
        }
        for (i = 0; i < 4; i++) {
          X.bundle[i].visible = vb;
          var p = s.pF[i], o = X.pF[i]; o.cap.visible = p > 0.01; o.cap.scale.setScalar(Math.max(0.001, ss(seg(p, 0, 0.4))));
          var g = ss(seg(p, 0.25, 1));
          o.pieces.forEach(function (q) { if (g < 0.01 || (q.win && s.openF[i] > 0.5)) q.m.visible = false; else { _d.copy(q.b).sub(q.a).multiplyScalar(g).add(q.a); place(q.m, q.a, _d.clone()); } });
          X.labF[i].visible = s.labF > 0.5;
          X.conv.S[i].visible = s.cut < 0.5; X.conv.G[i].visible = s.cut >= 0.5;
        }
        X.telaF.visible = s.telaF > 0.01; X.telaF.scale.setScalar(Math.max(0.001, ss(s.telaF)));
        var rv = ss(s.ret3); X.ret3.forEach(function (r) { r.visible = rv > 0.01; r.scale.setScalar(Math.max(0.001, rv)); });
      }
      for (var e = 0; e < X.ends.length; e++) drawEnd(e);
      drawTr2();
      pedir();
    }
    function drawTr2() {
      var tr = st.tr, a = tr && tr.a, t = tr ? tr.t : 0;
      X.brush.visible = false; X.pings.forEach(function (p) { p.visible = false; });
      var lab = X.b2 ? X.labM : null;
      if (X.b2) { X.labM.concat(X.labA2).forEach(function (l) { l.scale.set(0.3, 0.15, 1); }); }
      if (!a) return;
      if (a === 'cepilla') {
        var J = X.ends[tr.e].J[tr.i]; X.brush.visible = true; X.brush.position.set(J.x + 0.15 * Math.sin(t * PI * 6), J.y + 0.07, J.z + 0.08);
      } else if (a === 'ping') {
        var pts = tr.k === 'ext' ? [V(1.3, 6.9, 0.7), V(XF - 1.3, 6.9, 0.7)] : [V(XF / 2, 6.0, 0.9)], r = 0.55 + 0.45 * Math.abs(Math.sin(t * PI * 3));
        pts.forEach(function (p, q) { var m = X.pings[q]; m.visible = true; m.position.copy(p); m.scale.setScalar(r * (tr.k === 'ext' ? 1 : 2)); });
      } else if (a === 'dedP') {
        X.ends.forEach(function (e) { e.ded.forEach(function (d, q) { if (d.visible) { var f = 1 + 0.6 * Math.abs(Math.sin(t * PI * 3)); d.scale.x = d.scale.z = f; } }); });
      } else if (a === 'rN' && X.b2) {
        var f2 = 1 + 0.6 * Math.abs(Math.sin(t * PI * 3)); X.labM[0].scale.set(0.3 * f2, 0.15 * f2, 1); X.labA2[0].scale.set(0.3 * f2, 0.15 * f2, 1);
      }
    }

    /* ---------- acciones propias ---------- */
    function fi(f) { return FA.indexOf(f); }
    function conecta(S, i, w) { S.d[i] = 1 - ss(seg(w, 0, 0.25)); S.s[i] = ss(seg(w, 0.2, 1)); }
    function desconecta(S, i, w) { S.s[i] = 1 - ss(seg(w, 0, 0.75)); S.d[i] = ss(seg(w, 0.7, 1)); }
    function curva(w) { return ss(seg(w, 0, 0.12)) * (1 - ss(seg(w, 0.88, 1))); }
    /* ventana del extremo e en la fase i durante su turno w: extremo 0 -> pieza `win` de A (vía su acción `conecta`, misma curva); extremo 1 -> propia */
    function ventana(e, i, w, inv) { if (e === 1) st.openF[i] = curva(w); else winF.push({ f: FA[i], w: w, inv: !!inv }); }
    var winF = [];
    var A = {
      conectaT: function (t, p) {
        var S = st.ends[p.e || 0], fs = p.fases, n = fs.length; armReq = true;
        fs.forEach(function (f, k) { var w = seg(t, k / n, (k + 1) / n), i = fi(f); if (p.inv) desconecta(S, i, w); else conecta(S, i, w); if (X.b1) ventana(0, i, w, p.inv); });
      },
      ciclo: function (t, p, act) {
        var e = p.e || 0, S = st.ends[e], fs = p.fases, n = fs.length, m = p.modo; armReq = m !== 'ext2';
        if (m === 'ext2') st.labF = t > 0.04 ? 1 : 0;
        fs.forEach(function (f, k) {
          var w = seg(t, k / n, (k + 1) / n), i = fi(f); ventana(e, i, w);
          if (m === 'pela') S.d[i] = 1 - ss(seg(w, 0, 0.8));
          else if (m === 'todo') { S.d[i] = 1 - ss(seg(w, 0, 0.2)); S.s[i] = ss(seg(w, 0.45, 1)); if (act && w > 0.2 && w < 0.45) st.tr = { a: 'cepilla', t: seg(w, 0.2, 0.45), e: e, i: i }; }
          else if (m === 'cc') { S.d[i] = 0; S.s[i] = ss(seg(w, 0.4, 1)); if (act && w > 0 && w < 0.4) st.tr = { a: 'cepilla', t: seg(w, 0, 0.4), e: e, i: i }; }
          else if (m === 'ext2') { S.chk[i] = w > 0.2 ? 1 : 0; S.d[i] = 1 - ss(seg(w, 0.1, 0.3)); S.s[i] = ss(seg(w, 0.3, 1)); }
        });
      },
      dedales: function (t, p, act) { st.bun = ss(seg(t, 0, 0.4)); if (act && t > 0.4) st.tr = { a: 'dedP', t: seg(t, 0.4, 1) }; },
      posiciona: function (t) { st.bun = 1; st.hB = lerp(HB0, 0, ss(t)); },
      cunas: function (t) { st.zs = ss(seg(t, 0.1, 0.6)); st.ci = ss(seg(t, 0, 0.5)); st.tela2 = ss(seg(t, 0.5, 1)); armReq = true; },
      quitaCunas: function (t) { st.tela2 = 1 - ss(seg(t, 0, 0.4)); st.ci = st.zs = 1 - ss(seg(t, 0.3, 1)); armReq = true; },
      etiq2: function (t, p, act) { st.lm = st.la = t > 0.05 ? 1 : 0; if (act) st.tr = { a: 'rN', t: t }; },
      resaltaN2: function (t, p, act) { st.lm = st.la = 1; if (act) st.tr = { a: 'rN', t: t }; },
      aislarFar: function (t) { [3, 2, 1, 0].forEach(function (i, k) { st.pF[i] = ss(seg(t, k * 0.2, k * 0.2 + 0.3)); }); st.telaF = ss(seg(t, 0.85, 1)); },
      quitarFar: function (t) { for (var k = 0; k < 4; k++) st.pF[k] = 1 - ss(seg(t, 0.2 + k * 0.17, 0.2 + k * 0.17 + 0.29)); st.telaF = 1 - ss(seg(t, 0, 0.22)); },
      corta: function (t) { st.ret3 = ss(seg(t, 0, 0.4)); st.cut = t > 0.55 ? 1 : 0; armReq = true; },
      etiquetas: function (t) { st.lm = t > 0.05 ? 1 : 0; fwd.push({ a: 'etiquetas' }); },
      ping: function (t, p, act) { if (act) st.tr = { a: 'ping', k: p.k, t: t }; }
    };
    function norm(anim) { return anim == null ? [] : Array.isArray(anim) ? anim.map(n1) : [n1(anim)]; }
    function n1(a) { return typeof a === 'string' ? { a: a } : a; }
    var fwd = [];
    function apl(anim, t, activo) {
      var mine = [], theirs = []; fwd = []; winF = [];
      norm(anim).forEach(function (a) {
        if (a.a === 'seq') { a.items.forEach(function (it) { apl(it.anim, seg(t, it.w[0], it.w[1]), activo); }); return; }
        (A[a.a] ? mine : theirs).push(a);
      });
      armReq = false;
      mine.forEach(function (a) { A[a.a](t, a, activo); });
      winF.forEach(function (q) { base.aplicar([{ a: 'conecta', fases: [q.f], inv: q.inv }], q.w, activo); });
      theirs = theirs.concat(fwd); if (armReq) theirs.push({ a: 'proteger', fases: [] });
      base.aplicar(theirs.length ? theirs : null, t, activo);
    }

    /* ---------- cámaras ---------- */
    var camaras = Object.assign({}, base.camaras, {
      zona2: { p: [3.9, 7.5, 5.4], t: [1.4, 6.75, 0.5] },
      ext1: { p: [3.8, 6.8, 6.0], t: [1.3, 6.4, 0.6] },
      vano: { p: [XF / 2, 7.4, 25], t: [XF / 2, 6.4, 0.6] },
      ext2: { p: [XF - 3.4, 8.0, 6.0], t: [XF - 1.3, 6.9, 0.6] }
    });

    var api = {
      camaras: camaras,
      configurar: function (o) { opt = Object.assign({ modo: 'b1', desconexion: false }, o || {}); cache = {}; construir(); api.reset(); },
      reset: function () { base.reset(); if (!X) return; st = defaults(); cache = {}; draw2(); },
      aplicar: function (anim, t, activo) { if (!X) { base.aplicar(null, t, activo); return; } if (activo) st.tr = null; apl(anim, t, activo); draw2(); },
      tema: function () { base.tema(); if (!X) return; aplicaTema(); draw2(); },
      dispose: function () { own.forEach(function (g) { g.dispose(); }); base.dispose && base.dispose(); }
    };
    return api;
  };
})();
