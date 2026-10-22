import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar, ejecutar } from "./utils/bd";
import { fechaBogota } from "./utils/fechas";
import type { NuevosPublicados } from "../../src/lib/supabase/types";

// S12 «Nuevos, con lo que pagas de verdad» — la base de datos: la edición de la revista ya procesada.
// Habla con la RPC pública con el anon key real y llama como `postgres` a las del servidor (el rol con el que las
// llamaría la llave de servicio). Datos 100 % sintéticos: la edición 9001 y sus proyectos son ficticios y la prueba
// los borra al terminar (la base local se comparte entre specs).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const api = () => createClient(url, anon);

const NUMERO = 9001;

// La ventana de la edición sintética: empezó hace 10 días y termina dentro de 20.
const DESDE = fechaBogota(10);
const HASTA = fechaBogota(-20);
const ANTES = fechaBogota(11);
const DESPUES = fechaBogota(-21);
const HOY = fechaBogota(0);

// Las claves que el anónimo puede leer de un proyecto: ni una más (lista blanca de la RPC).
const CLAVES_PROYECTO = [
  "slug",
  "clave",
  "nombre",
  "constructora",
  "tipo",
  "ciudad",
  "sector",
  "region",
  "segmento",
  "precio_desde",
  "area_construida_desde",
  "area_construida_hasta",
  "area_privada_desde",
  "area_privada_hasta",
  "etapa",
  "entrega",
  "entrega_precision",
  "parqueadero",
  "parqueadero_precio",
  "precio_fijo",
  "subsidio_anunciado",
  "rotulos",
  "apariciones",
  "ilegibles",
  "en_conflicto",
].sort();

function proyecto(n: number, extra: Record<string, unknown> = {}) {
  return {
    slug: `proyecto-ficticio-${n}`,
    clave: `constructora ficticia|proyecto ficticio ${n}`,
    nombre: `Proyecto Ficticio ${n}`,
    constructora: "Constructora Ficticia",
    tipo: "apartamento",
    ciudad: "Bogotá",
    sector: "Suba",
    region: "bogota",
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
    subsidio_anunciado: "no_lo_dice",
    rotulos: ["lanzamiento"],
    apariciones: [3],
    ilegibles: [],
    en_conflicto: [],
    ...extra,
  };
}

const MUESTRA = ["constructora ficticia|proyecto ficticio 2"];

function edicion(extra: Record<string, unknown> = {}) {
  return {
    numero: NUMERO,
    nombre: "Edición Ficticia",
    desde: DESDE,
    hasta: HASTA,
    paginas: 10,
    muestra_claves: MUESTRA,
    muestra_semilla: NUMERO,
    proyectos: [proyecto(1), proyecto(2), proyecto(3)],
    ...extra,
  };
}

// Como el servidor: SQL con el JSON entre dólares (el JSON de prueba no los contiene).
function cargar(e: unknown) {
  return ejecutar(
    `select public.cargar_edicion($j$${JSON.stringify(e)}$j$::jsonb)`,
  );
}
function publicar(muestra: string[], numero = NUMERO) {
  const lista = muestra.map((m) => `'${m}'`).join(", ");
  return ejecutar(
    `select public.publicar_edicion(${numero}, array[${lista}]::text[])`,
  );
}
function limpiar() {
  consultar(`delete from public.ediciones where numero = ${NUMERO}`);
}
async function leer(hoy: string) {
  const { data, error } = await api().rpc("nuevos_publicados", { p_hoy: hoy });
  expect(error).toBeNull();
  return data as unknown as NuevosPublicados | null;
}

// La base local se comparte: puede haber OTRA edición publicada (la de demostración 9000 de la siembra de Lighthouse). Lo
// que estas pruebas afirman es que NUESTRA edición no sale, no que no salga ninguna.
async function noEsLaMia(hoy: string) {
  expect((await leer(hoy))?.edicion.numero, hoy).not.toBe(NUMERO);
}

// Una edición a la vez en la base: en serie, y solo en un proyecto de Playwright.
test.describe.configure({ mode: "serial" });
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});
test.beforeAll(limpiar);
test.afterAll(limpiar);

test("el anónimo NO lee ni escribe las tablas de la edición", async () => {
  cargar(edicion());
  const supabase = api();
  for (const tabla of ["ediciones", "proyectos_nuevos"] as const) {
    const { data } = await supabase.from(tabla).select("*");
    expect(data ?? [], tabla).toHaveLength(0);
    const { error } = await supabase.from(tabla).insert({} as never);
    expect(error, tabla).not.toBeNull();
  }
  limpiar();
});

