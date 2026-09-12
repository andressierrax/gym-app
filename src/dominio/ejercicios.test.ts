import { describe, it, expect } from "vitest";
import { tipoDeArchivo, esVideo } from "./ejercicios";

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
