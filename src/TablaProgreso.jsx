import { useState } from "react";
import GraficoProgreso from "./GraficoProgreso";
import { pesosPorEjercicio, repsPorEjercicio } from "./dominio/progreso";

const SEPARADOR = " · ";

function Cambio({ inicio, ultimo, unidad, estancado }) {
    if (inicio === undefined) return null;
    const delta = Math.round((ultimo - inicio) * 100) / 100;
    const color = estancado
        ? "text-amber-700 bg-amber-100"
        : delta > 0 ? "text-emerald-700 bg-emerald-100"
        : delta < 0 ? "text-rose-700 bg-rose-100"
        : "text-amatista-dark/50 bg-purple-50";
    const signo = delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "= ";

    return (
        <div className="flex items-center justify-end gap-2">
            <span className="text-amatista-dark text-xs font-black whitespace-nowrap">
                {inicio === ultimo ? `${ultimo}` : `${inicio} → ${ultimo}`} {unidad}
            </span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md min-w-[3.25rem] text-center ${color}`}>
                {delta === 0 ? "= igual" : `${signo}${Math.abs(delta)}`}
            </span>
        </div>
    );
}

/**
 * Progreso de una clienta como tabla: una fila por ejercicio con su peso y
 * repeticiones (primer registro → último). Al tocar una fila se abre el
 * gráfico de ese ejercicio, así la vista normal queda corta y limpia.
 */
export default function TablaProgreso({ registros, estancados = [] }) {
    const [abierta, setAbierta] = useState(null);

    const pesos = pesosPorEjercicio(registros);
    const reps = repsPorEjercicio(registros);
    const etiquetas = [...new Set([...Object.keys(pesos), ...Object.keys(reps)])]
        .sort((a, b) => a.localeCompare(b));

    if (etiquetas.length === 0) return null;

    const grupos = {};
    for (const etiqueta of etiquetas) {
        const i = etiqueta.indexOf(SEPARADOR);
        const grupo = i === -1 ? "Otros" : etiqueta.slice(0, i);
        const nombre = i === -1 ? etiqueta : etiqueta.slice(i + SEPARADOR.length);
        (grupos[grupo] ??= []).push({ etiqueta, nombre });
    }

    return (
        <div className="mb-8">
            <p className="text-amatista-dark/50 text-[10px] font-black uppercase tracking-widest mb-3">
                Progreso por ejercicio
            </p>

            <div className="space-y-4">
                {Object.entries(grupos).map(([grupo, filas]) => (
                    <div key={grupo} className="bg-white rounded-[2rem] border border-amatista-light/20 shadow-sm overflow-hidden">
                        <p className="px-5 pt-4 pb-2 text-amatista-dark text-[10px] font-black uppercase tracking-widest">
                            {grupo}
                        </p>

                        {filas.map(({ etiqueta, nombre }) => {
                            const sp = pesos[etiqueta];
                            const sr = reps[etiqueta];
                            const estancado = estancados.includes(etiqueta);
                            const desplegada = abierta === etiqueta;

                            return (
                                <div key={etiqueta} className="border-t border-amatista-light/20">
                                    <button
                                        onClick={() => setAbierta(desplegada ? null : etiqueta)}
                                        className="w-full text-left px-5 py-3 flex items-center justify-between gap-3 active:bg-purple-50 transition-colors"
                                    >
                                        <span className="text-amatista-dark text-[11px] font-black uppercase leading-tight min-w-0 flex-1">
                                            {nombre}
                                        </span>
                                        <span className="shrink-0 space-y-1">
                                            {sp && <Cambio inicio={sp[0].peso} ultimo={sp.at(-1).peso} unidad="kg" estancado={estancado} />}
                                            {sr && <Cambio inicio={sr[0].reps} ultimo={sr.at(-1).reps} unidad="rep" />}
                                        </span>
                                    </button>

                                    {desplegada && (
                                        <div className="px-3 pb-3 grid gap-3">
                                            {sp && <GraficoProgreso titulo={`${nombre} · peso`} puntos={sp} campo="peso" unidad="kg" />}
                                            {sr && <GraficoProgreso titulo={`${nombre} · repeticiones`} puntos={sr} campo="reps" unidad=" rep" />}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
