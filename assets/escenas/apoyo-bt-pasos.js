/* Pasos y textos comunes de los procedimientos A.1 y A.2 (apartado 5.A del manual).
   Texto fiel al manual; las animaciones remiten a las acciones de apoyo-bt.js. */
(function () {
  'use strict';
  window.TET = window.TET || {};
  var ILUS_VIAL = 'El manual solo cita «equipo de señalización vial»; furgoneta, conos y señal son representativos.';
  TET.pasosApoyoBT = {
    previas: function (pag, extra1) {
      return { nombre: 'Operaciones previas', pasos: [
        { texto: 'Identificar la instalación donde se va a realizar el trabajo.', pag: pag, anim: 'identificar', cam: 'general', ilus: 'El aro y la flecha solo marcan la instalación; el manual no detalla cómo se identifica.' + (extra1 ? ' ' + extra1 : '') },
        { texto: 'Comprobar que las condiciones atmosféricas permiten el trabajo.', pag: pag, anim: 'clima', cam: 'cielo', ilus: 'El manual no fija qué condiciones son aceptables; el cielo despejado es solo un pictograma.' },
        { texto: 'Colocar la señalización vial si fuera necesario.', pag: pag, anim: 'vial', cam: 'vial', ilus: ILUS_VIAL },
        { texto: 'Inspeccionar la instalación donde se va a trabajar.', pag: pag, anim: 'inspeccion', cam: 'poste', ilus: 'El aro que sube por el apoyo representa la inspección; el manual no detalla qué se revisa.' },
        { texto: 'Delimitar y señalizar el lugar de trabajo.', pag: pag, anim: 'valla', cam: 'general', ilus: 'El tipo y la disposición de las vallas son representativos.' },
        { texto: 'Verificar el estado de los equipos de protección individual, equipos de protección colectiva y herramientas que se vayan a utilizar.', pag: pag, anim: 'verificar', cam: 'lona', ilus: 'Los equipos sobre la lona son una muestra; el manual no detalla cómo se verifican.' },
        { texto: 'Desprenderse de los objetos metálicos el trabajador/es.', pag: pag, anim: 'metal', cam: 'objetos', dur: 6, det: [{ cam: 'dObjetos', txt: 'Detalle: objetos metálicos del jefe de trabajo (ilustrativo)' }, { cam: 'dObjetosAy', txt: 'Detalle: objetos metálicos del ayudante (ilustrativo)' }, { cam: 'dBandeja', txt: 'Detalle: bandeja sobre la lona (ilustrativo)' }], ilus: 'Cadena con colgante, reloj, anillo, pulsera, hebilla, bolígrafo, navaja y llaves son ejemplos de objetos metálicos de ambos trabajadores; el manual solo dice «desprenderse de los objetos metálicos» y no los enumera. Se dejan en una bandeja sobre la lona, lejos de la zona de trabajo.' },
        { texto: 'Utilizar los equipos de protección tanto individual como colectivos, necesarios en cada fase del trabajo.', pag: pag, anim: 'epi', cam: 'suelo2', ilus: 'Se dibujan pantalla facial, guantes y cinturón; el resto de EPI de la ficha no se representa. En el ayudante solo se dibujan pantalla facial y guantes.' }
      ] };
    },
    /* cola común de las operaciones finales (textos de A.1 y A.2; difieren en la última) */
    iniciaFinales: function () { return null; }
  };
})();
