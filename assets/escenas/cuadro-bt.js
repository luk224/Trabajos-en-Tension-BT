/* ============================================================
   Escena «cuadro de baja tensión de un centro de transformación interior» para el procedimiento D.1
   (instalar un módulo portafusibles en un cuadro de BT).
   Eje x = anchura del cuadro, y = vertical (0 = suelo del CT), z = hacia la cámara. Unidades: metros.
   Todo el estado vive en `st`; las acciones solo modifican `st` y draw() lo vuelca a la escena →
   determinista y reversible (reset() + repetir acciones a t=1).
   Opción configurar({prot:'tela'|'rigido'}): protección de los zócalos (figuras 2 y 3 de la p. 83 del manual).
   Colores: solo paleta CSS (--e-*) vía ctx.pal(). Modelos GLB (NVIDIA SimReady, CC BY 4.0) bajo demanda.
   ============================================================ */
(function () {
  'use strict';
  window.TET = window.TET || {}; TET.escenas = TET.escenas || {};

  TET.escenas['cuadro-bt'] = function (ctx) {
    var T = ctx.THREE, scene = ctx.scene, pal = ctx.pal, pedir = ctx.pedir;
    var V = function (x, y, z) { return new T.Vector3(x, y, z); };
    var cl = function (x, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.min(b, Math.max(a, x)); };
    var seg = function (t, a, b) { return cl((t - a) / (b - a)); };
    var ss = function (x) { x = cl(x); return x * x * (3 - 2 * x); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var PI = Math.PI;
    function lerpA(a, b, t) { var d = ((b - a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return a + d * t; }

    /* ---------- geometría del cuadro ---------- */
    var FA = ['N', 'R', 'S', 'T'];
    var YB = [0.20, 1.42, 1.10, 0.78];                 // eje de cada pletina (R,S,T = centro del bloque de su fase)
    var XC = [-1.05, -0.35, 0.35, 1.05], SLOT = 2;     // columnas de zócalos; la 3.ª está vacía y recibe el módulo
    var XS = XC[SLOT], ZC = -2.0, ZB = -2.15;          // eje de las columnas y de las pletinas
    var XL = -1.55, XR = 1.42, FZ = 0.07;              // extremos de las pletinas; plano frontal local de los zócalos
    var YBOLT = [1.63, 0.55];                          // alturas de los tornillos de fijación al bastidor (arriba, abajo)
    var HEADZ = FZ + 0.02, APP = 0.30;                 // z local de una cabeza de tornillo montada; recorrido de aproximación
    var PAL0 = { x: 2.9, z: -1.35 }, HOV = { x: XS, z: -1.35 };   // palé del módulo y posición de «presentar»
    var WORK = V(XS, 0, -0.95);                        // sitio del trabajador frente a la columna vacía
    var LONA = { x: 1.7, z: 0.35 };

    var cor = (window.TET && TET.corriente) ? TET.corriente.crear(ctx) : null;   // puntos de corriente (ilustrativo)
    var opt = { prot: 'tela' };
    var G = null, O = null, st = null, own = [];
    var mats = {}, sprites = [], geos = {};

    function M(k, extra) {
      var key = k + (extra ? JSON.stringify(extra) : '');
      if (!mats[key]) { var m = new T.MeshLambertMaterial(Object.assign({ color: pal(k) }, extra || {})); m.userData.k = k; mats[key] = m; }
      return mats[key];
    }
    function Mt(k, op) { return M(k, { transparent: true, opacity: op == null ? 0.5 : op, depthWrite: false, side: T.DoubleSide }); }
    function MB(k) { var key = 'B' + k; if (!mats[key]) { var m = new T.MeshBasicMaterial({ color: pal(k) }); m.userData.k = k; mats[key] = m; } return mats[key]; }
    function MH() { if (!mats.HALO) { var m = new T.MeshBasicMaterial({ color: pal('halo'), side: T.DoubleSide, depthWrite: false }); m.userData.k = 'halo'; mats.HALO = m; } return mats.HALO; }
    var envTex = null;
    function env() {
      if (envTex) return envTex; var faces = [], f;
      for (f = 0; f < 6; f++) { var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 32);
        if (f === 2) { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#dfe6ee'); } else if (f === 3) { gr.addColorStop(0, '#59636d'); gr.addColorStop(1, '#3d454d'); } else { gr.addColorStop(0, '#f4f8fc'); gr.addColorStop(0.45, '#cfdbe6'); gr.addColorStop(0.55, '#5f6b76'); gr.addColorStop(1, '#8a97a3'); }
        g.fillStyle = gr; g.fillRect(0, 0, 32, 32); faces.push(c); }
      envTex = new T.CubeTexture(faces); envTex.needsUpdate = true; return envTex;
    }
    function MM(k) { var key = 'MM' + k; if (!mats[key]) { var m = new T.MeshStandardMaterial({ color: pal(k), metalness: 0.9, roughness: 0.3, envMap: env(), envMapIntensity: 1.2 }); m.userData.k = k; mats[key] = m; } return mats[key]; }
    function geo(key, fn) { return geos[key] || (geos[key] = fn()); }
    function box(w, h, d) { return geo('b' + w + ',' + h + ',' + d, function () { return new T.BoxGeometry(w, h, d); }); }
    function cylU(r, sg) { return geo('c' + r + ',' + (sg || 8), function () { return new T.CylinderGeometry(r, r, 1, sg || 8); }); }
    function cylX(r, len, sg) { return geo('cx' + r + ',' + len, function () { var g = new T.CylinderGeometry(r, r, len, sg || 10); g.rotateZ(PI / 2); return g; }); }
    function cylZ(r, len, sg) { return geo('cz' + r + ',' + len, function () { var g = new T.CylinderGeometry(r, r, len, sg || 10); g.rotateX(PI / 2); return g; }); }
    function sph(r, ws, hs) { return geo('s' + r + ',' + ws, function () { return new T.SphereGeometry(r, ws || 10, hs || 8); }); }
    function mk(g, m, x, y, z, parent) { var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(o); return o; }
    function grp(parent, x, y, z) { var g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }
    function ro(o, n) { o.traverse(function (x) { x.renderOrder = n; }); return o; }
    function halo(m, sx, sy, sz) { var o = new T.Mesh(m.geometry, MH()); o.renderOrder = -10; o.scale.set(sx || 1.3, sy || 1.3, sz || 1.3); m.add(o); return o; }   // aro claro para el conductor negro (S)
    var _d = V(0, 0, 0), UP = V(0, 1, 0);

    /* ---------- etiquetas ---------- */
    function etq(txt, k, w, h, tc, cw) {
      var c = document.createElement('canvas'); c.width = cw || 192; c.height = 96;
      var tex = new T.CanvasTexture(c); var mt = new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
      var s = new T.Sprite(mt); s.scale.set(w, h, 1); s.renderOrder = 20;
      var o = { s: s, c: c, tex: tex, txt: txt, k: k, tc: tc || 'blanco' }; sprites.push(o); dibujaEtq(o); return s;
    }
    function dibujaEtq(o) {
      var c = o.c, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
      var W = c.width, H = c.height, r = 20;
      g.fillStyle = pal(o.k); g.beginPath();
      if (o.txt === '✓') { g.arc(W / 2, H / 2, 40, 0, PI * 2); } else { g.moveTo(r, 6); g.lineTo(W - r, 6); g.quadraticCurveTo(W - 6, 6, W - 6, r); g.lineTo(W - 6, H - r); g.quadraticCurveTo(W - 6, H - 6, W - r, H - 6); g.lineTo(r, H - 6); g.quadraticCurveTo(6, H - 6, 6, H - r); g.lineTo(6, r); g.quadraticCurveTo(6, 6, r, 6); }
      g.fill(); g.lineWidth = 5; g.strokeStyle = pal('texto'); g.globalAlpha = 0.9; g.stroke(); g.globalAlpha = 1;
      var fc = pal(o.k), lum = 1; if (/^#[0-9a-f]{6}$/i.test(fc)) lum = (0.299 * parseInt(fc.substr(1, 2), 16) + 0.587 * parseInt(fc.substr(3, 2), 16) + 0.114 * parseInt(fc.substr(5, 2), 16)) / 255 > 0.6 ? 0 : 1;
      g.fillStyle = (o.tc === 'oscuro' || !lum) ? '#14181d' : '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (o.txt === '✓') { g.strokeStyle = '#fff'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(W / 2 - 20, H / 2 + 2); g.lineTo(W / 2 - 5, H / 2 + 18); g.lineTo(W / 2 + 22, H / 2 - 16); g.stroke(); }
      else { var fs = Math.min(64, Math.floor((W - 30) / (Math.max(o.txt.length, 2) * 0.6))); g.font = '800 ' + fs + 'px "Avenir Next Condensed","Bahnschrift","Arial Narrow",system-ui,sans-serif'; g.fillText(o.txt, W / 2, H / 2 + 3); }
      o.tex.needsUpdate = true;
    }

    /* ---------- persona (con postura agachada) ---------- */
    function persona(cascoK) {
      var g = new T.Group(), P = { g: g };
      P.hip = grp(g, 0, 0.92, 0);
      function pierna(x) {
        var th = grp(P.hip, x, 0, 0); mk(box(0.16, 0.45, 0.2), M('ropa2'), 0, -0.225, 0, th);
        var kn = grp(th, 0, -0.45, 0); mk(box(0.15, 0.45, 0.18), M('ropa2'), 0, -0.225, 0, kn); mk(box(0.19, 0.1, 0.3), M('viejo'), 0, -0.45, 0.05, kn);
        return { th: th, kn: kn };
      }
      P.lL = pierna(-0.1); P.lR = pierna(0.1);
      P.tor = grp(P.hip, 0, 0, 0);
      mk(box(0.4, 0.58, 0.24), M('ropa'), 0, 0.3, 0, P.tor);
      mk(sph(0.105, 10, 8), M('piel'), 0, 0.68, 0, P.tor);
      mk(geo('casco', function () { return new T.SphereGeometry(0.125, 10, 6, 0, PI * 2, 0, PI / 2); }), M(cascoK), 0, 0.70, 0, P.tor);
      mk(box(0.3, 0.025, 0.1), M(cascoK), 0, 0.705, 0.1, P.tor);
      P.visor = grp(P.tor, 0, 0.82, 0.1); mk(box(0.25, 0.2, 0.015), Mt('casco', 0.35), 0, -0.1, 0.05, P.visor);
      function brazo(x) {
        var a = grp(P.tor, x, 0.54, 0); mk(box(0.11, 0.6, 0.11), M('ropa'), 0, -0.3, 0, a); mk(box(0.1, 0.09, 0.1), M('piel'), 0, -0.64, 0, a);
        var gl = mk(box(0.14, 0.13, 0.14), M('guante'), 0, -0.65, 0, a); gl.visible = false; a.userData.gl = gl; return a;
      }
      P.aL = brazo(-0.26); P.aR = brazo(0.26);
      P.pose = function (o) {
        var c = o.cr || 0, w = o.w || 0;
        P.visor.rotation.x = o.visor == null ? 0 : o.visor; P.aL.userData.gl.visible = P.aR.userData.gl.visible = !!o.guantes;
        P.aL.rotation.set(o.armL || 0, 0, 0); P.aR.rotation.set(o.armR || 0, 0, 0);
        P.hip.position.y = lerp(0.92, 0.5, c); P.tor.rotation.x = c * 0.5;
        var sw = Math.sin(w) * 0.55 * (1 - c);
        P.lL.th.rotation.x = -c * 1.25 + sw; P.lR.th.rotation.x = -c * 1.25 - sw;
        P.lL.kn.rotation.x = c * 1.9; P.lR.kn.rotation.x = c * 1.9;
      };
      return P;
    }
    var _q = new T.Quaternion(), _v = V(0, 0, 0), _s = V(0, 0, 0);
    function armTo(arm, tgt) {      // orienta el brazo hacia el punto `tgt` (mundo); el modelo ya está en su sitio
      arm.getWorldPosition(_s); _v.subVectors(tgt, _s); if (_v.lengthSq() < 1e-6) return; _v.normalize();
      arm.parent.getWorldQuaternion(_q); _q.invert(); _v.applyQuaternion(_q);
      arm.rotation.set(Math.atan2(-_v.z, -_v.y), 0, Math.asin(cl(_v.x, -1, 1)));
    }

    /* ---------- modelos GLB (NVIDIA SimReady, CC BY 4.0) bajo demanda ---------- */
    var MBASE = (function () { var sc = document.querySelectorAll('script[src*="cuadro-bt.js"]'); return sc.length ? sc[0].src.replace('escenas/cuadro-bt.js', 'modelos/') : '../assets/modelos/'; })();
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
    function envolver(src, tam, eje) {
      var m = src.clone(true), b = new T.Box3().setFromObject(m), sz = b.getSize(V(0, 0, 0)), c = b.getCenter(V(0, 0, 0));
      var d = eje === 'x' ? sz.x : eje === 'y' ? sz.y : eje === 'z' ? sz.z : Math.max(sz.x, sz.y, sz.z);
      m.position.set(-c.x, -b.min.y, -c.z); var inner = new T.Group(); inner.add(m); inner.scale.setScalar(tam / d);
      var g = new T.Group(); g.add(inner); return g;
    }
    function ocultaHijos(g, n) { for (var i = 0; i < (n == null ? g.children.length : n); i++) g.children[i].visible = false; }
    function lazy() {
      var o = O, s = st;
      if (s.verif > 0.01 && !o.verG) { o.verG = 1;
        usar('bolsa_herramientas', function (src) { if (o !== O) return; var w = envolver(src, 0.5, 'z'); w.position.set(-0.7, 0.03, -0.1); o.lona.add(w); o.items[0].visible = false; });
        usar('guantes', function (src) { if (o !== O) return; var w = envolver(src, 0.3, 'x'); w.position.set(0.75, 0.03, -0.1); o.lona.add(w); o.items[5].visible = false; });
        usar('casco_pantalla', function (src) { if (o !== O) return; var w = envolver(src, 0.3, 'x'); w.position.set(-0.45, 0.03, 0.3); o.lona.add(w); });
      }
      if ((s.vial > 0.4 || s.cinta > 0.5) && !o.senG) { o.senG = 1; usar('senal_aviso', function (src) { if (o !== O) return;
        o.signs.forEach(function (sg) { ocultaHijos(sg); var w = envolver(src, 1.4, 'y'); sg.add(w); }); }); }
    }

    /* ---------- objetos metálicos del personaje (anclados al cuerpo) ---------- */
    var ITEMG = { chain: { glb: 'cadena_metalica', tam: 0.26, eje: 'max' }, pen: { glb: 'boligrafo_metal', tam: 0.15, eje: 'max' }, knife: { glb: 'navaja', tam: 0.12, eje: 'max' } };
    function buildItem(kind) {
      var g = new T.Group(), fb = grp(g), d = ITEMG[kind];
      if (kind === 'chain') { mk(geo('torusC', function () { return new T.TorusGeometry(0.1, 0.009, 6, 20, PI * 1.25); }), MM('metal'), 0, 0.0, 0, fb).rotation.z = PI * 1.375 - PI; mk(sph(0.028, 8, 6), MM('metal'), 0, -0.1, 0, fb); }
      else if (kind === 'pen') { mk(cylU(0.008, 8), MM('halo'), 0, 0, 0, fb).scale.set(1, 0.15, 1); mk(box(0.012, 0.04, 0.012), MM('halo'), 0.012, 0.045, 0, fb); }
      else if (kind === 'knife') { mk(box(0.1, 0.022, 0.012), MM('halo'), 0, 0, 0, fb); mk(box(0.045, 0.026, 0.016), M('texto'), -0.04, 0, 0, fb); }
      else if (kind === 'watch') { mk(cylU(0.068, 14), MM('metal'), 0, 0, 0, g).scale.set(1, 0.045, 1); mk(box(0.05, 0.022, 0.05), MM('metal'), 0, 0.0, 0.07, g); mk(box(0.036, 0.024, 0.036), M('texto'), 0, 0, 0.074, g); }
      else if (kind === 'bracelet') { mk(cylU(0.07, 14), MM('halo'), 0, 0, 0, g).scale.set(1, 0.025, 1); }
      else if (kind === 'ring') { mk(cylU(0.075, 14), MM('metal'), 0, 0, 0, g).scale.set(1, 0.022, 1); mk(sph(0.014, 8, 6), MM('halo'), 0, 0.0, 0.075, g); }
      else if (kind === 'buckle') { mk(box(0.1, 0.06, 0.02), MM('halo'), 0, 0, 0, g); mk(box(0.06, 0.03, 0.022), M('texto'), 0, 0, 0.004, g); }
      else if (kind === 'keys') { mk(geo('torusK', function () { return new T.TorusGeometry(0.025, 0.005, 6, 14); }), MM('halo'), 0, 0, 0, g); [-0.012, 0.012].forEach(function (x, q) { mk(box(0.012, 0.06, 0.004), MM(q ? 'metal' : 'halo'), x, -0.045, 0, g); mk(box(0.025, 0.012, 0.004), MM(q ? 'metal' : 'halo'), x, -0.07, 0, g); }); }
      if (d) usar(d.glb, function (src) {
        function tune(w) { w.traverse(function (o) { if (o.isMesh && o.material) { var m = o.material.clone(); m.envMap = env(); m.metalness = 0.85; m.roughness = 0.32; o.material = m; } }); return w; }
        if (kind === 'chain') {
          [-1, 1].forEach(function (k) { var h = tune(envolver(src, d.tam, d.eje)); h.scale.setScalar(0.55); h.rotation.z = -k * 0.75; h.position.set(k * 0.05, 0, 0); g.add(h); });
          mk(sph(0.022, 8, 6), MM('metal'), 0, -0.075, 0.0, g);
        } else { var w = tune(envolver(src, d.tam, d.eje)); if (kind === 'pen') w.rotation.z = PI / 2; g.add(w); }
        fb.visible = false;
      });
      return g;
    }
    var SPEC = [
      ['chain', 'tor', [0, 0.52, 0.125], [-0.3, 0, 0]], ['pen', 'tor', [0.13, 0.42, 0.13], [0, 0, 0.05]], ['knife', 'tor', [-0.22, -0.01, 0.1], [0, 0.4, 0]],
      ['watch', 'aL', [0, -0.5, 0], [0, 0, 0]], ['bracelet', 'aR', [0, -0.5, 0], [0, 0, 0]], ['ring', 'aL', [0, -0.68, 0], [0, 0, 0]],
      ['buckle', 'tor', [0, 0.01, 0.13], [0, 0, 0]], ['keys', 'tor', [0.2, 0.0, 0.11], [0, 0, 0]]];
    var LAY = { chain: [PI / 2, 0, 0], pen: [0, 0, PI / 2], knife: [0, 0, 0], watch: [PI / 2, 0, 0], bracelet: [PI / 2, 0, 0], ring: [PI / 2, 0, 0], buckle: [PI / 2, 0, 0], keys: [PI / 2, 0, 0] };
    function anclaMetal(P, who) {
      SPEC.forEach(function (sp, k) {
        var anchor = sp[1] === 'tor' ? P.tor : sp[1] === 'aL' ? P.aL : P.aR, att = buildItem(sp[0]), fr = buildItem(sp[0]);
        att.position.set(sp[2][0], sp[2][1], sp[2][2]); att.rotation.set(sp[3][0], sp[3][1], sp[3][2]); anchor.add(att);
        fr.visible = false; O.lona.add(fr);
        O.mi.push({ att: att, fr: fr, kind: sp[0], t0: 0.22 + k * 0.06 + who * 0.03, slot: V(-0.2 + 0.1 * k, 0.07, who ? -0.44 : -0.31), rot0: sp[3] });
      });
    }

    /* ---------- piezas del cuadro ---------- */
    function cabeza(parent, x, y, z) {   // cabeza de tornillo (acero) con ranura
      var g = grp(parent, x, y, z); mk(cylZ(0.026, 0.02, 12), MM('halo'), 0, 0, 0, g); mk(box(0.04, 0.007, 0.004), M('texto'), 0, 0, 0.011, g); return g;
    }
    /* columna de zócalos (tres bases R, S, T apiladas + extremo superior + pieza de bornes), coordenadas locales: x=0 en el eje, z=0 en el eje */
    function columna(esMod) {
      var g = new T.Group(), o = { g: g, heads: [], bolts: [] }, q;
      mk(box(0.12, 1.455, 0.10), M('ropa2'), 0, 1.0375, 0, g);
      mk(box(0.22, 0.18, 0.14), M('nuevo'), 0, 1.675, 0, g);
      mk(box(0.028, 0.06, 0.025), M('texto'), 0, 1.715, FZ + 0.0025, g);
      [1, 2, 3].forEach(function (b) {
        var y = YB[b];
        mk(box(0.22, 0.31, 0.14), M('nuevo'), 0, y, 0, g);
        mk(box(0.028, 0.08, 0.025), M('texto'), 0, y + 0.10, FZ + 0.0025, g);
        mk(cylZ(0.034, 0.025, 16), M('texto'), 0, y + 0.005, FZ + 0.0025, g);
        mk(cylZ(0.012, 0.025, 10), M('texto'), 0, y - 0.05, FZ + 0.0025, g);
        [-1, 1].forEach(function (sx) { mk(box(0.05, 0.05, 0.04), MM('metal'), sx * 0.06, y - 0.115, FZ + 0.005, g); mk(box(0.025, 0.09, 0.042), MM('metal'), sx * 0.03, y - 0.095, FZ + 0.005, g); });
        var h = cabeza(g, 0, y + 0.005, HEADZ); h.visible = !esMod; o.heads.push(h);
      });
      mk(box(0.22, 0.30, 0.14), M('nuevo'), 0, 0.46, 0, g);
      for (q = 0; q < 2; q++) {
        var by = YBOLT[q], bh = cabeza(g, 0, by, HEADZ); bh.visible = !esMod; o.bolts.push(bh);
      }
      [0, 1, 2].forEach(function (j) {
        var lx = -0.07 + 0.07 * j, lug = mk(box(0.045, 0.07, 0.03), M(FA[j + 1]), lx, 0.40, FZ + 0.0075, g);
        if (j === 1) halo(lug, 1.3, 1.2, 1.5);
        mk(cylZ(0.012, 0.012, 8), MM('metal'), lx, 0.40, FZ + 0.0225, g);
        if (!esMod) { var cb = mk(cylU(0.016, 6), M(FA[j + 1]), lx, 0.195, FZ + 0.03, g); cb.scale.set(1, 0.35, 1); if (j === 1) halo(cb, 1.5, 1, 1.5); }
      });
      return o;
    }
    /* protección de un trozo de columna: tela aislante (cilindro, fig. 2 p. 83) o protector rígido (prisma, fig. 3 p. 83). Devuelve un grupo centrado en (x, yc, z) */
    function proteccion(parent, x, y0, y1, zc) {
      var h = y1 - y0, yc = (y0 + y1) / 2, gp = grp(parent, x, yc, zc);
      if (opt.prot === 'tela') {
        mk(geo('telaC' + h.toFixed(3), function () { return new T.CylinderGeometry(0.19, 0.19, h, 20, 1, true); }), Mt('tela', 0.42), 0, 0, 0.0, gp);
      } else {
        var bg = geo('rigB' + h.toFixed(3), function () { return new T.BoxGeometry(0.34, h, 0.2); });
        mk(bg, Mt('aisl', 0.3), 0, 0, 0.04, gp);
        var ln = new T.LineSegments(geo('rigE' + h.toFixed(3), function () { return new T.EdgesGeometry(bg); }), new T.LineBasicMaterial({ color: pal('aisl') }));
        ln.material.userData = { k: 'aisl' }; mats['L' + gp.id] = ln.material; ln.position.set(0, 0, 0.04); gp.add(ln);
      }
      ro(gp, 3); return gp;
    }
    function dedalX(parent, x, y, z) {   // dedal aislante sobre el extremo libre de una pletina (eje +x)
      var g = grp(parent, x, y, z), m = Mt('aisl', 0.7);
      mk(geo('dedXc', function () { var q = new T.CylinderGeometry(0.062, 0.062, 0.15, 14, 1, true); q.rotateZ(PI / 2); return q; }), m, -0.075, 0, 0, g);
      mk(geo('dedXs', function () { var q = new T.SphereGeometry(0.062, 14, 8, 0, PI * 2, 0, PI / 2); q.rotateZ(-PI / 2); return q; }), m, 0, 0, 0, g);
      mk(geo('dedXr', function () { var q = new T.TorusGeometry(0.062, 0.009, 6, 14); q.rotateY(PI / 2); return q; }), M('aisl'), -0.15, 0, 0, g);
      return ro(g, 4);
    }
    function senal(x, z, ry, parent) {   // pie con triángulo de aviso (el GLB lo sustituye al cargar)
      var g = grp(parent, x, 0, z); g.rotation.y = ry || 0;
      mk(cylU(0.03, 6), M('texto'), 0, 0.7, 0, g).scale.set(1, 1.4, 1);
      var t = mk(geo('tri2', function () { return new T.CircleGeometry(0.6, 3); }), MB('marca'), 0, 1.4, 0, g); t.rotation.z = PI / 2;
      g.visible = false; return g;
    }
    function rayas() {   // cinta de balizamiento a rayas (colores de la paleta)
      var c = document.createElement('canvas'); c.width = 64; c.height = 16; var g = c.getContext('2d');
      g.fillStyle = pal('marca'); g.fillRect(0, 0, 64, 16); g.fillStyle = pal('texto');
      for (var i = -1; i < 4; i++) { g.beginPath(); g.moveTo(i * 16, 16); g.lineTo(i * 16 + 8, 16); g.lineTo(i * 16 + 24, 0); g.lineTo(i * 16 + 16, 0); g.fill(); }
      var t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; return t;
    }

    /* ---------- construcción ---------- */
    function construir() {
      if (G) { scene.onBeforeRender = function () {}; scene.remove(G); own.forEach(function (g) { g.dispose(); }); own = []; sprites = []; }
      if (cor) cor.clear();
      G = new T.Group(); scene.add(G); O = { extras: [] };
      var i, k, j;
      /* centro de transformación interior (vista seccionada: sin techo ni pared delantera) */
      mk(box(160, 0.3, 160), M('suelo'), 0, -0.27, 0, G);
      mk(box(11.4, 0.3, 6.2), M('poste'), 0, -0.15, 0.5, G);
      mk(box(2.9, 0.3, 70), M('poste'), 6.95, -0.19, 0, G);
      mk(box(7, 0.3, 70), M('calzada'), 11.8, -0.23, 0, G);
      O.wB = [mk(box(11.4, 3.2, 0.2), M('edificio'), 0, 1.6, -2.6, G)];
      O.wL = [mk(box(0.2, 3.2, 6.2), M('edificio'), -5.6, 1.6, 0.5, G)];
      O.wR = [mk(box(0.2, 3.2, 3.4), M('edificio'), 5.6, 1.6, -0.9, G), mk(box(0.2, 3.2, 1.4), M('edificio'), 5.6, 1.6, 2.9, G), mk(box(0.2, 0.9, 1.4), M('edificio'), 5.6, 2.75, 1.5, G)];
      scene.onBeforeRender = function (r, sc, cam) {   // se ocultan las paredes que quedan entre la cámara y el interior (pared trasera, lateral izquierda y derecha)
        var q = cam.position, on = function (a, v) { a.forEach(function (m) { m.visible = v; }); };
        on(O.wB, q.z > -2.5); on(O.wL, q.x > -5.5); on(O.wR, q.x < 5.5);
      };
      var door = mk(box(1.4, 2.3, 0.05), M('cgp'), 6.4, 1.15, 2.225, G); door.visible = true;   // puerta abierta hacia la acera
      mk(box(3.2, 0.02, 0.4), M('ropa2'), 0, 0.01, -1.55, G);                                      // canal de cables bajo el cuadro
      /* transformador (contexto: de sus bornas de BT sale la alimentación del cuadro) */
      mk(box(1.4, 1.5, 1.4), M('ropa2'), -4.1, 0.75, -1.6, G);
      for (i = 0; i < 9; i++) mk(box(0.12, 1.15, 0.025), M('cgp'), -4.1 - 0.62 + i * 0.155, 0.7, -0.89, G);
      [-1.95, -1.6, -1.25].forEach(function (z) { mk(cylU(0.05, 10), M('nuevo'), -4.1, 1.7, z, G).scale.set(1, 0.4, 1); });
      for (i = 0; i < 4; i++) {
        mk(cylX(0.05, 0.2, 10), M('nuevo'), -3.3, YB[i], ZB, G);                                   // borna de BT
        var cab = mk(cylX(0.03, 1.65, 10), M(FA[i]), (-3.2 + XL) / 2, YB[i], ZB, G); if (i === 2) halo(cab, 1, 1.45, 1.45);
      }
      /* celda de MT al fondo (contexto) */
      mk(box(1.6, 2.0, 1.0), M('cgp'), 4.1, 1.0, -2.0, G); mk(box(1.2, 1.5, 0.02), M('ropa2'), 4.1, 1.0, -1.49, G);
      var tri = mk(geo('tri', function () { return new T.CircleGeometry(0.1, 3); }), MB('marca'), 4.1, 1.6, -1.47, G); tri.rotation.z = PI / 2;
      /* cuadro de baja tensión: caja metálica sin puertas ni tapas frontales (para ver el interior) */
      mk(box(3.2, 1.8, 0.03), M('cgp'), 0, 1.0, -2.3, G);
      [-1, 1].forEach(function (sx) { mk(box(0.03, 1.8, 0.57), M('cgp'), sx * 1.585, 1.0, -2.015, G); mk(box(0.06, 1.8, 0.06), M('cgp'), sx * 1.62, 1.0, -1.76, G); });
      mk(box(3.3, 0.1, 0.62), M('ropa2'), 0, 0.05, -2.0, G);
      mk(box(3.26, 0.06, 0.06), M('cgp'), 0, 1.87, -1.76, G); mk(box(3.26, 0.06, 0.06), M('cgp'), 0, 0.16, -1.76, G);
      YBOLT.forEach(function (y) { mk(box(3.14, 0.07, 0.04), M('cgp'), 0, y, -2.12, G); });         // bastidor: travesaños a los que se fija el módulo
      O.lbCuadro = etq('CUADRO DE B.T.', 'ropa2', 1.5, 0.19, null, 480); O.lbCuadro.position.set(0, 2.4, -1.8); G.add(O.lbCuadro);
      O.lbZoc = etq('Zócalos', 'ropa2', 0.62, 0.2, null, 256); O.lbZoc.position.set(-0.95, 2.05, -1.7); O.lbZoc.visible = false; G.add(O.lbZoc);
      O.lbMod = etq('Módulo', 'ropa2', 0.62, 0.2, null, 256); O.lbMod.visible = false; G.add(O.lbMod);
      /* pletinas del embarrado (N, R, S, T), con sus apoyos aislantes */
      O.sl = []; var xm = (XL + XR) / 2;
      for (i = 0; i < 4; i++) {
        var br = mk(box(XR - XL, 0.06, 0.02), M(FA[i]), xm, YB[i], ZB, G); if (i === 2) halo(br, 1, 1.4, 1.6);
        [-1.3, 1.3].forEach(function (x) { mk(cylZ(0.022, 0.11, 8), M('nuevo'), x, YB[i], -2.23, G); });
        var spans = [[XL, XS - 0.2], [XS - 0.2, XS + 0.2], [XS + 0.2, XR - 0.16]];
        O.sl.push(spans.map(function (sp) { var m = mk(box(sp[1] - sp[0], 0.1, 0.06), Mt('tela', 0.42), (sp[0] + sp[1]) / 2, YB[i], ZB, G); m.renderOrder = 2; return m; }));
      }
      O.ded = []; for (i = 0; i < 4; i++) { var dd = dedalX(G, XR, YB[i], ZB); dd.visible = false; O.ded.push(dd); }
      /* columnas de zócalos existentes y su protección */
      O.cols = []; O.wrapN = [];
      XC.forEach(function (x, c) {
        if (c === SLOT) return;
        var co = columna(false); co.g.position.set(x, 0, ZC); G.add(co.g); O.cols.push(co);
        var w = proteccion(G, x, 0.27, 1.79, ZC); w.visible = false; O.wrapN.push(w);
      });
      /* módulo portafusibles que se instala */
      O.mod = columna(true); O.mod.g.position.set(PAL0.x, -0.18, PAL0.z); G.add(O.mod.g);
      O.pale = mk(box(0.5, 0.12, 0.4), M('aislador'), PAL0.x, 0.06, PAL0.z, G);
      O.mw = [[1.58, 1.79], [1.26, 1.575], [0.94, 1.255], [0.62, 0.935], [0.27, 0.615]].map(function (r) { var p = proteccion(O.mod.g, 0, r[0], r[1], 0); p.visible = false; return p; });
      O.mod.heads.forEach(function (h) { h.visible = false; });
      O.mod.bolts.forEach(function (h) { h.visible = false; });
      /* alfombras aislantes sobre las masas accesibles (bastidor) y en el suelo */
      O.alf = [];
      function al(w, h, d, x, y, z) { var m = mk(box(w, h, d), Mt('aisl', 0.55), x, y, z, G); m.renderOrder = 3; m.visible = false; O.alf.push(m); return m; }
      al(2.0, 0.02, 1.1, 0.35, 0.015, -1.1);                                  // 0 suelo
      al(0.1, 1.8, 0.1, -1.62, 1.0, -1.76); al(0.1, 1.8, 0.1, 1.62, 1.0, -1.76);   // 1,2 montantes
      al(3.3, 0.1, 0.1, 0, 1.87, -1.76); al(3.3, 0.1, 0.1, 0, 0.16, -1.76);   // 3,4 largueros
      [YBOLT[0], YBOLT[1]].forEach(function (y) {                              // 5-7 travesaño superior (A,M,B); 8-10 inferior
        al(XS - 0.2 + 1.57, 0.1, 0.025, (-1.57 + XS - 0.2) / 2, y, -2.0875); al(0.4, 0.1, 0.025, XS, y, -2.0875); al(1.57 - XS - 0.2, 0.1, 0.025, (XS + 0.2 + 1.57) / 2, y, -2.0875);
      });
      /* herramienta: destornillador aislado */
      O.tool = grp(G, 0, 0, 0); O.tool.visible = false;
      mk(cylZ(0.006, 0.14, 8), MM('halo'), 0, 0, 0.07, O.tool); mk(cylZ(0.021, 0.13, 10), M('aisl'), 0, 0, 0.205, O.tool); mk(cylZ(0.022, 0.03, 10), M('texto'), 0, 0, 0.13, O.tool);
      /* trabajadores */
      O.w = persona('casco'); G.add(O.w.g); O.ay = persona('casco2'); G.add(O.ay.g);
      /* señalización vial (calle fuera de la puerta del CT) */
      O.van = grp(G, 10.3, 0, 40);
      mk(box(1.8, 1.7, 3.4), M('furgo'), 0, 1.15, 0, O.van); mk(box(1.78, 1.2, 1.2), M('furgo'), 0, 0.95, -2.2, O.van);
      mk(box(1.5, 0.45, 0.04), M('ropa2'), 0, 1.2, -2.81, O.van);
      [[0.95, -1.1], [0.95, 1.1], [-0.95, -1.1], [-0.95, 1.1], [0.95, -2.4], [-0.95, -2.4]].forEach(function (w) { mk(cylX(0.36, 0.2, 10), M('ropa2'), w[0], 0.36, w[1], O.van); });
      mk(box(0.3, 0.18, 0.5), M('cono'), 0, 2.1, -0.4, O.van); mk(box(1.84, 0.12, 3.44), M('cono'), 0, 0.55, 0, O.van);
      O.van.visible = false;
      O.cones = []; for (i = 0; i < 4; i++) { var cn = mk(geo('cono', function () { return new T.ConeGeometry(0.17, 0.6, 8); }), M('cono'), 10.2 - i * 0.35, 0.3, 5.0 + i * 1.7, G); cn.visible = false; O.cones.push(cn); }
      O.signs = [];
      O.sgV = senal(8.8, 12.8, -PI / 2, G); O.signs.push(O.sgV);
      /* delimitación del lugar de trabajo (cinta de balizamiento y postes) */
      var rt = rayas(); own.push(rt);
      O.poles = []; O.tapes = [];
      var PZ = [[-2.4, 1.5], [-2.4, -1.8], [3.2, -1.8], [3.2, 1.5]];
      PZ.forEach(function (p) { var g = grp(G, p[0], 0, p[1]); mk(cylU(0.15, 14), M('ropa2'), 0, 0.02, 0, g).scale.set(1, 0.04, 1); mk(cylU(0.025, 8), M('ropa2'), 0, 0.5, 0, g); g.visible = false; O.poles.push(g); });
      [[0, 1, 0, 1], [2, 3, 0, 1], [3, 0, 0, 0.143], [3, 0, 0.536, 1]].forEach(function (s) {   // lado frontal con hueco de entrada
        var a = PZ[s[0]], b = PZ[s[1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        [0.95, 0.65].forEach(function (yy) {
          var g = grp(G, lerp(a[0], b[0], s[2]), yy, lerp(a[1], b[1], s[2])); g.rotation.y = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
          var tm = new T.MeshBasicMaterial({ map: rt.clone() }); tm.map.needsUpdate = true; tm.map.repeat.set(L * (s[3] - s[2]) / 0.3, 1); tm.map.wrapS = T.RepeatWrapping; own.push(tm.map);
          var t = mk(geo('tapeU', function () { var q = new T.BoxGeometry(1, 0.05, 0.012); q.translate(0.5, 0, 0); return q; }), tm, 0, 0, 0, g); t.userData.L = L * (s[3] - s[2]); t.visible = false; O.tapes.push(t);
        });
      });
      O.sgC = senal(-2.0, 1.9, PI / 8, G); O.signs.push(O.sgC);
      /* lona con equipos a verificar, bandeja y objetos metálicos */
      O.lona = grp(G, LONA.x, 0, LONA.z); O.lona.visible = false;
      mk(box(1.9, 0.02, 1.0), M('lona'), 0, 0.02, 0, O.lona);
      O.items = [
        mk(box(0.34, 0.14, 0.2), M('aislador'), -0.7, 0.1, -0.1, O.lona),                  // bolsa portaherramientas
        mk(cylX(0.07, 0.5, 8), Mt('tela', 0.8), -0.2, 0.1, 0.25, O.lona),                  // tela aislante
        mk(cylX(0.045, 0.7, 8), Mt('aisl', 0.8), 0.0, 0.07, 0.12, O.lona),                 // alfombras aislantes (enrolladas)
        mk(sph(0.07, 8, 6), Mt('aisl', 0.8), 0.45, 0.08, 0.3, O.lona), mk(sph(0.07, 8, 6), Mt('aisl', 0.8), 0.6, 0.08, 0.3, O.lona),   // dedales aislantes
        mk(box(0.14, 0.05, 0.2), M('guante'), 0.75, 0.06, -0.1, O.lona)];
      var pz = grp(O.lona, 0.15, 0.04, 0.4);                                                 // pinzas aislantes
      [-1, 1].forEach(function (sg) { var b = mk(cylX(0.012, 0.5, 6), MM('halo'), 0, 0, 0.012 * sg, pz); b.rotation.y = sg * 0.06; mk(cylX(0.02, 0.18, 8), M('aisl'), -0.3, 0, 0.02 * sg, pz); });
      O.pinzasLona = pz; O.items.push(pz);
      O.checks = O.items.map(function (m) { var s = etq('✓', 'ok', 0.34, 0.17); s.position.set(m.position.x, 0.55, m.position.z); s.visible = false; O.lona.add(s); return s; });
      mk(box(0.95, 0.02, 0.34), M('ropa2'), 0.25, 0.035, -0.37, O.lona); mk(box(0.95, 0.05, 0.02), M('ropa2'), 0.25, 0.06, -0.54, O.lona); mk(box(0.95, 0.05, 0.02), M('ropa2'), 0.25, 0.06, -0.2, O.lona);
      mk(box(0.02, 0.05, 0.34), M('ropa2'), -0.22, 0.06, -0.37, O.lona); mk(box(0.02, 0.05, 0.34), M('ropa2'), 0.72, 0.06, -0.37, O.lona);
      O.mi = []; anclaMetal(O.w, 0); anclaMetal(O.ay, 1);
      O.bolsa = mk(sph(0.28, 8, 6), M('techo'), 0, 0, 0, G); O.bolsa.visible = false;
      /* efectos transitorios */
      O.sol = mk(sph(1.3, 12, 8), MB('sol'), -8, 9, -8, G); O.sol.visible = false;
      O.nube = grp(G, 0, 0, 0); O.nube.visible = false;
      [[0, 0, 0, 1.2], [1.2, -0.2, 0.3, 0.9], [-1.1, -0.3, 0, 0.9]].forEach(function (c) { mk(sph(c[3], 10, 8), M('nube'), c[0], c[1], c[2], O.nube); });
      O.okSol = etq('✓', 'ok', 1.2, 0.6); O.okSol.position.set(-8, 6.4, -7); O.okSol.visible = false; G.add(O.okSol);
      O.ring = mk(geo('ring', function () { var g = new T.RingGeometry(0.75, 0.9, 32); g.rotateX(-PI / 2); return g; }), MB('marca'), 0, 0.05, 0, G); O.ring.visible = false;
      O.flecha = mk(geo('fl', function () { var g = new T.ConeGeometry(0.28, 0.7, 4); g.rotateX(PI); return g; }), MB('marca'), 0, 2.7, 0, G); O.flecha.visible = false;
      if (cor) caminos();
      O.hemi = new T.HemisphereLight(0xffffff, 0x8899aa, 0.62); G.add(O.hemi);
      O.sun = new T.DirectionalLight(0xffffff, 0.55); O.sun.position.set(-6, 14, 10); G.add(O.sun);
      aplicaTema();
    }
    /* ---------- corriente (puntos): del transformador, por las pletinas, hacia las salidas de las columnas existentes ---------- */
    function pcol(k) { return k === 3 ? 'ropa2' : FA[k]; }   // los puntos de T (gris) llevan color oscuro para distinguirse
    function caminos() {
      var i, c, j;
      for (i = 0; i < 4; i++) cor.addPath('emb-' + FA[i], [V(-3.2, YB[i], ZB + 0.05), V(XR - 0.2, YB[i], ZB + 0.05)], pcol(i), { size: 0.15, dens: 5 });   // x crece = aguas abajo (del transformador hacia el final del embarrado)
      XC.forEach(function (x, cc) {
        if (cc === SLOT) return;
        for (j = 0; j < 3; j++) cor.addPath('sal-' + cc + '-' + FA[j + 1], [V(x - 0.07 + 0.07 * j, 0.34, ZC + FZ + 0.06), V(x - 0.07 + 0.07 * j, 0.03, ZC + FZ + 0.06)], pcol(j + 1), { size: 0.085, dens: 16, speed: 0.5 });
      });
    }
    function aplicaTema() {
      Object.keys(mats).forEach(function (k) { if (mats[k].userData && mats[k].userData.k && mats[k].color) mats[k].color.set(pal(mats[k].userData.k)); });
      sprites.forEach(dibujaEtq);
      var f = pal('fondo'); scene.background = new T.Color(f); scene.fog = new T.Fog(new T.Color(f), 45, 110);
      if (O && O.hemi) { O.hemi.intensity = 0.62; O.sun.intensity = 0.55; O.hemi.groundColor.set(0x8899aa); }
    }

    /* ---------- estado por defecto ---------- */
    function defaults() {
      return { tr: null, chk: 0, vial: 0, cinta: 0, verif: 0, guardar: 0, metal: 0, epi: 0, bolsaT: 0,
        alf: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alfOpen: [0, 0], pz: [0, 0, 0], pl: [0, 0, 0, 0], plOpen: [0, 0, 0], dedT: 0,
        mx: PAL0.x, mz: PAL0.z, my: -0.18, mwrap: 0, mwOpen: [0, 0, 0, 0, 0], bolt: [0, 0], scr: [0, 0, 0], lbZ: 0, lbM: 0,
        tool: { u: 0, tip: V(XS, YB[1], ZC + FZ + 0.02 + APP), spin: 0, on: 0 },
        w: { x: 0.8, z: 2.3, ry: PI, wk: 0, a: 0, cr: 0, tl: null, tr: null, work: false }, ay: { x: 1.8, z: 2.3, ry: PI, wk: 0, a: 0, tl: null, tr: null } };
    }
    /* mueve a la persona P de `a` a `b` (u de 0 a 1); mira hacia donde camina y termina orientada a ry */
    function ir(P, u, a, b, ry) {
      var q = ss(u), moved = Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.01, head = moved ? Math.atan2(b[0] - a[0], b[1] - a[1]) : ry;
      P.x = lerp(a[0], b[0], q); P.z = lerp(a[1], b[1], q);
      P.ry = u >= 1 ? ry : lerpA(head, ry, ss(seg(u, 0.8, 1)));
      P.wk = (u > 0 && u < 1 && moved) ? u * 16 : 0;
    }

    /* ---------- volcado del estado ---------- */
    var cache = {};
    function chg(key, val) { if (cache[key] === val) return false; cache[key] = val; return true; }
    function draw() {
      var s = st, i, k, e;
      /* señalización vial */
      var vv = s.vial, vVan = ss(seg(vv, 0, 0.55)), vCon = seg(vv, 0.45, 1);
      O.van.visible = vVan > 0.001; O.van.position.z = lerp(40, 1.5, vVan);
      for (i = 0; i < 4; i++) { var cs = ss(seg(vCon, i * 0.2, i * 0.2 + 0.4)); O.cones[i].visible = cs > 0.01; O.cones[i].scale.setScalar(Math.max(0.001, cs)); }
      O.sgV.visible = vCon > 0.85;
      /* delimitación */
      for (i = 0; i < O.poles.length; i++) { var ps = ss(seg(s.cinta, i * 0.1, i * 0.1 + 0.3)); O.poles[i].visible = ps > 0.01; O.poles[i].scale.setScalar(Math.max(0.001, ps)); }
      O.tapes.forEach(function (t, q) { var ts = ss(seg(s.cinta, 0.3 + (q >> 1) * 0.11, 0.5 + (q >> 1) * 0.11)); t.visible = ts > 0.01; t.scale.x = Math.max(0.001, t.userData.L * ts); });
      O.sgC.visible = s.cinta > 0.85;
      /* alfombras */
      O.alf.forEach(function (a, q) {
        var v = s.alf[q], op = q === 6 ? s.alfOpen[0] : q === 9 ? s.alfOpen[1] : 0;   // ventana del travesaño en el punto de fijación del módulo
        a.visible = v > 0.01 && op < 0.5; a.scale.set(1, Math.max(0.001, ss(v)), q === 0 ? 1 : Math.max(0.001, ss(v)));
      });
      /* protecciones de los zócalos existentes y de las pletinas */
      O.wrapN.forEach(function (w, q) { var v = ss(s.pz[q]); w.visible = v > 0.01; w.scale.setScalar(Math.max(0.001, v)); });
      for (i = 0; i < 4; i++) O.sl[i].forEach(function (m, p) {
        var v = ss(s.pl[i]), op = (p === 1 && i > 0) ? s.plOpen[i - 1] : 0;
        m.visible = v > 0.01 && op < 0.5; m.scale.set(1, Math.max(0.001, v), Math.max(0.001, v));
      });
      O.ded.forEach(function (d) { var v = ss(s.dedT); d.visible = v > 0.01; d.scale.setScalar(Math.max(0.001, v)); });
      /* módulo portafusibles */
      O.mod.g.position.set(s.mx, s.my, s.mz);
      O.mw.forEach(function (p, q) { var v = ss(s.mwrap); p.visible = v > 0.01 && s.mwOpen[q] < 0.5; p.scale.setScalar(Math.max(0.001, v)); });
      for (i = 0; i < 3; i++) { var h = O.mod.heads[i], sc = s.scr[i]; h.visible = sc > 0.001; h.position.z = HEADZ + APP * (1 - ss(sc)); h.rotation.z = sc * 18; }
      for (i = 0; i < 2; i++) { var b = O.mod.bolts[i], sb = s.bolt[i]; b.visible = sb > 0.001; b.position.z = HEADZ + APP * (1 - ss(sb)); b.rotation.z = sb * 18; }
      O.lbMod.visible = s.lbM > 0.5; O.lbMod.position.set(s.mx, s.my + 2.0, s.mz + 0.3); O.lbZoc.visible = s.lbZ > 0.5;
      /* personas */
      var w = O.w, ay = O.ay, W = s.w, Y = s.ay, epi = ss(s.epi);
      var T0 = s.tool, tipW = V(T0.tip.x, T0.tip.y, T0.tip.z), handle = V(tipW.x, tipW.y, tipW.z + 0.2), working = T0.u > 0.5 && W.work;
      var cr = W.cr;
      if (working) {   // el trabajador se coloca a la distancia del brazo del mango y se agacha según la altura del tornillo
        var wp = workPos(handle); cr = wp.cr; W.x = wp.x; W.z = wp.z; W.ry = PI;
      }
      w.g.position.set(W.x, 0, W.z); w.g.rotation.y = W.ry;
      w.pose({ visor: lerp(-1.6, 0, epi), guantes: epi > 0.4, cinto: false, w: W.wk, armL: W.a, armR: W.a, cr: cr });
      ay.g.position.set(Y.x, 0, Y.z); ay.g.rotation.y = Y.ry;
      ay.pose({ visor: lerp(-1.6, 0, epi), guantes: epi > 0.4, cinto: false, w: Y.wk, armL: Y.a, armR: Y.a });
      G.updateMatrixWorld(true);
      if (working) { armTo(w.aR, handle); armTo(w.aL, V(XS + 0.2, handle.y, ZC + FZ + 0.2)); }
      else { if (W.tr) armTo(w.aR, W.tr); if (W.tl) armTo(w.aL, W.tl); }
      if (Y.tr) armTo(ay.aR, Y.tr); if (Y.tl) armTo(ay.aL, Y.tl);
      /* herramienta (destornillador): de la lona a la mano y de vuelta */
      var lp = V(LONA.x + 0.2, 0.05, LONA.z + 0.1);
      var tu = ss(T0.u), tp = V(lerp(lp.x, tipW.x, tu), lerp(lp.y, tipW.y, tu) + 0.4 * Math.sin(tu * PI), lerp(lp.z, tipW.z, tu));
      O.tool.visible = (T0.u > 0.001 || (s.verif > 0.4 && s.guardar < 0.5));
      O.tool.position.copy(tp);
      O.tool.rotation.set(0, lerp(-PI / 2, 0, tu), 0);
      /* vial/lona/objetos metálicos/bolsa */
      var vi = ss(seg(s.verif, 0, 0.35)) * (1 - ss(s.guardar));
      O.lona.visible = vi > 0.01; O.lona.scale.setScalar(Math.max(0.001, vi));
      O.checks.forEach(function (ck, q) { ck.visible = s.chk > 0 && s.verif > 0.4 + q * 0.08 && s.guardar < 0.5; });
      G.updateMatrixWorld(true);
      O.mi.forEach(function (it) {
        var u = ss(seg(s.metal, it.t0, it.t0 + 0.35));
        it.att.visible = u <= 0;
        it.fr.visible = u > 0 && O.lona.visible;
        if (u <= 0) it.from = null;
        if (u > 0) {
          if (u < 1 && !it.from) { it.att.getWorldPosition(_s); it.from = O.lona.worldToLocal(_s.clone()); }
          if (u >= 1) it.from = null;
          var f = it.from || it.slot;
          it.fr.position.set(lerp(f.x, it.slot.x, u), lerp(f.y, it.slot.y, u) + 0.5 * Math.sin(u * PI), lerp(f.z, it.slot.z, u));
          var ly = LAY[it.kind]; it.fr.rotation.set(lerp(it.rot0[0], ly[0], u), lerp(it.rot0[1], ly[1], u), lerp(it.rot0[2], ly[2], u));
        }
      });
      var bb = s.bolsaT; O.bolsa.visible = bb > 0.02 && bb < 0.98;
      var b1 = ss(seg(bb, 0, 0.35)), b2 = ss(seg(bb, 0.45, 1));
      O.bolsa.position.set(lerp(1.0, 10.5, b2), lerp(0.28, 1.1, b2), lerp(0.7, 2.0, b2)); O.bolsa.scale.setScalar(Math.max(0.001, b1 * (1 - 0.7 * b2)));
      lazy();
      corriente();
      drawTr();
      pedir();
    }
    function corriente() {
      if (!cor) return;
      var i, c, j;
      for (i = 0; i < 4; i++) cor.setLive('emb-' + FA[i], 1);   // pletinas y cables de entrada: siempre en tensión
      XC.forEach(function (x, cc) { if (cc === SLOT) return; for (j = 0; j < 3; j++) cor.setLive('sal-' + cc + '-' + FA[j + 1], 1); });   // salidas de las columnas ya instaladas
      cor.refresh();
    }
    function drawTr() {
      var tr = st.tr, a = tr && tr.a, t = tr ? tr.t : 0, p = tr ? tr.p : {};
      O.sol.visible = O.nube.visible = O.okSol.visible = false; O.ring.visible = O.flecha.visible = false;
      if (!a) return;
      if (a === 'clima') {
        O.sol.visible = true; O.nube.visible = true; O.nube.position.set(lerp(-8, -24, ss(seg(t, 0.15, 1))), 9, -8); O.okSol.visible = t > 0.8;
      } else if (a === 'identificar') {
        O.ring.visible = true; O.ring.position.set(0, 0.06, -1.1); var r = 1 + 0.1 * Math.sin(t * PI * 4); O.ring.scale.set(2.2 * r, 1, 1.0 * r);
        O.flecha.visible = true; O.flecha.position.set(0, 2.9 + 0.25 * Math.sin(t * PI * 6), -1.9);
      } else if (a === 'barrido') {
        O.ring.visible = true; O.ring.scale.set(0.9, 1, 0.9); O.ring.position.set(lerp(-1.6, 1.6, ss(t)), 0.05, -1.2);
      }
    }

    /* ---------- acciones ---------- */
    var U = function (t, p) { return p && p.inv ? 1 - t : t; };
    var HI = [2.95, 0.35], HP = [2.9, -0.78], H2 = [1.6, -0.9], W0 = [0.8, 2.3], H0 = [1.8, 2.3];
    function workPos(handle) {   // sitio y agachado del trabajador para alcanzar con el brazo el mango del destornillador
      var cr = cl((1.46 - (handle.y + 0.3)) / 0.49, 0, 1), dy = (1.46 - 0.49 * cr) - handle.y, fw = Math.sqrt(Math.max(0.02, 0.62 * 0.62 - dy * dy - 0.26 * 0.26));
      return { x: handle.x + 0.26, z: handle.z + fw + 0.28 * cr, cr: cr };
    }
    function bloque(t, n, i) { return seg(t, i / n, (i + 1) / n); }
    function toolTip(tip, kind, i, ins) {   // la punta del destornillador va con la cabeza del tornillo i (kind 's' conexión, 'b' fijación)
      var y = kind === 's' ? YB[i + 1] + 0.005 : YBOLT[i];
      tip.set(XS, y, ZC + HEADZ + APP * (1 - ss(ins)) + 0.012);
    }
    var A = {
      identificar: function (t, p, act) { if (act) st.tr = { a: 'identificar', t: t }; },
      clima: function (t, p, act) { if (act) st.tr = { a: 'clima', t: t }; },
      vial: function (t, p) { st.vial = ss(U(t, p)); },
      delimitar: function (t, p) { st.cinta = U(t, p); },
      inspeccion: function (t, p, act) { if (act) st.tr = { a: 'barrido', t: t }; },
      verificar: function (t) { st.verif = t; st.chk = 1; },
      metal: function (t) { st.metal = t; st.chk = 0; var f = ss(seg(t, 0, 0.2)); st.w.ry = lerpA(PI, 0, f); st.ay.ry = lerpA(PI, 0, f); },
      epi: function (t) { st.epi = t; st.w.ry = 0; st.ay.ry = 0; },
      desecho: function (t) { st.bolsaT = t; },
      /* ejecución */
      aislarMasas: function (t) {
        ir(st.w, seg(t, 0, 0.3), W0, [WORK.x, WORK.z], PI); ir(st.ay, seg(t, 0, 0.35), H0, HI, -PI / 2);
        st.w.a = -0.7 * ss(seg(t, 0.3, 0.4));
        var f = function (a, b) { return ss(seg(t, a, b)); };
        st.alf[0] = f(0.3, 0.5); st.alf[1] = st.alf[2] = f(0.45, 0.65); st.alf[3] = st.alf[4] = f(0.6, 0.78);
        st.alf[5] = st.alf[7] = st.alf[8] = st.alf[10] = f(0.72, 0.9); st.alf[6] = st.alf[9] = f(0.8, 1);
      },
      protZocalos: function (t, p, act) {
        st.w.a = -0.7; st.lbZ = act ? 1 : 0;
        [0, 1, 2].forEach(function (q) { st.pz[q] = ss(seg(t, q * 0.12, q * 0.12 + 0.3)); });
        [0, 1, 2, 3].forEach(function (q) { st.pl[q] = ss(seg(t, 0.4 + q * 0.09, 0.4 + q * 0.09 + 0.25)); });
        st.dedT = ss(seg(t, 0.8, 1));
      },
      situaZocalo: function (t, p, act) {
        st.w.a = -0.5; st.lbM = 1;
        var c = seg(t, 0.35, 0.85), lift = ss(seg(c, 0, 0.2)), sd = ss(seg(c, 0, 0.25)), e = ss(seg(c, 0.1, 1));
        st.mwrap = ss(seg(t, 0.15, 0.35));
        st.mx = lerp(PAL0.x, HOV.x, e); st.mz = lerp(PAL0.z, HOV.z, e); st.my = lerp(-0.18, 0, lift);
        var Y = st.ay; Y.tl = Y.tr = null; Y.a = 0; Y.wk = 0;
        if (t < 0.15) ir(Y, seg(t, 0, 0.15), HI, HP, PI);
        else if (t < 0.35) { Y.x = HP[0]; Y.z = HP[1]; Y.ry = PI; Y.tl = Y.tr = V(PAL0.x, 1.0, PAL0.z + 0.05); }
        else if (t < 0.85) { Y.x = st.mx + 0.6 * sd; Y.z = st.mz + 0.57 * (1 - sd); Y.ry = lerpA(PI, -PI / 2, sd); Y.wk = c * 18; Y.a = -1.0; }
        else ir(Y, seg(t, 0.85, 1), [HOV.x + 0.6, HOV.z], H2, PI);
        st.w.tl = st.w.tr = (t > 0.7) ? V(XS, 1.1, HOV.z + 0.2) : null;
      },
      presenta: function (t, p, act) {
        var push = ss(seg(t, 0, 0.4)), back = ss(seg(t, 0.42, 0.5)), W = st.w;
        st.mz = lerp(HOV.z, ZC, push); st.mx = XS; st.my = 0; st.lbM = t < 1 ? 1 : 0;
        W.x = WORK.x; W.ry = PI; W.wk = 0; W.a = 0; W.cr = 0; W.z = lerp(lerp(WORK.z, -1.25, push), WORK.z, back);
        W.tl = W.tr = (t < 0.45) ? V(XS, 1.1, st.mz + 0.2) : null;
        // fijación al bastidor: tornillo superior (0.5-0.75) e inferior (0.75-1)
        var b0 = seg(t, 0.5, 0.75), b1 = seg(t, 0.75, 1);
        st.tool.u = ss(seg(t, 0.45, 0.55)); W.work = t >= 0.5;
        var op = function (b) { return ss(seg(b, 0.05, 0.25)) * (1 - ss(seg(b, 0.8, 0.95))); };
        st.alfOpen[0] = op(b0); st.alfOpen[1] = op(b1); st.mwOpen[0] = op(b0); st.mwOpen[4] = op(b1);
        st.bolt[0] = ss(seg(b0, 0.25, 0.8)); st.bolt[1] = ss(seg(b1, 0.25, 0.8));
        if (b1 <= 0) toolTip(st.tool.tip, 'b', 0, st.bolt[0]);
        else {
          var a0 = V(0, 0, 0), a1 = V(0, 0, 0); toolTip(a0, 'b', 0, 1); toolTip(a1, 'b', 1, st.bolt[1]);
          if (b1 < 0.2) { var a2 = V(0, 0, 0); toolTip(a2, 'b', 1, 0); st.tool.tip.lerpVectors(a0, a2, ss(b1 / 0.2)); } else st.tool.tip.copy(a1);
        }
      },
      tornillos: function (t, p, act) {
        var W = st.w; W.work = true; W.a = 0; W.tl = W.tr = null; st.lbM = 0; st.tool.u = 1; st.mz = ZC; st.mx = XS; st.my = 0;
        st.alfOpen[0] = st.alfOpen[1] = 0; st.mwOpen[0] = st.mwOpen[4] = 0; st.bolt[0] = st.bolt[1] = 1;
        var curK = Math.min(2, Math.floor(t * 3)), k;
        for (k = 0; k < 3; k++) {
          var b = bloque(t, 3, k), o = ss(seg(b, 0.1, 0.3)) * (1 - ss(seg(b, 0.82, 0.97)));
          st.plOpen[k] = o; st.mwOpen[k + 1] = o; st.scr[k] = b >= 1 ? 1 : (b > 0 ? Math.max(0.002, ss(seg(b, 0.3, 0.8))) : 0);
        }
        var bc = bloque(t, 3, curK), a0 = V(0, 0, 0), a1 = V(0, 0, 0);
        if (bc < 0.2) { if (curK === 0) toolTip(a0, 'b', 1, 1); else toolTip(a0, 's', curK - 1, 1); toolTip(a1, 's', curK, 0); st.tool.tip.lerpVectors(a0, a1, ss(bc / 0.2)); }
        else toolTip(st.tool.tip, 's', curK, st.scr[curK]);
      },
      retiraProt: function (t) {
        var W = st.w; W.work = false; W.a = -0.7; W.tl = W.tr = null;
        var hp = workPos(V(XS, YB[3] + 0.005, ZC + HEADZ + 0.012 + 0.2)), sb = ss(seg(t, 0, 0.15));
        W.x = lerp(hp.x, WORK.x, sb); W.z = lerp(hp.z, WORK.z, sb); W.cr = lerp(hp.cr, 0, sb); W.ry = PI; W.wk = 0;
        st.tool.tip.set(XS, YB[3] + 0.005, ZC + HEADZ + 0.012); st.tool.u = 1 - ss(seg(t, 0, 0.25));
        st.mwrap = 1 - ss(seg(t, 0.1, 0.3));
        [0, 1, 2].forEach(function (q) { st.pz[q] = 1 - ss(seg(t, 0.25 + q * 0.06, 0.25 + q * 0.06 + 0.2)); });
        [0, 1, 2, 3].forEach(function (q) { st.pl[q] = 1 - ss(seg(t, 0.42 + q * 0.05, 0.42 + q * 0.05 + 0.2)); });
        st.dedT = 1 - ss(seg(t, 0.6, 0.74));
        var f = function (a, b) { return 1 - ss(seg(t, a, b)); };
        st.alf[5] = st.alf[6] = st.alf[7] = st.alf[8] = st.alf[9] = st.alf[10] = f(0.64, 0.8); st.alf[3] = st.alf[4] = f(0.72, 0.86); st.alf[1] = st.alf[2] = f(0.78, 0.92); st.alf[0] = f(0.86, 1);
        st.mwOpen = [0, 0, 0, 0, 0]; st.plOpen = [0, 0, 0];
      },
      /* finales */
      inspFinal: function (t, p, act) {
        retiradoTodo(); ir(st.w, seg(t, 0, 0.4), [WORK.x, WORK.z], [XS, -0.2], PI); st.w.a = 0;
        if (act) st.tr = { a: 'barrido', t: seg(t, 0.35, 1) };
      },
      guardar: function (t) {
        retiradoTodo(); st.guardar = t; st.w.x = XS; st.w.z = -0.2; st.w.ry = PI; ir(st.ay, seg(t, 0, 0.4), H2, HI, -PI / 2);
        st.tool.on = 0; st.tool.u = 0;
      }
    };
    function retiradoTodo() {   // estado final de la ejecución: sin protecciones; el módulo, atornillado
      st.alf = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; st.pz = [0, 0, 0]; st.pl = [0, 0, 0, 0]; st.dedT = 0; st.mwrap = 0;
      st.mx = XS; st.mz = ZC; st.my = 0; st.scr = [1, 1, 1]; st.bolt = [1, 1]; st.lbM = 0; st.lbZ = 0;
      st.w.work = false; st.w.tl = st.w.tr = null; st.w.cr = 0; st.tool.u = 0; st.ay.x = H2[0]; st.ay.z = H2[1]; st.ay.ry = PI; st.ay.tl = st.ay.tr = null; st.ay.a = 0;
    }
    function norm(anim) { return anim == null ? [] : Array.isArray(anim) ? anim.map(n1) : [n1(anim)]; }
    function n1(a) { return typeof a === 'string' ? { a: a } : a; }

    /* ---------- cámaras ---------- */
    var camaras = {
      general: { p: [4.8, 4.6, 9.0], t: [0.4, 0.9, -1.0] },
      cielo: { p: [1.5, 3.0, 8], t: [-3, 8, -4] },
      vial: { p: [5.8, 3.2, 14.5], t: [9.6, 0.6, 4.5] },
      cuadro: { p: [-2.0, 2.4, 3.0], t: [0.0, 1.0, -2.0] },
      trabajo: { p: [-1.6, 2.1, 2.3], t: [0.3, 1.15, -2.0] },
      carga: { p: [-0.4, 2.6, 3.9], t: [1.4, 0.9, -1.4] },
      lona: { p: [3.9, 2.4, 3.1], t: [1.9, 0.2, 0.1] },
      objetos: { p: [3.6, 2.4, 5.8], t: [1.6, 0.9, 1.3] },
      desecho: { p: [5.8, 4.2, 12.5], t: [5.6, 0.8, 1.2] },
      suelo2: { p: [1.6, 2.0, 6.8], t: [1.6, 1.0, 2.3] },
      detObjetos: { p: [0.8, 1.3, 4.1], t: [0.8, 1.1, 2.3], fov: 36 },
      detObjetosAy: { p: [1.8, 1.3, 4.1], t: [1.8, 1.1, 2.3], fov: 36 },
      detBandeja: { p: [2.4, 0.95, 1.5], t: [1.95, 0.08, 0.0], fov: 34 },
      detZocalos: { p: [-1.0, 1.1, 1.0], t: [0.0, 1.0, -2.0], fov: 42 },
      detProt: { p: [-1.5, 1.3, 0.3], t: [-0.35, 0.95, -2.0], fov: 38 },
      detModulo: { p: [-1.0, 1.5, -0.2], t: [XS, 1.0, -1.35], fov: 40 },
      detBastidor: { p: [-0.6, 2.0, -0.7], t: [XS, 1.68, -2.0], fov: 28 },
      detTornillo: { p: [-0.55, 1.3, -0.8], t: [XS, 1.1, -2.0], fov: 28 },
      detDedales: { p: [1.9, 1.15, -0.9], t: [XR - 0.05, 1.0, ZB], fov: 30 }
    };

    var hid = [];
    var api = {
      corriente: cor,
      camaras: camaras,
      configurar: function (o) { opt = Object.assign({ prot: 'tela' }, o || {}); cache = {}; construir(); api.reset(); },
      reset: function () { st = defaults(); cache = {}; draw(); },
      aplicar: function (anim, t, activo) {
        if (activo) st.tr = null;
        norm(anim).forEach(function (a) { var f = A[a.a]; if (f) f(t, a, activo); else if (window.console) console.warn('acción desconocida', a.a); });
        draw();
      },
      detVista: function (on) { if (on) { hid = []; sprites.forEach(function (o) { if (o.s.visible) { o.s.visible = false; hid.push(o.s); } }); } else { hid.forEach(function (x) { x.visible = true; }); hid = []; } },
      tema: function () { aplicaTema(); if (cor) cor.refrescaColores(); draw(); },
      _dbg: function () { return { O: O, GL: GL, st: st }; },
      dispose: function () { own.forEach(function (g) { g.dispose(); }); if (cor) cor.dispose(); }
    };
    return api;
  };
})();
