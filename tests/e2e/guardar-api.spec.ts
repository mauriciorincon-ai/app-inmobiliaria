import { test, expect, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar } from "./utils/bd";
import {
  conContactoPublico,
  crearAnuncio,
  precioUnico,
  vencer,
} from "./utils/anuncios";
import {
  compradorVerificado,
  cookieCompradorVerificado,
} from "./utils/comprador";
import {
  alertaConfirmada,
  banda,
  correoNuevo,
  crearAlerta,
} from "./utils/alertas";
import type { VisitaDelComprador } from "../../src/lib/supabase/types";

// S9 «Guardar y avisar» — las RUTAS, de punta a punta sobre la app, con Brevo en simulacro (`BREVO_MOCK=1`):
// crear una alerta (solo se envía la confirmación), confirmar, «Mis alertas», la baja en un clic SIN sesión
// (cuerpo y cabecera RFC 8058), el resumen del cron, el TOPE del día (las alertas ceden y la visita sale),
// favoritos, el resumen de anuncios y las listas con notas. Datos 100 % sintéticos.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const CRON = process.env.CRON_SECRET ?? "";

// Las rutas son las mismas en los dos proyectos: se corren una vez.
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});

const api = () => createClient(url, anon);

function post(
  request: APIRequestContext,
  ruta: string,
  data: unknown,
  cookie?: string,
) {
  return request.post(ruta, { data, headers: cookie ? { cookie } : {} });
}

function cron(request: APIRequestContext, extra: Record<string, string> = {}) {
  return request.post("/api/cron/diario", {
    headers: { authorization: `Bearer ${CRON}`, ...extra },
  });
}

// Cada creación viene de una IP sintética distinta (TEST-NET, RFC 5737): el tope de 10 por IP y día es de la
// base y en local todas las peticiones salen de la misma máquina. En producción la IP la pone Cloudflare.
function ipSintetica(): string {
  return `192.0.2.${Math.floor(Math.random() * 254) + 1}-${Date.now()}-${Math.random()}`;
}

function crearPorRuta(
  request: APIRequestContext,
  cambios: Record<string, unknown> = {},
) {
  return request.post("/api/alertas", {
    headers: { "x-forwarded-for": ipSintetica() },
    data: {
      consulta: `op=venta&min=${precioUnico()}`,
      nombre: "Apartamentos sintéticos",
      email: correoNuevo(),
      nuevos: true,
      bajas: true,
      consentimiento: true,
      idioma: "es",
      _inicio: Date.now() - 10_000,
      ...cambios,
    },
  });
}

const campo = (id: string, columna: string) =>
  consultar(
    `select coalesce(${columna}::text, 'null') from public.alertas where id = '${id}'`,
  )[0];

// ── Crear y confirmar ─────────────────────────────────────────────────────────

test.describe("POST /api/alertas", () => {
  test("crea la alerta SIN confirmar y al navegador solo vuelve el token de gestionar", async ({
    request,
  }) => {
    const email = correoNuevo();
    const r = await crearPorRuta(request, { email: email.toUpperCase() });
    expect(r.status()).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo.gestionar).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Object.keys(cuerpo).sort()).toEqual(["gestionar", "ok"]);
    const [fila] = consultar(
      `select confirmada_at is null, length(ip_hash) > 8, idioma from public.alertas where email = '${email}'`,
    );
    expect(fila).toBe("t|t|es");
  });

  test("valida: cuerpo malo, sin criterios, sin consentimiento, correo malo; el bot recibe un 200 vacío", async ({
    request,
  }) => {
    expect((await post(request, "/api/alertas", { x: 1 })).status()).toBe(400);
    const sinCriterios = await crearPorRuta(request, { consulta: "op=nada" });
    expect(sinCriterios.status()).toBe(400);
    expect(await sinCriterios.json()).toEqual({ error: "sin_criterios" });
    const sinConsent = await crearPorRuta(request, { consentimiento: false });
    expect(await sinConsent.json()).toEqual({
      error: "consentimiento_requerido",
    });
    const malo = await crearPorRuta(request, { email: "no-es-correo" });
    expect(await malo.json()).toEqual({ error: "email_invalido" });

    const email = correoNuevo();
    const bot = await crearPorRuta(request, {
      email,
      sitio_web: "http://spam.example",
    });
    expect(bot.status()).toBe(200);
    expect(await bot.json()).toEqual({ ok: true });
    expect(
      consultar(`select count(*) from public.alertas where email = '${email}'`),
    ).toEqual(["0"]);
  });

  test("la cuarta alerta del mismo correo en 24 h es 429", async ({
    request,
  }) => {
    const email = correoNuevo();
    for (let i = 0; i < 3; i++) {
      expect((await crearPorRuta(request, { email })).status()).toBe(200);
    }
    const cuarta = await crearPorRuta(request, { email });
    expect(cuarta.status()).toBe(429);
    expect(await cuarta.json()).toEqual({ error: "demasiadas_alertas" });
  });
});

