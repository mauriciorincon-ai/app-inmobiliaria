"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Campo from "@/components/ui/Campo";
import Boton from "@/components/ui/Boton";
import type { Proyectado } from "@/i18n/textos";
import type { OPERADOR } from "@/textos/operador";
import { crearClienteNavegador } from "@/lib/supabase/client";

export type TextosLogin = Proyectado<typeof OPERADOR.login>;

// Ejemplo de formato, no es texto de la interfaz: no se traduce.
const EJEMPLO_CORREO = "operador@ejemplo.test";

// Formulario del login del operador (email + password). Signups están deshabilitados: solo existe
// el operador sembrado. El acceso al panel además se filtra por allowlist de email en el servidor.
// Cliente: recibe SOLO los textos de su idioma por props.
export default function FormLogin({ t }: { t: TextosLogin }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = crearClienteNavegador();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setError(t.errorCredenciales);
      setCargando(false);
      return;
    }
    router.push("/operador");
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="mt-8 space-y-5">
      <Campo
        id="email"
        type="email"
        label={t.correo}
        requerido
        value={email}
        onChange={setEmail}
        autoComplete="email"
        placeholder={EJEMPLO_CORREO}
      />
      <Campo
        id="password"
        type="password"
        label={t.contrasena}
        requerido
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}
      <Boton type="submit" disabled={cargando} className="w-full">
        {cargando ? t.entrando : t.entrar}
      </Boton>
    </form>
  );
}
