"use client";

import { useRef, useState } from "react";
import { MAX_FOTOS, puedeAgregar } from "@/engine/fotos/gate";
import { subirFoto } from "@/lib/fotos-cliente";
import { leerDimensiones, type LeerDimensiones } from "@/lib/leer-dimensiones";
import ChecklistEspacios, {
  type TextosSubidor,
} from "@/components/mi-anuncio/ChecklistEspacios";
import { rellenar } from "@/i18n/textos";
import type { RazonSubida } from "@/lib/fotos-cliente";

// Las razones con frase propia; las demás fallos de la cadena (presign, subida, confirmación, red)
// comparten la de conexión.
type ErroresSubidor = TextosSubidor["errores"];
function fraseDeRazon(errores: ErroresSubidor, razon: RazonSubida): string {
  return razon in errores
    ? errores[razon as keyof ErroresSubidor]
    : errores.red;
}

type Fase = "reposo" | "procesando" | "rechazada" | "error";

// Subidor de fotos: input de archivo → gate determinista → compresión → R2 → confirmación.
// `leer` se inyecta (default el real) para poder testear el gate sin decodificar imágenes.
export default function SubidorFotos({
  t,
  token,
  cantidadActual,
  onSubida,
  leer = leerDimensiones,
}: {
  t: TextosSubidor;
  token: string;
  cantidadActual: number;
  onSubida: () => void | Promise<void>;
  leer?: LeerDimensiones;
}) {
  const [fase, setFase] = useState<Fase>("reposo");
  const [mensaje, setMensaje] = useState("");
  const [progreso, setProgreso] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const lleno = !puedeAgregar(cantidadActual);

  async function manejarArchivos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const archivos = Array.from(lista);
    let restantes = MAX_FOTOS - cantidadActual;

    for (let i = 0; i < archivos.length; i++) {
      if (restantes <= 0) break;
      setFase("procesando");
      setProgreso(
        archivos.length > 1
          ? rellenar(t.procesandoVarias, { i: i + 1, total: archivos.length })
          : t.procesandoUna,
      );
      const r = await subirFoto(archivos[i], token, leer);
      if (!r.ok) {
        setFase(
          r.razon === "resolucion" ||
            r.razon === "formato" ||
            r.razon === "peso"
            ? "rechazada"
            : "error",
        );
        setMensaje(fraseDeRazon(t.errores, r.razon));
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      restantes -= 1;
      await onSubida();
    }
    setFase("reposo");
    setProgreso("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="mt-4">
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-white px-6 py-8 text-center transition-colors hover:border-purple has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple ${
          lleno || fase === "procesando" ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <span className="text-sm font-semibold text-ink">
          {lleno ? t.lleno : t.agregar}
        </span>
        <span className="mt-1 text-xs text-mute">
          {rellenar(t.contador, { n: cantidadActual, max: MAX_FOTOS })}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          disabled={lleno || fase === "procesando"}
          onChange={(e) => void manejarArchivos(e.target.files)}
        />
      </label>

      {fase === "procesando" && (
        <p className="mt-2 text-sm text-mute" role="status">
          {progreso}
        </p>
      )}
      {(fase === "rechazada" || fase === "error") && (
        <p
          role="alert"
          className="mt-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
        >
          {mensaje}
        </p>
      )}

      {!lleno && <ChecklistEspacios t={t} />}
    </div>
  );
}
