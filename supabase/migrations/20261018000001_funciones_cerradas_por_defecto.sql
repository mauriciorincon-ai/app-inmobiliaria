-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 6 (Sprint 005) — «Las funciones nuevas nacen cerradas».
--
-- Por qué: la migración 5 (S4) quitó a `anon`/`authenticated` el EXECUTE DIRECTO por defecto, pero un
-- `alter default privileges … IN SCHEMA` se SUMA al default global y no puede quitar el de PUBLIC:
-- una función nueva seguía naciendo ejecutable por todos (medido con una función sonda en el S4, ADR
-- 012) y solo el test de catálogo lo atrapaba. Esta migración cierra esa puerta en el origen.
--
-- Qué hace (idempotente; cero cambios de datos ni de firmas):
--   1. Default GLOBAL de `postgres` (sin IN SCHEMA): ninguna función que `postgres` cree de aquí en
--      adelante concede EXECUTE a PUBLIC. Con el default de `public` de la migración 5, una función
--      nueva nace SOLO para su dueño (y service_role) y cada migración abre explícitamente lo que
--      deba abrir: `grant execute … to anon, authenticated` si es RPC pública, `… to authenticated`
--      si es del operador.
--   2. Reafirma POR FIRMA (no por nombre: paga el B2 del S4) quién ejecuta qué hoy. Medido antes de
--      escribirla: las 13 RPC públicas YA tenían grants explícitos y ninguna función de `public`
--      dependía de PUBLIC, así que esto no cambia ningún permiso existente: lo deja escrito y
--      verificable. Si una firma de la lista cambia, el cast falla en voz alta.
--
-- Costo declarado: el default global también quita PUBLIC a lo que `postgres` cree en otros esquemas
-- (p. ej. una extensión futura). Las funciones de la app que usan esas extensiones son SECURITY
-- DEFINER y corren como `postgres`, así que no se ven afectadas.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Funciones futuras: sin EXECUTE para PUBLIC.
alter default privileges for role postgres revoke execute on functions from public;

-- 2. Lista blanca de RPC públicas, por firma exacta.
do $$
declare
  f record;
  publicas regprocedure[] := array[
    'public.eliminar_foto(text, uuid)'::regprocedure,
    'public.guardar_contacto_publico(text, boolean)'::regprocedure,
    'public.guardar_descripcion(text, text)'::regprocedure,
    'public.marcar_portada(text, uuid)'::regprocedure,
    'public.obtener_codigo_referido(text)'::regprocedure,
    'public.obtener_cupos()'::regprocedure,
    'public.obtener_ficha(text)'::regprocedure,
    'public.obtener_mi_anuncio(text)'::regprocedure,
    'public.obtener_mis_referidos(text)'::regprocedure,
    'public.ping()'::regprocedure,
    'public.registrar_foto(text, text, integer, integer, integer)'::regprocedure,
    'public.registrar_fundador(text, text, text, text, text, public.operacion, public.tipo_inmueble, text, text, integer, smallint, bigint, boolean, text, text)'::regprocedure,
    'public.renovar_vigencia(text)'::regprocedure
  ];
begin
  for f in
    select p.oid::regprocedure as firma
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
      -- Solo funciones PROPIAS: `postgres` no es superusuario y no puede cambiar objetos de otro
      -- dueño, y los event triggers (p. ej. `rls_auto_enable`, de Supabase) los gestiona la
      -- plataforma: no se tocan (visto en producción, solo lectura, S4).
      and p.proowner = (select r.oid from pg_roles r where r.rolname = current_user)
      and p.prorettype <> 'event_trigger'::regtype
  loop
    -- Ninguna función de `public` depende de PUBLIC.
    execute format('revoke execute on function %s from public', f.firma);
    if f.firma = any (publicas) then
      execute format(
        'grant execute on function %s to anon, authenticated, service_role', f.firma
      );
    else
      execute format('revoke execute on function %s from anon', f.firma);
    end if;
  end loop;
end;
$$;
