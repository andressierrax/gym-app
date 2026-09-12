import type { Bloque, Cliente, EjercicioPrescrito, Plan } from "./tipos";
import { esSemanaValida, esDiaValido } from "../constantes";

/**
 * Id determinista del plan. Con `addDoc` cada guardado creaba un documento
 * nuevo y el mismo día acababa con varias rutinas compitiendo.
 */
export const idPlan = (clienteId: string, semana: number | string, dia: number | string): string =>
    `${clienteId}_S${parseInt(String(semana))}D${parseInt(String(dia))}`;

export const BLOQUE_VACIO = (): Bloque[] => [{ titulo: "SET #1", contenido: "" }];

/**
 * Copia profunda de los bloques y de sus ejercicios.
 *
 * El spread superficial copiaba el array pero no los objetos, así que al
 * cargar una plantilla el formulario editaba la rutina original que seguía
 * viva en memoria. Es el bug más silencioso que tenía la app.
 */
export function clonarBloques(bloques: Bloque[] | undefined): Bloque[] {
    if (!bloques?.length) return BLOQUE_VACIO();
    return bloques.map(b => ({
        ...b,
        ejercicios: (b.ejercicios ?? []).map(e => ({ ...e })),
    }));
}

/** Todos los planes guardados para una combinación clienta/semana/día. */
export function planesDelHueco(
    planes: Plan[],
    clienteId: string,
    semana: number | string,
    dia: number | string,
): Plan[] {
    if (!clienteId) return [];
    return planes.filter(p =>
        p.clienteId === clienteId
        && p.semana === parseInt(String(semana))
        && p.dia === parseInt(String(dia)));
}

/** Planes guardados fuera del ciclo: existen pero la clienta no puede abrirlos. */
export const planesFueraDeCiclo = (planes: Plan[]): Plan[] =>
    planes.filter(p => !esSemanaValida(p.semana) || !esDiaValido(p.dia));

export interface GrupoDeCliente {
    clienteId: string;
    nombre: string;
    planes: Plan[];
}

/**
 * Agrupa los planes por clienta para el selector de "copiar rutina previa",
 * que antes era una lista plana y sin nombres. La clienta seleccionada va
 * primero, que es de quien casi siempre se copia.
 */
export function agruparPorCliente(
    planes: Plan[],
    clientes: Cliente[],
    seleccionado: string,
): GrupoDeCliente[] {
    const nombreDe = (id: string) =>
        clientes.find(c => c.id === id)?.name || "clienta desconocida";

    const porCliente = new Map<string, Plan[]>();
    for (const p of planes) {
        if (!porCliente.has(p.clienteId)) porCliente.set(p.clienteId, []);
        porCliente.get(p.clienteId)!.push(p);
    }

    return [...porCliente.entries()]
        .map(([clienteId, suyos]) => ({
            clienteId,
            nombre: nombreDe(clienteId),
            planes: [...suyos].sort((a, b) => (a.semana - b.semana) || (a.dia - b.dia)),
        }))
        .sort((a, b) => {
            if (a.clienteId === seleccionado) return -1;
            if (b.clienteId === seleccionado) return 1;
            return a.nombre.localeCompare(b.nombre);
        });
}

/** Texto de la prescripción, omitiendo los campos que la entrenadora dejó vacíos. */
export function formatearPrescripcion(ej: EjercicioPrescrito): string {
    return [
        ej.series && `${ej.series} series`,
        ej.reps && `${ej.reps} reps`,
        ej.peso && `${ej.peso}`,
    ].filter(Boolean).join(" · ") || "Sin prescripción";
}
