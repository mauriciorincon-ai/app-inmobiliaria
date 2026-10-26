import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar } from "./utils/bd";
import {
  crearAnuncio,
  precioUnico,
  vencer,
  ZONA_ROSALES,
  ZONA_SUBA,
  type AnuncioCreado,
} from "./utils/anuncios";
import { compradorVerificado, sesionNueva } from "./utils/comprador";
import {
  alertaConfirmada,
  banda,
  confirmar,
  correoNuevo,
  crearAlerta,
  ipNueva,
  lit,
  mensaje,
  miResumen,
  reclamar,
  sqlCrearAlerta,
  type CriteriosAlerta,
} from "./utils/alertas";
import type {
  AlertaDelTelefono,
  ListaDetalle,
  ListaResumen,
  ResultadoBusqueda,
} from "../../src/lib/supabase/types";

// S9 «Guardar y avisar» — la base de datos: favoritos, listas con notas, alertas por correo, el precio del
// dueño y el cupo de correos. Habla con las RPC públicas con el anon key real y llama como `postgres` a las del
// servidor (el rol con el que las llamaría la llave de servicio). Datos 100 % sintéticos; cada prueba crea sus
// propios anuncios, compradores y correos (los correos son de dominio reservado) porque la base local se
// comparte entre specs. Los anuncios de cada alerta se aíslan con una BANDA de precio estrecha y única.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TOKEN_FALSO = "token_falso_que_no_existe_en_la_base_de_dat";
const UUID_NULO = "00000000-0000-0000-0000-000000000000";
const DIRECCION = "Calle 93 # 14-20 piso 3";

const api = () => createClient(url, anon);

function guardarPrecio(a: AnuncioCreado, precio: number) {
  return api().rpc("guardar_precio", { p_token: a.token, p_precio: precio });
}

function poligonoPostgres(zonaUrl: string): string {
  // La zona de la URL es «lat,lng;…»; Postgres quiere «((lng,lat),…)».
  const pts = zonaUrl.split(";").map((p) => {
    const [lat, lng] = p.split(",");
    return `(${lng},${lat})`;
  });
  return `(${pts.join(",")})`;
}

// Muchos anuncios, creados una sola vez por trabajador (los topes de 30 y 100 los piden).
let muchos: Promise<AnuncioCreado[]> | null = null;
function anunciosMuchos(n: number): Promise<AnuncioCreado[]> {
  muchos ??= (async () => {
    const lista: AnuncioCreado[] = [];
    for (let i = 0; i < n; i += 20) {
      const tanda = await Promise.all(
        Array.from({ length: Math.min(20, n - i) }, () => crearAnuncio()),
      );
      lista.push(...tanda);
    }
    return lista;
  })();
  return muchos;
}

// ── Tablas y funciones cerradas ──────────────────────────────────────────────

test("el anónimo NO lee ni escribe ninguna tabla nueva", async () => {
  const supabase = api();
  for (const tabla of [
    "alertas",
    "enlaces_alerta",
    "cambios_de_precio",
    "favoritos",
    "listas",
    "lista_inmuebles",
    "notas_lista",
    "correos_dia",
  ] as const) {
    const { data } = await supabase.from(tabla).select("*");
    expect(data ?? [], tabla).toHaveLength(0);
  }
  const { error } = await supabase
    .from("alertas")
    .insert({ email: "intruso@ejemplo.test" } as never);
  expect(error).not.toBeNull();
});

test("el anónimo NO puede crear alertas, reclamar resúmenes ni contar correos (le entregarían el token de confirmar)", async () => {
  const supabase = api();
  for (const [fn, args] of [
    [
      "crear_alerta",
      {
        p_email: "x@ejemplo.test",
        p_idioma: "es",
        p_nombre: "x",
        p_operacion: "venta",
        p_tipo: null,
        p_localidad: null,
        p_precio_min: null,
        p_precio_max: null,
        p_habitaciones_min: null,
        p_poligono: null,
        p_avisar_nuevos: true,
        p_avisar_bajas: true,
        p_consentimiento: true,
        p_ip_hash: "ip-sintetica-123",
      },
    ],
    ["reclamar_resumenes", {}],
    ["sumar_correos_dia", { p_clase: "visita", p_n: 1 }],
    ["fila_anuncio", { p_id: UUID_NULO }],
  ] as const) {
    const { error } = await supabase.rpc(fn as never, args as never);
    expect(error?.code, fn).toBe("42501");
  }
});

// ── El precio del dueño y su historial ────────────────────────────────────────

test("guardar_precio: solo con el token, en rango, y cada cambio queda en el historial", async () => {
  const a = await crearAnuncio();
  const historial = () =>
    consultar(
      `select anterior || ':' || nuevo from public.cambios_de_precio where inmueble_id = '${a.id}' order by created_at, nuevo`,
    );

  expect(
    (await guardarPrecio({ ...a, token: TOKEN_FALSO }, 500)).error,
  ).not.toBeNull();
  expect((await guardarPrecio(a, 999_999)).error?.message).toContain(
    "precio_invalido",
  );
  expect((await guardarPrecio(a, 900_000_000_001)).error?.message).toContain(
    "precio_invalido",
  );
  expect(historial()).toEqual([]);

  const r = await guardarPrecio(a, a.precio - 5_000_000);
  expect(r.error).toBeNull();
  expect(r.data).toEqual({ precio_esperado: a.precio - 5_000_000 });
  expect(historial()).toEqual([`${a.precio}:${a.precio - 5_000_000}`]);

  // El mismo precio no es un cambio.
  await guardarPrecio(a, a.precio - 5_000_000);
  expect(historial()).toHaveLength(1);

  // «Mi anuncio» lo devuelve ya cambiado.
  const { data } = await api().rpc("obtener_mi_anuncio", { p_token: a.token });
  expect((data as { precio_esperado: number }).precio_esperado).toBe(
    a.precio - 5_000_000,
  );

  // A lo más 5 cambios en 24 h.
  for (let i = 1; i <= 4; i++) {
    expect(
      (await guardarPrecio(a, a.precio - 5_000_000 - i * 1000)).error,
    ).toBeNull();
  }
  expect(
    (await guardarPrecio(a, a.precio - 9_000_000)).error?.message,
  ).toContain("demasiados_cambios");
});

// ── La búsqueda compartida con las alertas ────────────────────────────────────

