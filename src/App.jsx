import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { useAuth } from "./contexto-auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import Login from "./Login";
import { esEsporadica } from "./dominio/clientes";
import { Cargando } from "./ui";

// Cada pantalla se descarga solo cuando se entra en ella. Las clientas, que son
// la mayoría, nunca llegan a bajar el panel de la entrenadora; y la primera
// carga deja de arrastrar las seis pantallas de golpe.
const CrearCliente = lazy(() => import("./CrearCliente"));
const Clientas = lazy(() => import("./Clientas"));
const AdminEjercicios = lazy(() => import("./AdminEjercicios"));
const CreadorRutinas = lazy(() => import("./CreadorRutinas"));
const VistaCliente = lazy(() => import("./VistaCliente"));
const VistaClienteLibre = lazy(() => import("./VistaClienteLibre"));
const Seguimiento = lazy(() => import("./Seguimiento"));
const MiProgreso = lazy(() => import("./MiProgreso"));

// Cada pestaña es ahora una URL propia. Antes vivían en useState, así que el
// botón "atrás" del móvil cerraba la app en vez de volver a la pestaña previa.
const TABS_ENTRENADORA = [
    { to: "/clientas", label: "Clientas" },
    { to: "/crear-cliente", label: "Crear Cliente" },
    { to: "/biblioteca", label: "Biblioteca" },
    { to: "/rutinas", label: "Rutinas" },
    { to: "/monitor", label: "Monitor" },
];

const TABS_CLIENTA = [
    { to: "/mi-rutina", label: "Mi Rutina" },
    { to: "/ejercicios", label: "Ejercicios" },
    { to: "/progreso", label: "Progreso" },
];

const claseTab = (activa, extra = "") =>
    `flex-1 py-3 rounded-2xl font-black uppercase transition-all ${extra} ${activa ? "bg-white text-amatista-dark shadow-md" : "text-white/50 hover:text-white"
    }`;

function BotonSalir() {
    return (
        <button
            onClick={() => auth.signOut()}
            className="text-amatista-dark font-black text-[10px] uppercase tracking-widest bg-white/50 px-4 py-2 rounded-2xl border border-amatista-dark/10 shadow-sm active:scale-95 transition-all"
        >
            Salir
        </button>
    );
}

function Cabecera({ subtitulo }) {
    return (
        <header className="flex justify-between items-center mb-8 pt-4">
            <div>
                <h1 className="text-3xl font-black italic text-amatista-dark leading-none uppercase tracking-tighter">Trinity Fit</h1>
                <p className="text-amatista-dark/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{subtitulo}</p>
            </div>
            <BotonSalir />
        </header>
    );
}

function App() {
    const { user, role, loading } = useAuth();
    const [nombreCliente, setNombreCliente] = useState("");
    const [perfil, setPerfil] = useState(null);

    useEffect(() => {
        const obtenerDatosUsuario = async () => {
            if (user && role === "client") {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setNombreCliente(docSnap.data().name);
                    setPerfil(docSnap.data());
                }
            }
        };
        obtenerDatosUsuario();
    }, [user, role]);

    if (loading) return (
        <div className="min-h-screen bg-purple-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-amatista-dark border-r-transparent"></div>
        </div>
    );

    if (!user) return <Login />;

    // --- VISTA ENTRENADORA ---
    if (role === "trainer") {
        return (
            <div className="min-h-screen bg-purple-100 p-4 pb-20">
                <Cabecera subtitulo="Coach Panel" />

                <nav className="flex gap-1 mb-8 bg-amatista-dark p-1.5 rounded-[2rem] shadow-xl border border-white/10 overflow-x-auto">
                    {TABS_ENTRENADORA.map(({ to, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => claseTab(isActive, "min-w-[80px] text-[9px] tracking-tighter text-center")}
                        >
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <main>
                    <Suspense fallback={<Cargando />}>
                        <Routes>
                            <Route path="/clientas" element={<Clientas />} />
                            <Route path="/crear-cliente" element={<CrearCliente />} />
                            <Route path="/biblioteca" element={<AdminEjercicios />} />
                            <Route path="/rutinas" element={<CreadorRutinas />} />
                            <Route path="/monitor" element={<Seguimiento />} />
                            {/* Cualquier otra URL (incluida "/") cae en la primera pestaña. */}
                            <Route path="*" element={<Navigate to="/clientas" replace />} />
                        </Routes>
                    </Suspense>
                </main>
            </div>
        );
    }

    // --- VISTA CLIENTE ---
    return (
        <div className="bg-purple-100 min-h-screen p-4 pb-24">
            <Cabecera subtitulo={`Hola, ${nombreCliente || "Atleta"} ✨`} />

            <nav className="flex gap-1 mb-8 bg-amatista-dark p-1.5 rounded-[2rem] shadow-xl border border-white/10 max-w-sm mx-auto">
                {TABS_CLIENTA.map(({ to, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => claseTab(isActive, "text-[10px] tracking-widest text-center")}
                    >
                        {label}
                    </NavLink>
                ))}
            </nav>

            <main>
                <Suspense fallback={<Cargando />}>
                    <Routes>
                        {/* Las esporádicas no tienen semanas ni días: eligen
                            de un catálogo de rutinas con nombre. */}
                        <Route path="/mi-rutina" element={esEsporadica(perfil) ? <VistaClienteLibre /> : <VistaCliente />} />
                        {/* La clienta ve la biblioteca en modo consulta. */}
                        <Route path="/ejercicios" element={<AdminEjercicios soloLectura={true} />} />
                        <Route path="/progreso" element={<MiProgreso />} />
                        <Route path="*" element={<Navigate to="/mi-rutina" replace />} />
                    </Routes>
                </Suspense>
            </main>
        </div>
    );
}

export default App;
