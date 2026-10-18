import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RenovarVigencia from "@/components/vigencia/RenovarVigencia";
import { textosDe } from "./utils/textos";

const es = textosDe("es").vigencia;
const en = textosDe("en").vigencia;

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  crearClienteNavegador: () => ({ rpc: rpcMock }),
}));

const enDias = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString();

describe("RenovarVigencia", () => {
  beforeEach(() => rpcMock.mockReset());

  it("muestra 'vivo' cuando la vigencia está en el futuro", () => {
    render(
      <RenovarVigencia
        lang="es"
        t={es}
        token="t"
        vigenteHastaInicial={enDias(45)}
      />,
    );
    expect(screen.getByText(/Tu anuncio está vivo/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Renovar 60 días/i }),
    ).toBeEnabled();
  });

  it("muestra 'venció' cuando la fecha ya pasó", () => {
    render(
      <RenovarVigencia
        lang="es"
        t={es}
        token="t"
        vigenteHastaInicial={enDias(-1)}
      />,
    );
    expect(screen.getByText(/Tu anuncio venció/i)).toBeInTheDocument();
  });

  it("al renovar llama la RPC (POST) y revive el anuncio", async () => {
    rpcMock.mockResolvedValue({
      data: { vigente_hasta: enDias(60) },
      error: null,
    });
    render(
      <RenovarVigencia
        lang="es"
        t={es}
        token="tok"
        vigenteHastaInicial={enDias(-1)}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Renovar 60 días/i }),
    );
    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith("renovar_vigencia", {
        p_token: "tok",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Tu anuncio está vivo/i)).toBeInTheDocument(),
    );
  });

  it("en inglés la fecha y los textos salen en inglés", () => {
    render(
      <RenovarVigencia
        lang="en"
        t={en}
        token="t"
        vigenteHastaInicial={enDias(5)}
      />,
    );
    expect(screen.getByText(/Your listing is live/i)).toBeInTheDocument();
    expect(screen.getByText(/days left/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Renew for 60 more days" }),
    ).toBeEnabled();
  });
});
