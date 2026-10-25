// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  HORAS_PROPUESTAS,
  etiquetaHora,
} from "@/engine/agenda/horas-propuestas";
import { esOperador } from "@/engine/operador/allowlist";
import {
  agruparSalas,
  enlaceWhatsApp,
  grupoDe,
  mensajeParaComprador,
  mensajeParaSala,
  venceDe,
} from "@/engine/visita/salas-operador";
import type { SolicitudSala } from "@/lib/supabase/types";
import { OPERADOR } from "@/textos/operador";

// S13 — la cola del operador, sus enlaces de WhatsApp y su allowlist. Datos sintéticos (nombres y números inventados).

const fila = (cambios: Partial<SolicitudSala> = {}): SolicitudSala => ({
  id: "00000000-0000-4000-8000-000000000001",
  estado: "pendiente",
  fecha: "2026-10-23T20:00:00Z", // viernes 3 p. m. en Bogotá
  franja: "sabado",
  sin_respuesta: false,
  ninguno: false,
  proyecto: {
    slug: "torre-alba-ficticia",
    nombre: "Torre Alba Ficticia",
    edicion: 187,
    constructora: null,
    paginas: [12, 13],
  },
  comprador: {
    nombre: "Camila",
    telefono_fin: "0000",
    identificado: false,
    idioma: "es",
  },
  horarios: [],
  visita: null,
  whatsapp: null,
  sala: null,
  ...cambios,
});

describe("enlaceWhatsApp", () => {
  it("un celular colombiano de 10 dígitos recibe el 57 y el mensaje va codificado", () => {
    expect(enlaceWhatsApp("3001234567", "Hola, ¿qué tal?")).toBe(
      `https://wa.me/573001234567?text=${encodeURIComponent("Hola, ¿qué tal?")}`,
    );
  });

  it("acepta otros números de 7 a 15 dígitos (un fijo, una línea de otro país) y limpia lo que no es dígito", () => {
    expect(enlaceWhatsApp("+57 (601) 555-0100", "x")).toBe(
      "https://wa.me/576015550100?text=x",
    );
    expect(enlaceWhatsApp("5550100", "x")).toBe("https://wa.me/5550100?text=x");
  });

  it.each([null, "", "123456", "1234567890123456", "abc"])(
    "%s no es un teléfono que sirva: sin enlace",
    (telefono) => {
      expect(enlaceWhatsApp(telefono, "x")).toBeNull();
    },
  );
});

describe("la cola: grupos y plazo", () => {
  it.each([
    ["pendiente", false, "por_atender"],
    ["propuesta", false, "con_horarios"],
    ["propuesta", true, "por_atender"],
    ["confirmada", false, "confirmadas"],
    ["rechazada", false, "cerradas"],
    ["cancelada", false, "cerradas"],
  ] as const)("%s (ninguno: %s) → %s", (estado, ninguno, grupo) => {
    expect(grupoDe({ estado, ninguno })).toBe(grupo);
  });

  it("agrupa en el orden de la cola, conserva el orden de la base y omite los grupos vacíos", () => {
    const a = fila({ id: "a", estado: "confirmada" });
    const b = fila({ id: "b", estado: "pendiente" });
    const c = fila({ id: "c", estado: "pendiente" });
    const d = fila({ id: "d", estado: "rechazada" });
    expect(
      agruparSalas([a, b, c, d]).map((g) => [
        g.grupo,
        g.filas.map((x) => x.id),
      ]),
    ).toEqual([
      ["por_atender", ["b", "c"]],
      ["confirmadas", ["a"]],
      ["cerradas", ["d"]],
    ]);
    expect(agruparSalas([])).toEqual([]);
  });

  it("el plazo de la sala corre solo mientras la solicitud está pendiente (dos días hábiles: el viernes 3 p. m. vence el martes 3 p. m.)", () => {
    expect(venceDe(fila())?.toISOString()).toBe("2026-10-27T20:00:00.000Z");
    expect(venceDe(fila({ estado: "propuesta" }))).toBeNull();
    expect(venceDe(fila({ ninguno: true }))).toBeNull();
    expect(venceDe(fila({ estado: "confirmada" }))).toBeNull();
  });
});

