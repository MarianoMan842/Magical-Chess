// chess.min.js expone Chess como variable global (window.Chess)
if (typeof Chess === "undefined") {
    document.body.innerHTML =
        '<p style="color:#fff;font-family:sans-serif;padding:40px">' +
        "No se pudo cargar chess.js. Asegúrate de que el archivo " +
        "<b>chess.min.js</b> está en la misma carpeta que index.html.</p>";
    throw new Error("chess.js no está cargado");
}

const juego = new Chess();

const elTablero = document.getElementById("tablero");
const elJugadas = document.getElementById("jugadas");
const elNarracion = document.getElementById("narracion");
const elEstado = document.getElementById("estado");
const elRespuestaTablas = document.getElementById("respuestaTablas");
const elRespuestaRendicion = document.getElementById("respuestaRendicion");

// Muestra u oculta los botones de aceptar/rechazar según haya oferta pendiente
function actualizarBotonesTablas() {
    if (tablasOfrecidasPor) {
        elRespuestaTablas.classList.remove("oculto");
    } else {
        elRespuestaTablas.classList.add("oculto");
    }
}

// Muestra u oculta los botones de confirmar/cancelar la rendición
function actualizarBotonesRendicion() {
    if (rendicionPendientePor) {
        elRespuestaRendicion.classList.remove("oculto");
    } else {
        elRespuestaRendicion.classList.add("oculto");
    }
}

// Nombre en español de cada tipo de pieza (chess.js usa p n b r q k)
const NOMBRES_PIEZAS = {
    p: "Peón",
    n: "Caballo",
    b: "Alfil",
    r: "Torre",
    q: "Dama",
    k: "Rey",
};

// Piezas de género femenino (Torre, Dama): concuerdan como "blanca"/"negra".
// El resto (Peón, Caballo, Alfil, Rey) van en masculino "blanco"/"negro".
const PIEZAS_FEMENINAS = ["r", "q"];

// Devuelve el color con el género correcto según el tipo de pieza.
function colorDePieza(tipo, colorLetra) {
    const femenino = PIEZAS_FEMENINAS.includes(tipo);
    if (colorLetra === "w") {
        return femenino ? "blanca" : "blanco";
    }
    return femenino ? "negra" : "negro";
}

// Símbolos Unicode de las piezas. chess.js usa letras: p n b r q k
// en minúscula = negras, mayúscula = blancas.
const SIMBOLOS = {
    p: "\u265F", n: "\u265E", b: "\u265D", r: "\u265C", q: "\u265B", k: "\u265A",
    P: "\u2659", N: "\u2658", B: "\u2657", R: "\u2656", Q: "\u2655", K: "\u2654",
};

const COLUMNAS = ["a", "b", "c", "d", "e", "f", "g", "h"];

let casillaSeleccionada = null;  // ej. "e2"
let vozActiva = true;            // dictado de jugadas en voz alta
let colorRendido = null;         // 'w' o 'b' si alguien se ha rendido; si no, null
let tablasAcordadas = false;     // true si la partida terminó en tablas acordadas
let tablasOfrecidasPor = null;   // 'w' o 'b' si hay una oferta de tablas pendiente
let rendicionPendientePor = null; // 'w' o 'b' si alguien pidió rendirse y falta confirmar

// Dibuja el tablero según la posición actual del juego
function dibujarTablero() {
    elTablero.innerHTML = "";

    // Fila 8 arriba (índice 7) hasta la 1 abajo (índice 0)
    for (let fila = 7; fila >= 0; fila--) {
        for (let col = 0; col < 8; col++) {
            const nombre = COLUMNAS[col] + (fila + 1);  // ej. "e4"
            const div = document.createElement("div");
            div.className = "casilla " + ((fila + col) % 2 === 0 ? "oscura" : "clara");
            div.dataset.casilla = nombre;

            const pieza = juego.get(nombre);
            if (pieza) {
                // pieza.type es minúscula; pieza.color es 'w' o 'b'
                const letra = pieza.color === "w"
                    ? pieza.type.toUpperCase()
                    : pieza.type;
                const spanPieza = document.createElement("span");
                // Marcamos el color ('w' o 'b') para poder darle estilo por CSS
                spanPieza.className = "pieza " + pieza.color;
                spanPieza.textContent = SIMBOLOS[letra];
                div.appendChild(spanPieza);
            }

            // Coordenadas: número de fila en la columna 'a' (izquierda),
            // letra de columna en la fila 1 (abajo)
            if (col === 0) {
                const num = document.createElement("span");
                num.className = "coord fila";
                num.textContent = fila + 1;
                div.appendChild(num);
            }
            if (fila === 0) {
                const let_ = document.createElement("span");
                let_.className = "coord columna";
                let_.textContent = COLUMNAS[col];
                div.appendChild(let_);
            }

            div.addEventListener("click", () => alHacerClic(nombre));
            elTablero.appendChild(div);
        }
    }

    pintarResaltados();
}

