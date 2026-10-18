import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OptInContacto from "@/components/mi-anuncio/OptInContacto";
import { textosDe } from "./utils/textos";

const es = textosDe("es").miAnuncio.contacto;

const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/lib/supabase/client", () => ({
  crearClienteNavegador: () => ({ rpc: rpcMock }),
}));

describe("OptInContacto", () => {
  beforeEach(() => rpcMock.mockClear());

  it("explica qué se hace público y arranca desactivado", () => {
    render(
      <OptInContacto t={es} token="t" activo={false} onCambio={vi.fn()} />,
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(
      screen.getByText(/Mostrar mi WhatsApp a compradores verificados/i),
    ).toBeInTheDocument();
    // S7: el número nunca queda en la página pública; sin esto, nadie contacta desde el anuncio.
    expect(
      screen.getByText(/tu número nunca se ve en la página pública/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nadie te contacta desde aquí/i),
    ).toBeInTheDocument();
  });

  it("al activar llama la RPC con el nuevo valor y recarga", async () => {
    const onCambio = vi.fn();
    render(
      <OptInContacto t={es} token="tok" activo={false} onCambio={onCambio} />,
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(onCambio).toHaveBeenCalled());
    expect(rpcMock).toHaveBeenCalledWith("guardar_contacto_publico", {
      p_token: "tok",
      p_activo: true,
    });
  });

  it("al desactivar envía false", async () => {
    render(
      <OptInContacto t={es} token="tok" activo={true} onCambio={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith("guardar_contacto_publico", {
        p_token: "tok",
        p_activo: false,
      }),
    );
  });
});
