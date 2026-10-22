// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  EDICION,
  ILEGIBLE,
  NO_LO_DICE,
  validarLectura,
} from "../../../src/engine/vivienda-nueva/edicion";

// El esquema de la edición de la revista: lo que SÍ pasa y, sobre todo, lo que JAMÁS pasa (gate propio nuevo,
// regla 15): un teléfono, una dirección, una web o un campo extra tienen que caer. Datos 100 % sintéticos.

function proyecto(extra: Record<string, unknown> = {}) {
  return {
    pagina: 60,
    posicion: 1,
    nombre: "Proyecto de ejemplo",
    constructora: "Constructora de ejemplo",
    tipo: "apartamento",
    ciudad: "Villeta",
    sector: NO_LO_DICE,
    segmento: "VIS",
    precio_desde: 230_000_000,
    area_construida_desde: 48,
    area_construida_hasta: null,
    area_privada_desde: 44.37,
    area_privada_hasta: null,
    etapa: NO_LO_DICE,
    entrega: NO_LO_DICE,
    entrega_precision: null,
    parqueadero: NO_LO_DICE,
    parqueadero_precio: null,
    precio_fijo: NO_LO_DICE,
    subsidio_anunciado: NO_LO_DICE,
    rotulos: ["lanzamiento"],
    ...extra,
  };
}

function lectura(
  p: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
  return {
    edicion: EDICION.numero,
    lector: "L1",
    paginas: [
      { pagina: 60, tipo: "directorio", proyectos: [p], avisos_al_agente: [] },
    ],
    ...extra,
  };
}

function errores(entrada: unknown): string[] {
  const r = validarLectura(entrada);
  return r.ok ? [] : r.errores;
}

describe("validarLectura — lo que pasa", () => {
  it("acepta un proyecto completo", () => {
    expect(validarLectura(lectura(proyecto())).ok).toBe(true);
  });

  it("acepta «no_lo_dice» e «ilegible» en los campos que los admiten, y `null` en los «hasta»", () => {
    const p = proyecto({
      nombre: ILEGIBLE,
      constructora: NO_LO_DICE,
      precio_desde: NO_LO_DICE,
      area_privada_desde: ILEGIBLE,
      area_privada_hasta: ILEGIBLE,
    });
    expect(validarLectura(lectura(p)).ok).toBe(true);
  });

  it("acepta una fecha de entrega con su precisión, y «inmediata» sin ella", () => {
    expect(
      validarLectura(
        lectura(
          proyecto({ entrega: "2028-12", entrega_precision: "semestre" }),
        ),
      ).ok,
    ).toBe(true);
    expect(
      validarLectura(
        lectura(proyecto({ entrega: "inmediata", entrega_precision: null })),
      ).ok,
    ).toBe(true);
  });

  it("acepta el parqueadero adicional con su precio aparte", () => {
    expect(
      validarLectura(
        lectura(
          proyecto({
            parqueadero: "adicional",
            parqueadero_precio: 25_000_000,
          }),
        ),
      ).ok,
    ).toBe(true);
  });
});

