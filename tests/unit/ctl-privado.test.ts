// @vitest-environment node
// Lo que JAMÁS entra al repo público (S15): los certificados de tradición reales (CTL) y lo que se escriba de ellos viven en
// `privado/`, ignorada por git. El hook de gitleaks solo mira lo preparado: si la carpeta no estuviera ignorada, un
// `git add` de más subiría un certificado. Este test lo fija y comprueba que ninguna ruta versionada esté ahí.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