test("buscar_inmuebles y el ayudante inmuebles_que_cumplen dicen lo mismo, y el polígono malo sigue fallando", async () => {
  const a = await crearAnuncio({
    barrio: "Los Rosales",
    habitaciones: 3,
    tipo: "apartamento",
    operacion: "venta",
  });
  const b = banda(a.precio);
  const buscar = async (extra: Record<string, unknown>) => {
    const { data, error } = await api().rpc("buscar_inmuebles", {
      p_precio_min: b.precioMin,
      p_precio_max: b.precioMax,
      ...extra,
    });
    expect(error).toBeNull();
    return (data as ResultadoBusqueda[]).map((f) => f.slug);
  };
  const cumplen = (extra: {
    op?: string;
    tipo?: string;
    loc?: string;
    hab?: number;
    pol?: string;
  }) =>
    consultar(
      `select i.slug from public.inmuebles i where i.id in (
         select c from public.inmuebles_que_cumplen(
           ${extra.op ? lit(extra.op) : "null"}::public.operacion,
           ${extra.tipo ? lit(extra.tipo) : "null"}::public.tipo_inmueble,
           ${lit(extra.loc ?? null)}, ${b.precioMin}, ${b.precioMax},
           ${extra.hab ?? "null"}::smallint, ${lit(extra.pol ?? null)}) c)
       order by 1`,
    );

  const casos: Array<[Record<string, unknown>, Parameters<typeof cumplen>[0]]> =
    [
      [{}, {}],
      [{ p_operacion: "venta" }, { op: "venta" }],
      [{ p_operacion: "arriendo" }, { op: "arriendo" }],
      [{ p_tipo: "casa" }, { tipo: "casa" }],
      [{ p_tipo: "apartamento" }, { tipo: "apartamento" }],
      [{ p_habitaciones_min: 3 }, { hab: 3 }],
      [{ p_habitaciones_min: 4 }, { hab: 4 }],
      [{ p_localidad: "chapinero" }, { loc: "chapinero" }],
      [{ p_localidad: "Usaquén" }, { loc: "Usaquén" }],
      [
        { p_poligono: poligonoPostgres(ZONA_ROSALES) },
        { pol: poligonoPostgres(ZONA_ROSALES) },
      ],
      [
        { p_poligono: poligonoPostgres(ZONA_SUBA) },
        { pol: poligonoPostgres(ZONA_SUBA) },
      ],
    ];
  for (const [rpc, helper] of casos) {
    expect((await buscar(rpc)).sort(), JSON.stringify(rpc)).toEqual(
      cumplen(helper),
    );
  }
  // Y el anuncio aparece donde debe.
  expect(await buscar({})).toEqual([a.slug]);
  expect(await buscar({ p_poligono: poligonoPostgres(ZONA_ROSALES) })).toEqual([
    a.slug,
  ]);
  expect(await buscar({ p_poligono: poligonoPostgres(ZONA_SUBA) })).toEqual([]);
  // Un anuncio vencido sale de la búsqueda.
  vencer(a);
  expect(await buscar({})).toEqual([]);

  // El polígono malo falla aunque no haya anuncios que mostrar.
  for (const malo of ["basura", "((1,1),(2,2))"]) {
    const { error } = await api().rpc("buscar_inmuebles", {
      p_precio_min: 1,
      p_precio_max: 2,
      p_poligono: malo,
    });
    expect(error?.message, malo).toContain("poligono_invalido");
  }
});

test("resumen_anuncios: en el orden pedido, solo visibles, ignora lo desconocido, sin dirección", async () => {
  const [a, b, c] = await Promise.all([
    crearAnuncio({ direccion: DIRECCION }),
    crearAnuncio({ direccion: DIRECCION }),
    crearAnuncio({ direccion: DIRECCION }),
  ]);
  vencer(c);
  const { data, error } = await api().rpc("resumen_anuncios", {
    p_slugs: [b.slug, "no-existe-123", c.slug, a.slug],
  });
  expect(error).toBeNull();
  const filas = data as ResultadoBusqueda[];
  expect(filas.map((f) => f.slug)).toEqual([b.slug, a.slug]);
  expect(JSON.stringify(filas)).not.toContain("Calle 93");
  expect(JSON.stringify(filas)).not.toContain("direccion");
  // Más de 100 se recortan a 100 sin fallar.
  const { error: e2 } = await api().rpc("resumen_anuncios", {
    p_slugs: Array.from({ length: 150 }, (_, i) => `x-${i}`),
  });
  expect(e2).toBeNull();
});

// ── Favoritos ─────────────────────────────────────────────────────────────────

test("sin WhatsApp verificado no hay favoritos de cuenta: 42501", async () => {
  const supabase = api();
  const sesion = sesionNueva();
  for (const [fn, args] of [
    ["mis_favoritos", { p_sesion_hash: sesion }],
    ["fusionar_favoritos", { p_sesion_hash: sesion, p_slugs: ["x"] }],
    ["quitar_favorito", { p_sesion_hash: sesion, p_slug: "x" }],
    ["mis_listas", { p_sesion_hash: sesion }],
    ["crear_lista", { p_sesion_hash: sesion, p_nombre: "x" }],
  ] as const) {
    const { error } = await supabase.rpc(fn, args as never);
    expect(error?.code, fn).toBe("42501");
  }
});

test("fusionar favoritos: sin duplicados, ignora lo inexistente y lo vencido, y quitar funciona", async () => {
  const [a, b, c] = await Promise.all([
    crearAnuncio(),
    crearAnuncio(),
    crearAnuncio(),
  ]);
  const { sesion } = await compradorVerificado();
  const fusionar = async (slugs: string[]) => {
    const { data, error } = await api().rpc("fusionar_favoritos", {
      p_sesion_hash: sesion,
      p_slugs: slugs,
    });
    expect(error).toBeNull();
    return data as string[];
  };

  // Dos veces lo mismo, uno repetido, uno inexistente: queda uno de cada.
  expect(
    (await fusionar([a.slug, b.slug, a.slug, "no-existe-123"])).sort(),
  ).toEqual([a.slug, b.slug].sort());
  expect((await fusionar([a.slug, b.slug])).sort()).toEqual(
    [a.slug, b.slug].sort(),
  );
  expect(
    consultar(
      `select count(*) from public.favoritos f join public.compradores c on c.id = f.comprador_id
         join public.verificaciones v on v.comprador_id = c.id where v.sesion_hash = '${sesion}'`,
    ),
  ).toEqual(["2"]);

  // Suma el que faltaba; el último guardado va primero.
  expect((await fusionar([c.slug]))[0]).toBe(c.slug);

  // Un vencido no se suma y sale de «mis favoritos».
  vencer(b);
  const { data } = await api().rpc("mis_favoritos", { p_sesion_hash: sesion });
  expect((data as string[]).sort()).toEqual([a.slug, c.slug].sort());

  const q = await api().rpc("quitar_favorito", {
    p_sesion_hash: sesion,
    p_slug: a.slug,
  });
  expect(q.error).toBeNull();
  // Quitar lo que no está no falla.
  expect(
    (
      await api().rpc("quitar_favorito", {
        p_sesion_hash: sesion,
        p_slug: "no-existe-123",
      })
    ).error,
  ).toBeNull();
  const { data: despues } = await api().rpc("mis_favoritos", {
    p_sesion_hash: sesion,
  });
  expect(despues).toEqual([c.slug]);
});

test("el tope de 100 favoritos conserva los más nuevos", async () => {
  test.setTimeout(120_000);
  const todos = await anunciosMuchos(102);
  const { sesion } = await compradorVerificado();
  const slugs = todos.map((x) => x.slug);
  // Los primeros 60, luego los últimos 42 (más nuevos): 102 en total, y la base se queda con 100.
  const fusionar = (s: string[]) =>
    api().rpc("fusionar_favoritos", { p_sesion_hash: sesion, p_slugs: s });
  expect((await fusionar(slugs.slice(0, 60))).error).toBeNull();
  const r = await fusionar(slugs.slice(60));
  expect(r.error).toBeNull();
  const guardados = r.data as string[];
  expect(guardados).toHaveLength(100);
  // Se conservan los 42 más nuevos; de los 60 viejos (que comparten marca de tiempo) se van dos.
  for (const s of slugs.slice(60)) expect(guardados).toContain(s);
  expect(slugs.slice(0, 60).filter((s) => guardados.includes(s))).toHaveLength(
    58,
  );
});

