import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { consultar } from "./utils/bd";
import {
  conContactoPublico,
  crearAnuncio,
  precioUnico,
  type AnuncioCreado,
} from "./utils/anuncios";
import {
  compradorVerificado,
  sesionNueva,
  telefonoNuevo,
} from "./utils/comprador";
import { fechaBogota } from "./utils/fechas";
import { problemasDePausa, type FuncionCatalogo } from "./utils/puertas-pausa";

// S15 «Aquí nadie te tumba» — antifraude en la base (migración 17). Lo que no puede fallar: (1) la pausa del operador cierra
// TODAS las puertas por las que un comprador ve o toca un anuncio, y reactivar las abre; (2) un reporte o una bandera NO
// cambian lo que ve nadie; (3) la RLS: nadie lee reportes, banderas ni sesiones de forma directa, y cada dueño toca solo lo
// suyo; (4) cada regla, con su caso que dispara y el que no, en el borde. Datos 100 % sintéticos.
//
// Las reglas se calculan sobre TODA la base: el archivo corre en serie y ningún otro spec llama a `revisar_banderas`.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const api = () => createClient(url, anon);

test.describe.configure({ mode: "serial" });
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});

const json = <T>(sql: string): T =>
  JSON.parse(consultar(sql)[0] ?? "null") as T;
const pausar = (a: AnuncioCreado) =>
  consultar(`select public.pausar_anuncio('${a.id}')`);
const reactivar = (a: AnuncioCreado) =>
  consultar(`select public.reactivar_anuncio('${a.id}')`);
const revisar = () =>
  json<{ foto: number; telefono: number; matricula: number }>(
    "select public.revisar_banderas()::text",
  );
const banderaDe = (a: AnuncioCreado, regla: string) =>
  json<{
    evidencia: Record<string, unknown>;
    resolucion: string | null;
  } | null>(
    `select (select jsonb_build_object('evidencia', evidencia, 'resolucion', resolucion)
               from public.banderas where inmueble_id = '${a.id}' and regla = '${regla}')::text`,
  );
const conTelefono = (a: AnuncioCreado, tel: string, nombre?: string) =>
  consultar(
    `update public.vendedores set whatsapp = '${tel}'${nombre ? `, nombre = '${nombre}'` : ""}
      where id = (select vendedor_id from public.inmuebles where id = '${a.id}')`,
  );

async function ficha(slug: string) {
  const { data } = await api().rpc("obtener_ficha", { p_slug: slug });
  return data;
}
async function slugsDeBusqueda(precio: number): Promise<string[]> {
  const { data } = await api().rpc("buscar_inmuebles", {
    p_precio_min: precio,
    p_precio_max: precio,
  });
  return ((data ?? []) as { slug: string }[]).map((f) => f.slug);
}
async function reportar(
  sesion: string,
  slug: string,
  extra: Record<string, unknown> = {},
) {
  return api().rpc("reportar_anuncio", {
    p_sesion_hash: sesion,
    p_slug: slug,
    p_motivos: ["pidio_plata"],
    p_detalle: "Me pidió un anticipo por WhatsApp",
    ...extra,
  });
}

test("gate: toda función de public que lee `inmuebles` está clasificada y las que muestran anuncios miran la pausa", async () => {
  const funciones = json<FuncionCatalogo[]>(
    `select jsonb_agg(jsonb_build_object('nombre', p.proname, 'cuerpo', p.prosrc))::text
       from pg_proc p
      where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
        and p.prosrc ~ '\\minmuebles\\M'`,
  );
  expect(funciones.length).toBeGreaterThan(30);
  expect(problemasDePausa(funciones)).toEqual([]);
});

