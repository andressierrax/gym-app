import { describe, it, expect } from "vitest";
import { resumirRegistros, alertasDe, type RegistroResumible } from "./resumen";

const ahora = new Date(2026, 8, 20, 12, 0);
const hace = (dias: number) => new Date(2026, 8, 20 - dias, 10, 0);

const reg = (dias: number, extra: Partial<RegistroResumible> = {}): RegistroResumible => ({
    fecha: hace(dias),
    completados: 4,
    totalBloques: 4,
    nombreDia: "Pierna",
    etiquetasPeso: { "0": "Sentadilla" },
    ...extra,
});

describe("resumirRegistros", () => {
    it("sin registros no inventa nada", () => {
        const r = resumirRegistros([], ahora);
        expect(r).toMatchObject({ entrenamientos: 0, ultimoEntreno: null, diasSinEntrenar: null, constancia: null });
    });

    it("cuenta solo los entrenos de las últimas 4 semanas", () => {
        const r = resumirRegistros([reg(2), reg(10), reg(40)], ahora);
        expect(r.entrenamientos).toBe(2);
    });

    it("calcula los días desde el último entreno, aunque sea anterior a la ventana", () => {
        expect(resumirRegistros([reg(3), reg(9)], ahora).diasSinEntrenar).toBe(3);
        expect(resumirRegistros([reg(40)], ahora).diasSinEntrenar).toBe(40);
    });

    it("constancia = sets completados / asignados en la ventana", () => {
        const r = resumirRegistros([reg(1, { completados: 3, totalBloques: 4 }), reg(5, { completados: 1, totalBloques: 4 })], ahora);
        expect(r.constancia).toBe(50);
    });

    it("detecta mejora de peso entre las dos últimas sesiones del mismo ejercicio", () => {
        const r = resumirRegistros([reg(14, { pesos: { "0": 40 } }), reg(7, { pesos: { "0": 45 } })], ahora);
        expect(r.mejoras).toEqual([{ etiqueta: "Pierna · Sentadilla", carga: "pesada", unidad: "kg", anterior: 40, actual: 45 }]);
    });

    it("detecta mejora de repeticiones", () => {
        const r = resumirRegistros([reg(14, { reps: { "0": 10 } }), reg(7, { reps: { "0": 12 } })], ahora);
        expect(r.mejoras[0]).toMatchObject({ unidad: "rep", anterior: 10, actual: 12 });
    });

    it("una bajada de peso no cuenta como mejora", () => {
        const r = resumirRegistros([reg(14, { pesos: { "0": 45 } }), reg(7, { pesos: { "0": 40 } })], ahora);
        expect(r.mejoras).toEqual([]);
    });

    it("marca estancado tras 3 sesiones con el mismo peso", () => {
        const r = resumirRegistros([14, 7, 1].map(d => reg(d, { pesos: { "0": 40 } })), ahora);
        expect(r.estancados).toEqual(["Pierna · Sentadilla"]);
    });

    it("no marca estancado si las repeticiones sí cambian con el mismo peso", () => {
        const r = resumirRegistros([
            reg(14, { pesos: { "0": 40 }, reps: { "0": 10 } }),
            reg(7, { pesos: { "0": 40 }, reps: { "0": 12 } }),
            reg(1, { pesos: { "0": 40 }, reps: { "0": 14 } }),
        ], ahora);
        expect(r.estancados).toEqual([]);
    });

    it("con menos de 3 sesiones no hay estancamiento", () => {
        const r = resumirRegistros([reg(7, { pesos: { "0": 40 } }), reg(1, { pesos: { "0": 40 } })], ahora);
        expect(r.estancados).toEqual([]);
    });
});

describe("carga liviana", () => {
    it("mide la mejora de la liviana aparte de la pesada", () => {
        const r = resumirRegistros([
            reg(14, { pesos: { "0": 50 }, pesosLiv: { "0": 30 } }),
            reg(7, { pesos: { "0": 50 }, pesosLiv: { "0": 35 } }),
        ], ahora);
        expect(r.mejoras).toEqual([{ etiqueta: "Pierna · Sentadilla", carga: "liviana", unidad: "kg", anterior: 30, actual: 35 }]);
    });

    it("una liviana estancada no marca estancada a la pesada", () => {
        const r = resumirRegistros([14, 7, 1].map(d => reg(d, { pesos: { "0": 50 + d }, pesosLiv: { "0": 30 } })), ahora);
        expect(r.estancados).toEqual([]);
        expect(r.estancadosLiv).toEqual(["Pierna · Sentadilla"]);
        expect(alertasDe(r).estancados).toBe(1);
    });
});

describe("alertasDe", () => {
    it("avisa a partir de 7 días sin entrenar", () => {
        expect(alertasDe(resumirRegistros([reg(6)], ahora)).sinEntrenar).toBe(false);
        expect(alertasDe(resumirRegistros([reg(7)], ahora)).sinEntrenar).toBe(true);
    });

    it("cuenta los ejercicios estancados", () => {
        const r = resumirRegistros([14, 7, 1].map(d => reg(d, { pesos: { "0": 40 } })), ahora);
        expect(alertasDe(r).estancados).toBe(1);
    });
});
