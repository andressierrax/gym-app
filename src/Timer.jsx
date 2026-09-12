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

    return (
        <div className="fixed bottom-24 right-6 z-50">
            {descanso ? (
                <div className="bg-blue-600 text-white w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-black animate-pulse">
                    <span className="text-2xl font-black">{restante}s</span>
                    <button onClick={parar} className="text-[10px] font-bold uppercase">Parar</button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-center font-bold text-zinc-500 uppercase">Descanso</p>
                    <div className="flex gap-2">
                        {OPCIONES.map((t) => (
                            <button
                                key={t}
                                onClick={() => iniciar(t)}
                                className="bg-zinc-800 text-white w-12 h-12 rounded-2xl border border-zinc-700 font-bold text-xs hover:bg-blue-600 transition-colors"
                            >
                                {t}s
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