test("la pausa cierra la ficha, la búsqueda, los resúmenes, los favoritos, las listas, el contacto, la visita y el reporte; reactivar las abre", async () => {
  const a = await crearAnuncio({ precio: precioUnico() });
  conContactoPublico(a);
  const { sesion } = await compradorVerificado();
  const { data: lista } = await api().rpc("crear_lista", {
    p_sesion_hash: sesion,
    p_nombre: "Para la pausa",
  });
  const { data: otraLista } = await api().rpc("crear_lista", {
    p_sesion_hash: sesion,
    p_nombre: "Otra",
  });
  expect(
    (
      await api().rpc("agregar_a_lista", {
        p_sesion_hash: sesion,
        p_lista: lista,
        p_slug: a.slug,
      })
    ).error,
  ).toBeNull();
  await api().rpc("fusionar_favoritos", {
    p_sesion_hash: sesion,
    p_slugs: [a.slug],
  });

  const enComparables = async () =>
    (
      (
        await api().rpc("comparables_precio", {
          p_operacion: "venta",
          p_tipo: "apartamento",
          p_localidad: "Chapinero",
        })
      ).data as { slug: string }[]
    ).map((c) => c.slug);

  // Antes: se ve por todas las puertas.
  expect(await ficha(a.slug)).not.toBeNull();
  expect(await enComparables()).toContain(a.slug);
  expect(await slugsDeBusqueda(a.precio)).toEqual([a.slug]);
  expect(
    (await api().rpc("mis_favoritos", { p_sesion_hash: sesion })).data,
  ).toContain(a.slug);

  pausar(a);

  expect(await ficha(a.slug)).toBeNull();
  expect(await slugsDeBusqueda(a.precio)).toEqual([]);
  expect(
    (await api().rpc("resumen_anuncios", { p_slugs: [a.slug] })).data,
  ).toEqual([]);
  expect(
    (await api().rpc("mis_favoritos", { p_sesion_hash: sesion })).data,
  ).not.toContain(a.slug);
  expect(
    (
      await api().rpc("fusionar_favoritos", {
        p_sesion_hash: sesion,
        p_slugs: [a.slug],
      })
    ).data,
  ).not.toContain(a.slug);
  const listas = (await api().rpc("mis_listas", { p_sesion_hash: sesion }))
    .data as {
    id: string;
    slugs: string[];
  }[];
  expect(listas.find((l) => l.id === lista)?.slugs).toEqual([]);
  const detalle = (
    await api().rpc("obtener_lista", {
      p_sesion_hash: sesion,
      p_token: null,
      p_lista: lista,
    })
  ).data as { items: unknown[]; no_disponibles: number };
  expect(detalle.items).toEqual([]);
  expect(detalle.no_disponibles).toBe(1);
  const agregar = await api().rpc("agregar_a_lista", {
    p_sesion_hash: sesion,
    p_lista: otraLista,
    p_slug: a.slug,
  });
  expect(agregar.error?.message).toContain("no_disponible");
  expect(
    (
      await api().rpc("registrar_contacto", {
        p_sesion_hash: sesion,
        p_slug: a.slug,
      })
    ).data,
  ).toBeNull();
  const visita = await api().rpc("solicitar_visita", {
    p_sesion_hash: sesion,
    p_slug: a.slug,
    p_intencion: "vivir",
    p_presupuesto_min: null,
    p_presupuesto_max: null,
    p_forma_pago: [],
    p_mensaje: null,
    p_email: "comprador.sintetico@ejemplo.test",
  });
  expect(visita.error?.message).toContain("no_disponible");
  expect(await enComparables()).not.toContain(a.slug);
  expect((await reportar(sesion, a.slug)).error?.message).toContain(
    "no_disponible",
  );

  // Renovar confirma la vigencia pero NO quita la pausa, y lo dice.
  const renovado = (await api().rpc("renovar_vigencia", { p_token: a.token }))
    .data as {
    vigente_hasta: string;
    pausado: boolean;
  };
  expect(renovado.pausado).toBe(true);
  expect(await ficha(a.slug)).toBeNull();

  reactivar(a);
  expect(await ficha(a.slug)).not.toBeNull();
  expect(await slugsDeBusqueda(a.precio)).toEqual([a.slug]);
  expect(
    (await api().rpc("mis_favoritos", { p_sesion_hash: sesion })).data,
  ).toContain(a.slug);
  expect(
    (
      (await api().rpc("renovar_vigencia", { p_token: a.token })).data as {
        pausado: boolean;
      }
    ).pausado,
  ).toBe(false);
});

