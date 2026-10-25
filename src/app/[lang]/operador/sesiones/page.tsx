import { redirect } from "next/navigation";
import CerrarSesion from "@/components/operador/CerrarSesion";
import PanelNav from "@/components/operador/PanelNav";
import SesionesCola from "@/components/operador/SesionesCola";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { esOperador } from "@/engine/operador/allowlist";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { OPERADOR } from "@/textos/operador";

// Las sesiones de fotos que piden los dueños (S15, «fotos que venden»). Panel protegido (sesión + allowlist) → render dinámico.
export const dynamic = "force-dynamic";

export default async function SesionesOperadorPage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(OPERADOR.sesiones, lang);
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!esOperador(user?.email, process.env.OPERADOR_EMAIL)) {
    redirect("/operador/login");
  }

  const { data, error } = await supabase.rpc("sesiones_panel");
  const filas = data ?? [];

  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {t.titulo}
          </h1>
          <CerrarSesion etiqueta={enIdioma(OPERADOR.cerrarSesion, lang)} />
        </div>
        <PanelNav
          actual="/operador/sesiones"
          t={enIdioma(OPERADOR.nav, lang)}
        />
        <p className="mt-6 text-sm text-mute">{t.intro}</p>

        {error ? (
          <p
            role="alert"
            className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
          >
            {t.errores.servidor}
          </p>
        ) : filas.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-cream px-5 py-6 text-sm text-gray">
            {t.vacia}
          </p>
        ) : (
          <SesionesCola filas={filas} lang={lang} />
        )}
      </main>
    </>
  );
}
