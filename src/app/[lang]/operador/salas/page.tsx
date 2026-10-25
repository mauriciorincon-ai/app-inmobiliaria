import { redirect } from "next/navigation";
import CerrarSesion from "@/components/operador/CerrarSesion";
import PanelNav from "@/components/operador/PanelNav";
import SalasCola from "@/components/operador/SalasCola";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { esOperador } from "@/engine/operador/allowlist";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { SolicitudSala } from "@/lib/supabase/types";
import { OPERADOR } from "@/textos/operador";

// La cola de visitas a salas de ventas (S13). Panel protegido (sesión + allowlist) → render dinámico. Mientras la constructora
// no esté en la plataforma, el equipo coordina; el contacto de cada sala lo escribe el operador aquí y no existe en ningún otro
// sitio (ni en el repo, ni en una RPC pública).
export const dynamic = "force-dynamic";

export default async function SalasPage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(OPERADOR, lang);
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!esOperador(user?.email, process.env.OPERADOR_EMAIL)) {
    redirect("/operador/login");
  }

  const { data, error } = await supabase.rpc("salas_panel");
  const filas = (data ?? []) as SolicitudSala[];

  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {t.salas.titulo}
          </h1>
          <CerrarSesion etiqueta={t.cerrarSesion} />
        </div>
        <PanelNav actual="/operador/salas" t={t.nav} />
        <p className="mt-6 text-sm text-mute">{t.salas.intro}</p>

        {error ? (
          <p
            role="alert"
            className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
          >
            {t.salas.error}
          </p>
        ) : filas.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-cream px-5 py-6 text-sm text-gray">
            {t.salas.vacio}
          </p>
        ) : (
          <SalasCola filas={filas} lang={lang} />
        )}
      </main>
    </>
  );
}
