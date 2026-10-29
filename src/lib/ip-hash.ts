import type { NextRequest } from "next/server";
import { sha256Hex } from "@/engine/verificacion/hash";

// IP del cliente (Cloudflare o proxy) hasheada con pepper → minimización Ley 1581 (no guardamos IP cruda).
// La usan el registro del vendedor (S1) y la verificación del comprador (S7) para sus límites por IP.
export async function hashIp(req: NextRequest): Promise<string> {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconocida";
  const pepper = process.env.RATE_LIMIT_PEPPER ?? "";
  // Sin pepper, el hash de una IPv4 se revierte probando las 2³² posibles: en producción se falla en vez de guardar eso (deuda
  // del S7). La CI pone uno al azar; en desarrollo se tolera vacío.
  if (!pepper && process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_PEPPER no configurado");
  }
  return sha256Hex(pepper + ip);
}
