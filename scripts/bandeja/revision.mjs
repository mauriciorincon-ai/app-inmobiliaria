// La página de REVISIÓN de una edición (S12, G5 del contrato): los proyectos de la muestra con lo procesado al lado de su
// página de la revista, para que el usuario compare con sus ojos antes de publicar. Se escribe en `crudo/` (ignorada por
// git): las páginas de la revista JAMÁS entran al repo. Puro salvo `escribirRevision`.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const pesos = (n) =>
  n === null ? "no lo dice" : `$${Math.round(n).toLocaleString("es-CO")}`;
const metros = (n) => (n === null ? "no lo dice" : `${n} m²`);

function filas(f) {
  const ilegible = (c) => f.ilegibles.includes(c);
  const num = (c, v, fmt) => (ilegible(c) ? "ilegible" : fmt(v));
  const posicion = f.clave.match(/^p(\d+)#(\d+)$/);
  return [
    posicion
      ? [
          "Identificador",
          `sin nombre legible: posición ${posicion[2]} de la página ${posicion[1]}`,
        ]
      : ["Identificador", f.clave],
    ["Constructora", f.constructora],
    ["Ciudad", f.ciudad],
    ["Barrio o localidad", f.sector],
    ["Tipo", f.tipo],
    ["Segmento", f.segmento],
    ["Precio desde", num("precio_desde", f.precio_desde, pesos)],
    [
      "Área construida desde / hasta",
      `${num("area_construida_desde", f.area_construida_desde, metros)} / ${f.area_construida_hasta === null && !ilegible("area_construida_hasta") ? "(un solo valor)" : num("area_construida_hasta", f.area_construida_hasta, metros)}`,
    ],
    [
      "Área privada desde / hasta",
      `${num("area_privada_desde", f.area_privada_desde, metros)} / ${f.area_privada_hasta === null && !ilegible("area_privada_hasta") ? "(un solo valor)" : num("area_privada_hasta", f.area_privada_hasta, metros)}`,
    ],
    ["Etapa", f.etapa],
    [
      "Entrega",
      f.entrega_precision ? `${f.entrega} (${f.entrega_precision})` : f.entrega,
    ],
    [
      "Parqueadero",
      f.parqueadero_precio !== null
        ? `${f.parqueadero} (${pesos(f.parqueadero_precio)})`
        : f.parqueadero,
    ],
    ["Precio fijo", f.precio_fijo],
    ["Subsidio anunciado", f.subsidio_anunciado],
    ["Rótulos", f.rotulos.join(", ") || "ninguno"],
    ["Páginas", f.apariciones.join(", ")],
    [
      "Dos páginas imprimen cifras distintas en",
      f.en_conflicto.join(", ") || "nada",
    ],
  ];
}

/** El HTML de la revisión: `carga` es lo que devuelve `cargaDeEdicion`; las páginas se leen de `paginas/p-NN.jpg`. */
export function htmlDeRevision(carga) {
  const muestra = carga.muestra_claves
    .map((k) => carga.proyectos.find((p) => p.clave === k))
    .filter(Boolean);
  const secciones = muestra
    .map(
      (f, i) => `<section>
  <h2>${i + 1}. ${esc(f.nombre)}</h2>
  <div class="par">
    <table>${filas(f)
      .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
      .join("")}</table>
    <div class="paginas">${f.apariciones
      .map(
        (n) =>
          `<figure><img loading="lazy" src="paginas/p-${String(n).padStart(2, "0")}.jpg" alt="Página ${n} de la revista"><figcaption>Página ${n}</figcaption></figure>`,
      )
      .join("")}</div>
  </div>
</section>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisión de la edición ${carga.numero}</title>
<style>
  body{font:15px/1.45 system-ui,sans-serif;margin:24px auto;max-width:1400px;padding:0 16px;color:#1c1b22}
  h1{font-size:22px} h2{font-size:18px;margin:32px 0 8px}
  .par{display:grid;grid-template-columns:minmax(300px,420px) 1fr;gap:20px;align-items:start}
  table{border-collapse:collapse;width:100%} th,td{border-bottom:1px solid #ddd;padding:5px 8px;text-align:left;vertical-align:top}
  th{font-weight:600;width:48%;color:#555}
  .paginas img{width:100%;border:1px solid #ccc} figure{margin:0 0 12px} figcaption{font-size:13px;color:#555}
  .nota{background:#fff7e0;border:1px solid #e8d48a;padding:10px 14px;border-radius:8px}
  @media (max-width:900px){.par{grid-template-columns:1fr}}
</style></head><body>
<h1>Revisión de la edición ${carga.numero} — ${carga.proyectos.length} proyectos cargados, sin publicar</h1>
<p class="nota">Muestra de ${muestra.length} proyectos al azar con semilla <strong>${carga.muestra_semilla}</strong> (misma semilla, misma muestra).
Compara cada tabla con su página: «no lo dice» significa que el aviso <em>no</em> lo imprime; «ilegible», que no se alcanzó a leer. Si algo no coincide,
la edición <strong>no</strong> se publica. Este archivo y las páginas viven solo en tu computador (carpeta ignorada por git).</p>
${secciones}
</body></html>
`;
}

export function escribirRevision(carga, carpetaCrudo) {
  const ruta = join(carpetaCrudo, `revision-${carga.numero}.html`);
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, htmlDeRevision(carga));
  return ruta;
}