// Busca la casilla donde está el rey de un color ('w' o 'b')
function casillaDelRey(color) {
    for (let fila = 0; fila < 8; fila++) {
        for (let col = 0; col < 8; col++) {
            const nombre = COLUMNAS[col] + (fila + 1);
            const pieza = juego.get(nombre);
            if (pieza && pieza.type === "k" && pieza.color === color) {
                return nombre;
            }
        }
    }
    return null;
}

// Marca la casilla seleccionada, sus movimientos posibles y el rey en jaque
function pintarResaltados() {
    // Rey en jaque / jaque mate: el rey afectado es el del turno actual
    if (juego.in_check()) {
        const casillaRey = casillaDelRey(juego.turn());
        if (casillaRey) {
            const celdaRey = elTablero.querySelector(
                `[data-casilla="${casillaRey}"]`
            );
            if (celdaRey) {
                // Rojo oscuro si es mate, rojo normal si es solo jaque
                celdaRey.classList.add(
                    juego.in_checkmate() ? "jaque-mate" : "jaque"
                );
            }
        }
    }

    if (!casillaSeleccionada) return;

    const seleccionada = elTablero.querySelector(
        `[data-casilla="${casillaSeleccionada}"]`
    );
    if (seleccionada) seleccionada.classList.add("seleccionada");

    // Movimientos legales desde la casilla seleccionada
    const movimientos = juego.moves({ square: casillaSeleccionada, verbose: true });
    for (const m of movimientos) {
        const destino = elTablero.querySelector(`[data-casilla="${m.to}"]`);
        if (!destino) continue;
        // Si hay pieza en el destino es una captura
        if (juego.get(m.to)) {
            destino.classList.add("captura");
        } else {
            destino.classList.add("movible");
        }
    }
}

function alHacerClic(nombre) {
    // Si la partida terminó por rendición o tablas acordadas, no se mueve nada
    if (colorRendido || tablasAcordadas) return;

    // Con una rendición pendiente de confirmar, hay que responderla antes de mover
    if (rendicionPendientePor) {
        dictar('Hay una rendición pendiente. Confirma con "sí" o cancela con "no".');
        return;
    }

    // Con una oferta de tablas pendiente hay que responderla antes de mover
    if (tablasOfrecidasPor) {
        dictar('Hay una oferta de tablas pendiente. Acepta o rechaza primero.');
        return;
    }

    const pieza = juego.get(nombre);

    // Si ya había una pieza seleccionada, intentamos mover
    if (casillaSeleccionada) {
        const movimiento = juego.move({
            from: casillaSeleccionada,
            to: nombre,
            promotion: "q",  // corona a reina por defecto
        });

        if (movimiento) {
            casillaSeleccionada = null;
            dibujarTablero();
            actualizarJugadas();
            actualizarNarracion();
            actualizarEstado();
            // Dicta en voz alta la jugada recién hecha
            dictar(describirMovimiento(movimiento));
            return;
        }
    }

    // Si no se movió, seleccionamos la pieza (si es del turno actual)
    if (pieza && pieza.color === juego.turn()) {
        casillaSeleccionada = nombre;
    } else {
        casillaSeleccionada = null;
    }
    dibujarTablero();
}