test("un reporte y una bandera NO cambian lo que ve el comprador (solo el operador pausa)", async () => {
  const a = await crearAnuncio({ precio: precioUnico() });
  const b = await crearAnuncio({ precio: precioUnico() });
  conTelefono(a, telefonoNuevo());
  conTelefono(b, telefonoNuevo());
  const matricula = `50N-${Date.now() % 1e8}`;
  for (const x of [a, b]) {
    consultar(
      `select public.marcar_verificado_ctl('${x.id}', '${matricula}', date '${fechaBogota(2)}')`,
    );
  }
  const antes = await ficha(a.slug);
  const { sesion } = await compradorVerificado();
  expect((await reportar(sesion, a.slug)).error).toBeNull();
  revisar();
  expect(banderaDe(a, "matricula")).not.toBeNull();

  expect(await ficha(a.slug)).toEqual(antes);
  expect(await slugsDeBusqueda(a.precio)).toEqual([a.slug]);
  expect(
    consultar(
      `select pausado_at is null from public.inmuebles where id = '${a.id}'`,
    )[0],
  ).toBe("t");
});

test("reportar: exige el WhatsApp verificado, motivos de la lista cerrada, uno por anuncio y a lo sumo 5 en 24 h", async () => {
  const a = await crearAnuncio({ precio: precioUnico() });
  expect((await reportar(sesionNueva(), a.slug)).error?.code).toBe("42501");
  const { sesion } = await compradorVerificado();
  for (const [extra, codigo] of [
    [{ p_motivos: [] }, "motivo_invalido"],
    [{ p_motivos: ["inventado"] }, "motivo_invalido"],
    [{ p_detalle: "x".repeat(501) }, "detalle_invalido"],
  ] as const) {
    expect((await reportar(sesion, a.slug, extra)).error?.message).toContain(
      codigo,
    );
  }
  expect(
    (
      await reportar(sesion, a.slug, {
        p_motivos: ["precio_irreal", "pidio_plata", "precio_irreal"],
      })
    ).error,
  ).toBeNull();
  expect(
    consultar(
      `select array_to_string(motivos, ',') from public.reportes where inmueble_id = '${a.id}'`,
    ),
  ).toEqual(["pidio_plata,precio_irreal"]);
  expect((await reportar(sesion, a.slug)).error?.message).toContain(
    "ya_reportado",
  );

  const otros = await Promise.all(
    [1, 2, 3, 4, 5].map(() => crearAnuncio({ precio: precioUnico() })),
  );
  for (const o of otros.slice(0, 4))
    expect((await reportar(sesion, o.slug)).error).toBeNull();
  expect((await reportar(sesion, otros[4].slug)).error?.message).toContain(
    "demasiados_reportes",
  );
});

