// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hashIp } from "@/lib/ip-hash";

// S16 (deuda del S7): sin pepper, el hash de una IPv4 se revierte por fuerza bruta. En producción, mejor fallar.
const req = () =>
  new NextRequest("http://localhost/x", {
    headers: { "cf-connecting-ip": "203.0.113.7" },
  });

describe("hashIp", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("en producción sin pepper falla en vez de guardar un hash reversible", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_PEPPER", "");
    await expect(hashIp(req())).rejects.toThrow("RATE_LIMIT_PEPPER");
  });

  it("con pepper, el mismo IP da el mismo hash y otro pepper da otro", async () => {
    vi.stubEnv("RATE_LIMIT_PEPPER", "uno");
    const a = await hashIp(req());
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashIp(req())).toBe(a);
    vi.stubEnv("RATE_LIMIT_PEPPER", "dos");
    expect(await hashIp(req())).not.toBe(a);
  });
});