// Lanza una locución en español. Uso interno de dictar/hablarUrgente.
function _hablar(texto) {
    window.speechSynthesis.cancel();  // no encadenar frases
    const locucion = new SpeechSynthesisUtterance(texto);
    locucion.lang = "es-ES";
    locucion.rate = 1;
    window.speechSynthesis.speak(locucion);
}

// Dicta un texto respetando el botón de silencio (para las jugadas normales)
function dictar(texto) {
    if (!vozActiva) return;
    if (!("speechSynthesis" in window)) return;
    _hablar(texto);
}

// Dicta SIEMPRE, ignorando el botón de silencio. Para feedback esencial de
// accesibilidad (bienvenida, avisos). Si el navegador bloquea el audio
// automático, deja la frase pendiente para soltarla en la primera interacción.
let audioDesbloqueado = false;
let frasePendiente = null;

function hablarUrgente(texto) {
    if (!("speechSynthesis" in window)) return;
    if (audioDesbloqueado) {
        _hablar(texto);
    } else {
        // Aún no ha habido interacción: guardamos la frase para soltarla luego
        frasePendiente = texto;
    }
}

// La primera interacción del usuario desbloquea el audio y suelta lo pendiente
function desbloquearAudio() {
    if (audioDesbloqueado) return;
    audioDesbloqueado = true;
    if (frasePendiente) {
        _hablar(frasePendiente);
        frasePendiente = null;
    }
}

// Traduce un movimiento (objeto verbose de chess.js) a lenguaje natural
function describirMovimiento(m) {
    const color = colorDePieza(m.piece, m.color);
    const pieza = NOMBRES_PIEZAS[m.piece];

    // Enroques: chess.js marca 'k' (corto) o 'q' (largo) en flags
    if (m.flags.includes("k")) {
        return `Enroque corto de las ${m.color === "w" ? "blancas" : "negras"}`;
    }
    if (m.flags.includes("q")) {
        return `Enroque largo de las ${m.color === "w" ? "blancas" : "negras"}`;
    }

    let frase;
    if (m.flags.includes("c") || m.flags.includes("e")) {
        // Captura normal o al paso
        const capturada = NOMBRES_PIEZAS[m.captured];
        // La pieza capturada es del color contrario al que mueve
        const colorCapturada = colorDePieza(m.captured, m.color === "w" ? "b" : "w");
        frase = `${pieza} ${color} captura ${capturada} ${colorCapturada} en ${m.to}`;
        if (m.flags.includes("e")) {
            frase += " (al paso)";
        }
    } else {
        frase = `${pieza} ${color} a ${m.to}`;
    }

    // Coronación
    if (m.flags.includes("p") && m.promotion) {
        frase += `, corona a ${NOMBRES_PIEZAS[m.promotion]}`;
    }

    // Jaque / jaque mate (chess.js pone # o + al final del SAN)
    if (m.san.includes("#")) {
        frase += ". ¡Jaque mate!";
    } else if (m.san.includes("+")) {
        frase += ". Jaque";
    }

    return frase;
}

// Rellena el panel de narración en lenguaje natural
function actualizarNarracion() {
    const historial = juego.history({ verbose: true });
    if (historial.length === 0) {
        elNarracion.innerHTML =
            '<div class="sin-jugadas">Aún no hay jugadas</div>';
        return;
    }

    let html = "";
    for (let i = 0; i < historial.length; i += 2) {
        const numero = i / 2 + 1;
        const blancas = describirMovimiento(historial[i]);
        const negras = historial[i + 1]
            ? describirMovimiento(historial[i + 1])
            : "";
        html += `<div class="linea">
            <span class="idx">${numero}.</span>
            <span>
                <div class="blancas">${blancas}</div>
                ${negras ? `<div class="negras">${negras}</div>` : ""}
            </span>
        </div>`;
    }
    elNarracion.innerHTML = html;
    elNarracion.scrollTop = elNarracion.scrollHeight;
}

