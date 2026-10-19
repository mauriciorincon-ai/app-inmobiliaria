// Llamadas del navegador a las rutas `/api` de guardar y avisar (S9). Siempre POST con cuerpo JSON (los tokens
// viajan en el cuerpo, jamás en la URL) y sin caché. Nunca lanza: una red caída es un fallo más, con código
// `servidor`, y la pantalla decide qué decir. El código de error es el de `engine/alertas/errores`.
export type RespuestaApi<T> =
  { ok: true; datos: T } | { ok: false; status: number; codigo: string };

export async function enviarJson<T>(
  ruta: string,
  cuerpo: unknown,
): Promise<RespuestaApi<T>> {
  try {
    const res = await fetch(ruta, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(cuerpo),
    });
    if (res.ok) return { ok: true, datos: (await res.json()) as T };
    const cuerpoError = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    return {
      ok: false,
      status: res.status,
      codigo: cuerpoError.error ?? "servidor",
    };
  } catch {
    return { ok: false, status: 0, codigo: "servidor" };
  }
}

/**
 * Una acción de una ruta que agrupa varias (`/api/listas`, `/api/alertas/gestion`): el nombre de la acción
 * va en el cuerpo junto al resto. Es una función aparte para que el nombre llegue como dato, no como texto
 * de la interfaz.
 */
export function enviarAccion<T>(
  ruta: string,
  accion: string,
  resto: Record<string, unknown> = {},
): Promise<RespuestaApi<T>> {
  return enviarJson<T>(ruta, { accion, ...resto });
}
