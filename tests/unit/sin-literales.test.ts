// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { barrer } from "./utils/barrido-literales";

// Regla de producto 10 (S5): ningún texto visible vive en un componente ni en un motor; todo sale
// del diccionario `src/textos/*` con sus dos idiomas. Este test recorre los componentes y páginas
// (.tsx) y los motores y `lib` (.ts) y falla ante un literal de texto en JSX, un atributo visible con
// literal, un `export const metadata`, copy en arreglos de datos, mensajes de Zod o frases sueltas.
//
// PENDIENTES es el inventario de archivos que el S5 aún no migra (medido al cierre de la F1). Es
// una lista que SOLO puede encogerse: un archivo de la lista que ya no tiene literales también
// falla, para que nadie la deje desfasada. La F2 y la F3 la vacían y este bloque se borra.
const PENDIENTES: string[] = [
  "src/app/[lang]/confirmacion/page.tsx",
  "src/app/[lang]/i/[slug]/page.tsx",
  "src/app/[lang]/mi-anuncio/page.tsx",
  "src/app/[lang]/operador/campana/page.tsx",
  "src/app/[lang]/operador/page.tsx",
  "src/app/[lang]/operador/zonas/page.tsx",
  "src/app/[lang]/privacidad/page.tsx",
  "src/app/[lang]/publicar/page.tsx",
  "src/app/[lang]/renovar/page.tsx",
  "src/components/confirmacion/MagicLinkGuardar.tsx",
  "src/components/ficha/ContactoVendedor.tsx",
  "src/components/ficha/Galeria.tsx",
  "src/components/ficha/SelloNivel.tsx",
  "src/components/ficha/SinFotosSVG.tsx",
  "src/components/landing/BandaCupos.tsx",
  "src/components/landing/ComoFunciona.tsx",
  "src/components/landing/CtaFinal.tsx",
  "src/components/landing/Dolores.tsx",
  "src/components/landing/Faq.tsx",
  "src/components/landing/Hero.tsx",
  "src/components/landing/QueViene.tsx",
  "src/components/mi-anuncio/ChecklistEspacios.tsx",
  "src/components/mi-anuncio/EditorDescripcion.tsx",
  "src/components/mi-anuncio/GaleriaEditable.tsx",
  "src/components/mi-anuncio/MiAnuncio.tsx",
  "src/components/mi-anuncio/OptInContacto.tsx",
  "src/components/mi-anuncio/ScoreCompletitud.tsx",
  "src/components/mi-anuncio/SubidorFotos.tsx",
  "src/components/operador/BotonReContacto.tsx",
  "src/components/operador/CerrarSesion.tsx",
  "src/components/operador/EnviarLote.tsx",
  "src/components/operador/FijarCupo.tsx",
  "src/components/operador/MarcarVerificado.tsx",
  "src/components/operador/PanelNav.tsx",
  "src/components/paquete/PaqueteFundador.tsx",
  "src/components/publicar/Paso1Contacto.tsx",
  "src/components/publicar/Paso2Inmueble.tsx",
  "src/components/publicar/Paso3Revision.tsx",
  "src/components/publicar/Progreso.tsx",
  "src/components/publicar/Wizard.tsx",
  "src/components/referido/InvitaReferido.tsx",
  "src/components/renovar/RenovarPagina.tsx",
  "src/components/vigencia/RenovarVigencia.tsx",
  "src/engine/cupos/cupos.ts",
  "src/engine/envios/plantillas.ts",
  "src/engine/format/whatsapp.ts",
  "src/engine/fotos/gate.ts",
  "src/engine/referidos/referidos.ts",
  "src/engine/registro/schema.ts",
  "src/engine/score/score.ts",
  "src/lib/fotos-cliente.ts",
];

const RAIZ = join(__dirname, "..", "..");
const FUENTES: Array<[carpeta: string, extension: string]> = [
  ["src/app", ".tsx"],
  ["src/components", ".tsx"],
  ["src/engine", ".ts"],
  ["src/lib", ".ts"],
];

function archivos(dir: string, extension: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta, extension));
    else if (nombre.endsWith(extension)) salida.push(ruta);
  }
  return salida;
}

const todos = FUENTES.flatMap(([carpeta, ext]) =>
  archivos(join(RAIZ, carpeta), ext),
).map((a) => relative(RAIZ, a));
const hallazgosPorArchivo = new Map(
  todos.map((a) => [a, barrer(a, readFileSync(join(RAIZ, a), "utf8"))]),
);

describe("sin literales de texto fuera del diccionario", () => {
  it("el barrido ve los archivos de la app, los motores y lib", () => {
    expect(todos.length).toBeGreaterThan(60);
    expect(todos.some((a) => a.startsWith("src/engine/"))).toBe(true);
    expect(todos.some((a) => a.startsWith("src/lib/"))).toBe(true);
  });

  it("ningún archivo migrado tiene literales de texto", () => {
    const sucios = todos
      .filter((a) => !PENDIENTES.includes(a))
      .filter((a) => (hallazgosPorArchivo.get(a) ?? []).length > 0)
      .map(
        (a) =>
          `${a}\n` +
          (hallazgosPorArchivo.get(a) ?? [])
            .slice(0, 3)
            .map((h) => `    L${h.linea} [${h.tipo}] ${h.texto.slice(0, 60)}`)
            .join("\n"),
      );
    expect(
      sucios,
      `Literales fuera del diccionario:\n${sucios.join("\n")}`,
    ).toEqual([]);
  });

  it("la lista de pendientes no está desfasada: cada archivo sigue teniendo literales", () => {
    const limpios = PENDIENTES.filter(
      (a) => (hallazgosPorArchivo.get(a) ?? []).length === 0,
    );
    expect(limpios, "Quítalos de PENDIENTES: ya están migrados").toEqual([]);
  });

  it("cada pendiente existe", () => {
    for (const a of PENDIENTES) expect(todos, a).toContain(a);
  });
});
