import { describe, expect, it } from "vitest";
import {
  accionesDeSesion,
  errorDeSesion,
  horarioDeSesion,
  puedePedirSesion,
  sesionAbierta,
  type EstadoSesion,
} from "@/engine/antifraude/sesion";
import { enlaceAlDueno, mensajeAlDueno } from "@/engine/antifraude/mensajes";
import { MI_ANUNCIO } from "@/textos/mi-anuncio";
import { OPERADOR } from "@/textos/operador";

// La sesión de fotos (S15, «fotos que venden»): qué puede hacer cada parte según el estado, la fecha que escribe el operador y los
// errores de la base. Datos 100 % sintéticos.
const ESTADOS: readonly EstadoSesion[] = [
  "solicitada",
  "agendada",
  "hecha",
  "cancelada",
];
// Un miércoles a mediodía de Bogotá (17:00 UTC).
const AHORA = new Date("2026-11-04T17:00:00Z");

describe("el estado de la sesión", () => {
  it("solo las pedidas y las agendadas están abiertas", () => {
    expect(ESTADOS.filter((e) => sesionAbierta(e))).toEqual([
      "solicitada",
      "agendada",
    ]);
    expect(sesionAbierta(null)).toBe(false);
    expect(sesionAbierta(undefined)).toBe(false);
  });

  it("el dueño pide una sesión si no tiene una abierta (una hecha o cancelada no lo impide)", () => {
    expect(puedePedirSesion(null)).toBe(true);
    expect(puedePedirSesion(undefined)).toBe(true);
    expect(puedePedirSesion({ estado: "solicitada" })).toBe(false);
    expect(puedePedirSesion({ estado: "agendada" })).toBe(false);
    expect(puedePedirSesion({ estado: "hecha" })).toBe(true);
    expect(puedePedirSesion({ estado: "cancelada" })).toBe(true);
  });

  it("el operador agenda la pedida, cambia o da por hecha la agendada y cancela cualquiera abierta", () => {
    expect(accionesDeSesion("solicitada")).toEqual({
      agendar: true,
      cambiar: false,
      hecha: false,
      cancelar: true,
    });
    expect(accionesDeSesion("agendada")).toEqual({
      agendar: false,
      cambiar: true,
      hecha: true,
      cancelar: true,
    });
    for (const cerrada of ["hecha", "cancelada"] as const) {
      expect(accionesDeSesion(cerrada)).toEqual({
        agendar: false,
        cambiar: false,
        hecha: false,
        cancelar: false,
      });
    }
  });
});

describe("la fecha que escribe el operador (hora de Bogotá)", () => {
  it("devuelve el instante en UTC", () => {
    expect(horarioDeSesion("2026-11-07", "10:00", AHORA)).toEqual({
      ok: true,
      iso: "2026-11-07T15:00:00.000Z",
    });
  });

  it("borde del anticipo: a más de una hora sirve, a una hora exacta no", () => {
    // AHORA = 12:00 en Bogotá.
    expect(horarioDeSesion("2026-11-04", "13:01", AHORA).ok).toBe(true);
    expect(horarioDeSesion("2026-11-04", "13:00", AHORA)).toEqual({
      ok: false,
      problema: "muy_pronto",
    });
  });

  it("borde del horizonte: 60 días sirve, uno más no", () => {
    expect(horarioDeSesion("2027-01-03", "12:00", AHORA).ok).toBe(true);
    expect(horarioDeSesion("2027-01-03", "12:01", AHORA)).toEqual({
      ok: false,
      problema: "muy_lejos",
    });
  });

  it("borde de la franja horaria: de 6:00 a 21:00", () => {
    expect(horarioDeSesion("2026-11-07", "06:00", AHORA).ok).toBe(true);
    expect(horarioDeSesion("2026-11-07", "21:00", AHORA).ok).toBe(true);
    expect(horarioDeSesion("2026-11-07", "05:59", AHORA)).toEqual({
      ok: false,
      problema: "fuera_de_hora",
    });
    expect(horarioDeSesion("2026-11-07", "21:01", AHORA)).toEqual({
      ok: false,
      problema: "fuera_de_hora",
    });
  });

  it("una fecha o una hora que no se puede leer es «invalido»", () => {
    for (const [fecha, hora] of [
      ["", ""],
      ["2026-11-07", ""],
      ["", "10:00"],
      ["2026-02-31", "10:00"],
      ["07/11/2026", "10:00"],
    ]) {
      expect(horarioDeSesion(fecha, hora, AHORA)).toEqual({
        ok: false,
        problema: "invalido",
      });
    }
  });
});

