// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// S16 (auditoría) — el cableado del aviso al operador cuando entra una solicitud nueva a una sala de ventas: sale solo para
// «solicitud» de SALA y solo si hay operador definido, y no lleva datos del comprador. La función real con una base y un Brevo
// falsos; el motor puro ya lo cubre `visita-correos-sala.test.ts`. Datos 100 % sintéticos.

type Correo = {
  para: { email: string; nombre: string };
  asunto: string;
  html: string;
};
const enviados: Correo[] = [];
let datos: unknown;

vi.mock("@/lib/observability", () => ({ reportError: () => {} }));
vi.mock("@/lib/brevo", () => ({
  enviarCorreo: async (c: Correo) => {
    enviados.push(c);
    return { ok: true };
  },
}));
vi.mock("@/lib/supabase/servicio", () => ({
  crearClienteServicio: () => ({
    rpc: async (fn: string) => {
      if (fn === "datos_correo_visita") return { data: datos, error: null };
      if (fn === "nuevo_enlace_visita")
        return { data: "token-sintetico", error: null };
      return { data: null, error: null };
    },
  }),
}));

import { avisarVisita } from "@/lib/visitas-correo";

const OPERADOR = "operador@ejemplo.test";
const COMPRADOR = {
  nombre: "Comprador Sintetico",
  email: "comprador@ejemplo.test",
  idioma: "es",
};

const sala = {
  estado: "pendiente",
  intencion: null,
  inmueble: null,
  proyecto: {
    slug: "proyecto-sintetico",
    nombre: "Proyecto Sintetico",
    edicion: 9,
    franja: "sabado",
  },
  comprador: COMPRADOR,
  dueno: { nombre: "Equipo", email: null, idioma: "es" },
  horarios: [],
  visita: null,
};
const anuncio = {
  estado: "pendiente",
  intencion: "vivir",
  inmueble: {
    slug: "anuncio-sintetico",
    operacion: "venta",
    tipo: "apartamento",
    barrio: "Chapinero",
  },
  comprador: COMPRADOR,
  dueno: {
    nombre: "Dueno Sintetico",
    email: "dueno@ejemplo.test",
    idioma: "es",
  },
  horarios: [],
  visita: null,
};

const alOperador = () => enviados.filter((c) => c.para.email === OPERADOR);

beforeEach(() => {
  enviados.length = 0;
  process.env.OPERADOR_EMAIL = OPERADOR;
  process.env.NEXT_PUBLIC_APP_URL = "https://ejemplo.test";
});
afterEach(() => {
  delete process.env.OPERADOR_EMAIL;
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("avisarVisita — el aviso al operador por una sala nueva", () => {
  it("una solicitud nueva a una sala le llega al operador, con el proyecto y el panel, sin datos del comprador", async () => {
    datos = sala;
    await avisarVisita("solicitud", "sol-1");
    const aviso = alOperador();
    expect(aviso).toHaveLength(1);
    expect(aviso[0].asunto).toContain("Proyecto Sintetico");
    expect(aviso[0].html).toContain("https://ejemplo.test/operador/salas");
    expect(aviso[0].html).not.toContain(COMPRADOR.email);
    expect(aviso[0].html).not.toContain(COMPRADOR.nombre);
    // El comprador sigue recibiendo el suyo.
    expect(enviados.some((c) => c.para.email === COMPRADOR.email)).toBe(true);
  });

  it("sin operador definido no sale aviso al operador", async () => {
    delete process.env.OPERADOR_EMAIL;
    datos = sala;
    await avisarVisita("solicitud", "sol-1");
    expect(alOperador()).toHaveLength(0);
    expect(enviados.some((c) => c.para.email === COMPRADOR.email)).toBe(true);
  });

  it("un evento de la sala que no es la solicitud nueva no avisa al operador", async () => {
    datos = {
      ...sala,
      estado: "confirmada",
      visita: { inicio: "2026-11-07T15:00:00Z", cancelada_por: null },
    };
    await avisarVisita("confirmada", "sol-1");
    expect(alOperador()).toHaveLength(0);
  });

  it("la solicitud a un anuncio de un dueño no avisa al operador", async () => {
    datos = anuncio;
    await avisarVisita("solicitud", "sol-2");
    expect(alOperador()).toHaveLength(0);
    expect(enviados.some((c) => c.para.email === "dueno@ejemplo.test")).toBe(
      true,
    );
  });
});
