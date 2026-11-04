import { useState } from "react";
import useMesociclos from "./useMesociclos";
import { aISO, desdeISO, mesocicloActual, etiquetaRango } from "./dominio/mesociclos";

/** Franja en la vista de entrenamiento: qué mesociclo está haciendo y sus fechas. */
export default function MesocicloActual({ clienteId }) {
    const [lista] = useMesociclos(clienteId);
    const [hoy] = useState(() => aISO(new Date()));
    const actual = mesocicloActual(lista, hoy);
    if (!actual) return null;

    const faltan = actual.fin
        ? Math.round((desdeISO(actual.fin).getTime() - desdeISO(hoy).getTime()) / 86400000)
        : null;

    return (
        <div className="bg-amatista-dark text-white rounded-[2rem] px-5 py-4 mb-4 shadow-lg">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amatista-light">Mesociclo actual</p>
            <p className="font-black italic uppercase text-xl leading-tight mt-1">{actual.nombre}</p>
            <p className="text-white/70 text-[11px] font-bold mt-1">
                {etiquetaRango(actual)}
                {faltan !== null && (faltan === 0 ? " · Último día" : ` · Faltan ${faltan} día${faltan === 1 ? "" : "s"}`)}
            </p>
        </div>
    );
}
