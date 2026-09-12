import { describe, it, expect } from "vitest";
import type { AlmacenLocal } from "./sesion";
import {
    idSesionCiclo,
    idSesionLibre,
    fechaISOLocal,
    claveLocal,
    leerLocal,
    guardarLocal,
    servidorEsMasReciente,
    contarCompletados,
} from "./sesion";

/** Almacén de mentira: evita depender de un navegador para probar esto. */
function almacenFalso(inicial: Record<string, string> = {}): AlmacenLocal & { datos: Record<string, string> } {
    const datos = { ...inicial };
    return {
        datos,
        getItem: (k) => datos[k] ?? null,
        setItem: (k, v) => { datos[k] = v; },
    };
}

describe("idSesionCiclo", () => {
    it("es estable para la misma clienta, semana y día", () => {
        expect(idSesionCiclo("ana", 1, 1)).toBe(idSesionCiclo("ana", 1, 1));
    });

    it("no confunde S1D10 con S10D1", () => {
        expect(idSesionCiclo("ana", 1, 10)).not.toBe(idSesionCiclo("ana", 10, 1));
    });

    it("separa a cada clienta", () => {
        expect(idSesionCiclo("ana", 1, 1)).not.toBe(idSesionCiclo("eva", 1, 1));
    });
});

describe("leerLocal", () => {
    it("devuelve una sesión vacía si no hay nada guardado", () => {
        expect(leerLocal(idSesionCiclo("ana", 1, 1), almacenFalso())).toEqual({ checks: {}, notas: {}, pesos: {}, actualizado: 0 });
    });

    it("recupera lo que se guardó", () => {
        const a = almacenFalso();
        guardarLocal(idSesionCiclo("ana", 1, 1), { checks: { 0: true }, notas: { 0: "80kg" }, pesos: { 0: 80 } }, a, 1000);
        expect(leerLocal(idSesionCiclo("ana", 1, 1), a)).toEqual({ checks: { 0: true }, notas: { 0: "80kg" }, pesos: { 0: 80 }, actualizado: 1000 });
    });

    it("no mezcla días distintos", () => {
        const a = almacenFalso();
        guardarLocal(idSesionCiclo("ana", 1, 1), { checks: { 0: true }, notas: {}, pesos: {} }, a, 1000);
        expect(leerLocal(idSesionCiclo("ana", 1, 2), a).checks).toEqual({});
    });

    it("aguanta JSON corrupto sin lanzar", () => {
        const a = almacenFalso({ [claveLocal(idSesionCiclo("ana", 1, 1))]: "{esto no es json" });
        expect(() => leerLocal(idSesionCiclo("ana", 1, 1), a)).not.toThrow();
        expect(leerLocal(idSesionCiclo("ana", 1, 1), a).actualizado).toBe(0);
    });

    it("aguanta que localStorage no exista (modo incógnito)", () => {
        expect(() => leerLocal(idSesionCiclo("ana", 1, 1), null)).not.toThrow();
    });
});

describe("guardarLocal", () => {
    it("no lanza si el almacén falla por cuota llena", () => {
        const roto: AlmacenLocal = {
            getItem: () => null,
            setItem: () => { throw new Error("QuotaExceededError"); },
        };
        expect(() => guardarLocal(idSesionCiclo("ana", 1, 1), { checks: {}, notas: {}, pesos: {} }, roto)).not.toThrow();
    });
});

describe("servidorEsMasReciente", () => {
    const local = { checks: {}, notas: {}, pesos: {}, actualizado: 100 };

    it("el servidor gana si es más nuevo", () => {
        expect(servidorEsMasReciente({ actualizadoCliente: 200 }, local)).toBe(true);
    });

    it("NO pisa lo local si el servidor es más viejo: es el caso sin señal", () => {
        expect(servidorEsMasReciente({ actualizadoCliente: 50 }, local)).toBe(false);
    });

    it("en empate conserva lo local", () => {
        expect(servidorEsMasReciente({ actualizadoCliente: 100 }, local)).toBe(false);
    });

    it("un servidor sin marca nunca gana", () => {
        expect(servidorEsMasReciente({}, local)).toBe(false);
    });

    it("gana en un dispositivo nuevo, que no tiene copia local", () => {
        expect(servidorEsMasReciente({ actualizadoCliente: 1 }, { checks: {}, notas: {}, pesos: {}, actualizado: 0 })).toBe(true);
    });
});

describe("contarCompletados", () => {
    it("cuenta solo lo marcado", () => {
        expect(contarCompletados({ 0: true, 1: false, 2: true }, 3)).toBe(2);
    });

    it("ignora bloques que ya no existen si la entrenadora recortó el día", () => {
        expect(contarCompletados({ 0: true, 1: true, 7: true }, 3)).toBe(2);
    });

    it("no cuenta nada sin checks", () => {
        expect(contarCompletados({}, 4)).toBe(0);
    });

    it("nunca supera el total de bloques", () => {
        expect(contarCompletados({ 0: true, 1: true, 2: true }, 2)).toBeLessThanOrEqual(2);
    });
});

describe("idSesionLibre", () => {
    it("lleva la fecha: repetir la misma rutina otro día es otra sesión", () => {
        expect(idSesionLibre("ana", "r1", "2026-08-14"))
            .not.toBe(idSesionLibre("ana", "r1", "2026-08-21"));
    });

    it("el mismo día y la misma rutina reabren la misma sesión", () => {
        expect(idSesionLibre("ana", "r1", "2026-08-14"))
            .toBe(idSesionLibre("ana", "r1", "2026-08-14"));
    });

    it("separa rutinas distintas del mismo día", () => {
        expect(idSesionLibre("ana", "r1", "2026-08-14"))
            .not.toBe(idSesionLibre("ana", "r2", "2026-08-14"));
    });

    it("no colisiona con los ids del ciclo", () => {
        expect(idSesionLibre("ana", "1", "2026-08-14")).not.toBe(idSesionCiclo("ana", 1, 1));
    });
});

describe("fechaISOLocal", () => {
    it("usa el día local, no el UTC", () => {
        // A las 23:00 en un huso negativo, UTC ya sería el día siguiente.
        expect(fechaISOLocal(new Date(2026, 7, 14, 23, 30))).toBe("2026-08-14");
    });

    it("rellena mes y día con cero", () => {
        expect(fechaISOLocal(new Date(2026, 0, 5))).toBe("2026-01-05");
    });
});
