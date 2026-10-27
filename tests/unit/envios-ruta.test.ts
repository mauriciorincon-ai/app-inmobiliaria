// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// S16 (auditoría) — la campaña no pasa del cupo diario de correos que comparten visitas, alertas y campañas (ADR 017):
// el lote se corta a `correos_libres_hoy`, sin cupo no se llama a Brevo ni se registra un envío, y si el cupo no se puede
// leer no sale nada. La ruta real, con una base y un Brevo falsos. Datos 100 % sintéticos.

const llamadas: Array<{ fn: string; args: unknown }> = [];
let libres: unknown = 250;
let errorCupo: { code: string } | null = null;
const lote = Array.from({ length: 5 }, (_, i) => ({
  email: `vendedor${i}@ejemplo.test`,
  nombre: `Vendedor ${i}`,
  idioma: i % 2 === 0 ? "es" : "en",
}));
const enviarLote = vi.fn(async (...args: [unknown, unknown[], string]) => ({
  enviados: args[1].length,
  fallidos: 0,
  mock: true,
}));

vi.mock("@/lib/logger", () => {
  const log = {
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => log,
  };
  return { logger: log };
});
vi.mock("@/lib/observability", () => ({ reportError: () => {} }));
vi.mock("@/lib/brevo", () => ({
  brevoEnMock: () => true,
  enviarLote: (p: unknown, d: unknown[], u: string) => enviarLote(p, d, u),
}));
vi.mock("@/lib/supabase/server", () => ({
  crearClienteServidor: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { email: "operador@ejemplo.test" } },
      }),
    },
    rpc: async (fn: string, args: unknown) => {
      llamadas.push({ fn, args });
      if (fn === "obtener_lote") return { data: lote, error: null };
      if (fn === "correos_libres_hoy")
        return errorCupo
          ? { data: null, error: errorCupo }
          : { data: libres, error: null };
      return { data: null, error: null };
    },
  }),
}));

import { POST } from "@/app/api/envios/route";

function pedir() {
  return POST(
    new NextRequest("http://localhost/api/envios", {
      method: "POST",
      body: JSON.stringify({
        plantilla: "completa-anuncio",
        filtro: "sin-fotos",
      }),
      headers: { "content-type": "application/json" },
    }),
  );
}
const registros = () => llamadas.filter((l) => l.fn === "registrar_envio");

beforeEach(() => {
  process.env.OPERADOR_EMAIL = "operador@ejemplo.test";
  llamadas.length = 0;
  enviarLote.mockClear();
  libres = 250;
  errorCupo = null;
});
afterEach(() => {
  delete process.env.OPERADOR_EMAIL;
});

describe("POST /api/envios — el cupo diario compartido", () => {
  it("el lote se corta al cupo libre: manda solo esos y registra esa cifra", async () => {
    libres = 2;
    const r = await pedir();
    expect(r.status).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo).toMatchObject({
      total: 5,
      tanda: 2,
      enviados: 2,
      quedanHoy: 0,
    });
    expect(enviarLote.mock.calls[0][1]).toHaveLength(2);
    expect(registros()).toHaveLength(1);
    expect(registros()[0].args).toMatchObject({
      p_destinatarios: 2,
      p_enviados: 2,
    });
  });

  it("con cupo de sobra manda todo el lote", async () => {
    libres = 250;
    const cuerpo = await (await pedir()).json();
    expect(cuerpo).toMatchObject({
      total: 5,
      tanda: 5,
      enviados: 5,
      quedanHoy: 245,
    });
    expect(registros()[0].args).toMatchObject({ p_destinatarios: 5 });
  });

  it("sin cupo (0): responde 200 sin llamar a Brevo ni registrar un envío de cero", async () => {
    libres = 0;
    const r = await pedir();
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      ok: true,
      total: 5,
      tanda: 0,
      enviados: 0,
      quedanHoy: 0,
    });
    expect(enviarLote).not.toHaveBeenCalled();
    expect(registros()).toHaveLength(0);
  });

  it("si el cupo no se puede leer, no sale nada y responde 500", async () => {
    errorCupo = { code: "42501" };
    const r = await pedir();
    expect(r.status).toBe(500);
    expect(enviarLote).not.toHaveBeenCalled();
    expect(registros()).toHaveLength(0);
  });

  it("un cupo que no es número tampoco deja salir nada", async () => {
    libres = null;
    const r = await pedir();
    expect(r.status).toBe(500);
    expect(enviarLote).not.toHaveBeenCalled();
  });
});