// Describe dónde está cada pieza del tablero: lo escribe en la narración
// y lo dicta en voz alta (como el recorrido de casillas que hicimos en Python)
function describirPosicion() {
    const lineas = [];  // para el panel
    const frases = [];  // para el dictado

    // Recorremos de la fila 8 (arriba) a la 1 (abajo), columna a columna
    for (let fila = 7; fila >= 0; fila--) {
        for (let col = 0; col < 8; col++) {
            const nombre = COLUMNAS[col] + (fila + 1);
            const pieza = juego.get(nombre);
            if (!pieza) continue;  // saltamos las casillas vacías

            const color = colorDePieza(pieza.type, pieza.color);
            const tipo = NOMBRES_PIEZAS[pieza.type];
            lineas.push(`${tipo} ${color} en ${nombre}`);
            frases.push(`${tipo} ${color} en ${nombre}`);
        }
    }

    // Volcamos la lista en el panel de narración
    const html = lineas
        .map((t) => `<div class="linea"><span>${t}</span></div>`)
        .join("");
    elNarracion.innerHTML = html;
    elNarracion.scrollTop = 0;

    // Lo dictamos como una sola locución, separando las piezas con pausas
    dictar("Posición actual. " + frases.join(". "));
}

// Palabras habladas -> letra de pieza de chess.js
const PIEZA_POR_NOMBRE = {
    "peon": "p", "peón": "p",
    "caballo": "n",
    "alfil": "b",
    "torre": "r",
    "dama": "q", "reina": "q",
    "rey": "k",
};

// Normaliza texto hablado a casilla algebraica.
// El reconocedor suele oír "e cuatro", "letra e 4", etc. Convertimos números
// hablados a dígitos y juntamos letra+número en algo como "e4".
function extraerCasillas(texto) {
    let t = " " + texto.toLowerCase() + " ";

    // Números hablados -> dígito
    const NUMS = {
        " uno ": " 1 ", " dos ": " 2 ", " tres ": " 3 ", " cuatro ": " 4 ",
        " cinco ": " 5 ", " seis ": " 6 ", " siete ": " 7 ", " ocho ": " 8 ",
    };
    for (const [palabra, digito] of Object.entries(NUMS)) {
        t = t.split(palabra).join(digito);
    }

    // Buscamos todas las apariciones tipo "e4", "e 4", "letra-columna número"
    const casillas = [];
    const regex = /\b([a-h])\s*([1-8])\b/g;
    let m;
    while ((m = regex.exec(t)) !== null) {
        casillas.push(m[1] + m[2]);
    }
    return casillas;
}

