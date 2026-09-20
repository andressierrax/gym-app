import { useState, useEffect, useRef, useCallback } from "react";

const OPCIONES = [30, 60, 90];

export default function Timer() {
    // El efecto fija un instante final y resta contra él, en vez de ir bajando
    // los segundos de uno en uno: así el contador no se retrasa cuando el móvil
    // ralentiza los temporizadores con la pantalla apagada.
    // `descanso` lleva un id incremental para que volver a pulsar la misma
    // duración reinicie la cuenta en vez de no cambiar nada.
    const [descanso, setDescanso] = useState(null);
    const [restante, setRestante] = useState(0);
    const [abierto, setAbierto] = useState(false);
    const audioRef = useRef(null);

    const avisar = useCallback(() => {
        navigator.vibrate?.([300, 120, 300]); // Android

        // iOS no vibra desde la web, así que el aviso audible es el único que
        // reciben esas usuarias. El contexto se creó al pulsar el botón, que es
        // el gesto que iOS exige para permitir reproducir sonido.
        const ctx = audioRef.current;
        if (!ctx) return;
        try {
            [0, 0.25].forEach((offset) => {
                const t = ctx.currentTime + offset;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
                osc.start(t);
                osc.stop(t + 0.2);
            });
        } catch {
            // Sin audio disponible seguimos: el contador igualmente llegó a cero.
        }
    }, []);

    useEffect(() => {
        if (!descanso) return;

        // El instante final se fija aquí, una sola vez. Refrescamos varias veces
        // por segundo y siempre recalculando desde ese objetivo, así el número
        // sigue siendo correcto aunque el navegador frene los temporizadores.
        const fin = Date.now() + descanso.segundos * 1000;
        const tick = () => {
            const segundos = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
            setRestante(segundos);
            if (segundos === 0) {
                avisar();
                setDescanso(null);
            }
        };
        const intervalo = setInterval(tick, 200);
        return () => clearInterval(intervalo);
    }, [descanso, avisar]);

    // Cerramos el contexto de audio al desmontar para no dejarlo abierto.
    useEffect(() => {
        return () => { audioRef.current?.close?.(); };
    }, []);

    const iniciar = (segundos) => {
        // Debe ocurrir dentro del gesto de la usuaria: es la única forma de que
        // iOS desbloquee el audio para el aviso que sonará al terminar.
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                if (!audioRef.current) audioRef.current = new AudioCtx();
                if (audioRef.current.state === "suspended") audioRef.current.resume();
            }
        } catch {
            // El navegador no permite audio; el temporizador funciona igual.
        }
        setRestante(segundos);
        setDescanso(prev => ({ segundos, id: (prev?.id ?? 0) + 1 }));
    };

    const parar = () => {
        setDescanso(null);
        setRestante(0);
    };

    // Arriba a la derecha y plegado por defecto: abajo tapaba las notas y el
    // botón de finalizar. `top-20` lo deja justo debajo del botón Salir.
    return (
        <div className="fixed top-20 right-3 z-40">
            {descanso ? (
                <div className="bg-blue-600 text-white rounded-full pl-4 pr-3 py-1.5 flex items-center gap-2 shadow-lg animate-pulse">
                    <span className="text-sm font-black">{restante}s</span>
                    <button onClick={parar} className="text-[9px] font-bold uppercase bg-white/20 rounded-full px-2 py-1">Parar</button>
                </div>
            ) : abierto ? (
                <div className="bg-zinc-800/95 rounded-full p-1.5 flex items-center gap-1.5 shadow-lg">
                    {OPCIONES.map((t) => (
                        <button
                            key={t}
                            onClick={() => { iniciar(t); setAbierto(false); }}
                            className="bg-zinc-700 text-white w-9 h-9 rounded-full font-bold text-[10px] active:bg-blue-600 transition-colors"
                        >
                            {t}s
                        </button>
                    ))}
                    <button
                        onClick={() => setAbierto(false)}
                        aria-label="Cerrar temporizador"
                        className="text-white/60 w-7 h-9 text-sm font-black"
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setAbierto(true)}
                    aria-label="Temporizador de descanso"
                    className="bg-zinc-800/90 text-white w-10 h-10 rounded-full shadow-lg text-base active:scale-90 transition-transform"
                >
                    ⏱
                </button>
            )}
        </div>
    );
}
