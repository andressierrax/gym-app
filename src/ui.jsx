// Piezas visuales compartidas de Trinity Fit.
//
// Las mismas cadenas de clases estaban copiadas decenas de veces por los
// componentes: `font-black uppercase tracking-widest text-[10px]` aparecía
// unas treinta, y la tarjeta morada y el botón blanco en casi todas las
// pantallas. Cambiar la marca implicaba buscar y reemplazar por todo el
// proyecto; ahora es este archivo.

// Título de pantalla, con subtítulo y una acción opcional a la derecha.
export function TituloSeccion({ titulo, subtitulo, accion }) {
    return (
        <header className="flex justify-between items-end mb-8 pt-4">
            <div>
                <h2 className="text-3xl font-black italic text-amatista-dark leading-none uppercase tracking-tighter">
                    {titulo}
                </h2>
                {subtitulo && (
                    <p className="text-amatista-dark/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                        {subtitulo}
                    </p>
                )}
            </div>
            {accion}
        </header>
    );
}

// La tarjeta morada sobre la que van los formularios.
export function Tarjeta({ children, className = "" }) {
    return (
        <div className={`bg-amatista-dark p-8 rounded-[3rem] shadow-2xl border border-white/10 ${className}`}>
            {children}
        </div>
    );
}

// Etiqueta clara sobre fondo morado, con su control debajo.
export function Campo({ etiqueta, children }) {
    return (
        <div>
            <label className="text-white/40 text-[10px] font-black uppercase ml-4 mb-2 block tracking-widest">
                {etiqueta}
            </label>
            {children}
        </div>
    );
}

const ENTRADA = "w-full p-4 bg-white rounded-2xl text-amatista-dark font-bold outline-none placeholder-amatista-dark/30";

export function Entrada({ className = "", ...props }) {
    return <input className={`${ENTRADA} ${className}`} {...props} />;
}

export function Seleccion({ className = "", children, ...props }) {
    return <select className={`${ENTRADA} ${className}`} {...props}>{children}</select>;
}

// Botón blanco de acción principal.
export function BotonPrincipal({ children, className = "", ...props }) {
    return (
        <button
            className={`w-full bg-white text-amatista-dark py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

// Estado vacío con borde discontinuo.
export function Vacio({ children }) {
    return (
        <div className="text-center py-16 px-6 text-amatista-dark/40 font-bold italic border-2 border-dashed border-amatista-light rounded-[3rem] bg-white/30">
            {children}
        </div>
    );
}

// Aviso a pantalla completa al cerrar un entrenamiento. Sustituye al alert()
// del navegador, que no se puede vestir y corta la sensación de logro.
export function Celebracion({ titulo, mensaje, destacado = false, onCerrar }) {
    return (
        <div
            className="fixed inset-0 z-[60] bg-amatista-dark/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={onCerrar}
        >
            <div
                className={`w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl border animate-in fade-in zoom-in-95 duration-300 ${destacado
                    ? "bg-gradient-to-b from-amatista to-amatista-dark border-white/30"
                    : "bg-white border-amatista-light"
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <p className="text-5xl mb-4">{destacado ? "🏆" : "🔥"}</p>
                <h3 className={`font-black italic uppercase text-2xl leading-none tracking-tighter mb-3 ${destacado ? "text-white" : "text-amatista-dark"
                    }`}>
                    {titulo}
                </h3>
                <p className={`text-sm font-medium leading-snug mb-7 ${destacado ? "text-white/90" : "text-amatista-dark/70"
                    }`}>
                    {mensaje}
                </p>
                <button
                    onClick={onCerrar}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all ${destacado
                        ? "bg-white text-amatista-dark"
                        : "bg-amatista-dark text-white"
                        }`}
                >
                    Seguir
                </button>
            </div>
        </div>
    );
}

// Rueda de carga centrada, con texto opcional.
export function Cargando({ texto }) {
    return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-amatista-dark border-r-transparent"></div>
            {texto && (
                <p className="text-amatista-dark/40 font-black text-[10px] uppercase tracking-widest">{texto}</p>
            )}
        </div>
    );
}
