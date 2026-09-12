import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, query, where, getDocs, orderBy, addDoc, doc, getDoc } from "firebase/firestore";
import SesionEntrenamiento from "./SesionEntrenamiento";
import TarjetaCiclo from "./TarjetaCiclo";
import { Cargando, Celebracion } from "./ui";
import { idSesionCiclo } from "./dominio/sesion";
import { mensajeDelDia, mensajeDeSemana, semanaCompletada } from "./dominio/mensajes";
import { SEMANAS, DIAS, etiquetaSemanaCorta, enfoqueDeSemana, semanaAnterior } from "./constantes";

// Traduce el fallo de Firestore a algo accionable. `failed-precondition` es
// casi siempre un índice compuesto sin desplegar, que en desarrollo funciona
// y en producción no: el caso más fácil de dejar escapar.
const mensajeDeError = (error) => {
    const codigo = error?.code ?? "";
    if (codigo === "failed-precondition") {
        return "La app necesita un índice que aún no está desplegado. Avisa a tu entrenadora.";
    }
    if (codigo === "permission-denied") {
        return "Tu cuenta no tiene permiso para ver estas rutinas. Avisa a tu entrenadora.";
    }
    if (codigo === "unavailable" || /blocked|network/i.test(error?.message ?? "")) {
        return "No hay conexión, o el navegador la está bloqueando. Revisa tus datos o desactiva el AdBlock.";
    }
    return "No pudimos cargar tus rutinas. Vuelve a intentarlo en un momento.";
};

