// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  diasHasta,
  formatearHorario,
  hoyBogota,
  instanteDeBogota,
  minutoDelDia,
  partesBogota,
} from "@/engine/agenda/bogota";
import {
  accionesComprador,
  accionesDueno,
  estaViva,
} from "@/engine/agenda/estados";
import { validarHorarios } from "@/engine/agenda/horarios";
import { escaparTexto, generarIcs, plegar } from "@/engine/agenda/ics";

// S8 — la agenda en hora de Bogotá (UTC−5 fijo). La fecha de consulta es una perilla, nunca el reloj.

const AHORA = new Date("2026-10-18T15:00:00Z"); // 10:00 de Bogotá

describe("hora de Bogotá", () => {
  it("convierte en los dos sentidos, también cruzando la medianoche UTC", () => {
    expect(partesBogota(new Date("2026-10-19T03:30:00Z"))).toEqual({
      fecha: "2026-10-18",
      hora: "22:30",
    });
    expect(instanteDeBogota("2026-10-18", "22:30")?.toISOString()).toBe(
      "2026-10-19T03:30:00.000Z",
    );
    expect(hoyBogota(new Date("2026-10-19T04:59:00Z"))).toBe("2026-10-18");
    expect(hoyBogota(new Date("2026-10-19T05:00:00Z"))).toBe("2026-10-19");
  });

  it("rechaza fechas y horas inválidas", () => {
    expect(instanteDeBogota("2026-02-30", "10:00")).toBeNull();
    expect(instanteDeBogota("2026-10-18", "24:00")).toBeNull();
    expect(instanteDeBogota("18/10/2026", "10:00")).toBeNull();
    expect(instanteDeBogota("2026-10-18", "9:00")).toBeNull();
  });

  it("minuto del día y días de calendario hasta una fecha", () => {
    expect(minutoDelDia(new Date("2026-10-18T15:30:00Z"))).toBe(10 * 60 + 30);
    expect(diasHasta(new Date("2026-10-19T14:00:00Z"), AHORA)).toBe(1);
    expect(diasHasta(new Date("2026-10-18T23:00:00Z"), AHORA)).toBe(0);
    // 23:30 de Bogotá de hoy es todavía «hoy» aunque en UTC ya sea mañana.
    expect(diasHasta(new Date("2026-10-19T04:30:00Z"), AHORA)).toBe(0);
  });

  it("formatea en hora de Bogotá en los dos idiomas", () => {
    const es = formatearHorario("2026-10-25T15:00:00Z", "es");
    const en = formatearHorario("2026-10-25T15:00:00Z", "en");
    expect(es).toMatch(/domingo/i);
    expect(es).toMatch(/25/);
    expect(es).toMatch(/10:00/);
    expect(en).toMatch(/Sunday/);
    expect(en).toMatch(/10:00/);
  });
});

describe("validarHorarios", () => {
  const h = (fecha: string, hora: string) => ({ fecha, hora });

  it("acepta de 1 a 3, los ordena y los devuelve en UTC", () => {
    expect(
      validarHorarios(
        [h("2026-10-21", "15:00"), h("2026-10-20", "09:30")],
        AHORA,
      ),
    ).toEqual({
      ok: true,
      horarios: ["2026-10-20T14:30:00.000Z", "2026-10-21T20:00:00.000Z"],
    });
  });

  it.each([
    [[], "ninguno"],
    [
      [
        h("2026-10-20", "09:00"),
        h("2026-10-21", "09:00"),
        h("2026-10-22", "09:00"),
        h("2026-10-23", "09:00"),
      ],
      "demasiados",
    ],
    [[h("2026-10-20", "9:00")], "invalido"],
    [[h("2026-10-20", "09:00"), h("2026-10-20", "09:00")], "repetidos"],
    [[h("2026-10-18", "10:30")], "muy_pronto"], // media hora después de AHORA
    [[h("2026-10-17", "10:00")], "muy_pronto"],
    [[h("2026-12-20", "10:00")], "muy_lejos"],
    [[h("2026-10-20", "05:30")], "fuera_de_hora"],
    [[h("2026-10-20", "21:30")], "fuera_de_hora"],
  ])("%j ⇒ %s", (pedidos, problema) => {
    expect(validarHorarios(pedidos, AHORA)).toEqual({ ok: false, problema });
  });

  it("los bordes de la franja (6:00 y 21:00) y una hora y un minuto después de ahora valen", () => {
    expect(
      validarHorarios(
        [h("2026-10-20", "06:00"), h("2026-10-20", "21:00")],
        AHORA,
      ).ok,
    ).toBe(true);
    expect(validarHorarios([h("2026-10-18", "11:01")], AHORA).ok).toBe(true);
  });
});

