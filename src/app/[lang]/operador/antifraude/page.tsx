import { redirect } from "next/navigation";
import AntifraudeCola from "@/components/operador/AntifraudeCola";
import CerrarSesion from "@/components/operador/CerrarSesion";
import HuellarFotos from "@/components/operador/HuellarFotos";
import PanelNav from "@/components/operador/PanelNav";
import RevisarReglas from "@/components/operador/RevisarReglas";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { esOperador } from "@/engine/operador/allowlist";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { ANTIFRAUDE } from "@/textos/antifraude";
import { OPERADOR } from "@/textos/operador";

// La cola antifraude (S15, maqueta 12). Panel protegido (sesión + allowlist) → render dinámico. Las banderas y los reportes
// solo llegan aquí: ninguno cambia lo que ve el comprador hasta que el operador decide.
export const dynamic = "force-dynamic";

export default async function AntifraudeOperadorPage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(ANTIFRAUDE.cola, lang);
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!esOperador(user?.email, process.env.OPERADOR_EMAIL)) {
    redirect("/operador/login");
  }

  const [{ data, error }, { data: pendientes }] = await Promise.all([
    supabase.rpc("antifraude_cola"),
    supabase.rpc("fotos_sin_huella", { p_limite: 50 }),
  ]);
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
        <PanelNav actual="/operador/antifraude" t={enIdioma(OPERADOR.nav, lang)} />
        <p className="mt-6 text-sm text-mute">{t.intro}</p>

        <div className="mt-4 flex flex-wrap items-start gap-4">
          <RevisarReglas t={t} />
          <HuellarFotos pendientes={pendientes ?? []} t={t} />
        </div>

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
          <AntifraudeCola filas={filas} lang={lang} />
        )}
      </main>
    </>
  );
}
