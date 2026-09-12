import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import GraficoProgreso from "./GraficoProgreso";
import { Cargando, Vacio, TituloSeccion } from "./ui";
import { pesosPorEjercicio, ejerciciosConProgreso } from "./dominio/progreso";

/**
 * Progreso de peso por ejercicio, para que la clienta vea cómo va subiendo
 * sin tener que hojear entrenamiento por entrenamiento. Sirve igual para
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

    const porEjercicio = pesosPorEjercicio(registros);
    const ejercicios = ejerciciosConProgreso(registros);

    return (
        <div className="text-amatista-dark pb-24 animate-in fade-in duration-500">
            <TituloSeccion titulo="Mi Progreso" subtitulo="Peso registrado por ejercicio" />

            {ejercicios.length === 0 ? (
                <Vacio>
                    Todavía no has anotado ningún peso. <br />
                    Regístralo al terminar un ejercicio y aquí verás tu avance.
                </Vacio>
            ) : (
                <div className="grid gap-4">
                    {ejercicios.map(nombre => (
                        <GraficoProgreso key={nombre} ejercicio={nombre} puntos={porEjercicio[nombre]} />
                    ))}
                </div>
            )}
        </div>
    );
}
