// Formas de datos de Trinity Fit.
//
// Casi todos los fallos que arrastraba la app eran errores de forma: bloques
// compartidos por referencia, `fecha` que unas veces era Timestamp y otras
// Date, checks y notas mezclados en un mismo objeto, planes guardados en
// semanas que la clienta no podía abrir. Escribirlas una sola vez y en un
// sitio es lo que evita que vuelvan.

/**
 * Formato del recurso visual. Ausente equivale a "imagen": los ejercicios
 * subidos antes de aceptar vídeo no tienen este campo y no hace falta
 * migrarlos, igual que `tipo` en Cliente.
 */
export type TipoRecursoVisual = "imagen" | "video";

/** Ejercicio tal y como vive en la colección `exercises`. */
export interface EjercicioBiblioteca {
    id: string;
    name?: string;
    gifUrl?: string;
    tipo?: TipoRecursoVisual;
}

/**
 * Ejercicio ya dentro de una rutina. `nombre` y `gifUrl` van desnormalizados a
 * propósito: si el ejercicio se borra de la biblioteca, la rutina sigue siendo
 * legible en lugar de quedarse con una referencia rota.
 */
export interface EjercicioPrescrito {
    ejercicioId: string;
    nombre: string;
    gifUrl: string;
    tipo?: TipoRecursoVisual;
    series: string;
    reps: string;
    peso: string;
}

/**
 * Un set de la rutina. `ejercicios` es opcional: los planes creados antes de
 * conectar la biblioteca solo tienen `contenido` en texto libre y deben seguir
 * funcionando sin migración.
 */
export interface Bloque {
    titulo: string;
    contenido: string;
    ejercicios?: EjercicioPrescrito[];
}

/** Plan asignado a una clienta para una semana y un día concretos. */
export interface Plan {
    id: string;
    clienteId: string;
    semana: number;
    dia: number;
    nombreDia?: string;
    bloques?: Bloque[];
    fechaCreacion?: unknown;
    fechaActualizacion?: unknown;
}

/** Estado de la sesión en curso, indexado por posición del bloque. */
export interface Sesion {
    checks: Record<string, boolean>;
    notas: Record<string, string>;
    /** Peso levantado (kg), indexado por `${bloqueIndex}-${ejercicioIndex}`. */
    pesos: Record<string, number>;
    /** Epoch en milisegundos del último cambio hecho por la clienta. */
    actualizado: number;
}

/** Lo que se guarda en el documento de servidor de una sesión. */
export interface SesionServidor {
    checks?: Record<string, boolean>;
    notas?: Record<string, string>;
    pesos?: Record<string, number>;
    actualizadoCliente?: number;
}

/** Un peso registrado en un entrenamiento, ya con su ejercicio y fecha. */
export interface RegistroDePeso {
    ejercicio: string;
    peso: number;
    fecha: FechaFirestore;
}

/** Lo mínimo de `registros_entrenamiento` que necesita el gráfico de progreso. */
export interface RegistroConPesos {
    fecha: FechaFirestore;
    pesos?: Record<string, number>;
    nombresEjercicios?: Record<string, string>;
}

export interface Cliente {
    id: string;
    name?: string;
    /** Ausente equivale a "ciclo": no hay que migrar a nadie. */
    tipo?: "ciclo" | "esporadica";
    seguimientoCiclo?: boolean;
}

/** Rutina con nombre del catálogo de una clienta esporádica. */
export interface RutinaLibre {
    id: string;
    clienteId: string;
    nombre: string;
    bloques?: Bloque[];
    fechaCreacion?: unknown;
}

/**
 * `fecha` puede llegar como Timestamp de Firestore, como Date nativo o
 * ausente. Llamar a `.toDate()` a ciegas sobre un Date lanza.
 */
export type FechaFirestore =
    | { toDate: () => Date }
    | Date
    | string
    | number
    | null
    | undefined;
