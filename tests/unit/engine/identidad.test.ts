// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  esFechaReal,
  nombresCoinciden,
  normalizarCedula,
  normalizarNombre,
  validarDatosIdentidad,
} from "@/engine/identidad/datos";
import {
  identificar,
  respuestaSinReserva,
  type OperacionesIdentidad,
  type Reserva,
} from "@/engine/identidad/flujo";
import {
  CEDULAS_PRUEBA,
  formularioDidit,
  interpretarDidit,
  simular,
} from "@/engine/identidad/proveedor";
import { TOPES_IDENTIDAD, topesEfectivos } from "@/engine/identidad/topes";

// S8 — identificarse con la cédula. Datos 100 % sintéticos: las cédulas son las de prueba del simulador y
// los nombres son inventados.

const HOY = "2026-10-18";
const BIEN = {
  cedula: "1.000.000.001",
  fechaExpedicion: "2010-05-20",
  nombre: "  Laura   Sintetica Prueba ",
  consentimiento: true,
};

describe("validarDatosIdentidad", () => {
  it("acepta y normaliza: sin puntos en la cédula, espacios colapsados en el nombre", () => {
    expect(validarDatosIdentidad(BIEN, HOY)).toEqual({
      ok: true,
      datos: {
        cedula: "1000000001",
        fechaExpedicion: "2010-05-20",
        nombre: "Laura Sintetica Prueba",
      },
    });
  });

  it("sin consentimiento no hay datos", () => {
    expect(
      validarDatosIdentidad({ ...BIEN, consentimiento: false }, HOY),
    ).toEqual({
      ok: false,
      campo: "consentimiento",
    });
    expect(validarDatosIdentidad(null, HOY)).toEqual({
      ok: false,
      campo: "consentimiento",
    });
  });

  it.each([
    [{ cedula: "12345" }, "cedula"],
    [{ cedula: "12345678901" }, "cedula"],
    [{ cedula: "10a0000001" }, "cedula"],
    [{ cedula: 1000000001 }, "cedula"],
    [{ fechaExpedicion: "2026-10-19" }, "fechaExpedicion"], // futura
    [{ fechaExpedicion: "1939-12-31" }, "fechaExpedicion"],
    [{ fechaExpedicion: "2010-02-30" }, "fechaExpedicion"],
    [{ fechaExpedicion: "20-05-2010" }, "fechaExpedicion"],
    [{ nombre: "Laura" }, "nombre"], // una sola palabra
    [{ nombre: "A   B" }, "nombre"],
    [{ nombre: "Laura <b>Sintetica</b>" }, "nombre"],
    [{ nombre: "Laura 123" }, "nombre"],
    [{ nombre: 7 }, "nombre"],
  ])("rechaza %j en el campo %s", (cambio, campo) => {
    expect(validarDatosIdentidad({ ...BIEN, ...cambio }, HOY)).toEqual({
      ok: false,
      campo,
    });
  });

  it("acepta hoy como fecha de expedición y nombres con tilde, eñe, apóstrofo y guion", () => {
    const r = validarDatosIdentidad(
      { ...BIEN, fechaExpedicion: HOY, nombre: "María José Núñez-O'Neill" },
      HOY,
    );
    expect(r.ok).toBe(true);
  });
});

describe("fechas y nombres", () => {
  it("esFechaReal distingue el 29 de febrero bisiesto", () => {
    expect(esFechaReal("2024-02-29")).toBe(true);
    expect(esFechaReal("2023-02-29")).toBe(false);
    expect(esFechaReal("2024-13-01")).toBe(false);
  });

  it("normaliza cédula y nombre", () => {
    expect(normalizarCedula("1 000-000.001")).toBe("1000000001");
    expect(normalizarNombre("  JOSÉ  Ñúñez-Ruiz O'Neill ")).toBe(
      "jose nunez ruiz oneill",
    );
  });

  it("los nombres coinciden con las mismas palabras en cualquier orden, ni una más ni una menos", () => {
    expect(nombresCoinciden("Laura Gómez Ruiz", "LAURA GOMEZ RUIZ")).toBe(true);
    expect(nombresCoinciden("Gómez Ruiz Laura", "laura gomez ruiz")).toBe(true);
    expect(nombresCoinciden("Laura Gómez", "LAURA GOMEZ RUIZ")).toBe(false);
    expect(
      nombresCoinciden("Laura Marcela Gómez Ruiz", "LAURA GOMEZ RUIZ"),
    ).toBe(false);
    expect(nombresCoinciden("", "")).toBe(false);
  });
});

