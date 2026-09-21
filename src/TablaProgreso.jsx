import { useState } from "react";
import GraficoProgreso from "./GraficoProgreso";
import { pesosPorEjercicio, repsPorEjercicio, pesosLivPorEjercicio, repsLivPorEjercicio } from "./dominio/progreso";

const SEPARADOR = " · ";

function Cambio({ etiqueta, inicio, ultimo, unidad, estancado }) {
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
            <span className="text-amatista-dark/40 text-[9px] font-black w-3 text-center">{etiqueta}</span>
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
export default function TablaProgreso({ registros, estancados = [], estancadosLiv = [] }) {
    const [abierta, setAbierta] = useState(null);

    const pesos = pesosPorEjercicio(registros);
    const reps = repsPorEjercicio(registros);
    const pesosLiv = pesosLivPorEjercicio(registros);
    const repsLiv = repsLivPorEjercicio(registros);
    const etiquetas = [...new Set([...Object.keys(pesos), ...Object.keys(reps), ...Object.keys(pesosLiv), ...Object.keys(repsLiv)])]
        .sort((a, b) => a.localeCompare(b));

    if (etiquetas.length === 0) return null;
    const hayLiviana = Object.keys(pesosLiv).length + Object.keys(repsLiv).length > 0;

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
            {hayLiviana && (
                <p className="text-amatista-dark/40 text-[9px] font-bold uppercase tracking-widest -mt-2 mb-3">
                    P = carga pesada · L = carga liviana
                </p>
            )}

            <div className="space-y-4">
                {Object.entries(grupos).map(([grupo, filas]) => (
                    <div key={grupo} className="bg-white rounded-[2rem] border border-amatista-light/20 shadow-sm overflow-hidden">
                        <p className="px-5 pt-4 pb-2 text-amatista-dark text-[10px] font-black uppercase tracking-widest">
                            {grupo}
                        </p>

                        {filas.map(({ etiqueta, nombre }) => {
                            const sp = pesos[etiqueta];
                            const sr = reps[etiqueta];
                            const spl = pesosLiv[etiqueta];
                            const srl = repsLiv[etiqueta];
                            const estancado = estancados.includes(etiqueta);
                            const estancadoLiv = estancadosLiv.includes(etiqueta);
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
                                            {sp && <Cambio etiqueta="P" inicio={sp[0].peso} ultimo={sp.at(-1).peso} unidad="kg" estancado={estancado} />}
                                            {sr && <Cambio etiqueta="P" inicio={sr[0].reps} ultimo={sr.at(-1).reps} unidad="rep" />}
                                            {spl && <Cambio etiqueta="L" inicio={spl[0].peso} ultimo={spl.at(-1).peso} unidad="kg" estancado={estancadoLiv} />}
                                            {srl && <Cambio etiqueta="L" inicio={srl[0].reps} ultimo={srl.at(-1).reps} unidad="rep" />}
                                        </span>
                                    </button>

                                    {desplegada && (
                                        <div className="px-3 pb-3 grid gap-3">
                                            {(sp || spl) && (
                                                <GraficoProgreso titulo={`${nombre} · peso`} series={[
                                                    { puntos: sp, campo: "peso", unidad: "kg", carga: "pesada" },
                                                    { puntos: spl, campo: "peso", unidad: "kg", carga: "liviana" },
                                                ]} />
                                            )}
                                            {(sr || srl) && (
                                                <GraficoProgreso titulo={`${nombre} · repeticiones`} series={[
                                                    { puntos: sr, campo: "reps", unidad: " rep", carga: "pesada" },
                                                    { puntos: srl, campo: "reps", unidad: " rep", carga: "liviana" },
                                                ]} />
                                            )}
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
