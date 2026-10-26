import type { Sesion, SesionServidor } from "./tipos";

export const SESION_VACIA: Sesion = { checks: {}, notas: {}, pesos: {}, reps: {}, pesosLiv: {}, repsLiv: {}, actualizado: 0 };

/**
 * Id de sesión para una clienta de ciclo: determinista por semana y día, así
 * que volver al mismo día reabre la misma sesión.
 *
 * `version` sube cada vez que la entrenadora pone una rutina NUEVA en ese
 * hueco (un mesociclo nuevo en las mismas semanas): la clienta empieza en
 * limpio en otro documento y lo que anotó con la rutina anterior se queda
 * intacto en el suyo. Sin versión (los planes de siempre) el id es el de
 * antes, así que no hay nada que migrar.
 */
export const idSesionCiclo = (uid: string, semana: number, dia: number, version: number = 0): string =>
    version > 0 ? `${uid}_S${semana}D${dia}_v${version}` : `${uid}_S${semana}D${dia}`;

/**
 * Id de sesión para una clienta esporádica. Lleva la fecha porque el catálogo
 * se repite: sin ella, abrir "Full body" una semana después mostraría todos
 * los sets ya marcados de la vez anterior.
 */
export const idSesionLibre = (uid: string, rutinaId: string, fechaISO: string): string =>
    `${uid}_R${rutinaId}_${fechaISO}`;

/** Fecha local en YYYY-MM-DD. En UTC el día cambiaría a destiempo. */
export function fechaISOLocal(hoy: Date = new Date()): string {
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${hoy.getFullYear()}-${mes}-${dia}`;
}

export const claveLocal = (idSesion: string): string => `trinityfit:sesion:${idSesion}`;

/** Interfaz mínima de almacenamiento, para poder probar sin navegador. */
export interface AlmacenLocal {
    getItem(clave: string): string | null;
    setItem(clave: string, valor: string): void;
}

const almacenPorDefecto = (): AlmacenLocal | null =>
    typeof localStorage === "undefined" ? null : localStorage;

/**
 * Lee la sesión guardada en el propio móvil. Nunca lanza: en modo incógnito o
 * con la cuota llena, `localStorage` falla y la app debe seguir funcionando.
 */
export function leerLocal(
    idSesion: string,
    almacen: AlmacenLocal | null = almacenPorDefecto(),
): Sesion {
    try {
        const crudo = almacen?.getItem(claveLocal(idSesion));
        if (!crudo) return SESION_VACIA;
        const datos = JSON.parse(crudo);
        return {
            checks: datos.checks ?? {},
            notas: datos.notas ?? {},
            pesos: datos.pesos ?? {},
            reps: datos.reps ?? {},
            pesosLiv: datos.pesosLiv ?? {},
            repsLiv: datos.repsLiv ?? {},
            huellas: datos.huellas,
            actualizado: datos.actualizado ?? 0,
        };
    } catch {
        return SESION_VACIA;
    }
}

/** Devuelve la marca de tiempo escrita, que luego viaja a Firestore. */
export function guardarLocal(
    idSesion: string,
    sesion: Omit<Sesion, "actualizado">,
    almacen: AlmacenLocal | null = almacenPorDefecto(),
    ahora: number = Date.now(),
): number {
    try {
        almacen?.setItem(
            claveLocal(idSesion),
            JSON.stringify({ ...sesion, actualizado: ahora }),
        );
    } catch {
        // Sin almacenamiento local seguimos: Firestore es la copia buena.
    }
    return ahora;
}

/**
 * Decide si la copia del servidor debe reemplazar a la local.
 *
 * Solo gana si es estrictamente más reciente. Así una copia cacheada del
 * servidor no puede borrar lo que la clienta apuntó estando sin señal.
 */
export function servidorEsMasReciente(servidor: SesionServidor, local: Sesion): boolean {
    return (servidor.actualizadoCliente ?? 0) > local.actualizado;
}

/**
 * Cuenta los bloques marcados, ignorando índices que ya no existen por si la
 * entrenadora recortó el día con la sesión empezada.
 */
export function contarCompletados(checks: Record<string, boolean>, totalBloques: number): number {
    return Object.entries(checks)
        .filter(([index, hecho]) => hecho && Number(index) < totalBloques)
        .length;
}

/** ¿Anotó algo la clienta en esta sesión? */
export function tieneDatos(s: SesionServidor | undefined): boolean {
    if (!s) return false;
    const algo = (m?: Record<string, unknown>) => Object.values(m ?? {}).some(v => v !== "" && v !== false && v != null);
    return algo(s.checks) || algo(s.notas) || algo(s.pesos) || algo(s.reps) || algo(s.pesosLiv) || algo(s.repsLiv);
}

/**
 * Al reemplazar una rutina, ¿hay que pasar la sesión al historial?
 *
 * Solo si tiene datos y cambió después del último "Finalizar" de ese día:
 * al finalizar se guarda la sesión y JUSTO DESPUÉS se crea el registro, así
 * que un registro con fecha posterior al último cambio ya la contiene. Si se
 * archivara igual, el progreso tendría ese entrenamiento dos veces.
 *
 * `fechasRegistros` son los ms de los registros de ese mismo día y semana.
 */
export function debeArchivarse(sesion: SesionServidor | undefined, fechasRegistros: number[]): boolean {
    if (!tieneDatos(sesion)) return false;
    const cambio = sesion?.actualizadoCliente ?? 0;
    return !fechasRegistros.some(f => f >= cambio);
}
