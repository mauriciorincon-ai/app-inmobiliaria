import { redirect } from "next/navigation";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import CerrarSesion from "@/components/operador/CerrarSesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { formatearCOP } from "@/engine/format/cop";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/observability";

// Panel protegido: usa la sesión (cookies) → render dinámico, nunca prerenderizado.
export const dynamic = "force-dynamic";

type Vendedor = {
  nombre: string;
  whatsapp: string;
  email: string | null;
  ciudad: string;
  zona: string | null;
};

type Fila = {
  id: string;
  operacion: string;
  tipo: string;
  barrio: string;
  area_m2: number;
  habitaciones: number;
  precio_esperado: number;
  estado: string;
  created_at: string;
  vendedor: Vendedor | null;
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default async function Panel() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allowlist por email (defensa en profundidad sobre RLS): aunque se habilitaran signups por error,
  // el panel solo lo abre el operador declarado en OPERADOR_EMAIL.
  const permitido =
    !!user?.email &&
    !!process.env.OPERADOR_EMAIL &&
    user.email.toLowerCase() === process.env.OPERADOR_EMAIL.toLowerCase();
  if (!permitido) redirect("/operador/login");

  const { data, error } = await supabase
    .from("inmuebles")
    .select(
      // Hint de FK explícito (!inmuebles_vendedor_id_fkey): el embed no depende de la detección
      // automática de la relación en el schema cache de PostgREST.
      "id,operacion,tipo,barrio,area_m2,habitaciones,precio_esperado,estado,created_at,vendedor:vendedores!inmuebles_vendedor_id_fkey(nombre,whatsapp,email,ciudad,zona)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    // El error va al log del servidor (metadatos, sin PII) y a Sentry; la UI muestra el estado de error.
    logger.error(
      {
        evento: "panel_query_error",
        code: error.code,
        message: error.message,
        details: error.details,
      },
      "fallo la consulta del panel",
    );
    reportError("panel_query_error", { code: error.code ?? "desconocido" });
  }

  type Cruda = Omit<Fila, "vendedor"> & {
    vendedor: Vendedor | Vendedor[] | null;
  };
  const filas: Fila[] = ((data ?? []) as unknown as Cruda[]).map((r) => ({
    ...r,
    vendedor: Array.isArray(r.vendedor) ? (r.vendedor[0] ?? null) : r.vendedor,
  }));

  return (
    <>
      <EncabezadoInterior />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">
              Registros
            </h1>
            <p className="mt-1 text-sm text-mute">
              {filas.length} {filas.length === 1 ? "inmueble" : "inmuebles"}{" "}
              publicados como fundador
            </p>
          </div>
          <CerrarSesion />
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-10 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
          >
            No pudimos cargar los registros. Recarga la página o inténtalo en un
            momento.
          </div>
        ) : filas.length === 0 ? (
          <div className="mt-10 rounded-[2rem] bg-cream px-6 py-16 text-center">
            <p className="text-lg font-bold text-ink">Aún no hay registros</p>
            <p className="mt-2 text-sm text-gray">
              Cuando un vendedor publique su inmueble, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-purple-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-cream text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Contacto</th>
                  <th className="px-4 py-3 font-semibold">Inmueble</th>
                  <th className="px-4 py-3 font-semibold">Precio</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-200">
                {filas.map((f) => (
                  <tr key={f.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-mute">
                      {fecha(f.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">
                        {f.vendedor?.nombre ?? "—"}
                      </p>
                      <p className="text-mute">{f.vendedor?.whatsapp ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray">
                      <p className="font-medium capitalize text-ink">
                        {f.operacion} · {f.tipo}
                      </p>
                      <p className="text-mute">
                        {f.barrio} · {f.area_m2} m² · {f.habitaciones} hab
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">
                      {formatearCOP(f.precio_esperado)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-purple-tint px-3 py-1 text-xs font-semibold text-purple-600">
                        {f.estado === "publicado_fundador"
                          ? "Fundador"
                          : f.estado}
                      </span>
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
