import { createHmac } from "node:crypto";
import {
  test,
  expect,
  request as crearRequest,
  type APIRequestContext,
} from "@playwright/test";
import { consultar } from "./utils/bd";
import { conContactoPublico, crearAnuncio } from "./utils/anuncios";

// Verificación del comprador por MENSAJE ENTRANTE y contacto con un toque (S7, ADR 015), por la API.
// Meta no participa: el test firma cada carga con el mismo secreto que tiene el servidor, como lo haría
// Meta, y la manda al webhook. Datos 100 % sintéticos; el número de Innmobiliaria es ficticio.

const SECRETO = process.env.WHATSAPP_APP_SECRET ?? "";
const TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
const NUMERO = (process.env.WHATSAPP_NUMERO ?? "").replace(/\D/g, "");
const DUENO = "573001234567"; // el WhatsApp sintético con que `crearAnuncio` publica
const CODIGO = /^INN-[A-HJ-NP-Z2-9]{6}$/;

// La API no depende del tamaño de pantalla: una sola pasada.
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  expect(SECRETO, "WHATSAPP_APP_SECRET en el entorno del e2e").not.toBe("");
});

let secuencia = 0;
// Un celular colombiano sintético distinto por comprador (10 dígitos, empieza por 3).
function celularNuevo(): string {
  secuencia += 1;
  return `3${String(Date.now() * 10 + secuencia).slice(-9)}`;
}

function firmar(cuerpo: string, secreto = SECRETO): string {
  return `sha256=${createHmac("sha256", secreto).update(cuerpo).digest("hex")}`;
}

