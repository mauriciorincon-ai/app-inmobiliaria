// Nombre legible de un sector catastral. Catastro Bogotá publica `SCANOMBRE` en MAYÚSCULAS y sin
// tildes («CHICO NORTE II SECTOR»); la app lo muestra en tipo título y con las tildes de las palabras
// más comunes («Chicó Norte II Sector»). Lo que no está en la tabla se deja como lo escribe Catastro:
// una tilde que falta es mejor que una inventada. Lo usan el mapa de la maqueta y el catálogo (S6).

const CONECTORES = new Set(["DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "E"]);
const ROMANOS = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/;

// Palabra sin tilde (como la escribe Catastro) → palabra con tilde.
const TILDES = {
  ALAMOS: "Álamos",
  ALCAZARES: "Alcázares",
  AMERICAS: "Américas",
  ANDRES: "Andrés",
  ANGELES: "Ángeles",
  ASUNCION: "Asunción",
  BARBARA: "Bárbara",
  BELEN: "Belén",
  BOGOTA: "Bogotá",
  BOLIVAR: "Bolívar",
  CALLEJON: "Callejón",
  CAMPIN: "Campín",
  CHICO: "Chicó",
  CONCEPCION: "Concepción",
  CORAZON: "Corazón",
  CORDOBA: "Córdoba",
  CRISTOBAL: "Cristóbal",
  ENGATIVA: "Engativá",
  ESTACION: "Estación",
  FEDERMAN: "Federmán",
  FONTIBON: "Fontibón",
  GAITAN: "Gaitán",
  GALERIAS: "Galerías",
  GARCES: "Garcés",
  JARDIN: "Jardín",
  JESUS: "Jesús",
  JOSE: "José",
  LIBANO: "Líbano",
  LIMON: "Limón",
  MARIA: "María",
  MARTIRES: "Mártires",
  MEXICO: "México",
  NICOLAS: "Nicolás",
  PARAISO: "Paraíso",
  PERU: "Perú",
  POLITECNICO: "Politécnico",
  RINCON: "Rincón",
  SIMON: "Simón",
  TOBERIN: "Toberín",
  UNION: "Unión",
  USAQUEN: "Usaquén",
};

function palabra(p, i) {
  if (ROMANOS.test(p)) return p;
  if (TILDES[p]) return TILDES[p];
  if (i > 0 && CONECTORES.has(p)) return p.toLowerCase();
  return p.charAt(0) + p.slice(1).toLowerCase();
}

export function nombreLegible(scanombre) {
  return String(scanombre)
    .trim()
    .split(/\s+/)
    .map((p, i) => palabra(p, i))
    .join(" ");
}
