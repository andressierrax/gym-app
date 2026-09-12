import { describe, it, expect } from "vitest";
import { etiquetasDeRegistro } from "./registros";

describe("etiquetasDeRegistro", () => {
    it("una clienta esporádica se identifica por el nombre de su rutina", () => {
        const e = etiquetasDeRegistro({ semana: 0, dia: 0, rutinaNombre: "Full body 45 min" });
        expect(e.esporadica).toBe(true);
        expect(e.principal).toBe("Full body 45 min");
        expect(e.secundario).toBeNull();
    });

    it("la semana de Adaptación NO se confunde con una esporádica", () => {
        // Las dos se guardan con semana 0: lo que las separa es la rutina.
        const e = etiquetasDeRegistro({ semana: 0, dia: 3 });
        expect(e.esporadica).toBe(false);
        expect(e.principal).toBe("Adaptación");
        expect(e.secundario).toBe("Día 3");
    });

    it("nunca muestra 'Sem 0' ni 'Día 0'", () => {
        for (const reg of [
            { semana: 0, dia: 1 },
            { semana: 0, dia: 0, rutinaNombre: "Piernas" },
        ]) {
            const e = etiquetasDeRegistro(reg);
            expect(`${e.principal} ${e.secundario ?? ""}`).not.toMatch(/Sem 0|Día 0/);
        }
    });

    it("una semana normal se etiqueta como siempre", () => {
        const e = etiquetasDeRegistro({ semana: 3, dia: 2 });
        expect(e.principal).toBe("Semana 3");
        expect(e.secundario).toBe("Día 2");
    });

    it("un nombre en blanco no cuenta como esporádica", () => {
        expect(etiquetasDeRegistro({ semana: 2, dia: 1, rutinaNombre: "   " }).esporadica).toBe(false);
    });

    it("aguanta un registro incompleto", () => {
        expect(() => etiquetasDeRegistro({})).not.toThrow();
    });
});
