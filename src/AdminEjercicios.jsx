import { useState, useEffect, useCallback } from "react";
import { db, storage } from "./firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { TituloSeccion, Tarjeta, Campo, Entrada, BotonPrincipal } from "./ui";
import { tipoDeArchivo, esVideo, separarBiblioteca, DIAS_TEMPORAL } from "./dominio/ejercicios";
import { aISO, sumarDias, formatearFecha } from "./dominio/mesociclos";

export default function AdminEjercicios({ soloLectura = false }) {
    const [nombre, setNombre] = useState("");
    const [archivo, setArchivo] = useState(null);
    const [ejercicios, setEjercicios] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [temporal, setTemporal] = useState(false);
    const [hoy] = useState(() => aISO(new Date()));

    // Separamos la lectura del cambio de estado para no llamar a setState de
    // forma síncrona dentro del efecto.
    const leerEjercicios = useCallback(async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "exercises"));
            return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (error) {
            console.error("Error al obtener ejercicios:", error);
            return [];
        }
    }, []);

    useEffect(() => {
        let vivo = true;
        leerEjercicios().then(e => { if (vivo) setEjercicios(e); });
        return () => { vivo = false; };
    }, [leerEjercicios]);

    const obtenerEjercicios = useCallback(
        async () => setEjercicios(await leerEjercicios()),
        [leerEjercicios]
    );

    // --- NUEVA FUNCIÓN: ELIMINAR EJERCICIO ---
    const eliminarEjercicio = async (id, gifUrl) => {
        const confirmar = window.confirm("¿Estás segura de eliminar este ejercicio? Se borrará de la biblioteca permanentemente.");
        if (!confirmar) return;

        try {
            // 1. Eliminar de Firestore
            await deleteDoc(doc(db, "exercises", id));

            // 2. Eliminar de Storage (Opcional pero recomendado para ahorrar espacio)
            try {
                const imagenRef = ref(storage, gifUrl);
                await deleteObject(imagenRef);
            } catch (storageError) {
                console.warn("El archivo no se pudo borrar de Storage o ya no existía:", storageError.code);
            }

            // 3. Actualizar la interfaz
            setEjercicios(prev => prev.filter(ex => ex.id !== id));
            alert("Ejercicio eliminado 🗑️");
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("No se pudo eliminar el ejercicio");
        }
    };

    // Corre el vencimiento 4 semanas desde hoy. Sirve también para reactivar
    // uno ya vencido: no se borran al vencer, así que basta con la fecha.
    const renovar = async (ex) => {
        const venceEl = sumarDias(hoy, DIAS_TEMPORAL);
        if (!window.confirm(`«${ex.name}» se podrá asignar hasta el ${formatearFecha(venceEl)}. ¿Renovar?`)) return;
        try {
            await updateDoc(doc(db, "exercises", ex.id), { venceEl });
            setEjercicios(prev => prev.map(e => e.id === ex.id ? { ...e, venceEl } : e));
        } catch (error) {
            console.error("No se pudo renovar:", error);
            alert("No se pudo renovar: " + error.message);
        }
    };

    const guardarEjercicio = async (e) => {
        e.preventDefault();
        if (!archivo || !nombre) return alert("Por favor, pon un nombre y selecciona un GIF");

        // El "accept" del selector de archivo es solo una sugerencia del
        // sistema operativo, no un filtro real. Se acepta imagen o vídeo
        // porque las apps que convierten un GIF de Giphy suelen entregar el
        // resultado en .mp4: exigir solo imagen rompía ese caso en silencio.
        const tipo = tipoDeArchivo(archivo.type);
        if (!tipo) {
            return alert(
                `Ese archivo es "${archivo.type || "de tipo desconocido"}", ni imagen ni vídeo. ` +
                `Sube un .gif, o el .mp4 tal cual te lo entregue tu conversor.`
            );
        }

        setCargando(true);
        try {
            const storageRef = ref(storage, `ejercicios/${Date.now()}_${archivo.name}`);
            await uploadBytes(storageRef, archivo);
            const url = await getDownloadURL(storageRef);

            await addDoc(collection(db, "exercises"), {
                name: nombre,
                gifUrl: url,
                tipo,
                createdAt: new Date(),
                ...(temporal ? { temporal: true, venceEl: sumarDias(hoy, DIAS_TEMPORAL) } : {}),
            });

            setNombre("");
            setArchivo(null);
            setTemporal(false);
            obtenerEjercicios();
            alert("¡Ejercicio guardado en Trinity Fit! ✨");
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al subir: " + error.message);
        }
        setCargando(false);
    };

    const coincide = (ex) => (ex.name ?? "").toLowerCase().includes(busqueda.trim().toLowerCase());
    const { permanentes, vigentes, vencidos } = separarBiblioteca(ejercicios, hoy);
    const ejerciciosFiltrados = permanentes.filter(coincide);
    // La clienta no ve los vencidos: ya no se le asignan. La entrenadora sí,
    // para poder borrarlos cuando ya nadie los tenga en su rutina.
    const temporalesFiltrados = [...vigentes, ...(soloLectura ? [] : vencidos)].filter(coincide);

    const tarjeta = (ex) => (
        <div key={ex.id} className="bg-white p-3 rounded-[2rem] shadow-sm border border-amatista-light/30 text-center relative">
            {!soloLectura && (
                <button
                    onClick={() => eliminarEjercicio(ex.id, ex.gifUrl)}
                    className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-75 transition-all z-10"
                >
                    <span className="text-[10px]">✕</span>
                </button>
            )}

            <div className="relative overflow-hidden rounded-[1.5rem] mb-3 aspect-square shadow-inner bg-purple-50">
                {esVideo(ex) ? (
                    <video src={ex.gifUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : (
                    <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" />
                )}
            </div>
            <p className="font-black text-[10px] text-amatista-dark uppercase tracking-tighter leading-tight px-1 pb-1">
                {ex.name}
            </p>
            {ex.temporal && ex.venceEl && (
                <p className={`text-[9px] font-black uppercase tracking-tight mt-1 inline-block px-2 py-0.5 rounded-lg border ${ex.venceEl < hoy
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}>
                    {ex.venceEl < hoy ? `Vencido el ${formatearFecha(ex.venceEl)}` : `⏳ Hasta ${formatearFecha(ex.venceEl)}`}
                </p>
            )}
            {ex.temporal && !soloLectura && (
                <button
                    type="button"
                    onClick={() => renovar(ex)}
                    className="mt-2 w-full bg-amber-100 text-amber-900 border border-amber-300 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                    ↻ Renovar {DIAS_TEMPORAL / 7} semanas
                </button>
            )}
        </div>
    );

    return (
        <div className="animate-in fade-in duration-500">
            <TituloSeccion titulo="Biblioteca" subtitulo="Recursos Visuales Trinity" />

            {ejercicios.length > 0 && (
                <div className="mb-6">
                    <Entrada
                        type="text"
                        placeholder="Buscar ejercicio..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            )}

            {!soloLectura && (
                <form onSubmit={guardarEjercicio} className="mb-10">
                    <Tarjeta className="space-y-6">
                        <Campo etiqueta="Nombre del Ejercicio">
                            <Entrada
                                type="text"
                                placeholder="Ej: Sentadilla Búlgara"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                            />
                        </Campo>

                        <Campo etiqueta="GIF o Vídeo Demostrativo">
                            <input
                                type="file"
                                accept="image/gif,video/mp4,video/webm"
                                className="w-full text-xs text-white/60 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-amatista-light file:text-amatista-dark"
                                onChange={(e) => setArchivo(e.target.files[0])}
                            />
                        </Campo>

                        <label className="flex items-start gap-3 bg-white/10 p-4 rounded-2xl cursor-pointer">
                            <input
                                type="checkbox"
                                checked={temporal}
                                onChange={(e) => setTemporal(e.target.checked)}
                                className="mt-0.5 w-5 h-5 shrink-0 accent-amatista-light"
                            />
                            <span>
                                <span className="block text-white text-[11px] font-black uppercase tracking-widest">
                                    Ejercicio temporal
                                </span>
                                <span className="block text-white/50 text-[11px] font-medium leading-snug mt-1">
                                    Va en su propia sección y deja de ofrecerse para asignar a las {DIAS_TEMPORAL / 7} semanas.
                                </span>
                            </span>
                        </label>

                        <BotonPrincipal disabled={cargando}>
                            {cargando ? "SUBIENDO..." : "Guardar en Biblioteca"}
                        </BotonPrincipal>
                    </Tarjeta>
                </form>
            )}

            {temporalesFiltrados.length > 0 && (
                <>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-3">
                        ⏳ Temporales
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-8 p-3 rounded-[2rem] bg-amber-50/60 border border-amber-200">
                        {temporalesFiltrados.map(tarjeta)}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amatista-dark/60 mb-3">
                        Biblioteca
                    </p>
                </>
            )}

            <div className="grid grid-cols-2 gap-4 pb-10">
                {ejercicios.length === 0 ? (
                    <div className="col-span-2 text-center py-10">
                        <p className="text-amatista-dark/40 font-bold italic text-xs uppercase tracking-widest">No hay ejercicios aún</p>
                    </div>
                ) : ejerciciosFiltrados.length === 0 ? (
                    <div className="col-span-2 text-center py-10">
                        <p className="text-amatista-dark/40 font-bold italic text-xs uppercase tracking-widest">Ningún ejercicio coincide con "{busqueda}"</p>
                    </div>
                ) : (
                    ejerciciosFiltrados.map(tarjeta)
                )}
            </div>
        </div>
    );
}