test.describe("POST /api/alertas/gestion", () => {
  test("confirmar con el token del correo; uno falso es 403; «mis alertas» enmascara y no devuelve tokens", async ({
    request,
  }) => {
    const email = correoNuevo();
    const a = crearAlerta({ email, ...banda(precioUnico()), nombre: "Mía" });

    const falso = await post(request, "/api/alertas/gestion", {
      accion: "confirmar",
      token: "x".repeat(43),
    });
    expect(falso.status()).toBe(403);
    // El de gestionar no confirma.
    expect(
      (
        await post(request, "/api/alertas/gestion", {
          accion: "confirmar",
          token: a.gestionar,
        })
      ).status(),
    ).toBe(403);

    const ok = await post(request, "/api/alertas/gestion", {
      accion: "confirmar",
      token: a.confirmar,
    });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toEqual({ estado: "confirmada", nombre: "Mía" });

    const mias = await post(request, "/api/alertas/gestion", {
      accion: "mias",
      tokens: [a.gestionar],
    });
    const { alertas } = await mias.json();
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({
      indice: 0,
      nombre: "Mía",
      estado: "activa",
      correo: `${email[0]}***@ejemplo.test`,
    });
    const bruto = JSON.stringify(alertas);
    expect(bruto).not.toContain(email);
    expect(bruto).not.toContain(a.gestionar);

    const pausa = await post(request, "/api/alertas/gestion", {
      accion: "gestionar",
      token: a.gestionar,
      cambio: "pausar",
    });
    expect(await pausa.json()).toMatchObject({ estado: "pausada" });
    // Más de 20 tokens: 400 sin preguntarle a la base.
    expect(
      (
        await post(request, "/api/alertas/gestion", {
          accion: "mias",
          tokens: Array.from({ length: 21 }, () => a.gestionar),
        })
      ).status(),
    ).toBe(400);
  });
});

// ── La baja en un clic ────────────────────────────────────────────────────────

test.describe("POST /api/alertas/baja", () => {
  test("RFC 8058: el cliente de correo hace un POST con el token en la URL, SIN cookie, y la alerta deja de avisar", async ({
    playwright,
  }) => {
    // Un contexto nuevo: ni cookies ni nada de nadie.
    const limpio = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL,
    });
    const a = alertaConfirmada({ ...banda(precioUnico()) });
    const r = await limpio.post(`/api/alertas/baja?t=${a.baja}`, {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: "List-Unsubscribe=One-Click",
    });
    expect(r.status()).toBe(200);
    expect(campo(a.alerta_id, "baja_at")).not.toBe("null");
    // Repetirla no falla.
    expect(
      (
        await limpio.post(`/api/alertas/baja?t=${a.baja}`, {
          headers: { "content-type": "application/x-www-form-urlencoded" },
          data: "List-Unsubscribe=One-Click",
        })
      ).status(),
    ).toBe(200);
    await limpio.dispose();
  });

  test("la página de baja manda el token en el cuerpo; un token falso o malformado no da de baja a nadie", async ({
    request,
  }) => {
    const a = alertaConfirmada({ ...banda(precioUnico()), nombre: "Chao" });
    expect(
      (
        await post(request, "/api/alertas/baja", { token: "y".repeat(43) })
      ).status(),
    ).toBe(403);
    expect(
      (await post(request, "/api/alertas/baja", { token: "corto" })).status(),
    ).toBe(400);
    // El token de gestionar no da de baja (cada token, un propósito).
    expect(
      (
        await post(request, "/api/alertas/baja", { token: a.gestionar })
      ).status(),
    ).toBe(403);
    expect(campo(a.alerta_id, "baja_at")).toBe("null");

    const r = await post(request, "/api/alertas/baja", { token: a.baja });
    expect(r.status()).toBe(200);
    expect(await r.json()).toEqual({ estado: "baja", nombre: "Chao" });
  });
});