describe("los mensajes de WhatsApp", () => {
  it("el mensaje a la sala sale en español, nombra el proyecto y la franja y NO lleva ningún dato del comprador", () => {
    const m = mensajeParaSala(OPERADOR.salas.mensajes.sala, {
      proyecto: "Torre Alba Ficticia",
      franja: "sábado",
    });
    expect(m).toContain("Torre Alba Ficticia");
    expect(m).toContain("sábado");
    expect(m).toMatch(/^Hola, te escribo de Innmobiliaria/);
    // Nada del comprador: ni su nombre ni sus dígitos.
    expect(m).not.toContain("Camila");
    expect(m).not.toContain("0000");
    expect(m).not.toMatch(/\{/);
  });

  it("el mensaje al comprador va en SU idioma, con la hora de Bogotá y la dirección que guardó el operador", () => {
    const datos = {
      nombre: "Camila",
      proyecto: "Torre Alba Ficticia",
      inicio: "2026-10-31T15:00:00Z",
      direccion: "Carrera 1 # 2-3 (dirección de prueba)",
    };
    const es = mensajeParaComprador(OPERADOR.salas.mensajes.comprador, {
      ...datos,
      idioma: "es",
    });
    const en = mensajeParaComprador(OPERADOR.salas.mensajes.comprador, {
      ...datos,
      idioma: "en",
    });
    expect(es).toContain("Hola Camila");
    expect(es).toContain("hora de Bogotá");
    expect(es).toContain("Carrera 1 # 2-3 (dirección de prueba)");
    expect(en).toContain("Hi Camila");
    expect(en).toContain("Bogotá time");
    expect(en).toContain("Carrera 1 # 2-3 (dirección de prueba)");
    expect(`${es}${en}`).not.toMatch(/\{/);
  });

  it("sin la dirección guardada no hay mensaje al comprador (el panel pide guardarla; no se envía a medias)", () => {
    expect(
      mensajeParaComprador(OPERADOR.salas.mensajes.comprador, {
        nombre: "Camila",
        proyecto: "Torre Alba Ficticia",
        inicio: "2026-10-31T15:00:00Z",
        direccion: null,
        idioma: "es",
      }),
    ).toBeNull();
  });
});

describe("esOperador: la allowlist", () => {
  it("solo el correo de la allowlist, sin distinguir mayúsculas", () => {
    expect(esOperador("Operador@Ejemplo.test", "operador@ejemplo.test")).toBe(
      true,
    );
    expect(esOperador("otro@ejemplo.test", "operador@ejemplo.test")).toBe(
      false,
    );
  });

  it.each([
    [null, "operador@ejemplo.test"],
    [undefined, "operador@ejemplo.test"],
    ["", "operador@ejemplo.test"],
    ["operador@ejemplo.test", undefined],
    ["operador@ejemplo.test", ""],
    [undefined, undefined],
  ])("sin sesión o sin allowlist (%s, %s) nadie entra", (correo, lista) => {
    expect(esOperador(correo, lista)).toBe(false);
  });
});

describe("las horas que se pueden proponer", () => {
  it("de 6:00 a 21:00 cada media hora, con su etiqueta en cada idioma", () => {
    expect(HORAS_PROPUESTAS[0]).toBe("06:00");
    expect(HORAS_PROPUESTAS.at(-1)).toBe("21:00");
    expect(HORAS_PROPUESTAS).toHaveLength(31);
    expect(etiquetaHora("14:30", "en")).toMatch(/2:30\s?PM/i);
    expect(etiquetaHora("14:30", "es")).toMatch(/2:30/);
  });
});
