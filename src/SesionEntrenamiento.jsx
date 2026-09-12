import { useState, useEffect, useCallback } from "react";
import { db, auth } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Timer from "./Timer";
import { leerLocal, guardarLocal, servidorEsMasReciente, contarCompletados } from "./dominio/sesion";
import { formatearPrescripcion } from "./dominio/planes";
import { esVideo } from "./dominio/ejercicios";

// Reemplaza la imagen o el vídeo roto por un aviso, en vez de dejar el hueco
// del icono roto del navegador. Vive fuera del componente porque no depende
// de su estado — solo manipula el DOM del elemento que falló.
function manejarErrorVisual(evento, ejercicio, clasesTamano) {
    console.error(
        `No se pudo cargar el ${esVideo(ejercicio) ? "vídeo" : "GIF"}:`,
        ejercicio.nombre,
        ejercicio.gifUrl
    );
    evento.currentTarget.replaceWith(
        Object.assign(document.createElement("div"), {
            className: `${clasesTamano} rounded-2xl bg-red-500/20 border border-red-400/40 flex items-center justify-center text-[9px] font-black text-red-200 text-center leading-tight`,
            textContent: "No disponible",
        })
    );
}

/**
 * Motor de un entrenamiento: pinta los bloques, guarda los checks y la
 * bitácora, y avisa al terminar.
 *
 * Vive aparte porque lo usan las dos clases de clienta —las del ciclo de
 * semanas y las esporádicas del catálogo—, que solo se diferencian en cómo
 * eligen la rutina, no en cómo la entrenan.
 */
