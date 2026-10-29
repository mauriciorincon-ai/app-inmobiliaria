import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar, ejecutar } from "./utils/bd";
import { conContactoPublico, crearAnuncio, precioUnico } from "./utils/anuncios";
import {
  canjear,
  compradorVerificado,
  pedirCodigo,
  sesionNueva,
  telefonoNuevo,
} from "./utils/comprador";

// S16 (cierre del H-2) — la migración 19 en la base: cada regla nueva con el caso que dispara y el que no. Datos 100 %
// sintéticos; cada prueba usa sus propios teléfonos y anuncios (corren en paralelo con el resto).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const api = () => createClient(url, anon);

test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});

async function pedirVisita(sesion: string, slug: string, consentimiento: boolean) {
  return api().rpc("solicitar_visita", {
    p_sesion_hash: sesion,
    p_slug: slug,
    p_intencion: "vivir",
    p_presupuesto_min: null,
    p_presupuesto_max: null,
    p_forma_pago: [],
    p_mensaje: null,
    p_email: "comprador.s16@ejemplo.test",
    p_consentimiento: consentimiento,
  });
}

test("solicitar_visita: sin consentimiento no se guarda; con él, sí", async () => {
  const a = await crearAnuncio({ precio: precioUnico() });
  conContactoPublico(a);
  const { sesion } = await compradorVerificado();
  const sin = await pedirVisita(sesion, a.slug, false);
  expect(sin.error?.message).toContain("consentimiento_requerido");
  const con = await pedirVisita(sesion, a.slug, true);
  expect(con.error).toBeNull();
});

test("solicitar_visita: la 11.ª solicitud en 24 h se rechaza (pedir, cancelar y volver a pedir tiene tope)", async () => {
  const a = await crearAnuncio({ precio: precioUnico() });
  conContactoPublico(a);
  const { sesion, telefono } = await compradorVerificado();
  // Diez solicitudes ya cerradas en las últimas 24 h (como las dejaría pedir y cancelar): la base solo las cuenta.
  consultar(
    `insert into public.solicitudes_visita (comprador_id, inmueble_id, intencion, forma_pago, estado, token_hash)
     select c.id, '${a.id}', 'vivir', '{}', 'cancelada', encode(sha256(convert_to(random()::text || g::text, 'UTF8')), 'hex')
       from public.compradores c, generate_series(1, 10) g
      where c.telefono = '${telefono}'`,
  );
  const r = await pedirVisita(sesion, a.slug, true);
  expect(r.error?.message).toContain("demasiados_ciclos");
  // Pasadas 24 h, vuelve a poder.
  consultar(
    `update public.solicitudes_visita set created_at = now() - interval '25 hours'
      where comprador_id = (select id from public.compradores where telefono = '${telefono}')`,
  );
  expect((await pedirVisita(sesion, a.slug, true)).error).toBeNull();
});

test("el nombre de un número que nadie ha verificado es el de la sesión que lo verifica, no el último escrito", async () => {
  const telefono = telefonoNuevo();
  const primera = sesionNueva();
  const segunda = sesionNueva();
  const a = await pedirCodigo(primera, {
    p_telefono: telefono,
    p_nombre: "Ana Sintetica",
    p_ip_hash: `s16-${primera.slice(0, 12)}`,
  });
  // Otra persona pide un código para el MISMO número con otro nombre (y no lo puede canjear: no tiene el teléfono).
  await pedirCodigo(segunda, {
    p_telefono: telefono,
    p_nombre: "Nombre Impostor",
    p_ip_hash: `s16-${segunda.slice(0, 12)}`,
  });
  expect(canjear(a.codigo, telefono)).toBe("ok");
  expect(
    consultar(`select nombre from public.compradores where telefono = '${telefono}'`),
  ).toEqual(["Ana Sintetica"]);
  // Verificado el número, ningún intento (ni el canjeado ni el del impostor, que espera su purga) conserva el nombre.
  expect(
    consultar(
      `select count(*) from public.verificaciones v join public.compradores c on c.id = v.comprador_id
        where c.telefono = '${telefono}' and v.nombre is not null`,
    ),
  ).toEqual(["0"]);
});

