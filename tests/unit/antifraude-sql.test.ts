// @vitest-environment node
// Gate del S15: la base (migración 17) y el motor usan los MISMOS umbrales. `/antifraude` publica los de
// `engine/antifraude/reglas.ts`; si alguien cambia uno en la base y no en el motor (o al revés), la página diría una cifra y
// la regla haría otra. Este test lee el SQL y exige cada umbral en su sitio. Demo en rojo (regla 15): el mismo chequeo sobre
// un SQL con un umbral cambiado debe fallar.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UMBRALES } from "../../src/engine/antifraude/reglas";

const SQL = readFileSync(
  join(
    __dirname,
    "..",
    "..",
    "supabase/migrations/20261028000001_antifraude_y_sesiones.sql",
  ),
  "utf8",
);

// El cuerpo de una función (de `create function public.<nombre>(` a su `$$;`).
function cuerpo(sql: string, nombre: string): string {
  const i = sql.indexOf(`create function public.${nombre}(`);
  if (i < 0) return "";
  return sql.slice(i, sql.indexOf("$$;", sql.indexOf("$$", i) + 2));
}

function umbralesQueFaltan(sql: string): string[] {
  const u = UMBRALES;
  const revisar = cuerpo(sql, "revisar_banderas");
  const reportar = cuerpo(sql, "reportar_anuncio");
  const precio = cuerpo(sql, "guardar_banderas_precio");
  const esperados: Array<[string, string, string]> = [
    ["revisar_banderas", revisar, `bit_count(fa.huella # fb.huella) <= ${u.huellaDistancia}`],
    ["revisar_banderas", revisar, `bit_count(fo.huella) between ${u.huellaMinUnos} and ${u.huellaMaxUnos}`],
    ["revisar_banderas", revisar, `having count(distinct nom) >= ${u.telefonoNombres}`],
    ["reportar_anuncio", reportar, `>= ${u.reportesPorDia} then`],
    ["reportar_anuncio", reportar, `char_length(v_detalle) > ${u.detalleMax}`],
    ["guardar_banderas_precio", precio, `not between ${u.precioPorcentaje} and 100`],
    ["guardar_banderas_precio", precio, `< ${u.precioMinimoComparables}`],
    ["tabla reportes", sql, `char_length(detalle) between 1 and ${u.detalleMax}`],
    ["tabla banderas", sql, `char_length(nota) between 1 and ${u.notaMax}`],
  ];
  return esperados
    .filter(([, texto, buscado]) => !texto.includes(buscado))
    .map(([donde, , buscado]) => `${donde}: falta «${buscado}»`);
}

describe("los umbrales de la base son los del motor", () => {
  it("la migración 17 trae cada umbral de `UMBRALES`", () => {
    expect(umbralesQueFaltan(SQL)).toEqual([]);
  });

  it("demo en rojo: con la distancia de la foto cambiada a 8, el chequeo falla", () => {
    const cambiado = SQL.replace(
      `bit_count(fa.huella # fb.huella) <= ${UMBRALES.huellaDistancia}`,
      "bit_count(fa.huella # fb.huella) <= 8",
    );
    expect(umbralesQueFaltan(cambiado)).toEqual([
      `revisar_banderas: falta «bit_count(fa.huella # fb.huella) <= ${UMBRALES.huellaDistancia}»`,
    ]);
  });
});
