import { useState } from "react";
import { etiquetaFecha } from "./dominio/fechas";

const MOTIVOS = {
    nueva: "Reemplazada por rutina nueva",
    correccion: "Antes de una corrección",
    eliminada: "Eliminada",
};

/**
 * Versiones anteriores de la rutina de un hueco (clienta + semana + día).
 *
 * Cada vez que la entrenadora guarda encima o elimina, la versión que había
 * se copia a `planes_historial`. Aquí puede verla y cargarla de nuevo en el
 * formulario si se equivocó; restaurar no guarda nada por sí solo.
 */
export default function HistorialVersiones({ versiones, onRestaurar }) {
    const [abierto, setAbierto] = useState(false);
    const [vista, setVista] = useState(null);

    if (versiones.length === 0) return null;

    return (
        <div className="bg-white/10 border border-white/10 rounded-[2rem] overflow-hidden">
            <button
                type="button"
                onClick={() => setAbierto(!abierto)}
                className="w-full px-5 py-4 flex justify-between items-center text-white text-[10px] font-black uppercase tracking-widest"
            >
                <span>🕘 Versiones anteriores ({versiones.length})</span>
                <span className={`transition-transform ${abierto ? "rotate-180" : ""}`}>▾</span>
            </button>

            {abierto && (
                <div className="px-4 pb-4 space-y-2">
                    {versiones.map(v => {
                        const viendo = vista === v.id;
                        return (
                            <div key={v.id} className="bg-black/20 rounded-2xl p-3 border border-white/5">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0">
                                        <p className="text-white text-xs font-black uppercase truncate">
                                            {v.nombreDia || "Sin nombre"}
                                        </p>
                                        <p className="text-white/50 text-[10px] font-bold mt-0.5">
                                            {etiquetaFecha(v.guardadoEn)} · {MOTIVOS[v.motivo] ?? "Versión anterior"} · {v.bloques?.length ?? 0} set(s)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        type="button"
                                        onClick={() => setVista(viendo ? null : v.id)}
                                        className="flex-1 bg-white/10 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                        {viendo ? "Ocultar" : "Ver"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onRestaurar(v)}
                                        className="flex-1 bg-white/90 text-amatista-dark py-2 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                        Restaurar
                                    </button>
                                </div>
                                {viendo && (
                                    <div className="mt-3 space-y-2">
                                        {(v.bloques ?? []).map((b, i) => (
                                            <div key={i} className="bg-white/5 rounded-xl p-3">
                                                <p className="text-amatista-light text-[10px] font-black uppercase">{b.titulo}</p>
                                                {b.contenido && (
                                                    <p className="text-white/80 text-[11px] whitespace-pre-line mt-1">{b.contenido}</p>
                                                )}
                                                {(b.ejercicios ?? []).length > 0 && (
                                                    <p className="text-white/60 text-[10px] mt-1">
                                                        {b.ejercicios.map(e => e.nombre).join(" · ")}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
