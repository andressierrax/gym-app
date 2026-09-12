import type { FechaFirestore } from "./tipos";

/**
 * Normaliza cualquiera de las formas en que llega una fecha desde Firestore.
 * Antes se llamaba a `.toDate()` sin comprobar nada, así que un solo registro
 * con un Date nativo tumbaba la lista entera del Monitor.
 */
export function aDate(valor: FechaFirestore): Date | null {
    if (!valor) return null;
    if (typeof valor === "object" && "toDate" in valor && typeof valor.toDate === "function") {
        return valor.toDate();
    }
    if (valor instanceof Date) return valor;
    const d = new Date(valor as string | number);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function mismoDia(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

/**
 * Etiqueta legible para el Monitor. Antes solo se mostraba la hora, así que un
 * entrenamiento de la semana pasada parecía de hoy.
 *
 * @param ahora referencia de "hoy"; parametrizada para poder probarla.
 */
export function etiquetaFecha(valor: FechaFirestore, ahora: Date = new Date()): string {
    const d = aDate(valor);
    if (!d) return "Sin fecha";

    // Locale explícito: con el del dispositivo el formato variaba entre
    // móviles ("3/8 09:00 a. m." frente a "03/08 09:00").
    const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const ayer = new Date(ahora);
    ayer.setDate(ahora.getDate() - 1);

    if (mismoDia(d, ahora)) return `Hoy ${hora}`;
    if (mismoDia(d, ayer)) return `Ayer ${hora}`;
    // Formateado a mano: al pedir solo día y mes, el patrón del locale ignora
    // el "2-digit" y devuelve "3/8" en unos dispositivos y "03/08" en otros.
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    return `${dia}/${mes} ${hora}`;
}
