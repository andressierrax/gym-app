import { useState, useEffect, useCallback } from "react";
import { db, auth } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
    estadoDelCiclo,
    estimacionCaducada,
    diasDesde,
    acotarDuracion,
    DURACION_POR_DEFECTO,
    DURACION_MINIMA,
    DURACION_MAXIMA,
    AVISO_ORIENTATIVO,
} from "./dominio/ciclo";

// Color por fase. Vive aquí y no en el dominio: es decisión de interfaz.
const COLOR_FASE = {
    menstrual: "bg-rose-100 border-rose-200 text-rose-900",
    folicular: "bg-emerald-50 border-emerald-200 text-emerald-900",
    ovulacion: "bg-amber-50 border-amber-200 text-amber-900",
    lutea: "bg-indigo-50 border-indigo-200 text-indigo-900",
};

/** Fecha de hoy en formato YYYY-MM-DD, que es lo que espera <input type=date>. */
const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** "2026-08-14" -> Date local. Con `new Date(cadena)` se interpretaría en UTC
 *  y en husos negativos saldría el día anterior. */
const aFechaLocal = (iso) => {
    const [a, m, d] = String(iso).split("-").map(Number);
    return new Date(a, (m ?? 1) - 1, d ?? 1);
};

export default function TarjetaCiclo() {
    const [ciclo, setCiclo] = useState(null);
    const [activo, setActivo] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [editando, setEditando] = useState(false);
    const [fecha, setFecha] = useState(hoyISO());
    const [duracion, setDuracion] = useState(DURACION_POR_DEFECTO);
    const [guardando, setGuardando] = useState(false);

    const uid = auth.currentUser?.uid;

    // Leemos el interruptor del perfil y, solo si está activo, los datos del
    // ciclo. Quien lo tenga desactivado —incluido cualquier cliente hombre— no
    // ve nada de esto ni genera consultas.
    const leerCiclo = useCallback(async () => {
        if (!uid) return { activo: false, datos: null };
        try {
            const perfil = await getDoc(doc(db, "users", uid));
            if (perfil.data()?.seguimientoCiclo !== true) return { activo: false, datos: null };
            const snap = await getDoc(doc(db, "ciclos", uid));
            return { activo: true, datos: snap.exists() ? snap.data() : null };
        } catch (error) {
            console.error("No se pudo cargar el ciclo:", error);
            return { activo: false, datos: null };
        }
    }, [uid]);

    useEffect(() => {
        let vivo = true;
        leerCiclo().then(({ activo: a, datos }) => {
            if (!vivo) return;
            setActivo(a);
            setCiclo(datos);
            if (datos?.ultimaRegla) setFecha(datos.ultimaRegla);
            if (datos?.duracion) setDuracion(datos.duracion);
            setCargando(false);
        });
        return () => { vivo = false; };
    }, [leerCiclo]);

    const guardar = async () => {
        if (!uid) return;
        setGuardando(true);
        try {
            const datos = {
                clienteId: uid,
                ultimaRegla: fecha,
                duracion: acotarDuracion(Number(duracion)),
                actualizado: new Date().toISOString(),
            };
            await setDoc(doc(db, "ciclos", uid), datos);
            setCiclo(datos);
            setEditando(false);
        } catch (error) {
            console.error("No se pudo guardar el ciclo:", error);
            alert("No se pudo guardar: " + error.message);
        }
        setGuardando(false);
    };

    if (cargando || !activo) return null;

    // --- Sin fecha todavía ---
    if (!ciclo?.ultimaRegla || editando) {
        return (
            <div className="mb-6 bg-white/70 border border-amatista-light rounded-[2rem] p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-amatista-dark mb-1">
                    Mi ciclo
                </p>
                <p className="text-amatista-dark/60 text-[11px] font-medium leading-snug mb-4">
                    Anota el primer día de tu última regla y verás en qué fase estás. {AVISO_ORIENTATIVO}
                </p>

                <label className="block text-[9px] font-black uppercase tracking-widest text-amatista-dark/50 mb-1">
                    Primer día de la última regla
                </label>
                <input
                    type="date"
                    value={fecha}
                    max={hoyISO()}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full p-3 bg-white rounded-2xl text-amatista-dark font-bold outline-none border border-amatista-light/40 mb-3"
                />

                <label className="block text-[9px] font-black uppercase tracking-widest text-amatista-dark/50 mb-1">
                    Duración de tu ciclo (días)
                </label>
                <input
                    type="number"
                    value={duracion}
                    min={DURACION_MINIMA}
                    max={DURACION_MAXIMA}
                    onChange={(e) => setDuracion(e.target.value)}
                    className="w-full p-3 bg-white rounded-2xl text-amatista-dark font-bold outline-none border border-amatista-light/40 mb-4"
                />

                <div className="flex gap-2">
                    <button
                        onClick={guardar}
                        disabled={guardando || !fecha}
                        className="flex-1 bg-amatista-dark text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                    >
                        {guardando ? "Guardando..." : "Guardar"}
                    </button>
                    {ciclo?.ultimaRegla && (
                        <button
                            onClick={() => setEditando(false)}
                            className="px-5 bg-white text-amatista-dark py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amatista-light"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // --- Con fecha: mostramos la fase ---
    const inicio = aFechaLocal(ciclo.ultimaRegla);
    const estado = estadoDelCiclo(inicio, new Date(), ciclo.duracion);
    const caducada = estimacionCaducada(inicio, new Date(), ciclo.duracion);

    return (
        <div className={`mb-6 border rounded-[2rem] p-5 ${COLOR_FASE[estado.fase]}`}>
            <div className="flex justify-between items-start gap-3 mb-2">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Mi ciclo</p>
                    <p className="font-black italic uppercase text-xl leading-none tracking-tighter mt-1">
                        {estado.etiqueta}
                    </p>
                </div>
                <span className="shrink-0 text-[10px] font-black uppercase tracking-widest bg-white/70 px-3 py-1.5 rounded-xl">
                    Día {estado.dia}
                </span>
            </div>

            <p className="text-[12px] font-medium leading-snug opacity-90 mb-3">{estado.nota}</p>

            {caducada && (
                <p className="text-[11px] font-bold bg-white/70 rounded-xl px-3 py-2 mb-3 leading-snug">
                    Hace {diasDesde(inicio)} días que no actualizas la fecha, así que esto ya no es fiable.
                    Anota tu última regla para volver a ajustarlo.
                </p>
            )}

            <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-medium opacity-50 leading-tight">{AVISO_ORIENTATIVO}</p>
                <button
                    onClick={() => setEditando(true)}
                    className="shrink-0 text-[9px] font-black uppercase tracking-widest bg-white/70 px-3 py-2 rounded-xl active:scale-95 transition-all"
                >
                    Actualizar
                </button>
            </div>
        </div>
    );
}
