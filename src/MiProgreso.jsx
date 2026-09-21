import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import GraficoProgreso from "./GraficoProgreso";
import TarjetaResumen from "./TarjetaResumen";
import { resumirRegistros } from "./dominio/resumen";
import { Cargando, Vacio, TituloSeccion } from "./ui";
import { pesosPorEjercicio, repsPorEjercicio, pesosLivPorEjercicio, repsLivPorEjercicio } from "./dominio/progreso";

/**
 * Progreso de peso por set, para que la clienta vea cómo va subiendo sin
 * tener que hojear entrenamiento por entrenamiento. Sirve igual para
 * clientas de ciclo y esporádicas: se agrupa por fecha del registro, no por
 * semana/día, que las esporádicas no tienen.
 */
export default function MiProgreso() {
    const [registros, setRegistros] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let vivo = true;

        const cargar = async () => {
            const uid = auth.currentUser?.uid;
            if (!uid) return;
            try {
                const snap = await getDocs(query(collection(db, "registros_entrenamiento"), where("clienteId", "==", uid)));
                if (vivo) setRegistros(snap.docs.map(d => d.data()));
            } catch (error) {
                console.error("No se pudo cargar el progreso:", error);
            } finally {
                if (vivo) setCargando(false);
            }
        };

        cargar();
        return () => { vivo = false; };
    }, []);

    if (cargando) return <Cargando texto="Cargando tu progreso..." />;

    // Carga pesada y liviana de cada ejercicio comparten gráfico, en dos líneas.
    const seriesDe = (pesada, liviana, campo, unidad) => {
        const etiquetas = [...new Set([...Object.keys(pesada), ...Object.keys(liviana)])]
            .sort((x, y) => x.localeCompare(y));
        return etiquetas.map(nombre => ({
            nombre,
            series: [
                { puntos: pesada[nombre], campo, unidad, carga: "pesada" },
                { puntos: liviana[nombre], campo, unidad, carga: "liviana" },
            ],
        }));
    };
    const graficosPeso = seriesDe(pesosPorEjercicio(registros), pesosLivPorEjercicio(registros), "peso", "kg");
    const graficosReps = seriesDe(repsPorEjercicio(registros), repsLivPorEjercicio(registros), "reps", " rep");

    return (
        <div className="text-amatista-dark pb-24 animate-in fade-in duration-500">
            <TituloSeccion titulo="Mi Progreso" subtitulo="Peso y repeticiones por set" />

            <TarjetaResumen resumen={resumirRegistros(registros)} paraClienta />

            {graficosPeso.length === 0 && graficosReps.length === 0 ? (
                <Vacio>
                    Todavía no has anotado ningún peso ni repeticiones. <br />
                    Regístralos al terminar un set y aquí verás tu avance.
                </Vacio>
            ) : (
                <>
                    {graficosPeso.length > 0 && (
                        <div className="grid gap-4 mb-6">
                            {graficosPeso.map(g => (
                                <GraficoProgreso key={g.nombre} titulo={g.nombre} series={g.series} />
                            ))}
                        </div>
                    )}

                    {graficosReps.length > 0 && (
                        <>
                            <p className="text-[10px] font-black text-amatista-dark/60 uppercase tracking-widest mb-3">
                                Repeticiones por set
                            </p>
                            <div className="grid gap-4">
                                {graficosReps.map(g => (
                                    <GraficoProgreso key={g.nombre} titulo={g.nombre} series={g.series} />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
