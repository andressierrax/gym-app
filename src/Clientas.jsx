import { useState, useEffect, useCallback } from "react";
import { db } from "./firebase";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Seleccion, TituloSeccion, Cargando, Vacio } from "./ui";
import { tipoDeCliente, etiquetaTipo } from "./dominio/clientes";

/** Listado de clientas ya registradas, con su tipo de entrenamiento y el interruptor de ciclo. Crear una nueva vive en CrearCliente.jsx. */
export default function Clientas() {
    const [clientas, setClientas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardandoCiclo, setGuardandoCiclo] = useState("");

    const leerClientas = useCallback(async () => {
        try {
            const snap = await getDocs(query(collection(db, "users"), where("role", "==", "client")));
            return snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        } catch (error) {
            console.error("No se pudieron cargar las clientas:", error);
            return [];
        }
    }, []);

    useEffect(() => {
        let vivo = true;
        leerClientas().then(c => {
            if (!vivo) return;
            setClientas(c);
            setCargando(false);
        });
        return () => { vivo = false; };
    }, [leerClientas]);

    const cambiarTipo = async (cliente, nuevo) => {
        setGuardandoCiclo(cliente.id);
        try {
            await updateDoc(doc(db, "users", cliente.id), { tipo: nuevo });
            setClientas(prev => prev.map(c => c.id === cliente.id ? { ...c, tipo: nuevo } : c));
        } catch (error) {
            console.error("No se pudo cambiar el tipo:", error);
            alert("No se pudo cambiar el tipo: " + error.message);
        }
        setGuardandoCiclo("");
    };

    // El interruptor lo maneja la entrenadora. La clienta solo podrá registrar
    // sus fechas, y en otra colección: sobre su perfil no escribe nada.
    const alternarCiclo = async (cliente) => {
        const activar = !cliente.seguimientoCiclo;
        setGuardandoCiclo(cliente.id);
        try {
            await updateDoc(doc(db, "users", cliente.id), { seguimientoCiclo: activar });
            setClientas(prev => prev.map(c => c.id === cliente.id ? { ...c, seguimientoCiclo: activar } : c));
        } catch (error) {
            console.error("No se pudo cambiar el seguimiento:", error);
            alert("No se pudo cambiar el seguimiento: " + error.message);
        }
        setGuardandoCiclo("");
    };

    if (cargando) return <Cargando texto="Cargando clientas..." />;

    return (
        <div className="animate-in fade-in duration-500">
            <TituloSeccion titulo="Clientas" subtitulo={`${clientas.length} registrada(s)`} />

            {clientas.length === 0 ? (
                <Vacio>Todavía no has registrado ninguna clienta. <br /> Créala en la pestaña Crear Cliente.</Vacio>
            ) : (
                <div className="grid gap-2">
                    {clientas.map(c => (
                        <div key={c.id} className="bg-white p-4 rounded-[2rem] border border-amatista-light/30 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 shrink-0 bg-amatista-dark rounded-2xl flex items-center justify-center text-white font-black italic">
                                    {c.name?.charAt(0).toUpperCase() || "?"}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-amatista-dark uppercase text-sm leading-tight truncate">
                                        {c.name || "Sin nombre"}
                                    </p>
                                    <p className="text-amatista-dark/40 text-[11px] font-medium truncate">{c.email}</p>
                                </div>
                            </div>
                            <Seleccion
                                value={tipoDeCliente(c)}
                                onChange={(e) => cambiarTipo(c, e.target.value)}
                                disabled={guardandoCiclo === c.id}
                                className="text-[11px] mb-2 p-3 border border-amatista-light/40"
                            >
                                <option value="ciclo">{etiquetaTipo("ciclo")} — semanas y días</option>
                                <option value="esporadica">{etiquetaTipo("esporadica")} — catálogo</option>
                            </Seleccion>

                            <button
                                onClick={() => alternarCiclo(c)}
                                disabled={guardandoCiclo === c.id}
                                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border transition-all active:scale-[0.98] disabled:opacity-50 ${c.seguimientoCiclo
                                    ? "bg-amatista-light/40 border-amatista-light"
                                    : "bg-purple-50 border-amatista-light/30"
                                    }`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest text-amatista-dark text-left">
                                    Ciclo menstrual
                                </span>
                                <span className={`shrink-0 w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${c.seguimientoCiclo ? "bg-amatista-dark justify-end" : "bg-amatista-dark/20 justify-start"
                                    }`}>
                                    <span className="w-5 h-5 rounded-full bg-white shadow" />
                                </span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