export default function SesionEntrenamiento({ idSesion, bloques = [], onFinalizar, textoFinalizar = "Finalizar Entrenamiento", notasSemanaAnterior = {}, pesosSemanaAnterior = {} }) {
    // Estado inicial perezoso desde el móvil: instantáneo y sin esperar a la red.
    // El padre pasa key={idSesion}, así que al cambiar de día o de rutina React
    // remonta el componente y esto se vuelve a evaluar con la sesión correcta.
    const [checks, setChecks] = useState(() => leerLocal(idSesion).checks);
    const [notas, setNotas] = useState(() => leerLocal(idSesion).notas);
    const [pesos, setPesos] = useState(() => leerLocal(idSesion).pesos);
    const [estadoGuardado, setEstadoGuardado] = useState("");
    const [gifAmpliado, setGifAmpliado] = useState(null);

    const uid = auth.currentUser?.uid;
    const totalBloques = bloques.length;
    const completadosCount = contarCompletados(checks, totalBloques);

    // --- CARGA DESDE EL SERVIDOR ---
    useEffect(() => {
        if (!uid || !idSesion) return;
        let cancelado = false;
        const local = leerLocal(idSesion);

        getDoc(doc(db, "sesiones", idSesion))
            .then((snap) => {
                if (cancelado || !snap.exists()) return;
                const datos = snap.data();
                // Solo pisamos lo local si el servidor es más reciente: evita que
                // una copia cacheada borre lo apuntado estando sin señal.
                if (!servidorEsMasReciente(datos, local)) return;
                setChecks(datos.checks ?? {});
                setNotas(datos.notas ?? {});
                setPesos(datos.pesos ?? {});
            })
            .catch((error) => console.error("No se pudo cargar la sesión:", error));

        return () => { cancelado = true; };
    }, [uid, idSesion]);

    // Copia en el móvil en CADA pulsación: una recarga a media frase no pierde nada.
    const guardarEnMovil = useCallback(
        (nuevosChecks, nuevasNotas, nuevosPesos) =>
            guardarLocal(idSesion, { checks: nuevosChecks, notas: nuevasNotas, pesos: nuevosPesos }),
        [idSesion]
    );

    const guardarSesion = useCallback(async (nuevosChecks, nuevasNotas, nuevosPesos) => {
        if (!uid || !idSesion) return;
        const marca = guardarEnMovil(nuevosChecks, nuevasNotas, nuevosPesos);

        setEstadoGuardado("guardando");
        try {
            await setDoc(doc(db, "sesiones", idSesion), {
                clienteId: uid,
                checks: nuevosChecks,
                notas: nuevasNotas,
                pesos: nuevosPesos,
                actualizadoCliente: marca,
                actualizado: serverTimestamp(),
            }, { merge: true });
            setEstadoGuardado("guardado");
        } catch (error) {
            console.error("Error al guardar la sesión:", error);
            setEstadoGuardado("error");
        }
    }, [uid, idSesion, guardarEnMovil]);

    useEffect(() => {
        if (estadoGuardado !== "guardado") return;
        const t = setTimeout(() => setEstadoGuardado(""), 2000);
        return () => clearTimeout(t);
    }, [estadoGuardado]);

    const toggleCheck = (index) => {
        const siguiente = { ...checks, [index]: !checks[index] };
        setChecks(siguiente);
        guardarSesion(siguiente, notas, pesos);
    };

    const cambiarNota = (index, valor) => {
        const siguiente = { ...notas, [index]: valor };
        setNotas(siguiente);
        guardarEnMovil(checks, siguiente, pesos);
    };

    // Clave `bloque-ejercicio`, igual que `gifAmpliado`: un peso es por
    // ejercicio, no por bloque, porque un bloque puede ser una superserie.
    const cambiarPeso = (clave, valor) => {
        const siguiente = { ...pesos };
        if (valor === "") {
            delete siguiente[clave];
        } else {
            const numero = Number(valor);
            if (Number.isFinite(numero)) siguiente[clave] = numero;
        }
        setPesos(siguiente);
        guardarEnMovil(checks, notas, siguiente);
    };

    const finalizar = async () => {
        await guardarSesion(checks, notas, pesos); // que lo último escrito llegue

        // Nombres desnormalizados en el momento de cerrar: si la entrenadora
        // cambia la rutina después, el histórico de progreso no se ve afectado.
        const nombresEjercicios = {};
        bloques.forEach((bloque, i) => {
            (bloque.ejercicios ?? []).forEach((ej, j) => {
                nombresEjercicios[`${i}-${j}`] = ej.nombre;
            });
        });

        onFinalizar?.({
            completados: completadosCount,
            totalBloques,
            notas,
            pesos,
            nombresEjercicios,
            titulos: bloques.map(b => b.titulo ?? ""),
        });
    };

    return (
        <>
            <div className="flex justify-between items-center mb-6 bg-white/60 px-5 py-3 rounded-2xl border border-amatista-light/30">
                <p className="text-[10px] font-black text-amatista-dark/70 uppercase tracking-widest">
                    Progreso del día
                </p>
                <p className="text-2xl font-black text-amatista-dark leading-none">
                    {completadosCount} / {totalBloques}
                </p>
            </div>

            <div className="space-y-6">
                {bloques.map((bloque, index) => {
                    const isDone = !!checks[index];

                    return (
                        <div key={index} className={`transition-all duration-500 ${isDone ? 'opacity-40 grayscale scale-[0.97]' : ''}`}>
                            <div className="bg-amatista-dark p-7 rounded-[2.5rem] border border-white/10 shadow-2xl">
                                <h3 className="text-amatista-light font-black italic text-xl uppercase mb-4 tracking-tighter">
                                    {bloque.titulo}
                                </h3>

                                {/* Ejercicios con su GIF. Los planes antiguos no
                                    tienen este campo y siguen mostrando su texto. */}
                                {(bloque.ejercicios ?? []).length > 0 && (
                                    <div className="space-y-2 mb-5">
                                        {bloque.ejercicios.map((ej, j) => {
                                            const clave = `${index}-${j}`;
                                            const ampliado = gifAmpliado === clave;
                                            return (
                                                <div key={j} className="bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
                                                    <div className="flex items-center gap-3 p-3">
                                                        {ej.gifUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setGifAmpliado(ampliado ? null : clave)}
                                                                title="Ver el movimiento"
                                                                className="shrink-0 active:scale-90 transition-transform"
                                                            >
                                                                {esVideo(ej) ? (
                                                                    <video
                                                                        src={ej.gifUrl}
                                                                        className="w-14 h-14 rounded-2xl object-cover bg-white/10"
                                                                        autoPlay
                                                                        loop
                                                                        muted
                                                                        playsInline
                                                                        onError={(e) => manejarErrorVisual(e, ej, "w-14 h-14 rounded-2xl")}
                                                                    />
                                                                ) : (
                                                                    <img
                                                                        src={ej.gifUrl}
                                                                        alt={ej.nombre}
                                                                        loading="lazy"
                                                                        className="w-14 h-14 rounded-2xl object-cover bg-white/10"
                                                                        onError={(e) => manejarErrorVisual(e, ej, "w-14 h-14 rounded-2xl")}
                                                                    />
                                                                )}
                                                            </button>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-white font-black uppercase text-xs tracking-tight leading-tight">
                                                                {ej.nombre}
                                                            </p>
                                                            <p className="text-amatista-light text-[11px] font-bold mt-0.5">
                                                                {formatearPrescripcion(ej)}
                                                            </p>
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            {pesosSemanaAnterior[clave] != null && (
                                                                <p className="text-amatista-light/60 text-[9px] font-bold mb-0.5 whitespace-nowrap">
                                                                    Antes: {pesosSemanaAnterior[clave]}kg
                                                                </p>
                                                            )}
                                                            <label className="flex items-center gap-1 bg-black/30 rounded-xl px-2 py-1">
                                                                <input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    step="0.5"
                                                                    min="0"
                                                                    placeholder="kg"
                                                                    value={pesos[clave] ?? ""}
                                                                    onChange={(e) => cambiarPeso(clave, e.target.value)}
                                                                    onBlur={() => guardarSesion(checks, notas, pesos)}
                                                                    className="w-12 bg-transparent text-white text-sm font-bold text-right outline-none placeholder-white/20"
                                                                />
                                                                <span className="text-white/40 text-[9px] font-black uppercase">kg</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                    {ampliado && ej.gifUrl && (esVideo(ej) ? (
                                                        <video
                                                            src={ej.gifUrl}
                                                            className="w-full object-contain bg-black/30 max-h-72"
                                                            autoPlay
                                                            loop
                                                            muted
                                                            playsInline
                                                            controls
                                                            onError={(e) => manejarErrorVisual(e, ej, "w-full max-h-72")}
                                                        />
                                                    ) : (
                                                        <img
                                                            src={ej.gifUrl}
                                                            alt={ej.nombre}
                                                            className="w-full object-contain bg-black/30 max-h-72"
                                                            onError={(e) => manejarErrorVisual(e, ej, "w-full max-h-72")}
                                                        />
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {bloque.contenido && (
                                    <div className="text-white/90 text-sm whitespace-pre-line mb-6 leading-relaxed font-medium">
                                        {bloque.contenido}
                                    </div>
                                )}

                                <div className="bg-black/20 p-4 rounded-3xl border border-white/5 mb-5">
                                    <p className="text-[9px] font-black text-white/40 uppercase mb-2 tracking-widest">Bitácora de Cargas</p>
                                    {notasSemanaAnterior[index]?.trim() && (
                                        <p className="text-amatista-light/70 text-[11px] font-bold mb-2">
                                            Semana pasada: {notasSemanaAnterior[index]}
                                        </p>
                                    )}
                                    <textarea
                                        placeholder="Anota tus pesos aquí..."
                                        className="w-full bg-transparent border-none text-white text-sm focus:ring-0 p-0 resize-none placeholder-white/20"
                                        rows="2"
                                        value={notas[index] ?? ""}
                                        onChange={(e) => cambiarNota(index, e.target.value)}
                                        onBlur={() => guardarSesion(checks, notas, pesos)}
                                    />
                                </div>

                                <button
                                    onClick={() => toggleCheck(index)}
                                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isDone
                                        ? 'bg-amatista text-amatista-dark'
                                        : 'bg-white/10 text-white border border-white/20'
                                        }`}
                                >
                                    {isDone ? '✓ Bloque Completado' : 'Marcar como hecho'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Timer />

            {estadoGuardado && (
                <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-50 ${estadoGuardado === "error"
                    ? "bg-red-500 text-white"
                    : "bg-white text-amatista-dark border border-amatista-light"
                    }`}>
                    {estadoGuardado === "guardando" && "Guardando..."}
                    {estadoGuardado === "guardado" && "✓ Guardado"}
                    {estadoGuardado === "error" && "Sin conexión · guardado en el móvil"}
                </div>
            )}

            <button
                onClick={finalizar}
                className="fixed bottom-6 left-6 right-6 bg-amatista-dark text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all z-50 border border-white/10"
            >
                {textoFinalizar}
            </button>
        </>
    );
}
