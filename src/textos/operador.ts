// Panel del operador. El equipo de Innmobiliaria lo usa en español o en inglés (S5). Los términos
// del dominio se conservan y se explican cuando hace falta.
import type { Arbol } from "@/i18n/textos";

export const OPERADOR = {
  login: {
    titulo: { es: "Panel del operador", en: "Operator panel" },
    aviso: {
      es: "Acceso solo para el equipo de Innmobiliaria.",
      en: "Access for the Innmobiliaria team only.",
    },
    correo: { es: "Correo", en: "Email" },
    contrasena: { es: "Contraseña", en: "Password" },
    entrar: { es: "Entrar", en: "Sign in" },
    entrando: { es: "Entrando…", en: "Signing in…" },
    errorCredenciales: {
      es: "Correo o contraseña incorrectos.",
      en: "Incorrect email or password.",
    },
  },
  cargando: {
    titulo: { es: "Registros", en: "Records" },
    estado: { es: "Cargando registros…", en: "Loading records…" },
  },
} as const satisfies Arbol;