test("RLS: nadie lee reportes, banderas ni sesiones de forma directa; cada dueño y cada comprador tocan solo lo suyo", async () => {
  for (const tabla of ["reportes", "banderas", "sesiones_fotos"]) {
    const { error } = await api().from(tabla).select("*").limit(1);
    expect(error, tabla).not.toBeNull();
  }
  // El operador (authenticated) tampoco: solo por sus RPC.
  const operador = createClient(url, anon);
  const { error: errLogin } = await operador.auth.signInWithPassword({
    email: process.env.OPERADOR_EMAIL ?? "operador@innmobiliaria.test",
    password: process.env.OPERADOR_PASSWORD ?? "operador-seguro-123",
  });
  expect(errLogin).toBeNull();
  for (const tabla of ["reportes", "banderas", "sesiones_fotos"]) {
    const { error } = await operador.from(tabla).select("*").limit(1);
    expect(error, tabla).not.toBeNull();
  }
  expect((await operador.rpc("antifraude_cola")).error).toBeNull();
  // anon no ejecuta las del operador.
  expect((await api().rpc("antifraude_cola")).error).not.toBeNull();
  expect(
    (
      await api().rpc("pausar_anuncio", {
        p_inmueble_id: "00000000-0000-0000-0000-000000000000",
      })
    ).error,
  ).not.toBeNull();

  // Dos dueños: cada token ve y toca solo su anuncio.
  const uno = await crearAnuncio({ precio: precioUnico() });
  const dos = await crearAnuncio({ precio: precioUnico() });
  expect(
    (
      await api().rpc("solicitar_sesion_fotos", {
        p_token: uno.token,
        p_franja: "sabado",
      })
    ).error,
  ).toBeNull();
  const extraDos = (await api().rpc("mi_anuncio_extra", { p_token: dos.token }))
    .data as { sesion: unknown };
  expect(extraDos.sesion).toBeNull();
  expect(
    (await api().rpc("cancelar_sesion_fotos", { p_token: dos.token })).error
      ?.message,
  ).toContain("estado_invalido");
  expect(
    (
      (await api().rpc("mi_anuncio_extra", { p_token: uno.token })).data as {
        sesion: { estado: string };
      }
    ).sesion.estado,
  ).toBe("solicitada");
  expect(
    (await api().rpc("mi_anuncio_extra", { p_token: "x".repeat(43) })).data,
  ).toBeNull();
  const [fotoUno] = consultar(
    `insert into public.fotos (inmueble_id, r2_key, orden, ancho, alto, bytes)
     values ('${uno.id}', '${uno.id}/${crypto.randomUUID()}-full.webp', 0, 400, 300, 1000) returning id`,
  );
  await api().rpc("registrar_huella_foto", {
    p_token: dos.token,
    p_foto_id: fotoUno,
    p_huella: "0123456789abcdef",
  });
  expect(
    consultar(
      `select huella is null from public.fotos where id = '${fotoUno}'`,
    )[0],
  ).toBe("t");
  await api().rpc("registrar_huella_foto", {
    p_token: uno.token,
    p_foto_id: fotoUno,
    p_huella: "0123456789abcdef",
  });
  expect(
    consultar(
      `select huella is null from public.fotos where id = '${fotoUno}'`,
    )[0],
  ).toBe("f");
  expect(
    (
      await api().rpc("registrar_huella_foto", {
        p_token: uno.token,
        p_foto_id: fotoUno,
        p_huella: "zz",
      })
    ).error?.message,
  ).toContain("huella_invalida");

  // Dos compradores: cada uno su reporte; la cola del operador no dice quién reportó.
  const c1 = await compradorVerificado();
  const c2 = await compradorVerificado();
  expect((await reportar(c1.sesion, uno.slug)).error).toBeNull();
  expect((await reportar(c2.sesion, uno.slug)).error).toBeNull();
  const cola = (await operador.rpc("antifraude_cola")).data as {
    id: string;
    reportes: Record<string, unknown>[];
  }[];
  const fila = cola.find((r) => r.id === uno.id);
  expect(fila?.reportes).toHaveLength(2);
  for (const r of fila?.reportes ?? []) {
    expect(Object.keys(r).sort()).toEqual(["creado", "detalle", "motivos"]);
  }
  await operador.auth.signOut();
});

