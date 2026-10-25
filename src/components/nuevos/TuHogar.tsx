"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import HogarResultado, { type TextosHogar } from "./HogarResultado";
import { leerCapacidad } from "@/engine/simulador/capacidad-local";
import { teAlcanza } from "@/engine/vivienda-nueva/te-alcanza";
import type { ProyectoSubsidio } from "@/engine/vivienda-nueva/te-alcanza";
import type { Programa } from "@/engine/vivienda-nueva/subsidio";
import type { ProgramaVisible } from "@/engine/vivienda-nueva/vista";
import type { Idioma } from "@/i18n/idiomas";
import {
  instantaneaCapacidad,
  suscribirCapacidad,
} from "@/lib/capacidad-cliente";

const sinSuscripcion = () => () => {};

/**
 * «Tu hogar» (S13, pantalla 04): el mismo motor de los hogares de ejemplo, corrido en ESTE teléfono con lo que el comprador
 * guardó en «lo que puedes pagar» (`inn:capacidad:v1`). El ingreso nunca sale de aquí: esta isla no hace ninguna petición ni
 * importa nada que la haga (y no importa zod: el servidor le pasa la tasa y los programas ya validados).
 */
export default function TuHogar({
  motor,
  programas,
  ejemplo,
  fechaCorte,
  t,
  lang,
}: {
  motor: {
    proyectos: ProyectoSubsidio[];
    programas: Programa[];
    tasaEA: number;
  };
  programas: ProgramaVisible[];
  ejemplo: ProyectoSubsidio | null;
  fechaCorte: string;
  t: TextosHogar;
  lang: Idioma;
}) {
  const tt = t.teAlcanza.tuHogar;
  // Hasta montar, el servidor no sabe qué hay en el teléfono: se reserva el hueco en vez de decir «no hay nada».
  const montado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
  const guardado = useSyncExternalStore(
    suscribirCapacidad,
    instantaneaCapacidad,
    () => "",
  );
  const cap = montado ? leerCapacidad(guardado || null) : null;

  return (
    <section
      aria-labelledby="tu-hogar-titulo"
      className="mt-8 rounded-2xl border border-purple-200 bg-white p-5"
    >
      <h2 id="tu-hogar-titulo" className="text-xl font-extrabold text-ink">
        {tt.titulo}
      </h2>
      {!montado ? (
        <p className="mt-2 min-h-24 text-sm text-mute" role="status">
          {tt.cargando}
        </p>
      ) : cap === null ? (
        <>
          <p className="mt-2 text-gray">{tt.sinDatos}</p>
          <Link
            href="/herramientas"
            prefetch={false}
            className="mt-3 inline-block rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white hover:bg-purple-600"
          >
            {tt.calcular}
          </Link>
        </>
      ) : (
        <>
          <div className="mt-3">
            <HogarResultado
              h={teAlcanza(
                {
                  ingresos: cap.ingresos,
                  inicial: cap.inicial,
                  plazoAnos: cap.plazoAnos,
                  tasaEA: cap.tasaEA ?? motor.tasaEA,
                },
                motor.proyectos,
                motor.programas,
              )}
              ejemplo={ejemplo}
              programas={programas}
              fechaCorte={cap.tasaEA === null ? fechaCorte : null}
              t={t}
              lang={lang}
            />
          </div>
          <p className="mt-4 text-xs text-mute">{tt.privado}</p>
          <Link
            href="/herramientas"
            prefetch={false}
            className="mt-2 inline-block text-sm font-semibold text-purple-600 underline underline-offset-4"
          >
            {tt.cambiar}
          </Link>
        </>
      )}
    </section>
  );
}
