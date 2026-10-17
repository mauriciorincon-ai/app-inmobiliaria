-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 4 (Sprint 004) — «Lista blanca de RPC para anon».
--
-- Por qué: las RPC del operador (marcar_verificado, generar_link_anuncio, y en la migración 3
-- fijar_cupo, obtener_lote, registrar_envio…) se protegían SOLO con `revoke … from public` +
-- `grant … to authenticated`, y sus cuerpos no comprueban el rol. Eso depende de los privilegios
-- POR DEFECTO del stack. Medido en local (Sprint 004): en la imagen de Postgres 17.6.1.147 (la versión
-- que reporta el proyecto enlazado) el default de funciones en `public` es solo `postgres`; en la
-- 17.11.0.004 (la que levanta la CLI en CI) incluye `anon`, `authenticated` y `service_role`, así que
-- `anon` ejecutaba TODAS las RPC, y el e2e de RLS lo cazó con `marcar_verificado`. Un permiso que
-- depende del default de una imagen cambia sin que nadie toque el repo.
--
-- Qué hace (idempotente; cero cambios de datos ni de firmas):
--   1. `anon` solo ejecuta la LISTA BLANCA de RPC públicas; a todo lo demás de `public` se le
--      revoca (PUBLIC y anon). Las públicas conservan el `grant … to anon, authenticated` que ya
--      traen sus migraciones.
--   2. Las funciones de cron e internas tampoco las ejecuta `authenticated`.
--   3. Los privilegios por defecto dejan de dar EXECUTE a PUBLIC/anon/authenticated sobre
--      funciones nuevas de `public`: toda función nueva nace cerrada y la migración que la cree
--      debe abrirla de forma EXPLÍCITA si es pública.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Lista blanca de RPC públicas (anon + authenticated): el flujo del vendedor, la ficha, los
--    cupos, el referido, la renovación y el keep-alive. Cada una trae su propia comprobación de
--    token dentro del cuerpo cuando toca datos de un anuncio.
do $$
declare
  f record;
  publicas text[] := array[
    'eliminar_foto',
    'guardar_contacto_publico',
    'guardar_descripcion',
    'marcar_portada',
    'obtener_codigo_referido',
    'obtener_cupos',
    'obtener_ficha',
    'obtener_mi_anuncio',
    'obtener_mis_referidos',
    'ping',
    'registrar_foto',
    'registrar_fundador',
    'renovar_vigencia'
  ];
begin
  for f in
    select p.oid::regprocedure as firma
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
      -- Solo funciones PROPIAS: `postgres` no es superusuario y no puede revocar sobre objetos de
      -- otro dueño, y los event triggers (p. ej. `rls_auto_enable`, de Supabase) los gestiona la
      -- plataforma: no se tocan. Visto en producción (solo lectura, S4).
      and p.proowner = (select r.oid from pg_roles r where r.rolname = current_user)
      and p.prorettype <> 'event_trigger'::regtype
      and not (p.proname = any (publicas))
  loop
    execute format('revoke execute on function %s from public, anon', f.firma);
  end loop;
end;
$$;

-- 2. Cron (marcar_vencidos: SOLO service_role) e internas (generar_slug: solo la llaman otras
--    funciones SECURITY DEFINER; tocar_updated_at: función de trigger, no se invoca por API).
revoke execute on function public.marcar_vencidos() from authenticated;
revoke execute on function public.generar_slug(text, text) from authenticated;
revoke execute on function public.tocar_updated_at() from authenticated;

-- 3. Funciones futuras: nacen cerradas. Las migraciones corren como `postgres`.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