test("la cola ordena por lo último que pasó: un anuncio recién pausado queda arriba, no al final (2.ª migración)", async () => {
  const operador = createClient(url, anon);
  const { error: errLogin } = await operador.auth.signInWithPassword({
    email: process.env.OPERADOR_EMAIL ?? "operador@innmobiliaria.test",
    password: process.env.OPERADOR_PASSWORD ?? "operador-seguro-123",
  });
  expect(errLogin).toBeNull();
  const a = await crearAnuncio({ precio: precioUnico() });
  const b = await crearAnuncio({ precio: precioUnico() });
  const c = await compradorVerificado();
  expect((await reportar(c.sesion, a.slug)).error).toBeNull();
  expect((await reportar(c.sesion, b.slug)).error).toBeNull();
  const posiciones = async () => {
    const cola = ((await operador.rpc("antifraude_cola")).data ?? []) as {
      id: string;
    }[];
    return {
      a: cola.findIndex((r) => r.id === a.id),
      b: cola.findIndex((r) => r.id === b.id),
    };
  };

  // El reporte más reciente va arriba.
  let p = await posiciones();
  expect(p.a).toBeGreaterThanOrEqual(0);
  expect(p.b).toBeGreaterThanOrEqual(0);
  expect(p.b).toBeLessThan(p.a);

  // Pausar `a` es lo último que pasa: sube por encima de `b` (la 17 lo mandaba al final) y sigue en la cola para reactivarlo.
  pausar(a);
  p = await posiciones();
  expect(p.a).toBeGreaterThanOrEqual(0);
  expect(p.a).toBeLessThan(p.b);

  // Sin nada abierto, un anuncio pausado sigue en la cola (para poder reactivarlo).
  consultar(
    `update public.reportes set resolucion = 'descartar', razon = 'sin_fundamento', resuelta_at = now() where inmueble_id = '${a.id}'`,
  );
  expect((await posiciones()).a).toBeGreaterThanOrEqual(0);

  // Pedir el CTL cierra lo abierto, pero el anuncio sigue visible y el operador aún tiene que escribirle al dueño: se queda en la
  // cola (con su WhatsApp) hasta que se verifique. La 17 lo soltaba al instante.
  const d = await crearAnuncio({ precio: precioUnico() });
  expect((await reportar(c.sesion, d.slug)).error).toBeNull();
  consultar(`select public.pedir_ctl('${d.id}')`);
  const dEnCola = async () => {
    const cola = ((await operador.rpc("antifraude_cola")).data ?? []) as {
      id: string;
      ctl_pedido_at: string | null;
      pausado_at: string | null;
      reportes: unknown[];
    }[];
    return cola.find((r) => r.id === d.id);
  };
  const fila = await dEnCola();
  expect(fila?.ctl_pedido_at).not.toBeNull();
  expect(fila?.pausado_at).toBeNull();
  expect(fila?.reportes).toHaveLength(0);
  expect(await ficha(d.slug)).not.toBeNull();
  // Verificarlo con un CTL nuevo limpia el pedido y lo saca de la cola.
  consultar(
    `select public.marcar_verificado_ctl('${d.id}', '50N-9988776', date '${fechaBogota(2)}')`,
  );
  expect(await dEnCola()).toBeUndefined();
  await operador.auth.signOut();
});

// Una huella aleatoria (≈ 32 bits en 1) y la misma con `k` bits volteados desde la posición `desde`.
function huellaAleatoria(): string {
  return randomBytes(8).toString("hex");
}
function voltear(h: string, desde: number, k: number): string {
  let v = BigInt(`0x${h}`);
  for (let i = desde; i < desde + k; i++) v ^= BigInt(1) << BigInt(i);
  return v.toString(16).padStart(16, "0");
}
function conFoto(a: AnuncioCreado, huella: string) {
  consultar(
    `insert into public.fotos (inmueble_id, r2_key, orden, ancho, alto, bytes, huella)
     values ('${a.id}', '${a.id}/${crypto.randomUUID()}-full.webp', 0, 400, 300, 1000, ('x' || '${huella}')::bit(64))`,
  );
}

test("regla del teléfono: el mismo WhatsApp con el mismo nombre (tildes y espacios aparte) no dispara; con otro nombre, sí", async () => {
  const tel = telefonoNuevo();
  const [a, b, c] = await Promise.all(
    [1, 2, 3].map(() => crearAnuncio({ precio: precioUnico() })),
  );
  conTelefono(a, tel, "José  Pérez");
  conTelefono(b, tel, "jose perez");
  revisar();
  expect(banderaDe(a, "telefono")).toBeNull();
  expect(banderaDe(b, "telefono")).toBeNull();
  conTelefono(c, tel, "Otra Persona");
  revisar();
  expect(banderaDe(a, "telefono")?.evidencia).toEqual({ otros: 1, nombres: 2 });
  expect(banderaDe(c, "telefono")?.evidencia).toEqual({ otros: 2, nombres: 2 });
});

