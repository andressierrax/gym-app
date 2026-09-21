import { aDate } from "./dominio/fechas";

const ANCHO = 300;
const ALTO = 130;
const RELLENO = 24;

const COLORES = {
    pesada: { linea: "text-amatista-light", punto: "fill-amatista-light", texto: "text-amatista-light" },
    liviana: { linea: "text-sky-300", punto: "fill-sky-300", texto: "text-sky-300" },
};

const etiquetaFechaCorta = (fecha) => {
    const d = aDate(fecha);
    if (!d) return "";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Línea de progreso a mano, en SVG puro: la app no arrastra ninguna librería
 * de gráficos y no vale la pena meter una solo para esto.
 *
 * Los puntos van espaciados por índice, no por fecha real: los entrenos no
 * caen en intervalos regulares, y espaciarlos por fecha aplastaría los puntos
 * de una racha de días seguidos contra el borde izquierdo. Con varias series
 * (carga pesada y liviana) comparten el eje: el índice se calcula sobre la
 * unión de sus fechas, así los entrenos coinciden en vertical.
 *
 * `series` es una lista de { puntos, campo, unidad, carga }; por comodidad,
 * también acepta `puntos`/`campo`/`unidad` sueltos para una sola serie.
 */
export default function GraficoProgreso({ titulo, puntos, campo = "peso", unidad = "kg", series }) {
    const lista = (series ?? [{ puntos, campo, unidad, carga: "pesada" }])
        .filter(s => s.puntos && s.puntos.length > 0);
    if (lista.length === 0) return null;

    const tiempo = (fecha) => aDate(fecha)?.getTime() ?? 0;
    const marcas = [...new Set(lista.flatMap(s => s.puntos.map(p => tiempo(p.fecha))))].sort((a, b) => a - b);
    const valores = lista.flatMap(s => s.puntos.map(p => p[s.campo]));
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    // Con un solo punto, o todos iguales, min===max: sin este margen la línea
    // colapsaría sobre el borde inferior del gráfico.
    const rango = max - min || 1;

    const x = (fecha) => marcas.length === 1
        ? ANCHO / 2
        : RELLENO + (marcas.indexOf(tiempo(fecha)) * (ANCHO - 2 * RELLENO)) / (marcas.length - 1);
    const y = (valor) => ALTO - RELLENO - ((valor - min) / rango) * (ALTO - 2 * RELLENO);

    const varias = lista.length > 1;

    return (
        <div className="bg-amatista-dark rounded-[2rem] border border-white/10 shadow-xl p-5">
            <div className="flex justify-between items-baseline mb-2 gap-2">
                <p className="text-white font-black uppercase text-xs tracking-tight truncate">{titulo}</p>
                <p className="font-black text-sm shrink-0 flex gap-2">
                    {lista.map(s => (
                        <span key={s.carga} className={COLORES[s.carga].texto}>
                            {s.puntos.at(-1)[s.campo]}{s.unidad}
                        </span>
                    ))}
                </p>
            </div>

            <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full" preserveAspectRatio="none" style={{ height: 90 }}>
                {lista.map(s => (
                    <g key={s.carga}>
                        <polyline
                            points={s.puntos.map(p => `${x(p.fecha)},${y(p[s.campo])}`).join(" ")}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={COLORES[s.carga].linea}
                        />
                        {s.puntos.map((p, i) => (
                            <circle
                                key={i}
                                cx={x(p.fecha)}
                                cy={y(p[s.campo])}
                                r={i === s.puntos.length - 1 ? 4 : 2.5}
                                className={COLORES[s.carga].punto}
                            />
                        ))}
                    </g>
                ))}
            </svg>

            <div className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1 space-y-0.5">
                {lista.map(s => (
                    <div key={s.carga} className="flex justify-between">
                        <span>
                            {varias && <span className={COLORES[s.carga].texto}>{s.carga} · </span>}
                            {etiquetaFechaCorta(s.puntos[0].fecha)} · {s.puntos[0][s.campo]}{s.unidad}
                        </span>
                        <span>{etiquetaFechaCorta(s.puntos.at(-1).fecha)} · {s.puntos.at(-1)[s.campo]}{s.unidad}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
