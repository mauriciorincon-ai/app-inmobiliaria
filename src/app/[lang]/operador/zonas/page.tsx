import { redirect } from "next/navigation";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";
import { OPERADOR } from "@/textos/operador";
import CerrarSesion from "@/components/operador/CerrarSesion";
import PanelNav from "@/components/operador/PanelNav";
import FijarCupo from "@/components/operador/FijarCupo";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cuposRestantes } from "@/engine/cupos/cupos";
import type { ZonaPanel, DensidadFila } from "@/lib/supabase/types";

// Panel protegido (sesión + allowlist) → render dinámico.
export const dynamic = "force-dynamic";

export default async function ZonasPage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(OPERADOR, lang);
  const tipos: Record<string, string> = enIdioma(COMUN.dominio.tipo, lang);
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const permitido =
    !!user?.email &&
    !!process.env.OPERADOR_EMAIL &&
    user.email.toLowerCase() === process.env.OPERADOR_EMAIL.toLowerCase();
  if (!permitido) redirect("/operador/login");

  const { data: zonasRaw } = await supabase.rpc("obtener_zonas_panel");
  const { data: densidadRaw } = await supabase.rpc("obtener_densidad");
  const zonas = (zonasRaw ?? []) as ZonaPanel[];
  const densidad = (densidadRaw ?? []) as DensidadFila[];

  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {t.zonas.titulo}
          </h1>
          <CerrarSesion etiqueta={t.cerrarSesion} />
        </div>
        <PanelNav actual="/operador/zonas" t={t.nav} />

        <p className="mt-6 text-sm text-mute">
          {t.zonas.intro.antes}
          <strong>{t.zonas.intro.resaltado}</strong>
          {t.zonas.intro.despues}
        </p>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-purple-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-cream text-xs uppercase tracking-wide text-mute">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  {t.zonas.tabla.localidad}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t.zonas.tabla.publicados}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t.zonas.tabla.cupo}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t.zonas.tabla.restantes}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-200">
              {zonas.map((z) => {
                const rest = cuposRestantes(z.cupo_total, z.publicados);
                return (
                  <tr key={z.id}>
                    <td className="px-4 py-3 font-medium text-ink">
                      {z.nombre}
                    </td>
                    <td className="px-4 py-3 text-mute">{z.publicados}</td>
                    <td className="px-4 py-3">
                      <FijarCupo
                        t={t.zonas.fijarCupo}
                        zonaId={z.id}
                        cupoActual={z.cupo_total}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-purple-600">
                      {rest === null ? "—" : rest}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 text-xl font-bold text-ink">
          {t.zonas.densidad.titulo}
        </h2>
        <p className="mt-1 text-sm text-mute">{t.zonas.densidad.detalle}</p>
        {densidad.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-cream px-5 py-6 text-sm text-gray">
            {t.zonas.densidad.vacio}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-purple-200">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-cream text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    {t.zonas.densidad.tabla.localidad}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t.zonas.densidad.tabla.tipo}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t.zonas.densidad.tabla.rango}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t.zonas.densidad.tabla.inmuebles}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-200">
                {densidad.map((d, i) => (
                  <tr key={`${d.zona}-${d.tipo}-${d.rango}-${i}`}>
                    <td className="px-4 py-3 text-ink">{d.zona}</td>
                    <td className="px-4 py-3 text-gray">
                      {tipos[d.tipo] ?? d.tipo}
                    </td>
                    <td className="px-4 py-3 text-gray">
                      {t.zonas.densidad.rangos[d.rango]}
                    </td>
                    <td className="px-4 py-3 font-semibold text-purple-600">
                      {d.n}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
