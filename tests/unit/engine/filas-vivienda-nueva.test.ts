// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ILEGIBLE,
  NO_LO_DICE,
} from "../../../src/engine/vivienda-nueva/edicion";
import {
  aFila,
  asignarSlugs,
  CLAVES_FILA,
  cargaDeEdicion,
  deFila,
  muestraDeRevision,
} from "../../../src/engine/vivienda-nueva/filas";
import type { ProyectoUnico } from "../../../src/engine/vivienda-nueva/lectura";

// El proyecto procesado ↔ la fila de la base: ida y vuelta sin perder ni inventar nada. Datos 100 % sintéticos.

function proyecto(extra: Partial<ProyectoUnico> = {}): ProyectoUnico {
  return {
    nombre: "Proyecto de Prueba",
    constructora: "Constructora de Prueba",
    tipo: "apartamento",
    ciudad: "Bogotá",
    sector: "Suba",
    segmento: "VIS",
    precio_desde: 250_000_000,
    area_construida_desde: 56,
    area_construida_hasta: 62.5,
    area_privada_desde: 50,
    area_privada_hasta: null,
    etapa: "en_construccion",
    entrega: "2028-12",
    entrega_precision: "semestre",
    parqueadero: "adicional",
    parqueadero_precio: 25_000_000,
    precio_fijo: "si",
    subsidio_anunciado: NO_LO_DICE,
    rotulos: ["lanzamiento", "descuento"],
    apariciones: [4, 12],
    region: "bogota",
    clave: "constructora de prueba|proyecto de prueba",
    en_conflicto: [],
    ...extra,
  } as ProyectoUnico;
}

describe("aFila / deFila", () => {
  it("ida y vuelta de un proyecto completo", () => {
    const p = proyecto();
    expect(deFila(aFila(p, "proyecto-de-prueba"))).toEqual(p);
  });

  it("«el aviso no lo dice» es NULL en la base y vuelve como «no_lo_dice»; «ilegible» se conserva aparte", () => {
    const p = proyecto({
      precio_desde: NO_LO_DICE,
      area_privada_desde: ILEGIBLE,
      area_construida_hasta: ILEGIBLE,
      area_construida_desde: NO_LO_DICE,
    });
    const f = aFila(p, "x");
    expect(f.precio_desde).toBeNull();
    expect(f.area_privada_desde).toBeNull();
    expect(f.ilegibles.sort()).toEqual([
      "area_construida_hasta",
      "area_privada_desde",
    ]);
    expect(deFila(f)).toEqual(p);
  });

  it("un campo en conflicto viaja a la base y vuelve; sin conflictos es una lista vacía", () => {
    const p = proyecto({ en_conflicto: ["area_privada_desde", "ciudad"] });
    expect(aFila(p, "x").en_conflicto).toEqual([
      "area_privada_desde",
      "ciudad",
    ]);
    expect(deFila(aFila(p, "x")).en_conflicto).toEqual([
      "area_privada_desde",
      "ciudad",
    ]);
    const sinCampo = proyecto();
    delete (sinCampo as { en_conflicto?: unknown }).en_conflicto;
    expect(aFila(sinCampo, "x").en_conflicto).toEqual([]);
  });

  it("la fila lleva solo las columnas de la lista blanca: ni notas del lector ni nada fuera de la lista", () => {
    expect(Object.keys(aFila(proyecto(), "x")).sort()).toEqual(
      [...CLAVES_FILA].sort(),
    );
    expect(new Set(CLAVES_FILA).size).toBe(CLAVES_FILA.length);
  });
});

describe("asignarSlugs", () => {
  const base = (
    nombre: string,
    constructora: string,
    clave: string,
    pag = 1,
  ) => ({
    nombre,
    constructora,
    clave,
    apariciones: [pag],
  });

  it("un nombre da su slug; si choca, suma la constructora; si aún choca, un número", () => {
    const m = asignarSlugs([
      base("Alba", "Uno S.A.S.", "uno|alba"),
      base("Alba", "Dos", "dos|alba"),
      base("Alba", "Dos", "dos|alba 2"),
      base("Mistral", "Uno S.A.S.", "uno|mistral"),
    ]);
    expect(m.get("dos|alba")).toBe("alba");
    expect(m.get("dos|alba 2")).toBe("alba-dos");
    expect(m.get("uno|alba")).toBe("alba-uno-s-a-s");
    expect(m.get("uno|mistral")).toBe("mistral");
    expect(new Set(m.values()).size).toBe(4);
    for (const s of m.values()) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("el resultado no depende del orden en que llegan los proyectos", () => {
    const a = [
      base("Alba", "Uno", "uno|alba"),
      base("Alba", "Dos", "dos|alba"),
    ];
    expect([...asignarSlugs(a)]).toEqual([...asignarSlugs([...a].reverse())]);
  });

  it("un nombre ilegible usa la página de su aparición", () => {
    const m = asignarSlugs([base(ILEGIBLE, "Uno", "p7#2", 7)]);
    expect(m.get("p7#2")).toBe("proyecto-p7");
  });

  it("tildes y signos desaparecen del slug", () => {
    const m = asignarSlugs([base("Reserva de Cajicá 2", "A", "a|reserva")]);
    expect(m.get("a|reserva")).toBe("reserva-de-cajica-2");
  });
});

describe("muestraDeRevision (G5)", () => {
  const claves = Array.from({ length: 40 }, (_, i) => `c|p${i}`);

  it("5 claves distintas de la lista, en orden, y la misma con la misma semilla", () => {
    const m = muestraDeRevision(claves, 187);
    expect(m).toHaveLength(5);
    expect(new Set(m).size).toBe(5);
    for (const c of m) expect(claves).toContain(c);
    expect([...m].sort()).toEqual(m);
    expect(muestraDeRevision([...claves].reverse(), 187)).toEqual(m);
  });

  it("otra semilla da otra muestra; con menos proyectos que n devuelve todos", () => {
    expect(muestraDeRevision(claves, 188)).not.toEqual(
      muestraDeRevision(claves, 187),
    );
    expect(muestraDeRevision(["a", "b"], 187)).toEqual(["a", "b"]);
    expect(muestraDeRevision([], 187)).toEqual([]);
  });
});

describe("cargaDeEdicion", () => {
  it("lleva la edición, un slug por proyecto y la muestra con su semilla (por omisión, el número de la edición)", () => {
    const proyectos = Array.from({ length: 12 }, (_, i) =>
      proyecto({ nombre: `Proyecto ${i}`, clave: `c|proyecto ${i}` }),
    );
    const c = cargaDeEdicion(
      {
        numero: 187,
        nombre: "Estrenar Vivienda",
        desde: "2026-10-15",
        hasta: "2026-11-15",
      },
      68,
      proyectos,
    );
    expect(c).toMatchObject({ numero: 187, paginas: 68, muestra_semilla: 187 });
    expect(c.proyectos).toHaveLength(12);
    expect(c.muestra_claves).toHaveLength(5);
    for (const k of c.muestra_claves) {
      expect(c.proyectos.map((f) => f.clave)).toContain(k);
    }
    expect(new Set(c.proyectos.map((f) => f.slug)).size).toBe(12);
  });
});
