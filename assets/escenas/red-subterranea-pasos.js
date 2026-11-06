/* Pasos y textos comunes de los procedimientos C.1, C.2 y C.3 (apartado 5.C del manual).
   Texto fiel al manual; las animaciones remiten a las acciones de red-subterranea.js. */
(function () {
  'use strict';
  window.TET = window.TET || {};
  var ILUS_VIAL = 'El manual solo cita «equipo de señalización vial»; furgoneta, conos y señal son representativos.';
  TET.pasosSubt = {
    previas: function (pag) {
      return { nombre: 'Operaciones previas al trabajo', pasos: [
        { texto: 'Identificar la instalación dónde se va a realizar el trabajo.', pag: pag, anim: 'identificar', cam: 'general', ilus: 'El aro y la flecha solo marcan la cala; el manual no detalla cómo se identifica.' },
        { texto: 'Comprobar que las condiciones atmosféricas permiten el trabajo.', pag: pag, anim: 'clima', cam: 'cielo', ilus: 'El manual no fija qué condiciones son aceptables; el cielo despejado es solo un pictograma.' },
        { texto: 'Colocar la señalización vial si fuera necesario.', pag: pag, anim: 'vial', cam: 'vial', ilus: ILUS_VIAL },
        { texto: 'Inspeccionar la instalación donde se va a trabajar entibando si se considera necesario.', pag: pag, anim: 'inspeccion', cam: 'cala', dur: 5, ilus: 'El aro recorre la cala y, como «si se considera necesario», se dibuja un entibado de tablones y codales; el manual no describe su disposición.' },
        { texto: 'Delimitar y señalizar el lugar de trabajo.', pag: pag, anim: 'valla', cam: 'general', ilus: 'El tipo y la disposición de las vallas alrededor de la cala son representativos.' },
        { texto: 'Verificar el estado de los equipos de protección individual, equipos de protección colectiva y herramientas que se vayan a utilizar.', pag: pag, anim: 'verificar', cam: 'lona', ilus: 'Los equipos sobre la lona son una muestra; el manual no detalla cómo se verifican.' },
        { texto: 'Desprenderse de los objetos metálicos el trabajador/es.', pag: pag, anim: 'metal', cam: 'suelo2', ilus: 'Reloj, anillo y cadena son ejemplos de objetos metálicos; el manual no los enumera.' },
        { texto: 'Utilizar los equipos de protección tanto individual como colectivos, necesarios en cada fase del trabajo.', pag: pag, anim: 'epi', cam: 'suelo2', ilus: 'Se dibujan pantalla facial, guantes y cinturón; el resto de EPI de la ficha no se representa. En el ayudante solo se dibujan pantalla facial y guantes.' }
      ] };
    },
    /* pasos de la caja general de protección / caja de acometida (iguales en los tres) */
    cajaPasos: function (pag, nombre) {
      var c = nombre === 'acom' ? 'caja de acometida' : 'caja general de protección';
      var rev = nombre === 'acom' ? 'Revisar la caja (de acometida).' : 'Revisar la caja general de protección de la acometida.';
      return [
        { texto: rev, pag: pag, anim: 'cgpAbre', cam: 'cgp', ilus: 'El manual no dice quién la revisa; se anima al ayudante. La caja se dibuja en la fachada del edificio y el tramo enterrado de la acometida no se ve.' },
        { texto: 'Retirar fusibles de la ' + c + '.', pag: pag, anim: { a: 'cgpFus' }, cam: 'cgp', ilus: 'El manual no dice quién lo hace; fusibles y barra de neutro son esquemáticos.' },
        { texto: 'Cerrar y precintar la ' + c + (nombre === 'acom' ? ', si fuera necesario.' : ' si fuera necesario.'), pag: pag, anim: 'cgpCierra', cam: 'cgp', ilus: 'El precinto se dibuja como una esfera roja en el cierre.' },
        { texto: 'Si es necesario, señalizar, exterior e interiormente, la ' + c + '.', pag: pag, anim: 'senalCgp', cam: 'cgp', ilus: 'El tipo de cartel es representativo; el manual no lo describe.' }
      ];
    }
  };
})();
