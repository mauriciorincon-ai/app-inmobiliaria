// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  alternarSeleccion,
  columnasComparar,
  precioPorM2,
  puedeComparar,
  TOPE_COMPARAR,
  type AnuncioComparable,
} from "@/engine/guardados/comparar";
import {
  alternarFavorito,
  esSlug,
  leerFavoritos,
  serializarFavoritos,
  TOPE_FAVORITOS,
  unirFavoritos,
} from "@/engine/guardados/favoritos";

// S9 — favoritos del teléfono y comparar. Datos sintéticos.

describe("favoritos del teléfono", () => {
  it("leer nunca lanza: lo raro es una lista vacía", () => {
    for (const malo of [
      null,
      undefined,
      "",
      "no es json",
      "{}",
      "42",
      '"texto"',
    ]) {
      expect(leerFavoritos(malo), String(malo)).toEqual([]);
    }
  });

  it("descarta lo que no es un slug, quita repetidos y conserva el orden", () => {
    expect(
      leerFavoritos(
        JSON.stringify(["casa-a1", "casa-a1", "MAL", 3, null, "apto-b2", "x"]),
      ),
    ).toEqual(["casa-a1", "apto-b2"]);
  });

  it("el tope es 100", () => {
    const muchos = Array.from({ length: 150 }, (_, i) => `anuncio-${i}`);
    expect(leerFavoritos(JSON.stringify(muchos))).toHaveLength(TOPE_FAVORITOS);
    expect(unirFavoritos(muchos)[0]).toBe("anuncio-0");
  });

  it("guardar pone el nuevo primero; volver a tocarlo lo quita", () => {
    const a = alternarFavorito(["casa-a1"], "apto-b2");
    expect(a).toEqual({ slugs: ["apto-b2", "casa-a1"], guardado: true });
    expect(alternarFavorito(a.slugs, "casa-a1")).toEqual({
      slugs: ["apto-b2"],
      guardado: false,
    });
  });

  it("unir: la primera lista manda, sin repetidos", () => {
    expect(unirFavoritos(["b-11", "a-11"], ["a-11", "c-11"])).toEqual([
      "b-11",
      "a-11",
      "c-11",
    ]);
  });

  it("serializar y leer son inversos", () => {
    const slugs = ["casa-a1", "apto-b2"];
    expect(leerFavoritos(serializarFavoritos(slugs))).toEqual(slugs);
  });

  it("esSlug", () => {
    expect(esSlug("apartamento-los-rosales-1a2b3c")).toBe(true);
    expect(esSlug("ab")).toBe(false);
    expect(esSlug("Con Mayúsculas")).toBe(false);
    expect(esSlug(7)).toBe(false);
  });
});

describe("comparar", () => {
  const AHORA = new Date("2026-10-18T15:00:00Z");
  const anuncio = (
    slug: string,
    cambios: Partial<AnuncioComparable> = {},
  ): AnuncioComparable => ({
    slug,
    barrio: "Los Rosales",
    precio_esperado: 1_150_000_000,
    area_m2: 118,
    habitaciones: 3,
    nivel_verificacion: "verificado",
    ctl_expedido_el: "2026-10-03",
    // Confirmado hace 2 días (vigente_hasta = confirmación + 60 d).
    vigente_hasta: "2026-12-15T15:00:00Z",
    ...cambios,
  });

  it("hasta 4: el quinto no entra y lo avisa", () => {
    let sel: string[] = [];
    for (const s of ["a-11", "b-11", "c-11", "d-11"]) {
      sel = alternarSeleccion(sel, s).seleccion;
    }
    expect(sel).toHaveLength(TOPE_COMPARAR);
    expect(alternarSeleccion(sel, "e-11")).toEqual({
      seleccion: sel,
      tope: true,
    });
    // Quitar uno deja sitio.
    const menos = alternarSeleccion(sel, "a-11").seleccion;
    expect(alternarSeleccion(menos, "e-11").seleccion).toContain("e-11");
  });

  it("comparar pide al menos 2", () => {
    expect(puedeComparar(["a-11"])).toBe(false);
    expect(puedeComparar(["a-11", "b-11"])).toBe(true);
  });

  it("precio por m², redondeado; sin área no hay división", () => {
    expect(precioPorM2(1_150_000_000, 118)).toBe(9_745_763);
    expect(precioPorM2(1, 0)).toBeNull();
    expect(precioPorM2(Number.NaN, 10)).toBeNull();
  });

  it("una columna por anuncio, en el orden de la selección, con sello y «vivo hace»", () => {
    const cols = columnasComparar(
      [
        anuncio("rosales-11"),
        anuncio("nogal-11", {
          nivel_verificacion: "fundador",
          ctl_expedido_el: null,
          precio_esperado: 980_000_000,
          area_m2: 96,
        }),
        anuncio("chico-11", { ctl_expedido_el: null }),
      ],
      ["nogal-11", "rosales-11", "chico-11", "ya-no-esta"],
      AHORA,
    );
    expect(cols.map((c) => c.slug)).toEqual([
      "nogal-11",
      "rosales-11",
      "chico-11",
    ]);
    expect(cols[0]).toMatchObject({
      sello: "fundador",
      precioPorM2: 10_208_333,
    });
    expect(cols[1]).toMatchObject({ sello: "verificado", vivoDias: 2 });
    expect(cols[2].sello).toBe("reverificacion_pendiente");
  });
});
