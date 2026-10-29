// @vitest-environment node
// Gate de lo que JAMÁS entra al repo público (S11, F3): la revista se lee en la planeadora y solo llega lo procesado.
// Dos mitades: (1) carnadas sintéticas — cada tipo de fuga plantada DEBE caer, si no el gate no vigila nada (demo en
// rojo, regla 15); (2) el repo real — rutas versionadas, datos generados y texto de los archivos del módulo, sin hallazgos.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  CLAVES_PROYECTO,
  hallazgosDeDatos,
  hallazgosDeRutas,
  hallazgosDeTexto,
} from "../../src/engine/vivienda-nueva/privado";

const RAIZ = join(__dirname, "..", "..");
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: RAIZ, encoding: "utf8" });

// Un proyecto sintético, con solo claves de la lista blanca; cada carnada le planta UNA fuga.
const limpio = () => ({
  id: "p-1",
  nombre: "Proyecto de Prueba",
  constructora: "Constructora de Prueba",
  tipo: "apartamentos",
  ciudad: "Bogotá",
  sector: "Localidad de Prueba",
  rotulos: ["lanzamiento"],
  paginas: [4],
});
const datosCon = (proyecto: Record<string, unknown>) => ({
  proyectos: [proyecto],
});
const codigos = (h: { codigo: string }[]) => h.map((x) => x.codigo);

describe("carnadas: cada fuga plantada cae", () => {
  it("el proyecto limpio no produce hallazgos", () => {
    expect(hallazgosDeDatos(datosCon(limpio()))).toEqual([]);
  });

  it("un teléfono dentro de un campo de texto", () => {
    const h = hallazgosDeDatos(
      datosCon({ ...limpio(), sector: "Chapinero 601 555 0100" }),
    );
    expect(codigos(h)).toContain("telefono");
  });

  it("una dirección", () => {
    const h = hallazgosDeDatos(
      datosCon({ ...limpio(), sector: "Calle 100 # 15-20" }),
    );
    expect(codigos(h)).toContain("direccion");
  });

  it("una web y un correo", () => {
    expect(
      codigos(
        hallazgosDeDatos(
          datosCon({ ...limpio(), constructora: "ejemplo.com" }),
        ),
      ),
    ).toContain("web");
    expect(
      codigos(
        hallazgosDeDatos(
          datosCon({ ...limpio(), constructora: "ventas@ejemplo.test" }),
        ),
      ),
    ).toContain("correo");
  });

  it("un texto de aviso: una frase larga en un campo de nombre", () => {
    const h = hallazgosDeDatos(
      datosCon({
        ...limpio(),
        nombre:
          "Separa hoy tu apartamento con cuota inicial en cuarenta y ocho cuotas y ahorra",
      }),
    );
    expect(codigos(h)).toContain("texto_largo");
  });

  it("una clave que la lista blanca no conoce (p. ej. las notas del lector)", () => {
    const h = hallazgosDeDatos(
      datosCon({ ...limpio(), notas_lector: "texto" }),
    );
    expect(h).toEqual([
      { codigo: "clave_fuera_de_lista", ruta: "proyectos[0].notas_lector" },
    ]);
  });

  it("un rótulo fuera de la lista cerrada", () => {
    const h = hallazgosDeDatos(
      datosCon({ ...limpio(), rotulos: ["lanzamiento", "gran oferta"] }),
    );
    expect(h).toEqual([
      { codigo: "rotulo_fuera_de_lista", ruta: "proyectos[0].rotulos[1]" },
    ]);
  });

  it("el hallazgo nunca repite el texto hallado", () => {
    const h = hallazgosDeDatos(
      datosCon({ ...limpio(), sector: "Chapinero 601 555 0100" }),
    );
    expect(JSON.stringify(h)).not.toContain("555");
  });

  it("rutas versionadas: PDF, crudo, fuentes privadas y fotos o logos del módulo", () => {
    const h = hallazgosDeRutas([
      "docs/revista.pdf",
      "scripts/vivienda-nueva/crudo/pagina-01.jpg",
      "fuentes/estrenar-vivienda/2026-10-edicion-187.pdf",
      "docs/diseno/vivienda-nueva/assets/logo.png",
      "scripts/vivienda-nueva/README.md",
      "docs/diseno/comprador/assets/foto.webp",
    ]);
    expect(h.map((x) => x.ruta)).toEqual([
      "docs/revista.pdf",
      "scripts/vivienda-nueva/crudo/pagina-01.jpg",
      "fuentes/estrenar-vivienda/2026-10-edicion-187.pdf",
      "docs/diseno/vivienda-nueva/assets/logo.png",
    ]);
  });

  it("texto de un archivo: web y correo", () => {
    expect(codigos(hallazgosDeTexto("visita www.ejemplo.test", "x"))).toEqual([
      "web",
    ]);
    expect(
      codigos(hallazgosDeTexto("escribe a ventas@ejemplo.test", "x")),
    ).toEqual(["correo"]);
    expect(hallazgosDeTexto("solo texto del módulo", "x")).toEqual([]);
    // S16: también un teléfono de Colombia, con o sin separadores; una fecha o una cifra no lo son.
    expect(codigos(hallazgosDeTexto("sala: 310 555 0199", "x"))).toEqual(["telefono"]);
    expect(codigos(hallazgosDeTexto("PBX +57 601 555 0199", "x"))).toEqual(["telefono"]);
    expect(hallazgosDeTexto("edición del 2026-10-25, desde $250.000.000", "x")).toEqual([]);
  });
});