describe("validarLectura — lo que JAMÁS pasa", () => {
  it.each([
    ["una web en el nombre", { nombre: "Torres www.ejemplo.com" }, "lleva_web"],
    [
      "un correo en la constructora",
      { constructora: "info@ejemplo.test" },
      "lleva_web",
    ],
    [
      "un teléfono en una nota",
      { notas_crudo: "llamar al 300 000 0000" },
      "lleva_telefono",
    ],
    [
      "una dirección en el sector",
      { sector: "Calle 18 No. 12 - 27" },
      "lleva_direccion",
    ],
    [
      "una carrera en una nota",
      { notas_crudo: "sala en la Carrera 7 # 45" },
      "lleva_direccion",
    ],
  ])("rechaza %s", (_c, campo, codigo) => {
    expect(errores(lectura(proyecto(campo))).join("|")).toContain(codigo);
  });

  it("rechaza un campo que el esquema no conoce (un contacto no cabe)", () => {
    expect(
      errores(lectura(proyecto({ telefono: "3000000000" }))).join("|"),
    ).toContain("Unrecognized key");
    expect(
      errores(lectura(proyecto({ sala_de_ventas: "Km. 1 Vía Bagazal" }))).join(
        "|",
      ),
    ).toContain("Unrecognized key");
  });

  it("rechaza «no» en precio fijo y en subsidio: solo se dice «si» o no se dice", () => {
    expect(
      errores(lectura(proyecto({ precio_fijo: "no" }))).length,
    ).toBeGreaterThan(0);
    expect(
      errores(lectura(proyecto({ subsidio_anunciado: "no" }))).length,
    ).toBeGreaterThan(0);
  });

  it("rechaza un rótulo fuera de la lista cerrada", () => {
    expect(
      errores(lectura(proyecto({ rotulos: ["el mejor del mercado"] }))).length,
    ).toBeGreaterThan(0);
  });

  it("rechaza un precio imposible", () => {
    expect(
      errores(lectura(proyecto({ precio_desde: 340 }))).length,
    ).toBeGreaterThan(0);
    expect(
      errores(lectura(proyecto({ precio_desde: 230_000_000.5 }))).length,
    ).toBeGreaterThan(0);
  });

  it("rechaza un «hasta» menor que el «desde»", () => {
    expect(
      errores(
        lectura(
          proyecto({ area_construida_desde: 60, area_construida_hasta: 50 }),
        ),
      ).join("|"),
    ).toContain("hasta_menor_que_desde");
    expect(
      errores(
        lectura(proyecto({ area_privada_desde: 60, area_privada_hasta: 50 })),
      ).join("|"),
    ).toContain("hasta_menor_que_desde");
  });

  it("rechaza un área privada mayor que la construida", () => {
    expect(
      errores(
        lectura(
          proyecto({ area_construida_desde: 40, area_privada_desde: 45 }),
        ),
      ).join("|"),
    ).toContain("privada_mayor_que_construida");
  });

  it("rechaza una fecha de entrega sin precisión y una precisión sin fecha", () => {
    expect(
      errores(
        lectura(proyecto({ entrega: "2028-12", entrega_precision: null })),
      ).join("|"),
    ).toContain("entrega_sin_precision");
    expect(
      errores(
        lectura(proyecto({ entrega: NO_LO_DICE, entrega_precision: "anio" })),
      ).join("|"),
    ).toContain("precision_sin_entrega");
  });

  it("rechaza un mes que no existe", () => {
    expect(
      errores(
        lectura(proyecto({ entrega: "2028-13", entrega_precision: "mes" })),
      ).length,
    ).toBeGreaterThan(0);
  });

  it("rechaza un precio de parqueadero que no es adicional", () => {
    expect(
      errores(
        lectura(
          proyecto({ parqueadero: "incluido", parqueadero_precio: 20_000_000 }),
        ),
      ).join("|"),
    ).toContain("precio_parqueadero_sin_adicional");
  });

  it("rechaza una página repetida, un proyecto de otra página y un número de edición que no es un entero positivo", () => {
    const base = lectura(proyecto());
    const repetida = { ...base, paginas: [base.paginas[0], base.paginas[0]] };
    expect(errores(repetida).join("|")).toContain("pagina_repetida");
    expect(errores(lectura(proyecto({ pagina: 61 }))).join("|")).toContain(
      "pagina_ajena",
    );
    // Cualquier edición se lee (S13): el número lo dice el archivo, no una constante de la 187.
    expect(errores(lectura(proyecto(), { edicion: 188 }))).toEqual([]);
    for (const malo of [0, -3, 1.5, "187"]) {
      expect(
        errores(lectura(proyecto(), { edicion: malo })).length,
        String(malo),
      ).toBeGreaterThan(0);
    }
  });

  it("rechaza una lectura sin páginas y un lector con símbolos", () => {
    expect(
      errores({ edicion: 187, lector: "L1", paginas: [] }).length,
    ).toBeGreaterThan(0);
    expect(
      errores(lectura(proyecto(), { lector: "L 1 / x" })).length,
    ).toBeGreaterThan(0);
  });
});
