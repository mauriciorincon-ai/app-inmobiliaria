import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MagicLinkGuardar from "@/components/confirmacion/MagicLinkGuardar";
import { CLAVE_LINK } from "@/engine/token/token";
import { textosDe } from "./utils/textos";

const es = textosDe("es");
const en = textosDe("en");

describe("MagicLinkGuardar", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("no renderiza nada en visita directa (sin link en sessionStorage)", () => {
    const { container } = render(
      <MagicLinkGuardar lang="es" t={es.enlace} referido={es.referido} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el link y el botón de copiar cuando existe en sessionStorage", async () => {
    const link = "https://ejemplo.test/mi-anuncio#t=abc";
    sessionStorage.setItem(CLAVE_LINK, link);
    render(<MagicLinkGuardar lang="es" t={es.enlace} referido={es.referido} />);
    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveValue(link);
    });
    expect(
      screen.getByRole("button", { name: /Copiar enlace/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Completar mi anuncio ahora/i }),
    ).toHaveAttribute("href", link);
  });

  it("en inglés el mismo enlace se presenta con textos en inglés", async () => {
    const link = "https://ejemplo.test/mi-anuncio#t=abc";
    sessionStorage.setItem(CLAVE_LINK, link);
    render(<MagicLinkGuardar lang="en" t={en.enlace} referido={en.referido} />);
    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveValue(link);
    });
    expect(
      screen.getByRole("button", { name: "Copy link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Complete my listing now/ }),
    ).toHaveAttribute("href", link);
  });
});
