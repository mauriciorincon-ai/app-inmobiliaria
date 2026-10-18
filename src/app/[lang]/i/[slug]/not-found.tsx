import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import Boton from "@/components/ui/Boton";
import { idiomaDeLaRaiz } from "@/i18n/raiz";
import { enIdioma } from "@/i18n/textos";
import { FICHA } from "@/textos/ficha";

// Ficha inexistente o vencida. Next no le pasa `params`: el idioma sale del segmento raíz.
export default async function FichaNoEncontrada() {
  const lang = await idiomaDeLaRaiz();
  const t = enIdioma(FICHA.noEncontrada, lang);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {t.titulo}
        </h1>
        <p className="mt-3 text-gray">{t.detalle}</p>
        <div className="mt-8">
          <Boton href="/">{t.inicio}</Boton>
        </div>
      </main>
    </>
  );
}
