import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Cliente con la LLAVE DEL SERVIDOR (service_role): se salta la RLS. SOLO lo importan los módulos de
// la lista cerrada de `tests/unit/servicio-aislado.test.ts` (ADR 015 y 016): el webhook de WhatsApp, el
// adaptador de identidad, los avisos de la visita y el trabajo diario; el test falla si otro archivo lo importa. La llave es un secreto del
// Worker (`wrangler secret put SUPABASE_SERVICE_ROLE_KEY`), jamás una `NEXT_PUBLIC_*`. Sin ella, null.
export function crearClienteServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) return null;
  return createClient<Database>(url, llave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
