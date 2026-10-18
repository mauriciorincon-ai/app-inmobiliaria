// El Worker de Innmobiliaria (S8, ADR 016): el de OpenNext + un Cron Trigger. `wrangler.jsonc` apunta aquí
// (`main`), y wrangler lo empaqueta junto con `.open-next/worker.js`, que genera `opennextjs-cloudflare
// build`. Por eso este archivo queda fuera de `tsc` (tsconfig `exclude`): antes del build ese módulo no
// existe. La lógica que importa vive en `src/engine/cron/peticion.ts`, con sus pruebas.
//
// El `scheduled` no duplica nada: arma la petición del trabajo diario y se la pasa al `fetch` de la propia
// app. Así el cron, las pruebas y el workflow de respaldo pasan por la MISMA ruta, protegida con
// `CRON_SECRET` (secreto del Worker).
import { default as app } from "./.open-next/worker.js";
import { peticionCron } from "./src/engine/cron/peticion";

type Entorno = { CRON_SECRET?: string } & Record<string, unknown>;
type Contexto = { waitUntil(promesa: Promise<unknown>): void };

// La URL interna solo da forma a la petición; nunca sale a la red.
const BASE_INTERNA = "https://cron.innmobiliaria.invalid";

const worker = {
  fetch: app.fetch,
  async scheduled(_evento: unknown, env: Entorno, ctx: Contexto) {
    if (!env.CRON_SECRET) {
      console.error(JSON.stringify({ evento: "cron_sin_secreto" }));
      return;
    }
    const res = await app.fetch(
      peticionCron(env.CRON_SECRET, BASE_INTERNA),
      env,
      ctx,
    );
    const cuerpo = await res.text();
    console.log(
      JSON.stringify({
        evento: "cron",
        status: res.status,
        cuerpo: cuerpo.slice(0, 300),
      }),
    );
    // Un fallo marca la ejecución del cron como fallida en el panel de Cloudflare.
    if (!res.ok) throw new Error(`cron ${res.status}`);
  },
};

export default worker;

export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from "./.open-next/worker.js";
