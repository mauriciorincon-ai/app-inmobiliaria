// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ILEGIBLE,
  NO_LO_DICE,
  type PaginaLeida,
  type Proyecto,
} from "../../../src/engine/vivienda-nueva/edicion";
import {
  CAMPOS_DE_ESTRUCTURA,
  aleatorioConSemilla,
  compararLecturas,
  cobertura,
  contarPor,
  cruzarConIndice,
  mismoDatoRedondeado,
  muestraDobleLectura,
  normalizarClave,
  ProyectoUnicoSchema,
  regionDe,
  unirLecturas,
} from "../../../src/engine/vivienda-nueva/lectura";

function pr(extra: Partial<Proyecto> = {}): Proyecto {
  return {
    pagina: 5,
    posicion: 1,
    nombre: "Torres del Sol",
    constructora: "Constructora Uno",
    tipo: "apartamento",
    ciudad: "Bogotá",
    sector: NO_LO_DICE,
    segmento: NO_LO_DICE,
    precio_desde: 300_000_000,
    area_construida_desde: 50,
    area_construida_hasta: null,
    area_privada_desde: 45,
    area_privada_hasta: null,
    etapa: NO_LO_DICE,
    entrega: NO_LO_DICE,
    entrega_precision: null,
    parqueadero: NO_LO_DICE,
    parqueadero_precio: null,
    precio_fijo: NO_LO_DICE,
    subsidio_anunciado: NO_LO_DICE,
    rotulos: [],
    ...extra,
  };
}

function pag(
  pagina: number,
  proyectos: Partial<Proyecto>[],
  tipo: PaginaLeida["tipo"] = "directorio",
): PaginaLeida {
  return {
    pagina,
    tipo,
    proyectos: proyectos.map((p, i) => pr({ pagina, posicion: i + 1, ...p })),
    avisos_al_agente: [],
  };
}

describe("normalizarClave y regionDe", () => {
  it("quita tildes, signos y mayúsculas", () => {
    expect(normalizarClave("  Reserva de Cajicá, Etapa 2 ")).toBe(
      "reserva de cajica etapa 2",
    );
  });

  it("deriva la región de la ciudad impresa", () => {
    expect(regionDe("Bogotá")).toBe("bogota");
    expect(regionDe("Bogotá D.C.")).toBe("bogota");
    expect(regionDe("Chía")).toBe("sabana");
    expect(regionDe("Soacha")).toBe("sabana");
    expect(regionDe("Cartagena")).toBe("otra");
    expect(regionDe(NO_LO_DICE)).toBe("sin_ciudad");
    expect(regionDe(ILEGIBLE)).toBe("sin_ciudad");
  });
});

describe("mismoDatoRedondeado", () => {
  it.each([
    [238_000_000, 237_999_000, true],
    [340_000_000, 339_999_000, true],
    [51.2, 51.21, true],
    [42.8, 42.85, true],
    [93.1, 93.15, true],
    [715_000_000, 1_975_000_000, false],
    [39.5, 116.5, false],
    [36, 36.49, false],
    [20.11, 20.6, false],
    [46.87, 45.75, false],
  ])("%d y %d → %s", (a, b, esperado) => {
    expect(mismoDatoRedondeado(a, b)).toBe(esperado);
  });
});

