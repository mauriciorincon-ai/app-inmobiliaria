// Cómo ve el dueño, en «Mi anuncio», el teléfono de un comprador que le escribió (S7, ADR 015): solo los
// últimos 4 dígitos, que es lo que la base devuelve. El número completo ya le llegó en su WhatsApp.

const OCULTO = "••••";

export function mascararTelefono(ultimosCuatro: unknown): string {
  const fin =
    typeof ultimosCuatro === "string" && /^\d{4}$/.test(ultimosCuatro)
      ? ultimosCuatro
      : OCULTO;
  return `+57 3•• ••• ${fin}`;
}
