import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import Wizard from "@/components/publicar/Wizard";

export const metadata: Metadata = {
  title: "Publica tu inmueble — Innmobiliaria",
  description:
    "Registra tu inmueble como fundador en menos de tres minutos. Sin fotos ni documentos.",
};

export default async function Publicar({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <Wizard lang={lang} />
    </>
  );
}
