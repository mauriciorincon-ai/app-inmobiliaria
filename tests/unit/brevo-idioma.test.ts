// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { enviarLote } from "@/lib/brevo";
import { plantillaPorId } from "@/engine/envios/plantillas";

// El adaptador manda a Brevo un correo por destinatario, en el idioma que ese vendedor guardó al
// publicar. Con una key falsa y `fetch` simulado se ve exactamente qué asunto y cuerpo viajan.

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("enviarLote — cada vendedor en su idioma", () => {
  it("el asunto y el cuerpo salen en el idioma de cada destinatario, con su nombre escapado", async () => {
    vi.stubEnv("BREVO_API_KEY", "clave-de-prueba");
    vi.stubEnv("BREVO_MOCK", "");
    vi.stubEnv("BREVO_FROM_EMAIL", "remitente@ejemplo.test");
    const enviados: Array<{
      to: { email: string }[];
      subject: string;
      htmlContent: string;
    }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        enviados.push(JSON.parse(init.body));
        return { ok: true };
      }),
    );

    const plantilla = plantillaPorId("completa-anuncio");
    expect(plantilla).not.toBeNull();
    const r = await enviarLote(
      plantilla!,
      [
        { email: "ana@ejemplo.test", nombre: "Ana", idioma: "es" },
        { email: "bob@ejemplo.test", nombre: "<b>Bob</b>", idioma: "en" },
      ],
      "https://app.ejemplo.test",
    );

    expect(r).toEqual({ enviados: 2, fallidos: 0, mock: false });
    const ana = enviados.find((e) => e.to[0].email === "ana@ejemplo.test")!;
    const bob = enviados.find((e) => e.to[0].email === "bob@ejemplo.test")!;
    expect(ana.subject).toBe("Tu anuncio luce mejor con fotos");
    expect(ana.htmlContent).toContain("Hola Ana");
    expect(bob.subject).toBe("Your listing looks better with photos");
    expect(bob.htmlContent).toContain("Hi &lt;b&gt;Bob&lt;/b&gt;");
    expect(bob.htmlContent).not.toContain("<b>Bob</b>");
  });

  it("en modo prueba (sin key) no envía nada y cuenta todos", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    const llamada = vi.fn();
    vi.stubGlobal("fetch", llamada);
    const r = await enviarLote(
      plantillaPorId("gana-sello")!,
      [{ email: "a@ejemplo.test", nombre: "A", idioma: "en" }],
      "u",
    );
    expect(r).toEqual({ enviados: 1, fallidos: 0, mock: true });
    expect(llamada).not.toHaveBeenCalled();
  });
});
