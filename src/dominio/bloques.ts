/**
 * La entrenadora no escribe los ejercicios de un set como una lista
 * estructurada: pega un párrafo con "1. ...", "2. ...", etc., cada uno con
 * sus propias repeticiones y aclaraciones en las líneas siguientes. Para dar
 * un campo de peso por numeral sin cambiarle su forma de escribir, se
 * detectan aquí los numerales dentro del texto en vez de pedirle que los
 * introduzca en campos separados.
 */

/** "1. ", "2) "... al principio de una línea. */
const PATRON_NUMERAL = /^\s*\d+[.)]\s+/;

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
export function dividirBloque(contenido?: string): BloqueDividido {
    const texto = contenido?.trim() ?? "";
    if (!texto) return { preambulo: "", puntos: [] };

    const trozos = texto.split(/(?=^\s*\d+[.)]\s)/m).map(t => t.trim()).filter(Boolean);
    const preambulo = trozos[0] && !PATRON_NUMERAL.test(trozos[0]) ? (trozos.shift() ?? "") : "";

    return trozos.length >= 2 ? { preambulo, puntos: trozos } : { preambulo: texto, puntos: [] };
}

/** Nombre del ejercicio para mostrar junto al numeral: su primera línea, sin el "1. " de delante. */
export function etiquetaDePunto(punto: string): string {
    const primeraLinea = (punto.split("\n")[0] ?? "").replace(PATRON_NUMERAL, "").trim();
    return primeraLinea || punto.slice(0, 30).trim();
}
