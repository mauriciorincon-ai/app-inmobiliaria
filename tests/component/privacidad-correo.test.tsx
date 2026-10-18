import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// /privacidad publica el correo del responsable desde NEXT_PUBLIC_RESPONSABLE_CORREO (jamás versionado).
// La constante se lee al importar el módulo, así que se importa DESPUÉS de fijar la variable.
describe("/privacidad — correo del responsable", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("muestra el correo de la variable como enlace mailto, en las dos secciones que lo citan", async () => {
    vi.stubEnv("NEXT_PUBLIC_RESPONSABLE_CORREO", "responsable@ejemplo.test");
    vi.resetModules();
    const { default: Privacidad } =
      await import("@/app/[lang]/privacidad/page");
    render(await Privacidad({ params: Promise.resolve({ lang: "es" }) }));
    const enlaces = screen.getAllByRole("link", {
      name: "responsable@ejemplo.test",
    });
    expect(enlaces.length).toBeGreaterThanOrEqual(2);
    for (const a of enlaces) {
      expect(a).toHaveAttribute("href", "mailto:responsable@ejemplo.test");
    }
  });

  it("informa del correo opcional y de su uso en los avisos de campaña, dentro de «Qué datos recogemos»", async () => {
    vi.stubEnv("NEXT_PUBLIC_RESPONSABLE_CORREO", "responsable@ejemplo.test");
    vi.resetModules();
    const { default: Privacidad } =
      await import("@/app/[lang]/privacidad/page");
    const { PRIVACIDAD } = await import("@/textos/privacidad");
    render(await Privacidad({ params: Promise.resolve({ lang: "es" }) }));
    const parrafo = screen.getByText(PRIVACIDAD.datos.correoOpcional.es);
    const seccion = parrafo.closest("section");
    expect(seccion).not.toBeNull();
    expect(
      within(seccion as HTMLElement).getByRole("heading", {
        name: /qué datos recogemos/i,
      }),
    ).toBeInTheDocument();
  });

  it("en inglés publica la política redactada en inglés, con el mismo correo en las dos secciones", async () => {
    vi.stubEnv("NEXT_PUBLIC_RESPONSABLE_CORREO", "responsable@ejemplo.test");
    vi.resetModules();
    const { default: Privacidad } =
      await import("@/app/[lang]/privacidad/page");
    render(await Privacidad({ params: Promise.resolve({ lang: "en" }) }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Personal data policy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Optional owner verification" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "responsable@ejemplo.test" }).length,
    ).toBeGreaterThanOrEqual(2);
  });
});