describe(".ics", () => {
  const evento = {
    uid: "visita-abc@innmobiliaria",
    inicio: "2026-10-25T15:00:00Z",
    titulo: "Visita: apartamento en Los Rosales",
    descripcion: "Con Ana; la dirección, por WhatsApp.\nLleva tu cédula",
  };
  const ics = generarIcs(evento, AHORA);

  it("es un VCALENDAR con VTIMEZONE de Bogotá y líneas CRLF", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VTIMEZONE\r\nTZID:America/Bogota");
    expect(ics).toContain("TZOFFSETTO:-0500");
    expect(
      ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75),
    ).toBe(true);
  });

  it("leído de vuelta, la visita es a las 10:00 de Bogotá y dura una hora", () => {
    const desplegado = ics.replace(/\r\n /g, "");
    expect(desplegado).toMatch(
      /DTSTART;TZID=America\/Bogota:20261025T100000\r\n/,
    );
    expect(desplegado).toMatch(
      /DTEND;TZID=America\/Bogota:20261025T110000\r\n/,
    );
    expect(desplegado).toMatch(/DTSTAMP:20261018T150000Z\r\n/);
    expect(desplegado).toContain("UID:visita-abc@innmobiliaria");
  });

  it("escapa comas, punto y coma, barras y saltos de línea", () => {
    expect(escaparTexto("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    expect(ics.replace(/\r\n /g, "")).toContain(
      "DESCRIPTION:Con Ana\\; la dirección\\, por WhatsApp.\\nLleva tu cédula",
    );
  });

  it("pliega a 75 octetos sin partir una tilde", () => {
    const larga = "SUMMARY:" + "á".repeat(80);
    const plegada = plegar(larga);
    for (const l of plegada.split("\r\n")) {
      expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    }
    expect(plegada.replace(/\r\n /g, "")).toBe(larga);
  });

  it("una duración distinta mueve el final", () => {
    expect(generarIcs({ ...evento, duracionMin: 30 }, AHORA)).toContain(
      "T103000",
    );
  });
});

describe("qué botones ve cada quien", () => {
  const futura = { inicio: "2026-10-20T15:00:00Z", cancelada_por: null };
  const pasada = { inicio: "2026-10-17T15:00:00Z", cancelada_por: null };

  it("el dueño", () => {
    expect(accionesDueno({ estado: "en_espera", visita: null }, AHORA)).toEqual(
      {
        aceptar: true,
        proponer: false,
        rechazar: true,
        cancelar: false,
        marcar: false,
      },
    );
    expect(
      accionesDueno({ estado: "propuesta", visita: null }, AHORA),
    ).toMatchObject({
      proponer: true,
      rechazar: true,
    });
    expect(
      accionesDueno({ estado: "confirmada", visita: futura }, AHORA),
    ).toMatchObject({
      cancelar: true,
      marcar: false,
      rechazar: false,
    });
    expect(
      accionesDueno({ estado: "confirmada", visita: pasada }, AHORA),
    ).toMatchObject({
      cancelar: false,
      marcar: true,
    });
    expect(
      accionesDueno(
        {
          estado: "cancelada",
          visita: { ...futura, cancelada_por: "comprador" },
        },
        AHORA,
      ),
    ).toEqual({
      aceptar: false,
      proponer: false,
      rechazar: false,
      cancelar: false,
      marcar: false,
    });
  });

  it("el comprador", () => {
    expect(
      accionesComprador(
        { estado: "propuesta", visita: null, horarios: [{}] },
        AHORA,
      ),
    ).toEqual({
      elegir: true,
      cancelar: true,
      calendario: false,
    });
    expect(
      accionesComprador(
        { estado: "propuesta", visita: null, horarios: [] },
        AHORA,
      ).elegir,
    ).toBe(false);
    expect(
      accionesComprador(
        { estado: "confirmada", visita: futura, horarios: [] },
        AHORA,
      ),
    ).toEqual({
      elegir: false,
      cancelar: true,
      calendario: true,
    });
    expect(
      accionesComprador(
        { estado: "confirmada", visita: pasada, horarios: [] },
        AHORA,
      ),
    ).toEqual({
      elegir: false,
      cancelar: false,
      calendario: false,
    });
    expect(
      accionesComprador(
        { estado: "rechazada", visita: null, horarios: [] },
        AHORA,
      ).cancelar,
    ).toBe(false);
  });

  it("vivas y terminadas", () => {
    expect(estaViva("pendiente")).toBe(true);
    expect(estaViva("cancelada")).toBe(false);
  });
});

describe("el día antes y el día de la visita", () => {
  it("el recordatorio cae el día de la semana anterior, en hora de Bogotá", async () => {
    const { diaAntes, formatearDia } = await import("@/engine/agenda/bogota");
    // Sábado 24 de octubre de 2026, 10:00 de Bogotá.
    expect(diaAntes("2026-10-24T15:00:00Z", "es")).toBe("viernes");
    expect(diaAntes("2026-10-24T15:00:00Z", "en")).toBe("Friday");
    // 00:30 de Bogotá del sábado sigue siendo «viernes» el día antes (en UTC ya es 05:30 del sábado).
    expect(diaAntes("2026-10-24T05:30:00Z", "es")).toBe("viernes");
    expect(formatearDia("2026-10-24T15:00:00Z", "es")).toMatch(
      /sábado.*24.*octubre/i,
    );
    expect(formatearDia("2026-10-24T15:00:00Z", "en")).toMatch(
      /Saturday.*October/,
    );
  });
});
