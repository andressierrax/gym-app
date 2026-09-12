import { describe, it, expect } from "vitest";
import { dividirBloque, etiquetaDePunto } from "./bloques";

const EJEMPLO_REAL = `1. Banca declinada con barra
15 repeticiones peso pesado
(flexión de pecho toco pie con mano contraria 10-12 repeticiones)

2. Tríceps fondos en silla de capitán
15 repeticiones

3. Abdomen apoyo BALON BOSU me siento en la zona baja del balón con pies en
balón pequeño y disco de 5kg subo y traigo pies
De 12 a 15 repeticiones`;

describe("dividirBloque", () => {
    it("detecta los tres numerales del set real de la entrenadora", () => {
        const { puntos } = dividirBloque(EJEMPLO_REAL);
        expect(puntos).toHaveLength(3);
        expect(puntos[0]).toContain("Banca declinada con barra");
        expect(puntos[1]).toContain("Tríceps fondos en silla de capitán");
        expect(puntos[2]).toContain("Abdomen apoyo BALON BOSU");
    });

    it("no se confunde con números que aparecen a mitad de línea", () => {
        // "5kg" y "12 a 15" no están al principio de una línea: no son numerales.
        const { puntos } = dividirBloque(EJEMPLO_REAL);
        expect(puntos[2]).toContain("disco de 5kg");
        expect(puntos[2]).toContain("De 12 a 15 repeticiones");
    });

    it("deja todo en preambulo si solo hay un numeral: no vale la pena partirlo", () => {
        const { preambulo, puntos } = dividirBloque("1. Sentadilla\n12 repeticiones");
        expect(puntos).toEqual([]);
        expect(preambulo).toBe("1. Sentadilla\n12 repeticiones");
    });

    it("deja todo en preambulo si no hay numerales", () => {
        const { preambulo, puntos } = dividirBloque("Estiramiento general 5 minutos");
        expect(puntos).toEqual([]);
        expect(preambulo).toBe("Estiramiento general 5 minutos");
    });

    it("separa el texto antes del primer numeral como preámbulo", () => {
        const { preambulo, puntos } = dividirBloque("Calienta antes de empezar.\n1. Sentadilla\n2. Zancada");
        expect(preambulo).toBe("Calienta antes de empezar.");
        expect(puntos).toHaveLength(2);
    });

    it("acepta numerales con paréntesis", () => {
        const { puntos } = dividirBloque("1) Sentadilla\n2) Zancada");
        expect(puntos).toHaveLength(2);
    });

    it("no revienta con contenido vacío o ausente", () => {
        expect(dividirBloque("")).toEqual({ preambulo: "", puntos: [] });
        expect(dividirBloque(undefined)).toEqual({ preambulo: "", puntos: [] });
    });
});

describe("etiquetaDePunto", () => {
    it("usa la primera línea, sin el numeral de delante", () => {
        expect(etiquetaDePunto("1. Banca declinada con barra\n15 repeticiones")).toBe("Banca declinada con barra");
    });

    it("acepta numerales con paréntesis", () => {
        expect(etiquetaDePunto("2) Tríceps fondos")).toBe("Tríceps fondos");
    });
});
