/* Pasos comunes de los procedimientos E.1 y E.2 (apartado 5.E del manual: «Otras instalaciones»).
   Texto fiel al manual (E.1 y E.2 tienen las mismas operaciones previas y casi las mismas finales).
   Las animaciones remiten a las acciones de caja-derivacion.js (y, por delegación, de apoyo-bt.js). */
(function () {
  'use strict';
  window.TET = window.TET || {};
  var OBJ_DET = [{ cam: 'dObjetos', txt: 'Detalle: objetos metálicos del jefe de trabajo (ilustrativo)' }, { cam: 'dObjetosAy', txt: 'Detalle: objetos metálicos del ayudante (ilustrativo)' }, { cam: 'dBandeja', txt: 'Detalle: bandeja sobre la lona (ilustrativo)' }];
  TET.pasosCaja = {
    OBJ_DET: OBJ_DET,
    previas: function (pag) {
      return { nombre: 'Operaciones previas', pasos: [
        { texto: 'Identificar la instalación dónde se va a realizar el trabajo.', pag: pag, anim: 'identificar', cam: 'general', ilus: 'El aro y la flecha solo marcan la caja de derivación; el manual no detalla cómo se identifica la instalación. La fachada, las ventanas y el entorno son representativos.' },
        { texto: 'Comprobar que las condiciones atmosféricas permiten el trabajo.', pag: pag, anim: 'clima', cam: 'cielo', ilus: 'El manual no fija qué condiciones son aceptables; el cielo despejado es solo un pictograma.' },
        { texto: 'Colocar la señalización vial si fuera necesario.', pag: pag, anim: 'vial', cam: 'vial', ilus: 'El manual solo cita «equipo de señalización vial»; furgoneta, conos y señal son representativos.' },
        { texto: 'Inspeccionar la instalación donde se va a trabajar.', pag: pag, anim: 'inspeccion', cam: 'fachada', ilus: 'El aro que sube por la fachada hasta la caja representa la inspección; el manual no detalla qué se revisa.' },
        { texto: 'Delimitar y señalizar el lugar de trabajo.', pag: pag, anim: 'valla', cam: 'general', ilus: 'El tipo y la disposición de las vallas son representativos.' },
        { texto: 'Verificar el estado de los equipos de protección individual, equipos de protección colectiva y herramientas que se vayan a utilizar.', pag: pag, anim: 'verificar', cam: 'lona', ilus: 'Los equipos sobre la lona son una muestra; el manual no detalla cómo se verifican.' },
        { texto: 'Desprenderse de los objetos metálicos el trabajador/es.', pag: pag, anim: 'metal', cam: 'objetos', dur: 6, det: OBJ_DET, ilus: 'Cadena con colgante, reloj, anillo, pulsera, hebilla, bolígrafo, navaja y llaves son ejemplos de objetos metálicos de ambos trabajadores; el manual solo dice «desprenderse de los objetos metálicos» y no los enumera. Se dejan en una bandeja sobre la lona, lejos de la zona de trabajo.' },
        { texto: 'Utilizar los equipos de protección tanto individual como colectivos, necesarios en cada fase del trabajo.', pag: pag, anim: 'epi', cam: 'suelo2', ilus: 'Se dibujan pantalla facial, guantes y cinturón; el resto de EPI de la ficha no se representa. En el ayudante solo se dibujan pantalla facial y guantes.' },
        { texto: 'Observar el estado de la caja por el exterior; si hubiera síntoma de un calentamiento o fogueo no ejecutar el trabajo de tensión', pag: pag, anim: 'observa', cam: 'fachada', dur: 4, ilus: 'El manual no detalla cómo se observa la caja: se anima un aro alrededor de la caja cerrada y una marca de visto bueno (caja sin síntomas de calentamiento o fogueo).' }
      ] };
    },
    finales: function (pag, vialTxt, extra) {
      return { nombre: 'Operaciones finales', pasos: [
        { texto: 'Inspeccionar visualmente el conjunto de la instalación.', pag: pag, anim: ['inspeccion', 'baja'], cam: 'general', dur: 5, ilus: 'El descenso del trabajador por la escalera no figura en el manual; se anima para que el recorrido sea coherente.' },
        { texto: 'Revisar, limpiar y guardar los equipos, herramientas y materiales empleados en el trabajo.', pag: pag, anim: 'guardar', cam: 'lona', ilus: 'Se recogen la escalera y los equipos de la lona; el manual no detalla el orden.' },
        { texto: 'Retirar la señalización y delimitación del lugar de trabajo.', pag: pag, anim: { a: 'valla', inv: true }, cam: 'general', ilus: 'Se retiran las vallas.' },
        { texto: 'Retirar materiales de desecho.', pag: pag, anim: 'desecho', cam: 'suelo2', dur: 3.5, ilus: 'La bolsa de desecho es representativa. ' + (extra || '') },
        { texto: vialTxt, pag: pag, anim: { a: 'vial', inv: true }, cam: 'vial' }
      ] };
    }
  };
})();
