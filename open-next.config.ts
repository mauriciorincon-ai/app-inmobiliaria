import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Config de OpenNext para desplegar en Cloudflare Workers (ADR 001). Por defecto sin caché
// incremental (suficiente para S1: landing estática + endpoint/panel dinámicos). Se enriquece en
// H2a si se necesita ISR/caché.
export default defineCloudflareConfig();
