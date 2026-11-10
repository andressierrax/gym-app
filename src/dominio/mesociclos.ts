/**
 * Mesociclos de una clienta: el bloque de semanas (Adaptación + 1 a 4) con
 * fecha de inicio y de fin, para que clienta y entrenadora sepan cuándo se
 * hizo cada uno y quede el historial.
 *
 * Las fechas se guardan como texto "YYYY-MM-DD" (lo que da un <input
 * type="date">): se comparan bien como texto y no se corren de día por la
 * zona horaria, como pasaría con un Date a medianoche UTC.
 */

export interface Mesociclo {
    id: string;
    clienteId: string;
    nombre: string;
    inicio: string;
    /** Vacío o ausente: sin fecha de fin todavía. */
    fin?: string;
}

/** Adaptación + 4 semanas. */
export const DIAS_MESOCICLO = 35;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha local en YYYY-MM-DD. */
export function aISO(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** "2026-11-03" como fecha local (no UTC: si no, en Colombia sería el día 2). */
export function desdeISO(iso: string): Date {
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(a!, m! - 1, d!);
}

export function sumarDias(iso: string, dias: number): string {
    const f = desdeISO(iso);
    f.setDate(f.getDate() + dias);
    return aISO(f);
}

/** Fin propuesto al crear: el último día de las 5 semanas. */
export const finSugerido = (inicio: string): string => sumarDias(inicio, DIAS_MESOCICLO - 1);

export const siguienteNombre = (lista: Mesociclo[]): string => `Mesociclo #${lista.length + 1}`;

/** El más reciente primero. */
export const ordenarMesociclos = (lista: Mesociclo[]): Mesociclo[] =>
    [...lista].sort((a, b) => b.inicio.localeCompare(a.inicio));

export type EstadoMesociclo = "proximo" | "en_curso" | "terminado";

export function estadoMesociclo(m: Mesociclo, hoy: string): EstadoMesociclo {
    if (m.inicio > hoy) return "proximo";
    if (m.fin && m.fin < hoy) return "terminado";
    return "en_curso";
}

/** El que está en curso hoy; si se solapan, el que empezó más tarde. */
export function mesocicloActual(lista: Mesociclo[], hoy: string): Mesociclo | null {
    return ordenarMesociclos(lista).find(m => estadoMesociclo(m, hoy) === "en_curso") ?? null;
}

/** Cuántas de estas fechas de entrenamiento caen dentro del mesociclo (ambos extremos incluidos). */
export function entrenosEn(m: Mesociclo, fechas: Date[]): number {
    return fechas
        .map(aISO)
        .filter(f => f >= m.inicio && (!m.fin || f <= m.fin))
        .length;
}

/** "3 nov 2026". */
export const formatearFecha = (iso: string): string =>
    desdeISO(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

/** "3 nov 2026 → 7 dic 2026", o "Desde 3 nov 2026" si aún no tiene fin. */
export function etiquetaRango(m: Pick<Mesociclo, "inicio" | "fin">): string {
    return m.fin ? `${formatearFecha(m.inicio)} → ${formatearFecha(m.fin)}` : `Desde ${formatearFecha(m.inicio)}`;
}

/** Mensaje de error para mostrar, o null si se puede guardar. */
export function validarMesociclo(m: { nombre: string; inicio: string; fin?: string }): string | null {
    if (!m.nombre.trim()) return "Ponle un nombre al mesociclo.";
    if (!ISO.test(m.inicio)) return "Elige la fecha de inicio.";
    if (m.fin && !ISO.test(m.fin)) return "La fecha de fin no es válida.";
    if (m.fin && m.fin < m.inicio) return "La fecha de fin no puede ser anterior al inicio.";
    return null;
}