describe("simulador", () => {
  const datos = {
    cedula: "",
    fechaExpedicion: "2010-05-20",
    nombre: "Laura Sintetica",
  };
  it("una cédula de prueba por estado; cualquier otra no coincide", () => {
    expect(simular({ ...datos, cedula: CEDULAS_PRUEBA.identificado })).toBe(
      "identificado",
    );
    expect(simular({ ...datos, cedula: CEDULAS_PRUEBA.no_coincide })).toBe(
      "no_coincide",
    );
    expect(simular({ ...datos, cedula: CEDULAS_PRUEBA.no_disponible })).toBe(
      "no_disponible",
    );
    expect(simular({ ...datos, cedula: "52000000" })).toBe("no_coincide");
  });
});

describe("Didit: lo que se manda y cómo se lee la respuesta", () => {
  const datos = {
    cedula: "1000000001",
    fechaExpedicion: "2010-05-20",
    nombre: "Laura Sintetica Prueba",
  };

  it("el formulario lleva país, servicio, número y fecha; el nombre NO viaja", () => {
    const f = formularioDidit(datos);
    expect(f).toEqual({
      issuing_state: "COL",
      services: "col_cedula",
      personal_number: "1000000001",
      date_of_issue: "2010-05-20",
    });
    expect(JSON.stringify(f)).not.toContain("Laura");
  });

  // Respuestas con la forma documentada por Didit (datos inventados).
  const respuesta = (outcome: string, nombres?: [string, string]) => ({
    request_id: "req-sintetico",
    status: "Approved",
    issuing_state: "COL",
    match_type: "full_match",
    validations: [
      {
        outcome_code: outcome,
        service_id: "col_cedula",
        service_name: "Colombia",
        source_data: nombres
          ? {
              first_name: nombres[0],
              last_name: nombres[1],
              cedula_status: "VIGENTE",
            }
          : null,
      },
    ],
  });

  it("MATCH con el mismo nombre identifica; con otro nombre no coincide", () => {
    expect(
      interpretarDidit(
        200,
        respuesta("MATCH", ["LAURA", "SINTETICA PRUEBA"]),
        datos.nombre,
      ),
    ).toBe("identificado");
    expect(
      interpretarDidit(
        200,
        respuesta("MATCH", ["LAURA", "OTRA PERSONA"]),
        datos.nombre,
      ),
    ).toBe("no_coincide");
  });

  it("MATCH sin nombres del registro no se da por bueno: no disponible", () => {
    expect(interpretarDidit(200, respuesta("MATCH"), datos.nombre)).toBe(
      "no_disponible",
    );
  });

  it.each([
    ["NO_MATCH", "no_coincide"],
    ["DOCUMENT_NOT_FOUND", "no_coincide"],
    ["PARTIAL_MATCH", "no_coincide"],
    ["INCONCLUSIVE", "no_disponible"],
    ["ALGO_NUEVO", "no_disponible"],
  ])("%s ⇒ %s", (outcome, esperado) => {
    expect(
      interpretarDidit(
        200,
        respuesta(outcome, ["LAURA", "SINTETICA PRUEBA"]),
        datos.nombre,
      ),
    ).toBe(esperado);
  });

  it("un HTTP que no es 200 o un cuerpo que no se entiende: no disponible", () => {
    expect(
      interpretarDidit(
        401,
        respuesta("MATCH", ["LAURA", "SINTETICA PRUEBA"]),
        datos.nombre,
      ),
    ).toBe("no_disponible");
    expect(interpretarDidit(200, null, datos.nombre)).toBe("no_disponible");
    expect(interpretarDidit(200, { validations: [] }, datos.nombre)).toBe(
      "no_disponible",
    );
  });

  it("si hay varias validaciones, lee la de col_cedula", () => {
    const cuerpo = {
      validations: [
        { service_id: "otro", outcome_code: "NO_MATCH" },
        {
          service_id: "col_cedula",
          outcome_code: "MATCH",
          source_data: { first_name: "Laura", last_name: "Sintetica Prueba" },
        },
      ],
    };
    expect(interpretarDidit(200, cuerpo, datos.nombre)).toBe("identificado");
  });
});

