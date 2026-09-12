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
