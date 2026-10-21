// Del montón de lecturas por página a UNA edición: une sin duplicar, compara la doble lectura, elige la muestra con
// semilla declarada y mide la cobertura por campo (S11, F1). Puro: recibe lecturas ya validadas y devuelve datos.
import {
  ILEGIBLE,
  NO_LO_DICE,
  type PaginaLeida,
  type Proyecto,
  type TipoPagina,
} from "./edicion.ts";

// --- región: DERIVADA de la ciudad, jamás la escribe el lector ------------------------------------------------------
export const SABANA = [
  // Sabana Centro
  "cajica",
  "chia",
  "cogua",
  "cota",
  "gachancipa",
  "nemocon",
  "sopo",
  "tabio",
  "tenjo",
  "tocancipa",
  "zipaquira",
  // Sabana Occidente
  "bojaca",
  "el rosal",
  "facatativa",
  "funza",
  "madrid",
  "mosquera",
  "subachoque",
  "zipacon",
  // Sur inmediato de Bogotá
  "soacha",
  "sibate",
] as const;

export type Region = "bogota" | "sabana" | "otra" | "sin_ciudad";

/** Minúsculas, sin tildes ni signos, espacios simples. La base de toda comparación de nombres. */
export function normalizarClave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function regionDe(ciudad: string): Region {
  if (ciudad === NO_LO_DICE || ciudad === ILEGIBLE) return "sin_ciudad";
  const c = normalizarClave(ciudad);
  if (c === "bogota" || c === "bogota d c") return "bogota";
  return (SABANA as readonly string[]).includes(c) ? "sabana" : "otra";
}

// --- unir ------------------------------------------------------------------------------------------------------------
const CAMPOS_UNIBLES = [
  "tipo",
  "ciudad",
  "sector",
  "segmento",
  "precio_desde",
  "area_construida_desde",
  "area_construida_hasta",
  "area_privada_desde",
  "area_privada_hasta",
  "etapa",
  "entrega",
  "entrega_precision",
  "parqueadero",
  "parqueadero_precio",
  "precio_fijo",
  "subsidio_anunciado",
] as const satisfies readonly (keyof Proyecto)[];

type CampoUnible = (typeof CAMPOS_UNIBLES)[number];

export type ProyectoUnico = Omit<
  Proyecto,
  "pagina" | "posicion" | "notas_crudo"
> & {
  /** Las páginas donde aparece, en orden. */
  apariciones: number[];
  region: Region;
  /** La clave con que la unión lo identifica (la de su primera aparición); los conflictos la citan. */
  clave: string;
};

export type Conflicto = {
  proyecto: string;
  campo: CampoUnible | "constructora";
  valores: { pagina: number; valor: unknown }[];
};

export type EdicionUnida = {
  paginas: PaginaLeida[];
  proyectos: ProyectoUnico[];
  /** Valores que difieren de verdad entre apariciones: alguien los resuelve mirando la página. */
  conflictos: Conflicto[];
  /** Mismo dato impreso con distinto redondeo («238 millones» frente a $237.999.000): queda el más fino. */
  reconciliados: Conflicto[];
  /** Páginas 1..total que ninguna lectura cubrió. */
  paginasSinLeer: number[];
  /** Páginas que más de una lectura trae (la doble lectura va aparte, no aquí). */
  paginasRepetidas: number[];
};

const vacio = (v: unknown) => v === NO_LO_DICE || v === ILEGIBLE;
const real = (v: unknown) => !vacio(v) && v !== null && v !== undefined;

function igual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** El paso más fino que distingue el número: 237 999 000 → 1 000; 238 000 000 → 1 000 000; 51,2 → 0,1. */
function paso(n: number): number {
  if (Number.isInteger(n)) {
    let p = 1;
    let x = Math.abs(n);
    while (x >= 10 && x % 10 === 0) {
      x /= 10;
      p *= 10;
    }
    return p;
  }
  const dec = (String(n).split(".")[1] ?? "").length;
  return 10 ** -dec;
}

/**
 * ¿Es el mismo dato con distinto redondeo? El más grueso fija la tolerancia (media unidad de su último dígito) y
 * jamás más del 0,2 % del valor: «238» millones y $237.999.000 sí; $715 millones y $1.975 millones no.
 */