// Interpreta una instrucción hablada ("caballo a f3", "e2 e4", "torre come en d5")
// y ejecuta el movimiento si es legal para el turno actual.
// Devuelve un texto con el resultado (para mostrar y dictar).
function ejecutarJugadaHablada(texto, dictarFallo = true) {
    const limpio = texto.toLowerCase().trim();

    // Respuesta a una rendición pendiente: "sí" confirma, "no" cancela.
    // Se comprueba lo primero para que la respuesta no dispare otro comando.
    if (rendicionPendientePor) {
        if (/\b(si|sí|confirmo|confirmar|me rindo|rindo)\b/.test(limpio)) {
            confirmarRendicion();
            return { ok: true, mensaje: textoEstado() };
        }
        if (/\b(no|cancelo|cancelar|seguir|sigo)\b/.test(limpio)) {
            cancelarRendicion();
            return { ok: true, mensaje: "Rendición cancelada." };
        }
        // Cualquier otra cosa: recordamos que hay una pregunta pendiente
        const mensaje = '¿Seguro que quieres rendirte? Di "sí, me rindo" o "no, seguir jugando".';
        if (dictarFallo) dictar(mensaje);
        return { ok: false, mensaje };
    }

    // Comando de rendición por voz: "me rindo", "rendirse", "abandono"...
    // Ahora solo pide confirmación; se confirma con la respuesta "sí" de arriba.
    if (/\b(me rindo|rendirse|rindo|abandono)\b/.test(limpio)) {
        if (colorRendido || tablasAcordadas || juego.game_over()) {
            const mensaje = "La partida ya ha terminado.";
            if (dictarFallo) dictar(mensaje);
            return { ok: false, mensaje };
        }
        rendirse();
        return { ok: true, mensaje: textoEstado() };
    }

    // Respuesta a una oferta de tablas pendiente: "acepto" / "rechazo".
    // Se comprueba antes que el comando de ofrecer para no reofrecer sin querer.
    if (tablasOfrecidasPor) {
        if (/\b(acepto|aceptar|acepta|si|sí|vale)\b/.test(limpio)) {
            aceptarTablas();
            return { ok: true, mensaje: textoEstado() };
        }
        if (/\b(rechazo|rechazar|rechaza|no)\b/.test(limpio)) {
            rechazarTablas();
            return { ok: true, mensaje: "Oferta de tablas rechazada." };
        }
    }

    // Comando de ofrecer tablas por voz: "tablas", "empate"...
    if (/\b(tablas|empate)\b/.test(limpio)) {
        if (colorRendido || tablasAcordadas || juego.game_over()) {
            const mensaje = "La partida ya ha terminado.";
            if (dictarFallo) dictar(mensaje);
            return { ok: false, mensaje };
        }
        ofrecerTablas();
        return { ok: true, mensaje: textoEstado() };
    }

    // Si la partida terminó por rendición o tablas, no se admiten más jugadas
    if (colorRendido || tablasAcordadas) {
        const mensaje = "La partida ya ha terminado.";
        if (dictarFallo) dictar(mensaje);
        return { ok: false, mensaje };
    }

    // Con una oferta de tablas pendiente, hay que responderla antes de seguir
    if (tablasOfrecidasPor) {
        const mensaje = 'Hay una oferta de tablas pendiente. Di "acepto" o "rechazo".';
        if (dictarFallo) dictar(mensaje);
        return { ok: false, mensaje };
    }

    const casillas = extraerCasillas(texto);

    // Detectamos si se nombró una pieza
    let tipoPieza = null;
    for (const [nombre, letra] of Object.entries(PIEZA_POR_NOMBRE)) {
        if (limpio.includes(nombre)) {
            tipoPieza = letra;
            break;
        }
    }

    // Todos los movimientos legales del turno actual, en modo detallado
    const legales = juego.moves({ verbose: true });

    let candidatos = [];

    if (casillas.length >= 2) {
        // Dijo origen y destino: "e2 e4"
        const [origen, destino] = casillas;
        candidatos = legales.filter(
            (mv) => mv.from === origen && mv.to === destino
        );
    } else if (casillas.length === 1) {
        // Dijo solo el destino: "peón a e3", o incluso solo "e3"
        const destino = casillas[0];
        candidatos = legales.filter((mv) => mv.to === destino);
        // Si además nombró la pieza, filtramos por tipo
        if (tipoPieza) {
            candidatos = candidatos.filter((mv) => mv.piece === tipoPieza);
        }
    }

    if (candidatos.length === 0) {
        const mensaje = "No se puede hacer esa jugada.";
        if (dictarFallo) dictar(mensaje);
        return { ok: false, mensaje };
    }
    if (candidatos.length > 1) {
        // Ambigüedad: varias piezas pueden ir al mismo destino
        const origenes = candidatos.map((c) => c.from).join(", ");
        const mensaje = `Hay varias piezas que pueden hacer eso, desde ${origenes}. Di también la casilla de origen.`;
        if (dictarFallo) dictar(mensaje);
        return { ok: false, mensaje };
    }

    // Un único movimiento posible: lo ejecutamos
    const mv = candidatos[0];
    const movimiento = juego.move({
        from: mv.from,
        to: mv.to,
        promotion: "q",
    });

    casillaSeleccionada = null;
    dibujarTablero();
    actualizarJugadas();
    actualizarNarracion();
    actualizarEstado();

    const descripcion = describirMovimiento(movimiento);
    // Dictamos la jugada y a quién le toca ahora, para jugar sin ver la pantalla
    dictar(descripcion + ". " + textoEstado());
    return { ok: true, mensaje: descripcion };
}

// Rellena el panel de jugadas al estilo chess.com
function actualizarJugadas() {
    const historial = juego.history();  // jugadas en SAN
    if (historial.length === 0) {
        elJugadas.innerHTML = '<div class="sin-jugadas">Aún no hay jugadas</div>';
        return;
    }

    let html = "";
    for (let i = 0; i < historial.length; i += 2) {
        const numero = i / 2 + 1;
        const blancas = historial[i];
        const negras = historial[i + 1] || "";
        html += `<div class="turno">
            <span class="num">${numero}.</span>
            <span class="mov">${blancas}</span>
            <span class="mov">${negras}</span>
        </div>`;
    }
    elJugadas.innerHTML = html;
    elJugadas.scrollTop = elJugadas.scrollHeight;
}

