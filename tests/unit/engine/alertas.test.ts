// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  armarConfirmacion,
  armarResumen,
  asuntoResumen,
  cabecerasBaja,
  plano,
  type AnuncioCorreo,
  type EnlacesResumen,
} from "@/engine/alertas/correos";
import {
  aArgsCriterios,
  desdeTextoPostgres,
  enlaceBusqueda,
  filtrosDeAlerta,
  filtrosDeConsulta,
  nombrePorDefecto,
  resumenCriterios,
} from "@/engine/alertas/criterios";
import { respuestaDeErrorGuardar } from "@/engine/alertas/errores";
import {
  correoDisponible,
  TOPE_CORREOS_ALERTA_DIA,
  topeCorreosAlerta,
} from "@/engine/alertas/topes";

// S9 — alertas: criterios, topes, correos y errores. Datos sintéticos; correos de dominio reservado.

const ZONA_URL = "4.65,-74.06;4.65,-74.04;4.67,-74.04;4.67,-74.06";
const BASE = "https://app.ejemplo.test";
const DIRECCION = "Calle 93 # 14-20";

describe("criterios: la búsqueda de /buscar", () => {
  it("de la consulta a filtros; sin filtros válidos no hay alerta", () => {
    expect(filtrosDeConsulta("?op=venta&max=1400000000&hab=2")).toEqual({
      operacion: "venta",
      precioMax: 1_400_000_000,
      habitacionesMin: 2,
    });
    expect(filtrosDeConsulta("")).toBeNull();
    expect(filtrosDeConsulta("op=nada&hab=x")).toBeNull();
  });

  it("filtros → argumentos de la base (la zona como polygon de Postgres)", () => {
    const f = filtrosDeConsulta(`loc=Chapinero&zona=${ZONA_URL}`)!;
    expect(aArgsCriterios(f)).toEqual({
      p_operacion: null,
      p_tipo: null,
      p_localidad: "Chapinero",
      p_precio_min: null,
      p_precio_max: null,
      p_habitaciones_min: null,
      p_poligono: "((-74.06,4.65),(-74.04,4.65),(-74.04,4.67),(-74.06,4.67))",
    });
  });

  it("la zona va y vuelve de Postgres sin cambiar", () => {
    const f = filtrosDeConsulta(`zona=${ZONA_URL}`)!;
    const texto = aArgsCriterios(f).p_poligono!;
    expect(desdeTextoPostgres(texto)).toEqual(f.zona);
    for (const malo of [null, "", "basura", "((1,1),(2,2))"]) {
      expect(desdeTextoPostgres(malo), String(malo)).toBeNull();
    }
  });

  it("lo guardado → filtros; lo que no se reconoce se omite", () => {
    const f = filtrosDeAlerta({
      operacion: "venta",
      tipo: "apartamento",
      localidad: "chapinero",
      precio_min: 100,
      precio_max: 2_000,
      habitaciones_min: 2,
      poligono: "((-74.06,4.65),(-74.04,4.65),(-74.04,4.67),(-74.06,4.67))",
    });
    expect(f).toMatchObject({
      operacion: "venta",
      tipo: "apartamento",
      localidad: "Chapinero",
      precioMin: 100,
      precioMax: 2_000,
      habitacionesMin: 2,
    });
    expect(f.zona).toHaveLength(4);
    expect(
      filtrosDeAlerta({
        operacion: "permuta" as never,
        tipo: "castillo" as never,
        localidad: "Atlantis",
        precio_min: null,
        precio_max: null,
        habitaciones_min: null,
        poligono: "basura",
      }),
    ).toEqual({});
  });

  it("el enlace a /buscar con la misma búsqueda", () => {
    expect(
      enlaceBusqueda(BASE, { operacion: "venta", habitacionesMin: 2 }),
    ).toBe(`${BASE}/buscar?op=venta&hab=2`);
    expect(enlaceBusqueda(BASE, {})).toBe(`${BASE}/buscar`);
  });

  it("el resumen en palabras, en cada idioma", () => {
    const f = filtrosDeConsulta(
      `op=venta&tipo=apartamento&loc=Chapinero&min=300000000&max=1400000000&hab=2&zona=${ZONA_URL}`,
    )!;
    expect(resumenCriterios(f, "es")).toBe(
      "Venta · Apartamento · en Chapinero · desde $300.000.000 · hasta $1.400.000.000 · 2+ habitaciones · zona dibujada",
    );
    expect(resumenCriterios(f, "en")).toBe(
      "For sale · Apartment · in Chapinero · from COP 300,000,000 · up to COP 1,400,000,000 · 2+ bedrooms · drawn area",
    );
  });

  it("el nombre por omisión", () => {
    expect(nombrePorDefecto({ tipo: "casa", localidad: "Usaquén" }, "es")).toBe(
      "Casas en Usaquén",
    );
    expect(
      nombrePorDefecto(
        {
          tipo: "apartamento",
          zona: filtrosDeConsulta(`zona=${ZONA_URL}`)!.zona,
        },
        "en",
      ),
    ).toBe("Apartments in my area");
    expect(nombrePorDefecto({ tipo: "apartaestudio" }, "es")).toBe(
      "Apartaestudios",
    );
    expect(nombrePorDefecto({ localidad: "Suba" }, "es")).toBe(
      "Inmuebles en Suba",
    );
    expect(nombrePorDefecto({ precioMax: 5 }, "en")).toBe("My search");
  });
});

