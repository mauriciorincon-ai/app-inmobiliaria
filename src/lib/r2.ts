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

// urlPublicaFoto y keyThumb viven en @/lib/fotos-url (client-safe, sin aws4fetch).
