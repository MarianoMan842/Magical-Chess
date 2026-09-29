# Ajedrez accesible por voz

## Qué es
Un juego de ajedrez para navegador que se puede jugar sin ver la pantalla. Convierte el estado del tablero en descripción hablada en español y permite decir las jugadas en voz alta para que se muevan solas.

## Por qué
Pensado para el caso ONCE: las personas ciegas o con baja visión necesitan seguir e interactuar con la partida por audio, no por vista. La mayoría de tableros online son solo visuales.

## Objetivo
Que una persona ciega juegue una partida completa usando solo la voz y el teclado: dictar jugadas, escuchar cada movimiento y el estado (jaque, mate, tablas) y consultar la posición cuando quiera.

## Innovación
Flujo de voz bidireccional validado por reglas: la app describe (speechSynthesis) y además escucha (SpeechRecognition) y ejecuta la jugada solo si chess.js la confirma legal, resolviendo ambigüedades. Todo en español, operable con dos teclas y sin ratón.

## Cómo se usa
Abre index.html en Chrome o Edge y concede permiso de micrófono. Espacio: decir jugada. Enter: escuchar la posición. Tab o F5: reiniciar. Botón para silenciar la voz.

## Tecnología
HTML, CSS y JavaScript puros, sin build ni dependencias npm. chess.js (incluido) para las reglas. Web Speech API del navegador para voz de entrada y salida.