// Devuelve el texto del estado actual (rendición, turno, jaque, mate, tablas)
function textoEstado() {
    const turno = juego.turn() === "w" ? "blancas" : "negras";

    // La rendición y las tablas acordadas terminan la partida y tienen prioridad
    if (colorRendido) {
        const rendido = colorRendido === "w" ? "blancas" : "negras";
        const ganador = colorRendido === "w" ? "negras" : "blancas";
        return `Las ${rendido} se rinden. Ganan las ${ganador}.`;
    }
    if (tablasAcordadas) {
        return "Tablas acordadas. La partida termina en empate.";
    }

    if (juego.in_checkmate()) {
        const ganador = juego.turn() === "w" ? "negras" : "blancas";
        return `Jaque mate. Ganan las ${ganador}.`;
    } else if (juego.in_stalemate()) {
        return "Tablas por ahogado.";
    } else if (juego.in_draw()) {
        return "Tablas.";
    }

    // Oferta de tablas pendiente: responde el jugador que NO la ofreció
    if (tablasOfrecidasPor) {
        const responde = tablasOfrecidasPor === "w" ? "negras" : "blancas";
        return `Las ${responde} tienen una oferta de tablas. Di "acepto" o "rechazo".`;
    }

    if (juego.in_check()) {
        return `Jaque. Turno de las ${turno}.`;
    }
    return `Turno de las ${turno}.`;
}

function actualizarEstado() {
    elEstado.textContent = textoEstado();
}

function reiniciarPartida() {
    juego.reset();
    casillaSeleccionada = null;
    colorRendido = null;
    tablasAcordadas = false;
    tablasOfrecidasPor = null;
    rendicionPendientePor = null;
    actualizarBotonesTablas();  // asegura que aceptar/rechazar queden ocultos
    actualizarBotonesRendicion();  // asegura que confirmar/cancelar queden ocultos
    dibujarTablero();
    actualizarJugadas();
    actualizarNarracion();
    actualizarEstado();
    // Feedback hablado esencial para jugar sin ver la pantalla
    hablarUrgente("Partida reiniciada. Turno de las blancas.");
}

document.getElementById("reiniciar").addEventListener("click", reiniciarPartida);

// Pide confirmación antes de rendirse: despliega los botones y pregunta por voz.
// No termina la partida por sí sola; hay que confirmar con "sí" o cancelar con "no".
function rendirse() {
    // Si la partida ya terminó, o hay una confirmación u oferta pendiente, no hacemos nada
    if (colorRendido || tablasAcordadas || rendicionPendientePor || tablasOfrecidasPor || juego.game_over()) return;

    rendicionPendientePor = juego.turn();
    casillaSeleccionada = null;
    dibujarTablero();
    actualizarBotonesRendicion();  // despliega confirmar/cancelar
    // Preguntamos en voz alta; el jugador responde "sí" o "no"
    hablarUrgente('¿Seguro que quieres rendirte? Di ": sí me rindo" para confirmar o ": no seguir jugando" para seguir jugando.');
}

// Confirma la rendición: se rinde el jugador que la pidió; gana el color contrario.
function confirmarRendicion() {
    if (!rendicionPendientePor) return;

    colorRendido = rendicionPendientePor;
    rendicionPendientePor = null;
    casillaSeleccionada = null;
    dibujarTablero();
    actualizarEstado();
    actualizarBotonesRendicion();  // vuelve a ocultar confirmar/cancelar
    // Feedback hablado esencial para jugar sin ver la pantalla
    hablarUrgente(textoEstado());
}

// Cancela la rendición: la partida sigue con normalidad.
function cancelarRendicion() {
    if (!rendicionPendientePor) return;

    rendicionPendientePor = null;
    actualizarBotonesRendicion();  // vuelve a ocultar confirmar/cancelar
    // Recordamos de quién es el turno para seguir jugando a ciegas
    hablarUrgente("Rendición cancelada. " + textoEstado());
}

