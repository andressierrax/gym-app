import { describe, it, expect } from "vitest";
import { aDate, etiquetaFecha } from "./fechas";

const REF = new Date(2026, 7, 11, 10, 0, 0); // 11 ago 2026, 10:00

describe("aDate", () => {
    it("acepta un Timestamp de Firestore", () => {
        expect(aDate({ toDate: () => REF })).toEqual(REF);
    });

    it("acepta un Date nativo, que antes hacía reventar la pantalla", () => {
        // El código viejo llamaba a .toDate() sin comprobar nada.
        expect(() => (REF as unknown as { toDate: () => Date }).toDate()).toThrow();
        expect(aDate(REF)).toEqual(REF);
    });

    it("acepta una cadena ISO", () => {
        expect(aDate("2026-08-11T10:00:00")?.getFullYear()).toBe(2026);
    });

    it("devuelve null ante ausencia o basura", () => {
        expect(aDate(null)).toBeNull();
        expect(aDate(undefined)).toBeNull();
        expect(aDate("no soy una fecha")).toBeNull();
    });
});

describe("etiquetaFecha", () => {
    it("dice Hoy para el mismo día", () => {
        const hoy = new Date(2026, 7, 11, 8, 30);
        expect(etiquetaFecha(hoy, REF)).toMatch(/^Hoy /);
    });

    it("dice Ayer para el día anterior", () => {
        const ayer = new Date(2026, 7, 10, 20, 0);
        expect(etiquetaFecha(ayer, REF)).toMatch(/^Ayer /);
    });

    it("muestra la fecha para algo más antiguo: antes parecía de hoy", () => {
        const etiqueta = etiquetaFecha(new Date(2026, 7, 3, 9, 0), REF);
        expect(etiqueta).not.toMatch(/Hoy|Ayer/);
        expect(etiqueta).toContain("03");
    });

    it("cruza bien el cambio de mes", () => {
        const finDeMes = new Date(2026, 6, 31, 12, 0);
        expect(etiquetaFecha(finDeMes, new Date(2026, 7, 1, 12, 0))).toMatch(/^Ayer /);
    });

    it("no lanza con una fecha ausente", () => {
        expect(etiquetaFecha(null, REF)).toBe("Sin fecha");
    });
});
