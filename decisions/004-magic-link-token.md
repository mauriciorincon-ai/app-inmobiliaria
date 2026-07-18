# ADR 004 — Magic link "mi anuncio": token 256-bit hasheado + superficie RPC

- **Estado:** Aceptado
- **Fecha:** 2026-07-18
- **Sprint:** 002

## Contexto

El fundador vuelve a completar/editar su anuncio sin cuenta ni contraseña (publicar = registro
sigue intacto). Necesita un secreto portable que no exponga PII ni permita enumerar anuncios.

## Decisión

**Token aleatorio de 256 bits (base64url, 43 chars) generado en Postgres (`pgcrypto`); en BD solo
se persiste su hash SHA-256 (`edit_token_hash`).** Todas las acciones van por POST (las RPC de
supabase-js son POST); el token viaja como **fragment** (`/mi-anuncio#t=…`), que jamás llega al
servidor ni a los logs de acceso.

- **Generación en SQL, no en el endpoint:** el token, su hash y el retorno-en-claro-una-sola-vez
  quedan atómicos en la misma transacción de `registrar_fundador`; `generar_link_anuncio`
  (operador) reutiliza el mismo código.
- **Hash SHA-256 sin pepper:** un pepper protege secretos de baja entropía (contraseñas, IPs). Un
  token aleatorio de 256 bits ES la llave — imposible de fuerza bruta por construcción; un pepper
  además impediría que la RPC verifique sola.
- **Sin expiración + rotación:** el fundador completa su anuncio "cuando quiera" y el re-contacto
  del S1 depende de links vivos. La rotación existe: `generar_link_anuncio` reemplaza el hash → el
  link viejo muere. Un solo token activo por inmueble.
- **Retorno en claro:** `registrar_fundador` pasó de `returns uuid` a `returns jsonb
{id,slug,token}` (drop+recreate por el cambio de tipo). El endpoint responde `{id,slug,token}`;
  el Wizard guarda el link en **sessionStorage** (efímero, muere con la pestaña) y `/confirmacion`
  lo muestra con `MagicLinkGuardar` — si no hay link (visita directa), no renderiza nada y la
  confirmación conserva su prerender estático.

## Desviación respecto al plan

El plan autoritativo listaba 6 RPCs. La implementación añadió `marcar_portada`,
`guardar_contacto_publico` y `eliminar_foto` (acciones del editor que el plan implicaba pero no
enumeraba). Todas siguen el mismo patrón SECURITY DEFINER + token.
