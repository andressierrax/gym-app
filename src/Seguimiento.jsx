import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, doc, writeBatch } from "firebase/firestore";
import { TituloSeccion, Cargando } from "./ui";
import { etiquetaFecha, aDate } from "./dominio/fechas";
import { estadoDelCiclo } from "./dominio/ciclo";
import { etiquetasDeRegistro } from "./dominio/registros";
import { pesosPorEjercicio, ejerciciosConProgreso, repsPorEjercicio, ejerciciosConProgresoReps } from "./dominio/progreso";
import GraficoProgreso from "./GraficoProgreso";

export default function Seguimiento() {
    const [registros, setRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState("");
    const [abierto, setAbierto] = useState(null);
    const [borrando, setBorrando] = useState(false);
    const [ciclos, setCiclos] = useState({});
    const [historialClienta, setHistorialClienta] = useState([]);

    useEffect(() => {
        const q = query(
            collection(db, "registros_entrenamiento"),
            orderBy("fecha", "desc"),
            limit(50)
        );

        // onSnapshot en lugar de getDocs: la pantalla se anuncia como actividad
        // en tiempo real, así que ahora lo es de verdad y los entrenos aparecen
        // solos sin que la entrenadora recargue.
        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                setRegistros(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            },
            (error) => {
                console.error("Error al obtener seguimiento:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Firestore no tiene borrado masivo desde el cliente: hay que recorrer los
    // documentos. Con lotes de 400 (el límite del batch es 500) sobra.
    const vaciarHistorial = async () => {
        const confirmar = window.confirm(
            [
                "Se eliminarán TODOS los entrenamientos registrados de todas las clientas.",
                "Las rutinas asignadas y la biblioteca NO se tocan: solo el historial del Monitor.",
                "Esta acción no se puede deshacer. ¿Continuar?",
            ].join("\n\n")
        );
        if (!confirmar) return;

        setBorrando(true);
        try {
            let total = 0;
            // Releemos sin límite: la vista solo trae los 50 últimos.
            const snap = await getDocs(collection(db, "registros_entrenamiento"));
            const docs = snap.docs;
            for (let i = 0; i < docs.length; i += 400) {
                const lote = writeBatch(db);
                for (const d of docs.slice(i, i + 400)) lote.delete(doc(db, "registros_entrenamiento", d.id));
                await lote.commit();
                total += Math.min(400, docs.length - i);
            }
            alert(`Historial vaciado: ${total} registro(s) eliminados.`);
        } catch (error) {
            console.error("Error al vaciar el historial:", error);
            alert("No se pudo vaciar el historial: " + error.message);
        }
        setBorrando(false);
    };

    // Ciclos de las clientas que lo tienen activado, para situar cada entreno
    // en su fase. Se lee una vez: cambia como mucho una vez al mes.
    useEffect(() => {
        let vivo = true;
        (async () => {
            try {
                const snap = await getDocs(collection(db, "ciclos"));
                if (!vivo) return;
                const mapa = {};
                for (const d of snap.docs) mapa[d.id] = d.data();
                setCiclos(mapa);
            } catch (error) {
                // Sin esto el Monitor funciona igual, solo sin la fase.
                console.error("No se pudieron cargar los ciclos:", error);
            }
        })();
        return () => { vivo = false; };
    }, []);

    // Progreso de la clienta filtrada: se trae aparte y sin límite, porque el
    // feed de arriba solo enseña los últimos 50 registros de TODAS las
    // clientas, y un gráfico de progreso necesita el histórico completo de una.
    useEffect(() => {
        let vivo = true;

        const cargar = async () => {
            const clienteId = registros.find(r => r.clienteNombre === filtro)?.clienteId;
            if (!clienteId) { if (vivo) setHistorialClienta([]); return; }
            try {
                const snap = await getDocs(query(collection(db, "registros_entrenamiento"), where("clienteId", "==", clienteId)));
                if (vivo) setHistorialClienta(snap.docs.map(d => d.data()));
            } catch (error) {
                console.error("No se pudo cargar el progreso de la clienta:", error);
                if (vivo) setHistorialClienta([]);
            }
        };

        cargar();
        return () => { vivo = false; };
    }, [filtro, registros]);

    // La fase que tenía ESE día, no la de hoy: es lo que permite interpretar
    // un entrenamiento flojo de la semana pasada.
    const faseDelRegistro = (reg) => {
        const datos = ciclos[reg.clienteId];
        if (!datos?.ultimaRegla) return null;
        const fechaReg = aDate(reg.fecha);
        if (!fechaReg) return null;
        const [a, m, d] = String(datos.ultimaRegla).split("-").map(Number);
        const inicio = new Date(a, (m ?? 1) - 1, d ?? 1);
        if (fechaReg < inicio) return null; // el entreno es anterior al dato
        return estadoDelCiclo(inicio, fechaReg, datos.duracion);
    };

    // La lista de clientas sale de los propios registros: no hace falta
    // consultar `users` solo para poder filtrar.
    const clientas = [...new Set(registros.map(r => r.clienteNombre).filter(Boolean))]
        .sort()
        .map(nombre => ({ nombre, cantidad: registros.filter(r => r.clienteNombre === nombre).length }));
    const visibles = filtro ? registros.filter(r => r.clienteNombre === filtro) : registros;

    if (loading) return <Cargando texto="Cargando Actividad..." />;

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <TituloSeccion
                titulo="Monitor"
                subtitulo={filtro || "Actividad en Tiempo Real"}
                accion={registros.length > 0 && (
                    <button
                        onClick={vaciarHistorial}
                        disabled={borrando}
                        className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-200 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {borrando ? "Borrando..." : "Vaciar historial 🗑️"}
                    </button>
                )}
            />

            {/* Primero se elige la clienta como tarjeta, y solo al entrar a una
                se ve su progreso de peso y su actividad: antes todo se mostraba
                junto en un desplegable, que la entrenadora encontró disperso. */}
            {!filtro ? (
                clientas.length === 0 ? (
                    <div className="bg-white/50 border-2 border-dashed border-amatista-light rounded-[2rem] p-10 text-center">
                        <p className="text-amatista-dark/40 font-bold italic text-sm">
                            No hay entrenamientos registrados todavía.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {clientas.map(c => (
                            <button
                                key={c.nombre}
                                onClick={() => setFiltro(c.nombre)}
                                className="w-full text-left bg-white p-5 rounded-[2rem] border border-amatista-light/20 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="h-12 w-12 shrink-0 bg-amatista-dark rounded-2xl flex items-center justify-center text-white font-black italic text-xl shadow-lg shadow-amatista-dark/20">
                                        {c.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-amatista-dark uppercase text-sm leading-tight tracking-tight truncate">
                                            {c.nombre}
                                        </h3>
                                        <p className="text-amatista-dark/40 text-[9px] font-bold uppercase tracking-widest">
                                            {c.cantidad} entrenamiento{c.cantidad === 1 ? "" : "s"}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-amatista-dark/30 text-2xl shrink-0">›</span>
                            </button>
                        ))}
                    </div>
                )
            ) : (
                <>
                    <button
                        onClick={() => setFiltro("")}
                        className="mb-6 text-[10px] font-black uppercase tracking-widest text-amatista-dark/60 bg-white/60 px-4 py-2 rounded-2xl border border-amatista-light/30 active:scale-95 transition-all"
                    >
                        ← Todas las clientas
                    </button>

                    {(() => {
                        const porEjercicio = pesosPorEjercicio(historialClienta);
                        const ejercicios = ejerciciosConProgreso(historialClienta);
                        if (ejercicios.length === 0) return null;
                        return (
                            <div className="mb-8">
                                <p className="text-amatista-dark/50 text-[10px] font-black uppercase tracking-widest mb-3">
                                    Progreso de peso
                                </p>
                                <div className="grid gap-3">
                                    {ejercicios.map(nombre => (
                                        <GraficoProgreso key={nombre} titulo={nombre} puntos={porEjercicio[nombre]} campo="peso" unidad="kg" />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {(() => {
                        const porEjercicioReps = repsPorEjercicio(historialClienta);
                        const ejerciciosReps = ejerciciosConProgresoReps(historialClienta);
                        if (ejerciciosReps.length === 0) return null;
                        return (
                            <div className="mb-8">
                                <p className="text-amatista-dark/50 text-[10px] font-black uppercase tracking-widest mb-3">
                                    Progreso de repeticiones
                                </p>
                                <div className="grid gap-3">
                                    {ejerciciosReps.map(nombre => (
                                        <GraficoProgreso key={nombre} titulo={nombre} puntos={porEjercicioReps[nombre]} campo="reps" unidad=" rep" />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    <p className="text-amatista-dark/50 text-[10px] font-black uppercase tracking-widest mb-3">
                        Actividad
                    </p>

                    {visibles.length === 0 ? (
                        <div className="bg-white/50 border-2 border-dashed border-amatista-light rounded-[2rem] p-10 text-center">
                            <p className="text-amatista-dark/40 font-bold italic text-sm">
                                {filtro} no tiene entrenamientos registrados.
                            </p>
                        </div>
                    ) : (
                <div className="grid gap-3">
                    {visibles.map((reg) => {
                        // Notas que la clienta escribió en su bitácora, ordenadas
                        // por posición del set y descartando las que dejó vacías.
                        const observaciones = Object.entries(reg.notas ?? {})
                            .filter(([, texto]) => String(texto).trim())
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([index, texto]) => ({
                                index: Number(index),
                                // Los registros anteriores a esta versión no guardan
                                // los títulos: para esos caemos en "Set N".
                                titulo: reg.titulos?.[Number(index)] || `Set ${Number(index) + 1}`,
                                texto: String(texto).trim(),
                            }));
                        const desplegado = abierto === reg.id;
                        const fase = faseDelRegistro(reg);
                        const etiquetas = etiquetasDeRegistro(reg);

                        return (
                        <div
                            key={reg.id}
                            className="bg-white rounded-[2rem] shadow-sm border border-amatista-light/20 hover:shadow-md transition-shadow overflow-hidden"
                        >
                        <div className="p-5 flex items-center justify-between">
                            {/* Lado Izquierdo: Info Cliente */}
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-amatista-dark rounded-2xl flex items-center justify-center text-white font-black italic text-xl shadow-lg shadow-amatista-dark/20">
                                    {reg.clienteNombre?.charAt(0).toUpperCase() || "A"}
                                </div>
                                <div>
                                    <h3 className="font-black text-amatista-dark uppercase text-sm leading-tight tracking-tight">
                                        {reg.clienteNombre || "Atleta Anónimo"}
                                    </h3>
                                    <div className="flex gap-2 mt-1">
                                        <span
                                            title={etiquetas.esporadica ? "Rutina del catálogo" : undefined}
                                            className={`text-[9px] font-black text-white px-2 py-0.5 rounded-lg uppercase tracking-tighter max-w-[9rem] truncate ${etiquetas.esporadica ? "bg-teal-500" : "bg-amatista-light"
                                                }`}
                                        >
                                            {etiquetas.principal}
                                        </span>
                                        {etiquetas.secundario && (
                                            <span className="text-[9px] font-black text-white bg-amatista-dark/40 px-2 py-0.5 rounded-lg uppercase tracking-tighter">
                                                {etiquetas.secundario}
                                            </span>
                                        )}
                                        {fase && (
                                            <span
                                                title={`${fase.etiqueta} · día ${fase.dia} del ciclo`}
                                                className="text-[9px] font-black text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg uppercase tracking-tighter"
                                            >
                                                {fase.etiqueta}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Lado Derecho: Progreso y Hora */}
                            <div className="text-right">
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-black italic text-amatista-dark bg-purple-50 px-3 py-1 rounded-xl border border-amatista-light/30 mb-1">
                                        {reg.completados} / {reg.totalBloques} SETS
                                    </span>
                                    <p className="text-[9px] text-amatista-dark/40 font-bold uppercase tracking-widest">
                                        {etiquetaFecha(reg.fecha)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Bitácora de la clienta. Se guarda desde que se arregló
                            el guardado de notas, así que los registros antiguos
                            no la tienen. */}
                        {observaciones.length > 0 ? (
                            <>
                                <button
                                    onClick={() => setAbierto(desplegado ? null : reg.id)}
                                    className="w-full px-5 py-3 bg-purple-50 border-t border-amatista-light/30 text-left text-[10px] font-black uppercase tracking-widest text-amatista-dark flex justify-between items-center active:bg-purple-100 transition-colors"
                                >
                                    <span>📝 {observaciones.length} observación{observaciones.length > 1 ? "es" : ""}</span>
                                    <span className={`transition-transform ${desplegado ? "rotate-180" : ""}`}>▾</span>
                                </button>

                                {desplegado && (
                                    <div className="px-5 py-4 bg-purple-50/60 border-t border-amatista-light/20 space-y-3">
                                        {observaciones.map(o => (
                                            <div key={o.index}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-amatista-dark/50 mb-1">
                                                    {o.titulo}
                                                </p>
                                                <p className="text-sm text-amatista-dark font-medium whitespace-pre-line leading-snug bg-white rounded-xl px-3 py-2 border border-amatista-light/30">
                                                    {o.texto}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="px-5 py-2.5 bg-purple-50/50 border-t border-amatista-light/20 text-[9px] font-bold uppercase tracking-widest text-amatista-dark/30">
                                Sin observaciones
                            </p>
                        )}
                        </div>
                        );
                    })}
                </div>
                    )}
                </>
            )}
        </div>
    );
}