import { aDate } from "./dominio/fechas";

const ANCHO = 300;
const ALTO = 130;
const RELLENO = 24;

/**
 * Línea de progreso a mano, en SVG puro: la app no arrastra ninguna librería
 * de gráficos y no vale la pena meter una solo para esto.
 *
 * Los puntos van espaciados por índice, no por fecha real: los entrenos no
 * caen en intervalos regulares, y espaciarlos por fecha aplastaría los puntos
 * de una racha de días seguidos contra el borde izquierdo.
 *
 * Sirve tanto para peso como para repeticiones: `campo` dice qué propiedad
 * de cada punto graficar (`peso` o `reps`) y `unidad` cómo rotularla.
 */
export default function GraficoProgreso({ titulo, puntos, campo = "peso", unidad = "kg" }) {
    if (puntos.length === 0) return null;

    const valores = puntos.map(p => p[campo]);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    // Con un solo punto, o todos iguales, min===max: sin este margen la línea
    // colapsaría sobre el borde inferior del gráfico.
    const rango = max - min || 1;

    const x = (i) => puntos.length === 1
        ? ANCHO / 2
        : RELLENO + (i * (ANCHO - 2 * RELLENO)) / (puntos.length - 1);
    const y = (valor) => ALTO - RELLENO - ((valor - min) / rango) * (ALTO - 2 * RELLENO);

    const puntosLinea = puntos.map((p, i) => `${x(i)},${y(p[campo])}`).join(" ");
    const ultimo = puntos[puntos.length - 1];
    const primero = puntos[0];

    const etiquetaFechaCorta = (fecha) => {
        const d = aDate(fecha);
        if (!d) return "";
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    return (
        <div className="bg-amatista-dark rounded-[2rem] border border-white/10 shadow-xl p-5">
            <div className="flex justify-between items-baseline mb-2">
                <p className="text-white font-black uppercase text-xs tracking-tight truncate pr-2">{titulo}</p>
                <p className="text-amatista-light font-black text-sm shrink-0">{ultimo[campo]}{unidad}</p>
            </div>

            <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full" preserveAspectRatio="none" style={{ height: 90 }}>
                <polyline points={puntosLinea} fill="none" stroke="currentColor" strokeWidth="2" className="text-amatista-light" />
                {puntos.map((p, i) => (
                    <circle key={i} cx={x(i)} cy={y(p[campo])} r={i === puntos.length - 1 ? 4 : 2.5} className="fill-amatista-light" />
                ))}
            </svg>

            <div className="flex justify-between text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">
                <span>{etiquetaFechaCorta(primero.fecha)} · {primero[campo]}{unidad}</span>
                <span>{etiquetaFechaCorta(ultimo.fecha)} · {ultimo[campo]}{unidad}</span>
            </div>
        </div>
    );
}
