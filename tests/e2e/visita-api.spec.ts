import { test, expect, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar, ejecutar } from "./utils/bd";
import {
  conContactoPublico,
  crearAnuncio,
  type AnuncioCreado,
} from "./utils/anuncios";
import {
  cookieCompradorVerificado,
  pedirCodigo,
  sesionNueva,
  telefonoNuevo,
} from "./utils/comprador";
import { partesBogota } from "../../src/engine/agenda/bogota";
import { CEDULAS_PRUEBA } from "../../src/engine/identidad/proveedor";
import type { VisitaDelComprador } from "../../src/lib/supabase/types";

// S8 «La visita» — las RUTAS, de punta a punta sobre la app, con el simulador de identidad
// (`IDENTIDAD_MOCK=1`) y Brevo en mock (`BREVO_MOCK=1`): identificarse, pedir, proponer, confirmar, «ninguno
// me sirve», cancelar, rechazar y el trabajo diario. La sesión del comprador se siembra en la base como la
// deja el canje del webhook (que tiene sus propias e2e). Datos 100 % sintéticos.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const CRON = process.env.CRON_SECRET ?? "";
const CORREO_COMPRADOR = "comprador.e2e@ejemplo.test";
const CORREO_DUENO = "dueno.e2e@ejemplo.test";

// Las rutas son las mismas en los dos proyectos: se corren una vez.
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});

const api = () => createClient(url, anon);

function bogota(dias: number, hora = "10:00") {
  return {
    fecha: partesBogota(new Date(Date.now() + dias * 86_400_000)).fecha,
    hora,
  };
}

async function anuncioAbierto(): Promise<AnuncioCreado> {
  const a = await crearAnuncio({ email: CORREO_DUENO });
  conContactoPublico(a);
  return a;
}

function post(
  request: APIRequestContext,
  ruta: string,
  data: unknown,
  cookie?: string,
) {
  return request.post(ruta, { data, headers: cookie ? { cookie } : {} });
}

function identificarse(
  request: APIRequestContext,
  cookie: string,
  cedula: string,
) {
  return post(
    request,
    "/api/identidad",
    {
      cedula,
      fechaExpedicion: "2009-07-14",
      nombre: "Laura Sintetica Prueba",
      consentimiento: true,
    },
    cookie,
  );
}

function consultasDe(telefono: string): string {
  return consultar(
    `select count(*) from public.identidad_consultas where comprador_id = (select id from public.compradores where telefono = '${telefono}')`,
  )[0];
}

async function pedirVisita(
  request: APIRequestContext,
  cookie: string,
  slug: string,
  extra: Record<string, unknown> = {},
) {
  return post(
    request,
    "/api/visitas/solicitar",
    {
      slug,
      intencion: "vivir",
      presupuestoMin: 300_000_000,
      presupuestoMax: 450_000_000,
      formaPago: ["hipotecario"],
      mensaje: "Quisiera verlo un sábado",
      email: CORREO_COMPRADOR,
      consentimiento: true,
      ...extra,
    },
    cookie,
  );
}

async function suVisita(token: string): Promise<VisitaDelComprador> {
  const { data } = await api().rpc("obtener_visita", { p_token: token });
  return data as unknown as VisitaDelComprador;
}

function estadoDe(token: string): string {
  return consultar(
    `select estado from public.solicitudes_visita where token_hash = encode(sha256(convert_to('${token}', 'UTF8')), 'hex')`,
  )[0];
}

// Pide, propone y confirma por las rutas. Devuelve el token del comprador y el id de la solicitud.
async function visitaConfirmada(request: APIRequestContext, a: AnuncioCreado) {
  const c = await cookieCompradorVerificado();
  const { token } = await (await pedirVisita(request, c.cookie, a.slug)).json();
  const id = consultar(
    `select id from public.solicitudes_visita where token_hash = encode(sha256(convert_to('${token}', 'UTF8')), 'hex')`,
  )[0];
  expect(
    (
      await post(request, "/api/visitas/proponer", {
        token: a.token,
        solicitudId: id,
        horarios: [bogota(3)],
      })
    ).status(),
  ).toBe(200);
  const horario = (await suVisita(token)).horarios[0].id;
  expect(
    (
      await post(request, "/api/visitas/elegir", { token, horarioId: horario })
    ).status(),
  ).toBe(200);
  return { token, id, comprador: c };
}

