// Forma del mesociclo de Trinity Fit.
//
// Estos valores los comparten el Creador de Rutinas (donde se asignan) y la
// Vista de la Clienta (donde se consultan). Estaban duplicados a mano en cada
// sitio, así que la entrenadora podía guardar un plan en la Semana 5 y la
// clienta no verlo nunca. Al vivir en un único archivo, ampliar el ciclo es
// cambiar una línea aquí y las dos pantallas se ajustan a la vez.

/**
 * La semana de adaptación es la 0, no la 1.
 *
 * Ponerla delante en vez de renumerar es lo que permite añadirla sin migrar
 * nada: los planes que ya están guardados en las semanas 1 a 4 siguen
 * significando exactamente lo mismo que significaban.
 */
export const SEMANA_ADAPTACION = 0;

export const SEMANAS = [SEMANA_ADAPTACION, 1, 2, 3, 4];
export const DIAS = [1, 2, 3, 4, 5];

/** Nombre completo, para el selector de la entrenadora. */
export const etiquetaSemana = (semana: number): string =>
    semana === SEMANA_ADAPTACION ? "Semana Adaptación" : `Semana ${semana}`;

/** Versión corta, para los botones estrechos de la vista de la clienta. */
export const etiquetaSemanaCorta = (semana: number): string =>
    semana === SEMANA_ADAPTACION ? "Adaptación" : `Semana ${semana}`;

/** Subtítulo del día. La antigua semana de descarga ya no se distingue. */
export const enfoqueDeSemana = (semana: number): string =>
    semana === SEMANA_ADAPTACION
        ? "Enfoque: Adaptación"
        : "Fuerza e Hipertrofia";

export const esSemanaValida = (semana: number | string): boolean => SEMANAS.includes(Number(semana));
export const esDiaValido = (dia: number | string): boolean => DIAS.includes(Number(dia));

/**
 * La semana justo antes, según el orden real del ciclo (no `semana - 1`):
 * así si algún día se reordena o se amplía SEMANAS, esto no se desincroniza.
 * Devuelve null para la Adaptación, que no tiene semana previa.
 */
export const semanaAnterior = (semana: number | string): number | null => {
    const indice = SEMANAS.indexOf(Number(semana));
    return indice > 0 ? SEMANAS[indice - 1]! : null;
};
