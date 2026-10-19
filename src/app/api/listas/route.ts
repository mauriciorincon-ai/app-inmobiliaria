import type { NextRequest } from "next/server";
import { z } from "zod";
import { respuestaDeErrorGuardar } from "@/engine/alertas/errores";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { cuerpoJson, json, responderError, sesionDe } from "@/lib/visitas-http";

// Listas compartidas con notas (S9, ADR 017). Una sola ruta, la acción va en el cuerpo. Todo lo de la dueña
// exige la sesión verificada (la cookie httpOnly; sin ella la base responde «no verificado»). «Ver» sirve
// sin sesión con el token del enlace (`/lista#t=…`, el token viaja en el cuerpo, jamás en la URL); escribir
// una nota exige el WhatsApp verificado también a quien llega por el enlace. Compartir devuelve el token UNA
// vez y deja sin efecto el enlace anterior. Innmobiliaria no envía nada: el enlace lo comparte la persona.
export const runtime = "nodejs";

const ID = z.string().uuid();
const SLUG = z.string().regex(/^[a-z0-9-]{3,120}$/);
const NOMBRE = z.string().trim().min(1).max(60);
const TOKEN = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

const cuerpoSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("mias") }),
  z.object({ accion: z.literal("crear"), nombre: NOMBRE }),
  z.object({ accion: z.literal("renombrar"), lista: ID, nombre: NOMBRE }),
  z.object({ accion: z.literal("borrar"), lista: ID }),
  z.object({ accion: z.literal("agregar"), lista: ID, slug: SLUG }),
  z.object({ accion: z.literal("quitar"), lista: ID, slug: SLUG }),
  z.object({ accion: z.literal("compartir"), lista: ID }),
  z.object({ accion: z.literal("revocar"), lista: ID }),
  z.object({
    accion: z.literal("ver"),
    token: TOKEN.optional(),
    lista: ID.optional(),
  }),
  z.object({
    accion: z.literal("nota"),
    token: TOKEN.optional(),
    lista: ID.optional(),
    slug: SLUG,
    texto: z.string().max(280),
  }),
  z.object({ accion: z.literal("borrar_nota"), nota: ID }),
]);

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/listas" });

  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const b = leido.data;
  const sesion = await sesionDe(req);
  const supabase = crearClienteAnon();
  const fallo = (error: { code?: string | null; message?: string | null }) =>
    responderError(
      error,
      log,
      { requestId, evento: `lista_${b.accion}_error` },
      respuestaDeErrorGuardar,
    );

  // Sin sesión, nada de lo que es de la dueña (la base diría lo mismo; así no se le pregunta).
  if (!sesion && b.accion !== "ver") {
    return json(403, { error: "no_verificado" });
  }
  const s = sesion ?? "";

  switch (b.accion) {
    case "mias": {
      const { data, error } = await supabase.rpc("mis_listas", {
        p_sesion_hash: s,
      });
      return error ? fallo(error) : json(200, { listas: data ?? [] });
    }
    case "crear": {
      const { data, error } = await supabase.rpc("crear_lista", {
        p_sesion_hash: s,
        p_nombre: b.nombre,
      });
      return error ? fallo(error) : json(200, { lista: data });
    }
    case "renombrar": {
      const { error } = await supabase.rpc("renombrar_lista", {
        p_sesion_hash: s,
        p_lista: b.lista,
        p_nombre: b.nombre,
      });
      return error ? fallo(error) : json(200, { ok: true });
    }
    case "borrar": {
      const { error } = await supabase.rpc("borrar_lista", {
        p_sesion_hash: s,
        p_lista: b.lista,
      });
      return error ? fallo(error) : json(200, { ok: true });
    }
    case "agregar": {
      const { error } = await supabase.rpc("agregar_a_lista", {
        p_sesion_hash: s,
        p_lista: b.lista,
        p_slug: b.slug,
      });
      return error ? fallo(error) : json(200, { ok: true });
    }
    case "quitar": {
      const { error } = await supabase.rpc("quitar_de_lista", {
        p_sesion_hash: s,
        p_lista: b.lista,
        p_slug: b.slug,
      });
      return error ? fallo(error) : json(200, { ok: true });
    }
    case "compartir": {
      const { data, error } = await supabase.rpc("compartir_lista", {
        p_sesion_hash: s,
        p_lista: b.lista,
      });
      if (error || !data) return fallo(error ?? {});
      log.info({ evento: "lista_compartida" }, "ok");
      return json(200, { token: data });
    }
    case "revocar": {
      const { error } = await supabase.rpc("revocar_lista", {
        p_sesion_hash: s,
        p_lista: b.lista,
      });
      return error ? fallo(error) : json(200, { ok: true });
    }
    case "ver": {
      if (!b.token && !b.lista) return json(400, { error: "validacion" });
      const { data, error } = await supabase.rpc("obtener_lista", {
        p_sesion_hash: sesion,
        p_token: b.token ?? null,
        p_lista: b.token ? null : (b.lista ?? null),
      });
      return error || !data ? fallo(error ?? {}) : json(200, { lista: data });
    }
    case "nota": {
      if (!b.token && !b.lista) return json(400, { error: "validacion" });
      const { data, error } = await supabase.rpc("escribir_nota", {
        p_sesion_hash: s,
        p_lista: b.token ? null : (b.lista ?? null),
        p_token: b.token ?? null,
        p_slug: b.slug,
        p_texto: b.texto,
      });
      return error ? fallo(error) : json(200, { nota: data });
    }
    case "borrar_nota": {
      const { error } = await supabase.rpc("borrar_nota", {
        p_sesion_hash: s,
        p_nota: b.nota,
      });
      return error ? fallo(error) : json(200, { ok: true });
    }
  }
}
