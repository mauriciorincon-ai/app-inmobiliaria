// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  hmacSha256Hex,
  igualesEnTiempoConstante,
  sha256Hex,
} from "@/engine/verificacion/hash";
import {
  ALFABETO_CODIGO,
  esCodigo,
  extraerCodigo,
  hashCodigo,
} from "@/engine/verificacion/codigo";
import {
  firmaValida,
  firmarCuerpo,
  tokenSuscripcionValido,
} from "@/engine/verificacion/firma";
import { extraerMensajes, MAX_MENSAJES } from "@/engine/verificacion/webhook";
import {
  esSesionValida,
  generarSesion,
  hashSesion,
  rutaDeVuelta,
} from "@/engine/verificacion/sesion";
import { mascararTelefono } from "@/engine/verificacion/mascara";
import { mensajeCodigo, mensajeContacto } from "@/engine/verificacion/mensajes";

describe("hash", () => {
  it("SHA-256 coincide con el vector conocido", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("HMAC-SHA256 coincide con el RFC 4231 (caso 2)", async () => {
    expect(await hmacSha256Hex("Jefe", "what do ya want for nothing?")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  it("la comparación en tiempo constante distingue largo, contenido y tipo", () => {
    expect(igualesEnTiempoConstante("abc", "abc")).toBe(true);
    expect(igualesEnTiempoConstante("abc", "abd")).toBe(false);
    expect(igualesEnTiempoConstante("abc", "abcd")).toBe(false);
    expect(igualesEnTiempoConstante("", "")).toBe(true);
    expect(igualesEnTiempoConstante(1 as unknown as string, "1")).toBe(false);
  });
});

describe("código", () => {
  it("el alfabeto tiene 32 símbolos sin I, O, 0 ni 1", () => {
    expect(ALFABETO_CODIGO).toHaveLength(32);
    for (const c of "IO01") expect(ALFABETO_CODIGO).not.toContain(c);
  });

  it("reconoce el código exacto y rechaza formas inválidas", () => {
    expect(esCodigo("INN-4KQ2ZX")).toBe(true);
    expect(esCodigo("INN-4KQ2Z")).toBe(false);
    expect(esCodigo("INN-4KQ2Z0")).toBe(false); // 0 no está en el alfabeto
    expect(esCodigo("inn-4kq2zx")).toBe(false); // la forma canónica va en mayúsculas
    expect(esCodigo(42)).toBe(false);
  });

  it.each([
    ["INN-4KQ2ZX", "INN-4KQ2ZX"],
    ["inn-4kq2zx", "INN-4KQ2ZX"],
    ["Hola, este es mi código: INN-4KQ2ZX gracias", "INN-4KQ2ZX"],
    ["INN 4KQ2ZX", "INN-4KQ2ZX"],
    ["INN_4KQ2ZX", "INN-4KQ2ZX"],
    ["INN4KQ2ZX", "INN-4KQ2ZX"],
    ["INN–4KQ2ZX", "INN-4KQ2ZX"],
    // Una coincidencia inválida antes no tapa al código válido después (deuda del S7).
    ["Me salió INN-4KQ2Z0, no: INN-4KQ2ZX", "INN-4KQ2ZX"],
  ])("extrae el código de «%s»", (texto, esperado) => {
    expect(extraerCodigo(texto)).toBe(esperado);
  });

  it.each([
    ["sin código", "Hola, quiero información"],
    ["símbolo fuera del alfabeto", "INN-4KQ2Z0"],
    ["demasiado largo", "INN-4KQ2ZXA"],
    ["pegado a otra palabra", "XINN-4KQ2ZX"],
    ["no es texto", 42],
    ["mensaje enorme", "INN-4KQ2ZX" + " ".repeat(2000)],
  ])("no extrae nada: %s", (_caso, texto) => {
    expect(extraerCodigo(texto)).toBeNull();
  });

  it("el hash del código es el SHA-256 de su forma canónica", async () => {
    expect(await hashCodigo("INN-4KQ2ZX")).toBe(await sha256Hex("INN-4KQ2ZX"));
    expect(await hashCodigo("INN-4KQ2ZX")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("firma de Meta", () => {
  const cuerpo = '{"object":"whatsapp_business_account","entry":[]}';

  it("acepta la firma correcta del cuerpo crudo", async () => {
    const cabecera = await firmarCuerpo("secreto-de-prueba", cuerpo);
    expect(cabecera).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(await firmaValida(cabecera, "secreto-de-prueba", cuerpo)).toBe(true);
    expect(
      await firmaValida(
        ` ${cabecera.toUpperCase()} `,
        "secreto-de-prueba",
        cuerpo,
      ),
    ).toBe(true);
  });

  it("rechaza firma ausente, de otro secreto, de otro cuerpo o sin secreto configurado", async () => {
    const buena = await firmarCuerpo("secreto-de-prueba", cuerpo);
    expect(await firmaValida(null, "secreto-de-prueba", cuerpo)).toBe(false);
    expect(await firmaValida(buena, "otro-secreto", cuerpo)).toBe(false);
    expect(await firmaValida(buena, "secreto-de-prueba", cuerpo + " ")).toBe(
      false,
    );
    expect(await firmaValida(buena, "", cuerpo)).toBe(false);
    expect(await firmaValida(buena, undefined, cuerpo)).toBe(false);
    expect(await firmaValida("sha256=abc", "secreto-de-prueba", cuerpo)).toBe(
      false,
    );
  });

  it("el token de suscripción exige uno configurado y exacto", () => {
    expect(tokenSuscripcionValido("t-1", "t-1")).toBe(true);
    expect(tokenSuscripcionValido("t-2", "t-1")).toBe(false);
    expect(tokenSuscripcionValido("t-1", undefined)).toBe(false);
    expect(tokenSuscripcionValido(null, "t-1")).toBe(false);
  });
});

function cargaMeta(mensajes: unknown[], field = "messages") {
  return {
    object: "whatsapp_business_account",
    entry: [{ id: "1", changes: [{ field, value: { messages: mensajes } }] }],
  };
}

describe("cuerpo del webhook", () => {
  it("devuelve los mensajes de texto con el remitente en E.164", () => {
    expect(
      extraerMensajes(
        cargaMeta([
          {
            from: "573115550101",
            id: "w1",
            type: "text",
            text: { body: "INN-4KQ2ZX" },
          },
        ]),
      ),
    ).toEqual([{ remitente: "+573115550101", texto: "INN-4KQ2ZX" }]);
  });

  it("ignora lo que no es un mensaje de texto entrante", () => {
    expect(
      extraerMensajes(
        cargaMeta([
          { from: "573115550101", type: "image", image: { id: "x" } },
          { from: "573115550101", type: "text" },
          { from: "no-es-numero", type: "text", text: { body: "INN-4KQ2ZX" } },
        ]),
      ),
    ).toEqual([]);
    expect(extraerMensajes(cargaMeta([], "statuses"))).toEqual([]);
    expect(
      extraerMensajes({
        object: "whatsapp_business_account",
        entry: [
          { changes: [{ field: "messages", value: { statuses: [{}] } }] },
        ],
      }),
    ).toEqual([]);
    expect(
      extraerMensajes({
        object: "page",
        entry: [],
      }),
    ).toEqual([]);
    expect(extraerMensajes(null)).toEqual([]);
    expect(extraerMensajes("texto")).toEqual([]);
  });

  it("no procesa más de MAX_MENSAJES por entrega", () => {
    const muchos = Array.from({ length: MAX_MENSAJES + 10 }, (_, i) => ({
      from: `5731155${String(i).padStart(5, "0")}`,
      type: "text",
      text: { body: "hola" },
    }));
    expect(extraerMensajes(cargaMeta(muchos))).toHaveLength(MAX_MENSAJES);
  });
});

describe("sesión del comprador", () => {
  it("genera 43 caracteres base64url distintos cada vez", () => {
    const a = generarSesion();
    const b = generarSesion();
    expect(esSesionValida(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("rechaza sesiones mal formadas", () => {
    expect(esSesionValida("corta")).toBe(false);
    expect(esSesionValida("a".repeat(43) + "=")).toBe(false);
    expect(esSesionValida(undefined)).toBe(false);
  });

  it("la base recibe el hash, nunca la sesión", async () => {
    const s = generarSesion();
    const h = await hashSesion(s);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(s);
  });

  it.each([
    ["/i/apartamento-cedritos-a1b2c3", "/i/apartamento-cedritos-a1b2c3"],
    ["/buscar?op=venta", "/buscar?op=venta"],
  ])("acepta la ruta interna %s", (entrada, salida) => {
    expect(rutaDeVuelta(entrada)).toBe(salida);
  });

  it.each([
    "//otro-sitio.example",
    "/\\otro-sitio.example",
    // Los segmentos . y .. se resuelven y dejan «//»: se mira la ruta normalizada.
    "/.//otro-sitio.example",
    "/..//otro-sitio.example",
    "/a/..//otro-sitio.example",
    "/%2e%2e//otro-sitio.example",
    "/./\\otro-sitio.example",
    "https://otro-sitio.example",
    "javascript:alert(1)",
    "i/sin-barra",
    "/con\nsalto",
    "",
    "/" + "a".repeat(250),
    42,
  ])("rechaza %s como destino de vuelta", (entrada) => {
    expect(rutaDeVuelta(entrada)).toBeNull();
  });
});

describe("máscara y mensajes", () => {
  it("el dueño ve solo los 4 últimos dígitos", () => {
    expect(mascararTelefono("0101")).toBe("+57 3•• ••• 0101");
    expect(mascararTelefono("12")).toBe("+57 3•• ••• ••••");
    expect(mascararTelefono(null)).toBe("+57 3•• ••• ••••");
  });

  it("el mensaje del código lleva el código en cada idioma", () => {
    expect(mensajeCodigo("INN-4KQ2ZX", "es")).toContain("INN-4KQ2ZX");
    expect(mensajeCodigo("INN-4KQ2ZX", "en")).toContain("INN-4KQ2ZX");
    expect(mensajeCodigo("INN-4KQ2ZX", "en")).not.toBe(
      mensajeCodigo("INN-4KQ2ZX", "es"),
    );
    // El mensaje real se puede volver a leer: el webhook encuentra el código dentro.
    expect(extraerCodigo(mensajeCodigo("INN-4KQ2ZX", "es"))).toBe("INN-4KQ2ZX");
  });

  it("el mensaje al dueño nombra el inmueble en minúscula y en el idioma de quien visita", () => {
    expect(mensajeContacto("apartamento", "Cedritos", "es")).toContain(
      "apartamento en Cedritos",
    );
    expect(mensajeContacto("casa", "Cedritos", "en")).toContain(
      "house in Cedritos",
    );
    expect(mensajeContacto("desconocido", "Cedritos", "es")).toContain(
      "inmueble en Cedritos",
    );
  });
});
