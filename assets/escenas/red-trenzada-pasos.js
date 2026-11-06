/* Pasos comunes de los procedimientos B.1, B.2 y B.3 (apartado 5.B del manual).
   Texto fiel al manual (el orden y la redacción de las operaciones previas cambian ligeramente
   de un procedimiento a otro: se reproduce el de cada uno). Las animaciones remiten a las
   acciones de apoyo-bt.js y red-trenzada.js. */
(function () {
  'use strict';
  window.TET = window.TET || {};
  var I = {
    vial: 'El manual solo cita «equipo de señalización vial»; furgoneta, conos y señal son representativos.'
  };
  function previa(id, pag, delimTxt) {
    var t = {
      ident: { texto: 'Identificar la instalación donde se va a realizar el trabajo.', anim: 'identificar', cam: 'general', ilus: 'El aro y la flecha solo marcan la instalación; el manual no detalla cómo se identifica.' },
      clima: { texto: 'Comprobar que las condiciones atmosféricas permiten el trabajo.', anim: 'clima', cam: 'cielo', ilus: 'El manual no fija qué condiciones son aceptables; el cielo despejado es solo un pictograma.' },
      vial: { texto: 'Colocar la señalización vial si fuera necesario.', anim: 'vial', cam: 'vial', ilus: I.vial },
      insp: { texto: 'Inspeccionar la instalación donde se va a trabajar.', anim: 'inspeccion', cam: 'poste', ilus: 'El aro que sube por el apoyo representa la inspección; el manual no detalla qué se revisa.' },
      delim: { texto: delimTxt, anim: 'valla', cam: 'general', ilus: 'El tipo y la disposición de las vallas son representativos.' },
      verif: { texto: 'Verificar el estado de los equipos de protección individual, equipos de protección colectiva y herramientas que se vayan a utilizar.', anim: 'verificar', cam: 'lona', ilus: 'Los equipos sobre la lona son una muestra; el manual no detalla cómo se verifican.' },
      metal: { texto: 'Desprenderse de los objetos metálicos trabajador/es.', anim: 'metal', cam: 'objetos', dur: 6,
        det: [{ cam: 'dObjetos', txt: 'Detalle: objetos metálicos del jefe de trabajo (ilustrativo)' }, { cam: 'dObjetosAy', txt: 'Detalle: objetos metálicos del ayudante (ilustrativo)' }, { cam: 'dBandeja', txt: 'Detalle: bandeja sobre la lona (ilustrativo)' }],
        ilus: 'Cadena con colgante, reloj, anillo, pulsera, hebilla, bolígrafo, navaja y llaves son ejemplos de objetos metálicos de ambos trabajadores; el manual solo dice «desprenderse de los objetos metálicos» y no los enumera. Se dejan en una bandeja sobre la lona, lejos de la zona de trabajo.' },
      epi: { texto: 'Utilizar los equipos de protección tanto individual como colectivos, necesarios en cada fase del trabajo.', anim: 'epi', cam: 'suelo2', ilus: 'Se dibujan pantalla facial, guantes y cinturón; el resto de EPI de la ficha no se representa. En el ayudante solo se dibujan pantalla facial y guantes.' }
    }[id];
    var r = { texto: t.texto, pag: pag, anim: t.anim, cam: t.cam, ilus: t.ilus }; if (t.dur) r.dur = t.dur; if (t.det) r.det = t.det; return r;
  }
  TET.pasosRedTrenzada = {
    /* orden: lista de claves; B.1 y B.3: ident, clima, vial, insp, delim, verif, metal, epi; B.2: clima, ident, insp, delim, vial, verif, metal, epi */
    previas: function (pag, orden, delimTxt) {
      return { nombre: 'Operaciones previas', pasos: orden.map(function (k) { return previa(k, pag, delimTxt); }) };
    },
    /* Operaciones finales de B.1 y B.2 (9 puntos; difieren solo en el texto de «reponer fusibles») */
    finales9: function (pag, fusTxt, carteles) {
      return { nombre: 'Operaciones finales', pasos: [
        { texto: 'Comprobar que la tensión es correcta.', pag: pag, anim: { a: 'pinza', fases: 4 }, cam: 'cabeza2', dur: 4.5, ilus: 'El punto de medida y el método no se detallan en el manual.' },
        { texto: 'Si es necesario, comprobar concordancia de fases.', pag: pag, anim: 'comprobador', cam: 'cgp', dur: 3.5, ilus: 'El manual lista un «comprobador de secuencia de fases»; su aspecto y uso se dibujan de forma esquemática.' },
        { texto: fusTxt, pag: pag, anim: { a: 'cgpFus', inv: true }, cam: 'cgp' },
        { texto: 'Inspeccionar visualmente el conjunto de la instalación.', pag: pag, anim: ['inspeccion', 'descenso'], cam: 'general', dur: 5, ilus: 'El descenso del trabajador por la escalera no figura en el manual; se anima para que el recorrido sea coherente.' },
        { texto: 'Cerrar y precintar la caja general de protección.', pag: pag, anim: 'cgpCierra', cam: 'cgp' },
        { texto: 'Revisar, limpiar y guardar los equipos, herramientas y materiales empleados en el trabajo.', pag: pag, anim: 'guardar', cam: 'lona', ilus: 'Se recogen la escalera y los equipos de la lona; el manual no detalla el orden.' },
        { texto: 'Retirar la señalización y delimitación del lugar de trabajo.', pag: pag, anim: carteles ? [{ a: 'valla', inv: true }, 'quitaSenal'] : { a: 'valla', inv: true }, cam: 'general', ilus: carteles ? 'Se retiran las vallas y también los carteles de la caja general de protección.' : 'Se retiran las vallas.' },
        { texto: 'Retirar materiales de desecho.', pag: pag, anim: 'desecho', cam: 'suelo2', dur: 3.5, ilus: 'La bolsa de desecho es representativa.' },
        { texto: 'Retirar la señalización vial, si ha sido necesario colocarla.', pag: pag, anim: { a: 'vial', inv: true }, cam: 'vial' }
      ] };
    }
  };
})();
