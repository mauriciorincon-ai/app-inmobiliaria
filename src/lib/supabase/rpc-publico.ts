// Llamada RAW a un RPC público de Supabase (PostgREST) con `fetch` nativo, SIN el cliente
// `@supabase/supabase-js`/`@supabase/ssr`. Motivo de peso (perf-budget): la landing es LCP-crítica
// y no debe arrastrar el cliente completo (~63 KB gz) solo para una lectura anónima como los cupos.
// USO EXCLUSIVO: RPCs anónimos de solo lectura (p. ej. `obtener_cupos`) — nada de sesión, cookies
// ni escritura pasa por aquí (eso sigue con `crearClienteNavegador`). Inerte sin env (devuelve null).
export async function rpcPublico<T>(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
