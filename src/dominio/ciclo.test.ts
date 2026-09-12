import { describe, it, expect } from "vitest";
import {
    acotarDuracion,
    diaDelCiclo,
    faseDeCiclo,
    estadoDelCiclo,
    diasDesde,
    estimacionCaducada,
    FASES,
    DURACION_MINIMA,
    DURACION_MAXIMA,
} from "./ciclo";

const dia = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe("acotarDuracion", () => {
    it("respeta las duraciones normales", () => {
        expect(acotarDuracion(28)).toBe(28);
        expect(acotarDuracion(31)).toBe(31);
    });

    it("recorta lo que está fuera de rango en vez de estimar disparates", () => {
        expect(acotarDuracion(3)).toBe(DURACION_MINIMA);
        expect(acotarDuracion(200)).toBe(DURACION_MAXIMA);
    });

    it("aguanta valores inválidos", () => {
        expect(acotarDuracion(NaN)).toBe(28);
        expect(acotarDuracion(Number.POSITIVE_INFINITY)).toBe(28);
    });
});

describe("diaDelCiclo", () => {
    it("el primer día de regla es el día 1, no el 0", () => {
        expect(diaDelCiclo(dia(2026, 8, 1), dia(2026, 8, 1))).toBe(1);
    });

    it("avanza un día por día", () => {
        expect(diaDelCiclo(dia(2026, 8, 1), dia(2026, 8, 5))).toBe(5);
    });

    it("da la vuelta al superar la duración", () => {
        expect(diaDelCiclo(dia(2026, 8, 1), dia(2026, 8, 29), 28)).toBe(1);
        expect(diaDelCiclo(dia(2026, 8, 1), dia(2026, 8, 30), 28)).toBe(2);
    });

    it("ignora la hora del día", () => {
        const manana = new Date(2026, 7, 5, 7, 30);
        const noche = new Date(2026, 7, 5, 23, 45);
        expect(diaDelCiclo(dia(2026, 8, 1), manana)).toBe(diaDelCiclo(dia(2026, 8, 1), noche));
    });

    it("una fecha futura no produce días negativos", () => {
        expect(diaDelCiclo(dia(2026, 9, 1), dia(2026, 8, 1))).toBe(1);
    });

    it("cruza bien el cambio de mes", () => {
        expect(diaDelCiclo(dia(2026, 7, 30), dia(2026, 8, 2))).toBe(4);
    });
});

describe("faseDeCiclo", () => {
    it("los primeros días son menstruación", () => {
        for (const d of [1, 2, 3, 4, 5]) expect(faseDeCiclo(d, 28)).toBe("menstrual");
    });

    it("después viene la folicular", () => {
        expect(faseDeCiclo(8, 28)).toBe("folicular");
    });

    it("la ovulación cae hacia el día 14 en un ciclo de 28", () => {
        expect(faseDeCiclo(14, 28)).toBe("ovulacion");
    });

    it("y el final del ciclo es la lútea", () => {
        expect(faseDeCiclo(25, 28)).toBe("lutea");
    });

    it("la ovulación se desplaza en ciclos largos, no se queda en el día 14", () => {
        // En un ciclo de 35 días la ovulación es hacia el 21, no el 14.
        expect(faseDeCiclo(21, 35)).toBe("ovulacion");
        expect(faseDeCiclo(14, 35)).toBe("folicular");
    });

    it("y se adelanta en ciclos cortos", () => {
        expect(faseDeCiclo(21, 35)).toBe("ovulacion");
        expect(faseDeCiclo(10, 24)).toBe("ovulacion");
    });

    it("toda la duración del ciclo tiene una fase asignada", () => {
        for (let d = DURACION_MINIMA; d <= DURACION_MAXIMA; d++) {
            for (let i = 1; i <= d; i++) {
                expect(Object.keys(FASES)).toContain(faseDeCiclo(i, d));
            }
        }
    });
});

describe("estadoDelCiclo", () => {
    it("devuelve todo lo que la pantalla necesita", () => {
        const e = estadoDelCiclo(dia(2026, 8, 1), dia(2026, 8, 3));
        expect(e.dia).toBe(3);
        expect(e.fase).toBe("menstrual");
        expect(e.etiqueta).toBe("Menstruación");
        expect(e.nota).toBeTruthy();
    });

    it("cada fase trae etiqueta y nota", () => {
        for (const f of Object.values(FASES)) {
            expect(f.etiqueta).toBeTruthy();
            expect(f.nota).toBeTruthy();
        }
    });
});

describe("caducidad de la estimación", () => {
    it("no caduca dentro del ciclo", () => {
        expect(estimacionCaducada(dia(2026, 8, 1), dia(2026, 8, 20), 28)).toBe(false);
    });

    it("caduca si se pasó un ciclo entero sin actualizar", () => {
        expect(estimacionCaducada(dia(2026, 8, 1), dia(2026, 9, 5), 28)).toBe(true);
    });

    it("diasDesde no devuelve negativos", () => {
        expect(diasDesde(dia(2026, 9, 1), dia(2026, 8, 1))).toBe(0);
    });
});
