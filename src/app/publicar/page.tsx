import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import Wizard from "@/components/publicar/Wizard";

export const metadata: Metadata = {
  title: "Publica tu inmueble — Innmobiliaria",
  description:
    "Registra tu inmueble como fundador en menos de tres minutos. Sin fotos ni documentos.",
};

export default function Publicar() {
  return (
    <>
      <EncabezadoInterior />
      <Wizard />
    </>
  );
}
