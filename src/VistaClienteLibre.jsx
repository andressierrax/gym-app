import { useState, useEffect, useCallback } from "react";
import { db, auth } from "./firebase";
import { collection, query, where, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import SesionEntrenamiento from "./SesionEntrenamiento";
import TarjetaCiclo from "./TarjetaCiclo";
import { Cargando, Vacio, Celebracion } from "./ui";
import { idSesionLibre, fechaISOLocal } from "./dominio/sesion";
import { mensajeDelDia } from "./dominio/mensajes";

/**
 * Vista de una clienta esporádica: un catálogo de rutinas con nombre, sin
 * semanas ni días. Elige la que va a hacer el día que aparece por el gimnasio.
 */
export default function VistaClienteLibre() {
    const [rutinas, setRutinas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [elegida, setElegida] = useState(null);
    const [celebracion, setCelebracion] = useState(null);

    const uid = auth.currentUser?.uid;

    const leerRutinas = useCallback(async () => {
        if (!uid) return [];
        try {
            const snap = await getDocs(query(
                collection(db, "rutinas_libres"),
                where("clienteId", "==", uid)
            ));
            // Ordenamos aquí y no en la consulta: así no hace falta un índice
            // compuesto solo para esto.
            return snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? ""));
        } catch (error) {
            console.error("No se pudieron cargar las rutinas:", error);
            return [];
        }
    }, [uid]);

    useEffect(() => {
        let vivo = true;
        leerRutinas().then(r => {
            if (!vivo) return;
            setRutinas(r);
            setCargando(false);
        });
        return () => { vivo = false; };
    }, [leerRutinas]);

    const finalizar = async ({ completados, totalBloques, notas, pesos, reps, etiquetasPeso, titulos }) => {
        try {
            // `displayName` está vacío en estas cuentas: el nombre real vive en
            // el perfil, y sin esto el Monitor mostraría el correo.
            const perfil = await getDoc(doc(db, "users", uid));
            const nombreReal = perfil.exists() ? perfil.data().name : auth.currentUser?.email ?? "";

            await addDoc(collection(db, "registros_entrenamiento"), {
                clienteId: uid,
                clienteNombre: nombreReal,
                // Las esporádicas no tienen semana ni día, pero el Monitor los
                // espera como enteros: 0 significa "fuera del ciclo".
                semana: 0,
                dia: 0,
                rutinaNombre: elegida?.nombre ?? "",
                completados,
                totalBloques,
                notas,
                pesos,
                reps,
                etiquetasPeso,
                titulos,
                fecha: new Date(),
            });
            setCelebracion(mensajeDelDia(0, rutinas.indexOf(elegida) + 1));
        } catch (error) {
            console.error("Error al finalizar:", error);
            alert("Error al guardar el progreso");
        }
    };

    if (cargando) return <Cargando texto="Cargando tus rutinas..." />;

    // --- Entrenando una rutina concreta ---
    if (elegida) {
        return (
            <div className="text-amatista-dark pb-40">
                <button
                    onClick={() => setElegida(null)}
                    className="mb-4 text-[10px] font-black uppercase tracking-widest text-amatista-dark/60 bg-white/60 px-4 py-2 rounded-2xl border border-amatista-light/30 active:scale-95 transition-all"
                >
                    ← Mis rutinas
                </button>

                <h2 className="text-amatista-dark font-black italic text-3xl uppercase leading-none tracking-tighter mb-6">
                    {elegida.nombre}
                </h2>

                <SesionEntrenamiento
                    key={idSesionLibre(uid, elegida.id, fechaISOLocal())}
                    idSesion={idSesionLibre(uid, elegida.id, fechaISOLocal())}
                    bloques={elegida.bloques ?? []}
                    onFinalizar={finalizar}
                />

                {celebracion && (
                    <Celebracion
                        titulo="¡Entrenamiento guardado!"
                        mensaje={celebracion}
                        onCerrar={() => { setCelebracion(null); setElegida(null); }}
                    />
                )}
            </div>
        );
    }

    // --- Catálogo ---
    return (
        <div className="text-amatista-dark pb-20 animate-in fade-in duration-500">
            <TarjetaCiclo />

            <h2 className="text-amatista-dark font-black italic text-3xl uppercase leading-none tracking-tighter mb-1">
                Mis rutinas
            </h2>
            <p className="text-amatista-dark/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
                Elige la que vas a hacer hoy
            </p>

            {rutinas.length === 0 ? (
                <Vacio>Tu entrenadora aún no te ha asignado <br /> ninguna rutina.</Vacio>
            ) : (
                <div className="grid gap-3">
                    {rutinas.map(r => (
                        <button
                            key={r.id}
                            onClick={() => setElegida(r)}
                            className="w-full text-left bg-amatista-dark p-6 rounded-[2.5rem] border border-white/10 shadow-xl active:scale-[0.98] transition-all"
                        >
                            <p className="text-white font-black italic uppercase text-xl leading-none tracking-tighter mb-2">
                                {r.nombre}
                            </p>
                            <p className="text-amatista-light text-[10px] font-black uppercase tracking-widest">
                                {r.bloques?.length ?? 0} set{(r.bloques?.length ?? 0) === 1 ? "" : "s"}
                            </p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