export function mismoDatoRedondeado(a: number, b: number): boolean {
  const grueso = Math.max(paso(a), paso(b));
  const dif = Math.abs(a - b);
  // La épsilon cubre el error de coma flotante: 42,85 − 42,8 da 0,05000000000000043.
  const eps = 1e-9;
  return (
    dif <= grueso / 2 + eps &&
    dif <= 0.002 * Math.max(Math.abs(a), Math.abs(b)) + eps
  );
}

/**
 * Para decidir si dos apariciones son el MISMO proyecto, el precio «desde» puede diferir un 1 %: «Reserva de Cajicá» es
 * $295.499.000 en el aviso y $295.499.900 en la tabla. Quedan separados los de verdad distintos («Reserva de Cajicá 2»
 * cuesta un 10 % más). Que los dos valores difieran sigue siendo un conflicto a la vista.
 */
function precioDelMismoProyecto(a: number, b: number): boolean {
  return mismoDatoRedondeado(a, b) || Math.abs(a - b) <= 0.01 * Math.max(a, b);
}

/** Entre dos números del mismo dato, el que trae más dígitos. */
function masFino(a: number, b: number): number {
  return paso(a) <= paso(b) ? a : b;
}

type Entrada = {
  base: string;
  unico: ProyectoUnico;
  apariciones: { pagina: number; p: Proyecto }[];
};

// Palabras que describen el proyecto pero no lo nombran: «Mistral» y «Belari Ciudadela - Mistral» son el mismo.
const DESCRIPTIVAS = new Set([
  "apartamentos",
  "apartamento",
  "apartaestudios",
  "club",
  "residencial",
  "conjunto",
  "ciudadela",
  "condominio",
]);
// Palabras de una razón social que no distinguen la marca: «AR Construcciones S.A.S.» y «AR Construcciones» son una.
const GENERICAS_MARCA = new Set([
  "constructora",
  "constructores",
  "construcciones",
  "construccion",
  "ingenieria",
  "arquitectura",
  "desarrollos",
  "inmobiliarios",
  "inmobiliaria",
  "inversiones",
  "gerencia",
  "s",
  "a",
  "sas",
  "sa",
  "ltda",
  "y",
  "e",
  "de",
  "la",
]);

function fichas(nombre: string): Set<string> {
  return new Set(
    normalizarClave(nombre)
      .split(" ")
      .filter((t) => t !== "" && !DESCRIPTIVAS.has(t)),
  );
}

function marca(constructora: unknown): Set<string> {
  if (typeof constructora !== "string" || vacio(constructora)) return new Set();
  return new Set(
    normalizarClave(constructora)
      .split(" ")
      .filter((t) => t !== "" && !GENERICAS_MARCA.has(t)),
  );
}

function contieneConjunto(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  const [chico, grande] = a.size <= b.size ? [a, b] : [b, a];
  return [...chico].every((t) => grande.has(t));
}

function marcasCompatibles(a: unknown, b: unknown): boolean {
  const y = marca(b);
  return [...marca(a)].some((t) => y.has(t));
}

/**
 * ¿Es la misma ficha de proyecto? El nombre de uno contiene al del otro (sin palabras descriptivas) y el precio «desde» es
 * el mismo dato; sin precio en alguno de los dos, además comparten la marca de la constructora. Dos tarjetas de una misma
 * página jamás son el mismo proyecto, y sin nombre legible no hay unión.
 */
function mismoProyecto(e: Entrada, nuevo: Proyecto): boolean {
  if (vacio(nuevo.nombre)) return false;
  if (e.apariciones.some((a) => a.pagina === nuevo.pagina)) return false;
  const buscado = fichas(String(nuevo.nombre));
  const mismoNombre = e.apariciones.some(
    (a) =>
      !vacio(a.p.nombre) &&
      contieneConjunto(fichas(String(a.p.nombre)), buscado),
  );
  if (!mismoNombre) return false;
  const precios = e.apariciones
    .map((a) => a.p.precio_desde)
    .filter((x): x is number => typeof x === "number");
  if (typeof nuevo.precio_desde === "number" && precios.length > 0) {
    const precio = nuevo.precio_desde;
    return precios.some((x) => precioDelMismoProyecto(x, precio));
  }
  return e.apariciones.some((a) =>
    marcasCompatibles(a.p.constructora, nuevo.constructora),
  );
}

