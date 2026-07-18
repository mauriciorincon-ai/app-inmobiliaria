// Vocabulario de dominio del registro de fundadores. Punto único de importación para la UI.
// Las fuentes de verdad son el esquema zod (`engine/registro/schema`) y los tipos de BD
// (`lib/supabase/types`); aquí solo se re-exportan con nombres de dominio.

export type {
  Operacion,
  TipoInmueble,
  DatosPaso1,
  DatosPaso2,
  DatosRegistro,
  PayloadRegistro,
} from "@/engine/registro/schema";

export type { EstadoFormulario, Paso } from "@/engine/registro/wizard";

export type {
  VendedorRow,
  InmuebleRow,
  EstadoInmueble,
} from "@/lib/supabase/types";

// Fila que muestra el panel del operador: el inmueble con los datos de contacto de su vendedor.
import type { InmuebleRow, VendedorRow } from "@/lib/supabase/types";

export type RegistroPanel = InmuebleRow & {
  vendedor: Pick<
    VendedorRow,
    "nombre" | "whatsapp" | "email" | "ciudad" | "zona"
  > | null;
};
