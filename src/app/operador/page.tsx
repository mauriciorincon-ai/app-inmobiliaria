import Link from "next/link";
import { redirect } from "next/navigation";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import CerrarSesion from "@/components/operador/CerrarSesion";
import MarcarVerificado from "@/components/operador/MarcarVerificado";
import BotonReContacto from "@/components/operador/BotonReContacto";
import SelloNivel from "@/components/ficha/SelloNivel";
import { crearClienteServidor } from "@/lib/supabase/server";
import { formatearCOP } from "@/engine/format/cop";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/observability";
import type { NivelVerificacion } from "@/lib/supabase/types";

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
  slug: string;
  nivel_verificacion: NivelVerificacion;
  created_at: string;
  vendedor: Vendedor | null;
  n_fotos: number;
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const FILTROS = [
  { clave: "todos", etiqueta: "Todos" },
  { clave: "por-verificar", etiqueta: "Por verificar" },
  { clave: "verificados", etiqueta: "Verificados" },
] as const;

export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver } = await searchParams;
  const filtro = FILTROS.some((f) => f.clave === ver) ? ver : "todos";

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

  let consulta = supabase
    .from("inmuebles")
    .select(
      // Hint de FK explícito + conteo de fotos embebido.
      "id,operacion,tipo,barrio,area_m2,habitaciones,precio_esperado,slug,nivel_verificacion,created_at,vendedor:vendedores!inmuebles_vendedor_id_fkey(nombre,whatsapp,email,ciudad,zona),fotos(count)",
    )
    .order("created_at", { ascending: false });
  if (filtro === "por-verificar")
    consulta = consulta.eq("nivel_verificacion", "fundador");
  if (filtro === "verificados")
    consulta = consulta.eq("nivel_verificacion", "verificado");

  const { data, error } = await consulta;

  if (error) {
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

  type Cruda = Omit<Fila, "vendedor" | "n_fotos"> & {
    vendedor: Vendedor | Vendedor[] | null;
    fotos: { count: number }[] | null;
  };
  const filas: Fila[] = ((data ?? []) as unknown as Cruda[]).map((r) => ({
    ...r,
    vendedor: Array.isArray(r.vendedor) ? (r.vendedor[0] ?? null) : r.vendedor,
    n_fotos: r.fotos?.[0]?.count ?? 0,
  }));

  return (
    <>
      <EncabezadoInterior />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">
              Registros
            </h1>
            <p className="mt-1 text-sm text-mute">
              {filas.length} {filas.length === 1 ? "inmueble" : "inmuebles"} en
              esta vista
            </p>
          </div>
          <CerrarSesion />
        </div>

        {/* Cola de verificación: filtros por nivel. */}
        <nav className="mt-6 flex gap-2" aria-label="Filtrar registros">
          {FILTROS.map((f) => (
            <Link
              key={f.clave}
              href={
                f.clave === "todos" ? "/operador" : `/operador?ver=${f.clave}`
              }
              aria-current={filtro === f.clave ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                filtro === f.clave
                  ? "bg-purple text-white"
                  : "bg-purple-tint text-purple-600 hover:bg-purple-200"
              }`}
            >
              {f.etiqueta}
            </Link>
          ))}
        </nav>

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
            <p className="text-lg font-bold text-ink">
              No hay registros en esta vista
            </p>
            <p className="mt-2 text-sm text-gray">
              Cambia el filtro o espera a que un vendedor publique.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-purple-200">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-cream text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Contacto</th>
                  <th className="px-4 py-3 font-semibold">Inmueble</th>
                  <th className="px-4 py-3 font-semibold">Fotos</th>
                  <th className="px-4 py-3 font-semibold">Nivel</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
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
                        {f.barrio} · {formatearCOP(f.precio_esperado)}
                      </p>
                      <Link
                        href={`/i/${f.slug}`}
                        className="text-xs font-semibold text-purple-600 underline-offset-2 hover:underline"
                      >
                        Ver ficha →
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-mute">
                      {f.n_fotos}
                    </td>
                    <td className="px-4 py-3">
                      <SelloNivel nivel={f.nivel_verificacion} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        {f.nivel_verificacion === "fundador" && (
                          <MarcarVerificado inmuebleId={f.id} />
                        )}
                        <BotonReContacto
                          inmuebleId={f.id}
                          nombre={f.vendedor?.nombre ?? ""}
                          whatsapp={f.vendedor?.whatsapp ?? ""}
                        />
                      </div>
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
