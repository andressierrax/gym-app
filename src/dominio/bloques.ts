/**
 * La entrenadora no escribe los ejercicios de un set como una lista
 * estructurada: pega un párrafo con "1. ...", "2. ...", etc., cada uno con
 * sus propias repeticiones y aclaraciones en las líneas siguientes. Para dar
 * un campo de peso por numeral sin cambiarle su forma de escribir, se
 * detectan aquí los numerales dentro del texto en vez de pedirle que los
 * introduzca en campos separados.
 */

/**
 * "1. ", "2) "... al principio de una línea. También "3.Abductores", sin
 * espacio: la entrenadora a veces lo escribe así y antes esos ejercicios se
 * pegaban al anterior y compartían un solo campo de peso. Detrás tiene que
 * venir un espacio o una letra, para no confundirlo con "2.5 kg" o "1.30 min".
 */
const PATRON_NUMERAL = /^\s*\d+[.)](?:\s+|(?=\p{L}))/u;
const CORTE_NUMERAL = /(?=^\s*\d+[.)](?:\s|\p{L}))/mu;

/** La regla de antes (exigía espacio). Solo para leer sesiones guardadas con ella. */
const PATRON_NUMERAL_LEGADO = /^\s*\d+[.)]\s+/;
const CORTE_NUMERAL_LEGADO = /(?=^\s*\d+[.)]\s)/m;

export interface BloqueDividido {
    /** Texto suelto antes del primer numeral (instrucciones generales, o todo si no hay numerales). */
    preambulo: string;
    /** Un elemento por numeral detectado. Vacío si el texto no llegó a tener al menos dos. */
    puntos: string[];
}

/**
 * Divide el contenido de un set en numerales, cada uno con su texto completo
 * hasta el siguiente. Con menos de dos numerales no vale la pena partir la
 * vista en items sueltos: se devuelve todo como `preambulo`, igual que antes.
 */
export function dividirBloque(contenido?: string, legado = false): BloqueDividido {
    const texto = contenido?.trim() ?? "";
    if (!texto) return { preambulo: "", puntos: [] };

    const corte = legado ? CORTE_NUMERAL_LEGADO : CORTE_NUMERAL;
    const patron = legado ? PATRON_NUMERAL_LEGADO : PATRON_NUMERAL;
    const trozos = texto.split(corte).map(t => t.trim()).filter(Boolean);
    const preambulo = trozos[0] && !patron.test(trozos[0]) ? (trozos.shift() ?? "") : "";

    return trozos.length >= 2 ? { preambulo, puntos: trozos } : { preambulo: texto, puntos: [] };
}

/** Nombre del ejercicio para mostrar junto al numeral: su primera línea, sin el "1. " de delante. */
export function etiquetaDePunto(punto: string): string {
    const primeraLinea = (punto.split("\n")[0] ?? "").replace(PATRON_NUMERAL, "").trim();
    return primeraLinea || punto.slice(0, 30).trim();
}