document.getElementById("rendirse").addEventListener("click", rendirse);
document.getElementById("confirmarRendicion").addEventListener("click", confirmarRendicion);
document.getElementById("cancelarRendicion").addEventListener("click", cancelarRendicion);

// Ofrece tablas: la ofrece el jugador del turno actual y queda pendiente de que
// el rival responda (aceptar o rechazar). No termina la partida por sí sola.
function ofrecerTablas() {
    // Si la partida ya terminó, o hay una oferta o rendición pendiente, no hacemos nada
    if (colorRendido || tablasAcordadas || tablasOfrecidasPor || rendicionPendientePor || juego.game_over()) return;

    tablasOfrecidasPor = juego.turn();
    casillaSeleccionada = null;
    dibujarTablero();
    actualizarEstado();
    actualizarBotonesTablas();  // despliega aceptar/rechazar
    // Feedback hablado esencial para jugar sin ver la pantalla
    hablarUrgente(textoEstado());
}

// El rival acepta la oferta: la partida termina en tablas.
function aceptarTablas() {
    if (!tablasOfrecidasPor) return;

    tablasOfrecidasPor = null;
    tablasAcordadas = true;
    dibujarTablero();
    actualizarEstado();
    actualizarBotonesTablas();  // vuelve a ocultar aceptar/rechazar
    hablarUrgente(textoEstado());
}

// El rival rechaza la oferta: la partida sigue con normalidad.
function rechazarTablas() {
    if (!tablasOfrecidasPor) return;

    tablasOfrecidasPor = null;
    dibujarTablero();
    actualizarEstado();
    actualizarBotonesTablas();  // vuelve a ocultar aceptar/rechazar
    // Avisamos y recordamos de quién es el turno para seguir jugando a ciegas
    hablarUrgente("Oferta de tablas rechazada. " + textoEstado());
}

document.getElementById("tablas").addEventListener("click", ofrecerTablas);
document.getElementById("aceptar").addEventListener("click", aceptarTablas);
document.getElementById("rechazar").addEventListener("click", rechazarTablas);