test("regla de la matrícula: la misma con el mismo teléfono no dispara; con otro teléfono, sí (sin importar guiones ni mayúsculas)", async () => {
  const [a, b, c] = await Promise.all(
    [1, 2, 3].map(() => crearAnuncio({ precio: precioUnico() })),
  );
  const tel = telefonoNuevo();
  conTelefono(a, tel);
  conTelefono(b, tel);
  conTelefono(c, telefonoNuevo());
  const numero = `${Date.now() % 1e8}`;
  consultar(
    `select public.marcar_verificado_ctl('${a.id}', '50N-${numero}', date '${fechaBogota(2)}')`,
  );
  consultar(
    `select public.marcar_verificado_ctl('${b.id}', '50N-${numero}', date '${fechaBogota(2)}')`,
  );
  revisar();
  expect(banderaDe(a, "matricula")).toBeNull();
  consultar(
    `select public.marcar_verificado_ctl('${c.id}', '50n ${numero}', date '${fechaBogota(2)}')`,
  );
  revisar();
  expect(banderaDe(a, "matricula")?.evidencia).toEqual({
    slug: c.slug,
    otros: 1,
  });
  expect(banderaDe(c, "matricula")?.evidencia).toMatchObject({ otros: 2 });
});

test("regla de la foto: a 6 bits es la misma foto, a 7 no; el mismo teléfono y las huellas lisas no cuentan", async () => {
  const [f1, f2, f3, g1, g2, l1, l2] = await Promise.all(
    [1, 2, 3, 4, 5, 6, 7].map(() => crearAnuncio({ precio: precioUnico() })),
  );
  for (const x of [f1, f2, f3, l1, l2]) conTelefono(x, telefonoNuevo());
  const telG = telefonoNuevo();
  conTelefono(g1, telG);
  conTelefono(g2, telG);
  const h = huellaAleatoria();
  conFoto(f1, h);
  conFoto(f2, voltear(h, 0, 6)); // 6 bits: la misma foto
  conFoto(f3, voltear(h, 20, 7)); // 7 bits de f1 y 13 de f2: otra
  const g = huellaAleatoria();
  conFoto(g1, g);
  conFoto(g2, g); // idéntica, pero del mismo teléfono
  conFoto(l1, "0000000000000001");
  conFoto(l2, "0000000000000001"); // lisa: no informa
  revisar();
  expect(banderaDe(f1, "foto")?.evidencia).toMatchObject({
    slug: f2.slug,
    distancia: 6,
  });
  expect(banderaDe(f2, "foto")?.evidencia).toMatchObject({
    slug: f1.slug,
    distancia: 6,
  });
  expect(banderaDe(f3, "foto")).toBeNull();
  expect(banderaDe(g1, "foto")).toBeNull();
  expect(banderaDe(l1, "foto")).toBeNull();
});

test("la bandera de precio se guarda con su lista blanca y rechaza lo que no cumple la regla", async () => {
  const a = await crearAnuncio({ precio: precioUnico() });
  const guardar = (h: unknown) =>
    consultar(
      `select public.guardar_banderas_precio('${JSON.stringify(h)}'::jsonb)`,
    );
  for (const malo of [
    { [a.id]: { porcentaje: 29, n: 6, ambito: "barrio" } },
    { [a.id]: { porcentaje: 35, n: 4, ambito: "barrio" } },
    { [a.id]: { porcentaje: 35, n: 6, ambito: "ciudad" } },
    { "no-es-uuid": { porcentaje: 35, n: 6, ambito: "barrio" } },
  ]) {
    expect(() => guardar(malo)).toThrow(/hallazgos_invalidos/);
  }
  guardar({
    [a.id]: {
      porcentaje: 37.4,
      n: 6,
      ambito: "barrio",
      telefono: "3001112233",
    },
  });
  expect(banderaDe(a, "precio")?.evidencia).toEqual({
    porcentaje: 37,
    n: 6,
    ambito: "barrio",
  });
});