// ── Identidad ─────────────────────────────────────────────────────────────────

test.describe("POST /api/identidad", () => {
  test("sin la cookie del comprador es 403; con datos inválidos, 400 con el campo", async ({
    request,
  }) => {
    expect(
      (await identificarse(request, "", CEDULAS_PRUEBA.identificado)).status(),
    ).toBe(403);
    const c = await cookieCompradorVerificado();
    const r = await post(
      request,
      "/api/identidad",
      {
        cedula: "12",
        fechaExpedicion: "2009-07-14",
        nombre: "Laura Sintetica",
        consentimiento: true,
      },
      c.cookie,
    );
    expect(r.status()).toBe(400);
    expect(await r.json()).toEqual({ error: "validacion", campo: "cedula" });
    const sinConsentimiento = await post(
      request,
      "/api/identidad",
      {
        cedula: CEDULAS_PRUEBA.identificado,
        fechaExpedicion: "2009-07-14",
        nombre: "Laura Sintetica",
      },
      c.cookie,
    );
    expect(await sinConsentimiento.json()).toEqual({
      error: "validacion",
      campo: "consentimiento",
    });
    expect(consultasDe(c.telefono)).toBe("0");
  });

  test("identificado: el estado lo dice, y una segunda vez no consulta de nuevo", async ({
    request,
  }) => {
    const c = await cookieCompradorVerificado();
    const r = await identificarse(
      request,
      c.cookie,
      CEDULAS_PRUEBA.identificado,
    );
    expect(await r.json()).toEqual({ resultado: "identificado" });
    const estado = await request.get("/api/verificacion/estado", {
      headers: { cookie: c.cookie },
    });
    expect(await estado.json()).toMatchObject({
      estado: "verificado",
      identificado: true,
    });
    expect(
      await (
        await identificarse(request, c.cookie, CEDULAS_PRUEBA.identificado)
      ).json(),
    ).toEqual({
      resultado: "ya_identificado",
    });
    expect(consultasDe(c.telefono)).toBe("1");
  });

  test("demo del tope: tras tres «no coincide», la cuarta NO llama al proveedor (no reserva)", async ({
    request,
  }) => {
    const c = await cookieCompradorVerificado();
    for (let i = 0; i < 3; i++) {
      expect(
        await (
          await identificarse(request, c.cookie, CEDULAS_PRUEBA.no_coincide)
        ).json(),
      ).toEqual({
        resultado: "no_coincide",
      });
    }
    expect(consultasDe(c.telefono)).toBe("3");
    // Aunque ahora traiga la cédula buena, el tope ya decidió: ni reserva ni llamada.
    expect(
      await (
        await identificarse(request, c.cookie, CEDULAS_PRUEBA.identificado)
      ).json(),
    ).toEqual({
      resultado: "tope_comprador",
    });
    expect(consultasDe(c.telefono)).toBe("3");
  });

  test("«no disponible» no gasta los intentos del comprador", async ({
    request,
  }) => {
    const c = await cookieCompradorVerificado();
    for (let i = 0; i < 4; i++) {
      expect(
        await (
          await identificarse(request, c.cookie, CEDULAS_PRUEBA.no_disponible)
        ).json(),
      ).toEqual({
        resultado: "no_disponible",
      });
    }
    expect(
      await (
        await identificarse(request, c.cookie, CEDULAS_PRUEBA.identificado)
      ).json(),
    ).toEqual({
      resultado: "identificado",
    });
  });

  test("la cédula no queda en ninguna tabla de la base", async ({
    request,
  }) => {
    const c = await cookieCompradorVerificado();
    for (const cedula of Object.values(CEDULAS_PRUEBA)) {
      await identificarse(request, c.cookie, cedula);
    }
    const tablas = consultar(
      `select tablename from pg_tables where schemaname = 'public' order by 1`,
    );
    expect(tablas.length).toBeGreaterThan(10);
    for (const tabla of tablas) {
      for (const cedula of Object.values(CEDULAS_PRUEBA)) {
        expect(
          consultar(
            `select count(*) from public."${tabla}" t where t::text like '%${cedula}%'`,
          ),
          `${tabla} · ${cedula}`,
        ).toEqual(["0"]);
      }
    }
  });
});