describe("unirLecturas", () => {
  it("une el mismo proyecto en dos páginas y se queda con el valor más fino", () => {
    const e = unirLecturas(
      [
        { paginas: [pag(2, [{ precio_desde: 237_999_000 }])] },
        { paginas: [pag(5, [{ precio_desde: 238_000_000 }])] },
      ],
      5,
    );
    expect(e.proyectos).toHaveLength(1);
    expect(e.proyectos[0].apariciones).toEqual([2, 5]);
    expect(e.proyectos[0].precio_desde).toBe(237_999_000);
    expect(e.reconciliados).toHaveLength(1);
    expect(e.conflictos).toHaveLength(0);
  });

  it("completa un dato que una aparición no decía con el que otra sí dice", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ segmento: NO_LO_DICE, rotulos: ["lanzamiento"] }]),
            pag(7, [{ segmento: "VIS", rotulos: ["descuento"] }]),
          ],
        },
      ],
      7,
    );
    expect(e.proyectos[0].segmento).toBe("VIS");
    expect(e.proyectos[0].rotulos.sort()).toEqual(["descuento", "lanzamiento"]);
  });

  it("deja un conflicto real a la vista en vez de elegir uno", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ ciudad: "Tocancipá" }]),
            pag(9, [{ ciudad: "Zipaquirá" }]),
          ],
        },
      ],
      9,
    );
    expect(e.conflictos).toHaveLength(1);
    expect(e.conflictos[0].campo).toBe("ciudad");
    expect(e.proyectos[0].ciudad).toBe("Tocancipá");
    // Y el proyecto lo sabe: el campo contradicho queda marcado para que ningún cálculo lo use.
    expect(e.proyectos[0].en_conflicto).toEqual(["ciudad"]);
  });

  it("un proyecto sin contradicciones trae `en_conflicto` vacío; una diferencia de redondeo no cuenta", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ precio_desde: 238_000_000 }]),
            pag(9, [{ precio_desde: 237_999_000 }]),
          ],
        },
      ],
      9,
    );
    expect(e.reconciliados).toHaveLength(1);
    expect(e.proyectos[0].en_conflicto).toEqual([]);
  });

  it("entre «Bosa» y «Bosa El Recreo» deja el sector más específico y no lo cuenta como conflicto", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ sector: "Bosa" }]),
            pag(9, [{ sector: "Bosa El Recreo" }]),
          ],
        },
      ],
      9,
    );
    expect(e.proyectos[0].sector).toBe("Bosa El Recreo");
    expect(e.conflictos).toHaveLength(0);
    expect(e.reconciliados).toHaveLength(1);
    const otro = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ sector: "Usaquén" }]),
            pag(9, [{ sector: "Suba" }]),
          ],
        },
      ],
      9,
    );
    expect(otro.conflictos).toHaveLength(1);
  });

  it("no funde dos tarjetas de una misma página con el mismo nombre", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(3, [
              { nombre: "Playa", precio_desde: 715_000_000 },
              { nombre: "Playa", precio_desde: 1_975_000_000 },
            ]),
            pag(63, [{ nombre: "Playa", precio_desde: 1_975_000_000 }]),
          ],
        },
      ],
      63,
    );
    expect(e.proyectos).toHaveLength(2);
    const grande = e.proyectos.find((p) => p.precio_desde === 1_975_000_000)!;
    expect(grande.apariciones).toEqual([3, 63]);
  });

  it("trata como otro proyecto el que se llama igual pero trae un precio que no cuadra con ninguno", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ precio_desde: 300_000_000 }]),
            pag(9, [{ precio_desde: 900_000_000 }]),
          ],
        },
      ],
      9,
    );
    expect(e.proyectos).toHaveLength(2);
  });

  it("elige por el área cuando el precio no decide", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(3, [
              {
                nombre: "Playa",
                precio_desde: NO_LO_DICE,
                area_construida_desde: 39.5,
              },
              {
                nombre: "Playa",
                precio_desde: NO_LO_DICE,
                area_construida_desde: 116.5,
              },
            ]),
            pag(63, [
              {
                nombre: "Playa",
                precio_desde: NO_LO_DICE,
                area_construida_desde: 116.5,
              },
            ]),
          ],
        },
      ],
      63,
    );
    expect(e.proyectos).toHaveLength(2);
    expect(
      e.proyectos.find((p) => p.area_construida_desde === 116.5)!.apariciones,
    ).toEqual([3, 63]);
  });

  it("nunca une un proyecto sin nombre legible", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ nombre: ILEGIBLE }]),
            pag(4, [{ nombre: ILEGIBLE }]),
            pag(6, [{ nombre: NO_LO_DICE }]),
          ],
        },
      ],
      6,
    );
    expect(e.proyectos).toHaveLength(3);
  });

  it("une «Mistral» con «Belari Ciudadela - Mistral» y «AR Construcciones S.A.S.» con «AR Construcciones»", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(14, [
              {
                nombre: "Mistral",
                constructora: "Constructora Capital",
                precio_desde: 361_550_000,
              },
            ]),
            pag(28, [
              {
                nombre: "Belari Ciudadela - Mistral",
                constructora: "Constructora Capital",
                precio_desde: 361_550_000,
              },
            ]),
            pag(30, [
              {
                nombre: "Acanto 2",
                constructora: "AR Construcciones",
                precio_desde: 237_999_000,
              },
            ]),
            pag(31, [
              {
                nombre: "Acanto 2 Reserva de Mosquera",
                constructora: "AR Construcciones S.A.S.",
                precio_desde: 237_999_000,
              },
            ]),
          ],
        },
      ],
      31,
    );
    expect(e.proyectos).toHaveLength(2);
    expect(e.proyectos.map((p) => p.nombre).sort()).toEqual([
      "Acanto 2",
      "Mistral",
    ]);
    expect(e.proyectos.find((p) => p.nombre === "Acanto 2")!.constructora).toBe(
      "AR Construcciones",
    );
  });

  it("une un proyecto con y sin constructora si el nombre y el precio son el mismo dato", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(28, [{ nombre: "Cedromonti", constructora: "Compensar" }]),
            pag(35, [{ nombre: "Cedromonti", constructora: NO_LO_DICE }]),
          ],
        },
      ],
      35,
    );
    expect(e.proyectos).toHaveLength(1);
    expect(e.proyectos[0].constructora).toBe("Compensar");
  });

  it("sin precio en alguno de los dos solo une si comparten la marca de la constructora", () => {
    const mismaMarca = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ nombre: "Alba", precio_desde: NO_LO_DICE }]),
            pag(5, [
              { nombre: "Alba", constructora: "Constructora Uno S.A.S." },
            ]),
          ],
        },
      ],
      5,
    );
    expect(mismaMarca.proyectos).toHaveLength(1);
    const otraMarca = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ nombre: "Alba", precio_desde: NO_LO_DICE }]),
            pag(5, [{ nombre: "Alba", constructora: "Otra Constructora" }]),
          ],
        },
      ],
      5,
    );
    expect(otraMarca.proyectos).toHaveLength(2);
    const sinMarca = unirLecturas(
      [
        {
          paginas: [
            pag(2, [
              {
                nombre: "Alba",
                precio_desde: NO_LO_DICE,
                constructora: NO_LO_DICE,
              },
            ]),
            pag(5, [{ nombre: "Alba", constructora: NO_LO_DICE }]),
          ],
        },
      ],
      5,
    );
    expect(sinMarca.proyectos).toHaveLength(2);
  });

  it("no une «Reserva de Cajicá» con «Reserva de Cajicá 2» porque el precio no cuadra", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(2, [
              { nombre: "Reserva de Cajicá", precio_desde: 295_499_000 },
            ]),
            pag(4, [
              { nombre: "Reserva de Cajicá 2", precio_desde: 328_999_000 },
            ]),
          ],
        },
      ],
      4,
    );
    expect(e.proyectos).toHaveLength(2);
  });

  it("une una diferencia impresa de 900 pesos y deja el valor en conflicto a la vista", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(2, [
              { nombre: "Reserva de Cajicá", precio_desde: 295_499_000 },
            ]),
            pag(28, [
              { nombre: "Reserva de Cajicá", precio_desde: 295_499_900 },
            ]),
          ],
        },
      ],
      28,
    );
    expect(e.proyectos).toHaveLength(1);
    expect(e.proyectos[0].precio_desde).toBe(295_499_000);
    expect(e.conflictos.map((c) => c.campo)).toContain("precio_desde");
  });

  it("deja a la vista una razón social que no cuadra entre apariciones y elige la más repetida", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(7, [
              {
                nombre: "Natura",
                constructora: "Ingenal",
                precio_desde: 347_000_000,
              },
            ]),
            pag(28, [
              {
                nombre: "Natura",
                constructora: "Ingenal Arquitectura & Construcción",
                precio_desde: 347_000_000,
              },
            ]),
            pag(54, [
              {
                nombre: "Natura",
                constructora: "Natura Desarrollos Inmobiliarios SAS",
                precio_desde: 347_000_000,
              },
            ]),
          ],
        },
      ],
      54,
    );
    expect(e.proyectos).toHaveLength(1);
    expect(e.proyectos[0].constructora).toBe("Ingenal");
    expect(e.conflictos.map((c) => c.campo)).toContain("constructora");
  });

  it("si todo está vacío conserva el primero, y avisa páginas sin leer y repetidas", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(1, [{ sector: NO_LO_DICE }]),
            pag(2, [{ sector: ILEGIBLE }]),
          ],
        },
        { paginas: [pag(2, [])] },
      ],
      4,
    );
    expect(e.paginasSinLeer).toEqual([3, 4]);
    expect(e.paginasRepetidas).toEqual([2]);
    expect(e.proyectos).toHaveLength(1);
  });

  it("entre un «ilegible» y un «no es un rango» (null) queda el null", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ area_construida_hasta: ILEGIBLE }]),
            pag(7, [{ area_construida_hasta: null }]),
          ],
        },
      ],
      7,
    );
    expect(e.proyectos[0].area_construida_hasta).toBeNull();
    const solo = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ sector: ILEGIBLE }]),
            pag(7, [{ sector: ILEGIBLE }]),
          ],
        },
      ],
      7,
    );
    expect(solo.proyectos[0].sector).toBe(ILEGIBLE);
  });

  it("acepta apariciones cuyo único valor real es `null` sin inventar conflictos", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ area_construida_hasta: null }]),
            pag(7, [{ area_construida_hasta: 60 }]),
          ],
        },
      ],
      7,
    );
    expect(e.proyectos[0].area_construida_hasta).toBe(60);
    expect(e.conflictos).toHaveLength(0);
  });
});