describe("¿hay con qué mandar correo de verdad?", () => {
  it("sí con el simulacro explícito o con la llave de Brevo; no con ninguno de los dos", () => {
    expect(correoDisponible("1", undefined)).toBe(true);
    expect(correoDisponible(undefined, "llave-de-prueba")).toBe(true);
    expect(correoDisponible(undefined, undefined)).toBe(false);
    expect(correoDisponible(undefined, "")).toBe(false);
    expect(correoDisponible("0", "")).toBe(false);
  });
});

describe("texto plano de un asunto", () => {
  it("quita saltos de línea y todo carácter de control, y junta los espacios", () => {
    expect(plano("a\r\nBcc: x\t\tb")).toBe("a Bcc: x b");
    expect(plano("a\u0000b\u007fc\u0085d\u2028e\u2029f")).toBe("a b c d e f");
    expect(plano("  mucho   espacio  ")).toBe("mucho espacio");
  });
});

describe("el tope de correos de alerta", () => {
  it("con Brevo real siempre el de producción, aunque la variable diga otra cosa", () => {
    expect(topeCorreosAlerta(false, "999999")).toBe(TOPE_CORREOS_ALERTA_DIA);
    expect(topeCorreosAlerta(false, undefined)).toBe(250);
  });

  it("en simulacro se respeta, si es un entero válido", () => {
    expect(topeCorreosAlerta(true, "0")).toBe(0);
    expect(topeCorreosAlerta(true, "100000")).toBe(100_000);
    expect(topeCorreosAlerta(true, "-1")).toBe(250);
    expect(topeCorreosAlerta(true, "x")).toBe(250);
    expect(topeCorreosAlerta(true, undefined)).toBe(250);
  });
});

const BAJA = {
  baja: `${BASE}/baja#t=TOKENBAJA`,
  bajaPost: `${BASE}/api/alertas/baja?t=TOKENBAJA`,
};

