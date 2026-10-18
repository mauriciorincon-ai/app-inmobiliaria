// @vitest-environment node
import { describe, expect, it } from "vitest";
import { autorizadoCron } from "@/engine/cron/autorizacion";
import { peticionCron, RUTA_CRON } from "@/engine/cron/peticion";
import {
  EVENTOS_VISITA,
  necesitaEnlaceComprador,
  planearCorreos,
  type DatosSolicitud,
} from "@/engine/visita/avisos";
import { armarCorreo } from "@/engine/visita/correos";
import { respuestaDeError } from "@/engine/visita/errores";

// S8 — los correos de la visita y la puerta del cron. Datos sintéticos; correos de dominio reservado.

const AHORA = new Date("2026-10-18T15:00:00Z"); // 10:00 de Bogotá
const MANANA = "2026-10-19T15:00:00Z";
const DIRECCION = "Calle 93 # 14-20";

const datos = (cambios: Partial<DatosSolicitud> = {}): DatosSolicitud => ({
  estado: "confirmada",
  intencion: "vivir",
  comprador: {
    nombre: "Andrés <script>",
    email: "comprador@ejemplo.test",
    idioma: "es",
  },
  dueno: { nombre: "Ana & Co", email: "dueno@ejemplo.test", idioma: "en" },
  inmueble: {
    slug: "apto-rosales-1a2b3c",
    operacion: "venta",
    tipo: "apartamento",
    barrio: "Los Rosales",
  },
  horarios: ["2026-10-20T14:00:00Z", MANANA],
  visita: { inicio: MANANA, cancelada_por: null },
  ...cambios,
});

const ENLACES = {
  comprador: "https://app.ejemplo.test/visita#t=TOKEN",
  dueno: "https://app.ejemplo.test/mi-anuncio",
  ficha: "https://app.ejemplo.test/i/apto-rosales-1a2b3c",
  buscar: "https://app.ejemplo.test/buscar",
};

