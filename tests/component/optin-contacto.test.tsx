import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OptInContacto from "@/components/mi-anuncio/OptInContacto";

const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/lib/supabase/client", () => ({
  crearClienteNavegador: () => ({ rpc: rpcMock }),
}));

describe("OptInContacto", () => {
  beforeEach(() => rpcMock.mockClear());

  it("explica qué se hace público y arranca desactivado", () => {
    render(<OptInContacto token="t" activo={false} onCambio={vi.fn()} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText(/Mostrar mi WhatsApp/i)).toBeInTheDocument();
    expect(screen.getByText(/tu contacto no aparece/i)).toBeInTheDocument();
  });

  it("al activar llama la RPC con el nuevo valor y recarga", async () => {
    const onCambio = vi.fn();
    render(<OptInContacto token="tok" activo={false} onCambio={onCambio} />);
    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(onCambio).toHaveBeenCalled());
    expect(rpcMock).toHaveBeenCalledWith("guardar_contacto_publico", {
      p_token: "tok",
      p_activo: true,
    });
  });

  it("al desactivar envía false", async () => {
    render(<OptInContacto token="tok" activo={true} onCambio={vi.fn()} />);
    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith("guardar_contacto_publico", {
        p_token: "tok",
        p_activo: false,
      }),
    );
  });
});
