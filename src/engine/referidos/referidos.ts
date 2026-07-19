// Código de referido del fundador — C7 (ADR-007). El código se GENERA en Postgres (base64url de
// 6 bytes = 8 chars, `gen_random_bytes`; NO se deriva del nombre → no expone al referente). Este
// módulo valida la forma, arma el link compartible y el mensaje de WhatsApp. La atribución (quién
// refirió a quién) vive en BD y el código jamás revela datos del referente: solo cuenta.

// base64url de 6 bytes sin padding = 8 chars del alfabeto [A-Za-z0-9_-].
export const CODIGO_REGEX = /^[A-Za-z0-9_-]{8}$/;

export function esCodigoValido(codigo: string): boolean {
  return typeof codigo === "string" && CODIGO_REGEX.test(codigo);
}

// Normaliza un código crudo (de una URL o input): recorta espacios; null si no es válido de forma.
export function normalizarCodigo(
  raw: string | null | undefined,
): string | null {
  if (typeof raw !== "string") return null;
  const limpio = raw.trim();
  return esCodigoValido(limpio) ? limpio : null;
}

// Extrae y valida el código del query string (`?ref=…`). Para capturarlo en el wizard sin romper
// nada si viene ausente o mal formado (un ref inválido se ignora en silencio; el registro sigue).
export function extraerRefDeBusqueda(search: string): string | null {
  if (typeof search !== "string") return null;
  const qs = search.startsWith("?") ? search : `?${search}`;
  let valor: string | null;
  try {
    valor = new URLSearchParams(qs).get("ref");
  } catch {
    return null;
  }
  return normalizarCodigo(valor);
}

// Link que el fundador comparte para invitar a otro dueño (aterriza en el wizard con el ref puesto).
export function construirLinkReferido(origin: string, codigo: string): string {
  return `${origin.replace(/\/+$/, "")}/publicar?ref=${codigo}`;
}

// Texto prellenado de WhatsApp para invitar (es-CO). El wa.me lo arma el llamador con `construirWaMe`.
// Copy honesto: sin comisión (la plataforma no cobra en fase 1) y el cupo fundador es real.
export function mensajeInvitacion(link: string): string {
  return (
    "Estoy publicando mi inmueble como fundador en Innmobiliaria — sin comisión. " +
    `Publica el tuyo con mi enlace y aseguras tu cupo de fundador: ${link}`
  );
}
