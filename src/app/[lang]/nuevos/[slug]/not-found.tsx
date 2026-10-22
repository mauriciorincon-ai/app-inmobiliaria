import Boton from "@/components/ui/Boton";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { idiomaDeLaRaiz } from "@/i18n/raiz";
import { enIdioma } from "@/i18n/textos";
import { VIVIENDA_NUEVA } from "@/textos/vivienda-nueva";

// Proyecto inexistente o fuera de la edición que se muestra. Next no le pasa `params`: el idioma sale del segmento raíz.
export default async function ProyectoNoEncontrado() {
  const lang = await idiomaDeLaRaiz();
  const t = enIdioma(VIVIENDA_NUEVA.noEncontrado, lang);
  return (
    <>
      <EncabezadoInterior lang={lang} seccion="buscar" />
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {t.titulo}
        </h1>
        <p className="mt-3 text-gray">{t.detalle}</p>
        <div className="mt-8">
          <Boton href="/buscar?v=nuevos">{t.volver}</Boton>
        </div>
      </main>
    </>
  );
}
