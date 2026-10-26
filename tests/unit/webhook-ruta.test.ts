// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { firmarCuerpo } from "@/engine/verificacion/firma";

// S16 (deuda del S7) — las salidas del webhook de WhatsApp que no prueba el e2e: sin secreto (503), cuerpo grande con y sin
// `content-length` (413), firma inválida (401), sin llave del servidor (503) y un canje que falla (500, para que Meta reintente).
// Base falsa; datos sintéticos.

let cliente: unknown = null;
vi.mock("@/lib/logger", () => {
  const log = { info: () => {}, warn: () => {}, error: () => {}, child: () => log };
  return { logger: log };
});
vi.mock("@/lib/observability", () => ({ reportError: () => {} }));
vi.mock("@/lib/supabase/servicio", () => ({
  crearClienteServicio: () => cliente,
}));

const { POST } = await import("@/app/api/whatsapp/webhook/route");

const SECRETO = "secreto-sintetico";
const URL_WEBHOOK = "http://localhost/api/whatsapp/webhook";
const conCodigo = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          field: "messages",
          value: {
            messages: [
              { from: "573001112233", type: "text", text: { body: "INN-4KQ2ZX" } },
            ],
          },
        },
      ],
    },
  ],
});

async function firmada(cuerpo: string) {
  return new NextRequest(URL_WEBHOOK, {
    method: "POST",
    body: cuerpo,
    headers: { "x-hub-signature-256": await firmarCuerpo(SECRETO, cuerpo) },
  });
}

describe("webhook de WhatsApp: las salidas de error", () => {
  beforeEach(() => {
    vi.stubEnv("WHATSAPP_APP_SECRET", SECRETO);
    cliente = null;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sin secreto de la app responde 503 y no lee nada", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    expect((await POST(await firmada(conCodigo))).status).toBe(503);
  });

  it("un content-length grande responde 413", async () => {
    const req = new NextRequest(URL_WEBHOOK, {
      method: "POST",
      body: "{}",
      headers: { "content-length": String(1024 * 1024) },
    });
    expect((await POST(req)).status).toBe(413);
  });

  it("un cuerpo por partes, sin content-length, se corta en el tope (413)", async () => {
    const trozo = new TextEncoder().encode("x".repeat(64 * 1024));
    let enviados = 0;
    const flujo = new ReadableStream<Uint8Array>({
      pull(c) {
        // 5 trozos de 64 KB = 320 KB > 256 KB; si se leyera todo, el lector pediría los 5.
        if (enviados++ < 5) c.enqueue(trozo);
        else c.close();
      },
    });
    const req = new NextRequest(URL_WEBHOOK, {
      method: "POST",
      body: flujo,
      // @ts-expect-error -- `duplex` es obligatorio en Node para un cuerpo en flujo y aún no está en los tipos de RequestInit.
      duplex: "half",
    });
    expect((await POST(req)).status).toBe(413);
    expect(enviados).toBeLessThanOrEqual(5);
  });

  it("firma inválida responde 401", async () => {
    const req = new NextRequest(URL_WEBHOOK, {
      method: "POST",
      body: conCodigo,
      headers: { "x-hub-signature-256": "sha256=" + "0".repeat(64) },
    });
    expect((await POST(req)).status).toBe(401);
  });

  it("con un código y sin llave del servidor responde 503", async () => {
    expect((await POST(await firmada(conCodigo))).status).toBe(503);
  });

  it("si el canje falla en la base responde 500 (Meta reintenta)", async () => {
    cliente = {
      rpc: async () => ({ data: null, error: { code: "XX000" } }),
    };
    expect((await POST(await firmada(conCodigo))).status).toBe(500);
  });

  it("un canje que pasa responde 200", async () => {
    cliente = { rpc: async () => ({ data: "ok", error: null }) };
    expect((await POST(await firmada(conCodigo))).status).toBe(200);
  });
});
