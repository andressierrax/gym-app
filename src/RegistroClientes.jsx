import { useState, useEffect, useCallback } from "react";
import { db, firebaseConfig } from "./firebase";
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
// Importaciones necesarias para la instancia secundaria
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { Tarjeta, Campo, Entrada, Seleccion, BotonPrincipal, TituloSeccion } from "./ui";
import { tipoDeCliente, etiquetaTipo } from "./dominio/clientes";

// Inicializamos una "App secundaria" solo para registros, reutilizando la
// configuración real. getApps() evita el error de doble inicialización que
// provoca el hot reload de Vite en desarrollo.
const secondaryApp = getApps().some((a) => a.name === "Secondary")
    ? getApp("Secondary")
    : initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

export default function RegistroClientes() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nombre, setNombre] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [seguimientoCiclo, setSeguimientoCiclo] = useState(false);
    const [tipo, setTipo] = useState("ciclo");
    const [clientas, setClientas] = useState([]);
    const [guardandoCiclo, setGuardandoCiclo] = useState("");

    const leerClientas = useCallback(async () => {
        try {
            const snap = await getDocs(query(collection(db, "users"), where("role", "==", "client")));
            return snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        } catch (error) {
            console.error("No se pudieron cargar las clientas:", error);
            return [];
        }
    }, []);

    useEffect(() => {
        let vivo = true;
        leerClientas().then(c => { if (vivo) setClientas(c); });
        return () => { vivo = false; };
    }, [leerClientas]);

    const cambiarTipo = async (cliente, nuevo) => {
        setGuardandoCiclo(cliente.id);
        try {
            await updateDoc(doc(db, "users", cliente.id), { tipo: nuevo });
            setClientas(prev => prev.map(c => c.id === cliente.id ? { ...c, tipo: nuevo } : c));
        } catch (error) {
            console.error("No se pudo cambiar el tipo:", error);
            alert("No se pudo cambiar el tipo: " + error.message);
        }
        setGuardandoCiclo("");
    };

    // El interruptor lo maneja la entrenadora. La clienta solo podrá registrar
    // sus fechas, y en otra colección: sobre su perfil no escribe nada.
    const alternarCiclo = async (cliente) => {
        const activar = !cliente.seguimientoCiclo;
        setGuardandoCiclo(cliente.id);
        try {
            await updateDoc(doc(db, "users", cliente.id), { seguimientoCiclo: activar });
            setClientas(prev => prev.map(c => c.id === cliente.id ? { ...c, seguimientoCiclo: activar } : c));
        } catch (error) {
            console.error("No se pudo cambiar el seguimiento:", error);
            alert("No se pudo cambiar el seguimiento: " + error.message);
        }
        setGuardandoCiclo("");
    };

    const registrarCliente = async (e) => {
        e.preventDefault();
        setMensaje("Registrando cliente...");

        try {
            // 1. Creamos el usuario usando la instancia SECONDARY
            // Esto evita que Firebase cierre la sesión de la entrenadora en la instancia principal
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const newClient = userCredential.user;

            // 2. Guardamos en Firestore (usamos la db principal, no hay problema)
            await setDoc(doc(db, "users", newClient.uid), {
                name: nombre,
                email: email,
                role: "client",
                seguimientoCiclo: seguimientoCiclo,
                tipo: tipo,
                createdAt: new Date(),
            });

            // 3. ¡MUY IMPORTANTE! Cerramos la sesión en la instancia secundaria 
            // para que el navegador no guarde rastro del nuevo cliente
            await signOut(secondaryAuth);

            setMensaje("¡Cliente registrado con éxito!");
            setEmail("");
            setPassword("");
            setNombre("");
            setSeguimientoCiclo(false);
            setTipo("ciclo");
            setClientas(await leerClientas());

        } catch (error) {
            console.error("Error al registrar:", error);
            setMensaje("Error: " + error.message);
        }
    };

    return (
        // El fondo, el alto mínimo y el padding los pone App: repetirlos aquí
        // creaba una página anidada del doble de alto que la pantalla.
        <div className="max-w-md mx-auto">
            <Tarjeta>
                <h2 className="text-2xl font-black text-white uppercase italic mb-6">Nuevo Cliente</h2>

                <form onSubmit={registrarCliente} className="space-y-4">
                    <Campo etiqueta="Nombre Completo">
                        <Entrada
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                        />
                    </Campo>

                    <Campo etiqueta="Correo Electrónico">
                        <Entrada
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </Campo>

                    <Campo etiqueta="Contraseña Temporal">
                        <Entrada
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </Campo>

                    <Campo etiqueta="Cómo entrena">
                        <Seleccion value={tipo} onChange={(e) => setTipo(e.target.value)}>
                            <option value="ciclo">Por ciclo — semanas y días fijos</option>
                            <option value="esporadica">Esporádica — catálogo de rutinas sin calendario</option>
                        </Seleccion>
                    </Campo>

                    {/* El interruptor del punto 4. Se pregunta, no se deduce
                        del nombre ni del sexo: hay clientas a las que no aplica
                        y clientes hombres a los que nunca aplica. */}
                    <label className="flex items-start gap-3 bg-white/10 p-4 rounded-2xl cursor-pointer">
                        <input
                            type="checkbox"
                            checked={seguimientoCiclo}
                            onChange={(e) => setSeguimientoCiclo(e.target.checked)}
                            className="mt-0.5 w-5 h-5 shrink-0 accent-amatista-light"
                        />
                        <span>
                            <span className="block text-white text-[11px] font-black uppercase tracking-widest">
                                Seguimiento de ciclo menstrual
                            </span>
                            <span className="block text-white/50 text-[11px] font-medium leading-snug mt-1">
                                Informativo. Podrá registrar su fecha y ver en qué fase está. Se puede cambiar después.
                            </span>
                        </span>
                    </label>

                    <BotonPrincipal type="submit" className="mt-4">
                        Crear Cuenta
                    </BotonPrincipal>

                    {mensaje && (
                        <p className="text-center text-[10px] font-black text-amatista-light uppercase tracking-widest mt-4 bg-white/10 py-3 rounded-xl">
                            {mensaje}
                        </p>
                    )}
                </form>
            </Tarjeta>

            {/* Hasta ahora no había forma de ver ni de tocar las clientas ya
                registradas: sin esto, el interruptor solo valdría para las nuevas. */}
            {clientas.length > 0 && (
                <div className="mt-10">
                    <TituloSeccion titulo="Clientas" subtitulo={`${clientas.length} registrada(s)`} />
                    <div className="grid gap-2">
                        {clientas.map(c => (
                            <div key={c.id} className="bg-white p-4 rounded-[2rem] border border-amatista-light/30 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-10 w-10 shrink-0 bg-amatista-dark rounded-2xl flex items-center justify-center text-white font-black italic">
                                        {c.name?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-amatista-dark uppercase text-sm leading-tight truncate">
                                            {c.name || "Sin nombre"}
                                        </p>
                                        <p className="text-amatista-dark/40 text-[11px] font-medium truncate">{c.email}</p>
                                    </div>
                                </div>
                                <Seleccion
                                    value={tipoDeCliente(c)}
                                    onChange={(e) => cambiarTipo(c, e.target.value)}
                                    disabled={guardandoCiclo === c.id}
                                    className="text-[11px] mb-2 p-3 border border-amatista-light/40"
                                >
                                    <option value="ciclo">{etiquetaTipo("ciclo")} — semanas y días</option>
                                    <option value="esporadica">{etiquetaTipo("esporadica")} — catálogo</option>
                                </Seleccion>

                                <button
                                    onClick={() => alternarCiclo(c)}
                                    disabled={guardandoCiclo === c.id}
                                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border transition-all active:scale-[0.98] disabled:opacity-50 ${c.seguimientoCiclo
                                        ? "bg-amatista-light/40 border-amatista-light"
                                        : "bg-purple-50 border-amatista-light/30"
                                        }`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amatista-dark text-left">
                                        Ciclo menstrual
                                    </span>
                                    <span className={`shrink-0 w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${c.seguimientoCiclo ? "bg-amatista-dark justify-end" : "bg-amatista-dark/20 justify-start"
                                        }`}>
                                        <span className="w-5 h-5 rounded-full bg-white shadow" />
                                    </span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}