// El cliente de Supabase CON la sesión del operador, o null si quien llama no lo es. Para las rutas del panel (S13): la RPC
// corre como `authenticated` y, además, el servidor exige la allowlist antes de tocarla.
import { esOperador } from "@/engine/operador/allowlist";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function clienteDelOperador() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return esOperador(user?.email, process.env.OPERADOR_EMAIL) ? supabase : null;
}
