import { describe, it, expect } from "vitest";
import { huellaDeTexto, huellasDeRutina, realinear, realinearSesion, etiquetasDeCarga } from "./huellas";

const set = (titulo: string, ...ejercicios: string[]) => ({
    titulo,
    contenido: ejercicios.map((e, i) => `${i + 1}. ${e}`).join("\n"),
});

describe("huellaDeTexto", () => {
    it("ignora mayúsculas, tildes y la prescripción con cifras", () => {
        expect(huellaDeTexto("Hip Thrust 4x12")).toBe(huellaDeTexto("hip thrust 3x10"));
        expect(huellaDeTexto("Sentadilla Búlgara")).toBe("sentadilla bulgara");
    });

    it("distingue ejercicios distintos", () => {
        expect(huellaDeTexto("Peso muerto")).not.toBe(huellaDeTexto("Hip thrust"));
    });
});

describe("realinear", () => {
    it("sin huellas guardadas (sesiones antiguas) deja los valores como estaban", () => {
        const valores = { "0-0": 50 };
        expect(realinear(valores, undefined, { "0-0": "otro" })).toEqual(valores);
    });

    it("si se reordenan los ejercicios, cada peso sigue a su ejercicio", () => {
        const antes = huellasDeRutina([set("SET #1", "Sentadilla", "Hip thrust")]).filas;
        const ahora = huellasDeRutina([set("SET #1", "Hip thrust", "Sentadilla")]).filas;
        expect(realinear({ "0-0": 40, "0-1": 80 }, antes, ahora)).toEqual({ "0-0": 80, "0-1": 40 });
    });

    it("si se quita un ejercicio, los de después no heredan su peso", () => {
        const antes = huellasDeRutina([set("SET #1", "Sentadilla", "Zancada", "Hip thrust")]).filas;
        const ahora = huellasDeRutina([set("SET #1", "Sentadilla", "Hip thrust")]).filas;
        expect(realinear({ "0-0": 40, "0-1": 10, "0-2": 80 }, antes, ahora)).toEqual({ "0-0": 40, "0-1": 80 });
    });

    it("una corrección del nombre conserva el peso en su sitio", () => {
        const antes = huellasDeRutina([set("SET #1", "Sentadila", "Hip thrust")]).filas;
        const ahora = huellasDeRutina([set("SET #1", "Sentadilla", "Hip thrust")]).filas;
        expect(realinear({ "0-0": 40, "0-1": 80 }, antes, ahora)).toEqual({ "0-0": 40, "0-1": 80 });
    });

    it("sin recolocación por posición, un ejercicio distinto no hereda el peso de otro", () => {
        const antes = huellasDeRutina([set("SET #1", "Sentadilla", "Hip thrust")]).filas;
        const ahora = huellasDeRutina([set("SET #1", "Remo", "Hip thrust")]).filas;
        expect(realinear({ "0-0": 40, "0-1": 80 }, antes, ahora, false)).toEqual({ "0-1": 80 });
    });

    it("un ejercicio repetido se empareja en orden", () => {
        const rutina = [set("SET #1", "Sentadilla", "Plancha"), set("SET #2", "Sentadilla", "Puente")];
        const h = huellasDeRutina(rutina).filas;
        expect(realinear({ "0-0": 40, "1-0": 45 }, h, h)).toEqual({ "0-0": 40, "1-0": 45 });
    });

    it("mueve un set entero con sus notas y su check", () => {
        const a = set("SET #1", "Sentadilla", "Zancada");
        const b = set("SET #2", "Remo", "Press");
        const sesion = {
            checks: { 0: true }, notas: { 0: "me costó" },
            pesos: { "0-0": 40 }, reps: {}, pesosLiv: {}, repsLiv: {},
        };
        const r = realinearSesion(sesion, huellasDeRutina([a, b]), huellasDeRutina([b, a]));
        expect(r.checks).toEqual({ 1: true });
        expect(r.notas).toEqual({ 1: "me costó" });
        expect(r.pesos).toEqual({ "1-0": 40 });
    });
});

describe("etiquetasDeCarga", () => {
    it("nombra cada numeral, o el set entero si no tiene", () => {
        expect(etiquetasDeCarga([set("SET #1", "Sentadilla 4x12", "Hip thrust"), { titulo: "SET #2", contenido: "Cardio" }]))
            .toEqual({ "0-0": "Sentadilla 4x12", "0-1": "Hip thrust", "1": "SET #2" });
    });
});
