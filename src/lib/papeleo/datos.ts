// Los datos que el asistente del papeleo lee en el teléfono (S14): las tarifas del S12 y las del S14 como DATO, las opciones de ciudad
// que salen de ellas y la fecha en que se leyeron las normas de las cláusulas. Sin zod ni base: el servidor y la isla del cliente
// importan lo mismo, así la lista de ciudades de la URL y la del selector no pueden diferir.
import normas from "@/data/normas-clausulas.json";
import escrituracion from "@/data/tarifas-escrituracion.json";
import papeleo from "@/data/tarifas-papeleo.json";
import { opcionesCiudad, type TarifasPapeleo } from "@/engine/papeleo/gastos";
import type { TarifasEscrituracion } from "@/engine/vivienda-nueva/escrituracion";

export const ESCRITURACION =
  escrituracion as unknown as TarifasEscrituracion & {
    vigencia?: number;
  };
export const TARIFAS_PAPELEO = papeleo as unknown as TarifasPapeleo;
export const CIUDADES = opcionesCiudad(ESCRITURACION, TARIFAS_PAPELEO);
export const CONSULTADO_CLAUSULAS: string = normas.consultado;