function cargaMeta(desde: string, texto: string): string {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "0",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              contacts: [{ wa_id: desde, profile: { name: "Comprador" } }],
              messages: [
                {
                  from: desde,
                  id: `wamid.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: texto },
                },
              ],
            },
          },
        ],
      },
    ],
  });
}

// Cada comprador es un navegador aparte: su propio contexto, sin cookies de otro.
async function nuevoContexto(): Promise<APIRequestContext> {
  return crearRequest.newContext({ baseURL: test.info().project.use.baseURL });
}

type Comprador = {
  ctx: APIRequestContext;
  cookie: string;
  // La cabecera Set-Cookie completa, con sus banderas.
  cookieCompleta: string;
  codigo: string;
  href: string;
  celular: string;
};

async function pedirCodigo(idioma: "es" | "en" = "es"): Promise<Comprador> {
  const ctx = await nuevoContexto();
  const celular = celularNuevo();
  const r = await ctx.post("/api/verificacion/iniciar", {
    data: {
      nombre: "Laura Sintetica",
      whatsapp: celular,
      consentimiento: true,
      idioma,
    },
  });
  expect(r.status(), await r.text()).toBe(200);
  const setCookie = r.headers()["set-cookie"] ?? "";
  const { codigo, href } = await r.json();
  return {
    ctx,
    cookie: setCookie.split(";")[0],
    cookieCompleta: setCookie,
    codigo,
    href,
    celular,
  };
}

async function estado(c: Comprador) {
  const r = await c.ctx.get("/api/verificacion/estado", {
    headers: { cookie: c.cookie },
  });
  return (await r.json()) as { estado: string };
}

async function webhook(
  ctx: APIRequestContext,
  cuerpo: string,
  firma: string | null = firmar(cuerpo),
) {
  // Bytes crudos: Playwright reescribiría como JSON un texto que no lo es, y la firma ya no casaría.
  return ctx.post("/api/whatsapp/webhook", {
    data: Buffer.from(cuerpo, "utf8"),
    headers: {
      "content-type": "application/json",
      ...(firma === null ? {} : { "x-hub-signature-256": firma }),
    },
  });
}

async function contactar(c: Comprador | null, slug: string) {
  const ctx = c?.ctx ?? (await nuevoContexto());
  return ctx.post("/api/contacto", {
    data: { slug, idioma: "es" },
    headers: c ? { cookie: c.cookie } : {},
  });
}

function textoDe(href: string): string {
  return new URL(href).searchParams.get("text") ?? "";
}

test("de punta a punta: código → mensaje firmado desde el mismo número → verificado → contacto con el WhatsApp del dueño", async () => {
  const anuncio = await crearAnuncio();
  conContactoPublico(anuncio);
  const c = await pedirCodigo();

  // El código y el enlace hacia el número de Innmobiliaria, con el código ya escrito.
  expect(c.codigo).toMatch(CODIGO);
  expect(c.href.startsWith(`https://wa.me/${NUMERO}?text=`)).toBe(true);
  expect(textoDe(c.href)).toContain(c.codigo);
  // La cookie de la sesión no la lee JavaScript y viaja solo por HTTPS (localhost es contexto seguro).
  expect(c.cookie).toMatch(/^inn_comprador=[A-Za-z0-9_-]{43}$/);
  expect(c.cookieCompleta).toMatch(/HttpOnly/i);
  expect(c.cookieCompleta).toMatch(/Secure/i);
  expect(c.cookieCompleta).toMatch(/SameSite=Lax/i);
  expect(await estado(c)).toMatchObject({ estado: "esperando" });

  // Antes de verificar, el número del dueño no sale.
  const antes = await contactar(c, anuncio.slug);
  expect(antes.status()).toBe(403);
  expect(await antes.text()).not.toContain(DUENO);

  // Meta entrega el mensaje que el comprador mandó desde SU número.
  const r = await webhook(c.ctx, cargaMeta(`57${c.celular}`, textoDe(c.href)));
  expect(r.status()).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
  expect(await estado(c)).toEqual({ estado: "verificado" });

  // Contactar: `wa.me` del dueño con el mensaje precargado, y el contacto queda registrado.
  const despues = await contactar(c, anuncio.slug);
  expect(despues.status()).toBe(200);
  const { href } = await despues.json();
  expect(href.startsWith(`https://wa.me/${DUENO}?text=`)).toBe(true);
  expect(textoDe(href)).toContain("apartamento en Los Rosales");
  expect(
    consultar(
      `select count(*) from public.contactos where inmueble_id = '${anuncio.id}'`,
    ),
  ).toEqual(["1"]);
});

test("sin firma, con firma de otro secreto o de otro cuerpo: 401 y nadie queda verificado", async () => {
  const c = await pedirCodigo();
  const cuerpo = cargaMeta(`57${c.celular}`, c.codigo);
  expect((await webhook(c.ctx, cuerpo, null)).status()).toBe(401);
  expect(
    (await webhook(c.ctx, cuerpo, firmar(cuerpo, "otro-secreto"))).status(),
  ).toBe(401);
  expect((await webhook(c.ctx, cuerpo, firmar(cuerpo + " "))).status()).toBe(
    401,
  );
  expect((await webhook(c.ctx, cuerpo, "sha256=00")).status()).toBe(401);
  // Ni siquiera un cuerpo que no es JSON se interpreta sin firma.
  expect((await webhook(c.ctx, "no-es-json", null)).status()).toBe(401);
  expect(await estado(c)).toMatchObject({ estado: "esperando" });
});

test("un código que llega firmado pero desde OTRO número no verifica: la página dice «otro número»", async () => {
  const c = await pedirCodigo();
  const r = await webhook(c.ctx, cargaMeta(`57${celularNuevo()}`, c.codigo));
  expect(r.status()).toBe(200);
  expect(await estado(c)).toEqual({ estado: "otro_numero" });
});

test("un código vencido no verifica aunque el mensaje sea auténtico", async () => {
  const c = await pedirCodigo();
  consultar(
    `update public.verificaciones set vence_at = now() - interval '1 minute'
       where codigo_hash = encode(sha256(convert_to('${c.codigo}', 'UTF8')), 'hex')`,
  );
  await webhook(c.ctx, cargaMeta(`57${c.celular}`, c.codigo));
  expect(await estado(c)).toEqual({ estado: "vencido" });
});

test("una entrega repetida (reintento de Meta) responde 200 y el código no se usa dos veces", async () => {
  const c = await pedirCodigo();
  const cuerpo = cargaMeta(`57${c.celular}`, c.codigo);
  expect((await webhook(c.ctx, cuerpo)).status()).toBe(200);
  expect((await webhook(c.ctx, cuerpo)).status()).toBe(200);
  expect(
    consultar(
      `select count(*) from public.verificaciones
         where codigo_hash = encode(sha256(convert_to('${c.codigo}', 'UTF8')), 'hex') and usado_at is not null`,
    ),
  ).toEqual(["1"]);
});

test("mensajes sin código, imágenes y estados de entrega se ignoran con 200", async () => {
  const ctx = await nuevoContexto();
  for (const cuerpo of [
    cargaMeta(`57${celularNuevo()}`, "Hola, quiero información"),
    JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [{ field: "messages", value: { statuses: [{ id: "x" }] } }],
        },
      ],
    }),
    "no-es-json",
  ]) {
    const r = await webhook(ctx, cuerpo);
    expect(r.status(), cuerpo.slice(0, 40)).toBe(200);
  }
});