describe("el flujo: reservar ANTES de llamar al proveedor (gate del dinero)", () => {
  const datos = {
    cedula: "1000000001",
    fechaExpedicion: "2010-05-20",
    nombre: "Laura Sintetica",
  };

  function operaciones(reserva: Reserva) {
    const consultar = vi.fn(async () => "identificado" as const);
    const registrar = vi.fn(async () => {});
    const op: OperacionesIdentidad = {
      reservar: vi.fn(async () => reserva),
      consultar,
      registrar,
    };
    return { op, consultar, registrar };
  }

  it.each([
    ["tope_dia", "tope"],
    ["tope_mes", "tope"],
    ["tope_comprador", "tope_comprador"],
    ["no_verificado", "no_verificado"],
    ["ya_identificado", "ya_identificado"],
  ] as const)(
    "sin reserva (%s) el proveedor NO se llama y no se registra nada",
    async (motivo, esperado) => {
      const { op, consultar, registrar } = operaciones({ ok: false, motivo });
      expect(await identificar(op, datos)).toBe(esperado);
      expect(consultar).not.toHaveBeenCalled();
      expect(registrar).not.toHaveBeenCalled();
    },
  );

  it("con reserva: llama una vez y registra el resultado en esa misma reserva", async () => {
    const { op, consultar, registrar } = operaciones({
      ok: true,
      consulta_id: "c-1",
    });
    expect(await identificar(op, datos)).toBe("identificado");
    expect(consultar).toHaveBeenCalledTimes(1);
    expect(registrar).toHaveBeenCalledWith("c-1", "identificado");
  });

  it("si el proveedor se cae, es no disponible y se registra así (no gasta intentos)", async () => {
    const { op, registrar } = operaciones({ ok: true, consulta_id: "c-2" });
    op.consultar = vi.fn(async () => {
      throw new Error("red");
    });
    expect(await identificar(op, datos)).toBe("no_disponible");
    expect(registrar).toHaveBeenCalledWith("c-2", "no_disponible");
  });

  it("respuestaSinReserva junta los topes de la plataforma", () => {
    expect(respuestaSinReserva("tope_dia")).toBe("tope");
    expect(respuestaSinReserva("tope_comprador")).toBe("tope_comprador");
  });
});

describe("topes", () => {
  it("con el proveedor real son fijos: ninguna variable los sube", () => {
    expect(topesEfectivos(false, { dia: "1000", mes: "1000" })).toEqual(
      TOPES_IDENTIDAD,
    );
    expect(TOPES_IDENTIDAD).toEqual({ mes: 40, dia: 5, comprador: 3 });
  });

  it("con el simulador las pruebas amplían día y mes, nunca el del comprador", () => {
    expect(topesEfectivos(true, { dia: "1000", mes: "5000" })).toEqual({
      mes: 5000,
      dia: 1000,
      comprador: 3,
    });
    expect(topesEfectivos(true, { dia: "x", mes: "-1" })).toEqual(
      TOPES_IDENTIDAD,
    );
    expect(topesEfectivos(true)).toEqual(TOPES_IDENTIDAD);
  });
});
