import { useState } from "react";
import { db, firebaseConfig } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
// Importaciones necesarias para la instancia secundaria
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { Tarjeta, Campo, Entrada, Seleccion, BotonPrincipal } from "./ui";

// Inicializamos una "App secundaria" solo para registros, reutilizando la
// configuración real. getApps() evita el error de doble inicialización que
// provoca el hot reload de Vite en desarrollo.
const secondaryApp = getApps().some((a) => a.name === "Secondary")
    ? getApp("Secondary")
    : initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

/** Formulario de alta de una clienta nueva. Ver el listado y editarlas vive en Clientas.jsx. */
export default function CrearCliente() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nombre, setNombre] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [seguimientoCiclo, setSeguimientoCiclo] = useState(false);
    const [tipo, setTipo] = useState("ciclo");

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

            setMensaje("¡Cliente registrado con éxito! Búscala en la pestaña Clientas.");
            setEmail("");
            setPassword("");
            setNombre("");
            setSeguimientoCiclo(false);
            setTipo("ciclo");

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
        </div>
    );
}