describe("compararLecturas (doble lectura)", () => {
  const primera = [
    pag(5, [{ nombre: "A" }, { nombre: "B", precio_desde: 250_000_000 }]),
  ];

  it("no marca nada cuando las dos lecturas coinciden", () => {
    expect(compararLecturas(primera, primera)).toEqual([]);
  });

  it("marca una cifra distinta, un conteo distinto y un proyecto que la primera no vio", () => {
    const segunda = [
      pag(5, [
        { nombre: "A", area_construida_desde: 51 },
        { nombre: "B", precio_desde: 250_000_000 },
        { nombre: "C" },
      ]),
    ];
    const d = compararLecturas(primera, segunda);
    expect(d.map((x) => x.campo).sort()).toEqual([
      "area_construida_desde",
      "conteo",
      "proyecto",
    ]);
  });

  it("empareja por nombre aproximado y lo anota como nombre, no como proyecto que falta", () => {
    const primeraB = [
      pag(5, [
        { nombre: "Playa Santúa" },
        { nombre: "Otro Proyecto", constructora: "Constructora Uno" },
      ]),
    ];
    const segundaB = [
      pag(5, [
        { nombre: "Playa Santúa Mar", constructora: "Constructora Dos" },
        { nombre: "Otro Proyecto", constructora: "constructora uno" },
      ]),
    ];
    const d = compararLecturas(primeraB, segundaB);
    expect(d.map((x) => x.campo).sort()).toEqual(["constructora", "nombre"]);
    expect(
      d.every((x) => CAMPOS_DE_ESTRUCTURA.includes(x.campo as never)),
    ).toBe(true);
  });

  it("marca el parqueadero y el precio fijo distintos: cambian el «pagas al menos» (S16)", () => {
    const segunda = [
      pag(5, [
        { nombre: "A", parqueadero: "adicional", parqueadero_precio: 20_000_000 },
        { nombre: "B", precio_desde: 250_000_000, precio_fijo: "si" },
      ]),
    ];
    const d = compararLecturas(primera, segunda);
    expect(d.map((x) => x.campo).sort()).toEqual([
      "parqueadero",
      "parqueadero_precio",
      "precio_fijo",
    ]);
  });

  it("marca una página que la primera lectura no trae", () => {
    const d = compararLecturas(primera, [pag(9, [{ nombre: "Z" }])]);
    expect(d).toHaveLength(1);
    expect(d[0].campo).toBe("pagina");
  });
});