// ── El trabajo diario: resúmenes y el tope ───────────────────────────────────

async function visitaDeManana(): Promise<string> {
  const a = await crearAnuncio({ email: "dueno.s9@ejemplo.test" });
  conContactoPublico(a);
  const { sesion } = await compradorVerificado();
  const sol = await api().rpc("solicitar_visita", {
    p_sesion_hash: sesion,
    p_slug: a.slug,
    p_intencion: "vivir",
    p_presupuesto_min: null,
    p_presupuesto_max: null,
    p_forma_pago: [],
    p_mensaje: null,
    p_email: "comprador.s9@ejemplo.test",
    p_consentimiento: true,
  });
  expect(sol.error).toBeNull();
  const { solicitud_id, token } = sol.data as {
    solicitud_id: string;
    token: string;
  };
  const en3dias = consultar(
    `select ((((now() at time zone 'America/Bogota')::date + 3) + time '10:00') at time zone 'America/Bogota')::text`,
  )[0];
  const prop = await api().rpc("proponer_horarios", {
    p_token: a.token,
    p_solicitud_id: solicitud_id,
    p_horarios: [new Date(en3dias).toISOString()],
  });
  expect(prop.error).toBeNull();
  const { data: visita } = await api().rpc("obtener_visita", {
    p_token: token,
  });
  const horario = (visita as VisitaDelComprador).horarios[0].id;
  expect(
    (
      await api().rpc("elegir_horario", {
        p_token: token,
        p_horario_id: horario,
      })
    ).error,
  ).toBeNull();
  consultar(
    `update public.visitas set inicio = (((now() at time zone 'America/Bogota')::date + 1) + time '10:00') at time zone 'America/Bogota'
      where solicitud_id = '${solicitud_id}'`,
  );
  return solicitud_id;
}