// ── La visita por las rutas ───────────────────────────────────────────────────

test.describe("visitas", () => {
  test("pedir, proponer, confirmar: estados y un enlace nuevo para el correo de horarios", async ({
    request,
  }) => {
    const a = await anuncioAbierto();
    const c = await cookieCompradorVerificado();
    const r = await pedirVisita(request, c.cookie, a.slug);
    expect(r.status()).toBe(200);
    const { token, estado } = await r.json();
    expect(estado).toBe("pendiente");
    expect(token).toHaveLength(43);
    const id = consultar(
      `select id from public.solicitudes_visita where token_hash = encode(sha256(convert_to('${token}', 'UTF8')), 'hex')`,
    )[0];

    // Horarios fuera de franja: 400 con el problema, antes de tocar la base.
    const fuera = await post(request, "/api/visitas/proponer", {
      token: a.token,
      solicitudId: id,
      horarios: [bogota(2, "05:00")],
    });
    expect(fuera.status()).toBe(400);
    expect(await fuera.json()).toEqual({
      error: "horarios",
      problema: "fuera_de_hora",
    });

    expect(
      (
        await post(request, "/api/visitas/proponer", {
          token: a.token,
          solicitudId: id,
          horarios: [bogota(2), bogota(3, "16:30")],
        })
      ).status(),
    ).toBe(200);
    expect(estadoDe(token)).toBe("propuesta");
    // El correo de horarios al comprador llevó un enlace NUEVO (de él, solo el hash).
    expect(
      Number(
        consultar(
          `select count(*) from public.enlaces_visita where solicitud_id = '${id}'`,
        )[0],
      ),
    ).toBeGreaterThanOrEqual(1);

    const v = await suVisita(token);
    expect(v.horarios).toHaveLength(2);
    expect(
      (
        await post(request, "/api/visitas/elegir", {
          token,
          horarioId: v.horarios[1].id,
        })
      ).status(),
    ).toBe(200);
    expect(estadoDe(token)).toBe("confirmada");
  });

  test("las rutas rechazan lo que no toca: sin sesión, correo inválido, duplicado, token falso", async ({
    request,
  }) => {
    const a = await anuncioAbierto();
    expect((await pedirVisita(request, "", a.slug)).status()).toBe(403);
    const c = await cookieCompradorVerificado();
    const malo = await pedirVisita(request, c.cookie, a.slug, {
      email: "no-es-correo",
    });
    expect(malo.status()).toBe(400);
    expect(await malo.json()).toEqual({ error: "email_invalido" });
    expect((await pedirVisita(request, c.cookie, a.slug)).status()).toBe(200);
    const doble = await pedirVisita(request, c.cookie, a.slug);
    expect(doble.status()).toBe(409);
    expect(await doble.json()).toEqual({ error: "ya_solicitada" });
    const id = consultar(
      `select id from public.solicitudes_visita where inmueble_id = '${a.id}' limit 1`,
    )[0];
    const falso = await post(request, "/api/visitas/proponer", {
      token: "x".repeat(43),
      solicitudId: id,
      horarios: [bogota(2)],
    });
    expect(falso.status()).toBe(403);
    expect(await falso.json()).toEqual({ error: "token_invalido" });
    expect(
      (await post(request, "/api/visitas/elegir", { token: "corto" })).status(),
    ).toBe(400);
    expect(
      (await pedirVisita(request, c.cookie, "no-existe-0000")).status(),
    ).toBe(404);
  });

  test("identificarse ata la identidad al nombre que ve el dueño y saca del «en espera» la solicitud", async ({
    request,
  }) => {
    const a = await anuncioAbierto();
    await api().rpc("guardar_solo_identificados", {
      p_token: a.token,
      p_activo: true,
    });
    // Verificó su WhatsApp como «Ana»; la cédula que valida es la de «Laura Sintetica Prueba».
    const c = await cookieCompradorVerificado({ nombre: "Ana Sintetica" });
    const { token, estado } = await (
      await pedirVisita(request, c.cookie, a.slug)
    ).json();
    expect(estado).toBe("en_espera");
    expect(estadoDe(token)).toBe("en_espera");
    const r = await identificarse(
      request,
      c.cookie,
      CEDULAS_PRUEBA.identificado,
    );
    expect(await r.json()).toEqual({ resultado: "identificado" });
    // Lo que el dueño ve junto a «Identificado» es el nombre que validó el registro, no el que se escribió antes.
    expect(
      consultar(
        `select nombre from public.compradores where telefono = '${c.telefono}'`,
      ),
    ).toEqual(["Laura Sintetica Prueba"]);
    const { data } = await api().rpc("obtener_mi_anuncio", {
      p_token: a.token,
    });
    const tarjeta = (
      data as unknown as {
        solicitudes: Array<{
          comprador: { nombre: string; identificado: boolean };
          estado: string;
        }>;
      }
    ).solicitudes[0];
    expect(tarjeta.comprador).toMatchObject({
      nombre: "Laura Sintetica Prueba",
      identificado: true,
    });
    // Y la solicitud que esperaba por no estar identificado avanzó sola.
    expect(tarjeta.estado).toBe("pendiente");
    expect(estadoDe(token)).toBe("pendiente");
    // Una cédula que no coincide no cambia el nombre de nadie.
    const otro = await cookieCompradorVerificado({ nombre: "Camilo Prueba" });
    await identificarse(request, otro.cookie, CEDULAS_PRUEBA.no_coincide);
    expect(
      consultar(
        `select nombre from public.compradores where telefono = '${otro.telefono}'`,
      ),
    ).toEqual(["Camilo Prueba"]);
  });

  test("«ninguno me sirve», rechazar y cancelar de los dos lados", async ({
    request,
  }) => {
    // Ninguno me sirve → vuelve a pendiente.
    const a = await anuncioAbierto();
    const c = await cookieCompradorVerificado();
    const { token } = await (
      await pedirVisita(request, c.cookie, a.slug)
    ).json();
    const id = consultar(
      `select id from public.solicitudes_visita where token_hash = encode(sha256(convert_to('${token}', 'UTF8')), 'hex')`,
    )[0];
    await post(request, "/api/visitas/proponer", {
      token: a.token,
      solicitudId: id,
      horarios: [bogota(2)],
    });
    expect(
      (
        await post(request, "/api/visitas/elegir", { token, horarioId: null })
      ).status(),
    ).toBe(200);
    expect(estadoDe(token)).toBe("pendiente");
    // El dueño la rechaza.
    expect(
      (
        await post(request, "/api/visitas/rechazar", {
          token: a.token,
          solicitudId: id,
        })
      ).status(),
    ).toBe(200);
    expect(estadoDe(token)).toBe("rechazada");
    expect(
      (
        await post(request, "/api/visitas/rechazar", {
          token: a.token,
          solicitudId: id,
        })
      ).status(),
    ).toBe(409);

    // El comprador cancela una confirmada.
    const b = await anuncioAbierto();
    const v1 = await visitaConfirmada(request, b);
    expect(
      (
        await post(request, "/api/visitas/cancelar", {
          quien: "comprador",
          token: v1.token,
        })
      ).status(),
    ).toBe(200);
    expect(estadoDe(v1.token)).toBe("cancelada");

    // El dueño cancela otra.
    const d = await anuncioAbierto();
    const v2 = await visitaConfirmada(request, d);
    expect(
      (
        await post(request, "/api/visitas/cancelar", {
          quien: "dueno",
          token: d.token,
          solicitudId: v2.id,
        })
      ).status(),
    ).toBe(200);
    expect((await suVisita(v2.token)).visita?.cancelada_por).toBe("dueno");
    expect(
      (
        await post(request, "/api/visitas/cancelar", {
          quien: "otro",
          token: d.token,
        })
      ).status(),
    ).toBe(400);
  });

  test("solo identificados: sin identificar queda en espera; identificado entra directo", async ({
    request,
  }) => {
    const a = await anuncioAbierto();
    await api().rpc("guardar_solo_identificados", {
      p_token: a.token,
      p_activo: true,
    });
    const sin = await cookieCompradorVerificado();
    expect(
      (await (await pedirVisita(request, sin.cookie, a.slug)).json()).estado,
    ).toBe("en_espera");
    const si = await cookieCompradorVerificado();
    await identificarse(request, si.cookie, CEDULAS_PRUEBA.identificado);
    expect(
      (await (await pedirVisita(request, si.cookie, a.slug)).json()).estado,
    ).toBe("pendiente");
  });
});

