import { describe, it, expect } from "vitest";
import type { Bloque, Plan } from "./tipos";
import {
    idPlan,
    clonarBloques,
    planesDelHueco,
    planesFueraDeCiclo,
    agruparPorCliente,
    formatearPrescripcion,
} from "./planes";

const plan = (p: Partial<Plan> & { id: string }): Plan =>
    ({ clienteId: "ana", semana: 1, dia: 1, ...p });

describe("idPlan", () => {
    it("es el mismo para el mismo hueco, venga como número o como cadena", () => {
        expect(idPlan("ana", "1", "1")).toBe(idPlan("ana", 1, 1));
    });

    it("no confunde S1D10 con S10D1", () => {
        expect(idPlan("ana", 1, 10)).not.toBe(idPlan("ana", 10, 1));
    });
});

describe("clonarBloques", () => {
    it("editar la copia no toca la plantilla original", () => {
        const plantilla = [{ titulo: "A", contenido: "x" }];
        const copia = clonarBloques(plantilla);
        copia[0]!.titulo = "MODIFICADO";
        expect(plantilla[0]!.titulo).toBe("A");
    });

    it("también clona los ejercicios en profundidad", () => {
        const plantilla = [{
            titulo: "A", contenido: "",
            ejercicios: [{ ejercicioId: "e1", nombre: "Sentadilla", gifUrl: "", series: "4", reps: "10", peso: "" }],
        }];
        const copia = clonarBloques(plantilla);
        copia[0]!.ejercicios![0]!.series = "99";
        expect(plantilla[0]!.ejercicios![0]!.series).toBe("4");
    });

    it("devuelve un bloque inicial si no hay nada", () => {
        expect(clonarBloques(undefined)).toHaveLength(1);
        expect(clonarBloques([])).toHaveLength(1);
    });
});

describe("planesDelHueco", () => {
    const planes = [
        plan({ id: "a3", nombreDia: "v3" }),
        plan({ id: "a1", nombreDia: "v1" }),
        plan({ id: "eva1", clienteId: "eva" }),
        plan({ id: "otro", semana: 2 }),
    ];

    it("encuentra los duplicados del mismo hueco", () => {
        expect(planesDelHueco(planes, "ana", 1, 1).map(p => p.id)).toEqual(["a3", "a1"]);
    });

    it("no toca los planes de otra clienta", () => {
        expect(planesDelHueco(planes, "ana", 1, 1).some(p => p.clienteId === "eva")).toBe(false);
    });

    it("compara bien aunque semana y día lleguen como cadena del <select>", () => {
        expect(planesDelHueco(planes, "ana", "1", "1")).toHaveLength(2);
    });

    it("sin clienta seleccionada no devuelve nada", () => {
        expect(planesDelHueco(planes, "", 1, 1)).toEqual([]);
    });
});

describe("planesFueraDeCiclo", () => {
    it("detecta los planes que la clienta no puede abrir", () => {
        const planes = [plan({ id: "ok" }), plan({ id: "s9", semana: 9 }), plan({ id: "d8", dia: 8 })];
        expect(planesFueraDeCiclo(planes).map(p => p.id)).toEqual(["s9", "d8"]);
    });

    it("no marca nada si todo está dentro del ciclo", () => {
        expect(planesFueraDeCiclo([plan({ id: "ok", semana: 4, dia: 5 })])).toEqual([]);
    });
});

describe("agruparPorCliente", () => {
    const planes = [
        plan({ id: "p1", clienteId: "ana", semana: 2, dia: 1 }),
        plan({ id: "p2", clienteId: "eva", semana: 1, dia: 1 }),
        plan({ id: "p3", clienteId: "ana", semana: 1, dia: 3 }),
        plan({ id: "p4", clienteId: "ana", semana: 1, dia: 1 }),
    ];
    const clientes = [{ id: "ana", name: "Ana" }, { id: "eva", name: "Eva" }];

    it("agrupa y ordena alfabéticamente por defecto", () => {
        expect(agruparPorCliente(planes, clientes, "").map(g => g.nombre)).toEqual(["Ana", "Eva"]);
    });

    it("pone primero a la clienta seleccionada", () => {
        expect(agruparPorCliente(planes, clientes, "eva").map(g => g.nombre)).toEqual(["Eva", "Ana"]);
    });

    it("ordena los planes por semana y día", () => {
        const grupo = agruparPorCliente(planes, clientes, "")[0]!;
        expect(grupo.planes.map(p => p.id)).toEqual(["p4", "p3", "p1"]);
    });

    it("no rompe si falta el nombre de la clienta", () => {
        expect(agruparPorCliente(planes, [], "")[0]!.nombre).toBe("clienta desconocida");
    });
});

describe("formatearPrescripcion", () => {
    const ej = (p: Partial<Parameters<typeof formatearPrescripcion>[0]>) =>
        formatearPrescripcion({ ejercicioId: "e", nombre: "X", gifUrl: "", series: "", reps: "", peso: "", ...p });

    it("junta series, reps y peso", () => {
        expect(ej({ series: "4", reps: "10", peso: "20kg" })).toBe("4 series · 10 reps · 20kg");
    });

    it("omite lo que la entrenadora dejó vacío", () => {
        expect(ej({ series: "3", reps: "15" })).toBe("3 series · 15 reps");
    });

    it("avisa si no hay prescripción", () => {
        expect(ej({})).toBe("Sin prescripción");
    });
});

describe("compatibilidad con los planes ya guardados", () => {
    it("un bloque antiguo sin `ejercicios` no rompe nada", () => {
        // Forma exacta de los planes que ya están guardados en producción.
        const antiguo: Bloque = { titulo: "SET #1", contenido: "Sentadilla 4x10" };
        expect(antiguo.ejercicios ?? []).toEqual([]);
        expect(clonarBloques([antiguo])[0]!.contenido).toBe("Sentadilla 4x10");
    });
});

describe("la semana de adaptación no invalida lo ya guardado", () => {
    it("los planes de las semanas 1 a 4 siguen dentro del ciclo", () => {
        const previos = [1, 2, 3, 4].map(s => plan({ id: `s${s}`, semana: s }));
        expect(planesFueraDeCiclo(previos)).toEqual([]);
    });

    it("un plan de adaptación es válido y tiene su propio id", () => {
        expect(planesFueraDeCiclo([plan({ id: "a", semana: 0 })])).toEqual([]);
        expect(idPlan("ana", 0, 1)).toBe("ana_S0D1");
        expect(idPlan("ana", 0, 1)).not.toBe(idPlan("ana", 1, 1));
    });

    it("la adaptación y la semana 1 son huecos distintos", () => {
        const planes = [plan({ id: "adap", semana: 0 }), plan({ id: "s1", semana: 1 })];
        expect(planesDelHueco(planes, "ana", 0, 1).map(p => p.id)).toEqual(["adap"]);
        expect(planesDelHueco(planes, "ana", 1, 1).map(p => p.id)).toEqual(["s1"]);
    });
});