describe("planearCorreos: quién recibe qué", () => {
  it.each([
    ["solicitud", ["dueno@ejemplo.test", "comprador@ejemplo.test"]],
    ["horarios", ["comprador@ejemplo.test"]],
    ["ninguno", ["dueno@ejemplo.test"]],
    ["confirmada", ["comprador@ejemplo.test", "dueno@ejemplo.test"]],
    ["cancelada_por_comprador", ["dueno@ejemplo.test"]],
    ["cancelada_por_dueno", ["comprador@ejemplo.test"]],
    ["rechazada", ["comprador@ejemplo.test"]],
    ["recordatorio", ["comprador@ejemplo.test", "dueno@ejemplo.test"]],
  ] as const)("%s", (evento, para) => {
    expect(
      planearCorreos(evento, datos(), ENLACES, AHORA).map((c) => c.para.email),
    ).toEqual(para);
  });

  it("un recordatorio no sale si la visita se canceló entre el reclamo y el envío", () => {
    const cancelada = datos({
      estado: "cancelada",
      visita: { inicio: MANANA, cancelada_por: "comprador" },
    });
    expect(planearCorreos("recordatorio", cancelada, ENLACES, AHORA)).toEqual(
      [],
    );
    const sinVisita = datos({ visita: null });
    expect(planearCorreos("recordatorio", sinVisita, ENLACES, AHORA)).toEqual(
      [],
    );
    // La misma visita, vigente, sí avisa a los dos.
    expect(
      planearCorreos("recordatorio", datos(), ENLACES, AHORA),
    ).toHaveLength(2);
  });

  it("quien no dejó correo no recibe nada (el dueño puede no tenerlo)", () => {
    const sin = datos({ dueno: { nombre: "Ana", email: null, idioma: "es" } });
    expect(
      planearCorreos("solicitud", sin, ENLACES, AHORA).map((c) => c.para.email),
    ).toEqual(["comprador@ejemplo.test"]);
  });

  it("ningún correo lleva la dirección, ni aunque llegara en los datos, ni el correo del otro", () => {
    const conDireccion = {
      ...datos(),
      direccion_aproximada: DIRECCION,
    } as DatosSolicitud;
    for (const evento of EVENTOS_VISITA) {
      for (const c of planearCorreos(evento, conDireccion, ENLACES, AHORA)) {
        expect(c.html + c.asunto, evento).not.toContain(DIRECCION);
        const otro =
          c.para.email === "dueno@ejemplo.test"
            ? "comprador@ejemplo.test"
            : "dueno@ejemplo.test";
        expect(c.html, evento).not.toContain(otro);
      }
    }
  });

  it("cada uno en su idioma: el comprador en español, el dueño en inglés", () => {
    const [comprador, dueno] = planearCorreos(
      "confirmada",
      datos(),
      ENLACES,
      AHORA,
    );
    expect(comprador.asunto).toMatch(/^Visita confirmada/);
    expect(comprador.html).toContain("hora de Bogotá");
    expect(dueno.asunto).toMatch(/confirmed the viewing/);
    expect(dueno.html).toContain("Bogotá time");
  });

  it("el enlace: el comprador a su solicitud, el dueño a Mi anuncio; rechazo a la búsqueda, cancelación a la ficha", () => {
    const [c, d] = planearCorreos("confirmada", datos(), ENLACES, AHORA);
    expect(c.html).toContain(ENLACES.comprador);
    expect(d.html).toContain(ENLACES.dueno);
    expect(
      planearCorreos("rechazada", datos(), ENLACES, AHORA)[0].html,
    ).toContain(ENLACES.buscar);
    expect(
      planearCorreos("cancelada_por_dueno", datos(), ENLACES, AHORA)[0].html,
    ).toContain(ENLACES.ficha);
  });

  it("solo pide un enlace nuevo para el comprador cuando un correo lo lleva a su solicitud", () => {
    expect(necesitaEnlaceComprador("horarios")).toBe(true);
    expect(necesitaEnlaceComprador("recordatorio")).toBe(true);
    expect(necesitaEnlaceComprador("rechazada")).toBe(false);
    expect(necesitaEnlaceComprador("cancelada_por_dueno")).toBe(false);
    expect(necesitaEnlaceComprador("ninguno")).toBe(false);
  });

  it("un idioma raro cae en español", () => {
    const raro = datos({
      comprador: { nombre: "Bo", email: "c@ejemplo.test", idioma: "fr" },
    });
    expect(planearCorreos("horarios", raro, ENLACES, AHORA)[0].asunto).toMatch(
      /propuso horarios/,
    );
  });
});

