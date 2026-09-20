import { VENTANA_DIAS } from "./dominio/resumen";

const textoUltimo = (dias) =>
    dias === null ? "—" : dias === 0 ? "Hoy" : dias === 1 ? "Ayer" : `Hace ${dias} días`;

function Dato({ valor, etiqueta }) {
    return (
        <div className="bg-white/10 rounded-2xl p-3 text-center">
            <p className="text-white font-black text-lg leading-none">{valor}</p>
            <p className="text-white/50 text-[8px] font-black uppercase tracking-widest mt-1">{etiqueta}</p>
        </div>
    );
}

/**
 * Resumen de las últimas 4 semanas de una clienta. Lo usan el Monitor de la
 * entrenadora y la pestaña Progreso de la clienta: mismos datos, distinto tono.
 */
export default function TarjetaResumen({ resumen, paraClienta = false }) {
    const { entrenamientos, diasSinEntrenar, constancia, mejoras, estancados } = resumen;
    const mejorasVisibles = mejoras.slice(0, 5);

    return (
        <div className="bg-amatista-dark rounded-[2rem] border border-white/10 shadow-xl p-5 mb-8">
            <p className="text-amatista-light text-[10px] font-black uppercase tracking-widest mb-3">
                Últimas {VENTANA_DIAS / 7} semanas
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <Dato valor={entrenamientos} etiqueta="Entrenos" />
                <Dato valor={constancia === null ? "—" : `${constancia}%`} etiqueta="Sets hechos" />
                <Dato valor={textoUltimo(diasSinEntrenar)} etiqueta="Último" />
            </div>

            {mejorasVisibles.length > 0 && (
                <div className="mb-3">
                    <p className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-2">
                        {paraClienta ? "Tus mejoras" : "Mejoras recientes"}
                    </p>
                    <ul className="space-y-1">
                        {mejorasVisibles.map(m => (
                            <li key={`${m.etiqueta}-${m.unidad}`} className="text-white text-[11px] font-bold flex justify-between gap-3">
                                <span className="truncate">{m.etiqueta}</span>
                                <span className="text-emerald-300 shrink-0">
                                    ▲ {m.anterior} → {m.actual} {m.unidad}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {!paraClienta && estancados.length > 0 && (
                <div>
                    <p className="text-amber-300 text-[9px] font-black uppercase tracking-widest mb-2">
                        Sin progreso en 3 sesiones
                    </p>
                    <ul className="space-y-1">
                        {estancados.map(e => (
                            <li key={e} className="text-white/80 text-[11px] font-bold truncate">{e}</li>
                        ))}
                    </ul>
                </div>
            )}

            {mejorasVisibles.length === 0 && (paraClienta || estancados.length === 0) && (
                <p className="text-white/40 text-[11px] font-medium">
                    {paraClienta
                        ? "Anota tu peso y repeticiones en cada set y aquí verás cómo mejoras."
                        : "Aún no hay suficientes registros de peso o repeticiones para comparar."}
                </p>
            )}
        </div>
    );
}
