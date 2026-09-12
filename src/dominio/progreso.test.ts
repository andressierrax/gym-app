import { describe, it, expect } from "vitest";
import type { RegistroConPesos } from "./tipos";
import { pesosPorEjercicio, ejerciciosConProgreso } from "./progreso";

describe("pesosPorEjercicio", () => {
    it("agrupa por día + etiqueta, no solo por el nombre del ejercicio", () => {
        // "Sentadilla" se repite en dos días de rutina distintos: sin el
        // nombre del día, el peso de glúteos y el de pierna quedarían mezclados.
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-01", pesos: { "0-0": 40 }, etiquetasPeso: { "0-0": "Sentadilla" }, nombreDia: "Glúteos" },
            { fecha: "2026-01-02", pesos: { "0-0": 60 }, etiquetasPeso: { "0-0": "Sentadilla" }, nombreDia: "Pierna" },
        ];
        const resultado = pesosPorEjercicio(registros);
        expect(Object.keys(resultado).sort()).toEqual(["Glúteos · Sentadilla", "Pierna · Sentadilla"]);
        expect(resultado["Glúteos · Sentadilla"]?.map(r => r.peso)).toEqual([40]);
        expect(resultado["Pierna · Sentadilla"]?.map(r => r.peso)).toEqual([60]);
    });

    it("junta el mismo día + numeral entre semanas distintas", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-01", pesos: { "0-0": 40 }, etiquetasPeso: { "0-0": "Banca declinada" }, nombreDia: "Pecho" },
            { fecha: "2026-01-08", pesos: { "0-0": 42.5 }, etiquetasPeso: { "0-0": "Banca declinada" }, nombreDia: "Pecho" },
        ];
        const resultado = pesosPorEjercicio(registros);
        expect(resultado["Pecho · Banca declinada"]).toHaveLength(2);
    });

    it("ordena por fecha, sin importar el orden de entrada", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-08", pesos: { "0-0": 42.5 }, etiquetasPeso: { "0-0": "Banca declinada" }, nombreDia: "Pecho" },
            { fecha: "2026-01-01", pesos: { "0-0": 40 }, etiquetasPeso: { "0-0": "Banca declinada" }, nombreDia: "Pecho" },
        ];
        const resultado = pesosPorEjercicio(registros);
        expect(resultado["Pecho · Banca declinada"]?.map(r => r.peso)).toEqual([40, 42.5]);
    });

    it("usa el nombre de la rutina en las esporádicas", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-01", pesos: { "0-0": 15 }, etiquetasPeso: { "0-0": "Curl" }, rutinaNombre: "Full body" },
        ];
        expect(Object.keys(pesosPorEjercicio(registros))).toEqual(["Full body · Curl"]);
    });

    it("cae en el título del set si no hay etiquetasPeso (registros de antes de este campo)", () => {
        const registros: RegistroConPesos[] = [
            { fecha: "2026-01-01", pesos: { "0": 15 }, titulos: ["SET #1"], nombreDia: "Glúteos" },
        ];
        expect(Object.keys(pesosPorEjercicio(registros))).toEqual(["Glúteos · SET #1"]);
    });

    it("cae en 'Set N' si no hay ninguna etiqueta disponible", () => {
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
            {
                fecha: "2026-01-01",
                pesos: { "0-0": 40, "0-1": 20 },
                etiquetasPeso: { "0-0": "Sentadilla", "0-1": "Curl" },
                nombreDia: "Día",
            },
        ];
        expect(ejerciciosConProgreso(registros)).toEqual(["Día · Curl", "Día · Sentadilla"]);
    });

    it("es una lista vacía sin registros", () => {
        expect(ejerciciosConProgreso([])).toEqual([]);
    });
});
