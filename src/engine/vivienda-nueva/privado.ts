// Lo que JAMÁS entra al repo público (S11, F3). Puro: recibe los datos generados, las rutas versionadas y el texto de los
// archivos, y devuelve hallazgos con un código y una ruta, nunca el texto hallado (un hallazgo no debe repetir lo que
// se quería esconder). La revista se lee en la planeadora y solo llega lo procesado: nombres, constructoras, zonas y
// cifras de una lista blanca. Ni el PDF, ni las páginas, ni las fotos o logos, ni los teléfonos, direcciones, webs o
// correos de las salas de ventas, ni el texto de los avisos.
//
// La lista de claves de aquí es una segunda entrada A PROPÓSITO, independiente de la del generador: si el generador
// empieza a dejar pasar un campo nuevo, este gate lo ve antes que nadie.
import { RE_DIRECCION, RE_TELEFONO, ROTULOS } from "./edicion.ts";

/** Las claves que un proyecto puede llevar a la maqueta. Cualquier otra es texto de la revista que no se aprobó. */
export const CLAVES_PROYECTO: readonly string[] = [
  "id",
  "nombre",
  "constructora",
  "tipo",
  "ciudad",
  "sector",
  "region",
  "segmento",
  "precioDesde",
  "areaConstruida",
  "areaPrivada",
  "etapa",
  "entrega",
  "entregaPrecision",
  "parqueadero",
  "parqueaderoPrecio",
  "precioFijo",
  "subsidioAnunciado",
  "rotulos",
  "paginas",
  "discrepancias",
  "precioVerdadero",
  "ficha",
  "espera",
];

export type CodigoHallazgo =
  | "clave_fuera_de_lista"
  | "rotulo_fuera_de_lista"
  | "texto_largo"
  | "telefono"
  | "direccion"
  | "web"
  | "correo"
  | "archivo_prohibido";

export type Hallazgo = { codigo: CodigoHallazgo; ruta: string };

// Un nombre de proyecto o de constructora cabe en pocas palabras; un texto de aviso es una frase.
const MAX_CARACTERES = 60;
const MAX_PALABRAS = 8;
// Los campos que traen texto propio de la revista (el resto son valores de listas cerradas o códigos).
const CAMPOS_DE_NOMBRE = ["nombre", "constructora", "sector", "ciudad"];

const RE_WEB = /https?:\/\/|www\.|\b[\w-]+\.(com|co|net|org|io|app|info)\b/i;
const RE_CORREO = /[^\s@]+@[^\s@]+/;
// Un celular (3xx) o un fijo (60x) de Colombia, con o sin +57 y separadores (S16; deuda del S11: el gate de texto no buscaba
// teléfonos). Más estrecho que `RE_TELEFONO` de los datos, que en un archivo cualquiera atraparía fechas y cifras.
const RE_TELEFONO_CO = /(?:\+?57[\s.-]?)?\b(?:3\d{2}|60\d)[\s.-]?\d{3}[\s.-]?\d{4}\b/;

const IMAGEN = /\.(png|jpe?g|webp|gif|svg|tiff?|heic|avif|bmp)$/i;
const CRUDO = /(^|\/)crudo\//;
const CARPETAS_DE_LA_REVISTA = [
  "scripts/vivienda-nueva/",
  "docs/diseno/vivienda-nueva/",
];

/** Recorre un valor JSON y entrega cada cadena con su ruta. */
function* cadenas(valor: unknown, ruta: string): Generator<[string, string]> {
  if (typeof valor === "string") yield [ruta, valor];
  else if (Array.isArray(valor)) {
    for (let i = 0; i < valor.length; i++)
      yield* cadenas(valor[i], `${ruta}[${i}]`);
  } else if (valor !== null && typeof valor === "object") {
    for (const [k, v] of Object.entries(valor))
      yield* cadenas(v, `${ruta}.${k}`);
  }
}

/** Web, correo y teléfono: valen para cualquier texto del repo. */
export function hallazgosDeTexto(texto: string, ruta: string): Hallazgo[] {
  const salida: Hallazgo[] = [];
  if (RE_WEB.test(texto)) salida.push({ codigo: "web", ruta });
  if (RE_CORREO.test(texto)) salida.push({ codigo: "correo", ruta });
  if (RE_TELEFONO_CO.test(texto)) salida.push({ codigo: "telefono", ruta });
  return salida;
}

/**
 * Rutas versionadas que jamás deben existir: cualquier PDF, el crudo de la revista, la carpeta de las fuentes privadas y
 * cualquier imagen dentro de las carpetas de este módulo (fotos y logos).
 */
export function hallazgosDeRutas(rutas: readonly string[]): Hallazgo[] {
  const salida: Hallazgo[] = [];
  for (const ruta of rutas) {
    const prohibida =
      /\.pdf$/i.test(ruta) ||
      CRUDO.test(ruta) ||
      /(^|\/)fuentes\/estrenar-vivienda\//.test(ruta) ||
      (IMAGEN.test(ruta) &&
        CARPETAS_DE_LA_REVISTA.some((c) => ruta.startsWith(c)));
    if (prohibida) salida.push({ codigo: "archivo_prohibido", ruta });
  }
  return salida;
}

/**
 * Los datos que viajan a la maqueta: solo claves de la lista blanca por proyecto, rótulos de la lista cerrada, nombres
 * cortos y ningún teléfono, dirección, web o correo dentro de los proyectos.
 */
export function hallazgosDeDatos(datos: unknown): Hallazgo[] {
  const salida: Hallazgo[] = [];
  const raiz = datos as { proyectos?: unknown };
  const proyectos = Array.isArray(raiz?.proyectos) ? raiz.proyectos : [];

  proyectos.forEach((proyecto: unknown, i: number) => {
    const base = `proyectos[${i}]`;
    if (proyecto === null || typeof proyecto !== "object") return;
    for (const clave of Object.keys(proyecto)) {
      if (!CLAVES_PROYECTO.includes(clave)) {
        salida.push({
          codigo: "clave_fuera_de_lista",
          ruta: `${base}.${clave}`,
        });
      }
    }
    const rotulos = (proyecto as { rotulos?: unknown }).rotulos;
    if (Array.isArray(rotulos)) {
      rotulos.forEach((r, j) => {
        if (!(ROTULOS as readonly unknown[]).includes(r)) {
          salida.push({
            codigo: "rotulo_fuera_de_lista",
            ruta: `${base}.rotulos[${j}]`,
          });
        }
      });
    }
    for (const [ruta, valor] of cadenas(proyecto, base)) {
      const campo = ruta.slice(base.length + 1).split(/[.[]/)[0];
      const palabras = valor.trim().split(/\s+/).length;
      if (
        (CAMPOS_DE_NOMBRE.includes(campo) &&
          (valor.length > MAX_CARACTERES || palabras > MAX_PALABRAS)) ||
        valor.length > 4 * MAX_CARACTERES
      ) {
        salida.push({ codigo: "texto_largo", ruta });
      }
      if (RE_TELEFONO.test(valor)) salida.push({ codigo: "telefono", ruta });
      if (RE_DIRECCION.test(valor)) salida.push({ codigo: "direccion", ruta });
    }
  });

  // Web y correo en cualquier cadena de los datos (los programas y las normas también).
  for (const [ruta, valor] of cadenas(datos, "datos")) {
    salida.push(...hallazgosDeTexto(valor, ruta));
  }
  return salida;
}
