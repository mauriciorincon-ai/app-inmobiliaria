import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";
import { PRECIO } from "@/textos/precio";
import { PUBLICAR } from "@/textos/publicar";
import Wizard from "@/components/publicar/Wizard";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const t = enIdioma(PUBLICAR.meta, lang);
  return { title: t.titulo, description: t.descripcion };
}

export default async function Publicar({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const { progreso, paso1, paso2, paso3, botones, honeypot, envio, errores } =
    enIdioma(PUBLICAR, lang);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <Wizard
        lang={lang}
        t={{ progreso, paso1, paso2, paso3, botones, honeypot, envio, errores }}
        dominio={enIdioma(COMUN.dominio, lang)}
        precio={{
          dueno: enIdioma(PRECIO.dueno, lang),
          fuente: enIdioma(PRECIO.fuente, lang),
        }}
      />
    </>
  );
}
