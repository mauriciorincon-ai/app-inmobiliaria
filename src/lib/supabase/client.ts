import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

// Cliente Supabase para el NAVEGADOR (login del operador). Persiste la sesión en cookies vía
// @supabase/ssr, para que el servidor la lea en el guard del panel.
export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
