import { describe, it, expect } from "vitest";
import {
    SEMANAS,
    DIAS,
    SEMANA_ADAPTACION,
    etiquetaSemana,
    etiquetaSemanaCorta,
    enfoqueDeSemana,
    esSemanaValida,
    esDiaValido,
    semanaAnterior,
} from "./constantes";

describe("forma del ciclo", () => {
    it("la adaptación va DELANTE de la semana 1", () => {
        expect(SEMANAS[0]).toBe(SEMANA_ADAPTACION);
        expect(SEMANAS).toEqual([0, 1, 2, 3, 4]);
    });

    it("las semanas 1 a 4 conservan su número: los planes guardados siguen valiendo", () => {
        // Esto es lo que evita tener que migrar nada al añadir la adaptación.
        for (const s of [1, 2, 3, 4]) expect(esSemanaValida(s)).toBe(true);
    });

    it("la adaptación es una semana válida", () => {
        expect(esSemanaValida(0)).toBe(true);
        expect(esSemanaValida("0")).toBe(true);
    });

    it("sigue rechazando lo que está fuera del ciclo", () => {
        expect(esSemanaValida(5)).toBe(false);
        expect(esSemanaValida(-1)).toBe(false);
        expect(esDiaValido(0)).toBe(false);
        expect(esDiaValido(6)).toBe(false);
    });

    it("los días no cambian", () => {
        expect(DIAS).toEqual([1, 2, 3, 4, 5]);
    });
});

describe("semanaAnterior", () => {
    it("la Adaptación no tiene semana previa", () => {
        expect(semanaAnterior(0)).toBeNull();
    });

    it("cada semana apunta a la de justo antes", () => {
        expect(semanaAnterior(1)).toBe(0);
        expect(semanaAnterior(2)).toBe(1);
        expect(semanaAnterior(4)).toBe(3);
    });

    it("acepta el número como string, igual que esSemanaValida", () => {
        expect(semanaAnterior("2")).toBe(1);
    });
});

describe("etiquetas", () => {
    it("la semana 0 se llama Adaptación, nunca 'Semana 0'", () => {
        expect(etiquetaSemana(0)).toBe("Semana Adaptación");
        expect(etiquetaSemanaCorta(0)).toBe("Adaptación");
        expect(etiquetaSemana(0)).not.toContain("0");
        expect(etiquetaSemanaCorta(0)).not.toContain("0");
    });

    it("el resto se numeran igual que siempre", () => {
        expect(etiquetaSemana(1)).toBe("Semana 1");
        expect(etiquetaSemana(4)).toBe("Semana 4");
    });

    it("ya no queda rastro de la semana de descarga", () => {
        for (const s of SEMANAS) {
            expect(etiquetaSemana(s)).not.toMatch(/descarga/i);
            expect(etiquetaSemanaCorta(s)).not.toMatch(/descarga/i);
            expect(enfoqueDeSemana(s)).not.toMatch(/descarga|recuperación/i);
        }
    });

    it("toda semana del ciclo tiene etiqueta y enfoque", () => {
        for (const s of SEMANAS) {
            expect(etiquetaSemana(s)).toBeTruthy();
            expect(etiquetaSemanaCorta(s)).toBeTruthy();
            expect(enfoqueDeSemana(s)).toBeTruthy();
        }
    });

    it("la adaptación tiene su propio enfoque", () => {
        expect(enfoqueDeSemana(0)).toBe("Enfoque: Adaptación");
        expect(enfoqueDeSemana(2)).toBe("Fuerza e Hipertrofia");
    });
});
