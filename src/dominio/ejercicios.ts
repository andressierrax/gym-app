import type { TipoRecursoVisual } from "./tipos";

/**
 * De qué tipo es un archivo subido a la biblioteca, a partir de su MIME type
 * real (nunca del nombre): el "accept" del selector de archivo es solo una
 * sugerencia del sistema operativo, no una garantía de lo que se eligió.
 */
export function tipoDeArchivo(mime: string): TipoRecursoVisual | null {
    if (mime.startsWith("image/")) return "imagen";
    if (mime.startsWith("video/")) return "video";
    return null;
}

/** Ausente equivale a "imagen": los ejercicios de antes de aceptar vídeo no tienen este campo. */
export const esVideo = (ejercicio?: { tipo?: TipoRecursoVisual }): boolean =>
    ejercicio?.tipo === "video";

/**
 * Ejercicios temporales: los sube la entrenadora para un periodo corto
 * (p. ej. clientas sin el material de los de siempre) y no deben mezclarse
 * con la biblioteca de siempre ni quedarse para asignar indefinidamente.
 *
 * `venceEl` es el último día en que se puede asignar ("YYYY-MM-DD"). Al
 * vencer solo dejan de ofrecerse para asignar: no se borran, porque las
 * rutinas que ya los usan seguirían apuntando a su imagen.
 */
export const DIAS_TEMPORAL = 28;

export interface ConVigencia {
    temporal?: boolean;
    venceEl?: string;
}

export const esTemporal = (e?: ConVigencia): boolean => e?.temporal === true;

export const estaVencido = (e: ConVigencia, hoy: string): boolean =>
    esTemporal(e) && !!e.venceEl && e.venceEl < hoy;

export interface BibliotecaSeparada<T> {
    permanentes: T[];
    vigentes: T[];
    vencidos: T[];
}

export function separarBiblioteca<T extends ConVigencia>(lista: T[], hoy: string): BibliotecaSeparada<T> {
    const r: BibliotecaSeparada<T> = { permanentes: [], vigentes: [], vencidos: [] };
    for (const e of lista) {
        if (!esTemporal(e)) r.permanentes.push(e);
        else if (estaVencido(e, hoy)) r.vencidos.push(e);
        else r.vigentes.push(e);
    }
    return r;
}
