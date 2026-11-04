import { describe, it, expect } from "vitest";
import {
    type Mesociclo,
    aISO,
    desdeISO,
    sumarDias,
    finSugerido,
    siguienteNombre,
    estadoMesociclo,
    mesocicloActual,
    entrenosEn,
    validarMesociclo,
} from "./mesociclos";

const meso = (id: string, inicio: string, fin?: string): Mesociclo =>
    ({ id, clienteId: "ana", nombre: `M${id}`, inicio, fin });

describe("fechas", () => {
    it("lee el ISO como fecha local, sin correrse un día", () => {
        const f = desdeISO("2026-11-03");
        expect(f.getDate()).toBe(3);
        expect(aISO(f)).toBe("2026-11-03");
    });

    it("suma días cruzando de mes", () => {
        expect(sumarDias("2026-11-28", 5)).toBe("2026-12-03");
    });

    it("propone 5 semanas de duración", () => {
        expect(finSugerido("2026-11-03")).toBe("2026-12-07");
    });

    it("numera el siguiente mesociclo", () => {
        expect(siguienteNombre([meso("1", "2026-09-01")])).toBe("Mesociclo #2");
    });
});

describe("estado y actual", () => {
    const hoy = "2026-11-10";

    it("distingue próximo, en curso y terminado", () => {
        expect(estadoMesociclo(meso("a", "2026-12-01"), hoy)).toBe("proximo");
        expect(estadoMesociclo(meso("b", "2026-11-01", "2026-12-05"), hoy)).toBe("en_curso");
        expect(estadoMesociclo(meso("c", "2026-09-01", "2026-10-05"), hoy)).toBe("terminado");
        expect(estadoMesociclo(meso("d", "2026-11-01"), hoy)).toBe("en_curso");
    });

    it("el último día del rango aún está en curso", () => {
        expect(estadoMesociclo(meso("b", "2026-11-01", hoy), hoy)).toBe("en_curso");
    });

    it("elige el que está en curso, y si se solapan el más reciente", () => {
        const lista = [meso("viejo", "2026-09-01", "2026-10-05"), meso("a", "2026-10-20"), meso("b", "2026-11-03", "2026-12-07")];
        expect(mesocicloActual(lista, hoy)?.id).toBe("b");
        expect(mesocicloActual([meso("viejo", "2026-09-01", "2026-10-05")], hoy)).toBeNull();
    });
});

describe("entrenosEn", () => {
    it("cuenta los entrenos dentro del rango, extremos incluidos", () => {
        const m = meso("1", "2026-11-03", "2026-11-09");
        const fechas = [
            new Date(2026, 10, 2, 20), new Date(2026, 10, 3, 7), new Date(2026, 10, 9, 21), new Date(2026, 10, 10, 6),
        ];
        expect(entrenosEn(m, fechas)).toBe(2);
    });

    it("sin fin cuenta todo lo posterior al inicio", () => {
        expect(entrenosEn(meso("1", "2026-11-03"), [new Date(2027, 0, 1)])).toBe(1);
    });
});

describe("validarMesociclo", () => {
    it("exige nombre e inicio", () => {
        expect(validarMesociclo({ nombre: " ", inicio: "2026-11-03" })).not.toBeNull();
        expect(validarMesociclo({ nombre: "M1", inicio: "" })).not.toBeNull();
    });

    it("rechaza un fin anterior al inicio", () => {
        expect(validarMesociclo({ nombre: "M1", inicio: "2026-11-03", fin: "2026-11-01" })).not.toBeNull();
    });

    it("acepta sin fin o con fin posterior", () => {
        expect(validarMesociclo({ nombre: "M1", inicio: "2026-11-03" })).toBeNull();
        expect(validarMesociclo({ nombre: "M1", inicio: "2026-11-03", fin: "2026-12-07" })).toBeNull();
    });
});
