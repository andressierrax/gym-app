import type { RegistroConPesos } from "./tipos";
import { aDate } from "./fechas";
import { pesosPorEjercicio, repsPorEjercicio, pesosLivPorEjercicio, repsLivPorEjercicio } from "./progreso";
import type { RegistroDePeso, RegistroDeRep } from "./tipos";

export interface RegistroResumible extends RegistroConPesos {
    completados?: number;
    totalBloques?: number;
}

export type Carga = "pesada" | "liviana";

export interface Mejora {
    etiqueta: string;
    carga: Carga;
    unidad: "kg" | "rep";
    anterior: number;
    actual: number;
}

export interface Resumen {
    entrenamientos: number;
    ultimoEntreno: Date | null;
    diasSinEntrenar: number | null;
    /** Sets completados sobre asignados en la ventana, 0-100; null sin datos. */
    constancia: number | null;
    mejoras: Mejora[];
    /** Ejercicios con 3 sesiones seguidas sin cambio de peso ni de repeticiones (carga pesada). */
    estancados: string[];
    /** Lo mismo para la carga liviana. */
    estancadosLiv: string[];
}

export const VENTANA_DIAS = 28;
export const DIAS_SIN_ENTRENAR_ALERTA = 7;

const MS_DIA = 24 * 60 * 60 * 1000;

const ultimos = (valores: number[], n: number) => valores.slice(-n);
const todosIguales = (valores: number[]) => valores.every(v => v === valores[0]);

/**
 * Compara, por ejercicio, la última sesión con la anterior (mejoras) y detecta
 * los que llevan 3 sesiones sin cambio (estancados). Añade las mejoras a
 * `mejoras` y devuelve las etiquetas estancadas.
 */
function analizarCarga(
    pesos: Record<string, RegistroDePeso[]>,
    reps: Record<string, RegistroDeRep[]>,
    carga: Carga,
    mejoras: Mejora[],
): string[] {
    const estancados: string[] = [];

    for (const [etiqueta, serie] of Object.entries(pesos)) {
        const valores = serie.map(p => p.peso);
        const n = valores.length;
        if (n >= 2 && valores[n - 1]! > valores[n - 2]!) {
            mejoras.push({ etiqueta, carga, unidad: "kg", anterior: valores[n - 2]!, actual: valores[n - 1]! });
        }
        const repsSerie = (reps[etiqueta] ?? []).map(p => p.reps);
        const repsCambian = repsSerie.length >= 3 && !todosIguales(ultimos(repsSerie, 3));
        if (n >= 3 && todosIguales(ultimos(valores, 3)) && !repsCambian) estancados.push(etiqueta);
    }
    for (const [etiqueta, serie] of Object.entries(reps)) {
        const valores = serie.map(p => p.reps);
        const n = valores.length;
        if (n >= 2 && valores[n - 1]! > valores[n - 2]!) {
            mejoras.push({ etiqueta, carga, unidad: "rep", anterior: valores[n - 2]!, actual: valores[n - 1]! });
        }
    }
    return estancados;
}

/**
 * Resume el historial de una clienta. Las rutinas difieren entre clientas, así
 * que todo se mide contra su propio historial (última sesión frente a la
 * anterior del mismo ejercicio), nunca contra un estándar común.
 */
export function resumirRegistros(registros: RegistroResumible[], ahora: Date = new Date()): Resumen {
    const desde = ahora.getTime() - VENTANA_DIAS * MS_DIA;

    let entrenamientos = 0;
    let completados = 0;
    let total = 0;
    let ultimo: Date | null = null;

    for (const r of registros) {
        const f = aDate(r.fecha);
        if (!f) continue;
        if (!ultimo || f > ultimo) ultimo = f;
        if (f.getTime() < desde) continue;
        entrenamientos++;
        completados += r.completados ?? 0;
        total += r.totalBloques ?? 0;
    }

    const mejoras: Mejora[] = [];
    const estancados = analizarCarga(pesosPorEjercicio(registros), repsPorEjercicio(registros), "pesada", mejoras);
    const estancadosLiv = analizarCarga(pesosLivPorEjercicio(registros), repsLivPorEjercicio(registros), "liviana", mejoras);

    return {
        entrenamientos,
        ultimoEntreno: ultimo,
        diasSinEntrenar: ultimo ? Math.floor((ahora.getTime() - ultimo.getTime()) / MS_DIA) : null,
        constancia: total > 0 ? Math.round((completados / total) * 100) : null,
        mejoras,
        estancados,
        estancadosLiv,
    };
}

export interface Alertas {
    sinEntrenar: boolean;
    estancados: number;
}

export function alertasDe(resumen: Resumen): Alertas {
    return {
        sinEntrenar: resumen.diasSinEntrenar !== null && resumen.diasSinEntrenar >= DIAS_SIN_ENTRENAR_ALERTA,
        estancados: resumen.estancados.length + resumen.estancadosLiv.length,
    };
}
