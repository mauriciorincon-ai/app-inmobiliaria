// @vitest-environment node
// Lo que JAMÁS entra al repo público (S15): los certificados de tradición reales (CTL) y lo que se escriba de ellos viven en
// `privado/`, ignorada por git. El hook de gitleaks solo mira lo preparado: si la carpeta no estuviera ignorada, un
// `git add` de más subiría un certificado. Este test lo fija y comprueba que ninguna ruta versionada esté ahí. Y los
// certificados SINTÉTICOS de las pruebas (`tests/fixtures/ctl/`) no llevan un dato con forma de dato personal.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hallazgosPii } from "./utils/pii-ctl";

const RAIZ = join(__dirname, "..", "..");
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: RAIZ, encoding: "utf8" });

describe("privado/ (los CTL reales)", () => {
  it("cualquier archivo de privado/ está ignorado por git", () => {
    // `git check-ignore -q` sale con 0 si la ruta está ignorada y con 1 si no.
    for (const ruta of [
      "privado/ctl/certificado-1.txt",
      "privado/ctl/certificado-1.esperado.json",
      "privado/otra-cosa.md",
    ]) {
      expect(() => git("check-ignore", "-q", ruta), ruta).not.toThrow();
    }
  });

  it("la guarda distingue: una ruta fuera de privado/ NO está ignorada (demo en rojo)", () => {
    expect(() => git("check-ignore", "-q", "src/engine/ctl/lector.ts")).toThrow();
  });

  it("ninguna ruta versionada vive en privado/", () => {
    const rutas = git("ls-files").split("\n").filter(Boolean);
    expect(rutas.filter((r) => r.startsWith("privado/"))).toEqual([]);
  });
});

describe("los certificados sintéticos no llevan datos personales", () => {
  const DIR = join(RAIZ, "tests", "fixtures", "ctl");
  const fixtures = readdirSync(DIR).filter((f) => f.endsWith(".txt"));

  it("hay fixtures y ninguno tiene un documento, un celular, un correo, una matrícula real ni un nombre", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(4);
    for (const f of fixtures) {
      expect(hallazgosPii(readFileSync(join(DIR, f), "utf8")), f).toEqual([]);
    }
  });

  it("demo en rojo: cada forma de dato personal cae", () => {
    const tipos = (t: string) => hallazgosPii(t).map((h) => h.tipo);
    expect(tipos("DE: PERSONA A CC 1.234.567.890")).toContain("documento");
    expect(tipos("NIT: 900123456-1")).toContain("documento");
    expect(tipos("Tel 310 555 0101")).toEqual(["celular"]);
    expect(tipos("escribe a alguien@correo.test")).toEqual(["correo"]);
    expect(tipos("Nro Matricula: 50N-20123456")).toEqual(["matricula"]);
    expect(tipos("Nro Matricula: 000-0000000")).toEqual([]);
    expect(tipos("A: MARIA PEREZ GOMEZ X")).toEqual(["persona"]);
    expect(tipos("A: PERSONA B X")).toEqual([]);
  });
});
