import { useState, useEffect, useCallback } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, query, where, orderBy } from "firebase/firestore";
import { SEMANAS, DIAS, SEMANA_ADAPTACION, etiquetaSemana, esSemanaValida, esDiaValido } from "./constantes";
import { TituloSeccion, Tarjeta, Campo, Entrada, Seleccion, BotonPrincipal } from "./ui";
import { idPlan, clonarBloques, planesDelHueco, planesFueraDeCiclo, agruparPorCliente, BLOQUE_VACIO } from "./dominio/planes";
import { esEsporadica } from "./dominio/clientes";
import { esVideo } from "./dominio/ejercicios";


export default function CreadorRutinas() {
    const [clientes, setClientes] = useState([]);
    const [rutinasExistentes, setRutinasExistentes] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState("");
    const [semana, setSemana] = useState("1");
    const [dia, setDia] = useState("1");
    const [nombreDia, setNombreDia] = useState("");
    const [bloques, setBloques] = useState([{ titulo: "SET #1", contenido: "" }]);
    const [cargando, setCargando] = useState(false);
    const [biblioteca, setBiblioteca] = useState([]);
    const [nombreRutina, setNombreRutina] = useState("");
    const [rutinasLibres, setRutinasLibres] = useState([]);
    const [rutinaLibreId, setRutinaLibreId] = useState(null);

    // Función para LIMPIAR todo el formulario
    const limpiarFormulario = () => {
        if (window.confirm("¿Estás segura de que quieres limpiar todo el formulario?")) {
            setClienteSeleccionado("");
            setSemana("1");
            setDia("1");
            setNombreDia("");
            setBloques(BLOQUE_VACIO());
        }
    };

    // La biblioteca de ejercicios alimenta el selector de cada set: hasta ahora
    // los GIFs que subía la entrenadora no llegaban nunca a la rutina.
    useEffect(() => {
        const fetchEjercicios = async () => {
            try {
                const snap = await getDocs(collection(db, "exercises"));
                setBiblioteca(
                    snap.docs.map(d => ({ id: d.id, ...d.data() }))
                        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
                );
            } catch (error) { console.error("No se pudo cargar la biblioteca:", error); }
        };
        fetchEjercicios();
    }, []);

    useEffect(() => {
        const fetchClientes = async () => {
            try {
                const q = query(collection(db, "users"), where("role", "==", "client"));
                const snap = await getDocs(q);
                setClientes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) { console.error(error); }
        };
        fetchClientes();
    }, []);

    // Se vuelve a llamar tras guardar o borrar, para que la pantalla refleje
    // lo que hay de verdad en la base de datos y no una copia obsoleta.
    const leerRutinas = useCallback(async () => {
        try {
            const q = query(collection(db, "planes_mensuales"), orderBy("fechaCreacion", "desc"));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error("No se pudieron cargar las rutinas:", error);
            return [];
        }
    }, []);

    useEffect(() => {
        let vivo = true;
        leerRutinas().then(r => { if (vivo) setRutinasExistentes(r); });
        return () => { vivo = false; };
    }, [leerRutinas]);

    const fetchRutinas = useCallback(
        async () => setRutinasExistentes(await leerRutinas()),
        [leerRutinas]
    );

    const clienteActual = clientes.find(c => c.id === clienteSeleccionado);
    const modoCatalogo = esEsporadica(clienteActual);

    const leerRutinasLibres = useCallback(async (clienteId) => {
        if (!clienteId) return [];
        try {
            const snap = await getDocs(query(collection(db, "rutinas_libres"), where("clienteId", "==", clienteId)));
            return snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? ""));
        } catch (error) {
            console.error("No se pudo cargar el catálogo:", error);
            return [];
        }
    }, []);

    useEffect(() => {
        let vivo = true;
        leerRutinasLibres(modoCatalogo ? clienteSeleccionado : "").then(r => { if (vivo) setRutinasLibres(r); });
        return () => { vivo = false; };
    }, [leerRutinasLibres, clienteSeleccionado, modoCatalogo]);

    const nuevaRutinaLibre = () => {
        setRutinaLibreId(null);
        setNombreRutina("");
        setBloques(BLOQUE_VACIO());
    };

    const editarRutinaLibre = (r) => {
        setRutinaLibreId(r.id);
        setNombreRutina(r.nombre ?? "");
        setBloques(clonarBloques(r.bloques));
    };

    const guardarRutinaLibre = async () => {
        if (!clienteSeleccionado) return alert("Selecciona un cliente");
        if (!nombreRutina.trim()) return alert("Ponle un nombre a la rutina");
        setCargando(true);
        try {
            const datos = {
                clienteId: clienteSeleccionado,
                nombre: nombreRutina.trim(),
                bloques,
                fechaActualizacion: new Date(),
            };
            if (rutinaLibreId) {
                // setDoc sin merge: los bloques eliminados desaparecen de verdad.
                await setDoc(doc(db, "rutinas_libres", rutinaLibreId), {
                    ...datos,
                    fechaCreacion: rutinasLibres.find(r => r.id === rutinaLibreId)?.fechaCreacion ?? new Date(),
                });
            } else {
                await addDoc(collection(db, "rutinas_libres"), { ...datos, fechaCreacion: new Date() });
            }
            setRutinasLibres(await leerRutinasLibres(clienteSeleccionado));
            alert(rutinaLibreId ? "¡Rutina actualizada!" : "¡Rutina añadida al catálogo!");
            nuevaRutinaLibre();
        } catch (error) {
            console.error("Error al guardar la rutina:", error);
            alert("Error al guardar: " + error.message);
        }
        setCargando(false);
    };

    const eliminarRutinaLibre = async (r) => {
        if (!window.confirm(`Se eliminará «${r.nombre}» del catálogo de ${nombreCliente(clienteSeleccionado)}.

No se puede deshacer. ¿Continuar?`)) return;
        setCargando(true);
        try {
            await deleteDoc(doc(db, "rutinas_libres", r.id));
            setRutinasLibres(await leerRutinasLibres(clienteSeleccionado));
            if (rutinaLibreId === r.id) nuevaRutinaLibre();
        } catch (error) {
            console.error("Error al eliminar la rutina:", error);
            alert("No se pudo eliminar: " + error.message);
        }
        setCargando(false);
    };

    const cargarPlantilla = (idRutina) => {
        if (!idRutina) return;
        const plantilla = rutinasExistentes.find(r => r.id === idRutina);
        if (plantilla) {
            setNombreDia(plantilla.nombreDia || "");
            // Copiamos cada bloque, no solo el array: si compartiéramos las
            // referencias, editar el formulario modificaría la rutina original
            // que sigue viva en `rutinasExistentes`.
            setBloques(clonarBloques(plantilla.bloques));
        }
    };

    const nombreCliente = (id) =>
        clientes.find(c => c.id === id)?.name || "clienta desconocida";

    // Planes ya guardados que caen fuera del ciclo que la clienta puede abrir.
    const planesInvisibles = planesFueraDeCiclo(rutinasExistentes);

    // Todos los planes ya guardados para la combinación que hay en el formulario.
    // Puede haber más de uno: los creados antes de usar ids deterministas.
    const delHueco = planesDelHueco(rutinasExistentes, clienteSeleccionado, semana, dia);
    const planActual = delHueco[0]; // el más reciente: la consulta viene ordenada

    const cargarParaEditar = () => {
        if (!planActual) return;
        setNombreDia(planActual.nombreDia || "");
        setBloques(clonarBloques(planActual.bloques));
    };

    // Planes agrupados por clienta para el selector de copiar.
    const rutinasAgrupadas = agruparPorCliente(rutinasExistentes, clientes, clienteSeleccionado);

    const agregarBloque = () => {
        setBloques([...bloques, { titulo: `SET #${bloques.length + 1}`, contenido: "" }]);
    };

    const eliminarBloque = (index) => {
        // Siempre debe quedar al menos un bloque con el que trabajar.
        if (bloques.length === 1) return;
        setBloques(prev => prev.filter((_, i) => i !== index));
    };

    // Reemplaza un campo del bloque devolviendo objetos nuevos, sin tocar los previos.
    const actualizarBloque = (index, campo, valor) => {
        setBloques(prev => prev.map((b, i) => (i === index ? { ...b, [campo]: valor } : b)));
    };

    // Guardamos nombre y gifUrl junto al id: así la rutina sigue siendo legible
    // aunque más adelante se renombre o se borre el ejercicio de la biblioteca.
    const agregarEjercicio = (indexBloque, ejercicioId) => {
        const ej = biblioteca.find(e => e.id === ejercicioId);
        if (!ej) return;
        setBloques(prev => prev.map((b, i) => i !== indexBloque ? b : {
            ...b,
            ejercicios: [...(b.ejercicios ?? []), {
                ejercicioId: ej.id,
                nombre: ej.name ?? "",
                gifUrl: ej.gifUrl ?? "",
                tipo: ej.tipo,
                series: "",
                reps: "",
                peso: "",
            }],
        }));
    };

    const actualizarEjercicio = (indexBloque, indexEj, campo, valor) => {
        setBloques(prev => prev.map((b, i) => i !== indexBloque ? b : {
            ...b,
            ejercicios: (b.ejercicios ?? []).map((e, j) => j === indexEj ? { ...e, [campo]: valor } : e),
        }));
    };

    const eliminarEjercicio = (indexBloque, indexEj) => {
        setBloques(prev => prev.map((b, i) => i !== indexBloque ? b : {
            ...b,
            ejercicios: (b.ejercicios ?? []).filter((_, j) => j !== indexEj),
        }));
    };

    const guardarPlan = async () => {
        if (!clienteSeleccionado) return alert("Selecciona un cliente");
        // Los selectores ya impiden elegir fuera de rango; esto cubre datos
        // que lleguen por otra vía y evita volver a crear planes invisibles.
        if (!esSemanaValida(semana) || !esDiaValido(dia)) {
            return alert(
                `La clienta solo puede abrir estas semanas: ${SEMANAS.map(etiquetaSemana).join(", ")}. ` +
                `Y los días ${DIAS[0]}-${DIAS.at(-1)}. Ajusta la asignación.`
            );
        }
        const id = idPlan(clienteSeleccionado, semana, dia);
        // Restos de la etapa de ids aleatorios: mismo hueco, otro documento.
        const heredados = delHueco.filter(p => p.id !== id);

        if (planActual) {
            const aviso = heredados.length > 0
                ? `Ya hay ${delHueco.length} plan(es) guardados para ${nombreCliente(clienteSeleccionado)} en ${etiquetaSemana(Number(semana))} · Día ${dia}.\n\n` +
                  `Se dejará uno solo con lo que tienes en pantalla y se eliminarán los ${heredados.length} duplicado(s).`
                : `Ya existe un plan para ${nombreCliente(clienteSeleccionado)} en ${etiquetaSemana(Number(semana))} · Día ${dia}.\n\n` +
                  `Se reemplazará por lo que tienes en pantalla.`;
            if (!window.confirm(aviso + "\n\n¿Continuar?")) return;
        }

        setCargando(true);
        try {
            // setDoc sin merge: sobrescribe el documento entero, así los bloques
            // que hayas eliminado desaparecen de verdad.
            await setDoc(doc(db, "planes_mensuales", id), {
                clienteId: clienteSeleccionado,
                semana: parseInt(semana),
                dia: parseInt(dia),
                nombreDia,
                bloques,
                // Conservamos la fecha original para no alterar el orden del histórico.
                fechaCreacion: planActual?.fechaCreacion ?? new Date(),
                fechaActualizacion: new Date()
            });

            for (const duplicado of heredados) {
                await deleteDoc(doc(db, "planes_mensuales", duplicado.id));
            }

            await fetchRutinas();
            alert(planActual ? "¡Rutina actualizada!" : "¡Rutina guardada!");
        } catch (error) {
            console.error("Error al guardar el plan:", error);
            alert("Error al guardar: " + error.message);
        }
        setCargando(false);
    };

    const eliminarPlan = async () => {
        if (!planActual) return;
        const cuantos = delHueco.length;
        const confirmar = window.confirm(
            `Se eliminará ${cuantos > 1 ? `${cuantos} planes` : "el plan"} de ` +
            `${nombreCliente(clienteSeleccionado)} en ${etiquetaSemana(Number(semana))} · Día ${dia}.\n\n` +
            `La clienta dejará de ver esta rutina. Esta acción no se puede deshacer.\n\n¿Continuar?`
        );
        if (!confirmar) return;

        setCargando(true);
        try {
            for (const p of delHueco) {
                await deleteDoc(doc(db, "planes_mensuales", p.id));
            }
            await fetchRutinas();
            alert("Rutina eliminada 🗑️");
        } catch (error) {
            console.error("Error al eliminar el plan:", error);
            alert("No se pudo eliminar: " + error.message);
        }
        setCargando(false);
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <TituloSeccion
                titulo="Creador"
                subtitulo="Planes Individuales"
                accion={
                    <button
                        onClick={limpiarFormulario}
                        className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-200 active:scale-95 transition-all"
                    >
                        Limpiar Todo 🗑️
                    </button>
                }
            />

            {/* Planes guardados antes de acotar el rango: existen en la base de
                datos pero la clienta no tiene forma de abrirlos. */}
            {planesInvisibles.length > 0 && (
                <div className="mb-8 bg-amber-50 border border-amber-300 p-5 rounded-[2rem]">
                    <p className="text-amber-900 text-[10px] font-black uppercase tracking-widest mb-2">
                        ⚠️ {planesInvisibles.length} plan{planesInvisibles.length > 1 ? "es" : ""} fuera del ciclo
                    </p>
                    <p className="text-amber-800/80 text-[11px] font-medium leading-snug mb-3">
                        Están guardados pero la clienta no puede verlos, porque solo abre
                        estas semanas: {SEMANAS.map(etiquetaSemana).join(", ")}; y los días {DIAS[0]}-{DIAS.at(-1)}.
                        Vuelve a asignarlos dentro del rango.
                    </p>
                    <ul className="space-y-1">
                        {planesInvisibles.map(p => (
                            <li key={p.id} className="text-amber-900 text-[11px] font-bold">
                                • {p.nombreDia || "Sin nombre"} — {etiquetaSemana(p.semana)}, Día {p.dia}
                                <span className="font-medium text-amber-800/70">
                                    {" "}({nombreCliente(p.clienteId)})
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* AHORRADOR DE TIEMPO (solo tiene sentido con planes de ciclo) */}
            {!modoCatalogo && (
            <div className="mb-8 bg-white/60 p-6 rounded-[2.5rem] border border-amatista-light/30 shadow-sm">
                <label className="text-amatista-dark text-[10px] font-black uppercase mb-3 block tracking-widest text-center">⚡ Copiar rutina previa</label>
                {/* Agrupado por clienta y con la seleccionada primero: antes era
                    una lista plana sin nombres donde 4 semanas × 5 días × N
                    clientas resultaban indistinguibles entre sí. */}
                <select
                    onChange={(e) => cargarPlantilla(e.target.value)}
                    className="w-full p-4 bg-white rounded-2xl text-xs font-bold text-amatista-dark outline-none border border-amatista-light/20 shadow-sm"
                >
                    <option value="">Selecciona para copiar...</option>
                    {rutinasAgrupadas.map(grupo => (
                        <optgroup key={grupo.clienteId} label={grupo.nombre}>
                            {grupo.planes.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.semana === SEMANA_ADAPTACION ? "ADAP" : `S${r.semana}`}·D{r.dia} — {r.nombreDia || "Sin nombre"} ({r.bloques?.length ?? 0} sets)
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>
            )}

            {/* Catálogo de la clienta esporádica */}
            {modoCatalogo && rutinasLibres.length > 0 && (
                <div className="mb-8 bg-white/60 p-5 rounded-[2.5rem] border border-amatista-light/30 shadow-sm">
                    <p className="text-amatista-dark text-[10px] font-black uppercase mb-3 tracking-widest text-center">
                        Catálogo de {nombreCliente(clienteSeleccionado)}
                    </p>
                    <div className="grid gap-2">
                        {rutinasLibres.map(r => (
                            <div key={r.id} className={`flex items-center gap-2 bg-white p-3 rounded-2xl border ${rutinaLibreId === r.id ? "border-amatista" : "border-amatista-light/30"}`}>
                                <button onClick={() => editarRutinaLibre(r)} className="flex-1 text-left min-w-0">
                                    <p className="font-black text-amatista-dark uppercase text-xs truncate">{r.nombre}</p>
                                    <p className="text-amatista-dark/40 text-[10px] font-bold uppercase tracking-widest">
                                        {r.bloques?.length ?? 0} sets
                                    </p>
                                </button>
                                <button
                                    onClick={() => eliminarRutinaLibre(r)}
                                    disabled={cargando}
                                    className="shrink-0 w-8 h-8 rounded-full bg-red-500/80 text-white text-[10px] font-black active:scale-75 transition-all disabled:opacity-40"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                    {rutinaLibreId && (
                        <button
                            onClick={nuevaRutinaLibre}
                            className="w-full mt-3 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-amatista-dark text-white active:scale-95 transition-all"
                        >
                            + Crear otra rutina
                        </button>
                    )}
                </div>
            )}

            <Tarjeta className="space-y-6">
                {/* CLIENTE */}
                <Campo etiqueta="Asignar a:">
                    <Seleccion
                        value={clienteSeleccionado}
                        onChange={(e) => setClienteSeleccionado(e.target.value)}
                    >
                        <option value="">Elegir Cliente...</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Seleccion>
                </Campo>

                {/* En modo catálogo la rutina se identifica por su nombre, no por
                    una posición en el calendario. */}
                {modoCatalogo && (
                    <Campo etiqueta="Nombre de la rutina">
                        <Entrada
                            type="text"
                            placeholder="Ej: Full body 45 min"
                            value={nombreRutina}
                            onChange={(e) => setNombreRutina(e.target.value)}
                        />
                    </Campo>
                )}

                {!modoCatalogo && (
                <div className="grid grid-cols-2 gap-4">
                    <Campo etiqueta="Semana #">
                        <Seleccion
                            value={semana}
                            onChange={(e) => setSemana(e.target.value)}
                            className="text-center"
                        >
                            {SEMANAS.map(s => (
                                <option key={s} value={s}>
                                    {etiquetaSemana(s)}
                                </option>
                            ))}
                        </Seleccion>
                    </Campo>
                    <Campo etiqueta="Día #">
                        <Seleccion
                            value={dia}
                            onChange={(e) => setDia(e.target.value)}
                            className="text-center"
                        >
                            {DIAS.map(d => <option key={d} value={d}>Día {d}</option>)}
                        </Seleccion>
                    </Campo>
                </div>
                )}

                {/* Aviso de hueco ocupado: antes esto se guardaba encima en
                    silencio y dejaba dos planes compitiendo por el mismo día. */}
                {!modoCatalogo && planActual && (
                    <div className="bg-amber-400/15 border border-amber-300/40 p-5 rounded-[2rem]">
                        <p className="text-amber-200 text-[10px] font-black uppercase tracking-widest mb-1">
                            Este día ya tiene rutina
                        </p>
                        <p className="text-white/70 text-[11px] font-medium leading-snug mb-3">
                            «{planActual.nombreDia || "Sin nombre"}» · {planActual.bloques?.length ?? 0} set(s).
                            {delHueco.length > 1 && ` Hay ${delHueco.length} copias duplicadas.`}
                            {" "}Al guardar se reemplazará.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={cargarParaEditar}
                                className="flex-1 bg-white/90 text-amatista-dark py-3 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                            >
                                Cargar para editar
                            </button>
                            <button
                                type="button"
                                onClick={eliminarPlan}
                                disabled={cargando}
                                className="flex-1 bg-red-500/80 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                            >
                                Eliminar rutina 🗑️
                            </button>
                        </div>
                    </div>
                )}

                {/* ENFOQUE */}
                {!modoCatalogo && (
                <Campo etiqueta="Enfoque del Día">
                    <Entrada
                        type="text"
                        placeholder="Ej: Glúteos y Pierna"
                        value={nombreDia}
                        onChange={(e) => setNombreDia(e.target.value)}
                    />
                </Campo>
                )}

                {/* BLOQUES */}
                <div className="space-y-4">
                    {bloques.map((bloque, index) => (
                        <div key={index} className="bg-white/10 p-4 rounded-[2rem] border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    className="bg-transparent text-white font-black uppercase text-[10px] outline-none flex-1 border-b border-white/10 pb-1"
                                    value={bloque.titulo}
                                    onChange={(e) => actualizarBloque(index, "titulo", e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => eliminarBloque(index)}
                                    disabled={bloques.length === 1}
                                    title={bloques.length === 1 ? "Debe quedar al menos un set" : "Eliminar este set"}
                                    className="shrink-0 w-7 h-7 rounded-full bg-red-500/70 text-white text-[10px] font-black flex items-center justify-center active:scale-75 transition-all disabled:opacity-20"
                                >
                                    ✕
                                </button>
                            </div>
                            {/* Ejercicios de la biblioteca, con su prescripción. */}
                            {(bloque.ejercicios ?? []).length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {bloque.ejercicios.map((ej, j) => (
                                        <div key={j} className="bg-black/20 p-2 rounded-2xl flex items-center gap-2">
                                            {ej.gifUrl && (esVideo(ej) ? (
                                                <video
                                                    src={ej.gifUrl}
                                                    className="w-11 h-11 rounded-xl object-cover shrink-0 bg-white/10"
                                                    autoPlay
                                                    loop
                                                    muted
                                                    playsInline
                                                />
                                            ) : (
                                                <img
                                                    src={ej.gifUrl}
                                                    alt={ej.nombre}
                                                    className="w-11 h-11 rounded-xl object-cover shrink-0 bg-white/10"
                                                />
                                            ))}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-[10px] font-black uppercase truncate mb-1">
                                                    {ej.nombre}
                                                </p>
                                                <div className="flex gap-1">
                                                    <input
                                                        placeholder="Series"
                                                        value={ej.series}
                                                        onChange={(e) => actualizarEjercicio(index, j, "series", e.target.value)}
                                                        className="w-full min-w-0 bg-white/90 rounded-lg px-2 py-1 text-[11px] text-amatista-dark font-bold outline-none"
                                                    />
                                                    <input
                                                        placeholder="Reps"
                                                        value={ej.reps}
                                                        onChange={(e) => actualizarEjercicio(index, j, "reps", e.target.value)}
                                                        className="w-full min-w-0 bg-white/90 rounded-lg px-2 py-1 text-[11px] text-amatista-dark font-bold outline-none"
                                                    />
                                                    <input
                                                        placeholder="Peso"
                                                        value={ej.peso}
                                                        onChange={(e) => actualizarEjercicio(index, j, "peso", e.target.value)}
                                                        className="w-full min-w-0 bg-white/90 rounded-lg px-2 py-1 text-[11px] text-amatista-dark font-bold outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => eliminarEjercicio(index, j)}
                                                className="shrink-0 w-6 h-6 rounded-full bg-red-500/70 text-white text-[9px] font-black active:scale-75 transition-all"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Al elegir se añade y el selector vuelve a cero. */}
                            <select
                                value=""
                                onChange={(e) => { agregarEjercicio(index, e.target.value); e.target.value = ""; }}
                                disabled={biblioteca.length === 0}
                                className="w-full mb-3 bg-white/90 rounded-xl px-3 py-2 text-[11px] text-amatista-dark font-bold outline-none disabled:opacity-40"
                            >
                                <option value="">
                                    {biblioteca.length === 0 ? "Biblioteca vacía — sube GIFs primero" : "+ Añadir ejercicio de la biblioteca"}
                                </option>
                                {biblioteca.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>

                            <textarea
                                className="w-full h-20 bg-white rounded-xl p-3 text-sm text-amatista-dark font-medium outline-none"
                                placeholder="Notas del set (opcional)"
                                value={bloque.contenido}
                                onChange={(e) => actualizarBloque(index, "contenido", e.target.value)}
                            />
                        </div>
                    ))}
                </div>

                <button onClick={agregarBloque} className="w-full py-3 border-2 border-dashed border-white/20 text-white/40 rounded-2xl font-black text-[10px] uppercase tracking-widest">+ Añadir Set</button>

                <BotonPrincipal
                    onClick={modoCatalogo ? guardarRutinaLibre : guardarPlan}
                    disabled={cargando}
                    className="py-5 rounded-[2rem] mt-6"
                >
                    {cargando
                        ? "GUARDANDO..."
                        : modoCatalogo
                            ? (rutinaLibreId ? "Actualizar Rutina" : "Añadir al Catálogo")
                            : (planActual ? "Actualizar Rutina" : "Asignar a Cliente")}
                </BotonPrincipal>
            </Tarjeta>
        </div>
    );
}