const botonVoz = document.getElementById("voz");
botonVoz.addEventListener("click", () => {
    vozActiva = !vozActiva;
    botonVoz.textContent = vozActiva ? "🔊 Voz activada" : "🔇 Voz desactivada";
    // Si se desactiva, cortamos lo que se esté diciendo
    if (!vozActiva && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
});

document.getElementById("describir").addEventListener("click", describirPosicion);

// --- Reconocimiento de voz: di la jugada y se mueve sola (ajedrez mágico) ---
const botonEscuchar = document.getElementById("escuchar");
const elEscuchando = document.getElementById("escuchando");

// La API tiene prefijo en algunos navegadores
const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition;

function mostrarEscucha(texto, clase) {
    elEscuchando.textContent = texto;
    elEscuchando.className = "escuchando" + (clase ? " " + clase : "");
}

// Acción de escuchar por voz. Se asigna si hay reconocimiento disponible;
// si no, queda como no-op para que los atajos de teclado no fallen.
let accionEscuchar = () => {
    mostrarEscucha("Reconocimiento de voz no disponible en este navegador.", "error");
};

if (!Reconocedor) {
    // Navegador sin soporte: desactivamos el botón y avisamos
    botonEscuchar.disabled = true;
    botonEscuchar.title = "Tu navegador no soporta reconocimiento de voz";
    mostrarEscucha("Reconocimiento de voz no disponible en este navegador.", "error");
} else {
    mostrarEscucha("Pulsa Espacio (o el botón) y di tu jugada.", "");

    const reconocedor = new Reconocedor();
    reconocedor.lang = "es-ES";
    reconocedor.interimResults = false;
    reconocedor.maxAlternatives = 3;

    let escuchando = false;

    // Inicia o detiene la escucha. La usan el botón y la tecla espacio.
    function alternarEscucha() {
        if (escuchando) {
            reconocedor.stop();
            return;
        }
        // Al escuchar cortamos la voz para que no se oiga a sí misma
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        reconocedor.start();
    }

    botonEscuchar.addEventListener("click", alternarEscucha);

    // Publicamos la función para que los atajos de teclado (globales) la usen
    accionEscuchar = alternarEscucha;

    reconocedor.addEventListener("start", () => {
        escuchando = true;
        botonEscuchar.classList.add("grabando");
        botonEscuchar.textContent = "🎤 Escuchando...";
        mostrarEscucha("Di tu jugada, por ejemplo: Caballo a f3", "activo");
    });

    reconocedor.addEventListener("end", () => {
        escuchando = false;
        botonEscuchar.classList.remove("grabando");
        botonEscuchar.textContent = "🎤 Decir jugada";
    });

    reconocedor.addEventListener("error", (e) => {
        let msg = "Error de reconocimiento.";
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            msg = "Permiso de micrófono denegado.";
        } else if (e.error === "no-speech") {
            msg = "No te escuché. Inténtalo otra vez.";
        }
        mostrarEscucha(msg, "error");
    });

    reconocedor.addEventListener("result", (evento) => {
        // Probamos todas las alternativas que ofrece el reconocedor
        const alternativas = [];
        for (let i = 0; i < evento.results[0].length; i++) {
            alternativas.push(evento.results[0][i].transcript);
        }

        // Probamos cada alternativa sin dictar el fallo en cada intento,
        // para no repetir el aviso varias veces.
        let ultimoFallo = null;
        for (const frase of alternativas) {
            const resultado = ejecutarJugadaHablada(frase, false);
            if (resultado.ok) {
                mostrarEscucha(`✓ "${frase}" → ${resultado.mensaje}`, "activo");
                return;
            }
            ultimoFallo = resultado.mensaje;
        }

        // Ninguna alternativa dio una jugada válida: lo mostramos y lo dictamos
        mostrarEscucha(
            `Oí "${alternativas[0]}" pero no pude mover. ${ultimoFallo}`,
            "error"
        );
        dictar(ultimoFallo || "No se puede hacer esa jugada.");
    });
}

// Mensaje de bienvenida con las instrucciones de teclado
const BIENVENIDA =
    "Espacio para decir jugada. " +
    "Enter para analizar el tablero. " +
    "Tabulador o F5 para reiniciar la partida.";

function darBienvenida() {
    mostrarEscucha(
        "Espacio: decir jugada · Enter: analizar tablero · Tab o F5: reiniciar",
        ""
    );
    // Dicta la bienvenida. Si el navegador bloquea el audio automático,
    // hablarUrgente se encarga de soltarla en la primera interacción.
    hablarUrgente(BIENVENIDA);
}

// Atajos de teclado (globales, funcionan haya o no reconocimiento de voz):
//   Espacio -> escuchar jugada por voz
//   Enter   -> describir / analizar la posición
//   Tab     -> reiniciar la partida
document.addEventListener("keydown", (e) => {
    // No interferir si se escribe en un campo de texto
    const etiqueta = document.activeElement && document.activeElement.tagName;
    if (etiqueta === "INPUT" || etiqueta === "TEXTAREA") return;

    const esAtajo =
        e.code === "Space" || e.key === " " ||
        e.key === "Enter" || e.key === "Tab";

    // La primera pulsación solo desbloquea el audio y repite la bienvenida,
    // sin ejecutar la acción, para que se oigan las instrucciones al empezar.
    if (esAtajo && !audioDesbloqueado) {
        e.preventDefault();
        desbloquearAudio();
        return;
    }

    if (e.code === "Space" || e.key === " ") {
        e.preventDefault();  // evita pulsar un botón enfocado o hacer scroll
        accionEscuchar();
    } else if (e.key === "Enter") {
        e.preventDefault();
        describirPosicion();
    } else if (e.key === "Tab") {
        e.preventDefault();  // evita que Tab cambie el foco entre botones
        reiniciarPartida();
    }
});

// Cualquier clic también desbloquea el audio (por si empieza con el ratón)
document.addEventListener("click", desbloquearAudio);

// Arranque
dibujarTablero();
actualizarEstado();
darBienvenida();
