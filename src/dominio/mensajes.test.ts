import { describe, it, expect } from "vitest";
import { DIAS } from "../constantes";
import {
    MENSAJES_DIA,
    MENSAJES_SEMANA,
    mensajeDelDia,
    mensajeDeSemana,
    semanaCompletada,
} from "./mensajes";

describe("mensajeDelDia", () => {
    it("siempre devuelve un mensaje de la lista", () => {
        for (let s = 1; s <= 4; s++) {
            for (const d of DIAS) {
                expect(MENSAJES_DIA).toContain(mensajeDelDia(s, d));
            }
        }
    });

    it("es estable: el mismo día muestra siempre lo mismo", () => {
        expect(mensajeDelDia(2, 3)).toBe(mensajeDelDia(2, 3));
    });

    it("no repite el mensaje en días seguidos de la misma semana", () => {
        const seguidos = DIAS.map(d => mensajeDelDia(1, d));
        for (let i = 1; i < seguidos.length; i++) {
            expect(seguidos[i]).not.toBe(seguidos[i - 1]);
        }
    });

    it("varía entre semanas para el mismo día", () => {
        const porSemana = new Set([1, 2, 3, 4].map(s => mensajeDelDia(s, 1)));
        expect(porSemana.size).toBeGreaterThan(1);
    });
});

describe("mensajeDeSemana", () => {
    it("siempre devuelve un mensaje de la lista", () => {
        for (let s = 1; s <= 8; s++) {
            expect(MENSAJES_SEMANA).toContain(mensajeDeSemana(s));
        }
    });
});

describe("semanaCompletada", () => {
    it("es cierta con todos los días del ciclo", () => {
        expect(semanaCompletada([...DIAS])).toBe(true);
    });

    it("no le basta con el número de registros: repetir un día no cuenta", () => {
        const repetido = DIAS.map(() => 1); // cinco veces el día 1
        expect(repetido).toHaveLength(DIAS.length);
        expect(semanaCompletada(repetido)).toBe(false);
    });

    it("es falsa si falta un día", () => {
        expect(semanaCompletada(DIAS.slice(0, -1))).toBe(false);
    });

    it("aguanta duplicados junto a la semana completa", () => {
        expect(semanaCompletada([...DIAS, 1, 2, 3])).toBe(true);
    });

    it("ignora días fuera del ciclo", () => {
        expect(semanaCompletada([...DIAS, 99])).toBe(true);
        expect(semanaCompletada([99, 100])).toBe(false);
    });

    it("es falsa sin registros", () => {
        expect(semanaCompletada([])).toBe(false);
    });
});
