// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DIAS_HABILES_SALA } from "@/engine/agenda/plazo-salas";
import {
  esDeSala,
  EVENTOS_VISITA,
  necesitaEnlaceComprador,
  planearCorreos,
  type DatosAnuncio,
  type DatosSala,
} from "@/engine/visita/avisos";

// S13 — los correos de la visita a la sala de ventas. Datos sintéticos; correos de dominio reservado. Solo el comprador recibe
// correo (el equipo trabaja desde el panel); ninguno lleva la dirección ni el teléfono de la sala.

const AHORA = new Date("2026-10-26T15:00:00Z"); // 10:00 de Bogotá
const MANANA = "2026-10-27T15:00:00Z";
const DIRECCION_SALA = "Carrera 7 # 71-21 Torre B";
const TELEFONO_SALA = "573000000000";

const sala = (cambios: Partial<DatosSala> = {}): DatosSala => ({
  estado: "confirmada",
  intencion: null,
  comprador: {
    nombre: "Camila <i>",
    email: "comprador@ejemplo.test",
    idioma: "es",
  },
  dueno: { nombre: "Innmobiliaria", email: null, idioma: "es" },
  inmueble: null,
  proyecto: {
    slug: "torre-alba-ficticia",
    nombre: "Torre Alba & Sol",
    edicion: 187,
    franja: "sabado",
  },
  horarios: ["2026-10-28T14:00:00Z", MANANA],
  visita: { inicio: MANANA, cancelada_por: null },
  ...cambios,
});

const ENLACES = {
  comprador: "https://app.ejemplo.test/visita#t=TOKEN",
  dueno: "https://app.ejemplo.test/mi-anuncio",
  ficha: "https://app.ejemplo.test/nuevos/torre-alba-ficticia",
  buscar: "https://app.ejemplo.test/buscar?v=nuevos",
};

