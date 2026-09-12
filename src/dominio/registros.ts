import { etiquetaSemanaCorta } from "../constantes";

/**
 * Cómo etiquetar un entrenamiento en el Monitor.
 *
 * Conviven dos formas de entrenar y no se distinguen por el número de semana:
 * la Adaptación es la semana 0 y las esporádicas también se guardan con 0. Lo
 * que las separa es el nombre de rutina, que solo tienen las esporádicas.
 */
export interface EtiquetasRegistro {
    esporadica: boolean;
    /** Texto principal: nombre de la rutina, o la semana del ciclo. */
    principal: string;
    /** Texto secundario: el día del ciclo, o nada si es esporádica. */
    secundario: string | null;
}

export function etiquetasDeRegistro(reg: {
    semana?: number;
    dia?: number;
    rutinaNombre?: string;
}): EtiquetasRegistro {
    const nombre = (reg.rutinaNombre ?? "").trim();
    if (nombre) {
        return { esporadica: true, principal: nombre, secundario: null };
    }
    return {
        esporadica: false,
        principal: etiquetaSemanaCorta(reg.semana ?? 0),
        secundario: `Día ${reg.dia ?? "?"}`,
    };
}
