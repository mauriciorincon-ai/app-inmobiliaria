import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_COMPRADOR,
  esSesionValida,
  hashSesion,
} from "@/engine/verificacion/sesion";
import { crearClienteAnon } from "@/lib/supabase/server";
import { reportError } from "@/lib/observability";

// Estado de la verificación de ESTE navegador (S7): la página lo consulta cada pocos segundos mientras
// espera el mensaje. Sin datos personales: `sin_codigo | esperando | verificado | vencido | otro_numero`.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIN_CACHE = { "cache-control": "no-store" };

export async function GET(req: NextRequest) {
  const sesion = req.cookies.get(COOKIE_COMPRADOR)?.value;
  if (!esSesionValida(sesion)) {
    return NextResponse.json({ estado: "sin_codigo" }, { headers: SIN_CACHE });
  }
  const { data, error } = await crearClienteAnon().rpc("estado_verificacion", {
    p_sesion_hash: await hashSesion(sesion),
  });
  if (error || !data) {
    reportError("verificacion_estado_error", { code: error?.code ?? "vacio" });
    return NextResponse.json(
      { error: "servidor" },
      { status: 500, headers: SIN_CACHE },
    );
  }
  return NextResponse.json(data, { headers: SIN_CACHE });
}