test("el operador: pedir el CTL deja «re-verificación pendiente»; descartar pide razón y la bandera no reaparece; pausar y reactivar no se repiten", async () => {
  const a = await crearAnuncio({ precio: precioUnico() });
  const b = await crearAnuncio({ precio: precioUnico() });
  conTelefono(a, telefonoNuevo());
  conTelefono(b, telefonoNuevo());
  const numero = `${(Date.now() + 7) % 1e8}`;
  consultar(
    `select public.marcar_verificado_ctl('${a.id}', '50N-${numero}', date '${fechaBogota(2)}')`,
  );
  const { sesion } = await compradorVerificado();
  await reportar(sesion, a.slug);

  consultar(`select public.pedir_ctl('${a.id}')`);
  expect(
    consultar(
      `select nivel_verificacion || ',' || (ctl_expedido_el is null) || ',' || (ctl_pedido_at is not null)
         from public.inmuebles where id = '${a.id}'`,
    )[0],
  ).toBe("verificado,true,true");
  expect(
    consultar(
      `select resolucion from public.reportes where inmueble_id = '${a.id}'`,
    ),
  ).toEqual(["pedir_ctl"]);
  expect((await ficha(a.slug))?.ctl_expedido_el).toBeNull();
  consultar(
    `select public.marcar_verificado_ctl('${a.id}', '50N-${numero}', date '${fechaBogota(1)}')`,
  );
  expect(
    consultar(
      `select ctl_pedido_at is null from public.inmuebles where id = '${a.id}'`,
    )[0],
  ).toBe("t");

  // Descartar: razón de la lista cerrada; sin nada abierto, no hay qué descartar.
  expect(() =>
    consultar(`select public.descartar_revision('${a.id}', 'porque_si', null)`),
  ).toThrow(/razon_invalida/);
  expect(() =>
    consultar(
      `select public.descartar_revision('${a.id}', 'es_el_dueno', null)`,
    ),
  ).toThrow(/estado_invalido/);
  consultar(
    `select public.marcar_verificado_ctl('${b.id}', '50N-${numero}', date '${fechaBogota(2)}')`,
  );
  revisar();
  expect(banderaDe(a, "matricula")?.resolucion).toBeNull();
  consultar(
    `select public.descartar_revision('${a.id}', 'mismo_dueno', 'Vendió y volvió a publicar')`,
  );
  revisar();
  expect(banderaDe(a, "matricula")?.resolucion).toBe("descartar");

  pausar(a);
  expect(() => pausar(a)).toThrow(/estado_invalido/);
  reactivar(a);
  expect(() => reactivar(a)).toThrow(/estado_invalido/);
});

test("la sesión de fotos: una abierta por anuncio, 3 en 30 días, y el operador la agenda y la marca hecha en orden", async () => {
  const a = await crearAnuncio({ precio: precioUnico() });
  const pedir = (franja = "entre_semana") =>
    api().rpc("solicitar_sesion_fotos", { p_token: a.token, p_franja: franja });
  const cancelar = () =>
    api().rpc("cancelar_sesion_fotos", { p_token: a.token });
  expect((await pedir("lunes")).error?.message).toContain("franja_invalida");
  const { data: primera } = await pedir();
  expect((await pedir()).error?.message).toContain("ya_solicitada");
  const id = (primera as { id: string }).id;
  expect(() => consultar(`select public.marcar_sesion_hecha('${id}')`)).toThrow(
    /estado_invalido/,
  );
  expect(() =>
    consultar(
      `select public.agendar_sesion_fotos('${id}', now() - interval '1 day')`,
    ),
  ).toThrow(/fecha_invalida/);
  consultar(
    `select public.agendar_sesion_fotos('${id}', now() + interval '3 days')`,
  );
  const panel = json<
    { id: string; estado: string; dueno: { whatsapp: string } }[]
  >("select public.sesiones_panel()::text");
  expect(panel.find((s) => s.id === id)).toMatchObject({ estado: "agendada" });
  consultar(`select public.marcar_sesion_hecha('${id}')`);
  expect(() =>
    consultar(`select public.cancelar_sesion_fotos_operador('${id}')`),
  ).toThrow(/estado_invalido/);
  expect((await cancelar()).error?.message).toContain("estado_invalido");

  // Ya van 1 en 30 días; dos más se pueden pedir (y cancelar) y la cuarta no.
  for (let i = 0; i < 2; i++) {
    expect((await pedir()).error).toBeNull();
    expect((await cancelar()).error).toBeNull();
  }
  expect((await pedir()).error?.message).toContain("demasiadas_sesiones");
});
