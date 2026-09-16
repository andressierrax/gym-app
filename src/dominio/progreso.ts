import type { RegistroConPesos, RegistroDePeso, RegistroDeRep, FechaFirestore } from "./tipos";
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
 * Aplana los registros de entrenamiento en una lista de puntos por bloque,
 * ordenada por fecha y agrupada por su etiqueta (día + set). Comparte
 * implementación entre pesos y repeticiones: ambos usan las mismas claves
 * de bloque, así que se agrupan y etiquetan igual.
 */
function valoresPorEjercicio<Nombre extends string>(
    registros: RegistroConPesos[],
    campo: "pesos" | "reps",
    nombreCampo: Nombre,
): Record<string, ({ etiqueta: string; fecha: FechaFirestore } & Record<Nombre, number>)[]> {
    const porEtiqueta: Record<string, ({ etiqueta: string; fecha: FechaFirestore } & Record<Nombre, number>)[]> = {};

    for (const registro of registros) {
        const valores = registro[campo] ?? {};
        for (const [clave, valor] of Object.entries(valores)) {
            if (!Number.isFinite(valor)) continue;
            const etiqueta = etiquetaDeBloque(registro, clave);
            (porEtiqueta[etiqueta] ??= []).push({ etiqueta, [nombreCampo]: valor, fecha: registro.fecha } as never);
        }
    }

    for (const serie of Object.values(porEtiqueta)) {
        serie.sort((a, b) => (aDate(a.fecha)?.getTime() ?? 0) - (aDate(b.fecha)?.getTime() ?? 0));
    }

    return porEtiqueta;
}

/** Peso por bloque, ordenado por fecha y agrupado por su etiqueta (día + set). */
export function pesosPorEjercicio(registros: RegistroConPesos[]): Record<string, RegistroDePeso[]> {
    return valoresPorEjercicio(registros, "pesos", "peso");
}

/** Repeticiones por bloque, con el mismo agrupado que `pesosPorEjercicio`. */
export function repsPorEjercicio(registros: RegistroConPesos[]): Record<string, RegistroDeRep[]> {
    return valoresPorEjercicio(registros, "reps", "reps");
}

/** Etiquetas con progreso de peso registrado, alfabéticas. */
export function ejerciciosConProgreso(registros: RegistroConPesos[]): string[] {
    return Object.keys(pesosPorEjercicio(registros)).sort((a, b) => a.localeCompare(b));
}

/** Etiquetas con progreso de repeticiones registrado, alfabéticas. */
export function ejerciciosConProgresoReps(registros: RegistroConPesos[]): string[] {
    return Object.keys(repsPorEjercicio(registros)).sort((a, b) => a.localeCompare(b));
}
