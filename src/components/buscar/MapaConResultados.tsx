import MapaBusqueda from "@/components/buscar/MapaBusqueda";
import type { Busqueda } from "@/components/buscar/ListaResultados";
import type { Filtros } from "@/engine/busqueda/filtros";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { BUSCAR } from "@/textos/buscar";

// Cuántos resultados cae en cada barrio: pinta el mapa. Los anuncios sin barrio del catálogo no
// cuentan (no tienen área en el mapa). Espera la misma búsqueda que la lista (una sola consulta).
export default async function MapaConResultados({
  promesa,
  filtros,
  lang,
}: {
  promesa: Promise<Busqueda>;
  filtros: Filtros;
  lang: Idioma;
}) {
  const { resultados } = await promesa;
  const conteos: Record<string, number> = {};
  for (const r of resultados) {
    if (r.sector_codigo) {
      conteos[r.sector_codigo] = (conteos[r.sector_codigo] ?? 0) + 1;
    }
  }
  return (
    <MapaBusqueda
      t={enIdioma(BUSCAR.mapa, lang)}
      filtros={filtros}
      conteos={conteos}
    />
  );
}
