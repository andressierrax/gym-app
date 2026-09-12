import type { RegistroConPesos, RegistroDePeso } from "./tipos";
import { aDate } from "./fechas";

/**
 * Aplana los registros de entrenamiento en una lista de pesos por ejercicio,
 * ordenada por fecha. Un mismo ejercicio puede aparecer en varios bloques
 * distintos entre semanas (la clave `bloque-ejercicio` no es estable), así que
 * se agrupa por el nombre desnormalizado, no por la clave de la sesión.
 */
export function pesosPorEjercicio(registros: RegistroConPesos[]): Record<string, RegistroDePeso[]> {
    const porEjercicio: Record<string, RegistroDePeso[]> = {};

    for (const registro of registros) {
        const pesos = registro.pesos ?? {};
        const nombres = registro.nombresEjercicios ?? {};
        for (const [clave, peso] of Object.entries(pesos)) {
            const nombre = nombres[clave];
            if (!nombre || !Number.isFinite(peso)) continue;
            (porEjercicio[nombre] ??= []).push({ ejercicio: nombre, peso, fecha: registro.fecha });
        }
    }

    for (const serie of Object.values(porEjercicio)) {
        serie.sort((a, b) => (aDate(a.fecha)?.getTime() ?? 0) - (aDate(b.fecha)?.getTime() ?? 0));
    }

    return porEjercicio;
}

/** Nombres de ejercicio con progreso registrado, alfabéticos. */
export function ejerciciosConProgreso(registros: RegistroConPesos[]): string[] {
    return Object.keys(pesosPorEjercicio(registros)).sort((a, b) => a.localeCompare(b));
}
