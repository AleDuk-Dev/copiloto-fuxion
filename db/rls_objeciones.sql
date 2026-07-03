-- ─────────────────────────────────────────────────────────────
-- COPILOTO FUXION — RLS para la tabla `objeciones` (Fase B)
--
-- Contexto: la tabla `objeciones` del Mago de Oz (Fase 0) quedó
-- sin RLS en Fase A, documentado a propósito en db/schema.sql §4.
-- Este script cierra esa deuda SIN romper el flujo desplegado en
-- main: el endpoint /api/generar solo hace INSERT con la anon key
-- desde el servidor (ver lib/supabase.ts → guardarObjecion) y
-- nunca hace SELECT/UPDATE/DELETE.
--
-- Qué cambia:
--   - Se activa RLS (mismo patrón drop/create que `perfiles`).
--   - INSERT sigue permitido para anon y authenticated → el Mago
--     de Oz en producción no se rompe.
--   - SELECT/UPDATE/DELETE quedan SIN policy → bloqueados para la
--     anon key. Antes de este script, cualquiera con la anon key
--     (que es pública por diseño) podía LEER toda la tabla; ahora
--     solo el service role (dashboard de Supabase / scripts de
--     Alejandro) puede leerla.
--
-- Cómo ejecutarlo: pegar en el SQL Editor del proyecto de Supabase
-- existente y correr. Es idempotente.
-- ─────────────────────────────────────────────────────────────

alter table public.objeciones enable row level security;

-- El Mago de Oz inserta de forma anónima (sin usuario autenticado).
-- Se mantiene ese contrato tal cual — es solo escritura, tipo buzón.
drop policy if exists "objeciones_insert_publico" on public.objeciones;
create policy "objeciones_insert_publico" on public.objeciones
  for insert to anon, authenticated
  with check (true);

-- Nota: no hay policy de SELECT/UPDATE/DELETE a propósito.
-- Nadie lee esta tabla desde la app; el historial por usuario de
-- Fase B vive en `historial_objeciones` (ver db/schema_fase_b.sql),
-- que sí tiene RLS por user_id como `perfiles`.
