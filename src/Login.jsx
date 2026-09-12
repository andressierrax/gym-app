import { useState } from "react";
import { auth } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import logo from "./logo-login.jpg"; // versión reducida: se muestra a ~136 px

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            // El mensaje al usuario se mantiene genérico a propósito: no debe
            // revelar si el correo existe. El detalle va a la consola.
            console.error("Fallo de autenticación:", err.code);
            setError("Datos incorrectos. Intenta de nuevo.");
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6"
            style={{ background: 'linear-gradient(180deg, #945EC4 0%, #3C1F66 100%)' }}
        >
            {/* Contenedor con efecto de cristal (Glassmorphism) */}
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/20 shadow-2xl">

                {/* Logo Section */}
                <div className="text-center mb-10">
                    <div className="bg-white p-0.5 rounded-full inline-block mb-4 shadow-xl shadow-black/20">
                        <img
                            src={logo}
                            alt="Trinity Fit Logo"
                            className="h-34 w-34 object-contain rounded-full"
                        />
                    </div>
                    <h1 className="text-white font-black text-4xl tracking-tighter uppercase leading-none">
                        Trinity Fit
                    </h1>
                    <p className="text-white/60 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">
                        Cuerpo • Mente • Alma
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="text-white/50 text-[10px] font-black uppercase ml-4 mb-2 block tracking-widest">
                            Correo Electrónico
                        </label>
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            className="w-full bg-white/10 border border-white/10 p-4 rounded-2xl text-white placeholder-white/30 focus:bg-white/20 transition-all outline-none font-medium"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="text-white/50 text-[10px] font-black uppercase ml-4 mb-2 block tracking-widest">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full bg-white/10 border border-white/10 p-4 rounded-2xl text-white placeholder-white/30 focus:bg-white/20 transition-all outline-none font-medium"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-white text-[10px] font-black text-center mt-2 bg-red-500/40 py-3 rounded-xl uppercase tracking-tighter border border-red-500/20">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-white text-[#3C1F66] py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all mt-6"
                    >
                        Entrar a la App
                    </button>
                </form>

                <p className="text-center text-white/30 text-[9px] font-bold mt-10 uppercase tracking-[0.2em]">
                    Acceso Exclusivo • Desarrollado x Andy
                </p>
            </div>
        </div>
    );
}