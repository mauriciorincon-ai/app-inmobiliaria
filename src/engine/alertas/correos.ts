// Los correos de las alertas (S9, ADR 017), puros y deterministas: la confirmación y el resumen diario. Lo
// que escribió una persona (el nombre de la alerta, el barrio) y los enlaces se ESCAPAN antes de entrar al
// HTML; el asunto es texto plano sin saltos de línea. Los dos correos llevan la baja en un clic en el cuerpo
// y en la cabecera `List-Unsubscribe` (RFC 8058), cuyo POST lleva el token de BAJA (su único poder es dar de
// baja: ADR 017, decisión 4).
import { escaparHtml } from "@/engine/envios/plantillas";
import { formatearCOP } from "@/engine/format/cop";
import { estadoSello } from "@/engine/sello/sello";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";
import { CORREOS_ALERTAS } from "@/textos/correos-alertas";

export type CorreoAlerta = {
  asunto: string;
  html: string;
  cabeceras: Record<string, string>;
};

export type AnuncioCorreo = {
  slug: string;
  tipo: string;
  barrio: string;
  area_m2: number;
  precio_esperado: number;
  nivel_verificacion: "fundador" | "verificado";
  ctl_expedido_el: string | null;
  portada: string | null;
  precio_anterior?: number;
};

export type EnlacesBaja = {
  /** La página de baja (`/baja#t=…`), para el cuerpo del correo. */
  baja: string;
  /** El POST de un clic (`/api/alertas/baja?t=…`), para la cabecera. */
  bajaPost: string;
};

export type EnlacesResumen = EnlacesBaja & {
  mapa: string;
  gestionar: string;
  ficha: (slug: string) => string;
  foto: (key: string) => string | null;
};

const ESTILO_CTA = "color:#7B5DD6;font-weight:bold";
const ESTILO_PIE = "color:#888;font-size:12px";
// La miniatura del anuncio: decorativa (el precio y el lugar van al lado), por eso `alt` vacío.
const ATRIBUTOS_FOTO = 'width="160" alt=""';
const ESTILO_FOTO = "border-radius:8px;display:block";

