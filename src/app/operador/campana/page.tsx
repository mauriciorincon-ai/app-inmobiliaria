import { redirect } from "next/navigation";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import CerrarSesion from "@/components/operador/CerrarSesion";
import PanelNav from "@/components/operador/PanelNav";
import EnviarLote from "@/components/operador/EnviarLote";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { EnvioRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

type FilaInmueble = {
  nivel_verificacion: string;
  fotos: { count: number }[] | null;
};

export default async function CampanaPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const permitido =
    !!user?.email &&
    !!process.env.OPERADOR_EMAIL &&
    user.email.toLowerCase() === process.env.OPERADOR_EMAIL.toLowerCase();
  if (!permitido) redirect("/operador/login");

  // Embudo real (todo desde BD): publicados → con fotos → verificados.
  const { data: inmRaw } = await supabase
    .from("inmuebles")
    .select("nivel_verificacion, fotos(count)");
  const inmuebles = (inmRaw ?? []) as unknown as FilaInmueble[];
  const publicados = inmuebles.length;
  const conFotos = inmuebles.filter(
    (i) => (i.fotos?.[0]?.count ?? 0) > 0,
  ).length;
  const verificados = inmuebles.filter(
    (i) => i.nivel_verificacion === "verificado",
  ).length;

  const { data: enviosRaw } = await supabase
    .from("envios")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  const envios = (enviosRaw ?? []) as EnvioRow[];

  const embudo = [
    { etiqueta: "Publicados", valor: publicados },
    { etiqueta: "Con fotos", valor: conFotos },
    { etiqueta: "Verificados ⭐", valor: verificados },
  ];

  const urlApp = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <>
      <EncabezadoInterior />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Campaña
          </h1>
          <CerrarSesion />
        </div>
        <PanelNav actual="/operador/campana" />

        {/* Embudo */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {embudo.map((e) => (
            <div
              key={e.etiqueta}
              className="rounded-2xl bg-cream px-4 py-5 text-center"
            >
              <p className="text-3xl font-extrabold text-purple-600">
                {e.valor}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-mute">
                {e.etiqueta}
              </p>
            </div>
          ))}
        </div>

        <EnviarLote urlApp={urlApp} />

        {/* Log de envíos */}
        <h2 className="mt-10 text-xl font-bold text-ink">Envíos recientes</h2>
        {envios.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-cream px-5 py-6 text-sm text-gray">
            Aún no has enviado lotes.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-purple-200">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-cream text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Plantilla</th>
                  <th className="px-4 py-3 font-semibold">Destinatarios</th>
                  <th className="px-4 py-3 font-semibold">Enviados</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-200">
                {envios.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-mute">
                      {fecha(e.created_at)}
                    </td>
                    <td className="px-4 py-3 text-ink">{e.plantilla}</td>
                    <td className="px-4 py-3 text-mute">{e.destinatarios}</td>
                    <td className="px-4 py-3 font-semibold text-purple-600">
                      {e.enviados}
                    </td>
                    <td className="px-4 py-3 text-mute">{e.estado}</td>
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