// ── Listas y notas ────────────────────────────────────────────────────────────

test("listas: se crean, renombran y borran; máx. 10; la ajena es «no disponible»", async () => {
  const dueña = await compradorVerificado();
  const otra = await compradorVerificado();
  const crear = (sesion: string, nombre: string) =>
    api().rpc("crear_lista", { p_sesion_hash: sesion, p_nombre: nombre });

  const { data: id, error } = await crear(dueña.sesion, "  Para nosotros  ");
  expect(error).toBeNull();
  expect(typeof id).toBe("string");
  expect((await crear(dueña.sesion, "   ")).error?.message).toContain(
    "nombre_invalido",
  );
  expect((await crear(dueña.sesion, "x".repeat(61))).error?.message).toContain(
    "nombre_invalido",
  );

  const ren = await api().rpc("renombrar_lista", {
    p_sesion_hash: dueña.sesion,
    p_lista: id,
    p_nombre: "Cerca del colegio",
  });
  expect(ren.error).toBeNull();
  const { data: mias } = await api().rpc("mis_listas", {
    p_sesion_hash: dueña.sesion,
  });
  expect((mias as ListaResumen[]).map((l) => l.nombre)).toEqual([
    "Cerca del colegio",
  ]);
  expect((mias as ListaResumen[])[0]).toMatchObject({
    compartida: false,
    slugs: [],
    notas: 0,
  });

  // La de otra persona: ni renombrar ni borrar ni compartir.
  for (const [fn, args] of [
    [
      "renombrar_lista",
      { p_sesion_hash: otra.sesion, p_lista: id, p_nombre: "mía" },
    ],
    ["borrar_lista", { p_sesion_hash: otra.sesion, p_lista: id }],
    ["compartir_lista", { p_sesion_hash: otra.sesion, p_lista: id }],
    ["revocar_lista", { p_sesion_hash: otra.sesion, p_lista: id }],
  ] as const) {
    expect((await api().rpc(fn, args as never)).error?.code, fn).toBe("P0002");
  }
  expect(
    (await api().rpc("mis_listas", { p_sesion_hash: otra.sesion })).data,
  ).toEqual([]);

  // Hasta 10 listas.
  for (let i = 2; i <= 10; i++) {
    expect((await crear(dueña.sesion, `Lista ${i}`)).error).toBeNull();
  }
  expect((await crear(dueña.sesion, "La 11")).error?.message).toContain(
    "demasiadas_listas",
  );

  const del = await api().rpc("borrar_lista", {
    p_sesion_hash: dueña.sesion,
    p_lista: id,
  });
  expect(del.error).toBeNull();
  expect((await crear(dueña.sesion, "Ahora sí cabe")).error).toBeNull();
});

test("agregar a una lista: solo visibles, sin repetir, máx. 30, y quitar se lleva las notas", async () => {
  test.setTimeout(120_000);
  const todos = await anunciosMuchos(102);
  const { sesion } = await compradorVerificado({ nombre: "Camila Torres" });
  const { data: lista } = await api().rpc("crear_lista", {
    p_sesion_hash: sesion,
    p_nombre: "Treinta",
  });
  const agregar = (slug: string) =>
    api().rpc("agregar_a_lista", {
      p_sesion_hash: sesion,
      p_lista: lista,
      p_slug: slug,
    });

  for (const x of todos.slice(0, 30))
    expect((await agregar(x.slug)).error).toBeNull();
  // Repetir uno que ya está no cuenta como uno nuevo.
  expect((await agregar(todos[0].slug)).error).toBeNull();
  expect((await agregar(todos[30].slug)).error?.message).toContain(
    "lista_llena",
  );
  expect((await agregar("no-existe-123")).error?.code).toBe("P0002");

  // Una nota y luego quitar el anuncio: la nota se va con él.
  const nota = await api().rpc("escribir_nota", {
    p_sesion_hash: sesion,
    p_lista: lista,
    p_token: null,
    p_slug: todos[0].slug,
    p_texto: "Me gusta el balcón",
  });
  expect(nota.error).toBeNull();
  const quitar = await api().rpc("quitar_de_lista", {
    p_sesion_hash: sesion,
    p_lista: lista,
    p_slug: todos[0].slug,
  });
  expect(quitar.error).toBeNull();
  expect(
    consultar(
      `select count(*) from public.notas_lista where lista_id = '${lista}'`,
    ),
  ).toEqual(["0"]);
  const { data } = await api().rpc("mis_listas", { p_sesion_hash: sesion });
  expect((data as ListaResumen[])[0].slugs).toHaveLength(29);
});

test("compartir una lista: el enlace sirve sin sesión, se puede rotar y revocar, y no filtra datos de nadie", async () => {
  const [a, b] = await Promise.all([
    crearAnuncio({ direccion: DIRECCION }),
    crearAnuncio({ direccion: DIRECCION }),
  ]);
  const dueña = await compradorVerificado({ nombre: "Laura Gómez" });
  const { data: lista } = await api().rpc("crear_lista", {
    p_sesion_hash: dueña.sesion,
    p_nombre: "Para nosotros",
  });
  for (const x of [a, b]) {
    await api().rpc("agregar_a_lista", {
      p_sesion_hash: dueña.sesion,
      p_lista: lista,
      p_slug: x.slug,
    });
  }
  const ver = (token: string, sesion: string | null = null) =>
    api().rpc("obtener_lista", {
      p_sesion_hash: sesion,
      p_token: token,
      p_lista: null,
    });

  // Sin compartir, ningún token la abre.
  expect((await ver(TOKEN_FALSO)).error?.code).toBe("P0002");

  const { data: token1 } = await api().rpc("compartir_lista", {
    p_sesion_hash: dueña.sesion,
    p_lista: lista,
  });
  expect(token1).toMatch(/^[A-Za-z0-9_-]{43}$/);

  // Quien llega con el enlace, sin cuenta: ve la lista, no puede escribir y no hay datos personales.
  const visto = await ver(token1 as string);
  expect(visto.error).toBeNull();
  const detalle = visto.data as ListaDetalle;
  expect(detalle).toMatchObject({
    nombre: "Para nosotros",
    dueno: "Laura",
    es_dueno: false,
    puede_escribir: false,
    compartida: true,
    no_disponibles: 0,
  });
  expect(detalle.items.map((i) => i.slug).sort()).toEqual(
    [a.slug, b.slug].sort(),
  );
  const bruto = JSON.stringify(visto.data);
  expect(bruto).not.toContain(dueña.telefono);
  expect(bruto).not.toContain("Gómez");
  expect(bruto).not.toContain("Calle 93");

  // Con sesión verificada de otra persona puede escribir; la dueña aparece como dueña.
  const otra = await compradorVerificado();
  expect(
    ((await ver(token1 as string, otra.sesion)).data as ListaDetalle)
      .puede_escribir,
  ).toBe(true);
  expect(
    ((await ver(token1 as string, dueña.sesion)).data as ListaDetalle).es_dueno,
  ).toBe(true);

  // Un enlace nuevo mata el anterior.
  const { data: token2 } = await api().rpc("compartir_lista", {
    p_sesion_hash: dueña.sesion,
    p_lista: lista,
  });
  expect(token2).not.toBe(token1);
  expect((await ver(token1 as string)).error?.code).toBe("P0002");
  expect((await ver(token2 as string)).error).toBeNull();

  // Revocar: nadie la abre con el enlace; la dueña sigue viéndola por su id.
  expect(
    (
      await api().rpc("revocar_lista", {
        p_sesion_hash: dueña.sesion,
        p_lista: lista,
      })
    ).error,
  ).toBeNull();
  expect((await ver(token2 as string)).error?.code).toBe("P0002");
  const propia = await api().rpc("obtener_lista", {
    p_sesion_hash: dueña.sesion,
    p_token: null,
    p_lista: lista,
  });
  expect((propia.data as ListaDetalle).compartida).toBe(false);
  // Otra persona no entra por el id.
  const ajena = await api().rpc("obtener_lista", {
    p_sesion_hash: otra.sesion,
    p_token: null,
    p_lista: lista,
  });
  expect(ajena.error?.code).toBe("P0002");

  // En la base solo está el hash del token.
  expect(
    consultar(
      `select count(*) from public.listas t where t::text like '%${token1}%' or t::text like '%${token2}%'`,
    ),
  ).toEqual(["0"]);

  // Un anuncio que venció desaparece de la vista y se cuenta aparte.
  const { data: token3 } = await api().rpc("compartir_lista", {
    p_sesion_hash: dueña.sesion,
    p_lista: lista,
  });
  vencer(b);
  const tras = (await ver(token3 as string)).data as ListaDetalle;
  expect(tras.items.map((i) => i.slug)).toEqual([a.slug]);
  expect(tras.no_disponibles).toBe(1);
});

