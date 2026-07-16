import { describe, expect, it } from "vitest";
import {
  CLAVE_DRAFT,
  ESTADO_INICIAL,
  PASOS,
  cargarDraft,
  esPrimerPaso,
  esUltimoPaso,
  pasoAnterior,
  progreso,
  serializarDraft,
  siguientePaso,
  type EstadoFormulario,
} from "@/engine/registro/wizard";

describe("navegación del wizard", () => {
  it("avanza y retrocede sin salirse de rango", () => {
    expect(siguientePaso(1)).toBe(2);
    expect(siguientePaso(2)).toBe(3);
    expect(siguientePaso(3)).toBe(3); // no pasa del último
    expect(pasoAnterior(3)).toBe(2);
    expect(pasoAnterior(1)).toBe(1); // no baja del primero
  });

  it("identifica primer y último paso", () => {
    expect(esPrimerPaso(1)).toBe(true);
    expect(esPrimerPaso(2)).toBe(false);
    expect(esUltimoPaso(3)).toBe(true);
    expect(esUltimoPaso(2)).toBe(false);
  });

  it("calcula el progreso por paso", () => {
    expect(progreso(1)).toBe(33);
    expect(progreso(2)).toBe(67);
    expect(progreso(3)).toBe(100);
  });

  it("tiene exactamente 3 pasos", () => {
    expect(PASOS).toHaveLength(3);
  });
});

describe("borrador (serializar / cargar)", () => {
  const lleno: EstadoFormulario = {
    ...ESTADO_INICIAL,
    nombre: "Ana",
    whatsapp: "3001234567",
    barrio: "Cedritos",
    precio_esperado: "420000000",
  };

  it("ida y vuelta conserva los datos", () => {
    const restaurado = cargarDraft(serializarDraft(lleno));
    expect(restaurado).toEqual(lleno);
  });

  it("rellena con los valores por defecto los campos ausentes", () => {
    const parcial = JSON.stringify({ nombre: "Ana" });
    expect(cargarDraft(parcial)).toEqual({ ...ESTADO_INICIAL, nombre: "Ana" });
  });

  it("descarta un JSON inválido", () => {
    expect(cargarDraft("{no es json")).toBeNull();
  });

  it("descarta datos corruptos (tipos equivocados)", () => {
    expect(cargarDraft(JSON.stringify({ nombre: 42 }))).toBeNull();
  });

  it("devuelve null si no hay borrador", () => {
    expect(cargarDraft(null)).toBeNull();
    expect(cargarDraft("")).toBeNull();
  });

  it("ignora claves desconocidas", () => {
    const conBasura = JSON.stringify({ nombre: "Ana", hacker: "x" });
    const restaurado = cargarDraft(conBasura);
    expect(restaurado).not.toBeNull();
    expect(restaurado).not.toHaveProperty("hacker");
  });

  it("usa una clave versionada por sprint", () => {
    expect(CLAVE_DRAFT).toBe("publicar.draft.v1");
  });
});
