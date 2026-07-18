import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MagicLinkGuardar from "@/components/confirmacion/MagicLinkGuardar";
import { CLAVE_LINK } from "@/engine/token/token";

describe("MagicLinkGuardar", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("no renderiza nada en visita directa (sin link en sessionStorage)", () => {
    const { container } = render(<MagicLinkGuardar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el link y el botón de copiar cuando existe en sessionStorage", async () => {
    const link = "https://innmobiliaria.co/mi-anuncio#t=abc";
    sessionStorage.setItem(CLAVE_LINK, link);
    render(<MagicLinkGuardar />);
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
});
