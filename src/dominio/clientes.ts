import type { Cliente } from "./tipos";

/**
 * Dos maneras de trabajar con una clienta.
 *
 * `ciclo` es el mesociclo de siempre: semanas y días fijos. `esporadica` es
 * quien viene suelto, sin calendario, y elige de un catálogo de rutinas con
 * nombre. La ausencia del campo significa `ciclo`, así que las clientas ya
 * registradas siguen funcionando sin tocar nada.
 */
export type TipoCliente = "ciclo" | "esporadica";

export const TIPO_POR_DEFECTO: TipoCliente = "ciclo";

export const tipoDeCliente = (cliente: Pick<Cliente, "tipo"> | null | undefined): TipoCliente =>
    cliente?.tipo === "esporadica" ? "esporadica" : TIPO_POR_DEFECTO;

export const esEsporadica = (cliente: Pick<Cliente, "tipo"> | null | undefined): boolean =>
    tipoDeCliente(cliente) === "esporadica";

export const etiquetaTipo = (tipo: TipoCliente): string =>
    tipo === "esporadica" ? "Esporádica" : "Por ciclo";