describe("el correo de confirmación", () => {
  const c = armarConfirmacion(
    { nombre: "Casas <b>en</b>\r\nBcc: x", criterios: "Venta · en <Suba>" },
    { confirmar: `${BASE}/alertas#c=TOKENCONF`, ...BAJA },
    "es",
  );

  it("lleva el enlace de confirmar, la baja en el cuerpo y en la cabecera", () => {
    expect(c.html).toContain(`${BASE}/alertas#c=TOKENCONF`);
    expect(c.html).toContain(BAJA.baja);
    expect(c.cabeceras).toEqual({
      "List-Unsubscribe": `<${BAJA.bajaPost}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("escapa lo que escribió la persona; el asunto es fijo y de una línea", () => {
    expect(c.html).toContain("en &lt;Suba&gt;");
    expect(c.html).not.toContain("<Suba>");
    expect(c.asunto).not.toMatch(/[\r\n]/);
    // El nombre lo escribe quien crea la alerta y el correo va a alguien que aún no aceptó: ahí no aparece.
    expect(c.asunto).toBe("Confirma tu alerta de Innmobiliaria");
    expect(c.asunto).not.toContain("Bcc");
  });

  it("en inglés", () => {
    const en = armarConfirmacion(
      { nombre: "Houses", criterios: "For sale" },
      { confirmar: "x", ...BAJA },
      "en",
    );
    expect(en.asunto).toBe("Confirm your Innmobiliaria alert");
    expect(en.html).toContain("Delete it in one click");
  });
});

describe("el resumen diario", () => {
  const item = (cambios: Partial<AnuncioCorreo> = {}): AnuncioCorreo => ({
    slug: "apto-cabrera-1a2b3c",
    tipo: "apartamento",
    barrio: "La <Cabrera>",
    area_m2: 84,
    precio_esperado: 890_000_000,
    nivel_verificacion: "verificado",
    ctl_expedido_el: "2026-10-09",
    portada: "fotos/abc-full.webp",
    ...cambios,
  });
  const enlaces: EnlacesResumen = {
    mapa: `${BASE}/buscar?op=venta`,
    gestionar: `${BASE}/alertas#t=TOKENGEST`,
    ...BAJA,
    ficha: (s) => `${BASE}/i/${s}`,
    foto: (k) => `https://fotos.ejemplo.test/${k}`,
  };

  it("el asunto según lo que trae", () => {
    expect(asuntoResumen("Rosales", 1, 0, "es")).toBe(
      "1 anuncio nuevo en «Rosales»",
    );
    expect(asuntoResumen("Rosales", 3, 0, "es")).toBe(
      "3 anuncios nuevos en «Rosales»",
    );
    expect(asuntoResumen("Rosales", 0, 1, "es")).toBe(
      "1 anuncio bajó de precio en «Rosales»",
    );
    expect(asuntoResumen("Rosales", 0, 4, "en")).toBe(
      "4 price drops in «Rosales»",
    );
    expect(asuntoResumen("Rosales", 2, 1, "es")).toBe(
      "2 nuevos y 1 con precio más bajo en «Rosales»",
    );
  });

  it("CADA resumen trae la baja en un clic (cuerpo y cabecera) y gestionar", () => {
    const r = armarResumen(
      {
        nombre: "Rosales",
        criterios: "Venta",
        nuevos: [item()],
        bajas: [],
        totalNuevos: 1,
        totalBajas: 0,
      },
      enlaces,
      "es",
    );
    expect(r.html).toContain(BAJA.baja);
    expect(r.html).toContain(enlaces.gestionar);
    expect(r.html).toContain("Dejar de recibirla: un clic");
    expect(r.cabeceras["List-Unsubscribe"]).toBe(`<${BAJA.bajaPost}>`);
    expect(r.html).toContain(enlaces.mapa);
  });

  it("una baja muestra el precio anterior tachado; el sello verificado se dice", () => {
    const r = armarResumen(
      {
        nombre: "Rosales",
        criterios: "Venta",
        nuevos: [],
        bajas: [item({ precio_anterior: 1_020_000_000 })],
        totalNuevos: 0,
        totalBajas: 1,
      },
      enlaces,
      "es",
    );
    expect(r.html).toMatch(
      /<strong>\$890\.000\.000<\/strong> <s[^>]*>\$1\.020\.000\.000<\/s>/,
    );
    expect(r.html).toContain("⭐ Propietario verificado");
    expect(r.html).toContain("Bajaron de precio");
    expect(r.html).not.toContain("Anuncios nuevos");
  });

  it("escapa el barrio y el nombre; sin foto no hay imagen; un fundador no lleva sello", () => {
    const r = armarResumen(
      {
        nombre: "<script>",
        criterios: "Venta",
        nuevos: [
          item({
            portada: null,
            nivel_verificacion: "fundador",
            ctl_expedido_el: null,
          }),
        ],
        bajas: [],
        totalNuevos: 1,
        totalBajas: 0,
      },
      { ...enlaces, foto: () => null },
      "es",
    );
    expect(r.html).toContain("La &lt;Cabrera&gt;");
    expect(r.html).not.toContain("<script>");
    expect(r.html).not.toContain("<img");
    expect(r.html).not.toContain("⭐");
  });

  it("con más de los que caben, «y N más» lleva al mapa", () => {
    const r = armarResumen(
      {
        nombre: "Rosales",
        criterios: "Venta",
        nuevos: [item(), item({ slug: "otro-1a2b3c" })],
        bajas: [],
        totalNuevos: 12,
        totalBajas: 0,
      },
      enlaces,
      "es",
    );
    expect(r.html).toContain("Y 10 más");
    expect(r.html).toContain(
      'src="https://fotos.ejemplo.test/fotos/abc-full.webp"',
    );
  });

  it("jamás la dirección, ni aunque viniera en los datos", () => {
    const conDireccion = {
      ...item(),
      direccion_aproximada: DIRECCION,
    } as AnuncioCorreo;
    const r = armarResumen(
      {
        nombre: "Rosales",
        criterios: "Venta",
        nuevos: [conDireccion],
        bajas: [],
        totalNuevos: 1,
        totalBajas: 0,
      },
      enlaces,
      "es",
    );
    expect(r.html + r.asunto).not.toContain(DIRECCION);
  });

  it("en inglés", () => {
    const r = armarResumen(
      {
        nombre: "Rosales",
        criterios: "For sale",
        nuevos: [item()],
        bajas: [],
        totalNuevos: 1,
        totalBajas: 0,
      },
      enlaces,
      "en",
    );
    expect(r.asunto).toBe("1 new listing in «Rosales»");
    expect(r.html).toContain("Stop receiving it: one click");
    expect(r.html).toContain("Apartment in La &lt;Cabrera&gt; · 84 m²");
    expect(r.html).toContain("COP 890,000,000");
  });

  it("cabecerasBaja", () => {
    expect(cabecerasBaja("https://x.test/y")).toEqual({
      "List-Unsubscribe": "<https://x.test/y>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("errores de las RPC de guardar y avisar a HTTP", () => {
  it.each([
    [{ code: "42501", message: "no_verificado" }, 403, "no_verificado"],
    [{ code: "P0001", message: "token_invalido" }, 403, "token_invalido"],
    [{ code: "P0002", message: "no_disponible" }, 404, "no_disponible"],
    [{ code: "23514", message: "email_invalido" }, 400, "email_invalido"],
    [{ code: "23514", message: "sin_criterios" }, 400, "sin_criterios"],
    [{ code: "23514", message: "nota_invalida" }, 400, "nota_invalida"],
    [
      { code: "23514", message: "demasiadas_alertas" },
      429,
      "demasiadas_alertas",
    ],
    [{ code: "23514", message: "sin_cupo" }, 429, "sin_cupo"],
    [{ code: "23514", message: "lista_llena" }, 429, "lista_llena"],
    [{ code: "XX000", message: "otra cosa" }, 500, "servidor"],
    [{}, 500, "servidor"],
  ])("%j ⇒ %i %s", (error, status, codigo) => {
    expect(respuestaDeErrorGuardar(error)).toEqual({ status, codigo });
  });
});