test("el anónimo NO puede cargar, publicar ni retirar una edición (solo el servidor)", async () => {
  const supabase = api();
  const llamadas: Array<[string, Record<string, unknown>]> = [
    ["cargar_edicion", { p_edicion: edicion() }],
    ["publicar_edicion", { p_numero: NUMERO, p_muestra: MUESTRA }],
    ["retirar_edicion", { p_numero: NUMERO }],
  ];
  for (const [nombre, args] of llamadas) {
    const { error } = await supabase.rpc(nombre as never, args as never);
    expect(error?.code, nombre).toBe("42501");
  }
  expect(
    consultar(`select count(*) from public.ediciones where numero = ${NUMERO}`),
  ).toEqual(["0"]);
});

test("una edición cargada entra SIN publicar y el anónimo no la ve", async () => {
  const [res] = cargar(edicion()).filter((l) => l.startsWith("{"));
  expect(JSON.parse(res)).toEqual({
    numero: NUMERO,
    proyectos: 3,
    publicada: false,
  });
  expect(
    consultar(
      `select publicada::text || ',' || (revisada_at is null)::text from public.ediciones where numero = ${NUMERO}`,
    ),
  ).toEqual(["false,true"]);
  for (const dia of [ANTES, DESDE, HOY, HASTA, DESPUES]) {
    await noEsLaMia(dia);
  }
});

test("publicar exige la muestra EXACTA que fijó la carga (G5): otra distinta se rechaza", async () => {
  expect(() => publicar(["constructora ficticia|proyecto ficticio 1"])).toThrow(
    /muestra_no_coincide/,
  );
  expect(() => publicar([])).toThrow(/muestra_no_coincide/);
  await noEsLaMia(HOY);
  expect(
    consultar(
      `select publicada::text from public.ediciones where numero = ${NUMERO}`,
    ),
  ).toEqual(["false"]);
});

test("no existe publicar una edición que no se cargó", async () => {
  expect(() => publicar(MUESTRA, NUMERO + 1)).toThrow(/edicion_inexistente/);
});

test("la tabla no deja marcar publicada sin la revisión con fecha (defensa en profundidad)", async () => {
  expect(() =>
    ejecutar(
      `update public.ediciones set publicada = true where numero = ${NUMERO}`,
    ),
  ).toThrow(/check|ediciones/i);
});

test("publicada con la muestra revisada: el anónimo lee SOLO la lista blanca de columnas", async () => {
  expect(publicar(MUESTRA)).toContain("t");
  const lectura = await leer(HOY);
  expect(lectura).not.toBeNull();
  expect(Object.keys(lectura!).sort()).toEqual(["edicion", "proyectos"]);
  expect(Object.keys(lectura!.edicion).sort()).toEqual(
    ["desde", "hasta", "nombre", "numero", "paginas"].sort(),
  );
  expect(lectura!.edicion).toMatchObject({
    numero: NUMERO,
    desde: DESDE,
    hasta: HASTA,
  });
  expect(lectura!.proyectos).toHaveLength(3);
  for (const p of lectura!.proyectos) {
    expect(Object.keys(p).sort()).toEqual(CLAVES_PROYECTO);
  }
  // El valor llega tal cual se cargó (numérico exacto) y «no lo dice» sigue siendo NULL.
  const uno = lectura!.proyectos.find((p) => p.slug === "proyecto-ficticio-1")!;
  expect(uno.precio_desde).toBe(250_000_000);
  expect(uno.area_privada_hasta).toBeNull();
  expect(uno.rotulos).toEqual(["lanzamiento"]);
});

test("publicar dos veces es inocuo y una edición publicada no se recarga (se retira primero)", async () => {
  expect(publicar(MUESTRA)).toContain("f");
  expect(() => cargar(edicion({ nombre: "Otra Cosa" }))).toThrow(
    /edicion_publicada/,
  );
  expect(
    consultar(`select nombre from public.ediciones where numero = ${NUMERO}`),
  ).toEqual(["Edición Ficticia"]);
});

test("la vigencia: antes de empezar no sale; dentro y después, la edición (después = la última publicada)", async () => {
  await noEsLaMia(ANTES);
  expect((await leer(DESDE))?.edicion.numero).toBe(NUMERO);
  expect((await leer(HASTA))?.edicion.numero).toBe(NUMERO);
  // Vencida: sigue saliendo (el producto dirá «mes sin edición»), con su ventana a la vista.
  const vencida = await leer(DESPUES);
  expect(vencida?.edicion.numero).toBe(NUMERO);
  expect(vencida?.edicion.hasta).toBe(HASTA);
  // Una fecha nula no sirve para volcar nada.
  const { data, error } = await api().rpc("nuevos_publicados", {
    p_hoy: null as unknown as string,
  });
  expect(error).toBeNull();
  expect(data).toBeNull();
});

