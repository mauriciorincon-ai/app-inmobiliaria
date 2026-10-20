// @vitest-environment node
// El paso «tasa» del cron (S10, ADR 018): lee el conjunto abierto, valida y guarda; si algo falla, NUNCA lanza y dice qué
// pasó. Con fetch y cliente simulados: ninguna prueba sale a la red.
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  RESPUESTA_SIMULACRO,
  actualizarTasa,
  fetchDeTasa,
} from "@/lib/tasa-vivienda";
import { urlConsultaTasa } from "@/engine/simulador/tasa";

function cliente(error: unknown = null) {
  const rpc = vi.fn(async () => ({ data: null, error }));
  return { rpc };
}
const responde = (cuerpo: unknown, status = 200) =>
  vi.fn(async () =>
    typeof cuerpo === "string"
      ? new Response(cuerpo, { status })
      : Response.json(cuerpo, { status }),
  );

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("actualizarTasa", () => {
  it("con datos válidos guarda la tasa con su fecha por la RPC del servidor", async () => {
    const c = cliente();
    const f = responde(RESPUESTA_SIMULACRO);
    expect(await actualizarTasa(c, f as unknown as typeof fetch)).toBe(
      "guardada",
    );
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(urlConsultaTasa());
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(c.rpc).toHaveBeenCalledWith("guardar_tasa_vivienda", {
      p_fecha_corte: "2026-10-09",
      p_tasa_ea: 15.48,
      p_creditos: 686,
      p_entidades: 13,
      p_fuente: "superfinanciera:qzsc-9esp",
    });
  });

  it("si el conjunto no responde (red caída, 503 o cuerpo no JSON): fallo_red y no toca la base", async () => {
    for (const f of [
      vi.fn(async () => {
        throw new Error("timeout");
      }),
      responde("no disponible", 503),
      responde("<html>", 200),
    ]) {
      const c = cliente();
      expect(await actualizarTasa(c, f as unknown as typeof fetch)).toBe(
        "fallo_red",
      );
      expect(c.rpc).not.toHaveBeenCalled();
    }
  });

  it("si la respuesta no trae una fila usable: sin_datos y no toca la base", async () => {
    const c = cliente();
    expect(
      await actualizarTasa(c, responde([]) as unknown as typeof fetch),
    ).toBe("sin_datos");
    expect(c.rpc).not.toHaveBeenCalled();
  });

  it("si la base rechaza la escritura: fallo_base (sin lanzar)", async () => {
    const c = cliente({ code: "P0001", message: "fecha_invalida" });
    expect(
      await actualizarTasa(
        c,
        responde(RESPUESTA_SIMULACRO) as unknown as typeof fetch,
      ),
    ).toBe("fallo_base");
  });
});

describe("actualizarTasa: la RPC que rechaza la promesa", () => {
  it("se vuelve fallo_base y no lanza (la corrida del cron sigue)", async () => {
    const c = {
      rpc: vi.fn(async () => {
        throw new Error("red caída");
      }),
    };
    expect(
      await actualizarTasa(
        c as never,
        responde(RESPUESTA_SIMULACRO) as unknown as typeof fetch,
      ),
    ).toBe("fallo_base");
  });
});

describe("fetchDeTasa (el simulacro solo con TASA_SIMULACRO=1)", () => {
  it("sin la variable usa el fetch real, aunque llegue la cabecera de prueba", () => {
    vi.stubEnv("TASA_SIMULACRO", "");
    expect(fetchDeTasa("fallo")).toBe(fetch);
  });

  it("con la variable responde la fila fija, o un 503 si la prueba pide «fallo»", async () => {
    vi.stubEnv("TASA_SIMULACRO", "1");
    const ok = await fetchDeTasa(null)(urlConsultaTasa());
    expect(await ok.json()).toEqual(RESPUESTA_SIMULACRO);
    const caido = await fetchDeTasa("fallo")(urlConsultaTasa());
    expect(caido.status).toBe(503);
  });
});
