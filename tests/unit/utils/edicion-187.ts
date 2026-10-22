// La edición 187 REAL ya procesada, como la entregaría la base (S12). Sale de `datos-187.js` (la maqueta aprobada,
// versionada: el crudo está ignorado y la CI no lo tiene), vuelve al proyecto unido del S11, pasa por la fila de la base
// serializada como JSON (así viaja por la RPC) y regresa con `deFila`. Lo usan las pruebas de la vista y el gate de
// envejecimiento. Solo datos procesados: ni contactos, ni direcciones, ni webs, ni textos de avisos.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import {
  aFila,
  asignarSlugs,
  deFila,
  type FilaProyecto,
} from "../../../src/engine/vivienda-nueva/filas";
import {
  normalizarClave,
  type ProyectoUnico,
} from "../../../src/engine/vivienda-nueva/lectura";
import type { DatosMaqueta } from "../../../src/engine/vivienda-nueva/maqueta-datos";
import type { ProyectoPublicado } from "../../../src/engine/vivienda-nueva/vista";

const RAIZ = join(__dirname, "..", "..", "..");

export function edicion187(): {
  d: DatosMaqueta;
  unidos: ProyectoUnico[];
  publicados: ProyectoPublicado[];
} {
  const texto = readFileSync(
    join(RAIZ, "docs/diseno/vivienda-nueva/assets/datos-187.js"),
    "utf8",
  );
  const ventana: { DATOS_187?: DatosMaqueta } = {};
  runInNewContext(texto, { window: ventana });
  const d = ventana.DATOS_187!;

  // De la maqueta al proyecto unido del S11 (la clave solo sirve para los slugs).
  const unidos: ProyectoUnico[] = d.proyectos.map((p) => ({
    nombre: p.nombre,
    constructora: p.constructora,
    tipo: p.tipo,
    ciudad: p.ciudad,
    sector: p.sector,
    segmento: p.segmento,
    precio_desde: p.precioDesde,
    area_construida_desde: p.areaConstruida[0],
    area_construida_hasta: p.areaConstruida[1],
    area_privada_desde: p.areaPrivada[0],
    area_privada_hasta: p.areaPrivada[1],
    etapa: p.etapa,
    entrega: p.entrega,
    entrega_precision: p.entregaPrecision,
    parqueadero: p.parqueadero,
    parqueadero_precio: p.parqueaderoPrecio,
    precio_fijo: p.precioFijo,
    subsidio_anunciado: p.subsidioAnunciado,
    rotulos: p.rotulos,
    apariciones: p.paginas,
    region: p.region,
    clave: `${normalizarClave(String(p.constructora))}|${normalizarClave(String(p.nombre))}|${p.id}`,
    en_conflicto: p.discrepancias as ProyectoUnico["en_conflicto"],
  }));
  const slugs = asignarSlugs(unidos);
  const publicados: ProyectoPublicado[] = unidos.map((p) => {
    const fila = JSON.parse(
      JSON.stringify(aFila(p, slugs.get(p.clave)!)),
    ) as FilaProyecto;
    return { ...deFila(fila), slug: fila.slug };
  });
  return { d, unidos, publicados };
}