test("las notas exigen WhatsApp verificado, traen solo el primer nombre y las borra quien las escribió o la dueña", async () => {
  const a = await crearAnuncio();
  const dueña = await compradorVerificado({ nombre: "Laura Gómez" });
  const camilo = await compradorVerificado({ nombre: "Camilo Restrepo Díaz" });
  const intruso = await compradorVerificado({ nombre: "Intruso Sintetico" });
  const { data: lista } = await api().rpc("crear_lista", {
    p_sesion_hash: dueña.sesion,
    p_nombre: "Para nosotros",
  });
  await api().rpc("agregar_a_lista", {
    p_sesion_hash: dueña.sesion,
    p_lista: lista,
    p_slug: a.slug,
  });
  const { data: token } = await api().rpc("compartir_lista", {
    p_sesion_hash: dueña.sesion,
    p_lista: lista,
  });
  const nota = (
    sesion: string,
    texto: string,
    via: { token?: string; lista?: string } = { token: token as string },
  ) =>
    api().rpc("escribir_nota", {
      p_sesion_hash: sesion,
      p_lista: via.lista ?? null,
      p_token: via.token ?? null,
      p_slug: a.slug,
      p_texto: texto,
    });

  // Sin verificar: 42501, aunque tenga el enlace.
  expect((await nota(sesionNueva(), "Hola")).error?.code).toBe("42501");
  // Con un enlace falso, un anuncio que no está en la lista o un texto malo: nada.
  expect(
    (await nota(camilo.sesion, "Hola", { token: TOKEN_FALSO })).error?.code,
  ).toBe("P0002");
  expect(
    (
      await api().rpc("escribir_nota", {
        p_sesion_hash: camilo.sesion,
        p_lista: null,
        p_token: token,
        p_slug: "no-esta-en-la-lista",
        p_texto: "Hola",
      })
    ).error?.code,
  ).toBe("P0002");
  expect((await nota(camilo.sesion, "   ")).error?.message).toContain(
    "nota_invalida",
  );
  expect((await nota(camilo.sesion, "x".repeat(281))).error?.message).toContain(
    "nota_invalida",
  );
  expect(
    consultar(
      `select count(*) from public.notas_lista where lista_id = '${lista}'`,
    ),
  ).toEqual(["0"]);

  // Camilo escribe por el enlace; la dueña, por su lista.
  const nCamilo = await nota(
    camilo.sesion,
    "Me gusta el balcón. ¿Cuánto es la administración?",
  );
  expect(nCamilo.error).toBeNull();
  const nDueña = await nota(dueña.sesion, "Visita el sábado a las 10.", {
    lista: lista as string,
  });
  expect(nDueña.error).toBeNull();

  const vistaCamilo = await api().rpc("obtener_lista", {
    p_sesion_hash: camilo.sesion,
    p_token: token,
    p_lista: null,
  });
  const notas = (vistaCamilo.data as ListaDetalle).items[0].notas;
  expect(notas.map((n) => [n.autor, n.es_mia])).toEqual([
    ["Camilo", true],
    ["Laura", false],
  ]);
  const bruto = JSON.stringify(vistaCamilo.data);
  expect(bruto).not.toContain("Restrepo");
  expect(bruto).not.toContain(camilo.telefono);

  // Borrar: un tercero no puede; la dueña borra la de Camilo; Camilo borra la suya.
  expect(
    (
      await api().rpc("borrar_nota", {
        p_sesion_hash: intruso.sesion,
        p_nota: nCamilo.data,
      })
    ).error?.code,
  ).toBe("P0002");
  expect(
    (
      await api().rpc("borrar_nota", {
        p_sesion_hash: dueña.sesion,
        p_nota: nCamilo.data,
      })
    ).error,
  ).toBeNull();
  const otra = await nota(camilo.sesion, "Otra");
  expect(otra.error).toBeNull();
  expect(
    (
      await api().rpc("borrar_nota", {
        p_sesion_hash: camilo.sesion,
        p_nota: otra.data,
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await api().rpc("borrar_nota", {
        p_sesion_hash: camilo.sesion,
        p_nota: UUID_NULO,
      })
    ).error?.code,
  ).toBe("P0002");
});

test("el tope de notas: 50 al día por persona", async () => {
  test.setTimeout(120_000);
  const a = await crearAnuncio();
  const { sesion } = await compradorVerificado();
  const { data: lista } = await api().rpc("crear_lista", {
    p_sesion_hash: sesion,
    p_nombre: "Notas",
  });
  await api().rpc("agregar_a_lista", {
    p_sesion_hash: sesion,
    p_lista: lista,
    p_slug: a.slug,
  });
  const escribir = () =>
    api().rpc("escribir_nota", {
      p_sesion_hash: sesion,
      p_lista: lista,
      p_token: null,
      p_slug: a.slug,
      p_texto: "nota",
    });
  // Cincuenta pasan (en tandas, para no hacerlas una por una).
  for (let i = 0; i < 50; i += 10) {
    const tanda = await Promise.all(Array.from({ length: 10 }, escribir));
    for (const r of tanda) expect(r.error).toBeNull();
  }
  expect((await escribir()).error?.message).toContain("demasiadas_notas");
});

// ── Alertas: crear y confirmar ────────────────────────────────────────────────

test("crear_alerta rechaza lo inválido y no deja nada: sin consentimiento, correo malo, sin criterios, sin aviso, polígono malo", async () => {
  const email = correoNuevo();
  const base = { email, precioMin: 1_000_000, precioMax: 2_000_000 };
  const casos: Array<[CriteriosAlerta, string]> = [
    [{ ...base, consentimiento: false }, "consentimiento_requerido"],
    [{ ...base, email: "no-es-un-correo" }, "email_invalido"],
    [{ ...base, email: `${"a".repeat(250)}@ejemplo.test` }, "email_invalido"],
    [{ email, precioMin: null, precioMax: null }, "sin_criterios"],
    [{ ...base, nuevos: false, bajas: false }, "sin_aviso"],
    [{ ...base, nombre: "   " }, "nombre_invalido"],
    [{ ...base, idioma: "fr" as never }, "idioma_invalido"],
    [{ ...base, precioMin: 5, precioMax: 1 }, "criterios_invalidos"],
    [{ ...base, poligono: "basura" }, "poligono_invalido"],
    [{ ...base, ip: "x" }, "ip_invalida"],
  ];
  for (const [c, esperado] of casos) {
    expect(
      mensaje(() => consultar(sqlCrearAlerta(c))),
      esperado,
    ).toContain(esperado);
  }
  expect(
    consultar(
      `select count(*) from public.alertas where email = ${lit(email)}`,
    ),
  ).toEqual(["0"]);
});

test("una alerta nace SIN confirmar: la base guarda solo hashes y confirmar exige el token que llegó por correo", async () => {
  const email = correoNuevo();
  const a = crearAlerta({ email, ...banda(precioUnico()) });
  expect(a.gestionar).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(a.confirmar).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(a.gestionar).not.toBe(a.confirmar);
  expect(
    consultar(
      `select confirmada_at is null, desde_at is null from public.alertas where id = '${a.alerta_id}'`,
    ),
  ).toEqual(["t|t"]);
  // Ni token en claro, ni en la alerta ni en sus enlaces.
  for (const t of ["alertas", "enlaces_alerta"]) {
    expect(
      consultar(
        `select count(*) from public.${t} x where x::text like '%${a.gestionar}%' or x::text like '%${a.confirmar}%'`,
      ),
      t,
    ).toEqual(["0"]);
  }
  // El correo se guarda en minúsculas.
  expect(
    consultar(`select email from public.alertas where id = '${a.alerta_id}'`),
  ).toEqual([email]);

  const supabase = api();
  // Un token inventado, el de gestionar (otro propósito) o uno corto: no confirman.
  for (const malo of [TOKEN_FALSO, a.gestionar, "corto"]) {
    expect(
      (await supabase.rpc("confirmar_alerta", { p_token: malo })).error
        ?.message,
      malo,
    ).toContain("token_invalido");
  }
  expect(
    consultar(
      `select confirmada_at is null from public.alertas where id = '${a.alerta_id}'`,
    ),
  ).toEqual(["t"]);

  // El de confirmar sí; repetirlo es inofensivo.
  const ok = await supabase.rpc("confirmar_alerta", { p_token: a.confirmar });
  expect(ok.error).toBeNull();
  expect(ok.data).toMatchObject({ estado: "confirmada" });
  expect(
    consultar(
      `select confirmada_at is not null, desde_at is not null from public.alertas where id = '${a.alerta_id}'`,
    ),
  ).toEqual(["t|t"]);
  const otra = await supabase.rpc("confirmar_alerta", { p_token: a.confirmar });
  expect(otra.data).toMatchObject({ estado: "ya_confirmada" });
});

test("el token de confirmar vence a los 7 días y una alerta dada de baja ya no se confirma", async () => {
  const vieja = crearAlerta({ ...banda(precioUnico()) });
  consultar(
    `update public.enlaces_alerta set created_at = now() - interval '8 days' where alerta_id = '${vieja.alerta_id}' and proposito = 'confirmar'`,
  );
  expect(
    (await api().rpc("confirmar_alerta", { p_token: vieja.confirmar })).error
      ?.message,
  ).toContain("token_invalido");

  const borrada = crearAlerta({ ...banda(precioUnico()) });
  await api().rpc("gestionar_alerta", {
    p_token: borrada.gestionar,
    p_accion: "borrar",
  });
  expect(
    (await api().rpc("confirmar_alerta", { p_token: borrada.confirmar })).error
      ?.message,
  ).toContain("token_invalido");
});

// ── Alertas: lo que entra en el resumen ───────────────────────────────────────

test("NINGÚN aviso sale a un correo sin confirmar, ni aunque haya coincidencias", async () => {
  const precio = precioUnico();
  const a = crearAlerta({ ...banda(precio) });
  await crearAnuncio({ precio });
  // Aún sin confirmar: nada. Y la ventana no se mueve.
  const r = reclamar(a.alerta_id);
  expect(r.alertas).toEqual([]);
  expect(
    consultar(
      `select ultimo_envio_at is null, desde_at is null from public.alertas where id = '${a.alerta_id}'`,
    ),
  ).toEqual(["t|t"]);
  // Una vez confirmada, lo anterior a la confirmación tampoco cuenta como nuevo.
  expect(confirmar(a.confirmar).estado).toBe("confirmada");
  expect(reclamar(a.alerta_id).alertas).toEqual([]);
});

test("un anuncio nuevo entra al resumen UNA sola vez, con tokens nuevos y sin dirección", async () => {
  const precio = precioUnico();
  const a = alertaConfirmada({
    ...banda(precio),
    nombre: "Apartamentos en Rosales",
  });
  const nuevo = await crearAnuncio({ precio, direccion: DIRECCION });

  const r1 = reclamar(a.alerta_id);
  const mio = miResumen(r1, a.alerta_id)!;
  expect(mio).toBeDefined();
  expect(mio).toMatchObject({
    idioma: "es",
    nombre: "Apartamentos en Rosales",
    total_nuevos: 1,
    total_bajas: 0,
    bajas: [],
  });
  expect(mio.nuevos.map((x) => x.slug)).toEqual([nuevo.slug]);
  expect(mio.token_gestionar).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(mio.token_baja).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(mio.token_gestionar).not.toBe(a.gestionar);
  expect(JSON.stringify(mio)).not.toContain("Calle 93");
  expect(JSON.stringify(mio)).not.toContain("direccion");
  expect(
    consultar(
      `select ultimo_resumen::text from public.alertas where id = '${a.alerta_id}'`,
    ),
  ).toEqual(['{"bajas": 0, "nuevos": 1}']);

  // Segunda corrida el mismo día: cero. Un anuncio más tampoco la despierta hasta mañana.
  expect(reclamar(a.alerta_id).alertas).toEqual([]);
  await crearAnuncio({ precio });
  expect(reclamar(a.alerta_id).alertas).toEqual([]);

  // Mañana (simulado): sale solo lo que llegó después del último resumen, y ya no se repite el primero.
  consultar(
    `update public.alertas set ultimo_envio_at = now() - interval '1 day' where id = '${a.alerta_id}'`,
  );
  const r3 = miResumen(reclamar(a.alerta_id), a.alerta_id)!;
  expect(r3.total_nuevos).toBe(1);
  expect(r3.nuevos.map((x) => x.slug)).not.toContain(nuevo.slug);
});

test("el resumen lleva a lo más 10 anuncios y cuenta el total", async () => {
  test.setTimeout(120_000);
  const base = precioUnico();
  const a = alertaConfirmada({ precioMin: base, precioMax: base + 100 });
  await Promise.all(
    Array.from({ length: 12 }, (_, i) => crearAnuncio({ precio: base + i })),
  );
  const mio = miResumen(reclamar(a.alerta_id), a.alerta_id)!;
  expect(mio.total_nuevos).toBe(12);
  expect(mio.nuevos).toHaveLength(10);
});

test("una baja de precio entra al resumen; una subida no; bajar y volver a subir no avisa", async () => {
  const bajador = await crearAnuncio();
  const subidor = await crearAnuncio();
  const vaiven = await crearAnuncio();
  // S16: «bajó de precio» pide al menos un 1 %. El bajador baja un 2 %; la banda de su alerta va alrededor del precio NUEVO.
  const bajado = bajador.precio - Math.round(bajador.precio * 0.02);
  // Tres alertas con la banda de cada anuncio (nada de lo de otros cae dentro).
  const aBaja = alertaConfirmada({
    precioMin: bajado - 5000,
    precioMax: bajado + 5000,
  });
  const aSube = alertaConfirmada({
    precioMin: subidor.precio - 5000,
    precioMax: subidor.precio + 5000,
  });
  const aVaiven = alertaConfirmada({
    precioMin: vaiven.precio - 5000,
    precioMax: vaiven.precio + 5000,
  });

  expect((await guardarPrecio(bajador, bajado)).error).toBeNull();
  expect(
    (await guardarPrecio(subidor, subidor.precio + 2000)).error,
  ).toBeNull();
  expect((await guardarPrecio(vaiven, vaiven.precio - 3000)).error).toBeNull();
  expect((await guardarPrecio(vaiven, vaiven.precio + 1000)).error).toBeNull();

  const mio = miResumen(reclamar(aBaja.alerta_id), aBaja.alerta_id)!;
  expect(mio.total_bajas).toBe(1);
  expect(mio.total_nuevos).toBe(0);
  expect(mio.bajas[0]).toMatchObject({
    slug: bajador.slug,
    precio_anterior: bajador.precio,
    precio_esperado: bajado,
  });

  // Una subida no es una baja.
  expect(reclamar(aSube.alerta_id).alertas).toEqual([]);
  // Quedó más caro que al empezar la ventana: tampoco.
  expect(reclamar(aVaiven.alerta_id).alertas).toEqual([]);
});

test("bajar menos del 1 % no es una noticia: no entra al resumen (S16)", async () => {
  const x = await crearAnuncio();
  const casi = x.precio - Math.round(x.precio * 0.005);
  const a = alertaConfirmada({ precioMin: casi - 5000, precioMax: casi + 5000 });
  expect((await guardarPrecio(x, casi)).error).toBeNull();
  expect(reclamar(a.alerta_id).alertas).toEqual([]);
});

test("las bajas se miden contra el precio al empezar la ventana, no contra el último resumen", async () => {
  const x = await crearAnuncio();
  // S16: cada baja de al menos un 1 % (2 % y luego 4 % del original); la banda cubre los dos precios nuevos.
  const uno = x.precio - Math.round(x.precio * 0.02);
  const dos = x.precio - Math.round(x.precio * 0.04);
  const a = alertaConfirmada({
    precioMin: dos - 5000,
    precioMax: uno + 5000,
  });
  await guardarPrecio(x, uno);
  expect(miResumen(reclamar(a.alerta_id), a.alerta_id)!.bajas[0]).toMatchObject(
    {
      precio_anterior: x.precio,
    },
  );
  // Mañana baja otra vez: el «anterior» es el precio de ayer, no el original.
  consultar(
    `update public.alertas set ultimo_envio_at = now() - interval '1 day' where id = '${a.alerta_id}'`,
  );
  await guardarPrecio(x, dos);
  const r = miResumen(reclamar(a.alerta_id), a.alerta_id)!;
  expect(r.bajas[0]).toMatchObject({
    precio_anterior: uno,
    precio_esperado: dos,
  });
});

test("un anuncio nuevo va en «nuevos» y no en «bajas»; apagar las bajas las excluye", async () => {
  const precio = precioUnico();
  const soloBajas = alertaConfirmada({
    ...banda(precio),
    nuevos: false,
    bajas: true,
  });
  const soloNuevos = alertaConfirmada({
    ...banda(precio),
    nuevos: true,
    bajas: false,
  });
  const nuevo = await crearAnuncio({ precio });
  await guardarPrecio(nuevo, precio - 100);

  // Con solo bajas: un anuncio nacido en la ventana no es una baja, es nuevo (y no se pidió).
  expect(reclamar(soloBajas.alerta_id).alertas).toEqual([]);
  const r = miResumen(reclamar(soloNuevos.alerta_id), soloNuevos.alerta_id)!;
  expect(r.total_nuevos).toBe(1);
  expect(r.total_bajas).toBe(0);
});

test("sin novedades la ventana avanza, y el tope diario deja la alerta para mañana SIN perder nada", async () => {
  const precio = precioUnico();
  const a = alertaConfirmada({ ...banda(precio) });
  const desde = () =>
    consultar(
      `select extract(epoch from desde_at)::text from public.alertas where id = '${a.alerta_id}'`,
    )[0];
  const antes = desde();

  // Sin nada: no manda y la ventana avanza (sin gastar cupo).
  const vacia = reclamar(a.alerta_id);
  expect(vacia).toMatchObject({ alertas: [], sin_novedad: 1, diferidas: 0 });
  expect(Number(desde())).toBeGreaterThan(Number(antes));

  // Llega un anuncio, pero el cupo del día está agotado: no se reclama ni avanza nada.
  const nuevo = await crearAnuncio({ precio });
  const marca = desde();
  const sinCupo = reclamar(a.alerta_id, 0);
  expect(sinCupo).toMatchObject({ alertas: [], diferidas: 1 });
  expect(desde()).toBe(marca);
  expect(
    consultar(
      `select ultimo_envio_at is null from public.alertas where id = '${a.alerta_id}'`,
    ),
  ).toEqual(["t"]);

  // Con cupo otra vez, sale completo: el anuncio que quedó pendiente no se perdió.
  const ok = miResumen(reclamar(a.alerta_id), a.alerta_id)!;
  expect(ok.nuevos.map((x) => x.slug)).toEqual([nuevo.slug]);
});

test("el cupo: crear una alerta sin cupo no deja nada, y los correos de visita se cuentan pero NUNCA se bloquean", async () => {
  const email = correoNuevo();
  const msj = mensaje(() =>
    consultar(sqlCrearAlerta({ email, ...banda(precioUnico()), tope: 0 })),
  );
  expect(msj).toContain("sin_cupo");
  expect(
    consultar(
      `select count(*) from public.alertas where email = ${lit(email)}`,
    ),
  ).toEqual(["0"]);

  const hoy = () =>
    consultar(
      `select coalesce((select visita from public.correos_dia where dia = public.dia_bogota()), 0)`,
    )[0];
  const antes = Number(hoy());
  consultar(`select public.sumar_correos_dia('visita', 3)`);
  expect(Number(hoy()) - antes).toBeGreaterThanOrEqual(3);
  expect(
    mensaje(() => consultar(`select public.sumar_correos_dia('otra', 1)`)),
  ).toContain("clase_invalida");
  expect(
    mensaje(() => consultar(`select public.sumar_correos_dia('alerta', -1)`)),
  ).toContain("clase_invalida");
});

test("el cupo cuenta también las campañas del operador (envios): con el tope en lo ya usado no sale ningún resumen", async () => {
  const precio = precioUnico();
  const a = alertaConfirmada({ ...banda(precio) });
  await crearAnuncio({ precio });
  // El tope exacto de lo gastado hoy deja libre 0.
  const usado = Number(
    consultar(
      `select coalesce((select visita + alerta from public.correos_dia where dia = public.dia_bogota()), 0)
            + coalesce((select sum(enviados) from public.envios
                         where (created_at at time zone 'America/Bogota')::date = public.dia_bogota()), 0)`,
    )[0],
  );
  expect(reclamar(a.alerta_id, usado)).toMatchObject({
    alertas: [],
    diferidas: 1,
  });
});

// ── Alertas: gestionar, pausar, dar de baja ───────────────────────────────────

test("pausar y reanudar: pausada no manda; al reanudar la ventana empieza ahora", async () => {
  const precio = precioUnico();
  const a = alertaConfirmada({ ...banda(precio) });
  const gest = (accion: string) =>
    api().rpc("gestionar_alerta", { p_token: a.gestionar, p_accion: accion });

  expect((await gest("pausar")).data).toMatchObject({ estado: "pausada" });
  await crearAnuncio({ precio });
  expect(reclamar(a.alerta_id).alertas).toEqual([]);

  // Reanudar no manda lo que llegó durante la pausa.
  expect((await gest("reanudar")).data).toMatchObject({ estado: "activa" });
  expect(reclamar(a.alerta_id).alertas).toEqual([]);
  // Lo que llega después sí.
  await crearAnuncio({ precio });
  expect(miResumen(reclamar(a.alerta_id), a.alerta_id)!.total_nuevos).toBe(1);
});

test("gestionar: cambiar qué se avisa (siempre al menos una cosa), acción inválida y token falso", async () => {
  const a = alertaConfirmada({ ...banda(precioUnico()) });
  const gest = (accion: string, token = a.gestionar) =>
    api().rpc("gestionar_alerta", { p_token: token, p_accion: accion });

  expect((await gest("bajas_no")).data).toMatchObject({
    avisar_nuevos: true,
    avisar_bajas: false,
  });
  expect((await gest("nuevos_no")).error?.message).toContain("sin_aviso");
  expect((await gest("bajas_si")).data).toMatchObject({ avisar_bajas: true });
  expect((await gest("nuevos_no")).data).toMatchObject({
    avisar_nuevos: false,
    avisar_bajas: true,
  });
  expect((await gest("bajas_no")).error?.message).toContain("sin_aviso");
  expect((await gest("explotar")).error?.message).toContain("accion_invalida");
  expect((await gest("pausar", TOKEN_FALSO)).error?.message).toContain(
    "token_invalido",
  );
  // Los de confirmar y baja no gestionan.
  expect((await gest("pausar", a.confirmar)).error?.message).toContain(
    "token_invalido",
  );
});

test("«Mis alertas» de un teléfono: solo con sus tokens, el correo enmascarado y ningún token en la respuesta", async () => {
  const email = correoNuevo();
  const a = alertaConfirmada({
    email,
    ...banda(precioUnico()),
    nombre: "Mi alerta",
  });
  const sinConfirmar = crearAlerta({
    ...banda(precioUnico()),
    nombre: "Pendiente",
  });
  const { data, error } = await api().rpc("obtener_alertas", {
    p_tokens: [TOKEN_FALSO, a.gestionar, a.confirmar, sinConfirmar.gestionar],
  });
  expect(error).toBeNull();
  const filas = data as AlertaDelTelefono[];
  // Solo los de gestionar válidos, cada uno con su posición en la lista que mandó el teléfono.
  expect(filas.map((f) => [f.indice, f.nombre, f.estado])).toEqual([
    [1, "Mi alerta", "activa"],
    [3, "Pendiente", "sin_confirmar"],
  ]);
  expect(filas[0].correo).toBe(`${email[0]}***@ejemplo.test`);
  const bruto = JSON.stringify(data);
  expect(bruto).not.toContain(email);
  for (const t of [a.gestionar, a.confirmar, sinConfirmar.confirmar]) {
    expect(bruto).not.toContain(t);
  }
  // Más de 20 tokens: solo los primeros 20.
  const muchos = Array.from({ length: 30 }, () => TOKEN_FALSO);
  muchos[25] = a.gestionar;
  expect(
    (await api().rpc("obtener_alertas", { p_tokens: muchos }))
      .data as unknown[],
  ).toHaveLength(0);
  // Borrarla la saca de la lista.
  await api().rpc("gestionar_alerta", {
    p_token: a.gestionar,
    p_accion: "borrar",
  });
  expect(
    (await api().rpc("obtener_alertas", { p_tokens: [a.gestionar] })).data,
  ).toEqual([]);
});

test("la baja en un clic: con el token del correo, sin sesión, repetible, y corta los avisos", async () => {
  const precio = precioUnico();
  const a = alertaConfirmada({ ...banda(precio), nombre: "La que me quito" });
  await crearAnuncio({ precio });
  const mio = miResumen(reclamar(a.alerta_id), a.alerta_id)!;

  // Los tokens de confirmar y de gestionar NO dan de baja (cada token un solo propósito).
  for (const malo of [
    a.confirmar,
    a.gestionar,
    mio.token_gestionar,
    TOKEN_FALSO,
  ]) {
    expect(
      (await api().rpc("baja_alerta", { p_token: malo })).error?.message,
      malo,
    ).toContain("token_invalido");
  }
  // El de baja, el de cualquier correo, sí; sin cookie ni sesión (cliente anónimo). Dos veces es igual.
  const baja = await api().rpc("baja_alerta", { p_token: mio.token_baja });
  expect(baja.error).toBeNull();
  expect(baja.data).toEqual({ estado: "baja", nombre: "La que me quito" });
  expect(
    (await api().rpc("baja_alerta", { p_token: mio.token_baja })).error,
  ).toBeNull();

  // Ya no manda nada, ni aunque llegue un anuncio, ni aparece en «Mis alertas».
  consultar(
    `update public.alertas set ultimo_envio_at = now() - interval '1 day' where id = '${a.alerta_id}'`,
  );
  await crearAnuncio({ precio });
  expect(reclamar(a.alerta_id).alertas).toEqual([]);
  expect(
    (await api().rpc("obtener_alertas", { p_tokens: [a.gestionar] })).data,
  ).toEqual([]);
});

// ── Alertas: topes contra el abuso ────────────────────────────────────────────

test("máx. 3 alertas por correo en 24 h (contadas aunque se borren) y 10 por IP", async () => {
  const email = correoNuevo();
  const creadas = [1, 2, 3].map(() =>
    crearAlerta({ email, ...banda(precioUnico()) }),
  );
  // Borrar no libera el cupo del correo.
  await api().rpc("gestionar_alerta", {
    p_token: creadas[0].gestionar,
    p_accion: "borrar",
  });
  expect(
    mensaje(() =>
      consultar(sqlCrearAlerta({ email, ...banda(precioUnico()) })),
    ),
  ).toContain("demasiadas_alertas");

  const ip = ipNueva();
  for (let i = 0; i < 10; i++) {
    crearAlerta({ ip, ...banda(precioUnico()) });
  }
  expect(
    mensaje(() => consultar(sqlCrearAlerta({ ip, ...banda(precioUnico()) }))),
  ).toContain("demasiadas_alertas");
});

test("quien rechazó desde el correo una alerta que no pidió no recibe otra en 30 días; el creador que borra la suya no se bloquea", async () => {
  const email = correoNuevo();
  const ajena = crearAlerta({ email, ...banda(precioUnico()) });
  expect(ajena.baja).toMatch(/^[A-Za-z0-9_-]{43}$/);
  // «No la pedí»: la baja del correo de confirmación, sin sesión.
  const r = await api().rpc("baja_alerta", { p_token: ajena.baja });
  expect(r.error).toBeNull();
  expect(
    consultar(
      `select rechazada_at is not null from public.alertas where id = '${ajena.alerta_id}'`,
    ),
  ).toEqual(["t"]);
  expect(
    mensaje(() =>
      consultar(sqlCrearAlerta({ email, ...banda(precioUnico()) })),
    ),
  ).toContain("demasiadas_alertas");
  // Pasados los 30 días, de nuevo puede.
  consultar(
    `update public.alertas set rechazada_at = now() - interval '31 days', baja_at = now() - interval '31 days',
            created_at = now() - interval '31 days' where id = '${ajena.alerta_id}'`,
  );
  expect(
    mensaje(() =>
      consultar(sqlCrearAlerta({ email, ...banda(precioUnico()) })),
    ),
  ).toBeNull();

  // El creador que borra SU alerta sin confirmar desde el teléfono no rechaza nada.
  const otroCorreo = correoNuevo();
  const propia = crearAlerta({ email: otroCorreo, ...banda(precioUnico()) });
  await api().rpc("gestionar_alerta", {
    p_token: propia.gestionar,
    p_accion: "borrar",
  });
  expect(
    consultar(
      `select rechazada_at is null from public.alertas where id = '${propia.alerta_id}'`,
    ),
  ).toEqual(["t"]);
  expect(
    mensaje(() =>
      consultar(sqlCrearAlerta({ email: otroCorreo, ...banda(precioUnico()) })),
    ),
  ).toBeNull();
  // Dar de baja una alerta YA confirmada tampoco es un rechazo.
  const confirmada = alertaConfirmada({ ...banda(precioUnico()) });
  await api().rpc("baja_alerta", { p_token: confirmada.baja });
  expect(
    consultar(
      `select baja_at is not null, rechazada_at is null from public.alertas where id = '${confirmada.alerta_id}'`,
    ),
  ).toEqual(["t|t"]);
});

test("la purga no acorta el bloqueo de 30 días de una alerta rechazada, y la borra pasados los 30", async () => {
  const email = correoNuevo();
  const ajena = crearAlerta({ email, ...banda(precioUnico()) });
  await api().rpc("baja_alerta", { p_token: ajena.baja });
  const hay = (id: string) =>
    consultar(`select count(*) from public.alertas where id = '${id}'`)[0];
  // A los 10 días una alerta sin confirmar y SIN baja ya se purga; la rechazada se queda y sigue bloqueando.
  consultar(
    `update public.alertas set created_at = now() - interval '10 days', rechazada_at = now() - interval '10 days',
            baja_at = now() - interval '10 days' where id = '${ajena.alerta_id}'`,
  );
  const sinBaja = crearAlerta({ ...banda(precioUnico()) });
  consultar(
    `update public.alertas set created_at = now() - interval '10 days' where id = '${sinBaja.alerta_id}'`,
  );
  consultar(`select public.purgar_vencidos()`);
  expect(hay(sinBaja.alerta_id)).toBe("0");
  expect(hay(ajena.alerta_id)).toBe("1");
  expect(
    mensaje(() =>
      consultar(sqlCrearAlerta({ email, ...banda(precioUnico()) })),
    ),
  ).toContain("demasiadas_alertas");
  // Pasados los 30 días de la baja, la purga ya se la lleva.
  consultar(
    `update public.alertas set rechazada_at = now() - interval '31 days', baja_at = now() - interval '31 days'
      where id = '${ajena.alerta_id}'`,
  );
  consultar(`select public.purgar_vencidos()`);
  expect(hay(ajena.alerta_id)).toBe("0");
});

// ── La purga ─────────────────────────────────────────────────────────────────

test("la purga borra lo caducado y respeta lo vivo", async () => {
  const precio = precioUnico();
  const sinConfirmarVieja = crearAlerta({ ...banda(precio) });
  const sinConfirmarNueva = crearAlerta({ ...banda(precio + 1) });
  const bajaVieja = alertaConfirmada({ ...banda(precio + 2) });
  const bajaReciente = alertaConfirmada({ ...banda(precio + 3) });
  const viva = alertaConfirmada({ ...banda(precio + 4) });
  const x = await crearAnuncio();

  consultar(
    `update public.alertas set created_at = now() - interval '8 days' where id = '${sinConfirmarVieja.alerta_id}'`,
  );
  consultar(
    `update public.alertas set baja_at = now() - interval '31 days' where id = '${bajaVieja.alerta_id}'`,
  );
  consultar(
    `update public.alertas set baja_at = now() - interval '5 days' where id = '${bajaReciente.alerta_id}'`,
  );
  // Un enlace de correo de hace 61 días se va; uno de hace 5 y el de gestionar con el que nació la alerta
  // se quedan.
  const hashViejo = sesionNueva();
  const hashReciente = sesionNueva();
  consultar(
    `insert into public.enlaces_alerta (alerta_id, proposito, origen, token_hash, created_at)
     values ('${viva.alerta_id}', 'baja', 'correo', '${hashViejo}', now() - interval '61 days'),
            ('${viva.alerta_id}', 'baja', 'correo', '${hashReciente}', now() - interval '5 days')`,
  );
  // Un cambio de precio de hace 91 días y un cupo de hace 61.
  consultar(
    `insert into public.cambios_de_precio (inmueble_id, anterior, nuevo, created_at)
     values ('${x.id}', 2000000, 1000000, now() - interval '91 days'),
            ('${x.id}', 3000000, 2000000, now() - interval '10 days')`,
  );
  consultar(
    `insert into public.correos_dia (dia, visita) values (public.dia_bogota() - 61, 1) on conflict do nothing`,
  );

  const salida = JSON.parse(
    consultar(`select public.purgar_vencidos()::text`)[0],
  );
  // Las claves del S8 siguen y suman las nuevas.
  expect(Object.keys(salida).sort()).toEqual(
    [
      "alertas",
      "cambios_de_precio",
      "compradores",
      "correos_dia",
      "enlaces",
      "verificaciones",
    ].sort(),
  );

  // Lo que importa es el ESTADO final (otro spec puede haber corrido la misma purga a la vez).
  const existe = (id: string) =>
    consultar(`select count(*) from public.alertas where id = '${id}'`)[0];
  expect(existe(sinConfirmarVieja.alerta_id)).toBe("0");
  expect(existe(sinConfirmarNueva.alerta_id)).toBe("1");
  expect(existe(bajaVieja.alerta_id)).toBe("0");
  expect(existe(bajaReciente.alerta_id)).toBe("1");
  expect(existe(viva.alerta_id)).toBe("1");
  expect(
    consultar(
      `select string_agg(case token_hash when '${hashViejo}' then 'viejo' when '${hashReciente}' then 'reciente' end, ',')
         from public.enlaces_alerta where token_hash in ('${hashViejo}', '${hashReciente}')`,
    )[0],
  ).toBe("reciente");
  expect(
    consultar(
      `select count(*) from public.enlaces_alerta where alerta_id = '${viva.alerta_id}' and proposito = 'gestionar'`,
    )[0],
  ).toBe("1");
  expect(
    consultar(
      `select count(*) from public.cambios_de_precio where inmueble_id = '${x.id}'`,
    )[0],
  ).toBe("1");
  expect(
    consultar(
      `select count(*) from public.correos_dia where dia < public.dia_bogota() - 60`,
    )[0],
  ).toBe("0");
});
