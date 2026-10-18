import type { NextRequest } from "next/server";
import { sha256Hex } from "@/engine/verificacion/hash";

// IP del cliente (Cloudflare o proxy) hasheada con pepper → minimización Ley 1581 (no guardamos IP cruda).
// La usan el registro del vendedor (S1) y la verificación del comprador (S7) para sus límites por IP.
export async function hashIp(req: NextRequest): Promise<string> {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconocida";
  return sha256Hex((process.env.RATE_LIMIT_PEPPER ?? "") + ip);
}
