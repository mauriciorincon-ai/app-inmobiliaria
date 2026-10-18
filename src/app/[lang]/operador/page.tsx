import Link from "next/link";
import { redirect } from "next/navigation";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import CerrarSesion from "@/components/operador/CerrarSesion";
import MarcarVerificado from "@/components/operador/MarcarVerificado";
import BotonReContacto from "@/components/operador/BotonReContacto";
import PanelNav from "@/components/operador/PanelNav";
import SelloNivel from "@/components/ficha/SelloNivel";
import { localeIntl, NOMBRE_PROPIO, type Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";
import { FICHA } from "@/textos/ficha";
import { OPERADOR } from "@/textos/operador";
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
  // Idioma en que publicó: el de los avisos que se le mandan (S5).
  idioma: Idioma;
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

const fecha = (iso: string, idioma: Idioma) =>
  new Date(iso).toLocaleDateString(localeIntl(idioma), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// La clave va en la URL (?ver=…) y no cambia con el idioma; la etiqueta sale del diccionario.
const FILTROS = ["todos", "por-verificar", "verificados"] as const;

export default async function Panel({
  params,
  searchParams,
}: PropsLang & {
  searchParams: Promise<{ ver?: string }>;
}) {
  const lang = await leerIdioma(params);
  const { ver } = await searchParams;
  const t = enIdioma(OPERADOR, lang);
  const dominio = enIdioma(COMUN.dominio, lang);
  const operaciones: Record<string, string> = dominio.operacion;
  const tipos: Record<string, string> = dominio.tipo;
  const filtro = FILTROS.find((f) => f === ver) ?? "todos";
  const etiquetaFiltro = {
    todos: t.registros.filtros.todos,
    "por-verificar": t.registros.filtros.porVerificar,
    verificados: t.registros.filtros.verificados,
  } as const;

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
      "id,operacion,tipo,barrio,area_m2,habitaciones,precio_esperado,slug,nivel_verificacion,created_at,vendedor:vendedores!inmuebles_vendedor_id_fkey(nombre,whatsapp,email,ciudad,zona,idioma),fotos(count)",
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
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">
              {t.registros.titulo}
            </h1>
            <p className="mt-1 text-sm text-mute">
              {rellenar(
                filas.length === 1
                  ? t.registros.conteoUno
                  : t.registros.conteoVarios,
                { n: filas.length },
              )}
            </p>
          </div>
          <CerrarSesion etiqueta={t.cerrarSesion} />
        </div>

        <PanelNav actual="/operador" t={t.nav} />

        {/* Cola de verificación: filtros por nivel. */}
        <nav className="mt-4 flex gap-2" aria-label={t.registros.filtrar}>
          {FILTROS.map((f) => (
            <Link
              key={f}
              href={f === "todos" ? "/operador" : `/operador?ver=${f}`}
              aria-current={filtro === f ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                filtro === f
                  ? "bg-purple text-white"
                  : "bg-purple-tint text-purple-600 hover:bg-purple-200"
              }`}
            >
              {etiquetaFiltro[f]}
            </Link>
          ))}
        </nav>

        {error ? (
          <div
            role="alert"
            className="mt-10 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
          >
            {t.registros.error}
          </div>
        ) : filas.length === 0 ? (
          <div className="mt-10 rounded-[2rem] bg-cream px-6 py-16 text-center">
            <p className="text-lg font-bold text-ink">
              {t.registros.vacio.titulo}
            </p>
            <p className="mt-2 text-sm text-gray">
              {t.registros.vacio.detalle}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-purple-200">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-cream text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    {t.registros.tabla.fecha}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t.registros.tabla.contacto}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t.registros.tabla.inmueble}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t.registros.tabla.fotos}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t.registros.tabla.nivel}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t.registros.tabla.acciones}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-200">
                {filas.map((f) => (
                  <tr key={f.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-mute">
                      {fecha(f.created_at, lang)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">
                        {f.vendedor?.nombre ?? "—"}
                      </p>
                      <p className="text-mute">{f.vendedor?.whatsapp ?? "—"}</p>
                      {f.vendedor && (
                        <p
                          className="text-xs text-mute"
                          title={rellenar(t.registros.idiomaVendedor, {
                            idioma: NOMBRE_PROPIO[f.vendedor.idioma].completo,
                          })}
                        >
                          {NOMBRE_PROPIO[f.vendedor.idioma].corto}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray">
                      <p className="font-medium text-ink">
                        {operaciones[f.operacion] ?? f.operacion} ·{" "}
                        {tipos[f.tipo] ?? f.tipo}
                      </p>
                      <p className="text-mute">
                        {f.barrio} · {formatearCOP(f.precio_esperado, lang)}
                      </p>
                      <Link
                        href={`/i/${f.slug}`}
                        className="text-xs font-semibold text-purple-600 underline-offset-2 hover:underline"
                      >
                        {t.registros.verFicha}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-mute">
                      {f.n_fotos}
                    </td>
                    <td className="px-4 py-3">
                      <SelloNivel
                        nivel={f.nivel_verificacion}
                        t={enIdioma(FICHA.sello, lang)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        {f.nivel_verificacion === "fundador" && (
                          <MarcarVerificado
                            t={t.marcarVerificado}
                            inmuebleId={f.id}
                          />
                        )}
                        <BotonReContacto
                          t={t.reContacto}
                          idiomaVendedor={f.vendedor?.idioma ?? "es"}
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
