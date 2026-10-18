// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// S8 — la cédula, la fecha de expedición y el nombre NO quedan en ningún registro (ADR 016). Se corre la
// ruta real con el simulador y una base falsa, y se espían el logger y el reporte de errores: nada de lo
// que escribió el comprador aparece. Datos 100 % sintéticos.

const lineas: unknown[] = [];
const reportes: unknown[] = [];
const llamadas: Array<{ fn: string; args: unknown }> = [];
let reserva: unknown = { ok: true, consulta_id: "c-sintetica" };

vi.mock("@/lib/logger", () => {
  const log = {
    info: (o: unknown, m?: string) => lineas.push([o, m]),
    warn: (o: unknown, m?: string) => lineas.push([o, m]),
    error: (o: unknown, m?: string) => lineas.push([o, m]),
    child: () => log,
  };
  return { logger: log };
});
vi.mock("@/lib/observability", () => ({
  reportError: (k: string, meta: unknown) => reportes.push([k, meta]),
}));
vi.mock("@/lib/supabase/servicio", () => ({
  crearClienteServicio: () => ({
    rpc: async (fn: string, args: unknown) => {
      llamadas.push({ fn, args });
      if (fn === "reservar_consulta_identidad")
        return { data: reserva, error: null };
      return { data: null, error: null };
    },
  }),
}));

const CEDULA = "1000000001";
const FECHA = "2009-07-14";
const NOMBRE = "Laura Sintetica Prueba";
const SESION = "a".repeat(43);

function peticion(cuerpo: unknown) {
  return new NextRequest("http://localhost/api/identidad", {
    method: "POST",
    body: JSON.stringify(cuerpo),
    headers: {
      "content-type": "application/json",
      cookie: `inn_comprador=${SESION}`,
    },
  });
}

beforeEach(() => {
  lineas.length = 0;
  reportes.length = 0;
  llamadas.length = 0;
  reserva = { ok: true, consulta_id: "c-sintetica" };
  vi.stubEnv("IDENTIDAD_MOCK", "1");
});
afterEach(() => vi.unstubAllEnvs());

async function correr(cuerpo: unknown) {
  const { POST } = await import("@/app/api/identidad/route");
  const res = await POST(peticion(cuerpo));
  return { status: res.status, cuerpo: await res.json() };
}

const BIEN = {
  cedula: CEDULA,
  fechaExpedicion: FECHA,
  nombre: NOMBRE,
  consentimiento: true,
};

describe("POST /api/identidad", () => {
  it("identifica con el simulador y no deja la cédula, la fecha ni el nombre en ningún registro ni en la base", async () => {
    const r = await correr(BIEN);
    expect(r).toEqual({ status: 200, cuerpo: { resultado: "identificado" } });
    const visto = JSON.stringify([lineas, reportes, llamadas]);
    for (const dato of [CEDULA, FECHA, NOMBRE, "Sintetica"]) {
      expect(visto, dato).not.toContain(dato);
    }
    // A la base solo llegan la sesión (hash), los topes y el resultado.
    expect(llamadas.map((l) => l.fn)).toEqual([
      "reservar_consulta_identidad",
      "registrar_identificacion",
    ]);
    expect(llamadas[1].args).toEqual({
      p_consulta_id: "c-sintetica",
      p_resultado: "identificado",
      p_proveedor: "simulador",
    });
  });

  it("sin cupo no se llama al simulador ni se registra nada", async () => {
    reserva = { ok: false, motivo: "tope_dia" };
    expect(await correr(BIEN)).toEqual({
      status: 200,
      cuerpo: { resultado: "tope" },
    });
    expect(llamadas.map((l) => l.fn)).toEqual(["reservar_consulta_identidad"]);
  });

  it("datos inválidos: 400 con el campo, y el dato tampoco se registra", async () => {
    const r = await correr({ ...BIEN, fechaExpedicion: "2099-01-01" });
    expect(r).toEqual({
      status: 400,
      cuerpo: { error: "validacion", campo: "fechaExpedicion" },
    });
    expect(JSON.stringify(lineas)).not.toContain(CEDULA);
    expect(llamadas).toEqual([]);
  });

  it("sin la cookie del comprador: 403 sin tocar la base", async () => {
    const { POST } = await import("@/app/api/identidad/route");
    const res = await POST(
      new NextRequest("http://localhost/api/identidad", {
        method: "POST",
        body: JSON.stringify(BIEN),
      }),
    );
    expect(res.status).toBe(403);
    expect(llamadas).toEqual([]);
  });

  it("sin simulador y sin llave del proveedor: no disponible, sin reservar", async () => {
    vi.stubEnv("IDENTIDAD_MOCK", "");
    vi.stubEnv("DIDIT_API_KEY", "");
    expect(await correr(BIEN)).toEqual({
      status: 200,
      cuerpo: { resultado: "no_disponible" },
    });
    expect(llamadas).toEqual([]);
  });

  it("si la base falla al reservar: no disponible, y el reporte no lleva datos del comprador", async () => {
    reserva = null;
    expect(await correr(BIEN)).toEqual({
      status: 200,
      cuerpo: { resultado: "no_disponible" },
    });
    expect(JSON.stringify(reportes)).not.toContain(CEDULA);
    expect(reportes).toHaveLength(1);
  });
});
