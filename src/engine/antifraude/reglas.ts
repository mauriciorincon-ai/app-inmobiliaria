// Las reglas antifraude (S15, maqueta 12 del comprador): escritas, con sus umbrales a la vista. Una bandera la ve SOLO el
// operador, y ni una bandera ni un reporte cambian lo que ve el comprador: solo el operador pausa un anuncio. Estas
// constantes son la única fuente de los umbrales: las lee el motor, las publica `/antifraude` y las pruebas fijan que la
// base (migración 17) usa los mismos. Puro y sin zod.
import {
  MINIMO_COMPARABLES,
  UMBRAL_SOSPECHOSO,
} from "@/engine/precio/comparables";

export const REGLAS = ["precio", "foto", "matricula", "telefono"] as const;
export type Regla = (typeof REGLAS)[number];

// Los motivos de un reporte: los 6 de la maqueta 12, en su orden. El texto vive en `src/textos/antifraude.ts`.
export const MOTIVOS_REPORTE = [
  "precio_irreal",
  "fotos_de_otro",
  "no_es_el_dueno",
  "pidio_plata",
  "ya_no_esta",
  "otra_cosa",
] as const;
export type MotivoReporte = (typeof MOTIVOS_REPORTE)[number];

// Por qué el operador descarta: una lista cerrada, para que el registro diga algo más que «descartado».
export const RAZONES_DESCARTE = [
  "es_el_dueno",
  "tiene_explicacion",
  "mismo_dueno",
  "sin_fundamento",
] as const;
export type RazonDescarte = (typeof RAZONES_DESCARTE)[number];

// Lo que el operador hace con un anuncio de la cola.
export const ACCIONES = ["pausar", "pedir_ctl", "descartar"] as const;
export type Accion = (typeof ACCIONES)[number];

export const UMBRALES = {
  /** Precio: el m² 30 % o más por debajo de la mediana de sus comparables (el mismo umbral de «¿Está caro?»). */
  precioPorcentaje: Math.round(UMBRAL_SOSPECHOSO * 100),
  /** …y solo con 5 comparables o más tras el recorte de atípicos; con menos, no hay mediana y no hay bandera. */
  precioMinimoComparables: MINIMO_COMPARABLES,
  /** Foto: dos huellas a distancia de Hamming de 6 o menos (de 64 bits) son la misma foto. */
  huellaDistancia: 6,
  huellaBits: 64,
  /** Una huella casi lisa (una pared blanca, un cielo) no informa nada: con menos de 8 o más de 56 bits en 1 no se compara. */
  huellaMinUnos: 8,
  huellaMaxUnos: 56,
  /** Teléfono: el mismo WhatsApp con 2 nombres distintos o más. */
  telefonoNombres: 2,
  /** Reportar: a lo sumo 5 por persona en 24 horas, uno por anuncio; el detalle, hasta 500 caracteres. */
  reportesPorDia: 5,
  detalleMax: 500,
  /** La nota del operador al descartar, hasta 300 caracteres. */
  notaMax: 300,
} as const;
