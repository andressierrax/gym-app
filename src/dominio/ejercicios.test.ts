import { describe, it, expect } from "vitest";
import { tipoDeArchivo, esVideo, separarBiblioteca, estaVencido, esTemporal } from "./ejercicios";

describe("tipoDeArchivo", () => {
    it("reconoce imágenes", () => {
        expect(tipoDeArchivo("image/gif")).toBe("imagen");
        expect(tipoDeArchivo("image/png")).toBe("imagen");
    });

    it("reconoce vídeo", () => {
        expect(tipoDeArchivo("video/mp4")).toBe("video");
        expect(tipoDeArchivo("video/webm")).toBe("video");
    });

    it("rechaza cualquier otra cosa", () => {
        expect(tipoDeArchivo("application/pdf")).toBeNull();
        expect(tipoDeArchivo("")).toBeNull();
    });
});

describe("esVideo", () => {
    it("es video solo si tipo === 'video'", () => {
        expect(esVideo({ tipo: "video" })).toBe(true);
        expect(esVideo({ tipo: "imagen" })).toBe(false);
    });

    it("ausente equivale a imagen: los ejercicios de antes de aceptar vídeo no migran", () => {
        expect(esVideo({})).toBe(false);
        expect(esVideo(undefined)).toBe(false);
    });
});

describe("ejercicios temporales", () => {
    const hoy = "2026-11-10";
    const lista = [
        { id: "a" },
        { id: "b", temporal: true, venceEl: "2026-12-08" },
        { id: "c", temporal: true, venceEl: hoy },
        { id: "d", temporal: true, venceEl: "2026-11-09" },
    ];

    it("separa los de siempre de los temporales vigentes y vencidos", () => {
        const r = separarBiblioteca(lista, hoy);
        expect(r.permanentes.map(e => e.id)).toEqual(["a"]);
        expect(r.vigentes.map(e => e.id)).toEqual(["b", "c"]);
        expect(r.vencidos.map(e => e.id)).toEqual(["d"]);
    });

    it("el día de vencimiento todavía se puede asignar", () => {
        expect(estaVencido({ temporal: true, venceEl: hoy }, hoy)).toBe(false);
    });

    it("un ejercicio normal nunca vence", () => {
        expect(estaVencido({ venceEl: "2000-01-01" }, hoy)).toBe(false);
        expect(esTemporal({})).toBe(false);
    });
});
