import { describe, it, expect } from "vitest";
import type { RegistroConPesos } from "./tipos";
import { pesosPorEjercicio, ejerciciosConProgreso } from "./progreso";

describe("pesosPorEjercicio", () => {
    it("agrupa por nombre de ejercicio, no por clave de bloque", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-01", pesos: { "0-0": 10 }, nombresEjercicios: { "0-0": "Sentadilla" } },
            // Semana siguiente, la sentadilla se movió a otro bloque: misma clave no, mismo nombre sí.
            { fecha: "2026-01-08", pesos: { "1-0": 12 }, nombresEjercicios: { "1-0": "Sentadilla" } },
        ];
        const resultado = pesosPorEjercicio(registros);
        expect(resultado["Sentadilla"]).toHaveLength(2);
        expect(resultado["Sentadilla"]?.map(r => r.peso)).toEqual([10, 12]);
    });

    it("ordena por fecha, sin importar el orden de entrada", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-08", pesos: { "0-0": 12 }, nombresEjercicios: { "0-0": "Press banca" } },
            { fecha: "2026-01-01", pesos: { "0-0": 10 }, nombresEjercicios: { "0-0": "Press banca" } },
        ];
        const resultado = pesosPorEjercicio(registros);
        expect(resultado["Press banca"]?.map(r => r.peso)).toEqual([10, 12]);
    });

    it("ignora entradas sin nombre o sin peso numérico", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-01", pesos: { "0-0": 10, "0-1": NaN }, nombresEjercicios: { "0-0": "Sentadilla" } },
        ];
        const resultado = pesosPorEjercicio(registros);
        expect(Object.keys(resultado)).toEqual(["Sentadilla"]);
    });

    it("no revienta con registros sin pesos ni nombres", () => {
        expect(pesosPorEjercicio([{ fecha: "2026-01-01" }])).toEqual({});
    });
});

describe("ejerciciosConProgreso", () => {
    it("devuelve los nombres ordenados alfabéticamente", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-01", pesos: { "0-0": 10, "0-1": 20 }, nombresEjercicios: { "0-0": "Sentadilla", "0-1": "Curl" } },
        ];
        expect(ejerciciosConProgreso(registros)).toEqual(["Curl", "Sentadilla"]);
    });

    it("es una lista vacía sin registros", () => {
        expect(ejerciciosConProgreso([])).toEqual([]);
    });
});
