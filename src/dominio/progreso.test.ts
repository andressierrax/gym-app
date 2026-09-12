import { describe, it, expect } from "vitest";
import type { RegistroConPesos } from "./tipos";
import { pesosPorEjercicio, ejerciciosConProgreso } from "./progreso";

describe("pesosPorEjercicio", () => {
    it("agrupa por día + set, no solo por el título del set", () => {
        // "SET #1" se repite en dos días de rutina distintos: sin el nombre
        // del día, el peso de glúteos y el de espalda quedarían mezclados.
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-01", pesos: { "0": 40 }, titulos: ["SET #1"], nombreDia: "Glúteos" },
            { fecha: "2026-01-02", pesos: { "0": 20 }, titulos: ["SET #1"], nombreDia: "Espalda" },
        ];
        const resultado = pesosPorEjercicio(registros);
        expect(Object.keys(resultado).sort()).toEqual(["Espalda · SET #1", "Glúteos · SET #1"]);
        expect(resultado["Glúteos · SET #1"]?.map(r => r.peso)).toEqual([40]);
        expect(resultado["Espalda · SET #1"]?.map(r => r.peso)).toEqual([20]);
    });

    it("junta el mismo día + set entre semanas distintas", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-01", pesos: { "0": 40 }, titulos: ["SET #1"], nombreDia: "Glúteos" },
            { fecha: "2026-01-08", pesos: { "0": 42.5 }, titulos: ["SET #1"], nombreDia: "Glúteos" },
        ];
        const resultado = pesosPorEjercicio(registros);
        expect(resultado["Glúteos · SET #1"]).toHaveLength(2);
    });

    it("ordena por fecha, sin importar el orden de entrada", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-08", pesos: { "0": 42.5 }, titulos: ["SET #1"], nombreDia: "Glúteos" },
            { fecha: "2026-01-01", pesos: { "0": 40 }, titulos: ["SET #1"], nombreDia: "Glúteos" },
        ];
        const resultado = pesosPorEjercicio(registros);
        expect(resultado["Glúteos · SET #1"]?.map(r => r.peso)).toEqual([40, 42.5]);
    });

    it("usa el nombre de la rutina en las esporádicas", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-01", pesos: { "0": 15 }, titulos: ["SET #1"], rutinaNombre: "Full body" },
        ];
        expect(Object.keys(pesosPorEjercicio(registros))).toEqual(["Full body · SET #1"]);
    });

    it("cae en 'Set N' si el bloque no tiene título", () => {
        const registros: RegistroConPesos[] = [{ fecha: "2026-01-01", pesos: { "0": 15 } }];
        expect(Object.keys(pesosPorEjercicio(registros))).toEqual(["Set 1"]);
    });

    it("ignora pesos no numéricos", () => {
        const registros: RegistroConPesos[] = [{ fecha: "2026-01-01", pesos: { "0": NaN } }];
        expect(pesosPorEjercicio(registros)).toEqual({});
    });

    it("no revienta con registros sin pesos", () => {
        expect(pesosPorEjercicio([{ fecha: "2026-01-01" }])).toEqual({});
    });
});

describe("ejerciciosConProgreso", () => {
    it("devuelve las etiquetas ordenadas alfabéticamente", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-01", pesos: { "0": 40, "1": 20 }, titulos: ["Sentadilla", "Curl"], nombreDia: "Día" },
        ];
        expect(ejerciciosConProgreso(registros)).toEqual(["Día · Curl", "Día · Sentadilla"]);
    });

    it("es una lista vacía sin registros", () => {
        expect(ejerciciosConProgreso([])).toEqual([]);
    });
});