describe("muestraDobleLectura", () => {
  const paginas = Array.from({ length: 30 }, (_, i) =>
    pag(
      i + 1,
      [{ nombre: `P${i}a` }, { nombre: `P${i}b` }],
      i % 3 === 0 ? "aviso_constructora" : "directorio",
    ),
  );

  it("es determinista con la misma semilla y cambia con otra", () => {
    const a = muestraDobleLectura(paginas, 187);
    expect(muestraDobleLectura(paginas, 187)).toEqual(a);
    expect(muestraDobleLectura(paginas, 188)).not.toEqual(a);
  });

  it("cubre al menos la fracción pedida y un tipo de página de cada clase", () => {
    const elegidas = muestraDobleLectura(paginas, 187, 0.1);
    const proyectos = paginas
      .filter((p) => elegidas.includes(p.pagina))
      .reduce((s, p) => s + p.proyectos.length, 0);
    expect(proyectos).toBeGreaterThanOrEqual(6);
    const tipos = new Set(
      paginas.filter((p) => elegidas.includes(p.pagina)).map((p) => p.tipo),
    );
    expect(tipos).toEqual(new Set(["aviso_constructora", "directorio"]));
    expect([...elegidas]).toEqual([...elegidas].sort((a, b) => a - b));
  });

  it("sin proyectos no hay muestra", () => {
    expect(muestraDobleLectura([pag(1, [])], 187)).toEqual([]);
  });

  it("el generador de azar da lo mismo con la misma semilla y siempre en [0, 1)", () => {
    const a = aleatorioConSemilla(7);
    const b = aleatorioConSemilla(7);
    for (let i = 0; i < 50; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("cobertura y cruce con el índice", () => {
  const e = unirLecturas(
    [
      {
        paginas: [
          pag(2, [
            {
              nombre: "Alba",
              precio_desde: 200_000_000,
              entrega: NO_LO_DICE,
              area_privada_desde: ILEGIBLE,
            },
            {
              nombre: "Brisa Norte",
              ciudad: "Chía",
              precio_desde: 310_000_000,
              area_construida_hasta: 70,
            },
          ]),
        ],
      },
    ],
    2,
  );

  it("cuenta por campo lo que dice, lo que no dice, lo ilegible y los nulos", () => {
    const c = Object.fromEntries(
      cobertura(e.proyectos).map((x) => [x.campo, x]),
    );
    expect(c.precio_desde).toMatchObject({ total: 2, conValor: 2 });
    expect(c.entrega).toMatchObject({ noLoDice: 2 });
    expect(c.area_privada_desde).toMatchObject({ conValor: 1, ilegible: 1 });
    expect(c.area_construida_hasta).toMatchObject({ conValor: 1, nulo: 1 });
  });

  it("agrupa por región", () => {
    expect(contarPor(e.proyectos, (p) => p.region)).toEqual({
      bogota: 1,
      sabana: 1,
    });
  });

  it("encuentra el renglón por nombre, con sufijo de zona o con una letra de diferencia", () => {
    const x = cruzarConIndice(e.proyectos, [
      {
        nombre: "Alba",
        constructora: "Constructora Uno",
        precio_desde: 200_000_000,
      },
      {
        nombre: "Brisa Norte - Chía",
        constructora: "Constructora Uno",
        precio_desde: 310_000_000,
      },
      {
        nombre: "Brissa Norte",
        constructora: "Constructora Uno",
        precio_desde: 310_000_000,
      },
    ]);
    expect(x.filas).toBe(3);
    expect(x.coinciden).toBe(3);
    expect(x.sinProyecto).toEqual([]);
    expect(x.precioDifiere).toEqual([]);
    expect(x.sinIndice).toBe(0);
  });

  it("dice qué renglón no tiene proyecto y qué precio no cuadra", () => {
    const x = cruzarConIndice(e.proyectos, [
      { nombre: "Fantasma", constructora: "X", precio_desde: 100_000_000 },
      {
        nombre: "Alba",
        constructora: "Constructora Uno",
        precio_desde: 999_000_000,
      },
      {
        nombre: "Brisa Norte",
        constructora: "Constructora Uno",
        precio_desde: NO_LO_DICE,
      },
    ]);
    expect(x.sinProyecto).toEqual(["Fantasma"]);
    expect(x.precioDifiere).toHaveLength(1);
    expect(x.precioDifiere[0]).toMatchObject({
      indice: "Alba",
      precioAviso: 200_000_000,
      pagina: 2,
    });
  });

  it("no cuenta como diferencia un proyecto sin precio en el aviso, y cuenta los que el índice no nombra", () => {
    const sinPrecio = unirLecturas(
      [
        {
          paginas: [
            pag(2, [
              { nombre: "Alba", precio_desde: NO_LO_DICE },
              { nombre: "Otro" },
            ]),
          ],
        },
      ],
      2,
    );
    const x = cruzarConIndice(sinPrecio.proyectos, [
      {
        nombre: "Alba",
        constructora: "Constructora Uno",
        precio_desde: 200_000_000,
      },
    ]);
    expect(x.precioDifiere).toEqual([]);
    expect(x.sinIndice).toBe(1);
  });
});

describe("ProyectoUnicoSchema: el proyecto unido, con el esquema estricto de la lectura", () => {
  const bueno = () => ({
    nombre: "Proyecto de Prueba",
    constructora: "Constructora de Prueba",
    tipo: "apartamento",
    ciudad: "Bogotá",
    sector: "Suba",
    segmento: "VIS",
    precio_desde: 250_000_000,
    area_construida_desde: 56,
    area_construida_hasta: null,
    area_privada_desde: 50,
    area_privada_hasta: null,
    etapa: "no_lo_dice",
    entrega: "2028-12",
    entrega_precision: "semestre",
    parqueadero: "no_lo_dice",
    parqueadero_precio: null,
    precio_fijo: "no_lo_dice",
    subsidio_anunciado: "no_lo_dice",
    rotulos: ["lanzamiento"],
    apariciones: [4, 12],
    region: "bogota",
    clave: "constructora de prueba|proyecto de prueba",
    en_conflicto: [],
  });

  it("acepta un proyecto limpio", () => {
    expect(ProyectoUnicoSchema.safeParse(bueno()).success).toBe(true);
  });

  it.each([
    ["un teléfono", { telefono: "3000000000" }],
    ["una nota del lector", { notas_crudo: "texto" }],
    ["la página de una sola aparición", { pagina: 3 }],
    ["una web en el nombre", { nombre: "proyecto.com" }],
    ["una dirección en el sector", { sector: "Calle 18 No. 12 - 27" }],
    ["una región inventada", { region: "luna" }],
    ["un rótulo fuera de la lista", { rotulos: ["gran oferta"] }],
    ["un campo en conflicto que no existe", { en_conflicto: ["telefono"] }],
    ["sin ninguna aparición", { apariciones: [] }],
  ])("rechaza %s", (_c, extra) => {
    expect(
      ProyectoUnicoSchema.safeParse({ ...bueno(), ...extra }).success,
    ).toBe(false);
  });

  it("un área contradicha no se revisa contra su vecina: dos páginas pueden traer privada > construida", () => {
    const incoherente = {
      ...bueno(),
      area_privada_desde: 60,
      area_construida_desde: 56,
    };
    expect(ProyectoUnicoSchema.safeParse(incoherente).success).toBe(false);
    expect(
      ProyectoUnicoSchema.safeParse({
        ...incoherente,
        en_conflicto: ["area_privada_desde"],
      }).success,
    ).toBe(true);
  });

  it("lo que produce `unirLecturas` pasa el esquema (ida y vuelta con el esquema de la lectura)", () => {
    const e = unirLecturas(
      [
        {
          paginas: [
            pag(2, [{ ciudad: "Tocancipá" }]),
            pag(9, [{ ciudad: "Zipaquirá" }]),
          ],
        },
      ],
      9,
    );
    for (const p of e.proyectos) {
      expect(ProyectoUnicoSchema.safeParse(p).success).toBe(true);
    }
  });
});
