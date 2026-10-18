import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { idiomaDeLaRaiz } from "@/i18n/raiz";
import { enIdioma } from "@/i18n/textos";
import { OPERADOR } from "@/textos/operador";

// Estado de carga del panel (Suspense fallback mientras el server component consulta la BD).
// Next no le pasa `params`: el idioma sale del segmento raíz.
export default async function Cargando() {
  const lang = await idiomaDeLaRaiz();
  const t = enIdioma(OPERADOR.cargando, lang);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {t.titulo}
        </h1>
        <div className="mt-8 space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-cream" />
          ))}
        </div>
        <p className="sr-only" role="status">
          {t.estado}
        </p>
      </main>
    </>
  );
}