describe("armarCorreo", () => {
  const base = {
    comprador: "Andrés <script>",
    dueno: "Ana & Co",
    tipo: "apartamento",
    barrio: "Los <Rosales>",
    intencion: "invertir" as const,
    horarios: ["2026-10-20T14:00:00Z"],
    inicio: MANANA,
    enEspera: false,
  };

  it("escapa los nombres y el barrio en el HTML; el asunto es texto plano", () => {
    const c = armarCorreo("solicitudDueno", base, "es", ENLACES.dueno, AHORA);
    expect(c.html).toContain("Andrés &lt;script&gt;");
    expect(c.html).toContain("Los &lt;Rosales&gt;");
    expect(c.html).not.toContain("<script>");
    expect(c.html).toContain("para invertir");
    expect(c.asunto).toBe(
      "Andrés <script> quiere visitar tu apartamento en Los <Rosales>",
    );
    expect(c.html).toMatch(/^<p>Hola Ana &amp; Co,<\/p>/);
  });

  it("en espera suma el párrafo para los dos", () => {
    const enEspera = { ...base, enEspera: true };
    expect(
      armarCorreo("solicitudDueno", enEspera, "es", "x", AHORA).html,
    ).toContain("en espera");
    expect(
      armarCorreo("solicitudComprador", enEspera, "en", "x", AHORA).html,
    ).toContain("on hold");
  });

  it("los horarios propuestos van en lista, en hora de Bogotá", () => {
    const c = armarCorreo("horarios", base, "es", "x", AHORA);
    expect(c.html).toMatch(/<ul><li>[^<]*9:00[^<]*<\/li><\/ul>/);
  });

  it("el recordatorio dice «Mañana» o «Hoy» según la fecha de Bogotá", () => {
    expect(
      armarCorreo("recordatorioComprador", base, "es", "x", AHORA).asunto,
    ).toMatch(/^Mañana/);
    const hoy = { ...base, inicio: "2026-10-18T22:00:00Z" };
    expect(
      armarCorreo("recordatorioDueno", hoy, "en", "x", AHORA).asunto,
    ).toMatch(/^Today/);
  });

  it("la cancelación al dueño cambia si había horario o no", () => {
    expect(
      armarCorreo("canceladaParaDueno", base, "es", "x", AHORA).html,
    ).toContain("canceló la visita");
    expect(
      armarCorreo(
        "canceladaParaDueno",
        { ...base, inicio: null },
        "es",
        "x",
        AHORA,
      ).html,
    ).toContain("retiró su solicitud");
  });

  it("un tipo de inmueble desconocido se nombra como «inmueble»", () => {
    expect(
      armarCorreo("ninguno", { ...base, tipo: "bodega" }, "es", "x", AHORA)
        .html,
    ).toContain("inmueble en Los");
  });

  it("el asunto no lleva saltos de línea aunque el nombre los traiga", () => {
    const c = armarCorreo(
      "solicitudDueno",
      { ...base, comprador: "Andrés\r\nBcc: x" },
      "es",
      "x",
      AHORA,
    );
    expect(c.asunto).not.toMatch(/[\r\n]/);
  });
});

describe("errores de las RPC a HTTP", () => {
  it.each([
    [{ code: "42501", message: "no_verificado" }, 403, "no_verificado"],
    [{ code: "42501", message: "permission denied" }, 403, "no_verificado"],
    [{ code: "P0001", message: "token_invalido" }, 403, "token_invalido"],
    [{ code: "P0002", message: "no_disponible" }, 404, "no_disponible"],
    [{ code: "23514", message: "email_invalido" }, 400, "email_invalido"],
    [
      { code: "23514", message: "horarios_invalidos" },
      400,
      "horarios_invalidos",
    ],
    [{ code: "23514", message: "ya_solicitada" }, 409, "ya_solicitada"],
    [{ code: "23514", message: "visita_futura" }, 409, "visita_futura"],
    [{ code: "XX000", message: "algo raro" }, 500, "servidor"],
    [{}, 500, "servidor"],
  ])("%j ⇒ %i %s", (error, status, codigo) => {
    expect(respuestaDeError(error)).toEqual({ status, codigo });
  });
});

describe("la puerta del cron", () => {
  const SECRETO = "s".repeat(32);

  it("abre solo con el bearer exacto", () => {
    expect(autorizadoCron(`Bearer ${SECRETO}`, SECRETO)).toBe(true);
    expect(autorizadoCron(`Bearer ${SECRETO}x`, SECRETO)).toBe(false);
    expect(autorizadoCron(SECRETO, SECRETO)).toBe(false);
    expect(autorizadoCron(null, SECRETO)).toBe(false);
  });

  it("sin secreto, o con uno corto, no abre nunca", () => {
    expect(autorizadoCron("Bearer ", "")).toBe(false);
    expect(autorizadoCron("Bearer corto", "corto")).toBe(false);
    expect(autorizadoCron(`Bearer ${SECRETO}`, undefined)).toBe(false);
  });

  it("la petición del Worker es un POST a la ruta del cron con el bearer, que la puerta acepta", () => {
    const req = peticionCron(SECRETO, "https://cron.innmobiliaria.invalid");
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe(RUTA_CRON);
    expect(autorizadoCron(req.headers.get("authorization"), SECRETO)).toBe(
      true,
    );
  });
});