test.describe("POST /api/cron/diario — resúmenes", () => {
  // El cron reclamaría TODAS las alertas de la base y le robaría el resumen a las pruebas de otros archivos
  // que corren a la vez: cada corrida se limita a SU alerta con `x-alertas-solo` (solo con Brevo en simulacro).
  // Entre ellas, en serie.
  test.describe.configure({ mode: "serial" });

  test("una alerta confirmada con un anuncio nuevo recibe su resumen UNA vez; una sin confirmar, nunca", async ({
    request,
  }) => {
    test.skip(!CRON, "sin CRON_SECRET en el entorno de la prueba");
    const precio = precioUnico();
    const confirmada = alertaConfirmada({ ...banda(precio) });
    const sinConfirmar = crearAlerta({ ...banda(precio) });
    await crearAnuncio({ precio });

    const r = await cron(request, { "x-alertas-solo": confirmada.alerta_id });
    expect(r.status()).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo.resumenes).toMatchObject({ fallidos: 0 });
    expect(JSON.stringify(cuerpo)).not.toContain("@");
    const envio = campo(confirmada.alerta_id, "ultimo_envio_at");
    expect(envio).not.toBe("null");
    // La sin confirmar, pedida a propósito: tampoco sale.
    const ajena = await cron(request, {
      "x-alertas-solo": sinConfirmar.alerta_id,
    });
    expect(ajena.status()).toBe(200);
    expect(campo(sinConfirmar.alerta_id, "ultimo_envio_at")).toBe("null");

    // Otra corrida el mismo día no la toca.
    expect(
      (
        await cron(request, { "x-alertas-solo": confirmada.alerta_id })
      ).status(),
    ).toBe(200);
    expect(campo(confirmada.alerta_id, "ultimo_envio_at")).toBe(envio);
  });

  test("DEMO EN ROJO del tope: con el cupo del día agotado no sale NINGÚN correo de alerta y el recordatorio de la visita SÍ", async ({
    request,
  }) => {
    test.skip(!CRON, "sin CRON_SECRET en el entorno de la prueba");
    const precio = precioUnico();
    const alerta = alertaConfirmada({ ...banda(precio) });
    await crearAnuncio({ precio });
    const solicitud = await visitaDeManana();

    // Tope 0 (solo con Brevo en simulacro): el cupo del día está lleno.
    const lleno = await cron(request, {
      "x-alertas-tope": "0",
      "x-alertas-solo": alerta.alerta_id,
    });
    expect(lleno.status()).toBe(200);
    const cuerpo = await lleno.json();
    expect(cuerpo.resumenes.enviados).toBe(0);
    expect(campo(alerta.alerta_id, "ultimo_envio_at")).toBe("null");
    // La visita sí recibió su recordatorio (lo reclamó esta corrida u otra del mismo día).
    expect(
      consultar(
        `select recordatorio_at is not null from public.visitas where solicitud_id = '${solicitud}'`,
      ),
    ).toEqual(["t"]);

    // Al día siguiente (o con cupo), la alerta sale completa: no se perdió nada.
    const conCupo = await cron(request, { "x-alertas-solo": alerta.alerta_id });
    expect(conCupo.status()).toBe(200);
    expect(campo(alerta.alerta_id, "ultimo_envio_at")).not.toBe("null");
    expect(campo(alerta.alerta_id, "ultimo_resumen")).toContain('"nuevos": 1');
  });

  test("una alerta dada de baja ya no recibe resumen", async ({ request }) => {
    test.skip(!CRON, "sin CRON_SECRET en el entorno de la prueba");
    const precio = precioUnico();
    const a = alertaConfirmada({ ...banda(precio) });
    expect(
      (await post(request, "/api/alertas/baja", { token: a.baja })).status(),
    ).toBe(200);
    await crearAnuncio({ precio });
    expect(
      (await cron(request, { "x-alertas-solo": a.alerta_id })).status(),
    ).toBe(200);
    expect(campo(a.alerta_id, "ultimo_envio_at")).toBe("null");
  });
});

// ── Favoritos y el resumen de anuncios ───────────────────────────────────────

test.describe("/api/favoritos y /api/anuncios/resumen", () => {
  test("sin la sesión verificada es 403; con ella fusiona sin duplicar y quita", async ({
    request,
  }) => {
    const [a, b] = await Promise.all([crearAnuncio(), crearAnuncio()]);
    expect((await request.get("/api/favoritos")).status()).toBe(403);
    expect(
      (await post(request, "/api/favoritos", { slugs: [a.slug] })).status(),
    ).toBe(403);

    const { cookie } = await cookieCompradorVerificado();
    const get = async () =>
      (await request.get("/api/favoritos", { headers: { cookie } })).json();
    expect(await get()).toEqual({ slugs: [] });

    const r = await post(
      request,
      "/api/favoritos",
      { slugs: [a.slug, b.slug, a.slug] },
      cookie,
    );
    expect(r.status()).toBe(200);
    expect((await r.json()).slugs.sort()).toEqual([a.slug, b.slug].sort());
    await post(request, "/api/favoritos", { slugs: [b.slug] }, cookie);
    expect((await get()).slugs).toHaveLength(2);

    const del = await request.delete("/api/favoritos", {
      data: { slug: a.slug },
      headers: { cookie },
    });
    expect(del.status()).toBe(200);
    expect((await get()).slugs).toEqual([b.slug]);

    expect(
      (
        await post(request, "/api/favoritos", { slugs: ["MAL MAL"] }, cookie)
      ).status(),
    ).toBe(400);
  });

  test("el resumen de anuncios: sin sesión, en orden, sin vencidos, máx. 100", async ({
    request,
  }) => {
    const [a, b, c] = await Promise.all([
      crearAnuncio(),
      crearAnuncio(),
      crearAnuncio(),
    ]);
    vencer(c);
    const r = await post(request, "/api/anuncios/resumen", {
      slugs: [b.slug, c.slug, a.slug],
    });
    expect(r.status()).toBe(200);
    const { anuncios } = await r.json();
    expect(anuncios.map((x: { slug: string }) => x.slug)).toEqual([
      b.slug,
      a.slug,
    ]);
    expect(
      (
        await post(request, "/api/anuncios/resumen", {
          slugs: Array.from({ length: 101 }, (_, i) => `x-${i}-ab`),
        })
      ).status(),
    ).toBe(400);
  });
});