/** Entre las fichas que cuadran, la que más se parece: por precio, luego por área, luego la primera. */
function elegirEntrada(libres: Entrada[], nuevo: Proyecto): Entrada | null {
  if (libres.length === 0) return null;
  const cuadra = (campo: CampoUnible) => (e: Entrada) =>
    e.apariciones.some(({ p }) => {
      const a = p[campo];
      const b = nuevo[campo];
      return (
        typeof a === "number" &&
        typeof b === "number" &&
        mismoDatoRedondeado(a, b)
      );
    });
  return (
    libres.find(cuadra("precio_desde")) ??
    libres.find(cuadra("area_construida_desde")) ??
    libres[0]
  );
}

/** El valor que más veces se repite (ya normalizado); si hay empate, el primero. */
function masFrecuente(valores: string[]): string {
  const cuentas = new Map<string, { n: number; original: string }>();
  for (const v of valores) {
    const k = normalizarClave(v);
    const c = cuentas.get(k) ?? { n: 0, original: v };
    c.n++;
    cuentas.set(k, c);
  }
  let mejor = { n: 0, original: valores[0] };
  for (const c of cuentas.values()) if (c.n > mejor.n) mejor = c;
  return mejor.original;
}

export function unirLecturas(
  lecturas: readonly { paginas: readonly PaginaLeida[] }[],
  totalPaginas: number,
): EdicionUnida {
  const porPagina = new Map<number, PaginaLeida>();
  const repetidas = new Set<number>();
  for (const l of lecturas) {
    for (const p of l.paginas) {
      if (porPagina.has(p.pagina)) repetidas.add(p.pagina);
      else porPagina.set(p.pagina, p);
    }
  }
  const paginas = [...porPagina.values()].sort((a, b) => a.pagina - b.pagina);
  const paginasSinLeer: number[] = [];
  for (let n = 1; n <= totalPaginas; n++)
    if (!porPagina.has(n)) paginasSinLeer.push(n);

  const entradas: Entrada[] = [];

  for (const pag of paginas) {
    for (const pr of pag.proyectos) {
      let entrada = elegirEntrada(
        entradas.filter((e) => mismoProyecto(e, pr)),
        pr,
      );
      if (!entrada) {
        const { pagina, posicion, notas_crudo, ...resto } = pr;
        void pagina;
        void notas_crudo;
        entrada = {
          base: vacio(pr.nombre)
            ? `p${pr.pagina}#${posicion}`
            : `${normalizarClave(String(pr.constructora))}|${normalizarClave(String(pr.nombre))}`,
          unico: {
            ...resto,
            apariciones: [],
            region: regionDe(String(pr.ciudad)),
            clave: "",
          },
          apariciones: [],
        };
        entradas.push(entrada);
      }
      entrada.apariciones.push({ pagina: pr.pagina, p: pr });
    }
  }

  const conflictos: Conflicto[] = [];
  const reconciliados: Conflicto[] = [];
  const proyectos: ProyectoUnico[] = [];

  for (const e of entradas) {
    const u = e.unico;
    u.clave = e.base;
    u.apariciones = e.apariciones.map((a) => a.pagina);
    u.rotulos = [...new Set(e.apariciones.flatMap((a) => a.p.rotulos))];

    // El nombre más corto sin descriptivos («Mistral», no «Belari Ciudadela - Mistral»); la razón social más repetida.
    const nombres = e.apariciones
      .map((a) => a.p.nombre)
      .filter((n): n is string => !vacio(n));
    if (nombres.length > 0) {
      u.nombre = [...nombres].sort(
        (x, y) => fichas(x).size - fichas(y).size,
      )[0];
    }
    const constructoras = e.apariciones
      .map((a) => a.p.constructora)
      .filter((c): c is string => !vacio(c));
    if (constructoras.length > 0) {
      u.constructora = masFrecuente(constructoras);
      if (constructoras.some((c) => !marcasCompatibles(c, u.constructora))) {
        conflictos.push({
          proyecto: e.base,
          campo: "constructora",
          valores: e.apariciones
            .filter((a) => !vacio(a.p.constructora))
            .map((a) => ({ pagina: a.pagina, valor: a.p.constructora })),
        });
      }
    }

    for (const campo of CAMPOS_UNIBLES) {
      const valores = e.apariciones.map((a) => ({
        pagina: a.pagina,
        valor: a.p[campo] as unknown,
      }));
      const reales = valores.filter((v) => real(v.valor));
      if (reales.length === 0) {
        // Nada con valor: lo ilegible pierde ante cualquier otra afirmación (un «no lo dice» o un «no es un rango»).
        (u as Record<string, unknown>)[campo] = (
          valores.find((v) => v.valor !== ILEGIBLE) ?? valores[0]
        ).valor;
        continue;
      }
      let elegido = reales[0].valor;
      let hayConflicto = false;
      let hayRedondeo = false;
      for (const r of reales.slice(1)) {
        if (igual(r.valor, elegido)) continue;
        if (typeof r.valor === "number" && typeof elegido === "number") {
          if (mismoDatoRedondeado(r.valor, elegido)) {
            elegido = masFino(r.valor, elegido);
            hayRedondeo = true;
            continue;
          }
        }
        // «Bosa» y «Bosa El Recreo» son el mismo barrio con distinto detalle: queda el más específico.
        if (
          campo === "sector" &&
          typeof r.valor === "string" &&
          typeof elegido === "string"
        ) {
          const x = normalizarClave(r.valor);
          const y = normalizarClave(elegido);
          if (x.includes(y) || y.includes(x)) {
            if (x.length > y.length) elegido = r.valor;
            hayRedondeo = true;
            continue;
          }
        }
        hayConflicto = true;
      }
      (u as Record<string, unknown>)[campo] = elegido;
      const registro = { proyecto: e.base, campo, valores: reales };
      if (hayConflicto) conflictos.push(registro);
      else if (hayRedondeo) reconciliados.push(registro);
    }
    u.region = regionDe(String(u.ciudad));
    proyectos.push(u);
  }

  return {
    paginas,
    proyectos,
    conflictos,
    reconciliados,
    paginasSinLeer,
    paginasRepetidas: [...repetidas].sort((a, b) => a - b),
  };
}