test("el saludo de suscripción: con el token devuelve el reto; sin él, 403", async () => {
  const ctx = await nuevoContexto();
  const bueno = await ctx.get(
    `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(TOKEN)}&hub.challenge=reto-123`,
  );
  expect(bueno.status()).toBe(200);
  expect(await bueno.text()).toBe("reto-123");
  for (const malo of [
    "hub.mode=subscribe&hub.verify_token=token-falso&hub.challenge=reto-123",
    "hub.mode=subscribe&hub.challenge=reto-123",
    `hub.mode=otro&hub.verify_token=${encodeURIComponent(TOKEN)}&hub.challenge=reto-123`,
  ]) {
    const r = await ctx.get(`/api/whatsapp/webhook?${malo}`);
    expect(r.status(), malo).toBe(403);
    expect(await r.text()).not.toContain("reto-123");
  }
});

test("contactar sin sesión es 403; verificado pero hacia un anuncio sin opt-in, 404 sin número", async () => {
  const anuncio = await crearAnuncio(); // sin opt-in
  const sinSesion = await contactar(null, anuncio.slug);
  expect(sinSesion.status()).toBe(403);
  const c = await pedirCodigo();
  await webhook(c.ctx, cargaMeta(`57${c.celular}`, c.codigo));
  expect(await estado(c)).toEqual({ estado: "verificado" });
  const r = await contactar(c, anuncio.slug);
  expect(r.status()).toBe(404);
  expect(await r.text()).not.toContain(DUENO);
});

test("pedir un código exige el consentimiento y un celular colombiano", async () => {
  const ctx = await nuevoContexto();
  for (const data of [
    { nombre: "Laura", whatsapp: celularNuevo(), consentimiento: false },
    { nombre: "Laura", whatsapp: celularNuevo() },
    { nombre: "Laura", whatsapp: "123", consentimiento: true },
    { nombre: "L", whatsapp: celularNuevo(), consentimiento: true },
  ]) {
    const r = await ctx.post("/api/verificacion/iniciar", { data });
    expect(r.status(), JSON.stringify(data)).toBe(400);
    expect(r.headers()["set-cookie"]).toBeUndefined();
  }
});

test("la ficha pública no lleva el WhatsApp del dueño en su HTML, ni con opt-in", async () => {
  const anuncio = await crearAnuncio();
  conContactoPublico(anuncio);
  const ctx = await nuevoContexto();
  const html = await (await ctx.get(`/i/${anuncio.slug}`)).text();
  expect(html).toContain("Los Rosales");
  for (const forma of [DUENO, "3001234567", "300 123 4567"]) {
    expect(html, forma).not.toContain(forma);
  }
});
