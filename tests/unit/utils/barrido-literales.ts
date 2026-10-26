// Barrido de literales de texto visibles (regla de producto 10): ningún texto de la interfaz vive en
// un componente ni en un motor, todo sale del diccionario `{ es, en }`. Usa la API de TypeScript (no
// un grep) para ignorar comentarios, clases y código. Se prueba con fixtures malas en
// `barrido-literales.test.ts` y se aplica a `src/app`, `src/components`, `src/engine` y `src/lib`
// en `sin-literales.test.ts`.
//
// Detecta, en cualquier archivo:
//   · texto-jsx    <p>Hola</p> · {"Hola"} · {`Foto ${n}`}
//   · atributo     alt/aria-label/title/placeholder/label/hint con literal
//   · metadata     `export const metadata` (debe ser generateMetadata)
//   · dato-texto   { titulo: "…", texto: "…", q: "…", mensaje: "…" } (copy guardado en arreglos)
//   · mensaje-zod  .min(2, "Escribe tu nombre") y demás validadores con mensaje en español
// y, en archivos `.ts` (motores y lib):
//   · frase        cualquier cadena de 3 o más palabras que no sea un registro, un import ni un tipo
import ts from "typescript";

export type Hallazgo = {
  linea: number;
  tipo:
    | "texto-jsx"
    | "atributo"
    | "metadata"
    | "dato-texto"
    | "mensaje-zod"
    | "frase";
  texto: string;
};

// Atributos cuyo valor lee una persona (o un lector de pantalla). `className`, `href`, `id`… no.
const ATRIBUTOS_VISIBLES = new Set([
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "alt",
  "title",
  "placeholder",
  "label",
  "hint",
  // S16 (deuda del S5): las props de texto de los componentes propios (en español, como el resto de la app).
  "etiqueta",
  "titulo",
  "texto",
  "mensaje",
  "ayuda",
  "error",
  "aviso",
  "descripcion",
]);

// Claves de objeto que en esta app guardan texto de la interfaz.
const CLAVES_DE_TEXTO = new Set([
  "titulo",
  "texto",
  "desc",
  "descripcion",
  "q",
  "a",
  "etiqueta",
  "label",
  "hint",
  "mensaje",
  "accion",
  "asunto",
  "detalle",
  "fig",
  "error",
  "title",
  "aviso",
  "cta",
  "pregunta",
  "respuesta",
  "nota",
  "resumen",
]);

// Validadores de Zod cuyo argumento de cadena es el mensaje que ve la persona.
const METODOS_ZOD = new Set([
  "min",
  "max",
  "length",
  "email",
  "regex",
  "refine",
  "superRefine",
  "nonempty",
  "startsWith",
  "endsWith",
  "positive",
  "int",
  "url",
  "uuid",
]);

// Llamadas cuyo texto NO es de la interfaz: registros y errores internos.
const LLAMADAS_INTERNAS =
  /^(logger|log|console|reportError|Sentry|Error|TypeError)\b/;

// Nombres propios que no se traducen.
// «i» es el símbolo de información de los avisos (como «▲» o «✓»), no una palabra.
const NO_TRADUCIBLES = new Set(["Innmobiliaria", "WhatsApp", "i"]);

const TIENE_LETRAS = /\p{L}/u;