// --- doble lectura ---------------------------------------------------------------------------------------------------
export type Discrepancia = {
  pagina: number;
  proyecto: string;
  campo: string;
  primera: unknown;
  segunda: unknown;
};

const CAMPOS_CRITICOS = [
  "precio_desde",
  "area_construida_desde",
  "area_construida_hasta",
  "area_privada_desde",
  "area_privada_hasta",
  "segmento",
  "ciudad",
  "entrega",
] as const satisfies readonly (keyof Proyecto)[];

/** Lo que cambia entre dos lecturas es de dos clases: una cifra distinta, o solo cómo se llama o se cuenta el proyecto. */
export const CAMPOS_DE_ESTRUCTURA = [
  "pagina",
  "conteo",
  "proyecto",
  "nombre",
  "constructora",
] as const;

/**
 * Compara dos lecturas de LAS MISMAS páginas, proyecto por proyecto. Empareja por constructora y nombre y, si no hay
 * par exacto, por nombre aproximado («Playa Santúa» y «Playa Santúa Mar»): ese cambio se anota como nombre, no como
 * proyecto ausente.
 */
export function compararLecturas(
  primera: readonly PaginaLeida[],
  segunda: readonly PaginaLeida[],
): Discrepancia[] {
  const salida: Discrepancia[] = [];
  const nombre = (p: Proyecto) => normalizarClave(String(p.nombre));
  const clave = (p: Proyecto) =>
    `${normalizarClave(String(p.constructora))}|${nombre(p)}`;
  const nota = (
    pagina: number,
    proyecto: string,
    campo: string,
    a: unknown,
    b: unknown,
  ) => salida.push({ pagina, proyecto, campo, primera: a, segunda: b });

  for (const pb of segunda) {
    const pa = primera.find((x) => x.pagina === pb.pagina);
    if (!pa) {
      nota(pb.pagina, "(página)", "pagina", null, "leída");
      continue;
    }
    if (pa.proyectos.length !== pb.proyectos.length) {
      nota(
        pb.pagina,
        "(página)",
        "conteo",
        pa.proyectos.length,
        pb.proyectos.length,
      );
    }
    const libres = new Set(pa.proyectos);
    for (const q of pb.proyectos) {
      const exacto = [...libres].find((p) => clave(p) === clave(q));
      const aproximado = [...libres].find(
        (p) =>
          nombre(q) !== "" &&
          nombre(p) !== "" &&
          contiene(nombre(p), nombre(q)),
      );
      const p = exacto ?? aproximado;
      if (!p) {
        nota(pb.pagina, clave(q), "proyecto", null, "presente");
        continue;
      }
      libres.delete(p);
      if (nombre(p) !== nombre(q)) {
        nota(pb.pagina, clave(q), "nombre", p.nombre, q.nombre);
      }
      if (
        p.constructora !== q.constructora &&
        normalizarClave(String(p.constructora)) !==
          normalizarClave(String(q.constructora))
      ) {
        nota(
          pb.pagina,
          clave(q),
          "constructora",
          p.constructora,
          q.constructora,
        );
      }
      for (const campo of CAMPOS_CRITICOS) {
        if (!igual(p[campo], q[campo])) {
          nota(pb.pagina, clave(q), campo, p[campo], q[campo]);
        }
      }
    }
  }
  return salida;
}

