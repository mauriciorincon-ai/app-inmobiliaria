import { AwsClient } from "aws4fetch";

// Firma de subidas a Cloudflare R2 (S3-compatible) vía presigned PUT. Server-only: las
// credenciales (R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY) viven en .env.local y como secrets del
// Worker, JAMÁS viajan al cliente. aws4fetch (~2KB) usa WebCrypto (SubtleCrypto), presente tanto
// en Node como en workerd — por eso NO usamos @aws-sdk (demasiado pesado para el Worker free).
// ADR-003.

function accountId(): string {
  return process.env.R2_ACCOUNT_ID ?? "";
}

function bucket(): string {
  return process.env.R2_BUCKET ?? "innmobiliaria-fotos";
}

let cliente: AwsClient | null = null;

export function clienteR2(): AwsClient {
  if (!cliente) {
    cliente = new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      service: "s3",
      region: "auto",
    });
  }
  return cliente;
}

export const EXPIRA_PRESIGN_SEG = 600; // 10 min: suficiente para comprimir + subir desde el móvil.

// Firma una URL de PUT presigned. NO sube nada: solo devuelve la URL firmada. El navegador hace
// PUT a esa URL con `Content-Type: image/webp` — R2 guarda ese content-type como metadata del
// objeto (para servirlo bien desde r2.dev). Nota del spike (Fase 0): con `signQuery`, aws4fetch
// NO incluye content-type en X-Amz-SignedHeaders, así que no se firma ni se puede exigir por la
// firma; la key aleatoria atada al inmueble + expiración de 10 min son el control (ADR-003).
export async function presignPut(
  key: string,
  expiraSeg: number = EXPIRA_PRESIGN_SEG,
): Promise<string> {
  const url = new URL(
    `https://${accountId()}.r2.cloudflarestorage.com/${bucket()}/${key}`,
  );
  url.searchParams.set("X-Amz-Expires", String(expiraSeg));
  const firmada = await clienteR2().sign(new Request(url, { method: "PUT" }), {
    aws: { signQuery: true },
  });
  return firmada.url;
}

// Content-type que el navegador debe enviar en el PUT (y que R2 persistirá como metadata).
export const CONTENT_TYPE_FOTO = "image/webp";

// URL pública (r2.dev) de un objeto ya subido. Pública por diseño: la sirve el bucket, y es la
// que va como <img src> en la galería y como og:image de la ficha.
export function urlPublicaFoto(key: string): string {
  const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(
    /\/+$/,
    "",
  );
  return `${base}/${key}`;
}

// Deriva la key de la miniatura a partir de la del full (convención "-full.webp" → "-thumb.webp").
// Una sola columna en BD (r2_key = full); la thumb no se persiste, se calcula.
export function keyThumb(keyFull: string): string {
  return keyFull.replace(/-full\.webp$/, "-thumb.webp");
}
