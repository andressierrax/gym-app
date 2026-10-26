import type { Bloque } from "./tipos";
import { dividirBloque, etiquetaDePunto } from "./bloques";

/**
 * Lo que la clienta anota (kg, rep, notas, checks) se guarda por POSICIÓN:
 * "0-1" es el segundo ejercicio del primer set. Si la entrenadora reordena o
 * edita la rutina, esa posición pasa a ser otro ejercicio y los valores
 * aparecen donde no tocan, o desaparecen de la vista.
 *
 * Para no tener que migrar nada se mantienen las claves por posición, y al
 * lado se guarda la "huella" de cada una: el nombre del ejercicio
 * normalizado. Al abrir la sesión, cada valor se recoloca en la posición
 * donde está ahora su ejercicio.
 */

/**
 * Nombre normalizado para comparar: sin tildes, mayúsculas, signos ni
 * palabras con cifras. Así "Hip Thrust 4x12" y "hip thrust 3x10" son el
 * mismo ejercicio: cambiar la prescripción no lo convierte en otro.
 */
export function huellaDeTexto(texto?: string): string {
    return (texto ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .split(/\s+/)
        .filter(palabra => !/\d/.test(palabra))
        .join(" ")
        .replace(/[^a-zñ ]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
}

/** Una fila con campos de carga: su clave, su nombre visible y su huella. */
export interface FilaDeCarga {
    clave: string;
    etiqueta: string;
    huella: string;
}

/**
 * Las filas de carga de una rutina, con las mismas claves que pinta
 * SesionEntrenamiento: `i-j` por numeral detectado, o `i` si el set no
 * tiene numerales (una sola carga para todo el set).
 */
export function filasDeCarga(bloques: Bloque[] = []): FilaDeCarga[] {
    return bloques.flatMap((bloque, i) => {
        const { puntos } = dividirBloque(bloque.contenido);
        if (puntos.length > 0) {
            return puntos.map((punto, j) => {
                const etiqueta = etiquetaDePunto(punto);
                return { clave: `${i}-${j}`, etiqueta, huella: huellaDeTexto(etiqueta) };
            });
        }
        return [{
            clave: String(i),
            etiqueta: bloque.titulo || `Set ${i + 1}`,
            huella: huellaDeSet(bloque),
        }];
    });
}

/**
 * Huella de un set entero, para sus notas y su check. El título ("SET #1")
 * no sirve: todos los días lo repiten. Se usa lo que contiene.
 */
function huellaDeSet(bloque: Bloque): string {
    const { preambulo, puntos } = dividirBloque(bloque.contenido);
    if (puntos.length > 0) return puntos.map(p => huellaDeTexto(etiquetaDePunto(p))).join("|");
    const primeraLinea = preambulo.split("\n")[0] ?? "";
    return huellaDeTexto(primeraLinea) || huellaDeTexto(bloque.titulo);
}

export interface HuellasRutina {
    /** Por clave de carga ("0", "0-1"...). */
    filas: Record<string, string>;
    /** Por índice de set ("0", "1"...), para notas y checks. */
    sets: Record<string, string>;
}

export function huellasDeRutina(bloques: Bloque[] = []): HuellasRutina {
    const filas: Record<string, string> = {};
    for (const f of filasDeCarga(bloques)) filas[f.clave] = f.huella;
    const sets: Record<string, string> = {};
    bloques.forEach((b, i) => { sets[String(i)] = huellaDeSet(b); });
    return { filas, sets };
}

/** Nombre visible de cada clave de carga: lo que el progreso muestra. */
export function etiquetasDeCarga(bloques: Bloque[] = []): Record<string, string> {
    const etiquetas: Record<string, string> = {};
    for (const f of filasDeCarga(bloques)) etiquetas[f.clave] = f.etiqueta;
    return etiquetas;
}

/** "0-10" va después de "0-2": orden por posición real, no alfabético. */
const porPosicion = (a: string, b: string): number =>
    a.localeCompare(b, undefined, { numeric: true });

/**
 * Recoloca unos valores guardados con claves por posición en las posiciones
 * que tienen ahora sus ejercicios.
 *
 * 1. Cada clave actual toma el valor de la guardada con su misma huella
 *    (si el ejercicio aparece dos veces, se emparejan en orden).
 * 2. Con `porPosicionSiHuerfano`, la que no encontró pareja se queda con el
 *    valor de su misma posición, pero solo si ese ejercicio guardado ya no
 *    existe en la rutina: es el caso de una corrección del nombre
 *    ("Sentadila" → "Sentadilla"), que no debe perder lo anotado.
 *
 * Sin huellas guardadas (sesiones anteriores a este cambio) no hay con qué
 * comparar y los valores se devuelven tal cual, como hasta ahora.
 */
export function realinear<T>(
    valores: Record<string, T>,
    huellasGuardadas: Record<string, string> | undefined,
    huellasActuales: Record<string, string>,
    porPosicionSiHuerfano = true,
): Record<string, T> {
    if (!huellasGuardadas || Object.keys(huellasGuardadas).length === 0) return valores;

    const libres = new Map<string, string[]>();
    for (const clave of Object.keys(huellasGuardadas).sort(porPosicion)) {
        const h = huellasGuardadas[clave]!;
        if (!h) continue;
        libres.set(h, [...(libres.get(h) ?? []), clave]);
    }

    const resultado: Record<string, T> = {};
    const usadas = new Set<string>();
    const sinPareja: string[] = [];

    for (const clave of Object.keys(huellasActuales).sort(porPosicion)) {
        const cola = libres.get(huellasActuales[clave]!) ?? [];
        const origen = cola.shift();
        if (origen === undefined) { sinPareja.push(clave); continue; }
        usadas.add(origen);
        if (origen in valores) resultado[clave] = valores[origen]!;
    }

    if (porPosicionSiHuerfano) {
        const vigentes = new Set(Object.values(huellasActuales));
        for (const clave of sinPareja) {
            const huellaVieja = huellasGuardadas[clave];
            const huerfana = !huellaVieja || !vigentes.has(huellaVieja);
            if (huerfana && !usadas.has(clave) && clave in valores) {
                usadas.add(clave);
                resultado[clave] = valores[clave]!;
            }
        }
    }

    return resultado;
}

/** Los campos de una sesión que se recolocan, y por qué huellas. */
export interface ValoresSesion {
    checks: Record<string, boolean>;
    notas: Record<string, string>;
    pesos: Record<string, number>;
    reps: Record<string, number>;
    pesosLiv: Record<string, number>;
    repsLiv: Record<string, number>;
}

export function realinearSesion<S extends ValoresSesion>(
    sesion: S,
    guardadas: Partial<HuellasRutina> | undefined,
    actuales: HuellasRutina,
    porPosicionSiHuerfano = true,
): S {
    const filas = <T>(v: Record<string, T>) => realinear(v, guardadas?.filas, actuales.filas, porPosicionSiHuerfano);
    const sets = <T>(v: Record<string, T>) => realinear(v, guardadas?.sets, actuales.sets, porPosicionSiHuerfano);
    return {
        ...sesion,
        checks: sets(sesion.checks),
        notas: sets(sesion.notas),
        pesos: filas(sesion.pesos),
        reps: filas(sesion.reps),
        pesosLiv: filas(sesion.pesosLiv),
        repsLiv: filas(sesion.repsLiv),
    };
}