describe("correos de la visita a una sala de ventas", () => {
  it.each([
    ["solicitud", 1],
    ["horarios", 1],
    ["ninguno", 0],
    ["confirmada", 1],
    ["cancelada_por_comprador", 0],
    ["cancelada_por_dueno", 1],
    ["rechazada", 1],
    ["recordatorio", 1],
  ] as const)(
    "%s: %s correo(s), siempre al comprador (el equipo no recibe correo)",
    (evento, cuantos) => {
      const correos = planearCorreos(evento, sala(), ENLACES, AHORA);
      expect(correos).toHaveLength(cuantos);
      for (const c of correos) {
        expect(c.para.email).toBe("comprador@ejemplo.test");
      }
    },
  );

  it("«aún sin respuesta» solo sale mientras la solicitud sigue pendiente", () => {
    const pendiente = sala({ estado: "pendiente", horarios: [], visita: null });
    expect(
      planearCorreos("sin_respuesta", pendiente, ENLACES, AHORA),
    ).toHaveLength(1);
    // Entre el reclamo y el envío el equipo pudo proponer horarios, rechazar o cancelar: ya hay respuesta, no se avisa.
    for (const estado of [
      "propuesta",
      "confirmada",
      "rechazada",
      "cancelada",
    ]) {
      expect(
        planearCorreos("sin_respuesta", sala({ estado }), ENLACES, AHORA),
        estado,
      ).toEqual([]);
    }
  });

  it("el «dos días hábiles» del correo es el plazo que de verdad corre el servidor", () => {
    expect(DIAS_HABILES_SALA).toBe(2);
    const [es] = planearCorreos(
      "solicitud",
      sala({ estado: "pendiente" }),
      ENLACES,
      AHORA,
    );
    const [en] = planearCorreos(
      "solicitud",
      sala({
        estado: "pendiente",
        comprador: { nombre: "Camila", email: "c@ejemplo.test", idioma: "en" },
      }),
      ENLACES,
      AHORA,
    );
    expect(es.html).toContain("dos días hábiles");
    expect(en.html).toContain("two business days");
    const [sinRespuesta] = planearCorreos(
      "sin_respuesta",
      sala({ estado: "pendiente" }),
      ENLACES,
      AHORA,
    );
    expect(sinRespuesta.html).toContain("dos días hábiles");
  });

  it("un recordatorio no sale si la visita se canceló entre el reclamo y el envío", () => {
    const cancelada = sala({
      estado: "cancelada",
      visita: { inicio: MANANA, cancelada_por: "dueno" },
    });
    expect(planearCorreos("recordatorio", cancelada, ENLACES, AHORA)).toEqual(
      [],
    );
    expect(
      planearCorreos("recordatorio", sala({ visita: null }), ENLACES, AHORA),
    ).toEqual([]);
  });

  it("quien no dejó correo no recibe nada", () => {
    const sin = sala({
      comprador: { nombre: "Camila", email: null, idioma: "es" },
    });
    for (const evento of EVENTOS_VISITA) {
      expect(planearCorreos(evento, sin, ENLACES, AHORA), evento).toEqual([]);
    }
  });

  it("ningún correo lleva la dirección ni el teléfono de la sala, ni aunque llegaran en los datos", () => {
    const conContacto = {
      ...sala(),
      sala: { telefono: TELEFONO_SALA, direccion: DIRECCION_SALA },
      direccion: DIRECCION_SALA,
      telefono: TELEFONO_SALA,
    } as DatosSala;
    for (const evento of EVENTOS_VISITA) {
      for (const c of planearCorreos(evento, conContacto, ENLACES, AHORA)) {
        expect(c.html + c.asunto, evento).not.toContain(DIRECCION_SALA);
        expect(c.html + c.asunto, evento).not.toContain(TELEFONO_SALA);
      }
    }
  });

  it("lo que viene de afuera se escapa en el HTML y el asunto es texto plano", () => {
    const [c] = planearCorreos("solicitud", sala(), ENLACES, AHORA);
    expect(c.html).toContain("Torre Alba &amp; Sol");
    expect(c.html).toContain("Camila &lt;i&gt;");
    expect(c.html).not.toContain("<i>");
    expect(c.asunto).toBe("Pediste una visita a Torre Alba & Sol");
    expect(c.asunto).not.toMatch(/[\r\n]/);
  });

  it("el correo sale en el idioma del comprador, con la franja que pidió y la hora de Bogotá", () => {
    const en = sala({
      estado: "pendiente",
      comprador: { nombre: "Camila", email: "c@ejemplo.test", idioma: "en" },
    });
    const [solicitud] = planearCorreos("solicitud", en, ENLACES, AHORA);
    expect(solicitud.asunto).toBe("You asked to visit Torre Alba & Sol");
    expect(solicitud.html).toContain("on Saturday");
    const [confirmada] = planearCorreos(
      "confirmada",
      { ...en, estado: "confirmada" },
      ENLACES,
      AHORA,
    );
    expect(confirmada.html).toContain("Bogotá time");
    expect(confirmada.html).toContain("on WhatsApp");
  });

  it("la dirección la manda el equipo por WhatsApp: el correo lo dice y no la trae", () => {
    const [c] = planearCorreos("confirmada", sala(), ENLACES, AHORA);
    expect(c.html).toContain("por WhatsApp");
    expect(c.html).toContain("Innmobiliaria te envía la dirección");
  });

  it("el enlace: a su solicitud, salvo el rechazo (la búsqueda de Nuevos) y la cancelación (la ficha del proyecto)", () => {
    const enlaceDe = (evento: (typeof EVENTOS_VISITA)[number], d = sala()) =>
      planearCorreos(evento, d, ENLACES, AHORA)[0]?.html ?? "";
    expect(enlaceDe("confirmada")).toContain(ENLACES.comprador);
    expect(enlaceDe("horarios")).toContain(ENLACES.comprador);
    expect(enlaceDe("recordatorio")).toContain(ENLACES.comprador);
    expect(enlaceDe("rechazada")).toContain(`href="${ENLACES.buscar}"`);
    expect(enlaceDe("cancelada_por_dueno")).toContain(ENLACES.ficha);
  });

  it("«necesitaEnlaceComprador» para una sala: solo los correos que llevan a SU solicitud piden un token", () => {
    const piden = EVENTOS_VISITA.filter((e) =>
      necesitaEnlaceComprador(e, true),
    );
    expect(piden).toEqual([
      "solicitud",
      "horarios",
      "confirmada",
      "recordatorio",
      "sin_respuesta",
    ]);
    // El mismo evento en un anuncio sigue como antes (y «sin_respuesta» no existe para un anuncio).
    expect(necesitaEnlaceComprador("sin_respuesta")).toBe(false);
    expect(necesitaEnlaceComprador("ninguno")).toBe(false);
  });

  it("«esDeSala» distingue las dos formas y un anuncio nunca recibe «sin_respuesta»", () => {
    const anuncio: DatosAnuncio = {
      estado: "pendiente",
      intencion: "vivir",
      comprador: { nombre: "Ana", email: "a@ejemplo.test", idioma: "es" },
      dueno: { nombre: "Luis", email: "l@ejemplo.test", idioma: "es" },
      inmueble: {
        slug: "apto-1",
        operacion: "venta",
        tipo: "apartamento",
        barrio: "Chapinero",
      },
      horarios: [],
      visita: null,
    };
    expect(esDeSala(anuncio)).toBe(false);
    expect(esDeSala(sala())).toBe(true);
    expect(planearCorreos("sin_respuesta", anuncio, ENLACES, AHORA)).toEqual(
      [],
    );
  });
});