test("con dos ediciones publicadas, la vigente es la de mayor número cuya ventana contiene hoy", async () => {
  const otra = NUMERO + 1;
  try {
    ejecutar(
      `select public.cargar_edicion($j$${JSON.stringify(
        edicion({
          numero: otra,
          nombre: "Edición Ficticia Siguiente",
          desde: DESPUES,
          hasta: fechaBogota(-60),
          muestra_semilla: otra,
          proyectos: [proyecto(1), proyecto(2)],
        }),
      )}$j$::jsonb)`,
    );
    publicar(MUESTRA, otra);
    // Hoy solo cae en la primera; el día siguiente a su ventana cae en la segunda.
    expect((await leer(HOY))?.edicion.numero).toBe(NUMERO);
    expect((await leer(DESPUES))?.edicion.numero).toBe(otra);
    expect((await leer(DESPUES))?.proyectos).toHaveLength(2);
  } finally {
    consultar(`delete from public.ediciones where numero = ${otra}`);
  }
});

test("retirar una edición la quita de inmediato y deja sus datos para revisarlos", async () => {
  const [res] = ejecutar(`select public.retirar_edicion(${NUMERO})`).filter(
    (l) => l === "t" || l === "f",
  );
  expect(res).toBe("t");
  await noEsLaMia(HOY);
  expect(
    consultar(
      `select count(*) from public.proyectos_nuevos where edicion = ${NUMERO}`,
    ),
  ).toEqual(["3"]);
});

test("recargar una edición sin publicar la reemplaza completa y borra la revisión anterior", async () => {
  cargar(edicion({ proyectos: [proyecto(1), proyecto(2)] }));
  expect(
    consultar(
      `select count(*) from public.proyectos_nuevos where edicion = ${NUMERO}`,
    ),
  ).toEqual(["2"]);
  expect(
    consultar(
      `select (revisada_at is null)::text from public.ediciones where numero = ${NUMERO}`,
    ),
  ).toEqual(["true"]);
});

test("un texto con una web, un correo o un teléfono NO entra a la base", async () => {
  for (const extra of [
    { nombre: "Proyecto www.ejemplo.com" },
    { nombre: "Proyecto https://ejemplo" },
    { constructora: "Constructora ficticia@ejemplo" },
    { sector: "Suba 300 123 4567" },
  ]) {
    expect(
      () => cargar(edicion({ proyectos: [proyecto(1, extra)] })),
      JSON.stringify(extra),
    ).toThrow(/check|proyectos_nuevos/i);
  }
});

test("los campos cerrados rechazan valores fuera de su lista (rótulos, tipos, conflictos)", async () => {
  for (const extra of [
    { rotulos: ["texto libre del aviso"] },
    { tipo: "castillo" },
    { en_conflicto: ["telefono"] },
    { ilegibles: ["nombre"] },
    { precio_desde: 5 },
    { slug: "Slug Con Mayúsculas" },
  ]) {
    expect(
      () => cargar(edicion({ proyectos: [proyecto(1, extra)] })),
      JSON.stringify(extra),
    ).toThrow(/check|slug|proyectos_nuevos/i);
  }
});

test("ninguna columna guarda teléfono, dirección, web, correo ni el texto del aviso", async () => {
  expect(
    consultar(
      `select table_name || '.' || column_name from information_schema.columns
        where table_schema = 'public'
          and table_name in ('ediciones', 'proyectos_nuevos')
          and column_name ~* '(telefono|teléfono|celular|whatsapp|direccion|dirección|web|url|sitio|correo|email|mail|aviso|texto|nota|descripcion|descripción|contacto)'
        order by 1`,
    ),
  ).toEqual([]);
});

test("la guarda de columnas sí detecta una columna indebida (la prueba falla cuando debe)", async () => {
  // Demo en rojo (regla 15): con una columna de teléfono la misma consulta la ve, y la transacción se revierte.
  const salida = ejecutar(`
    begin;
    alter table public.proyectos_nuevos add column telefono_sala text;
    select table_name || '.' || column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'proyectos_nuevos'
        and column_name ~* '(telefono|teléfono|celular|whatsapp|direccion|dirección|web|url|sitio|correo|email|mail|aviso|texto|nota|descripcion|descripción|contacto)';
    rollback;
  `);
  expect(salida).toContain("proyectos_nuevos.telefono_sala");
  expect(
    consultar(
      `select count(*) from information_schema.columns where table_name = 'proyectos_nuevos' and column_name = 'telefono_sala'`,
    ),
  ).toEqual(["0"]);
});