/** Texto plano para el asunto: sin saltos de línea ni otros caracteres de control, ni espacios repetidos. */
export function plano(texto: string): string {
  return texto
    .replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Las cabeceras de la baja en un clic (RFC 8058): el cliente de correo hace el POST, sin abrir nada. */
export function cabecerasBaja(urlPost: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${urlPost}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

function enlace(href: string, texto: string): string {
  return `<p><a href="${escaparHtml(href)}" style="${ESTILO_CTA}">${texto}</a></p>`;
}

export function armarConfirmacion(
  datos: { nombre: string; criterios: string },
  enlaces: EnlacesBaja & { confirmar: string },
  idioma: Idioma,
): CorreoAlerta {
  const t = enIdioma(CORREOS_ALERTAS, idioma);
  const c = t.confirmacion;
  const html =
    `<p>${t.saludo}</p>` +
    rellenar(c.cuerpo, { criterios: escaparHtml(plano(datos.criterios)) }) +
    enlace(enlaces.confirmar, c.cta) +
    c.espera +
    rellenar(c.noFuiYo, { baja: escaparHtml(enlaces.baja) }) +
    `<p style="${ESTILO_PIE}">${t.pie}</p>`;
  return {
    // Asunto fijo: el nombre de la alerta lo escribe quien la crea y este correo va a un destinatario que aún
    // no aceptó nada; su texto libre solo aparece en los resúmenes, que ya confirmó.
    asunto: plano(c.asunto),
    html,
    cabeceras: cabecerasBaja(enlaces.bajaPost),
  };
}

/** El asunto del resumen según lo que trae: solo nuevos, solo bajas o los dos. */
export function asuntoResumen(
  nombre: string,
  totalNuevos: number,
  totalBajas: number,
  idioma: Idioma,
): string {
  const a = enIdioma(CORREOS_ALERTAS, idioma).resumen.asunto;
  // `n` es el número de la parte que va sola; con las dos, `n` nuevos y `m` bajas.
  const valores = {
    nombre: plano(nombre),
    n: totalNuevos > 0 ? totalNuevos : totalBajas,
    m: totalBajas,
  };
  const plantilla =
    totalNuevos > 0 && totalBajas > 0
      ? a.ambos
      : totalNuevos > 0
        ? totalNuevos === 1
          ? a.nuevosUno
          : a.nuevosVarios
        : totalBajas === 1
          ? a.bajasUno
          : a.bajasVarios;
  return plano(rellenar(plantilla, valores));
}

function tipoEnFrase(tipo: string, idioma: Idioma): string {
  const tipos = enIdioma(COMUN, idioma).dominio.tipo as Record<string, string>;
  return tipos[tipo] ?? tipos.inmueble;
}

function itemHtml(
  a: AnuncioCorreo,
  enlaces: EnlacesResumen,
  idioma: Idioma,
): string {
  const r = enIdioma(CORREOS_ALERTAS, idioma).resumen;
  const ficha = escaparHtml(enlaces.ficha(a.slug));
  const foto = a.portada ? enlaces.foto(a.portada) : null;
  const img = foto
    ? `<a href="${ficha}"><img src="${escaparHtml(foto)}" ${ATRIBUTOS_FOTO} style="${ESTILO_FOTO}"></a>`
    : "";
  const precio = `<strong>${escaparHtml(formatearCOP(a.precio_esperado, idioma))}</strong>`;
  const anterior =
    a.precio_anterior !== undefined
      ? ` <s style="color:#888">${escaparHtml(formatearCOP(a.precio_anterior, idioma))}</s>`
      : "";
  const lugar = escaparHtml(
    rellenar(r.lugar, {
      tipo: tipoEnFrase(a.tipo, idioma),
      barrio: plano(a.barrio),
      area: a.area_m2,
    }),
  );
  const sello =
    estadoSello(a.nivel_verificacion, a.ctl_expedido_el) === "verificado"
      ? `<br>${r.verificado}`
      : "";
  return `<p>${img}<a href="${ficha}" style="color:inherit;text-decoration:none">${precio}${anterior}<br>${lugar}</a>${sello}</p>`;
}

export type DatosResumen = {
  nombre: string;
  criterios: string;
  nuevos: readonly AnuncioCorreo[];
  bajas: readonly AnuncioCorreo[];
  totalNuevos: number;
  totalBajas: number;
};

export function armarResumen(
  datos: DatosResumen,
  enlaces: EnlacesResumen,
  idioma: Idioma,
): CorreoAlerta {
  const t = enIdioma(CORREOS_ALERTAS, idioma);
  const r = t.resumen;
  const nombre = escaparHtml(plano(datos.nombre));
  const partes = [
    `<p>${t.saludo}</p>`,
    rellenar(r.intro, {
      nombre,
      criterios: escaparHtml(plano(datos.criterios)),
    }),
  ];
  const seccion = (
    titulo: string,
    items: readonly AnuncioCorreo[],
    total: number,
  ) => {
    if (items.length === 0) return;
    partes.push(`<p><strong>${titulo}</strong></p>`);
    for (const a of items) partes.push(itemHtml(a, enlaces, idioma));
    if (total > items.length) {
      partes.push(`<p>${rellenar(r.mas, { n: total - items.length })}</p>`);
    }
  };
  seccion(r.nuevos, datos.nuevos, datos.totalNuevos);
  seccion(r.bajas, datos.bajas, datos.totalBajas);
  partes.push(enlace(enlaces.mapa, r.cta));
  partes.push(
    rellenar(r.porque, {
      nombre,
      baja: escaparHtml(enlaces.baja),
      gestionar: escaparHtml(enlaces.gestionar),
    }),
  );
  partes.push(`<p style="${ESTILO_PIE}">${t.pie}</p>`);
  return {
    asunto: asuntoResumen(
      datos.nombre,
      datos.totalNuevos,
      datos.totalBajas,
      idioma,
    ),
    html: partes.join(""),
    cabeceras: cabecerasBaja(enlaces.bajaPost),
  };
}
