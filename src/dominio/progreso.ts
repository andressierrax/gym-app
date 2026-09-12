import type { RegistroConPesos, RegistroDePeso } from "./tipos";
import { aDate } from "./fechas";

/**
 * Etiqueta de un bloque para el gráfico de progreso. El título del bloque
 * ("SET #1") se repite entre días de rutina distintos, así que solo por sí
 * mismo mezclaría el peso de glúteos con el de espalda: se antepone el
 * nombre del día (ciclo) o de la rutina (esporádica) para distinguirlos.
 */
function etiquetaDeBloque(registro: RegistroConPesos, index: number): string {
    const titulo = registro.titulos?.[index] || `Set ${index + 1}`;
    const contexto = registro.nombreDia || registro.rutinaNombre;
    return contexto ? `${contexto} · ${titulo}` : titulo;
}

/**
 * Aplana los registros de entrenamiento en una lista de pesos por bloque,
 * ordenada por fecha y agrupada por su etiqueta (día + set).
 */
export function pesosPorEjercicio(registros: RegistroConPesos[]): Record<string, RegistroDePeso[]> {
    const porEtiqueta: Record<string, RegistroDePeso[]> = {};

    for (const registro of registros) {
        const pesos = registro.pesos ?? {};
        for (const [clave, peso] of Object.entries(pesos)) {
            if (!Number.isFinite(peso)) continue;
            const etiqueta = etiquetaDeBloque(registro, Number(clave));
            (porEtiqueta[etiqueta] ??= []).push({ etiqueta, peso, fecha: registro.fecha });
        }
    }

    for (const serie of Object.values(porEtiqueta)) {
        serie.sort((a, b) => (aDate(a.fecha)?.getTime() ?? 0) - (aDate(b.fecha)?.getTime() ?? 0));
    }

    return porEtiqueta;
}

/** Etiquetas con progreso registrado, alfabéticas. */
export function ejerciciosConProgreso(registros: RegistroConPesos[]): string[] {
    return Object.keys(pesosPorEjercicio(registros)).sort((a, b) => a.localeCompare(b));
}
