import { defineConfig, devices } from "@playwright/test";

// Config que el ci.yml del kit ya asume (job e2e: "pnpm test:e2e").
// Patrón validado en app-nutri-kids S1. Móvil primero: las apps del pipeline son mobile-first.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    // El idioma de la app sale de Accept-Language (ADR 013) y Chromium manda en-US por defecto:
    // sin esto las specs escritas en español verían la portada en inglés. Las pruebas en inglés
    // lo cambian con `test.use({ locale: "en-US" })`.
    locale: "es-CO",
    trace: "on-first-retry",
    // El mapa de /buscar (MapLibre) necesita WebGL; el Chromium sin pantalla de la CI no tiene GPU y
    // Chrome desactiva por defecto el WebGL por software (SwiftShader). Este flag lo permite.
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // El job e2e del CI no hace build previo → en CI se construye aquí; local usa dev server.
    command: process.env.CI ? "pnpm build && pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Sin esto Playwright DESCARTA el stdout del servidor (pino loggea a stdout) y los errores
    // del server component quedan invisibles en CI.
    stdout: "pipe",
    // Las perillas de prueba que la CI pone en su job (S16; deuda del S10): así `pnpm test:e2e` en local levanta el mismo servidor
    // sin depender de un `.env.local`. Playwright las suma al entorno del proceso. Jamás llegan a producción: la guarda de
    // despliegue veta estos nombres.
    env: { TASA_SIMULACRO: "1", NUEVOS_SIMULACRO: "1", LECTOR_CTL_ACTIVO: "1" },
  },
});
