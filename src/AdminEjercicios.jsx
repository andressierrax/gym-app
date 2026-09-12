import { useState, useEffect, useCallback } from "react";
import { db, storage } from "./firebase";
import { collection, addDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { TituloSeccion, Tarjeta, Campo, Entrada, BotonPrincipal } from "./ui";
import { tipoDeArchivo, esVideo } from "./dominio/ejercicios";

export default function AdminEjercicios({ soloLectura = false }) {
    const [nombre, setNombre] = useState("");
    const [archivo, setArchivo] = useState(null);
    const [ejercicios, setEjercicios] = useState([]);
    const [cargando, setCargando] = useState(false);

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
                createdAt: new Date()
            });

            setNombre("");
            setArchivo(null);
            obtenerEjercicios();
            alert("¡Ejercicio guardado en Trinity Fit! ✨");
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al subir: " + error.message);
        }
        setCargando(false);
    };

    return (
        <div className="animate-in fade-in duration-500">
            <TituloSeccion titulo="Biblioteca" subtitulo="Recursos Visuales Trinity" />

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

                        <BotonPrincipal disabled={cargando}>
                            {cargando ? "SUBIENDO..." : "Guardar en Biblioteca"}
                        </BotonPrincipal>
                    </Tarjeta>
                </form>
            )}

            <div className="grid grid-cols-2 gap-4 pb-10">
                {ejercicios.length === 0 ? (
                    <div className="col-span-2 text-center py-10">
                        <p className="text-amatista-dark/40 font-bold italic text-xs uppercase tracking-widest">No hay ejercicios aún</p>
                    </div>
                ) : (
                    ejercicios.map(ex => (
                        <div key={ex.id} className="bg-white p-3 rounded-[2rem] shadow-sm border border-amatista-light/30 text-center relative">

                            {/* BOTÓN ELIMINAR (Solo visible si no es soloLectura) */}
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
                                    <video
                                        src={ex.gifUrl}
                                        className="w-full h-full object-cover"
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <img
                                        src={ex.gifUrl}
                                        alt={ex.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <p className="font-black text-[10px] text-amatista-dark uppercase tracking-tighter leading-tight px-1 pb-1">
                                {ex.name}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}