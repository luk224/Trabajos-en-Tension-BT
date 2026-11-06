/* ============================================================
   TET.corriente — puntos animados que recorren los conductores en tensión.
   Módulo compartido y sin dependencias (usa el THREE global r147 que le pasa la escena).
   Ilustrativo: los puntos indican «conductor en tensión»; NO el sentido real de la corriente alterna.

   USO DESDE CUALQUIER ESCENA (ctx es el que recibe la escena en TET.escenas[nombre] = function (ctx) {…}):

     var cor = window.TET && TET.corriente ? TET.corriente.crear(ctx) : null;     // una vez por escena
     // …al (re)construir la escena:
     cor.clear();
     cor.addPath('lin-N', function () { return puntosDeLaPolilinea; }, 'N');       // puntos: array de THREE.Vector3
     cor.addPath('aco-R', arrayEstatico, 'R', { dens: 3, size: 0.09, speed: 1.1 });// o una polilínea fija
     // …en cada aplicar()/draw(), SEGÚN EL ESTADO DEL PASO (determinista, no depende del tiempo):
     cor.setLive('lin-N', 1);      // 0..1: 0 oculta, 1 plena densidad (fundido por opacidad)
     cor.setLive('aco-R', 0);      // p. ej. derivación sin tensión tras «Retirar fusibles»
     cor.refresh();                // recoloca los puntos si la forma de algún camino ha cambiado
     // …en la API de la escena:   api.corriente = cor;   api.tema = function () { …; cor.refrescaColores(); };

   Argumentos:
     id      cadena única por camino.
     puntos  array de THREE.Vector3 (polilínea) o función () → array (se evalúa en cada fotograma de corriente, por lo que
             sirve para cables que se deforman o elevan).
     color   clave de la paleta CSS ('N' azul, 'R' marrón, 'S' negro con halo claro, 'T' gris, …) o color CSS '#rrggbb'.
     opts    {dens: puntos por metro (3), size: tamaño en metros (0.13), speed: m/s (1.1), max: puntos máx. (90),
              halo: borde claro (por defecto true: así se ve el punto sobre un cable de su mismo color)}.
   El MOTOR (tet.js) anima a ≤30 fps solo mientras haya algún live>0, el lienzo esté en pantalla, la pestaña visible y el
   botón «Ver corriente» activo; con prefers-reduced-motion los puntos quedan quietos y espaciados.

   IDS DE CAMINO usados por apoyo-bt.js (A.1, A.2 y escenas que lo reutilizan):
     'lin-N','lin-R','lin-S','lin-T'   línea principal (ambos vanos), siempre en tensión.
     'lin2-N'…'lin2-T'                 segundo circuito (aparece con el paso de doble circuito).
     'aco-N'…'aco-T'                   derivación (acometida) → CGP: en tensión si está conectada y con fusibles puestos.
     'edif-N'…'edif-T'                 salida de la CGP hacia el edificio: igual que la acometida.
   ============================================================ */
