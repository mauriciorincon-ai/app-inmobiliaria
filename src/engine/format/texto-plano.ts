// La versión de solo texto de un correo (S16; deuda del S9). Un correo sin parte de texto pesa más en los filtros de spam y no se
// lee en los clientes que no muestran HTML. Pura: convierte el HTML que arman las plantillas (párrafos, saltos, listas, enlaces y
// negritas) a texto, con cada enlace escrito al lado de su texto.
const ENTIDADES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

export function textoPlano(html: string): string {
  return html
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, texto: string) => {
      const t = texto.replace(/<[^>]+>/g, "").trim();
      return t && t !== href ? `${t} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr|table)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTIDADES[e.toLowerCase()] ?? e)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
