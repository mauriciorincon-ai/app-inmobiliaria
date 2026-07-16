import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

const URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente con sesión (cookies) para Server Components / guards: lee la sesión del operador.
export async function crearClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient<Database>(URL(), ANON(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // En un Server Component (sin respuesta mutable) `set` puede lanzar: es seguro ignorarlo.
        }
      },
    },
  });
}

// Cliente ANÓNIMO sin sesión, para el endpoint público de registro (solo ejecuta la RPC, que está
// otorgada a anon). El cliente se crea de forma perezosa → no se instancia en build/prerender.
export function crearClienteAnon() {
  return createClient<Database>(URL(), ANON(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
