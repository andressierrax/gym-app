import type { RegistroConPesos, RegistroDePeso } from "./tipos";
import { aDate } from "./fechas";

/**
 * Etiqueta de una clave de `pesos` para el gráfico de progreso. Esa etiqueta
 * ("Sentadilla", o el título del set si no había numerales) se repite entre
 * días de rutina distintos, así que sola mezclaría el peso de glúteos con el
 * de espalda: se antepone el nombre del día (ciclo) o de la rutina
 * (esporádica) para distinguirlos.
 */
function etiquetaDeBloque(registro: RegistroConPesos, clave: string): string {
    const indiceBloque = Number(clave.split("-")[0]);
    const etiqueta = registro.etiquetasPeso?.[clave]
        || registro.titulos?.[indiceBloque]
        || `Set ${indiceBloque + 1}`;
    const contexto = registro.nombreDia || registro.rutinaNombre;
    return contexto ? `${contexto} · ${etiqueta}` : etiqueta;
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
            const etiqueta = etiquetaDeBloque(registro, clave);
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
