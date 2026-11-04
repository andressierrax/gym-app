import { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import useMesociclos from "./useMesociclos";
import {
    aISO, sumarDias, finSugerido, siguienteNombre, estadoMesociclo,
    entrenosEn, etiquetaRango, validarMesociclo,
} from "./dominio/mesociclos";

const ESTADOS = {
    en_curso: { texto: "En curso", clase: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    terminado: { texto: "Terminado", clase: "bg-amatista-light/30 text-amatista-dark/70 border-amatista-light/40" },
    proximo: { texto: "Próximo", clase: "bg-sky-100 text-sky-800 border-sky-200" },
};

const CAMPO = "w-full bg-white border border-amatista-light/40 rounded-xl px-3 py-2 text-sm text-amatista-dark font-bold outline-none focus:border-amatista-dark";

/**
 * Historial de mesociclos de una clienta, con sus fechas.
 *
 * `editable` lo usa la entrenadora (Clientas y Monitor): crear, cambiar
 * fechas y borrar. La clienta lo ve en Mi Progreso solo para consultar.
 * Con `fechasEntrenos` se muestra cuántos entrenamientos cayeron en cada uno.
 */
export default function Mesociclos({ clienteId, editable = false, fechasEntrenos = null }) {
    const [lista, recargar] = useMesociclos(clienteId);
    const [hoy] = useState(() => aISO(new Date()));
    const [editando, setEditando] = useState(null); // id, "nuevo" o null
    const [form, setForm] = useState({ nombre: "", inicio: "", fin: "" });
    const [guardando, setGuardando] = useState(false);

    if (!editable && lista.length === 0) return null;

    const abrirNuevo = () => {
        setForm({ nombre: siguienteNombre(lista), inicio: hoy, fin: finSugerido(hoy) });
        setEditando("nuevo");
    };

    const abrirEdicion = (m) => {
        setForm({ nombre: m.nombre, inicio: m.inicio, fin: m.fin ?? "" });
        setEditando(m.id);
    };

    const guardar = async () => {
        const error = validarMesociclo(form);
        if (error) return alert(error);
        setGuardando(true);
        try {
            const datos = { nombre: form.nombre.trim(), inicio: form.inicio, fin: form.fin || "" };
            if (editando === "nuevo") {
                // Si el anterior seguía abierto (sin fin), se cierra el día antes
                // de que empiece el nuevo: así el historial queda completo sin
                // que la entrenadora tenga que acordarse de hacerlo aparte.
                for (const m of lista) {
                    if (!m.fin && m.inicio < datos.inicio) {
                        await updateDoc(doc(db, "mesociclos", m.id), { fin: sumarDias(datos.inicio, -1) });
                    }
                }
                await addDoc(collection(db, "mesociclos"), { clienteId, ...datos, creado: serverTimestamp() });
            } else {
                await updateDoc(doc(db, "mesociclos", editando), datos);
            }
            setEditando(null);
            recargar();
        } catch (e) {
            console.error("No se pudo guardar el mesociclo:", e);
            alert("No se pudo guardar: " + e.message);
        }
        setGuardando(false);
    };

    const borrar = async (m) => {
        if (!window.confirm(`¿Eliminar «${m.nombre}» (${etiquetaRango(m)})?\n\nLos entrenamientos registrados no se tocan.`)) return;
        try {
            await deleteDoc(doc(db, "mesociclos", m.id));
            recargar();
        } catch (e) {
            alert("No se pudo eliminar: " + e.message);
        }
    };

    return (
        <div className="bg-white/80 border border-amatista-light/30 rounded-[2rem] p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amatista-dark">📅 Mesociclos</p>
                {editable && editando === null && (
                    <button
                        type="button"
                        onClick={abrirNuevo}
                        className="text-[9px] font-black uppercase tracking-widest bg-amatista-dark text-white px-3 py-1.5 rounded-xl active:scale-95 transition-all"
                    >
                        + Nuevo
                    </button>
                )}
            </div>

            {editando !== null && (
                <div className="bg-purple-50 rounded-2xl p-3 mb-3 space-y-2">
                    <input
                        className={CAMPO}
                        value={form.nombre}
                        placeholder="Nombre (ej: Mesociclo #2)"
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-amatista-dark/60">
                            Inicio
                            <input
                                type="date"
                                className={`${CAMPO} mt-1`}
                                value={form.inicio}
                                onChange={(e) => setForm({
                                    ...form,
                                    inicio: e.target.value,
                                    // Al crear, el fin acompaña al inicio mientras no se toque.
                                    fin: editando === "nuevo" && form.inicio && form.fin === finSugerido(form.inicio) && e.target.value
                                        ? finSugerido(e.target.value)
                                        : form.fin,
                                })}
                            />
                        </label>
                        <label className="text-[9px] font-black uppercase tracking-widest text-amatista-dark/60">
                            Fin
                            <input
                                type="date"
                                className={`${CAMPO} mt-1`}
                                value={form.fin}
                                onChange={(e) => setForm({ ...form, fin: e.target.value })}
                            />
                        </label>
                    </div>
                    <p className="text-amatista-dark/50 text-[10px] font-medium">
                        El fin se propone a 5 semanas (Adaptación + 4). Puedes dejarlo vacío si aún no lo sabes.
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={guardar}
                            disabled={guardando}
                            className="flex-1 bg-amatista-dark text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                        >
                            {guardando ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditando(null)}
                            className="flex-1 bg-white text-amatista-dark py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amatista-light/40"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {lista.length === 0 ? (
                <p className="text-amatista-dark/40 text-xs font-bold italic">Aún no hay mesociclos. Crea el primero con «+ Nuevo».</p>
            ) : (
                <div className="space-y-2">
                    {lista.map(m => {
                        const estado = ESTADOS[estadoMesociclo(m, hoy)];
                        return (
                            <div key={m.id} className="bg-white rounded-2xl border border-amatista-light/20 p-3">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0">
                                        <p className="text-amatista-dark font-black uppercase text-xs truncate">{m.nombre}</p>
                                        <p className="text-amatista-dark/60 text-[11px] font-bold mt-0.5">{etiquetaRango(m)}</p>
                                        {fechasEntrenos && (
                                            <p className="text-amatista-dark/40 text-[10px] font-bold mt-0.5">
                                                {entrenosEn(m, fechasEntrenos)} entrenamiento(s)
                                            </p>
                                        )}
                                    </div>
                                    <span className={`shrink-0 text-[8px] font-black uppercase tracking-tight px-2 py-0.5 rounded-lg border ${estado.clase}`}>
                                        {estado.texto}
                                    </span>
                                </div>
                                {editable && editando === null && (
                                    <div className="flex gap-3 mt-2">
                                        <button type="button" onClick={() => abrirEdicion(m)} className="text-[9px] font-black uppercase tracking-widest text-amatista-dark/70">
                                            Editar
                                        </button>
                                        <button type="button" onClick={() => borrar(m)} className="text-[9px] font-black uppercase tracking-widest text-red-500/80">
                                            Eliminar
                                        </button>
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
