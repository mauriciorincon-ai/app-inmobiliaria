// Barril de tipos para las previews de design-sync: el alias de paths "app-inmobiliaria"
// (tsconfig) apunta aquí, así `pnpm typecheck` valida las previews contra la API real.
// (El entry del bundle NO usa este archivo: el convertidor solo camina los .tsx del directorio.)
export { Boton } from "../../src/components/ui/Boton";
export { Campo } from "../../src/components/ui/Campo";
export { Logo } from "../../src/components/ui/Logo";
export { EncabezadoInterior } from "../../src/components/ui/EncabezadoInterior";
export { Progreso } from "../../src/components/publicar/Progreso";
