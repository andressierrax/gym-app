/**
 * Seguimiento del ciclo menstrual, meramente informativo.
 *
 * No altera las rutinas: solo sitúa a la clienta en su ciclo para que ella y
 * la entrenadora puedan interpretar un día flojo. Las orientaciones de
 * entrenamiento son generales y no sustituyen a un criterio médico.
 */

export type FaseCiclo = "menstrual" | "folicular" | "ovulacion" | "lutea";

export const DURACION_POR_DEFECTO = 28;
export const DURACION_REGLA_POR_DEFECTO = 5;

/** Fuera de este rango la estimación deja de tener sentido. */
export const DURACION_MINIMA = 21;
export const DURACION_MAXIMA = 40;

const MS_DIA = 24 * 60 * 60 * 1000;

const soloFecha = (d: Date): number =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const acotarDuracion = (duracion: number): number => {
    if (!Number.isFinite(duracion)) return DURACION_POR_DEFECTO;
    return Math.min(DURACION_MAXIMA, Math.max(DURACION_MINIMA, Math.round(duracion)));
};

/**
 * Día del ciclo, empezando en 1 el primer día de regla. Si han pasado más días
 * que la duración, se asume que el ciclo se repitió: es una estimación, no un
 * registro real, y así deja de ser útil cuanto más antigua sea la fecha.
 */
export function diaDelCiclo(
    ultimaRegla: Date,
    hoy: Date = new Date(),
    duracion: number = DURACION_POR_DEFECTO,
): number {
    const d = acotarDuracion(duracion);
    const transcurridos = Math.floor((soloFecha(hoy) - soloFecha(ultimaRegla)) / MS_DIA);
    if (transcurridos < 0) return 1; // fecha futura: no hay nada que estimar
    return (transcurridos % d) + 1;
}

/**
 * La fase lútea dura ~14 días con bastante independencia de la duración total,
 * así que la ovulación se estima hacia atrás desde el final del ciclo. Es más
 * fiable que fijar el día 14 cuando el ciclo no dura 28 días.
 */
export function faseDeCiclo(
    dia: number,
    duracion: number = DURACION_POR_DEFECTO,
    duracionRegla: number = DURACION_REGLA_POR_DEFECTO,
): FaseCiclo {
    const d = acotarDuracion(duracion);
    if (dia <= duracionRegla) return "menstrual";
    const ovulacion = d - 14;
    if (dia >= ovulacion - 1 && dia <= ovulacion + 1) return "ovulacion";
    if (dia < ovulacion - 1) return "folicular";
    return "lutea";
}

interface DescripcionFase {
    etiqueta: string;
    nota: string;
}

export const FASES: Record<FaseCiclo, DescripcionFase> = {
    menstrual: {
        etiqueta: "Menstruación",
        nota: "La energía puede estar baja. Prioriza moverte bien por encima de mover mucho peso.",
    },
    folicular: {
        etiqueta: "Fase folicular",
        nota: "Suele ser buen momento para subir cargas y buscar progresión.",
    },
    ovulacion: {
        etiqueta: "Ovulación",
        nota: "Suele coincidir con el pico de energía. Buen día para ir a por tu mejor serie.",
    },
    lutea: {
        etiqueta: "Fase lútea",
        nota: "La energía puede bajar y el descanso rinde más. Escucha a tu cuerpo.",
    },
};

export const AVISO_ORIENTATIVO =
    "Es una estimación orientativa: cada cuerpo es distinto.";

export interface EstadoCiclo {
    dia: number;
    fase: FaseCiclo;
    etiqueta: string;
    nota: string;
    duracion: number;
}

/** Todo lo que la interfaz necesita para pintar el estado actual. */
export function estadoDelCiclo(
    ultimaRegla: Date,
    hoy: Date = new Date(),
    duracion: number = DURACION_POR_DEFECTO,
): EstadoCiclo {
    const d = acotarDuracion(duracion);
    const dia = diaDelCiclo(ultimaRegla, hoy, d);
    const fase = faseDeCiclo(dia, d);
    return { dia, fase, etiqueta: FASES[fase].etiqueta, nota: FASES[fase].nota, duracion: d };
}

/**
 * Cuántos días hace que se actualizó la fecha. Pasado un ciclo entero sin
 * tocarla, la estimación ya no es de fiar y conviene decirlo.
 */
export function diasDesde(fecha: Date, hoy: Date = new Date()): number {
    return Math.max(0, Math.floor((soloFecha(hoy) - soloFecha(fecha)) / MS_DIA));
}

export const estimacionCaducada = (
    ultimaRegla: Date,
    hoy: Date = new Date(),
    duracion: number = DURACION_POR_DEFECTO,
): boolean => diasDesde(ultimaRegla, hoy) > acotarDuracion(duracion);