describe("el repo real: nada de la revista que no sea procesado", () => {
  it("el crudo está ignorado por git", () => {
    // `git check-ignore -q` sale con 0 si la ruta está ignorada y con 1 si no.
    expect(() =>
      git("check-ignore", "-q", "scripts/vivienda-nueva/crudo/lectura-L1.json"),
    ).not.toThrow();
  });

  it("ninguna ruta versionada es un PDF, el crudo, una fuente privada o una imagen del módulo", () => {
    const rutas = git("ls-files").split("\n").filter(Boolean);
    expect(hallazgosDeRutas(rutas)).toEqual([]);
  });

  it("los datos generados de la maqueta solo llevan lo procesado", () => {
    const ventana: { DATOS_187?: unknown } = {};
    runInNewContext(
      readFileSync(
        join(RAIZ, "docs/diseno/vivienda-nueva/assets/datos-187.js"),
        "utf8",
      ),
      { window: ventana },
    );
    const datos = ventana.DATOS_187 as { proyectos: unknown[] };
    expect(datos.proyectos.length).toBeGreaterThan(100);
    expect(hallazgosDeDatos(datos)).toEqual([]);
    // Cada proyecto lleva solo claves de la lista blanca (y la lista no se infla sin que alguien lo note).
    for (const p of datos.proyectos) {
      for (const k of Object.keys(p as object))
        expect(CLAVES_PROYECTO).toContain(k);
    }
    expect(CLAVES_PROYECTO.length).toBe(24);
  });

  it("los archivos versionados del módulo no traen webs ni correos", () => {
    const propios = git(
      "ls-files",
      "scripts/vivienda-nueva",
      "docs/diseno/vivienda-nueva",
      "src/data/subsidios-vivienda.json",
      "src/data/tarifas-escrituracion.json",
    )
      .split("\n")
      .filter(Boolean)
      // Los datos generados se revisan arriba por cadenas; el resto es código y documentos.
      .filter((r) => !r.endsWith("datos-187.js"));
    expect(propios.length).toBeGreaterThan(10);
    const hallazgos = propios.flatMap((ruta) =>
      hallazgosDeTexto(readFileSync(join(RAIZ, ruta), "utf8"), ruta),
    );
    expect(hallazgos).toEqual([]);
  });
});