// ── El trabajo diario ─────────────────────────────────────────────────────────

test.describe("POST /api/cron/diario", () => {
  test("sin el bearer exacto no abre", async ({ request }) => {
    expect((await request.post("/api/cron/diario")).status()).toBe(401);
    expect(
      (
        await request.post("/api/cron/diario", {
          headers: { authorization: `Bearer ${CRON}x` },
        })
      ).status(),
    ).toBe(401);
    expect((await request.get("/api/cron/diario")).status()).toBe(405);
  });

  test("el cron reclama la visita de mañana una sola vez, ninguna cancelada, y purga", async ({
    request,
  }) => {
    test.skip(!CRON, "sin CRON_SECRET en el entorno de la prueba");
    const manana = `((now() at time zone 'America/Bogota')::date + 1 + time '10:00') at time zone 'America/Bogota'`;
    const a = await anuncioAbierto();
    const viva = await visitaConfirmada(request, a);
    const b = await anuncioAbierto();
    const cancelada = await visitaConfirmada(request, b);
    await post(request, "/api/visitas/cancelar", {
      quien: "comprador",
      token: cancelada.token,
    });
    ejecutar(
      `update public.visitas set inicio = ${manana} where solicitud_id in ('${viva.id}', '${cancelada.id}')`,
    );
    // Un comprador que nunca verificó, de hace 31 días: la purga se lo lleva.
    const viejo = telefonoNuevo();
    await pedirCodigo(sesionNueva(), { p_telefono: viejo });
    ejecutar(
      `update public.compradores set created_at = now() - interval '31 days' where telefono = '${viejo}'`,
    );
    // S16: la purga perdona a quien pidió un código hace poco; este lo pidió hace 31 días.
    ejecutar(
      `update public.verificaciones set created_at = now() - interval '31 days'
        where comprador_id = (select id from public.compradores where telefono = '${viejo}')`,
    );

    // Esta prueba es de los recordatorios: con `x-alertas-solo` apuntando a una alerta que no existe, el paso de
    // resúmenes no se lleva los de las pruebas de alertas que corren a la vez (S9).
    const correr = () =>
      request.post("/api/cron/diario", {
        headers: {
          authorization: `Bearer ${CRON}`,
          "x-alertas-solo": "00000000-0000-0000-0000-000000000000",
        },
      });
    const r = await correr();
    expect(r.status()).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo).toMatchObject({
      correos: { enviados: expect.any(Number), fallidos: 0 },
      purga: {
        compradores: expect.any(Number),
        verificaciones: expect.any(Number),
      },
    });
    // S16 (deuda del S8): se cuentan los CORREOS, no solo el reclamo. La visita de mañana manda dos (comprador y dueño); otras
    // pruebas que corren a la vez pueden sumar más, nunca menos.
    expect(cuerpo.correos.enviados).toBeGreaterThanOrEqual(2);
    // Sin datos de nadie en la respuesta.
    expect(JSON.stringify(cuerpo)).not.toContain("@");

    const reclamada = (id: string) =>
      consultar(
        `select coalesce(recordatorio_at::text, 'null') from public.visitas where solicitud_id = '${id}'`,
      )[0];
    const primera = reclamada(viva.id);
    expect(primera).not.toBe("null");
    expect(reclamada(cancelada.id)).toBe("null");
    expect(
      consultar(
        `select count(*) from public.compradores where telefono = '${viejo}'`,
      ),
    ).toEqual(["0"]);

    // Correr otra vez el mismo día no repite: la marca no cambia.
    expect((await correr()).status()).toBe(200);
    expect(reclamada(viva.id)).toBe(primera);
  });
});
