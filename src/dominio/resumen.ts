import type { RegistroConPesos } from "./tipos";
import { aDate } from "./fechas";
import { pesosPorEjercicio, repsPorEjercicio } from "./progreso";

export interface RegistroResumible extends RegistroConPesos {
    completados?: number;
    totalBloques?: number;
}

export interface Mejora {
    etiqueta: string;
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
    /** Ejercicios con 3 sesiones seguidas sin cambio de peso ni de repeticiones. */
    estancados: string[];
}

export const VENTANA_DIAS = 28;
export const DIAS_SIN_ENTRENAR_ALERTA = 7;

const MS_DIA = 24 * 60 * 60 * 1000;

const ultimos = (valores: number[], n: number) => valores.slice(-n);
const todosIguales = (valores: number[]) => valores.every(v => v === valores[0]);

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

    const pesos = pesosPorEjercicio(registros);
    const reps = repsPorEjercicio(registros);
    const mejoras: Mejora[] = [];
    const estancados: string[] = [];

    for (const [etiqueta, serie] of Object.entries(pesos)) {
        const valores = serie.map(p => p.peso);
        const n = valores.length;
        if (n >= 2 && valores[n - 1]! > valores[n - 2]!) {
            mejoras.push({ etiqueta, unidad: "kg", anterior: valores[n - 2]!, actual: valores[n - 1]! });
        }
        const repsSerie = (reps[etiqueta] ?? []).map(p => p.reps);
        const repsCambian = repsSerie.length >= 3 && !todosIguales(ultimos(repsSerie, 3));
        if (n >= 3 && todosIguales(ultimos(valores, 3)) && !repsCambian) estancados.push(etiqueta);
    }
    for (const [etiqueta, serie] of Object.entries(reps)) {
        const valores = serie.map(p => p.reps);
        const n = valores.length;
        if (n >= 2 && valores[n - 1]! > valores[n - 2]!) {
            mejoras.push({ etiqueta, unidad: "rep", anterior: valores[n - 2]!, actual: valores[n - 1]! });
        }
    }

    return {
        entrenamientos,
        ultimoEntreno: ultimo,
        diasSinEntrenar: ultimo ? Math.floor((ahora.getTime() - ultimo.getTime()) / MS_DIA) : null,
        constancia: total > 0 ? Math.round((completados / total) * 100) : null,
        mejoras,
        estancados,
    };
}

export interface Alertas {
    sinEntrenar: boolean;
    estancados: number;
}

export function alertasDe(resumen: Resumen): Alertas {
    return {
        sinEntrenar: resumen.diasSinEntrenar !== null && resumen.diasSinEntrenar >= DIAS_SIN_ENTRENAR_ALERTA,
        estancados: resumen.estancados.length,
    };
}