/** Vista de una clienta del ciclo: semanas y días fijos. */
export default function VistaCliente() {
    const [planes, setPlanes] = useState([]);
    const [semanaActual, setSemanaActual] = useState(1);
    const [diaActual, setDiaActual] = useState(1);
    const [loading, setLoading] = useState(true);
    const [errorCarga, setErrorCarga] = useState("");
    const [celebracion, setCelebracion] = useState(null);
    const [notasSemanaAnterior, setNotasSemanaAnterior] = useState({});
    const [pesosSemanaAnterior, setPesosSemanaAnterior] = useState({});

    const uid = auth.currentUser?.uid;

    useEffect(() => {
        const obtenerPlanes = async () => {
            if (!auth.currentUser) {
                setLoading(false);
                return;
            }

            try {
                const querySnapshot = await getDocs(query(
                    collection(db, "planes_mensuales"),
                    where("clienteId", "==", auth.currentUser.uid),
                    orderBy("fechaCreacion", "desc")
                ));

                if (!querySnapshot.empty) {
                    const planesData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setPlanes(planesData);

                    // Abrimos en la primera semana que tenga plan. Si no, quien
                    // esté empezando por la Adaptación entraría en la Semana 1 y
                    // se encontraría con un hueco vacío.
                    const semanasConPlan = planesData.map(p => p.semana).filter(n => SEMANAS.includes(n));
                    if (semanasConPlan.length > 0) setSemanaActual(Math.min(...semanasConPlan));
                }
            } catch (error) {
                console.error("Error detallado de Firestore:", error);
                // Antes esto solo se registraba en consola, así que un índice
                // ausente o un permiso denegado se veían igual que "tu
                // entrenadora todavía no te asignó nada".
                setErrorCarga(mensajeDeError(error));
            } finally {
                setLoading(false);
            }
        };

        obtenerPlanes();
    }, []);

    // Progresión: al abrir un día se trae lo que anotó en ese mismo día la
    // semana justo anterior, para que sepa qué peso intentar superar. Falla
    // en silencio (la Adaptación no tiene semana previa, o puede que nunca
    // haya entrenado ese día) porque es un recordatorio, no algo bloqueante.
    useEffect(() => {
        let vivo = true;
        const anterior = semanaAnterior(semanaActual);
        if (anterior === null || !uid) {
            setNotasSemanaAnterior({});
            setPesosSemanaAnterior({});
            return;
        }
        getDoc(doc(db, "sesiones", idSesionCiclo(uid, anterior, diaActual)))
            .then((snap) => {
                if (!vivo) return;
                setNotasSemanaAnterior(snap.exists() ? (snap.data().notas ?? {}) : {});
                setPesosSemanaAnterior(snap.exists() ? (snap.data().pesos ?? {}) : {});
            })
            .catch(() => { if (vivo) { setNotasSemanaAnterior({}); setPesosSemanaAnterior({}); } });
        return () => { vivo = false; };
    }, [uid, semanaActual, diaActual]);

    const rutinaSeleccionada = planes.find(
        (p) => p.semana === parseInt(semanaActual) && p.dia === parseInt(diaActual)
    );

    const finalizar = async ({ completados, totalBloques, notas, pesos, titulos }) => {
        try {
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            const nombreReal = userDoc.exists() ? userDoc.data().name : auth.currentUser.email;

            await addDoc(collection(db, "registros_entrenamiento"), {
                clienteId: auth.currentUser.uid,
                clienteNombre: nombreReal,
                semana: semanaActual,
                dia: diaActual,
                // El nombre del día ("Glúteos y Pierna") es lo que distingue el
                // "SET #1" de hoy del "SET #1" de otro día al agrupar el progreso.
                nombreDia: rutinaSeleccionada?.nombreDia ?? "",
                completados,
                totalBloques,
                notas,
                pesos,
                titulos,
                fecha: new Date(),
            });

            // ¿Ha cerrado ya la semana entera? Se mira sobre los días distintos
            // registrados, para que repetir un día no la dé por completa.
            let cerroSemana = false;
            try {
                const snap = await getDocs(query(
                    collection(db, "registros_entrenamiento"),
                    where("clienteId", "==", auth.currentUser.uid)
                ));
                const diasDeEstaSemana = snap.docs
                    .map(d => d.data())
                    .filter(r => r.semana === semanaActual)
                    .map(r => r.dia);
                cerroSemana = semanaCompletada(diasDeEstaSemana);
            } catch (error) {
                // Si falla la consulta seguimos: se muestra el mensaje del día.
                console.error("No se pudo comprobar la semana:", error);
            }

            setCelebracion(cerroSemana
                ? { destacado: true, titulo: "¡Semana completa!", mensaje: mensajeDeSemana(semanaActual) }
                : { destacado: false, titulo: "¡Entrenamiento guardado!", mensaje: mensajeDelDia(semanaActual, diaActual) });
        } catch (error) {
            console.error("Error al finalizar:", error);
            alert("Error al guardar el progreso");
        }
    };

    if (loading) return <Cargando texto="Cargando tu rutina..." />;

    return (
        <div className="text-amatista-dark pb-40">
            <TarjetaCiclo />

            {/* Selectores de Semana */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
                {SEMANAS.map((s) => (
                    <button
                        key={s}
                        onClick={() => setSemanaActual(s)}
                        className={`px-6 py-3 rounded-2xl font-black text-[10px] transition-all border shrink-0 uppercase tracking-widest ${semanaActual === s
                            ? "bg-amatista-dark border-amatista-dark text-white shadow-lg"
                            : "bg-white/80 border-amatista-light text-amatista-dark/70"
                            }`}
                    >
                        {etiquetaSemanaCorta(s)}
                    </button>
                ))}
            </div>

            {/* Selectores de Día */}
            <div className="flex justify-between gap-2 mb-8">
                {DIAS.map((d) => (
                    <button
                        key={d}
                        onClick={() => setDiaActual(d)}
                        className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all border ${diaActual === d
                            ? "bg-amatista-dark text-white border-amatista-dark shadow-md"
                            : "bg-white/60 text-amatista-dark border-amatista-light"
                            }`}
                    >
                        D{d}
                    </button>
                ))}
            </div>

            {rutinaSeleccionada ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-8">
                        <h2 className="text-amatista-dark font-black italic text-4xl uppercase leading-none tracking-tighter">
                            {rutinaSeleccionada.nombreDia || `DÍA ${diaActual}`}
                        </h2>
                        <p className="text-amatista-dark/70 text-[10px] font-bold mt-2 uppercase tracking-[0.3em]">
                            {enfoqueDeSemana(semanaActual)}
                        </p>
                    </div>

                    <SesionEntrenamiento
                        key={idSesionCiclo(uid, semanaActual, diaActual)}
                        idSesion={idSesionCiclo(uid, semanaActual, diaActual)}
                        bloques={rutinaSeleccionada.bloques ?? []}
                        onFinalizar={finalizar}
                        notasSemanaAnterior={notasSemanaAnterior}
                        pesosSemanaAnterior={pesosSemanaAnterior}
                    />
                </div>
            ) : errorCarga ? (
                <div className="text-center py-16 px-6 border-2 border-red-300 rounded-[3rem] bg-red-50">
                    <p className="text-red-700 font-black uppercase text-[10px] tracking-widest mb-3">
                        No se pudieron cargar tus rutinas
                    </p>
                    <p className="text-red-800/80 text-sm font-medium leading-snug mb-5">{errorCarga}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-red-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                        Reintentar
                    </button>
                </div>
            ) : (
                <div className="text-center py-20 px-6 text-amatista-dark/40 font-bold italic border-2 border-dashed border-amatista-light rounded-[3rem] bg-white/30">
                    Tu entrenadora aún no ha asignado <br /> una rutina para este día.
                </div>
            )}

            {celebracion && (
                <Celebracion
                    titulo={celebracion.titulo}
                    mensaje={celebracion.mensaje}
                    destacado={celebracion.destacado}
                    onCerrar={() => setCelebracion(null)}
                />
            )}
        </div>
    );
}
