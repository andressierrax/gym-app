import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ordenarMesociclos } from "./dominio/mesociclos";

// La consulta lleva el where por clienteId: las reglas solo dejan a la
// clienta leer los suyos, y sin el filtro Firestore rechaza la consulta entera.
async function leerMesociclos(clienteId) {
    if (!clienteId) return [];
    try {
        const snap = await getDocs(query(collection(db, "mesociclos"), where("clienteId", "==", clienteId)));
        return ordenarMesociclos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
        console.error("No se pudieron cargar los mesociclos:", error);
        return [];
    }
}

/** Mesociclos de una clienta, el más reciente primero, y una función para recargarlos. */
export default function useMesociclos(clienteId) {
    const [lista, setLista] = useState([]);
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
        let vivo = true;
        leerMesociclos(clienteId).then(l => { if (vivo) setLista(l); });
        return () => { vivo = false; };
    }, [clienteId, recarga]);

    return [lista, () => setRecarga(n => n + 1)];
}
