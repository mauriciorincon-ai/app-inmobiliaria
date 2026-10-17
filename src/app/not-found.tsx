import Link from "next/link";
import { COMUN } from "@/textos/comun";

// 404 de toda URL sin ruta (incluidos los segmentos internos /es y /en pedidos de frente). Next la
// pinta en su envoltorio de error, SIN el layout de [lang] y sin <html lang>: por eso muestra los
// dos idiomas a la vez, cada bloque con su atributo `lang`. Es el único documento de la app sin
// idioma declarado (ADR 013). Sin clases de Tailwind: este envoltorio no carga el CSS de la app.
const t = COMUN.noEncontrada;

const estilo = {
  fontFamily: "system-ui, sans-serif",
  maxWidth: "32rem",
  margin: "6rem auto",
  padding: "0 1.5rem",
  lineHeight: 1.5,
} as const;

export default function NoEncontrada() {
  return (
    <main style={estilo}>
      {(["es", "en"] as const).map((idioma) => (
        <section key={idioma} lang={idioma === "es" ? "es-CO" : "en"}>
          <h1>{t.titulo[idioma]}</h1>
          <p>
            {t.detalle[idioma]} <Link href="/">{t.volver[idioma]}</Link>
          </p>
        </section>
      ))}
    </main>
  );
}
