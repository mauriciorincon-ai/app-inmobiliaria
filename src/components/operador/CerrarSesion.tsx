"use client";

import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function CerrarSesion() {
  const router = useRouter();
  async function salir() {
    await crearClienteNavegador().auth.signOut();
    router.push("/operador/login");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={salir}
      className="text-sm font-semibold text-gray underline-offset-4 hover:underline"
    >
      Cerrar sesión
    </button>
  );
}