// ── Listas compartidas ───────────────────────────────────────────────────────

test.describe("POST /api/listas", () => {
  test("la dueña crea, agrega y comparte; quien abre el enlace la ve sin sesión, escribe notas solo verificado; revocar la apaga", async ({
    request,
  }) => {
    const a = await crearAnuncio();
    expect(
      (
        await post(request, "/api/listas", { accion: "crear", nombre: "x" })
      ).status(),
    ).toBe(403);

    const duena = await cookieCompradorVerificado({ nombre: "Laura Gómez" });
    const creada = await post(
      request,
      "/api/listas",
      { accion: "crear", nombre: "Para nosotros" },
      duena.cookie,
    );
    const { lista } = await creada.json();
    expect(lista).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      (
        await post(
          request,
          "/api/listas",
          { accion: "agregar", lista, slug: a.slug },
          duena.cookie,
        )
      ).status(),
    ).toBe(200);
    const { token } = await (
      await post(
        request,
        "/api/listas",
        { accion: "compartir", lista },
        duena.cookie,
      )
    ).json();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // Sin sesión: la ve, no puede escribir.
    const vista = await post(request, "/api/listas", { accion: "ver", token });
    expect(vista.status()).toBe(200);
    const { lista: detalle } = await vista.json();
    expect(detalle).toMatchObject({
      nombre: "Para nosotros",
      dueno: "Laura",
      puede_escribir: false,
    });
    expect(JSON.stringify(detalle)).not.toContain(duena.telefono);
    const sinSesion = await post(request, "/api/listas", {
      accion: "nota",
      token,
      slug: a.slug,
      texto: "Hola",
    });
    expect(sinSesion.status()).toBe(403);

    // Con su WhatsApp verificado, escribe.
    const camilo = await cookieCompradorVerificado({ nombre: "Camilo Ruiz" });
    const nota = await post(
      request,
      "/api/listas",
      { accion: "nota", token, slug: a.slug, texto: "Me gusta el balcón" },
      camilo.cookie,
    );
    expect(nota.status()).toBe(200);

    // Revocado: el enlace ya no abre nada.
    await post(
      request,
      "/api/listas",
      { accion: "revocar", lista },
      duena.cookie,
    );
    expect(
      (await post(request, "/api/listas", { accion: "ver", token })).status(),
    ).toBe(404);
    // La dueña la sigue viendo por su id, con la nota de Camilo (solo su primer nombre).
    const propia = await (
      await post(request, "/api/listas", { accion: "ver", lista }, duena.cookie)
    ).json();
    expect(propia.lista.items[0].notas[0]).toMatchObject({
      autor: "Camilo",
      texto: "Me gusta el balcón",
    });
  });

  test("acción desconocida o datos malos: 400", async ({ request }) => {
    const { cookie } = await cookieCompradorVerificado();
    for (const malo of [
      { accion: "explotar" },
      { accion: "crear", nombre: "" },
      { accion: "agregar", lista: "no-es-uuid", slug: "abc-123" },
      { accion: "ver" },
    ]) {
      expect(
        (await post(request, "/api/listas", malo, cookie)).status(),
        JSON.stringify(malo),
      ).toBe(400);
    }
  });
});
