/* ============================================================
   Escena «cala de red subterránea de BT» para los procedimientos C.1, C.2 y C.3.
   Eje x = dirección de la zanja (cala), y = vertical (0 = acera, −1 = fondo de la cala),
   z = hacia la cámara. Unidades: metros. Todo el estado vive en `st`; las acciones solo
   modifican `st` y draw() lo vuelca a la escena → determinista y reversible.
   Modos (configurar({modo})):
     c1 · cuatro cables unipolares pasantes; acometida de cuatro unipolares que se conectan encima
     c2 · cable tetrapolar pasante (aislamiento seco) con ventana de trabajo; acometida de cuatro unipolares
     c3 · cuatro unipolares pasantes que se seccionan; entrada y salida de la caja de acometida
          y puente auxiliar (con interruptor o unipolar, opción puente:'interruptor'|'unipolar')
   Colores: solo paleta CSS (--e-*) vía ctx.pal(). Los modelos GLB (NVIDIA SimReady, CC BY 4.0)
   se cargan bajo demanda; si fallan queda la pieza procedural.
   ============================================================ */
(function () {
  'use strict';
  window.TET = window.TET || {}; TET.escenas = TET.escenas || {};

  TET.escenas['red-subterranea'] = function (ctx) {
    var T = ctx.THREE, scene = ctx.scene, pal = ctx.pal, pedir = ctx.pedir;
    var V = function (x, y, z) { return new T.Vector3(x, y, z); };
    var cl = function (x, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.min(b, Math.max(a, x)); };
    var seg = function (t, a, b) { return cl((t - a) / (b - a)); };
    var ss = function (x) { x = cl(x); return x * x * (3 - 2 * x); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var PI = Math.PI;

    /* ---------- geometría ---------- */
    var FA = ['N', 'R', 'S', 'T'];
    var ZP = [-0.9, -0.65, -0.4, -0.15];       // z de cada cable unipolar pasante (c1, c3); N al fondo
    var YC = -0.715;                            // eje de los cables unipolares sobre los tacos
    var Z2 = -0.55, Y2 = -0.65;                 // eje del cable tetrapolar (c2)
    var XJ1 = 0.35;                             // punto de conexión (c1)
    var XJ3 = 0.42, XB = 1.0;                    // c3: conexiones de entrada/salida (±XJ3) y extremos del puente (±XB)
    var CGX = 5.4, CGY = 1.3, CGZ = -3.45, AYT = [4.6, -2.8];   // caja general de protección (fachada) o armario de la caja de acometida (c3); AYT = sitio del ayudante junto a la caja
    var YT = -1.0;                              // fondo de la cala

    var cor = window.TET && TET.corriente ? TET.corriente.crear(ctx) : null;   // puntos animados = conductor en tensión (ilustrativo)
    var opt = { modo: 'c1', puente: 'interruptor', fin: 'resina' };
    var G = null, O = null, st = null, own = [];
    var mats = {}, sprites = [], geos = {};

    function M(k, extra) {
      var key = k + (extra ? JSON.stringify(extra) : '');
      if (!mats[key]) { var m = new T.MeshLambertMaterial(Object.assign({ color: pal(k) }, extra || {})); m.userData.k = k; mats[key] = m; }
      return mats[key];
    }
    function Mt(k, op) { return M(k, { transparent: true, opacity: op == null ? 0.5 : op, depthWrite: false, side: T.DoubleSide }); }
    function MB(k) { var key = 'B' + k; if (!mats[key]) { var m = new T.MeshBasicMaterial({ color: pal(k) }); m.userData.k = k; mats[key] = m; } return mats[key]; }
    var envTex = null;
    function env() {
      if (envTex) return envTex; var faces = [], f;
      for (f = 0; f < 6; f++) { var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 32);
        if (f === 2) { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#dfe6ee'); } else if (f === 3) { gr.addColorStop(0, '#2a2f36'); gr.addColorStop(1, '#1a1d22'); } else { gr.addColorStop(0, '#f4f8fc'); gr.addColorStop(0.5, '#8a97a5'); gr.addColorStop(1, '#2a2f36'); }
        g.fillStyle = gr; g.fillRect(0, 0, 32, 32); faces.push(c); }
      envTex = new T.CubeTexture(faces); envTex.needsUpdate = true; return envTex;
    }
    function MM(k) { var key = 'MM' + k; if (!mats[key]) { var m = new T.MeshStandardMaterial({ color: pal(k), metalness: 0.9, roughness: 0.28, envMap: env(), envMapIntensity: 1.15 }); m.userData.k = k; mats[key] = m; } return mats[key]; }
    function geo(key, fn) { return geos[key] || (geos[key] = fn()); }
    function box(w, h, d) { return geo('b' + w + ',' + h + ',' + d, function () { return new T.BoxGeometry(w, h, d); }); }
    function cylU(r, sg) { return geo('c' + r + ',' + (sg || 8), function () { return new T.CylinderGeometry(r, r, 1, sg || 8); }); }
    function cylX(r, len, sg) { return geo('cx' + r + ',' + len, function () { var g = new T.CylinderGeometry(r, r, len, sg || 10); g.rotateZ(PI / 2); return g; }); }
    function cylZ(r, len, sg) { return geo('cz' + r + ',' + len, function () { var g = new T.CylinderGeometry(r, r, len, sg || 10); g.rotateX(PI / 2); return g; }); }
    function sph(r, ws, hs) { return geo('s' + r + ',' + ws, function () { return new T.SphereGeometry(r, ws || 10, hs || 8); }); }
    function mk(g, m, x, y, z, parent) { var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(o); return o; }
    function grp(parent, x, y, z) { var g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }
    var _d = V(0, 0, 0), UP = V(0, 1, 0);
    function place(m, a, b) {            // coloca un cilindro unidad entre a y b
      _d.subVectors(b, a); var L = _d.length();
      if (L < 1e-3) { m.visible = false; return; }
      m.visible = true; m.position.copy(a).addScaledVector(_d, 0.5);
      m.quaternion.setFromUnitVectors(UP, _d.normalize()); m.scale.set(1, L, 1);
    }
    function tubo(n, rad, mat, halo) {
      var R = 5, g = new T.BufferGeometry(), idx = [], i, j;
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * R * 3), 3));
      for (i = 0; i < n - 1; i++) for (j = 0; j < R; j++) {
        var a = i * R + j, b = i * R + (j + 1) % R, c = (i + 1) * R + j, d = (i + 1) * R + (j + 1) % R; idx.push(a, c, b, b, c, d);
      }
      g.setIndex(idx); var m = new T.Mesh(g, mat); m.frustumCulled = false; m.userData.rad = rad; m.userData.R = R; own.push(g);
      if (halo) { var hm = tubo(n, rad * 1.18, MH()); m.userData.halo = hm; m.add(hm); }
      return m;
    }
    var _t = V(0, 0, 0), _n1 = V(0, 0, 0), _n2 = V(0, 0, 0);
    function MH() { if (!mats.HALO) { var m = new T.MeshBasicMaterial({ color: pal('halo'), side: T.BackSide, polygonOffset: true, polygonOffsetFactor: 3, polygonOffsetUnits: 3 }); m.userData.k = 'halo'; mats.HALO = m; } return mats.HALO; }
    function contorno(m, k) { var o = new T.Mesh(m.geometry, MH()); o.scale.set(k || 1.3, 1, k || 1.3); m.add(o); return o; }   // aro claro para el conductor negro
    function poly(arr, pts, counts) {   // rellena pts a lo largo de una poligonal (vértices incluidos)
      var k = 0, sg, j;
      for (sg = 0; sg < arr.length - 1; sg++) for (j = 0; j < counts[sg]; j++) { var u = j / counts[sg]; pts[k++].set(lerp(arr[sg].x, arr[sg + 1].x, u), lerp(arr[sg].y, arr[sg + 1].y, u), lerp(arr[sg].z, arr[sg + 1].z, u)); }
      pts[k].copy(arr[arr.length - 1]);
    }
    function tuboSet(m, pts) {
      if (m.userData.halo) tuboSet(m.userData.halo, pts);
      var g = m.geometry, pos = g.attributes.position.array, R = m.userData.R, r = m.userData.rad, n = pts.length, i, j, k = 0;
      for (i = 0; i < n; i++) {
        _t.subVectors(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)]);
        if (_t.lengthSq() < 1e-8) _t.set(1, 0, 0);
        _t.normalize();
        _n1.set(-_t.z, 0, _t.x); if (_n1.lengthSq() < 1e-4) _n1.set(1, 0, 0); _n1.normalize();
        _n2.crossVectors(_t, _n1);
        for (j = 0; j < R; j++) {
          var a = j / R * PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
          pos[k++] = pts[i].x + ca * _n1.x + sa * _n2.x; pos[k++] = pts[i].y + ca * _n1.y + sa * _n2.y; pos[k++] = pts[i].z + ca * _n1.z + sa * _n2.z;
        }
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
    }
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

    function dedal(parent) { var g = grp(parent); mk(cylU(0.055, 10), Mt('aisl', 0.8), 0, -0.06, 0, g).scale.set(1, 0.12, 1); mk(sph(0.055, 10, 8), Mt('aisl', 0.8), 0, 0, 0, g); return g; }
    function conector(r, len, parent) {
      var g = grp(parent); mk(cylX(r, len, 12), MM('metal'), 0, 0, 0, g);
      [-1, 1].forEach(function (k) { mk(box(0.03, 0.03, 0.03), MM('metal'), k * len * 0.25, r + 0.012, 0, g); mk(cylX(r * 1.15, 0.014, 12), MM('metal'), k * len * 0.5, 0, 0, g); });
      return g;
    }
    function cinta(parent) {
      var g = grp(parent); mk(cylX(0.058, 0.22, 12), M('ropa2'), 0, 0, 0, g);
      [-2, -1, 0, 1, 2].forEach(function (k) { mk(cylX(0.063, 0.014, 12), M('ropa2'), k * 0.045, 0, 0, g); });
      return g;
    }

    /* ---------- persona (con postura agachada para trabajar en la cala) ---------- */
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
      P.belt = mk(box(0.43, 0.07, 0.26), M('aislador'), 0, 0.01, 0, P.tor); P.belt.visible = false;
      function brazo(x) {
        var a = grp(P.tor, x, 0.54, 0); mk(box(0.11, 0.6, 0.11), M('ropa'), 0, -0.3, 0, a); mk(box(0.1, 0.09, 0.1), M('piel'), 0, -0.64, 0, a);
        var gl = mk(box(0.14, 0.13, 0.14), M('guante'), 0, -0.65, 0, a); gl.visible = false; a.userData.gl = gl; return a;
      }
      P.aL = brazo(-0.26); P.aR = brazo(0.26);
      P.pose = function (o) {
        var c = o.cr || 0, w = o.w || 0;
        P.visor.rotation.x = o.visor == null ? 0 : o.visor; P.aL.userData.gl.visible = P.aR.userData.gl.visible = !!o.guantes; P.belt.visible = !!o.cinto;
        P.aL.rotation.x = o.armL || 0; P.aR.rotation.x = o.armR || 0;
        P.hip.position.y = lerp(0.92, 0.5, c); P.tor.rotation.x = c * 0.5;
        var sw = Math.sin(w) * 0.55 * (1 - c);
        P.lL.th.rotation.x = -c * 1.25 + sw; P.lR.th.rotation.x = -c * 1.25 - sw;
        P.lL.kn.rotation.x = c * 1.9; P.lR.kn.rotation.x = c * 1.9;
      };
      return P;
    }

    /* ---------- modelos GLB (NVIDIA SimReady, CC BY 4.0) bajo demanda ---------- */
    var MBASE = (function () { var sc = document.querySelectorAll('script[src*="red-subterranea.js"]'); return sc.length ? sc[0].src.replace('escenas/red-subterranea.js', 'modelos/') : '../assets/modelos/'; })();
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
      if (s.valla > 0.01 && !o.valG) { o.valG = 1;
        usar('valla', function (src) { if (o !== O) return; o.val.forEach(function (pg) { ocultaHijos(pg); pg.add(envolver(src, 1.12, 'x')); }); });
      }
      if (s.verif > 0.01 && !o.verG) { o.verG = 1;
        usar('bolsa_herramientas', function (src) { if (o !== O) return; var w = envolver(src, 0.5, 'z'); w.position.set(-0.7, 0.03, 0); o.lona.add(w); o.items[0].visible = false; });
        usar('guantes', function (src) { if (o !== O) return; var w = envolver(src, 0.3, 'x'); w.position.set(0.75, 0.03, -0.1); o.lona.add(w); o.items[4].visible = false; });
        usar('casco_pantalla', function (src) { if (o !== O) return; var w = envolver(src, 0.3, 'x'); w.position.set(-0.45, 0.03, 0.3); o.lona.add(w); });
      }
      if (s.vial > 0.4 && !o.senG) { o.senG = 1; usar('senal_aviso', function (src) { if (o !== O) return;
        var w = envolver(src, 1.4, 'y'); w.position.set(-13.0, 0, 4.6); w.rotation.y = PI / 2; w.visible = false; G.add(w); o.senM = w; }); }
      if (s.tr && s.tr.a === 'pinza' && !o.pinG) { o.pinG = 1; usar('pinza_amperimetrica', function (src) { if (o !== O) return;
        var w = envolver(src, 0.62, 'x'); w.rotation.x = -PI / 2; var g = new T.Group(); g.add(w); g.position.set(0, -0.08, 0.05);
        ocultaHijos(o.pinza, 2); o.pinza.add(g); }); }
    }

    /* ---------- puntos de conexión ---------- */
    function bell(x) { return Math.abs(x) >= 0.9 ? 0 : (1 + Math.cos(PI * x / 0.9)) / 2; }
    var XJ2 = [-0.3, -0.1, 0.1, 0.3];           // c2: x de cada conexión sobre su conductor
    function corePos(i, x, sp, fl) {             // c2: posición del alma i del cable tetrapolar en x
      var b = bell(x), a = i * PI / 2 + PI / 4, r = 0.035 + 0.028 * fl;
      var ry = Math.sin(a) * r, rz = Math.cos(a) * r, py = 0.02, pz = (i - 1.5) * 0.2;
      return V(x, Y2 + lerp(ry, py, sp) * b, Z2 + lerp(rz, pz, sp) * b);
    }
    /* lista de conductores de acometida: {i fase, S inicio (en la pared), J punto de conexión, F extremo libre, side} */
    function listaAcom() {
      var out = [], i;
      for (i = 0; i < 4; i++) {
        if (opt.modo === 'c1') out.push({ i: i, side: 0, S: V(2.4 + 0.07 * i, -0.55, -1.2), J: V(XJ1, YC, ZP[i]), F: V(XJ1 + 0.1, YC + 0.48, ZP[i] + 0.6) });
        else if (opt.modo === 'c2') { var j = corePos(i, XJ2[i], 1, 1); out.push({ i: i, side: 0, S: V(0.15 + 0.07 * i, -0.6, -1.2), J: j, F: V(j.x + 0.1, j.y + 0.5, j.z + 0.62) }); }
        else {
          /* entrada (x>0) y salida (x<0): llegan desde la pared delantera por carriles ordenados, sin cruces, y terminan sobre el extremo cortado */
          [1, -1].forEach(function (sd) {
            var xe = 0.55 + 0.1 * (3 - i), ye = YC + 0.13 + 0.035 * (3 - i), P2 = V(sd * XJ3, ye, ZP[i] + 0.09);
            out.push({ i: i, side: sd, S: V(sd * xe, ye, 1.2), J: V(sd * XJ3, YC, ZP[i]), F: P2.clone(), pl: [V(sd * xe, ye, 1.2), V(sd * xe, ye, ZP[i] + 0.09), P2] });
          });
        }
      }
      return out;
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
        if (kind === 'chain') {   /* dos ramales en V + colgante: la cadena cuelga del cuello */
          [-1, 1].forEach(function (k) { var h = tune(envolver(src, d.tam, d.eje)); h.scale.setScalar(0.55); h.rotation.z = -k * 0.75; h.position.set(k * 0.05, 0, 0); g.add(h); });
          mk(sph(0.022, 8, 6), MM('metal'), 0, -0.075, 0.0, g);
        } else { var w = tune(envolver(src, d.tam, d.eje)); if (kind === 'pen') w.rotation.z = PI / 2; g.add(w); }
        fb.visible = false;
      });
      return g;
    }
    var SPEC = [   /* kind, ancla, posición, rotación (x,y,z) */
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

    /* ---------- construcción ---------- */
    function construir() {
      if (G) { scene.remove(G); own.forEach(function (g) { g.dispose(); }); own = []; sprites = []; }
      if (cor) cor.clear();
      G = new T.Group(); scene.add(G); O = { extras: [] };
      var i, k, md = opt.modo;
      ZP = md === 'c3' ? [-1.0, -0.68, -0.36, -0.04] : [-0.9, -0.65, -0.4, -0.15];   // en c3 las fases van más separadas para que se lean el puente y los conductores
      if (md === 'c3') { CGX = 1.6; CGY = 0.95; CGZ = 2.9; AYT = [0.75, 3.5]; } else { CGX = 5.4; CGY = 1.3; CGZ = -3.45; AYT = [CGX - 0.8, -2.8]; }
      /* acera, calzada, cala */
      mk(box(70, 0.3, 2.4), M('poste'), 0, -0.15, -2.4, G);                 // acera trasera
      mk(box(70, 0.3, 2.2), M('poste'), 0, -0.15, 2.3, G);                  // acera delantera
      mk(box(70, 0.3, 6.2), M('calzada'), 0, -0.15, 6.5, G);                // calzada
      mk(box(70, 0.3, 30), M('suelo'), 0, -0.16, 25, G);
      mk(box(70, 1.0, 0.14), M('viejo'), 0, -0.5, -1.27, G); mk(box(70, 1.0, 0.14), M('viejo'), 0, -0.5, 1.27, G);
      mk(box(70, 0.1, 2.6), M('viejo'), 0, -1.05, 0, G);
      for (k = -4; k <= 4; k++) { mk(box(0.12, 0.25, 1.0), M('aislador'), k * 1.2, -0.875, md === 'c2' ? -0.55 : -0.52, G); }   // tacos de madera
      /* fachada y caja */
      mk(box(30, 7, 4), M('edificio'), 0, 3.5, -5.55, G); mk(box(30.4, 0.25, 4.2), M('techo'), 0, 7.1, -5.55, G);
      O.cgp = grp(G, CGX, CGY, CGZ);
      mk(box(0.6, 0.84, 0.03), M('ropa2'), 0, 0, -0.085, O.cgp);
      mk(box(0.03, 0.84, 0.2), M('cgp'), -0.285, 0, 0, O.cgp); mk(box(0.03, 0.84, 0.2), M('cgp'), 0.285, 0, 0, O.cgp);
      mk(box(0.6, 0.03, 0.2), M('cgp'), 0, 0.405, 0, O.cgp); mk(box(0.6, 0.03, 0.2), M('cgp'), 0, -0.405, 0, O.cgp);
      O.fus = grp(O.cgp, 0, 0, -0.03);
      [-0.15, 0, 0.15].forEach(function (x, q) { var fz = mk(cylU(0.035, 8), M(FA[q + 1]), x, 0.03, 0, O.fus); fz.scale.set(1, 0.3, 1); if (q === 1) contorno(fz, 1.5); mk(box(0.07, 0.04, 0.04), M('metal'), x, 0.2, 0, O.fus); });
      if (md !== 'c3') mk(box(0.4, 0.05, 0.05), M(FA[0]), 0, -0.2, 0, O.fus);
      O.plI = mk(geo('tri', function () { return new T.CircleGeometry(0.1, 3); }), MB('marca'), 0, 0.2, 0.115, O.cgp); O.plI.rotation.z = PI / 2; O.plI.visible = false;
      O.door = grp(O.cgp, -0.28, 0, 0.115); mk(box(0.56, 0.78, 0.03), md === 'c3' ? Mt('cgp', 0.3) : M('cgp'), 0.28, 0, 0.01, O.door);
      O.plE = mk(geo('tri', function () { return new T.CircleGeometry(0.1, 3); }), MB('marca'), 0.28, 0.12, 0.04, O.door); O.plE.rotation.z = PI / 2; O.plE.visible = false;
      O.seal = mk(sph(0.03, 8, 6), MB('cota'), 0.52, -0.05, 0.05, O.door); O.seal.visible = false;
      O.cgpL = md === 'c3' ? etq('Caja de acometida', 'ropa2', 0.9, 0.18, null, 480) : etq('CGP', 'ropa2', 0.4, 0.2); O.cgpL.position.set(CGX, md === 'c3' ? CGY + 0.62 : CGY - 0.72, CGZ + 0.25); G.add(O.cgpL);
      /* cables de acometida que bajan por la fachada (el tramo enterrado no se ve) */
      if (md === 'c3') {   // entrada (derecha) y salida (izquierda) bajan de la caja en serie con la línea
        for (k = -1; k <= 1; k += 2) for (i = 0; i < 4; i++) { var cb3 = mk(cylU(0.016, 6), M(FA[i]), CGX + k * (0.3 + 0.06 * i), (CGY - 0.45) / 2, CGZ - 0.02, G); cb3.scale.set(1, CGY - 0.45, 1); if (i === 2) contorno(cb3, 2); }
        O.cgp.scale.x = 1.6;
      } else for (i = 0; i < 4; i++) { var cb = mk(cylU(0.016, 6), M(FA[i]), CGX - 0.12 + 0.08 * i, (CGY - 0.45) / 2, CGZ - 0.02, G); cb.scale.set(1, CGY - 0.45, 1); if (i === 2) contorno(cb, 2); }
      /* cables pasantes */
      O.main = [];
      if (md === 'c2') {
        var r = mk(cylU(0.1, 14), M('ropa2'), 0, 0, 0, G); O.shL = r; O.shR = mk(cylU(0.1, 14), M('ropa2'), 0, 0, 0, G); O.shW = mk(cylU(0.1, 14), M('ropa2'), 0, 0, 0, G);
        O.scrW = [mk(cylU(0.08, 14), M('metal'), 0, 0, 0, G), mk(cylU(0.08, 14), M('metal'), 0, 0, 0, G)];
        O.fill = mk(cylU(0.065, 12), M('nuevo'), 0, 0, 0, G);
        O.core = []; O.corePts = [];
        for (i = 0; i < 4; i++) { var ct = tubo(19, 0.028, M(FA[i], { side: T.DoubleSide }), i === 2); G.add(ct); O.core.push(ct); O.corePts.push(Array.apply(null, Array(19)).map(function () { return V(0, 0, 0); })); }
        O.cont = tubo(24, 0.018, M('texto', { side: T.DoubleSide })); G.add(O.cont); O.contPts = Array.apply(null, Array(24)).map(function () { return V(0, 0, 0); });
        O.wedge = [0, 1, 2].map(function () { var w = mk(geo('wedge', function () { return new T.CylinderGeometry(0.05, 0.004, 0.17, 3); }), M('marca'), 0, 0, 0, G); w.visible = false; return w; });
        O.caja = grp(G, 0, 0, 0); O.caja.visible = false;
        mk(box(2.3, 0.62, 1.0), Mt('cgp', 0.38), 0, Y2 + 0.12, Z2 - 0.05, O.caja);
        mk(cylX(0.13, 0.35, 12), M('cgp'), -1.3, Y2, Z2, O.caja); mk(cylX(0.13, 0.35, 12), M('cgp'), 1.3, Y2, Z2, O.caja); mk(cylZ(0.13, 0.16, 12), M('cgp'), 0.3, Y2, Z2 - 0.6, O.caja);
        [-1.18, 1.18].forEach(function (x) { mk(cylX(0.155, 0.04, 12), M('cgp'), x, Y2, Z2, O.caja); }); mk(cylZ(0.155, 0.04, 12), M('cgp'), 0.3, Y2, Z2 - 0.54, O.caja);
        [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { mk(cylU(0.03, 8), MM('metal'), a * 1.0, Y2 + 0.45, Z2 - 0.05 + b * 0.4, O.caja).scale.set(1, 0.05, 1); }); });
        O.resina = mk(box(2.2, 0.5, 0.9), Mt('tela', 0.5), 0, Y2 + 0.08, Z2 - 0.05, O.caja);
        O.cajaL = etq('CAJA', 'cgp', 0.4, 0.16); O.cajaL.position.set(-0.9, Y2 + 0.6, Z2 + 0.2); O.caja.add(O.cajaL);
        O.termo = XJ2.map(function (x, q) { var t = mk(cylU(0.075, 10), M('ropa2'), 0, 0, 0, G); t.visible = false; return t; });
      } else {
        for (i = 0; i < 4; i++) {
          var a = mk(cylU(0.035, 10), M(FA[i]), 0, 0, 0, G), b = mk(cylU(0.035, 10), M(FA[i]), 0, 0, 0, G);
          var ea = mk(sph(0.037, 8, 6), M('nuevo'), 0, YC, ZP[i], G), eb = mk(sph(0.037, 8, 6), M('nuevo'), 0, YC, ZP[i], G);
          var md2 = mk(cylU(0.035, 10), M(FA[i]), 0, 0, 0, G); md2.visible = md === 'c3';
          if (i === 2) { contorno(a); contorno(b); contorno(md2); }
          O.main.push({ a: a, b: b, ea: ea, eb: eb, mid: md2 });
        }
      }
      /* conductores de acometida */
      O.acom = listaAcom();
      O.acom.forEach(function (q) {
        var nt = q.pl ? 23 : 14; q.tb = tubo(nt, 0.03, M(FA[q.i], { side: T.DoubleSide }), q.i === 2); G.add(q.tb); q.pts = Array.apply(null, Array(nt)).map(function () { return V(0, 0, 0); });
        q.ded = dedal(G); q.ded.visible = false; q.tan = V(0, 1, 0);
        q.sleeve = conector(md === 'c2' ? 0.04 : 0.05, md === 'c2' ? 0.16 : 0.14, G); q.sleeve.position.copy(q.J); q.sleeve.visible = false;
        q.tape = cinta(G); q.tape.position.copy(q.J); q.tape.visible = false;
        q.lab = etq((md === 'c3' ? (q.side > 0 ? 'E ' : 'S ') : '') + FA[q.i], FA[q.i], md === 'c3' ? 0.22 : 0.26, md === 'c3' ? 0.11 : 0.13); q.lab.visible = false; G.add(q.lab);
      });
      /* tela aislante sobre cada fase que no se está trabajando */
      O.cov = [];
      for (i = 0; i < 4; i++) {
        var cw = md === 'c3' ? 1.2 : md === 'c2' ? 0.34 : 0.5;
        var cm = mk(box(cw, 0.08, md === 'c2' ? 0.14 : 0.14), Mt('tela', 0.45), md === 'c3' ? 0 : md === 'c1' ? XJ1 : XJ2[i], md === 'c2' ? Y2 : YC, md === 'c2' ? Z2 : ZP[i], G);
        cm.visible = false; O.cov.push(cm);
        if (md === 'c3') { O.main[i].da = dedal(G); O.main[i].db = dedal(G); O.main[i].da.quaternion.setFromUnitVectors(UP, V(1, 0, 0)); O.main[i].db.quaternion.setFromUnitVectors(UP, V(-1, 0, 0)); O.main[i].da.visible = O.main[i].db.visible = false; }
      }
      /* puente auxiliar (c3) */
      if (md === 'c3') {
        O.br = []; var intr0 = opt.puente === 'interruptor';
        for (i = 0; i < 4; i++) {
          var tl = tubo(12, 0.026, M(FA[i], { side: T.DoubleSide }), i === 2), tr = tubo(12, 0.026, M(FA[i], { side: T.DoubleSide }), i === 2); G.add(tl); G.add(tr);
          var ends = [dedal(G), dedal(G)];
          var tp = [mk(cylX(0.05, 0.16, 8), M('ropa2'), -XB, YC, ZP[i], G), mk(cylX(0.05, 0.16, 8), M('ropa2'), XB, YC, ZP[i], G)]; tp[0].visible = tp[1].visible = false;
          var kn = grp(G, 0, 0, ZP[i] - 0.12), bl = grp(kn, -0.14, 0, 0);   // interruptor de cuchilla: bornes y hoja articulada
          [-1, 1].forEach(function (sg) { mk(cylU(0.03, 10), MM('metal'), sg * 0.14, 0, 0, kn).scale.set(1, 0.09, 1); });
          mk(box(0.3, 0.03, 0.045), MM('halo'), 0.15, 0.0, 0, bl); mk(box(0.06, 0.05, 0.06), M('aisl'), 0.3, 0.0, 0, bl);
          kn.visible = false;
          var ar = [0, 1].map(function () { var c = mk(geo('arr', function () { var g = new T.ConeGeometry(0.045, 0.14, 10); g.rotateZ(PI / 2); return g; }), MB('marca'), 0, 0, 0, G); c.visible = false; return c; });
          O.br.push({ ar: ar,  tl: tl, tr: tr, ptsL: Array.apply(null, Array(12)).map(function () { return V(0, 0, 0); }), ptsR: Array.apply(null, Array(12)).map(function () { return V(0, 0, 0); }), ends: ends, tp: tp, kn: kn, bl: bl });
        }
        O.bar = mk(box(0.025, 0.025, 0.8), M('aisl'), 0, 0, 0, G); O.bar.visible = false;   // varilla que acciona las cuatro hojas a la vez
        O.pil = mk(sph(0.04, 8, 6), MB('cota'), 0, 0, 0, G); O.pil.visible = false;          // piloto discreto: abierto (rosa) / cerrado (verde)
        /* rótulos breves de la figura 1 del manual */
        O.rot = [['Línea principal', -1.5, YC + 0.3, -1.12], ['Entrada', 1.25, YC + 0.32, 0.75], ['Salida', -1.25, YC + 0.32, 0.75]].map(function (r) {
          var e = etq(r[0], 'ropa2', r[0].length > 8 ? 0.62 : 0.4, r[0].length > 8 ? 0.13 : 0.12, null, r[0].length > 8 ? 384 : 256); e.position.set(r[1], r[2], r[3]); e.visible = false; G.add(e); return e; });
        O.rotP = etq('Puente auxiliar', 'ropa2', 0.62, 0.13, null, 384); O.rotP.visible = false; G.add(O.rotP);
        O.rotA = etq('La línea se alimenta por el puente', 'ropa2', 0.95, 0.12, null, 600); O.rotA.visible = false; G.add(O.rotA);
        O.rotC = etq('Corte', 'cota', 0.3, 0.12, null, 256); O.rotC.visible = false; G.add(O.rotC);
        O.rotD = etq('Dedales aislantes', 'ropa2', 0.62, 0.13, null, 384); O.rotD.visible = false; G.add(O.rotD);
        O.rotB = FA.map(function (f) { var e = etq('Puente ' + f, f, 0.4, 0.13, null, 256); e.visible = false; G.add(e); return e; });
        /* seccionamiento de la caja: bornes de salida (izq.) y de entrada (dcha.) y cuchilla de cada fase */
        O.cuch = [];
        for (i = 0; i < 4; i++) {
          var ry = -0.08 - 0.09 * i;
          var p1 = mk(box(0.05, 0.05, 0.04), M(FA[i]), -0.15, ry, -0.04, O.cgp), p2 = mk(box(0.05, 0.05, 0.04), M(FA[i]), 0.15, ry, -0.04, O.cgp); if (i === 2) { contorno(p1, 1.5); contorno(p2, 1.5); }
          var bl = grp(O.cgp, -0.15, ry, -0.03); mk(box(0.3, 0.03, 0.02), MM('metal'), 0.15, 0, 0, bl); mk(box(0.07, 0.045, 0.03), M('aisl'), 0.29, 0, 0, bl); mk(sph(0.022, 8, 6), MM('metal'), 0, 0, 0, bl); bl.visible = false; O.cuch.push(bl);
        }
      }
      /* entibado (ilustrativo) */
      O.entib = [];
      for (k = -1; k <= 1; k += 2) for (i = -2; i <= 2; i++) { var pl = mk(box(0.04, 0.9, 0.5), Mt('aislador', 0.4), i * 0.75, -0.5, k * 1.19, G); pl.visible = false; O.entib.push(pl); }
      /* alfombras aislantes */
      O.alf = [mk(box(3.2, 0.88, 0.03), Mt('aisl', 0.6), 0, -0.5, -1.15, G),
               mk(box(md === 'c3' ? 3.2 : 2.0, 0.88, 0.03), Mt('aisl', 0.6), md === 'c3' ? 0 : 0.6, -0.5, 1.15, G),
               mk(box(2.4, 0.03, 0.9), Mt('aisl', 0.6), -1.3, YT + 0.01, 0.62, G)];
      O.alf.forEach(function (a) { a.visible = false; });
      if (md === 'c3') { O.alf[0].userData.skip = true; O.alf[1].userData.skip = true; }
      /* escalera aislante de acceso a la cala (C.1 y C.2). Todo lo que no es «escalera aislante» es ilustrativo */
      O.lad = grp(G, 0, 0, 0); O.lad.visible = false;
      if (md !== 'c3') {
        var lx = -1.2, LA = Math.PI / 12, LL = 2.04;
        var lg = grp(O.lad, lx, YT + 0.02, 0.93); lg.rotation.x = LA; O.ladG = lg;
        [-0.23, 0.23].forEach(function (dx) { var r = mk(cylU(0.03, 8), M('esc'), dx, LL / 2, 0, lg); r.scale.set(1, LL, 1); mk(box(0.08, 0.04, 0.1), M('texto'), dx, 0.02, 0, lg); });
        for (k = 0; k < 7; k++) mk(cylX(0.02, 0.46, 8), M('esc'), 0, 0.3 + 0.28 * k, 0, lg);
        var band = mk(box(0.56, 0.045, 0.07), M('marca'), 0, 1.3, 0.0, lg); mk(box(0.07, 0.06, 0.06), MM('metal'), 0, 1.3, 0.05, lg);   // cincha con trinquete bajo el apoyo
        var stake = mk(cylU(0.03, 8), MM('metal'), lx, 0.07, 2.0, O.lad); stake.scale.set(1, 0.16, 1);
        mk(geo('torusS', function () { return new T.TorusGeometry(0.05, 0.01, 6, 12); }), MM('metal'), lx, 0.16, 2.0, O.lad);
        O.ladStrap = mk(cylU(0.018, 6), M('marca'), 0, 0, 0, O.lad); place(O.ladStrap, V(lx, YT + 0.02 + 1.3 * Math.cos(LA), 0.93 + 1.3 * Math.sin(LA) + 0.05), V(lx, 0.16, 2.0));
        mk(box(0.42, 0.1, 0.14), M('aislador'), lx, YT + 0.05, 0.62, O.lad);   // calzo al pie
        O.lany = mk(cylU(0.012, 6), M('marca'), 0, 0, 0, G); O.lany.visible = false;   // amarre del cinturón
        O.ladAnc = V(lx - 0.5, 0.12, 1.75); mk(cylU(0.03, 8), MM('metal'), lx - 0.5, 0.06, 1.75, O.lad).scale.set(1, 0.12, 1);
      }
      /* trabajadores */
      O.w = persona('casco'); G.add(O.w.g);
      O.ay = persona('casco2'); G.add(O.ay.g);
      /* vial */
      O.van = grp(G, -30, 0, 7.0);
      mk(box(3.4, 1.7, 1.8), M('furgo'), 0, 1.15, 0, O.van); mk(box(1.2, 1.2, 1.78), M('furgo'), 2.2, 0.95, 0, O.van);
      mk(box(0.5, 0.5, 1.8), M('ropa2'), 2.55, 1.3, 0, O.van);
      [[-1.1, 0.95], [1.1, 0.95], [-1.1, -0.95], [1.1, -0.95], [2.4, 0.95], [2.4, -0.95]].forEach(function (w) { mk(cylZ(0.36, 0.2, 10), M('ropa2'), w[0], 0.36, w[1], O.van); });
      mk(box(0.5, 0.18, 0.3), M('cono'), 0.4, 2.1, 0, O.van); mk(box(3.4, 0.12, 1.84), M('cono'), 0, 0.55, 0, O.van);
      O.van.visible = false;
      O.cones = []; for (i = 0; i < 4; i++) { var cn = mk(geo('cono', function () { return new T.ConeGeometry(0.17, 0.6, 8); }), M('cono'), -9.5 - i * 1.7, 0.3, 4.2 + i * 0.35, G); cn.visible = false; O.cones.push(cn); }
      O.sign = mk(geo('tri2', function () { return new T.CircleGeometry(0.6, 3); }), MB('marca'), -13.0, 1.4, 4.6, G); O.sign.rotation.z = PI / 2; O.sign.visible = false;
      O.signP = mk(cylU(0.03, 6), M('texto'), -13.0, 0.7, 4.6, G); O.signP.scale.set(1, 1.4, 1); O.signP.visible = false;
      /* valla alrededor de la cala */
      O.val = [];
      for (i = 0; i < 7; i++) if (i !== 2) O.val.push([-3.3 + i * 1.1, 1.95, 0]);
      for (i = 0; i < 7; i++) O.val.push([-3.3 + i * 1.1, -1.85, 0]);
      for (i = 0; i < 3; i++) { O.val.push([-3.8, -1.2 + i * 1.2, PI / 2]); O.val.push([3.8, -1.2 + i * 1.2, PI / 2]); }
      O.val = O.val.map(function (p) {
        var g = grp(G, p[0], 0, p[1]); g.rotation.y = p[2];
        mk(box(1.1, 0.7, 0.05), M('valla'), 0, 0.65, 0, g); mk(box(1.1, 0.16, 0.06), M('furgo'), 0, 0.65, 0, g);
        mk(box(0.05, 0.3, 0.45), M('valla'), -0.5, 0.15, 0, g); mk(box(0.05, 0.3, 0.45), M('valla'), 0.5, 0.15, 0, g); g.visible = false; return g;
      });
      /* lona y equipos */
      O.lona = grp(G, -2.6, 0, 3.0); O.lona.visible = false;
      mk(box(1.9, 0.02, 1.0), M('lona'), 0, 0.02, 0, O.lona);
      O.items = [
        mk(box(0.34, 0.14, 0.2), M('aislador'), -0.7, 0.1, 0, O.lona),
        mk(cylX(0.07, 0.5, 8), Mt('tela', 0.8), -0.2, 0.1, 0.2, O.lona),
        mk(cylX(0.045, 0.7, 8), Mt('aisl', 0.8), 0.0, 0.07, -0.15, O.lona),
        mk(sph(0.11, 8, 6), Mt('aisl', 0.8), 0.45, 0.1, 0.05, O.lona),
        mk(box(0.14, 0.05, 0.2), M('guante'), 0.75, 0.06, -0.1, O.lona)];
      O.checks = O.items.map(function (m) { var s = etq('✓', 'ok', 0.34, 0.17); s.position.set(m.position.x, 0.55, m.position.z); s.visible = false; O.lona.add(s); return s; });
      /* bandeja sobre la lona, lejos de la cala, y objetos metálicos de ambos trabajadores */
      mk(box(0.95, 0.02, 0.34), M('ropa2'), 0.25, 0.035, -0.37, O.lona); mk(box(0.95, 0.05, 0.02), M('ropa2'), 0.25, 0.06, -0.54, O.lona); mk(box(0.95, 0.05, 0.02), M('ropa2'), 0.25, 0.06, -0.2, O.lona);
      mk(box(0.02, 0.05, 0.34), M('ropa2'), -0.22, 0.06, -0.37, O.lona); mk(box(0.02, 0.05, 0.34), M('ropa2'), 0.72, 0.06, -0.37, O.lona);
      O.mi = []; anclaMetal(O.w, 0); anclaMetal(O.ay, 1);
      O.bolsa = mk(sph(0.28, 8, 6), M('techo'), 0, 0, 0, G); O.bolsa.visible = false;
      /* efectos transitorios */
      O.sol = mk(sph(1.3, 12, 8), MB('sol'), -15, 15, -12, G); O.sol.visible = false;
      O.nube = grp(G, 0, 0, 0); O.nube.visible = false;
      [[0, 0, 0, 1.6], [1.6, -0.2, 0.3, 1.2], [-1.5, -0.3, 0, 1.2]].forEach(function (c) { mk(sph(c[3], 10, 8), M('nube'), c[0], c[1], c[2], O.nube); });
      O.okSol = etq('✓', 'ok', 1.6, 0.8); O.okSol.position.set(-15, 11, -11); O.okSol.visible = false; G.add(O.okSol);
      O.ring = mk(geo('ring', function () { var g = new T.RingGeometry(0.75, 0.9, 32); g.rotateX(-PI / 2); return g; }), MB('marca'), 0, 0.05, 0, G); O.ring.visible = false;
      O.flecha = mk(geo('fl', function () { var g = new T.ConeGeometry(0.28, 0.7, 4); g.rotateX(PI); return g; }), MB('marca'), 0, 2.4, 0, G); O.flecha.visible = false;
      O.pinza = grp(G, 0, 0, 0); O.pinza.visible = false;
      mk(geo('torus', function () { return new T.TorusGeometry(0.075, 0.018, 6, 12, PI * 1.5); }), M('texto'), 0, 0, 0, O.pinza);
      mk(box(0.11, 0.2, 0.06), M('aisl'), 0, -0.2, 0, O.pinza); O.pinzaD = mk(box(0.07, 0.05, 0.02), MB('ok'), 0, -0.17, 0.04, O.pinza);
      O.pinzaK = etq('✓', 'ok', 0.4, 0.2); O.pinzaK.position.set(0, 0.28, 0.1); O.pinza.add(O.pinzaK);
      O.compr = grp(G, 0, 0, 0); O.compr.visible = false; mk(box(0.3, 0.2, 0.08), M('ropa2'), 0, 0, 0, O.compr);
      O.comprL = [0, 1, 2].map(function (q) { return mk(sph(0.03, 6, 5), MB(FA[q + 1]), -0.08 + q * 0.08, 0, 0.05, O.compr); });
      if (cor) caminos();
      O.hemi = new T.HemisphereLight(0xffffff, 0x8899aa, 0.62); G.add(O.hemi);
      O.sun = new T.DirectionalLight(0xffffff, 0.55); O.sun.position.set(-6, 14, 10); G.add(O.sun);
      aplicaTema();
    }
    /* ---------- corriente (puntos animados): caminos y estado ---------- */
    function caminos() {
      var md = opt.modo, i, o = { size: 0.09, dens: 3 };
      function cat() { var r = [], k, j; for (k = 0; k < arguments.length; k++) { var a = arguments[k]; for (j = 0; j < a.length; j++) r.push(a[j]); } return r; }
      for (i = 0; i < 4; i++) (function (i) {
        if (md === 'c2') {
          var off = (i - 1.5) * 0.03;
          cor.addPath('lin-' + i, function () { return cat([V(-6, Y2 + 0.11, Z2 + off), V(-1.0, Y2 + 0.11, Z2 + off)], O.corePts[i], [V(1.0, Y2 + 0.11, Z2 + off), V(6, Y2 + 0.11, Z2 + off)]); }, FA[i], o);
        } else if (md === 'c1') {
          cor.addPath('lin-' + i, [V(-6, YC + 0.045, ZP[i]), V(6, YC + 0.045, ZP[i])], FA[i], o);
        } else {
          cor.addPath('linL-' + i, [V(-6, YC + 0.045, ZP[i]), V(-XJ3, YC + 0.045, ZP[i])], FA[i], o);
          cor.addPath('linR-' + i, [V(XJ3, YC + 0.045, ZP[i]), V(6, YC + 0.045, ZP[i])], FA[i], o);
          cor.addPath('linM-' + i, [V(-XJ3, YC + 0.045, ZP[i]), V(XJ3, YC + 0.045, ZP[i])], FA[i], o);
          cor.addPath('pte-' + i, function () { var b = O.br[i], r = b.ptsL.slice().reverse(); return cat(b.ptsR, r); }, FA[i], { size: 0.08, dens: 4 });
          cor.addPath('caja-' + i, function () { var ry = CGY - 0.08 - 0.09 * i; return [V(CGX + 0.24, ry, CGZ + 0.0), V(CGX - 0.24, ry, CGZ + 0.0)]; }, FA[i], { size: 0.06, dens: 6 });
        }
      })(i);
      O.acom.forEach(function (q) {
        var id = (md === 'c3' ? 'es' + (q.side > 0 ? 'E' : 'S') : 'aco') + '-' + q.i;
        var sx = md === 'c3' ? CGX + q.side * (0.3 + 0.06 * q.i) : CGX - 0.12 + 0.08 * q.i, base = md === 'c3' ? CGY - 0.45 : CGY - 0.45;
        var head = [V(sx, base, CGZ - 0.02), V(sx, 0, CGZ - 0.02), q.S.clone()];
        cor.addPath(id, function () { return cat(head, q.pts); }, FA[q.i], o);
        q.corId = id;
      });
    }
    function corriente() {
      if (!cor) return;
      var s = st, md = opt.modo, i, intr = opt.puente === 'interruptor';
      for (i = 0; i < 4; i++) {
        if (md === 'c3') {
          var c = ss(s.cut[i]);
          cor.setLive('linL-' + i, 1); cor.setLive('linR-' + i, 1); cor.setLive('linM-' + i, 1 - ss(seg(c, 0, 0.4)));
          var vis = s.br > 0.5 && (intr || i === s.brPh), att = ss(seg(s.brAtt, 0.9, 1));
          var cond = intr ? s.cond : 1;
          cor.setLive('pte-' + i, vis ? att * cond * (1 - ss(s.brOff[i])) : 0);
          cor.setLive('caja-' + i, ss(seg(s.cuch, 0.7, 0.95)));
        } else cor.setLive('lin-' + i, 1);
      }
      O.acom.forEach(function (q) {
        var con = ss(seg(s.con[q.i], 0.9, 1));
        cor.setLive(q.corId, md === 'c3' ? con : con * ss(seg(s.cgp.fus, 0.9, 1)));
      });
      cor.refresh();
    }
    function aplicaTema() {
      Object.keys(mats).forEach(function (k) { mats[k].color.set(pal(mats[k].userData.k)); });
      sprites.forEach(dibujaEtq);
      var f = pal('fondo'); scene.background = new T.Color(f); scene.fog = new T.Fog(new T.Color(f), 40, 100);
      var d = document.documentElement.getAttribute('data-theme') === 'dark';
      if (O && O.hemi) { O.hemi.intensity = d ? 0.8 : 0.62; O.sun.intensity = d ? 0.5 : 0.55; O.hemi.groundColor.set(d ? 0x202a30 : 0x8899aa); }
    }

    /* ---------- estado por defecto ---------- */
    function defaults() {
      return { tr: null, vial: 0, valla: 0, verif: 0, guardar: 0, metal: 0, epi: 0, bolsaT: 0, entib: 0, alf: 0,
        fc: 0, meas: -1, camCgp: 0, lad: 0, cond: 0, ay: { x: -3.0, z: 2.3, ry: PI, w: 0, tira: 0 }, win: 0, wx: opt.modo === 'c3' ? -1.8 : -1.2, arm: 0,
        cgp: { door: 0, fus: 1, seal: 0, plE: 0, plI: 0 },
        ded: [0, 0, 0, 0], con: [0, 0, 0, 0], tape: [0, 0, 0, 0], cut: [0, 0, 0, 0], labs: 0,
        br: 0, brAtt: 0, brOff: [0, 0, 0, 0], brPh: 0, sw: 0, brDed: 0, cuch: 0, cov: 0,
        shea: 0, cont: 0, scr: 0, fil: 0, wedge: [0, 0, 0, 0], caja: 0, termo: 0, papel: 0 };
    }

    /* ---------- volcado del estado ---------- */
    var cache = {};
    function chg(key, val) { if (cache[key] === val) return false; cache[key] = val; return true; }
    var _a = V(0, 0, 0), _b = V(0, 0, 0), _w = V(0, 0, 0), _tg = V(0, 0, 0);
    function draw() {
      var i, k, s = st, md = opt.modo;
      /* cables pasantes */
      if (md === 'c2') {
        var xa = -0.9 + 1.8 * (1 - ss(s.shea));
        place(O.shL, V(-10, Y2, Z2), V(-0.9, Y2, Z2)); place(O.shR, V(0.9, Y2, Z2), V(10, Y2, Z2));
        if (s.shea < 0.99) place(O.shW, V(-0.9, Y2, Z2), V(xa - 0.0, Y2, Z2)); else O.shW.visible = false;
        var sl = 0.15 + 0.75 * (1 - ss(s.scr));
        place(O.scrW[0], V(-0.9, Y2, Z2), V(-0.9 + sl, Y2, Z2)); place(O.scrW[1], V(0.9, Y2, Z2), V(0.9 - sl, Y2, Z2));
        if (s.fil < 0.99) place(O.fill, V(-0.75, Y2, Z2), V(-0.75 + 1.5 * (1 - ss(s.fil)), Y2, Z2)); else O.fill.visible = false;
        var spd = s.wedge.map(ss), fl = ss(s.fil);
        var key = spd.map(function (x) { return x.toFixed(3); }).join(',') + ',' + fl.toFixed(3);
        if (chg('core', key)) for (i = 0; i < 4; i++) { var P = O.corePts[i]; for (k = 0; k < 19; k++) P[k].copy(corePos(i, -1.0 + k * (2.0 / 18), spd[i], fl)); tuboSet(O.core[i], P); }
        /* conductor aislado que da continuidad a la pantalla */
        var cf = s.cont; O.cont.visible = cf > 0.01;
        if (O.cont.visible && chg('cont', cf.toFixed(3))) {
          var cp = O.contPts, nn = cp.length;
          for (k = 0; k < nn; k++) { var u = Math.min(1, k / (nn - 1)) * cf, xx = lerp(-0.95, 0.95, u), bmp = 1 - Math.pow(2 * u - 1, 6); cp[k].set(xx, Y2 + 0.1 + 0.34 * Math.sin(PI * u) * bmp + 0.0, Z2 + 0.14); }
          tuboSet(O.cont, cp);
        }
        O.wedge.forEach(function (w, q) { var m = (corePos(q, 0, 1, 1).z + corePos(q + 1, 0, 1, 1).z) / 2; w.visible = s.wedge[q] > 0.01; w.position.set(0.0, Y2 + 0.02 + 0.5 * (1 - ss(seg(s.wedge[q], 0, 0.5))), m); });
        O.caja.visible = s.caja > 0.01; O.caja.scale.set(1, Math.max(0.001, ss(s.caja)), Math.max(0.001, ss(s.caja)));
        O.resina.visible = opt.fin === 'resina' && s.caja > 0.6; O.cajaL.visible = s.caja > 0.95;
        O.termo.forEach(function (t, q) { var j = corePos(q, XJ2[q], 1, 1); t.visible = s.termo > 0.01; place(t, V(j.x - 0.17 * ss(s.termo), j.y, j.z), V(j.x + 0.17 * ss(s.termo), j.y, j.z)); t.scale.x = 1; });
      } else {
        for (i = 0; i < 4; i++) {
          var m = O.main[i], g = md === 'c3' ? XJ3 : 0, cu = ss(s.cut[i]);
          place(m.a, V(-10, YC, ZP[i]), V(-g, YC, ZP[i])); place(m.b, V(g, YC, ZP[i]), V(10, YC, ZP[i]));
          if (md === 'c3') {   // el tramo entre los dos extremos se corta y se retira: la línea sigue por el puente
            place(m.mid, V(-g, YC, ZP[i]), V(g, YC, ZP[i]));
            m.mid.visible = cu < 0.99; m.mid.position.y += 0.6 * cu; m.mid.scale.x = m.mid.scale.z = Math.max(0.001, 1 - ss(seg(cu, 0.5, 1)));
          }
          m.ea.visible = m.eb.visible = cu > 0.3; m.ea.position.x = -g; m.eb.position.x = g;
        }
      }
      /* acometida */
      O.acom.forEach(function (q) {
        var cc = ss(s.con[q.i]);
        _b.set(lerp(q.F.x, q.J.x, cc), lerp(q.F.y, q.J.y, cc), lerp(q.F.z, q.J.z, cc));
        var key2 = _b.x.toFixed(3) + _b.y.toFixed(3) + _b.z.toFixed(3);
        if (chg('ac' + q.side + q.i, key2)) {
          var P2 = q.pts, n = P2.length, rise = 0.32 * (1 - cc) + 0.14;
          if (q.pl) poly([q.pl[0], q.pl[1], q.pl[2], _b], P2, [8, 8, 6]);
          else for (k = 0; k < n; k++) { var u = k / (n - 1); P2[k].set(lerp(q.S.x, _b.x, u), lerp(q.S.y, _b.y, u) + rise * 4 * u * (1 - u), lerp(q.S.z, _b.z, u)); }
          tuboSet(q.tb, P2);
          var tj = n - 2; while (tj > 0 && P2[n - 1].distanceTo(P2[tj]) < 0.01) tj--;
          q.tan.subVectors(P2[n - 1], P2[tj]).normalize();
        }
        var dd = s.ded[q.i] * (1 - ss(seg(cc, 0, 0.3)));
        q.ded.visible = dd > 0.01; q.ded.position.copy(_b); q.ded.quaternion.setFromUnitVectors(UP, q.tan); q.ded.scale.setScalar(Math.max(0.001, ss(dd)));
        q.sleeve.visible = cc > 0.9;
        var tp = ss(s.tape[q.i]); q.tape.visible = tp > 0.01; q.tape.scale.set(Math.max(0.001, tp), 1, Math.max(0.001, tp)); q.tape.scale.y = 1;
        q.lab.visible = s.labs > 0.5; q.lab.position.set(_b.x, _b.y + 0.2, _b.z + 0.05);
      });
      /* cobertura: solo se destapa la fase en curso (corte-conexión-encintado) */
      O.cov.forEach(function (c, i) {
        var wk = (s.meas === i) || (md === 'c3' ? (s.cut[i] > 0.01 && s.tape[i] < 0.99) : (s.con[i] > 0.01 && s.tape[i] < 0.99));
        var v = ss(s.cov) * (wk ? 0 : 1); c.visible = v > 0.01; c.scale.set(1, Math.max(0.001, v), Math.max(0.001, v));
        if (md === 'c2') c.position.copy(corePos(i, XJ2[i], ss(s.wedge[i]), 1));
        if (md === 'c3') { var g = XJ3, m = O.main[i]; m.da.visible = m.db.visible = v > 0.01 && s.cut[i] > 0.5; m.da.position.set(-g, YC, ZP[i]); m.db.position.set(g, YC, ZP[i]); }
      });
      /* puente auxiliar (c3): lazo rectilíneo sobre cada fase con interruptor de cuchilla (o un único puente unipolar sin interruptor) */
      if (md === 'c3') {
        var top = YC + 0.5, intr = opt.puente === 'interruptor', gap = intr ? 0.14 : 0, anyBr = false, anyFlow = false;
        for (i = 0; i < 4; i++) {
          var b = O.br[i], vis = s.br > 0.01 && (intr || i === s.brPh);
          b.tl.visible = b.tr.visible = vis; b.ends.forEach(function (e) { e.visible = false; }); b.tp[0].visible = b.tp[1].visible = s.brOff[i] > 0.95;
          b.kn.visible = vis && intr;
          var att = ss(s.brAtt) * (1 - ss(s.brOff[i]));
          if (!vis) continue;
          anyBr = true;
          var yEnd = lerp(YC + 0.3, YC + 0.04, att), sc = ss(s.br), tp2 = yEnd + (top - yEnd) * sc;
          if (chg('br' + i, yEnd.toFixed(3) + intr + s.brPh + sc.toFixed(2))) {
            var zb = ZP[i] - 0.12, ze = ZP[i] - 0.12 * (1 - att);   // el lazo va algo hacia atrás de la línea para que se vea el corte; al conectar baja sobre ella
            poly([V(-XB, yEnd, ze), V(-XB, tp2, zb), V(-gap, tp2, zb)], b.ptsL, [6, 5]); tuboSet(b.tl, b.ptsL);
            poly([V(XB, yEnd, ze), V(XB, tp2, zb), V(gap, tp2, zb)], b.ptsR, [6, 5]); tuboSet(b.tr, b.ptsR);
          }
          var dd2 = s.brDed * (1 - ss(seg(att, 0, 0.5)));
          b.ends[0].visible = b.ends[1].visible = dd2 > 0.01 && sc > 0.5;
          b.ends[0].position.copy(b.ptsL[0]); b.ends[1].position.copy(b.ptsR[0]);
          _tg.subVectors(b.ptsL[0], b.ptsL[2]).normalize(); b.ends[0].quaternion.setFromUnitVectors(UP, _tg);
          _tg.subVectors(b.ptsR[0], b.ptsR[2]).normalize(); b.ends[1].quaternion.setFromUnitVectors(UP, _tg);
          /* flechas de corriente (ilustrativas): con el puente cerrado y la línea cortada la alimentación pasa por el puente */
          var flow = (intr ? s.sw > 0.5 : att > 0.5) && s.cut[i] > 0.01 && s.cut[i] < 2;
          b.ar.forEach(function (a, q) { a.visible = false; a.position.set(q ? -0.62 : 0.62, tp2 + 0.0, ZP[i] - 0.12); if (flow) anyFlow = true; });
          b.kn.position.y = tp2; b.bl.rotation.z = 0.95 * (1 - ss(s.sw));
        }
        var showB = anyBr && intr, ang = 0.95 * (1 - ss(s.sw)), tx = -0.14 + 0.3 * Math.cos(ang), ty = top + 0.3 * Math.sin(ang);
        O.bar.visible = O.pil.visible = showB; O.bar.position.set(tx, ty, (ZP[0] + ZP[3]) / 2 - 0.12); O.pil.position.set(tx, ty + 0.05, (ZP[0] + ZP[3]) / 2 - 0.12);
        O.pil.material = s.sw > 0.5 ? MB('ok') : MB('cota');
        var rv = s.cov > 0.01 && s.guardar < 0.5 && !s.camCgp && (s.br > 0.01 || s.cut[0] < 0.01); O.rot.forEach(function (r) { r.visible = rv; });
        O.rotP.visible = rv && anyBr && intr; O.rotP.position.set(0, top + 0.3, ZP[0] - 0.3);
        O.rotA.visible = rv && anyFlow; O.rotA.position.set(0, top + 0.25, ZP[3] + 0.3);
        var wk0 = -1; for (i = 0; i < 4; i++) if (wk0 < 0 && s.cut[i] > 0.01 && s.tape[i] < 0.99) wk0 = i;
        O.rotC.visible = rv && wk0 >= 0; if (wk0 >= 0) O.rotC.position.set(0, YC + 0.3, ZP[wk0] + 0.17);
        O.rotD.visible = rv && s.br > 0.01 && s.brDed > 0.5 && s.brAtt < 0.5; O.rotD.position.set(-XB - 0.25, YC + 0.5, ZP[0] - 0.4);
        for (i = 0; i < 4; i++) { var vb = rv && !intr && i === s.brPh && s.br > 0.01; O.rotB[i].visible = vb; O.rotB[i].position.set(0, top + 0.3, ZP[i] - 0.12); }
        O.cuch.forEach(function (c, q) { var k2 = ss(seg(s.cuch, q * 0.1, q * 0.1 + 0.6)); c.visible = s.cuch > 0.01; c.rotation.z = 0.85 * (1 - k2); });
      }
      /* caja general / de acometida */
      var c = s.cgp; O.door.rotation.y = -c.door * 1.9;
      O.fus.visible = c.fus > 0.02; O.fus.position.set(0, 0.3 * (1 - c.fus), -0.03 + 0.6 * (1 - c.fus)); O.fus.scale.setScalar(Math.max(0.001, c.fus));
      O.seal.visible = c.seal > 0.5; O.plE.visible = c.plE > 0.01; O.plE.scale.setScalar(Math.max(0.001, ss(c.plE))); O.plI.visible = c.plI > 0.5;
      /* entibado y alfombras */
      O.entib.forEach(function (p, q) { var e = ss(seg(s.entib, (q % 5) * 0.12, (q % 5) * 0.12 + 0.4)) * (1 - ss(s.cov)); p.visible = e > 0.01; p.scale.setScalar(Math.max(0.001, e)); });
      O.alf.forEach(function (a, q) { var e = ss(seg(s.alf, q * 0.25, q * 0.25 + 0.5)); if (a.userData.skip) e = 0; a.visible = e > 0.01; a.scale.setScalar(Math.max(0.001, e)); });
      /* trabajador: sale de la acera, entra a la cala y se agacha */
      var w = O.w, win = ss(s.win), pw;
      var wx = s.wx, wzIn = md === 'c3' ? 0.5 : 0.35;
      var px = wx, pz = lerp(2.3, wzIn, ss(seg(s.win, 0.15, 0.9))), py = lerp(0, YT, ss(seg(s.win, 0.45, 0.8)));
      var ry = lerp(lerp(PI, 0, s.fc * (1 - ss(seg(s.win, 0, 0.15)))), PI / 2, ss(seg(s.win, 0.2, 1))), cr = ss(seg(s.win, 0.7, 1)), ww = s.win > 0.02 && s.win < 0.98 ? s.win * 40 : 0;
      if (s.win < 0.15) { px = lerp(-1.2, wx, ss(s.win / 0.15)); ww = s.win > 0 && s.win < 0.15 ? s.win * 90 : 0; }
      if (md !== 'c3') {   /* baja a la cala por la escalera: acera → borde → peldaños (de cara) → fondo */
        var wa = seg(s.win, 0.0, 0.25), wb = seg(s.win, 0.25, 0.7), wc = seg(s.win, 0.7, 1);
        px = wx; pz = wa < 1 ? lerp(2.3, 1.5, ss(wa)) : wb < 1 ? lerp(1.5, 1.0, ss(wb)) : lerp(1.0, wzIn, ss(wc));
        py = lerp(0, YT + 0.05, ss(wb)); ww = (s.win > 0.01 && (wa < 1 || wc > 0 && wc < 1)) ? s.win * 60 : (wb > 0 && wb < 1 ? wb * 20 : 0);
        ry = lerp(lerp(PI, 0, s.fc * (1 - ss(wa))), 0, ss(seg(s.win, 0.2, 0.28))); ry = lerp(ry, PI / 2, ss(wc)); cr = ss(wc);
        if (s.win < 0.01) { px = lerp(-1.2, wx, 0); pz = 2.3; }
      }
      w.g.position.set(px, py, pz); w.g.rotation.y = ry;
      var epi = ss(s.epi), armW = -0.9 * s.arm * (1 - cr * 0.3);
      w.pose({ visor: lerp(-1.6, 0, epi), guantes: epi > 0.4, cinto: epi > 0.7, w: ww, armL: armW, armR: armW, cr: cr });
      O.lad.visible = md !== 'c3' && s.lad > 0.01;
      if (md !== 'c3') {
        O.ladG.scale.set(1, Math.max(0.001, ss(s.lad)), 1); O.ladStrap.visible = s.lad > 0.9;
        G.updateMatrixWorld(true);
        var lanyOn = s.epi > 0.7 && s.win > 0.45 && s.lad > 0.9;
        O.lany.visible = lanyOn; if (lanyOn) { w.belt.getWorldPosition(_w); place(O.lany, _w, O.ladAnc); }
      }
      var ay = O.ay, ax = s.ay;
      ay.g.position.set(ax.x, 0, ax.z); ay.g.rotation.y = ax.ry;
      ay.pose({ visor: lerp(-1.6, 0, epi), guantes: epi > 0.4, cinto: false, w: ax.w, armL: -0.9 * ax.tira, armR: -0.9 * ax.tira });
      /* vial */
      var vv = s.vial, vVan = ss(seg(vv, 0, 0.55)), vCon = seg(vv, 0.45, 1);
      O.van.visible = vVan > 0.001; O.van.position.x = lerp(-30, -9, vVan);
      for (i = 0; i < 4; i++) { var cs = ss(seg(vCon, i * 0.2, i * 0.2 + 0.4)); O.cones[i].visible = cs > 0.01; O.cones[i].scale.setScalar(Math.max(0.001, cs)); }
      O.sign.visible = O.signP.visible = vCon > 0.85;
      for (i = 0; i < O.val.length; i++) { var vs = ss(seg(s.valla, i / O.val.length * 0.7, i / O.val.length * 0.7 + 0.3)); O.val[i].visible = vs > 0.01; O.val[i].scale.setScalar(Math.max(0.001, vs)); }
      var vi = ss(seg(s.verif, 0, 0.35)) * (1 - ss(s.guardar));
      O.lona.visible = vi > 0.01; O.lona.scale.setScalar(Math.max(0.001, vi));
      O.checks.forEach(function (ck, q) { ck.visible = s.verif > 0.4 + q * 0.08 && s.guardar < 0.5; });
      /* objetos metálicos: se quitan del cuerpo y se dejan en la bandeja de la lona */
      G.updateMatrixWorld(true);
      O.mi.forEach(function (it) {
        var u = ss(seg(s.metal, it.t0, it.t0 + 0.35));
        it.att.visible = u <= 0;
        it.fr.visible = u > 0 && O.lona.visible;
        if (u <= 0) it.from = null;
        if (u > 0) {
          if (u < 1 && !it.from) { it.att.getWorldPosition(_w); it.from = O.lona.worldToLocal(_w.clone()); }
          if (u >= 1) it.from = null;
          var f = it.from || it.slot;
          it.fr.position.set(lerp(f.x, it.slot.x, u), lerp(f.y, it.slot.y, u) + 0.5 * Math.sin(u * PI), lerp(f.z, it.slot.z, u));
          var ly = LAY[it.kind]; it.fr.rotation.set(lerp(it.rot0[0], ly[0], u), lerp(it.rot0[1], ly[1], u), lerp(it.rot0[2], ly[2], u));
        }
      });
      var bb = s.bolsaT; O.bolsa.visible = bb > 0.02 && bb < 0.98;
      var b1 = ss(seg(bb, 0, 0.35)), b2 = ss(seg(bb, 0.45, 1));
      O.bolsa.position.set(lerp(-2.4, -9, b2), lerp(0.28, 1.2, b2), lerp(3.2, 7, b2)); O.bolsa.scale.setScalar(Math.max(0.001, b1 * (1 - 0.7 * b2)));
      lazy();
      if (O.senM) { O.senM.visible = vCon > 0.85; O.sign.visible = O.signP.visible = false; }
      corriente();
      drawTr();
      pedir();
    }
    function juntaDe(i, side) { // punto de conexión del conductor i (para pinza y señales)
      var q = O.acom.filter(function (a) { return a.i === i && (side == null || a.side === side); })[0];
      return q ? q.J : V(0, YC, ZP[i]);
    }
    function drawTr() {
      var tr = st.tr, a = tr && tr.a, t = tr ? tr.t : 0, p = tr ? tr.p : {}, i;
      O.sol.visible = O.nube.visible = O.okSol.visible = false; O.ring.visible = O.flecha.visible = false;
      O.pinza.visible = O.compr.visible = false;
      if (!a) return;
      if (a === 'clima') {
        O.sol.visible = true; O.nube.visible = true; O.nube.position.set(lerp(-15, -36, ss(seg(t, 0.15, 1))), 15, -12); O.okSol.visible = t > 0.8;
      } else if (a === 'identificar') {
        O.ring.visible = true; O.ring.position.set(0, 0.06, 0); var r = 1 + 0.12 * Math.sin(t * PI * 4); O.ring.scale.set(3.6 * r, 1, 1.9 * r);
        O.flecha.visible = true; O.flecha.position.set(0, 2.4 + 0.3 * Math.sin(t * PI * 6), 0);
      } else if (a === 'barrido') {   // revisión a lo largo de la cala
        O.ring.visible = true; O.ring.scale.set(0.9, 1, 1.5); O.ring.position.set(lerp(-3.6, 3.6, ss(t)), p.y == null ? 0.05 : p.y, 0);
      } else if (a === 'pinza') {
        var n2 = p.fases || 4, k2 = Math.min(n2 - 1, Math.floor(t * n2)), w2 = (t * n2) % 1;
        var Jp = p.cgp ? V(CGX, CGY + 0.55, CGZ + 0.3) : (function () { var q = juntaDe(p.solo != null ? p.solo : k2, p.side); return V(q.x, q.y + 0.12, q.z + 0.12); })();
        O.pinza.visible = true; O.pinza.position.copy(Jp);
        O.pinza.scale.setScalar(1.6 * ss(seg(w2, 0, 0.2)) * (1 - ss(seg(w2, 0.9, 1))) + 0.0001);
        O.pinzaK.visible = w2 > 0.5;
      } else if (a === 'comprobador') {
        O.compr.visible = true; var k4 = Math.min(2, Math.floor(t * 3));
        if (p.cala) O.compr.position.set(0.0, YC + 0.35, -0.2); else O.compr.position.set(CGX, CGY + 0.8, CGZ + 0.3);
        O.comprL.forEach(function (l, q) { l.scale.setScalar(q <= k4 ? 1.8 : 0.8); });
      } else if (a === 'marca') {     // resalta un punto
        O.ring.visible = true; O.ring.scale.set(0.45, 1, 0.45); O.ring.position.set(p.x, p.y, p.z);
      }
    }

    /* ---------- acciones ---------- */
    var U = function (t, p) { return p && p.inv ? 1 - t : t; };
    function idx(p) { return (p.fases || []).map(function (f) { return FA.indexOf(f); }); }
    function recorre(path, t) {      // posición a lo largo de una poligonal [[x,z],…] con t∈[0,1]
      var L = [], tot = 0, i; for (i = 1; i < path.length; i++) { var d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); L.push(d); tot += d; }
      var u = ss(t) * tot, acc = 0;
      for (i = 0; i < L.length; i++) { if (u <= acc + L[i] || i === L.length - 1) { var f = L[i] > 0 ? cl((u - acc) / L[i]) : 1; return { x: lerp(path[i][0], path[i + 1][0], f), z: lerp(path[i][1], path[i + 1][1], f), ry: Math.atan2(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]) }; } acc += L[i]; }
      return { x: path[path.length - 1][0], z: path[path.length - 1][1], ry: 0 };
    }
    var A = {
      identificar: function (t, p, act) { if (act) st.tr = { a: 'identificar', t: t }; },
      clima: function (t, p, act) { if (act) st.tr = { a: 'clima', t: t }; },
      inspeccion: function (t, p, act) { st.entib = ss(seg(t, 0.35, 1)); if (act) st.tr = { a: 'barrido', t: seg(t, 0, 0.6), p: { y: 0.05 } }; },
      vial: function (t, p) { st.vial = ss(U(t, p)); },
      valla: function (t, p) { st.valla = U(t, p); },
      verificar: function (t) { st.verif = t; },
      metal: function (t) { st.metal = t; st.fc = ss(seg(t, 0, 0.2)); st.ay.ry = lerp(PI, 0, ss(seg(t, 0, 0.2))); },
      epi: function (t) { st.epi = t; st.fc = 1; st.ay.ry = 0; },
      desecho: function (t) { st.bolsaT = t; },
      guardar: function (t) { st.arm = 0; st.lad = 1 - ss(t); st.guardar = t; st.alf = 1 - ss(t); st.cov = 1 - ss(t); st.entib = 1 - ss(t); },
      ayVa: function (t, p) {
        var r = recorre(p.path, t); st.ay.x = r.x; st.ay.z = r.z; st.ay.ry = (t >= 1 && p.ry != null) ? p.ry : r.ry; st.ay.w = t < 1 ? t * 16 : 0;
      },
      ayVuelve: function (t) { A.ayVa(t, { path: [[AYT[0], AYT[1]], [AYT[0], 2.3], [-3.0, 2.3]], ry: PI }); },
      cgpAbre: function (t) { st.cgp.door = ss(seg(t, 0.55, 1)); A.ayVa(seg(t, 0, 0.6), { path: [[-3.0, 2.3], [AYT[0], 2.3], [AYT[0], AYT[1]]], ry: PI }); },
      cgpFus: function (t, p) { st.cgp.fus = p.inv ? ss(seg(t, 0.3, 1)) : 1 - ss(t); if (p.inv) { st.cgp.door = ss(seg(t, 0, 0.3)); st.cgp.seal = 0; } st.ay.tira = 0.5 * Math.sin(t * PI); },
      cgpCierra: function (t) { st.cgp.door = 1 - ss(seg(t, 0, 0.5)); st.cgp.seal = t > 0.6 ? 1 : 0; },
      cgpVerif: function (t, p, act) { st.cgp.door = ss(seg(t, 0, 0.12)) * (1 - ss(seg(t, 0.7, 0.9))); st.cgp.seal = t > 0.92 ? 1 : 0; if (act && t < 0.8) st.tr = { a: 'comprobador', t: seg(t, 0.12, 0.8), p: {} }; },
      senalCgp: function (t) {
        st.cgp.door = ss(seg(t, 0, 0.2)) * 0.65 * (1 - ss(seg(t, 0.5, 0.7)));
        st.cgp.plI = t > 0.2 ? 1 : 0; st.cgp.plE = ss(seg(t, 0.7, 1));
      },
      quitaSenal: function (t) { st.cgp.plE = 1 - ss(t); st.cgp.plI = 0; },
      entra: function (t) { st.win = ss(t); },
      sale: function (t) { st.win = 1 - ss(t); st.arm = 0; },
      cala: function (t, p, act) {   // revisar la cala y los conductos de la línea pasante (el trabajador queda en la acera)
        if (act) st.tr = { a: 'barrido', t: t, p: { y: YT + 0.05 } };
      },
      aislar: function (t) {
        st.lad = ss(seg(t, 0, 0.1)); st.win = ss(seg(t, 0.1, 0.5)); st.alf = ss(seg(t, 0.45, 0.8)); st.arm = 0.7 * ss(seg(t, 0.5, 0.6)); st.cov = ss(seg(t, 0.5, 0.85));
        var d = ss(seg(t, 0.65, 1)); st.ded = [d, d, d, d]; if (opt.modo === 'c3') st.brDed = d;
        if (opt.modo === 'c3') st.labs = 0;
      },
      etiquetas: function (t) { st.win = 1; st.labs = t > 0.2 ? 1 : 0; st.arm = 0.6; },
      pinza: function (t, p, act) { st.win = p.cgp ? st.win : 1; if (!p.cgp) { st.arm = 0.7; var n3 = p.fases || 4; st.meas = (t < 1 && act) ? (p.solo != null ? p.solo : Math.min(n3 - 1, Math.floor(t * n3))) : -1; } if (act) st.tr = { a: 'pinza', t: t, p: p }; },
      comprobador: function (t, p, act) { if (act) st.tr = { a: 'comprobador', t: t, p: p }; },
      conecta: function (t, p) {
        var fs = idx(p), n = fs.length; st.win = 1; st.arm = 0.8;
        fs.forEach(function (i, k) { var w = seg(t, k / n, (k + 1) / n);
          if (opt.modo === 'c2') st.wedge[i] = Math.max(st.wedge[i], ss(seg(w, 0, 0.25)));
          if (p.inv) st.con[i] = 1 - ss(w); else { st.con[i] = ss(seg(w, 0, 0.75)); st.ded[i] = 1 - ss(seg(w, 0, 0.3)); } });
      },
      aislamiento: function (t, p) {
        var fs = idx(p), n = fs.length; st.win = 1; st.arm = 0.8;
        fs.forEach(function (i, k) { st.tape[i] = ss(seg(t, k / n, (k + 1) / n)); });
      },
      /* c2 */
      quitaMec: function (t) { st.win = 1; st.arm = 0.8; st.shea = ss(t); },
      continuidad: function (t) { st.win = 1; st.arm = 0.8; st.cont = ss(seg(t, 0, 0.7)); st.scr = ss(seg(t, 0.7, 1)); },
      quitaRelleno: function (t) { st.win = 1; st.arm = 0.8; st.fil = ss(t); },
      cunas: function (t) { st.win = 1; st.arm = 0.8; st.wedge[0] = ss(t); },
      cajaDeriv: function (t) { st.win = 1; st.arm = 0.7; if (opt.fin === 'resina') st.caja = ss(t); else st.termo = ss(t); },
      cajaPapel: function (t, p, act) { st.win = 1; st.arm = 0.5; if (opt.fin === 'termo') st.caja = ss(t); else if (act) st.tr = { a: 'marca', t: t, p: { x: 0, y: Y2 + 0.1, z: Z2 } }; },
      /* c3 */
      puentePrep: function (t) { st.win = 1; st.arm = 0.6; st.br = ss(t); st.brDed = 1; st.brPh = 0; },
      puenteConecta: function (t) { st.labs = 0; st.win = 1; st.arm = 0.8; st.brAtt = ss(t); },
      cierraSw: function (t) { st.win = 1; st.arm = 0.7; st.sw = ss(seg(t, 0.2, 0.8)); st.cond = ss(seg(t, 0.7, 0.95)); },
      concordancia: function (t, p, act) { st.win = 1; st.arm = 0.6; if (act) st.tr = { a: 'comprobador', t: t, p: { cala: true } }; },
      corta: function (t, p) { var fs = idx(p), n = fs.length; st.win = 1; st.arm = 0.8; fs.forEach(function (i, k) { st.cut[i] = ss(seg(t, k / n, (k + 1) / n)); }); if (opt.puente === 'unipolar') st.brPh = fs[fs.length - 1]; },
      /* unipolar: el puente va saltando de fase en fase mientras se corta y conecta; aquí cada fase: puente, corte, conexión, aislamiento */
      faseUni: function (t, p) {
        var fs = idx(p), n = fs.length; st.win = 1; st.arm = 0.8;
        fs.forEach(function (i, k) { var w = seg(t, k / n, (k + 1) / n);
          if (opt.modo === 'c2') st.wedge[i] = Math.max(st.wedge[i], ss(seg(w, 0, 0.25)));
          var hop = opt.puente === 'unipolar' && !p.soloConecta && p.hop !== false;
          if (hop) { if (w > 0.07) { st.brPh = i; st.brAtt = ss(seg(w, 0.08, 0.2)); } else if (w > 0) st.brAtt = 1 - ss(seg(w, 0, 0.06)); }
          if (hop) { st.cut[i] = ss(seg(w, 0.2, 0.4)); st.con[i] = ss(seg(w, 0.4, 0.7)); st.ded[i] = 1 - ss(seg(w, 0.4, 0.5)); st.tape[i] = ss(seg(w, 0.7, 0.9)); }
          else if (p.soloConecta) { st.con[i] = ss(seg(w, 0, 0.6)); st.ded[i] = 1 - ss(seg(w, 0, 0.25)); st.tape[i] = ss(seg(w, 0.6, 1)); }
          else { st.cut[i] = ss(seg(w, 0.0, 0.25)); st.con[i] = ss(seg(w, 0.3, 0.7)); st.ded[i] = 1 - ss(seg(w, 0.3, 0.4)); st.tape[i] = ss(seg(w, 0.7, 1)); }
        });
      },
      inspFinal: function (t, p, act) { st.win = 1 - ss(seg(t, 0.5, 1)); st.arm = 0; if (act) st.tr = { a: 'barrido', t: seg(t, 0, 0.6), p: { y: 0.05 } }; },
      cortaCheck: function (t, p, act) {
        var fs = idx(p); st.win = 1; st.arm = 0.8; fs.forEach(function (i) { st.cut[i] = ss(seg(t, 0, 0.5)); });
        if (opt.puente === 'unipolar') st.brPh = fs[0];
        if (act && t > 0.55) st.tr = { a: 'pinza', t: seg(t, 0.55, 1), p: { solo: fs[0], fases: 1, side: 1 } };
      },
      cajaComp: function (t, p, act) { st.camCgp = 1; st.cgp.door = ss(seg(t, 0, 0.15)); st.cgp.seal = 0; if (act && t > 0.15) st.tr = { a: 'comprobador', t: seg(t, 0.15, 1), p: {} }; },
      conectaES: function (t, p) { A.conecta(t, p); },
      cuchillas: function (t, p, act) {
        st.camCgp = 1; st.cuch = ss(seg(t, 0.2, 0.6)); st.cgp.door = 1 - ss(seg(t, 0.65, 0.85)); st.cgp.seal = t > 0.9 ? 1 : 0;
        A.ayVa(seg(t, 0, 0.0), { path: [[AYT[0], AYT[1]], [AYT[0], AYT[1]]], ry: PI });
      },
      abrePuente: function (t) { st.camCgp = 0; st.win = 1; st.arm = 0.7; st.sw = 1 - ss(seg(t, 0, 0.2)); [3, 2, 1, 0].forEach(function (i, k) { st.brOff[i] = ss(seg(t, 0.25 + k * 0.18, 0.25 + k * 0.18 + 0.2)); }); },
      quitaPuente: function (t) { st.win = 1; st.arm = 0.7; st.br = 1 - ss(t); },
      doblePuente: function (t) { st.win = 1; }
    };
    function norm(anim) { return anim == null ? [] : Array.isArray(anim) ? anim.map(n1) : [n1(anim)]; }
    function n1(a) { return typeof a === 'string' ? { a: a } : a; }

    /* ---------- cámaras ---------- */
    var camaras = {
      general: { p: [2.5, 5.2, 10.5], t: [0.5, -0.4, -0.5] },
      cielo: { p: [2, 6, 18], t: [-6, 9, -4] },
      vial: { p: [-3, 3.5, 13], t: [-10, 0.6, 4.8] },
      cala: { p: [0.8, 4.8, 5.8], t: [0.2, -0.7, -0.4] },
      trabajo: { p: [0.9, 3.6, 3.3], t: [0.1, -0.75, -0.4] },
      trabajo2: { p: [1.1, 3.9, 3.7], t: [0.0, -0.75, -0.4] },
      cgp: { p: [8.2, 3.2, 3.2], t: [5.3, 1.1, -3.3] },
      lona: { p: [-0.5, 3.4, 7.2], t: [-2.6, 0.2, 3.0] },
      suelo2: { p: [0.5, 3.4, 7.2], t: [-1.2, 0.2, 2.2] },
      objetos: { p: [-2.1, 1.8, 7.0], t: [-2.1, 0.9, 2.6] },
      detObjetos: { p: [-1.2, 1.4, 4.7], t: [-1.2, 1.05, 2.3] },
      detCuchillas: { p: [CGX + 0.3, CGY - 0.1, CGZ + 1.5], t: [CGX, CGY - 0.2, CGZ] }
    };

    var api = {
      camaras: camaras,
      configurar: function (o) {
        opt = Object.assign({ modo: 'c1', puente: 'interruptor', fin: 'resina' }, o || {}); cache = {}; construir();
        var c = camaras, m = opt.modo;   /* cámaras de plano detalle según el procedimiento */
        if (m === 'c1') { c.detDedales = { p: [1.3, 0.3, 1.2], t: [0.4, -0.35, 0.1] }; c.detEmpalme = { p: [1.0, -0.12, 0.3], t: [0.35, -0.72, -0.8] }; c.detTacos = { p: [1.3, 0.1, 1.0], t: [-0.5, -0.8, -0.5] }; }
        else if (m === 'c2') { c.detDedales = { p: [1.1, 0.3, 1.2], t: [0.1, -0.3, 0.1] }; c.detCunas = { p: [0.15, 0.6, 0.35], t: [0, -0.62, -0.55] }; c.detEmpalme = { p: [0.3, 0.0, -0.1], t: [-0.3, -0.63, -0.85] }; c.detCaja = { p: [1.8, 1.5, 0.9], t: [0.2, -0.6, -0.7] }; c.detTermo = { p: [0.55, 0.0, 0.3], t: [0, -0.62, -0.55] }; }
        else { c.detDedales = { p: [1.2, 0.35, 1.3], t: [0.1, -0.3, 0.1] }; c.detPuente = { p: [0.8, 1.0, 0.4], t: [0, -0.2, -0.64] }; c.detCorte = { p: [0.35, 1.1, -0.3], t: [0, -0.7, ZP[0]] }; c.detConex = { p: [0.8, 0.5, 0.0], t: [XJ3, -0.65, ZP[0]] }; c.detRepos = { p: [1.5, 0.5, -0.2], t: [XB, -0.65, ZP[0]] }; }
        if (m === 'c3') { c.trabajoC3 = { p: [0.0, 4.5, 0.55], t: [0.0, -0.7, 0.1] }; c.cgp = { p: [CGX + 2.0, 1.7, CGZ + 3.2], t: [CGX, 0.95, CGZ] }; c.detCuchillas = { p: [CGX + 0.3, CGY - 0.05, CGZ + 1.5], t: [CGX, CGY - 0.2, CGZ] }; }
        else { c.cgp = { p: [8.2, 3.2, 3.2], t: [5.3, 1.1, -3.3] }; c.detCuchillas = { p: [CGX + 0.3, CGY - 0.1, CGZ + 1.5], t: [CGX, CGY - 0.2, CGZ] }; }
        api.reset();
      },
      reset: function () { st = defaults(); cache = {}; draw(); },
      aplicar: function (anim, t, activo) {
        if (activo) st.tr = null;
        norm(anim).forEach(function (a) { var f = A[a.a]; if (f) f(t, a, activo); else if (window.console) console.warn('acción desconocida', a.a); });
        draw();
      },
      tema: function () { aplicaTema(); if (cor) cor.refrescaColores(); draw(); },
      corriente: cor,
      _dbg: function () { return { O: O, GL: GL }; },
      dispose: function () { own.forEach(function (g) { g.dispose(); }); if (cor) cor.dispose(); }
    };
    return api;
  };
})();
