import { describe, it, expect } from "vitest";
import { tipoDeCliente, esEsporadica, etiquetaTipo } from "./clientes";

describe("tipo de clienta", () => {
    it("sin el campo se comporta como siempre: por ciclo", () => {
        // Esto es lo que evita migrar a las clientas ya registradas.
        expect(tipoDeCliente({})).toBe("ciclo");
        expect(tipoDeCliente(null)).toBe("ciclo");
        expect(tipoDeCliente(undefined)).toBe("ciclo");
        expect(esEsporadica({})).toBe(false);
    });

    it("reconoce a la esporádica", () => {
        expect(tipoDeCliente({ tipo: "esporadica" })).toBe("esporadica");
        expect(esEsporadica({ tipo: "esporadica" })).toBe(true);
    });

    it("un valor desconocido no la saca del ciclo", () => {
        expect(tipoDeCliente({ tipo: "loquesea" as never })).toBe("ciclo");
        expect(esEsporadica({ tipo: "loquesea" as never })).toBe(false);
    });

    it("las etiquetas son legibles", () => {
        expect(etiquetaTipo("ciclo")).toBe("Por ciclo");
        expect(etiquetaTipo("esporadica")).toBe("Esporádica");
    });
});