test("la purga no se lleva a un comprador sin verificar que pidió un código hace poco; al viejo de verdad, sí", async () => {
  const reciente = telefonoNuevo();
  const viejo = telefonoNuevo();
  for (const tel of [reciente, viejo]) {
    const s = sesionNueva();
    await pedirCodigo(s, { p_telefono: tel, p_ip_hash: `s16-${s.slice(0, 12)}` });
  }
  consultar(
    `update public.compradores set created_at = now() - interval '31 days' where telefono in ('${reciente}', '${viejo}')`,
  );
  consultar(
    `update public.verificaciones set created_at = now() - interval '31 days'
      where comprador_id = (select id from public.compradores where telefono = '${viejo}')`,
  );
  consultar("select public.purgar_vencidos()");
  expect(
    consultar(
      `select telefono from public.compradores where telefono in ('${reciente}', '${viejo}')`,
    ),
  ).toEqual([reciente]);
});

test("correos_libres_hoy: el tope menos lo de hoy (visitas, alertas y campañas), nunca negativo", async () => {
  const libres = (tope: number) =>
    Number(consultar(`select public.correos_libres_hoy(${tope})`)[0]);
  // Con un tope enorme se ve lo usado hoy (la base local lleva los correos de las demás pruebas).
  const usado = 1_000_000 - libres(1_000_000);
  expect(usado).toBeGreaterThanOrEqual(0);
  expect(libres(usado + 7)).toBe(7);
  expect(libres(usado)).toBe(0);
  expect(libres(0)).toBe(0);
});

test("asignar un barrio de otra localidad mueve también la zona del anuncio", async () => {
  const a = await crearAnuncio({ precio: precioUnico() });
  const [codigo, zona] = consultar(
    `select s.codigo || ',' || z.id from public.sectores s
       join public.zonas z on lower(z.nombre) = lower(s.localidad)
      where z.id <> (select zona_id from public.inmuebles where id = '${a.id}')
      order by s.codigo limit 1`,
  )[0].split(",");
  consultar(
    `update public.inmuebles set barrio = (select nombre from public.sectores where codigo = '${codigo}'),
            sector_codigo = '${codigo}'
      where id = '${a.id}'`,
  );
  expect(
    consultar(`select zona_id::text from public.inmuebles where id = '${a.id}'`),
  ).toEqual([zona]);
});

test("salas_panel: las solicitudes abiertas salen todas; las cerradas, solo las 100 más recientes", async () => {
  const { telefono } = await compradorVerificado();
  const PREFIJO = "s16-panel";
  const limpiar = () =>
    consultar(`delete from public.solicitudes_visita where proyecto_slug like '${PREFIJO}-%'`);
  limpiar();
  try {
    // Tres abiertas (tres proyectos: un pedido vivo por comprador y proyecto) y 105 cerradas, todas con fecha futura para ser
    // las más recientes de la base aunque otras pruebas dejen cerradas propias en paralelo.
    consultar(
      `insert into public.solicitudes_visita (comprador_id, estado, proyecto_edicion, proyecto_slug, proyecto_nombre, franja, token_hash, created_at)
       select c.id, 'pendiente', 9602, '${PREFIJO}-abierta-' || g, 'Proyecto sintetico ' || g, 'sabado',
              encode(sha256(convert_to('abierta' || random()::text || g::text, 'UTF8')), 'hex'), now() + interval '2 days'
         from public.compradores c, generate_series(1, 3) g where c.telefono = '${telefono}'`,
    );
    consultar(
      `insert into public.solicitudes_visita (comprador_id, estado, proyecto_edicion, proyecto_slug, proyecto_nombre, franja, token_hash, created_at)
       select c.id, 'cancelada', 9602, '${PREFIJO}-cerrada', 'Proyecto sintetico cerrado', 'sabado',
              encode(sha256(convert_to('cerrada' || random()::text || g::text, 'UTF8')), 'hex'), now() + interval '1 day' + g * interval '1 second'
         from public.compradores c, generate_series(1, 105) g where c.telefono = '${telefono}'`,
    );
    const lineas = ejecutar(
      "begin; set local role authenticated; select public.salas_panel(); commit;",
    );
    const json = lineas.find((l) => l.startsWith("["))!;
    const filas = (JSON.parse(json) as Array<{ estado: string; proyecto: { slug: string } }>).filter(
      (f) => f.proyecto.slug.startsWith(`${PREFIJO}-`),
    );
    expect(filas.filter((f) => f.estado === "pendiente")).toHaveLength(3);
    expect(filas.filter((f) => f.estado === "cancelada")).toHaveLength(100);
  } finally {
    limpiar();
  }
});