(function () {
  'use strict';
  window.TET = window.TET || {};
  var CIRC = null;

  function textura(T) {
    if (CIRC) return CIRC;
    var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d');
    g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    CIRC = new T.CanvasTexture(c); return CIRC;
  }

  TET.corriente = {
    crear: function (ctx) {
      var T = ctx.THREE, pal = ctx.pal, paths = {}, ids = [], enabled = true, reduced = !!ctx.reducir, phase = 0;
      var group = new T.Group(); group.frustumCulled = false; ctx.scene.add(group);
      var tex = textura(T);
      function cl(x) { return Math.min(1, Math.max(0, x)); }
      function css(c) { return /^(#|rgb)/.test(c) ? c : pal(c); }

      function mkPoints(n, size, color, order) {
        var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3).setUsage(T.DynamicDrawUsage));
        var m = new T.PointsMaterial({ size: size, map: tex, transparent: true, depthWrite: false, alphaTest: 0.04, sizeAttenuation: true, color: color, opacity: 0 });
        m.onBeforeCompile = function (sh) { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n gl_Position.z -= 3e-4 * gl_Position.w;'); };   // adelanta los puntos para que no los tape el propio tubo del conductor
        var p = new T.Points(g, m); p.frustumCulled = false; p.renderOrder = order; p.visible = false; group.add(p); return p;
      }
      var C = {
        addPath: function (id, puntos, color, o) {
          o = o || {};
          var fn = typeof puntos === 'function' ? puntos : function () { return puntos; };
          var pts = fn(), L = 0, i;
          for (i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]);
          var n = Math.max(4, Math.min(o.max || 90, Math.ceil((L || 4) * (o.dens || 3))));
          var size = o.size || 0.13, halo = o.halo == null ? true : o.halo;
          var p = { id: id, fn: fn, color: color, n: n, live: 0, speed: o.speed || 1.1, size: size };
          if (halo) p.halo = mkPoints(n, size * 1.7, css('halo'), 28);
          p.pts = mkPoints(n, size, css(color), 29);
          if (halo) p.pts.material.color.set(css(color));
          paths[id] = p; ids.push(id); return p;
        },
        has: function (id) { return !!paths[id]; },
        setLive: function (id, v) {
          var p = paths[id]; if (!p) return; v = cl(v);
          if (Math.abs(v - p.live) < 0.002) return;
          p.live = v; apply(p); if (v > 0.002) fill(p); ctx.pedir();
        },
        refresh: function () { for (var i = 0; i < ids.length; i++) { var p = paths[ids[i]]; if (p.live > 0.002 && enabled) fill(p); } },
        update: function (dt) { phase += dt; C.refresh(); },
        activo: function () { if (!enabled || reduced) return false; for (var i = 0; i < ids.length; i++) if (paths[ids[i]].live > 0.002) return true; return false; },
        hayPuntos: function () { if (!enabled) return false; for (var i = 0; i < ids.length; i++) if (paths[ids[i]].live > 0.002) return true; return false; },
        setEnabled: function (b) { enabled = !!b; for (var i = 0; i < ids.length; i++) apply(paths[ids[i]]); C.refresh(); ctx.pedir(); },
        setReducedMotion: function (b) { reduced = !!b; if (reduced) phase = 0; C.refresh(); },
        refrescaColores: function () { ids.forEach(function (id) { var p = paths[id]; p.pts.material.color.set(css(p.color)); if (p.halo) p.halo.material.color.set(css('halo')); }); ctx.pedir(); },
        clear: function () {
          ids.forEach(function (id) { var p = paths[id];[p.pts, p.halo].forEach(function (m) { if (m) { group.remove(m); m.geometry.dispose(); m.material.dispose(); } }); });
          paths = {}; ids = [];
        },
        dispose: function () { C.clear(); ctx.scene.remove(group); }
      };
      function apply(p) {
        var vis = enabled && p.live > 0.002;
        p.pts.visible = vis; p.pts.material.opacity = p.live; if (p.halo) { p.halo.visible = vis; p.halo.material.opacity = p.live; }
      }
      var _p = new T.Vector3();
      function fill(p) {
        var pts = p.fn(), m = pts.length; if (m < 2) return;
        var cum = [0], i, L = 0;
        for (i = 1; i < m; i++) { L += pts[i].distanceTo(pts[i - 1]); cum.push(L); }
        if (L < 1e-3) return;
        var n = p.n, sp = L / n, off = (phase * p.speed) % L, seg = 1, a = p.pts.geometry.attributes.position.array, h = p.halo ? p.halo.geometry.attributes.position.array : null;
        for (var k = 0; k < n; k++) {
          var s = (off + k * sp) % L; if (s < 0) s += L;
          seg = 1; while (seg < m - 1 && cum[seg] < s) seg++;
          var u = (s - cum[seg - 1]) / ((cum[seg] - cum[seg - 1]) || 1);
          _p.lerpVectors(pts[seg - 1], pts[seg], u);
          a[k * 3] = _p.x; a[k * 3 + 1] = _p.y; a[k * 3 + 2] = _p.z;
          if (h) { h[k * 3] = _p.x; h[k * 3 + 1] = _p.y; h[k * 3 + 2] = _p.z; }
        }
        p.pts.geometry.attributes.position.needsUpdate = true; if (h) p.halo.geometry.attributes.position.needsUpdate = true;
      }
      return C;
    }
  };
})();