// --- muestra con semilla ----------------------------------------------------------------------------------------------
/** PRNG determinista (mulberry32): la misma semilla da la misma muestra en cualquier máquina. */
export function aleatorioConSemilla(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Páginas para la doble lectura: primero una por cada tipo de página que traiga proyectos (el que salga del sorteo),
 * luego las que el sorteo siga dando hasta cubrir al menos `fraccion` de los proyectos. Determinista.
 */
export function muestraDobleLectura(
  paginas: readonly PaginaLeida[],
  semilla: number,
  fraccion = 0.1,
): number[] {
  const conProyectos = paginas.filter((p) => p.proyectos.length > 0);
  const total = conProyectos.reduce((s, p) => s + p.proyectos.length, 0);
  if (total === 0) return [];
  const meta = Math.max(1, Math.ceil(total * fraccion));
  const azar = aleatorioConSemilla(semilla);
  const barajadas = [...conProyectos].sort((a, b) => a.pagina - b.pagina);
  for (let i = barajadas.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [barajadas[i], barajadas[j]] = [barajadas[j], barajadas[i]];
  }
  const elegidas: PaginaLeida[] = [];
  const tipos = new Set<TipoPagina>();
  for (const p of barajadas) {
    if (!tipos.has(p.tipo)) {
      tipos.add(p.tipo);
      elegidas.push(p);
    }
  }
  let cubiertos = elegidas.reduce((s, p) => s + p.proyectos.length, 0);
  for (const p of barajadas) {
    if (cubiertos >= meta) break;
    if (elegidas.includes(p)) continue;
    elegidas.push(p);
    cubiertos += p.proyectos.length;
  }
  return elegidas.map((p) => p.pagina).sort((a, b) => a - b);
}

// --- cobertura ------------------------------------------------------------------------------------------------------
export type CoberturaCampo = {
  campo: string;
  total: number;
  conValor: number;
  noLoDice: number;
  ilegible: number;
  /** Solo para los campos que admiten `null` («no es un rango», «no hay precio aparte»). */
  nulo: number;
};

const CAMPOS_COBERTURA = [
  "nombre",
  "constructora",
  "tipo",
  "ciudad",
  "sector",
  "segmento",
  "precio_desde",
  "area_construida_desde",
  "area_construida_hasta",
  "area_privada_desde",
  "area_privada_hasta",
  "etapa",
  "entrega",
  "parqueadero",
  "parqueadero_precio",
  "precio_fijo",
  "subsidio_anunciado",
] as const satisfies readonly (keyof ProyectoUnico)[];

export function cobertura(
  proyectos: readonly ProyectoUnico[],
): CoberturaCampo[] {
  return CAMPOS_COBERTURA.map((campo) => {
    let conValor = 0;
    let noLoDice = 0;
    let ilegible = 0;
    let nulo = 0;
    for (const p of proyectos) {
      const v = p[campo] as unknown;
      if (v === NO_LO_DICE) noLoDice++;
      else if (v === ILEGIBLE) ilegible++;
      else if (v === null) nulo++;
      else conValor++;
    }
    return {
      campo,
      total: proyectos.length,
      conValor,
      noLoDice,
      ilegible,
      nulo,
    };
  });
}

export function contarPor<K extends string>(
  proyectos: readonly ProyectoUnico[],
  clave: (p: ProyectoUnico) => K,
): Record<K, number> {
  const salida = {} as Record<K, number>;
  for (const p of proyectos) salida[clave(p)] = (salida[clave(p)] ?? 0) + 1;
  return salida;
}

// --- cruce con el índice impreso ------------------------------------------------------------------------------------
export type FilaIndice = {
  nombre: string;
  constructora: string;
  precio_desde: number | typeof NO_LO_DICE | typeof ILEGIBLE;
};

export type CruceIndice = {
  filas: number;
  coinciden: number;
  /** El proyecto está, pero el «desde» del índice y el del aviso no son el mismo dato. */
  precioDifiere: {
    indice: string;
    precioIndice: number;
    precioAviso: number;
    pagina: number;
  }[];
  /** Renglones del índice sin proyecto transcrito: lo que podría faltar. */
  sinProyecto: string[];
  /** Proyectos de la edición que el índice no nombra (no es un fallo: el índice no los trae todos). */
  sinIndice: number;
};

/** Distancia de edición entre dos textos cortos (nombres de proyectos). */
function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardada = fila[j];
      fila[j] = Math.min(
        fila[j] + 1,
        fila[j - 1] + 1,
        anterior + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      anterior = guardada;
    }
  }
  return fila[b.length];
}

