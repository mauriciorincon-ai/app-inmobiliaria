# ADR 002 — Schema de captación: RPC `SECURITY DEFINER` en vez de INSERT directo de anon

- **Estado:** Aceptado
- **Fecha:** 2026-07-15
- **Sprint:** 001
- **Contexto normativo:** el plan del sprint dice «anónimo solo INSERT vía el flujo». Este ADR
  documenta que la implementación es **más estricta** que ese literal (el propio sprint lo
  contempla: «ADR de schema si difiere del propuesto»).

## Contexto

El registro público lo hace un usuario **anónimo** (rol `anon` de Supabase). Debe:

1. Crear `vendedor` + `inmueble` **atómicamente** (sin huérfanos si algo falla).
2. Grabar `consentimiento_at` (Ley 1581) que **fija el servidor**, jamás el cliente.
3. Estar protegido de abuso (rate limiting) con costo US$0 y sin estado en el runtime serverless.

Un patrón de «INSERT directo con política RLS para anon» no cumple bien esto: obligaría a políticas
INSERT sobre las tablas (superficie de escritura directa), no garantiza atomicidad entre dos
tablas desde el cliente, y no permite validar consentimiento/rate-limit en el mismo acto.

## Decisión

**Toda escritura del flujo público pasa por una RPC Postgres `registrar_fundador(...)`
`SECURITY DEFINER`; `anon` NO tiene ninguna política sobre las tablas.**

- `anon` solo recibe `EXECUTE` sobre `registrar_fundador` y `ping`. Sin políticas de
  SELECT/INSERT/UPDATE/DELETE sobre `vendedores`/`inmuebles`/`registro_intentos` ⇒ acceso directo
  denegado por defecto (RLS activo + cero políticas).
- La función (definer = dueño de las tablas) valida y hace ambos INSERT en **una transacción**
  (una función PL/pgSQL = una transacción). `consentimiento_at := now()` dentro de la función.
- `search_path = ''` + nombres calificados (`public.…`) ⇒ inmune a secuestro por search_path.
- El operador (`authenticated`, filtrado además por allowlist de email en la app) tiene políticas
  `SELECT` (ambas tablas) y `UPDATE` (inmuebles).

Esto **es** «anónimo solo escribe vía el flujo», por construcción más seguro (imposible saltarse
la validación de consentimiento/rate-limit).

## Detalles

- **Rate limiting en la BD (US$0, sin estado en runtime):** tabla `registro_intentos(ip_hash,
creado_at)`. La RPC cuenta intentos por `ip_hash` en ventanas (3/hora, 10/día) y lanza error →
  el endpoint responde 429. La IP se **hashea con pepper** en el servidor (minimización Ley 1581);
  nunca se guarda cruda. Complementos en el endpoint: honeypot + time-trap (funciones puras del
  motor) + re-validación zod.
- **Estado inicial `publicado_fundador`:** al INSERT ya hay datos completos + consentimiento;
  `borrador` no tiene sentido sin escritura parcial en BD. El enum conserva `borrador` para S2
  (fotos), donde sí habrá edición incremental.
- **Persistencia por paso = cliente:** como no puede existir fila antes del consentimiento
  (paso 3) y `anon` no puede UPDATE, «retomar si se cae» se resuelve en `localStorage`
  (clave `publicar.draft.v1`, revalidada con zod al restaurar). El envío es **una** llamada.
- **Keep-alive:** RPC `ping()` (otorgada a anon) + GitHub Action semanal
  (`.github/workflows/supabase-ping.yml`) contra la pausa del proyecto free.

## Consecuencias

- La app **no** hace INSERT directos desde el cliente; todo pasa por `/api/registro` → RPC.
- Añadir campos al registro = tocar migración (columnas + firma de la RPC) + esquema zod + payload.
- El endpoint debe correr en runtime con acceso de red saliente a Postgres (Route Handler
  `nodejs`, coherente con el ADR 001; no edge).

## Alternativas descartadas

- **Política INSERT para anon sobre las tablas:** superficie de escritura directa, sin atomicidad
  cross-tabla desde el cliente, sin punto único para validar consentimiento/rate-limit.
- **Rate limit en el runtime (memoria):** no hay estado compartido entre invocaciones serverless;
  Postgres ya es el estado compartido, gratis.
- **Guardar la IP cruda:** viola minimización (Ley 1581). Se hashea con pepper.
