"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import Campo from "@/components/ui/Campo";
import Boton from "@/components/ui/Boton";
import { crearClienteNavegador } from "@/lib/supabase/client";

// Login del operador (email + password). Signups están deshabilitados: solo existe el operador
// sembrado. El acceso al panel además se filtra por allowlist de email en el servidor.
export default function Login() {
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
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }
    router.push("/operador");
    router.refresh();
  }

  return (
    <>
      <EncabezadoInterior />
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Panel del operador
        </h1>
        <p className="mt-2 text-sm text-gray">
          Acceso solo para el equipo de Innmobiliaria.
        </p>

        <form onSubmit={entrar} className="mt-8 space-y-5">
          <Campo
            id="email"
            type="email"
            label="Correo"
            requerido
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="operador@innmobiliaria.co"
          />
          <Campo
            id="password"
            type="password"
            label="Contraseña"
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
            {cargando ? "Entrando…" : "Entrar"}
          </Boton>
        </form>
      </main>
    </>
  );
}