/** El índice a veces añade «- zona» al nombre y a veces lo escribe con una letra de diferencia. */
function contiene(transcrito: string, indice: string) {
  if (transcrito === indice || transcrito.includes(indice)) return true;
  if (indice.includes(transcrito)) return true;
  return indice.length >= 6 && distancia(transcrito, indice) <= 2;
}

/** Cruza los proyectos transcritos con las filas del índice de la revista (control de cobertura, no fuente de datos). */
export function cruzarConIndice(
  proyectos: readonly ProyectoUnico[],
  filas: readonly FilaIndice[],
): CruceIndice {
  const claves = proyectos.map((p) => ({
    p,
    nombre: vacio(p.nombre) ? "" : normalizarClave(String(p.nombre)),
  }));
  const usados = new Set<ProyectoUnico>();
  const cruce: CruceIndice = {
    filas: filas.length,
    coinciden: 0,
    precioDifiere: [],
    sinProyecto: [],
    sinIndice: 0,
  };
  for (const f of filas) {
    const nombres = [
      normalizarClave(f.nombre),
      normalizarClave(f.nombre.split(" - ")[0]),
    ];
    const halladas = claves.filter(
      (c) => c.nombre !== "" && nombres.some((n) => contiene(c.nombre, n)),
    );
    if (halladas.length === 0) {
      cruce.sinProyecto.push(f.nombre);
      continue;
    }
    halladas.forEach((h) => usados.add(h.p));
    cruce.coinciden++;
    if (typeof f.precio_desde !== "number") continue;
    const iguales = halladas.some(
      (h) =>
        typeof h.p.precio_desde === "number" &&
        mismoDatoRedondeado(h.p.precio_desde, f.precio_desde as number),
    );
    const sinPrecio = halladas.every(
      (h) => typeof h.p.precio_desde !== "number",
    );
    if (!iguales && !sinPrecio) {
      const h = halladas.find((x) => typeof x.p.precio_desde === "number")!;
      cruce.precioDifiere.push({
        indice: f.nombre,
        precioIndice: f.precio_desde,
        precioAviso: h.p.precio_desde as number,
        pagina: h.p.apariciones[0],
      });
    }
  }
  cruce.sinIndice = proyectos.filter((p) => !usados.has(p)).length;
  return cruce;
}
