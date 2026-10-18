import { describe, it, expect } from "vitest";
import {
  SECTORES,
  claveBarrio,
  sectorPorCodigo,
  sectorPorNombre,
  sectoresDeLocalidad,
} from "@/engine/zonas/sectores";
import { LOCALIDADES } from "@/engine/zonas/localidades";

describe("catálogo de sectores (Catastro Bogotá, versión 09.26)", () => {
  it("trae los 1 230 sectores, con código único de 6 dígitos", () => {
    expect(SECTORES).toHaveLength(1230);
    expect(new Set(SECTORES.map((s) => s.codigo)).size).toBe(1230);
    for (const s of SECTORES) expect(s.codigo).toMatch(/^\d{6}$/);
  });

  it("toda localidad es una de las 19 del wizard o Sumapaz (rural, que no se ofrece)", () => {
    const validas = new Set<string>([...LOCALIDADES, "Sumapaz"]);
    for (const s of SECTORES)
      expect(validas.has(s.localidad), s.codigo).toBe(true);
    // Las 19 del wizard tienen al menos un barrio que elegir.
    for (const l of LOCALIDADES) {
      expect(sectoresDeLocalidad(l).length, l).toBeGreaterThan(0);
    }
  });

  it("el nombre identifica al sector dentro de su localidad (lo que usa el trigger de la BD)", () => {
    const llaves = SECTORES.map(
      (s) => `${s.localidad}|${claveBarrio(s.nombre)}`,
    );
    expect(new Set(llaves).size).toBe(SECTORES.length);
  });

  it("los nombres caben en el campo `barrio` (2 a 80 caracteres) y los tipos son los tres conocidos", () => {
    for (const s of SECTORES) {
      expect(s.nombre.length, s.codigo).toBeGreaterThanOrEqual(2);
      expect(s.nombre.length, s.codigo).toBeLessThanOrEqual(80);
      expect(["urbano", "rural", "mixto"]).toContain(s.tipo);
    }
  });

  it("los barrios de la maqueta están y en su localidad", () => {
    expect(sectorPorCodigo("008304")).toMatchObject({
      nombre: "Los Rosales",
      localidad: "Chapinero",
    });
    expect(sectorPorCodigo("008311")).toMatchObject({
      nombre: "El Nogal",
      localidad: "Chapinero",
    });
    expect(sectorPorCodigo("008407")).toMatchObject({
      nombre: "Usaquén",
      localidad: "Usaquén",
    });
    expect(sectorPorCodigo("999999")).toBeUndefined();
  });

  it("sectoresDeLocalidad ofrece urbanos y mixtos, no veredas, en orden alfabético", () => {
    const chapinero = sectoresDeLocalidad("Chapinero");
    expect(
      chapinero.every((s) => s.localidad === "Chapinero" && s.tipo !== "rural"),
    ).toBe(true);
    const nombres = chapinero.map((s) => s.nombre);
    expect(nombres).toEqual(
      [...nombres].sort((a, b) => a.localeCompare(b, "es")),
    );
    expect(
      sectoresDeLocalidad("Sumapaz").every((s) => s.tipo !== "rural"),
    ).toBe(true);
    expect(sectoresDeLocalidad("Atlántida")).toEqual([]);
  });

  it("sectorPorNombre empareja sin tildes ni mayúsculas, solo dentro de la localidad", () => {
    expect(sectorPorNombre("Chapinero", "LOS ROSALES")?.codigo).toBe("008304");
    expect(sectorPorNombre("Usaquén", "usaquen")?.codigo).toBe("008407");
    expect(sectorPorNombre("Kennedy", "Los Rosales")).toBeUndefined();
    expect(sectorPorNombre("Chapinero", "Barrio Inventado")).toBeUndefined();
  });

  it("claveBarrio quita tildes y eñes, signos y espacios de más", () => {
    expect(claveBarrio("  Chicó  Norte II-Sector (2) ")).toBe(
      "chico norte ii sector 2",
    );
    expect(claveBarrio("Cañaveralejo")).toBe("canaveralejo");
  });
});
