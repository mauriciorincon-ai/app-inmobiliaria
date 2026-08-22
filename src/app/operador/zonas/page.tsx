import { redirect } from "next/navigation";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import CerrarSesion from "@/components/operador/CerrarSesion";
import PanelNav from "@/components/operador/PanelNav";
import FijarCupo from "@/components/operador/FijarCupo";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cuposRestantes } from "@/engine/cupos/cupos";
import type { ZonaPanel, DensidadFila } from "@/lib/supabase/types";

// Panel protegido (sesión + allowlist) → render dinámico.
export const dynamic = "force-dynamic";

const RANGO_LABEL: Record<DensidadFila["rango"], string> = {
  "menos-200M": "< $200M",
  "200M-400M": "$200M–$400M",
  "mas-400M": "> $400M",
};

export default async function ZonasPage() {
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
      <EncabezadoInterior />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Zonas y cupos
          </h1>
          <CerrarSesion />
        </div>
        <PanelNav actual="/operador/zonas" />

        <p className="mt-6 text-sm text-mute">
          Fija el cupo de fundador por localidad. Deja el campo vacío para que
          esa zona <strong>no muestre contador</strong> (escasez real o no
          existe). El contador público siempre se calcula desde la BD.
        </p>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-purple-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-cream text-xs uppercase tracking-wide text-mute">
              <tr>
                <th className="px-4 py-3 font-semibold">Localidad</th>
                <th className="px-4 py-3 font-semibold">Publicados</th>
                <th className="px-4 py-3 font-semibold">Cupo</th>
                <th className="px-4 py-3 font-semibold">Restantes</th>
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
                      <FijarCupo zonaId={z.id} cupoActual={z.cupo_total} />
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
          Densidad por búsqueda típica
        </h2>
        <p className="mt-1 text-sm text-mute">
          Inmuebles vigentes por localidad × tipo × rango de precio. Se mide
          desde ya; el umbral para abrir a compradores se decide en fase 2.
        </p>
        {densidad.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-cream px-5 py-6 text-sm text-gray">
            Aún no hay inmuebles con localidad para medir densidad.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-purple-200">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-cream text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th className="px-4 py-3 font-semibold">Localidad</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Rango</th>
                  <th className="px-4 py-3 font-semibold">Inmuebles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-200">
                {densidad.map((d, i) => (
                  <tr key={`${d.zona}-${d.tipo}-${d.rango}-${i}`}>
                    <td className="px-4 py-3 text-ink">{d.zona}</td>
                    <td className="px-4 py-3 capitalize text-gray">{d.tipo}</td>
                    <td className="px-4 py-3 text-gray">
                      {RANGO_LABEL[d.rango]}
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
