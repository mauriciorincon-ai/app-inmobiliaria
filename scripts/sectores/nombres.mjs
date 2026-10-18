// Nombre legible de un sector catastral. Catastro Bogotá publica `SCANOMBRE` en MAYÚSCULAS y sin
// tildes («CHICO NORTE II SECTOR»); la app lo muestra en tipo título y con las tildes de las palabras
// más comunes («Chicó Norte II Sector»). Lo que no está en la tabla se deja como lo escribe Catastro:
// una tilde que falta es mejor que una inventada. Lo usan el mapa de la maqueta y el catálogo (S6).

const CONECTORES = new Set(["DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "E"]);
const ROMANOS = /^(?=[IVX])X{0,2}(IX|IV|V?I{0,3})$/;

// Palabra sin tilde (como la escribe Catastro) → palabra con tilde.
const TILDES = {
  AGUSTIN: "Agustín",
  ALAMOS: "Álamos",
  ALCALA: "Alcalá",
  ALCAZAR: "Alcázar",
  ALCAZARES: "Alcázares",
  ALQUERIA: "Alquería",
  AMERICA: "América",
  AMERICAS: "Américas",
  ANDALUCIA: "Andalucía",
  ANDRES: "Andrés",
  ANGELES: "Ángeles",
  ARTILLERIA: "Artillería",
  ASUNCION: "Asunción",
  BARBARA: "Bárbara",
  BATALLON: "Batallón",
  BATAN: "Batán",
  BELALCAZAR: "Belalcázar",
  BELEN: "Belén",
  BENJAMIN: "Benjamín",
  BOGOTA: "Bogotá",
  BOLIVAR: "Bolívar",
  BOTANICO: "Botánico",
  BOYACA: "Boyacá",
  CABALLERIA: "Caballería",
  CABANA: "Cabaña",
  CALDERON: "Calderón",
  CALLEJON: "Callejón",
  CAMPIN: "Campín",
  CANADA: "Cañada",
  CANAVERALEJO: "Cañaveralejo",
  CANO: "Caño",
  CANODROMO: "Canódromo",
  CAPELLANIA: "Capellanía",
  CATALUNA: "Cataluña",
  CHICO: "Chicó",
  COLON: "Colón",
  CONCEPCION: "Concepción",
  CORAZON: "Corazón",
  CORDOBA: "Córdoba",
  CORUNA: "Coruña",
  CRISTOBAL: "Cristóbal",
  DONA: "Doña",
  EMAUS: "Emaús",
  ENGATIVA: "Engativá",
  ENSUENO: "Ensueño",
  ESTACION: "Estación",
  EUCARISTICO: "Eucarístico",
  FATIMA: "Fátima",
  FEDERMAN: "Federmán",
  FLOREZ: "Flórez",
  FONTIBON: "Fontibón",
  GAITAN: "Gaitán",
  GALAN: "Galán",
  GALERIAS: "Galerías",
  GARCES: "Garcés",
  GOMEZ: "Gómez",
  HORTUA: "Hortúa",
  INES: "Inés",
  INFANTERIA: "Infantería",
  INGLES: "Inglés",
  JARDIN: "Jardín",
  JAZMIN: "Jazmín",
  JERICO: "Jericó",
  JERUSALEN: "Jerusalén",
  JESUS: "Jesús",
  JIMENEZ: "Jiménez",
  JOAQUIN: "Joaquín",
  JOSE: "José",
  LIBANO: "Líbano",
  LIMON: "Limón",
  LOPEZ: "López",
  LUCIA: "Lucía",
  MARIA: "María",
  MARTIN: "Martín",
  MARTIRES: "Mártires",
  MEDELLIN: "Medellín",
  MEXICO: "México",
  MONACO: "Mónaco",
  MONICA: "Mónica",
  NARINO: "Nariño",
  NARVAEZ: "Narváez",
  NICOLAS: "Nicolás",
  NUNEZ: "Núñez",
  ORQUIDEA: "Orquídea",
  ORQUIDEAS: "Orquídeas",
  PAEZ: "Páez",
  PARAISO: "Paraíso",
  PARAMO: "Páramo",
  PARIS: "París",
  PENA: "Peña",
  PENALISA: "Peñalisa",
  PENON: "Peñón",
  PEREZ: "Pérez",
  PERU: "Perú",
  PINZON: "Pinzón",
  PIO: "Pío",
  PLAYON: "Playón",
  POLITECNICO: "Politécnico",
  PORCIUNCULA: "Porciúncula",
  POTOSI: "Potosí",
  QUINDIO: "Quindío",
  RAMIREZ: "Ramírez",
  RESURRECCION: "Resurrección",
  RINCON: "Rincón",
  ROCIO: "Rocío",
  RONDON: "Rondón",
  RUBI: "Rubí",
  SATELITE: "Satélite",
  SENORA: "Señora",
  SIMON: "Simón",
  SOFIA: "Sofía",
  SUAREZ: "Suárez",
  TOBERIN: "Toberín",
  TRIANGULO: "Triángulo",
  UNION: "Unión",
  USAQUEN: "Usaquén",
  VELODROMO: "Velódromo",
  VISION: "Visión",
};

function palabra(p, i) {
  // «(LA» / «PAZ)»: el signo se conserva y la palabra se trata sin él; tras «(» se capitaliza.
  const [, abre, nucleo, cierra] = /^(\(?)(.*?)(\)?)$/.exec(p);
  if (abre || cierra) return abre + palabra(nucleo, abre ? 0 : i) + cierra;
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