describe("los errores de la base a su frase", () => {
  it.each([
    [{ code: "23514", message: "ya_solicitada" }, "ya_solicitada"],
    [{ code: "23514", message: "demasiadas_sesiones" }, "demasiadas_sesiones"],
    [{ code: "P0002", message: "no_disponible" }, "no_disponible"],
    [{ code: "23514", message: "estado_invalido" }, "estado_invalido"],
  ])("%j → %s", (error, esperado) => {
    expect(errorDeSesion(error)).toBe(esperado);
  });

  it("lo que no se reconoce es «servidor» y jamás deja pasar el texto de la base", () => {
    for (const error of [
      {},
      { message: 'relation "sesiones_fotos" does not exist' },
      { code: "XX000", message: "algo raro" },
      // Códigos que existen para otras pantallas no son errores de la sesión.
      { code: "42501", message: "no_verificado" },
      { message: "token_invalido" },
      { code: "23514", message: "franja_invalida" },
    ]) {
      expect(errorDeSesion(error)).toBe("servidor");
    }
  });

  it("cada clave tiene su frase en el diccionario del dueño, en los dos idiomas", () => {
    for (const clave of [
      "ya_solicitada",
      "demasiadas_sesiones",
      "no_disponible",
      "estado_invalido",
      "servidor",
    ] as const) {
      const f = MI_ANUNCIO.sesionFotos.errores[clave];
      expect(f.es.length, clave).toBeGreaterThan(10);
      expect(f.en.length, clave).toBeGreaterThan(10);
    }
  });

  it("los problemas de la fecha tienen su frase en el panel", () => {
    for (const p of [
      "invalido",
      "muy_pronto",
      "muy_lejos",
      "fuera_de_hora",
    ] as const) {
      expect(OPERADOR.sesiones.problemas[p].es.length, p).toBeGreaterThan(10);
    }
  });
});

describe("lo que el operador le escribe al dueño de la sesión", () => {
  const dueno = { nombre: "Ana María Prueba", whatsapp: "+573001112233" };
  const anuncio = { tipo: "apartamento", barrio: "El Retiro" };

  it("la pedida lleva la franja que el dueño eligió, en su idioma", () => {
    const es = mensajeAlDueno(
      "sesionPedida",
      { ...dueno, idioma: "es" },
      anuncio,
      { franja: "Sábado" },
    );
    expect(es).toMatch(/^Hola Ana, /);
    expect(es).toContain("tu apartamento en El Retiro");
    expect(es).toContain("(franja: Sábado)");
    const en = mensajeAlDueno(
      "sesionPedida",
      { ...dueno, idioma: "en" },
      anuncio,
      { franja: "Saturday" },
    );
    expect(en).toContain("your apartment in El Retiro");
    expect(en).toContain("(slot: Saturday)");
  });

  it("la agendada dice cuándo y en qué hora, y no deja variables sin llenar", () => {
    const m = mensajeAlDueno(
      "sesionAgendada",
      { ...dueno, idioma: "es" },
      anuncio,
      { cuando: "sábado, 7 de noviembre, 10:00 a. m." },
    );
    expect(m).toContain("sábado, 7 de noviembre, 10:00 a. m. (hora de Bogotá)");
    expect(m).not.toMatch(/\{[a-z]+\}/);
  });

  it("la cancelada no pide variables extra y el enlace abre WhatsApp al número del dueño", () => {
    const url = enlaceAlDueno(
      "sesionCancelada",
      { ...dueno, idioma: "es" },
      anuncio,
    );
    expect(url.startsWith("https://wa.me/573001112233?text=")).toBe(true);
    const texto = decodeURIComponent(url.split("text=")[1]);
    expect(texto).toContain("Cancelamos la sesión de fotos");
    expect(texto).not.toMatch(/\{[a-z]+\}/);
  });

  it("el enlace con variables extra las lleva al texto", () => {
    const url = enlaceAlDueno(
      "sesionAgendada",
      { ...dueno, idioma: "en" },
      anuncio,
      { cuando: "Saturday, November 7, 10:00 AM" },
    );
    expect(decodeURIComponent(url.split("text=")[1])).toContain(
      "Saturday, November 7, 10:00 AM",
    );
  });
});
