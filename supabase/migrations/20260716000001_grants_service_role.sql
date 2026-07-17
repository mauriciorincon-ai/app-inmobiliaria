-- Grants para service_role (rol de backend: scripts de seed/operación, jamás el navegador).
--
-- Contexto: el proyecto cloud se creó con "Automatically expose new tables" APAGADO (control
-- manual de acceso — ADR 002), así que ningún rol recibe privilegios por defecto. La migración
-- 0001 otorgó a `authenticated` (panel) y dejó a `anon` sin nada (solo la RPC). Faltaba el rol
-- de backend: la convención de Supabase es que service_role tenga acceso total (además ya tiene
-- BYPASSRLS). Sin esto, cualquier script de operación (seed, fotos S2, lotes S4) muere con
-- "permission denied". Descubierto en el aprovisionamiento de S1.

grant all on public.vendedores, public.inmuebles, public.registro_intentos to service_role;
grant usage, select on all sequences in schema public to service_role;