function limpiar(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

// «text-sm font-semibold hover:underline»: una lista de clases de Tailwind no es texto de la interfaz.
function esClaseCss(texto: string): boolean {
  const partes = limpiar(texto).split(" ");
  return (
    partes.every((p) => /^[a-z0-9!:\-\[\]\/._%()]+$/.test(p)) &&
    partes.some((p) => /[-:\[]/.test(p))
  );
}

function esVisible(texto: string): boolean {
  const limpio = limpiar(texto);
  return (
    TIENE_LETRAS.test(limpio) &&
    !NO_TRADUCIBLES.has(limpio) &&
    !esClaseCss(limpio)
  );
}

// «Rafael Uribe Uribe», «San Cristóbal»: toda palabra en mayúscula inicial es un nombre propio, igual en
// los dos idiomas.
function esNombrePropio(texto: string): boolean {
  const conLetras = limpiar(texto)
    .split(" ")
    .filter((p) => /\p{L}/u.test(p));
  return conLetras.length > 0 && conLetras.every((p) => /^\p{Lu}/u.test(p));
}

function palabras(texto: string): number {
  return limpiar(texto)
    .split(" ")
    .filter((p) => /\p{L}{2,}/u.test(p)).length;
}

// Texto estático de una expresión: literal, plantilla sin sustituciones, o las partes fijas de una
// plantilla con ellas. `null` si no es un literal (una variable, una llamada, `t.titulo`…).
function textoEstatico(expr: ts.Expression): string | null {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return expr.text;
  }
  if (ts.isTemplateExpression(expr)) {
    return [
      expr.head.text,
      ...expr.templateSpans.map((s) => s.literal.text),
    ].join(" ");
  }
  return null;
}

// Las expresiones que terminan pintándose como texto dentro de un ternario o de un `&&`/`||` (entre paréntesis también).
function ramasDeTexto(expr: ts.Expression): ts.Expression[] {
  if (ts.isParenthesizedExpression(expr)) return ramasDeTexto(expr.expression);
  if (ts.isConditionalExpression(expr)) {
    return [expr.whenTrue, expr.whenFalse].flatMap((r) => [r, ...ramasDeTexto(r)]);
  }
  if (
    ts.isBinaryExpression(expr) &&
    (expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      expr.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      expr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
  ) {
    return [expr.right, ...ramasDeTexto(expr.right)];
  }
  return [];
}

export function barrer(
  nombre: string,
  fuente: string,
  opciones: { frases?: boolean } = {},
): Hallazgo[] {
  const esTsx = nombre.endsWith(".tsx");
  const frases = opciones.frases ?? !esTsx;
  const sf = ts.createSourceFile(
    nombre,
    fuente,
    ts.ScriptTarget.Latest,
    true,
    esTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const vistos = new Set<string>();
  const hallazgos: Hallazgo[] = [];
  const linea = (n: ts.Node) =>
    sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const agregar = (n: ts.Node, tipo: Hallazgo["tipo"], texto: string) => {
    const clave = `${linea(n)}:${limpiar(texto)}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    hallazgos.push({ linea: linea(n), tipo, texto: limpiar(texto) });
  };

  const enLlamadaInterna = (nodo: ts.Node): boolean => {
    for (let p = nodo.parent; p; p = p.parent) {
      if (
        (ts.isCallExpression(p) || ts.isNewExpression(p)) &&
        LLAMADAS_INTERNAS.test(p.expression.getText(sf))
      ) {
        return true;
      }
    }
    return false;
  };

  function visitar(nodo: ts.Node) {
    // <p>Hola</p>
    if (ts.isJsxText(nodo) && esVisible(nodo.getText(sf))) {
      agregar(nodo, "texto-jsx", nodo.getText(sf));
    }
    // <p>{"Hola"}</p>
    if (
      ts.isJsxExpression(nodo) &&
      nodo.expression &&
      !ts.isJsxAttribute(nodo.parent)
    ) {
      const texto = textoEstatico(nodo.expression);
      if (texto !== null && esVisible(texto)) agregar(nodo, "texto-jsx", texto);
      // S16 (deuda del S5): <p>{abierto ? "Cerrar" : "Abrir"}</p> y <p>{x && "Hola"}</p>: las ramas de un ternario o de un
      // `&&`/`||` que se pintan como texto también son texto de la interfaz.
      for (const rama of ramasDeTexto(nodo.expression)) {
        const t = textoEstatico(rama);
        if (t !== null && esVisible(t)) agregar(rama, "texto-jsx", t);
      }
    }
    // <img alt="Foto" /> · aria-label="Cerrar" · placeholder={"Ej: Cedritos"}
    if (
      ts.isJsxAttribute(nodo) &&
      ATRIBUTOS_VISIBLES.has(nodo.name.getText(sf))
    ) {
      const ini = nodo.initializer;
      let texto: string | null = null;
      if (ini && ts.isStringLiteral(ini)) texto = ini.text;
      else if (ini && ts.isJsxExpression(ini) && ini.expression) {
        texto = textoEstatico(ini.expression);
      }
      if (texto !== null && esVisible(texto)) agregar(nodo, "atributo", texto);
    }
    // S16 (deuda del S5): const AVISO = "Guardado con éxito" en un .tsx (fuera de toda función): una frase de dos palabras o
    // más que no es una lista de clases se pintará en algún lado.
    if (
      esTsx &&
      ts.isVariableDeclaration(nodo) &&
      ts.isSourceFile(nodo.parent.parent.parent) &&
      nodo.initializer
    ) {
      const texto = textoEstatico(nodo.initializer);
      if (texto !== null && esVisible(texto) && palabras(texto) >= 2) {
        agregar(nodo, "texto-jsx", texto);
      }
    }
    // export const metadata = { title: "…" }: el título y la descripción dependen del idioma, así
    // que deben salir de `generateMetadata`.
    if (
      ts.isVariableStatement(nodo) &&
      nodo.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      nodo.declarationList.declarations.some(
        (d) => d.name.getText(sf) === "metadata",
      )
    ) {
      agregar(nodo, "metadata", "export const metadata");
    }
    // { titulo: "…", q: "…", mensaje: "…" }: copy guardado en arreglos de datos.
    if (ts.isPropertyAssignment(nodo) && !enLlamadaInterna(nodo)) {
      const clave = ts.isIdentifier(nodo.name)
        ? nodo.name.text
        : ts.isStringLiteral(nodo.name)
          ? nodo.name.text
          : null;
      if (clave && CLAVES_DE_TEXTO.has(clave)) {
        const texto = textoEstatico(nodo.initializer);
        if (texto !== null && esVisible(texto)) {
          agregar(nodo, "dato-texto", texto);
        }
      }
    }
    // schema.min(2, "Escribe tu nombre")
    if (
      ts.isCallExpression(nodo) &&
      ts.isPropertyAccessExpression(nodo.expression) &&
      METODOS_ZOD.has(nodo.expression.name.text) &&
      !enLlamadaInterna(nodo)
    ) {
      for (const arg of nodo.arguments) {
        const texto = textoEstatico(arg);
        if (texto !== null && esVisible(texto) && /\s/.test(limpiar(texto))) {
          agregar(arg, "mensaje-zod", texto);
        }
      }
    }
    // Frases sueltas en motores y lib: constantes, plantillas, retornos.
    if (
      frases &&
      (ts.isStringLiteral(nodo) ||
        ts.isNoSubstitutionTemplateLiteral(nodo) ||
        ts.isTemplateHead(nodo) ||
        ts.isTemplateMiddle(nodo) ||
        ts.isTemplateTail(nodo)) &&
      !ts.isImportDeclaration(nodo.parent) &&
      !ts.isExportDeclaration(nodo.parent) &&
      !ts.isLiteralTypeNode(nodo.parent) &&
      !ts.isExpressionStatement(nodo.parent) &&
      !ts.isElementAccessExpression(nodo.parent) &&
      !enLlamadaInterna(nodo)
    ) {
      const texto = nodo.text;
      if (
        palabras(texto) >= 3 &&
        !esNombrePropio(texto) &&
        !esClaseCss(limpiar(texto))
      ) {
        agregar(nodo, "frase", texto);
      }
    }
    ts.forEachChild(nodo, visitar);
  }
  visitar(sf);
  return hallazgos;
}
