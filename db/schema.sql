-- ─────────────────────────────────────────────────────────────
-- COPILOTO FUXION — Schema Fase A (aditivo)
--
-- IMPORTANTE: este script es 100% ADITIVO. No borra ni modifica
-- la tabla `objeciones` del Mago de Oz (Fase 0), que sigue en uso
-- por el endpoint /api/generar desplegado en main.
--
-- Cómo ejecutarlo: pegar en el SQL Editor del proyecto de Supabase
-- existente (el mismo del Mago de Oz) y correr. Es idempotente:
-- se puede ejecutar más de una vez sin romper nada.
--
-- Qué NO incluye todavía (a propósito):
--   - Tabla de prospectos → Fase B/C, requiere el gate de
--     consentimiento (consent_given) como CHECK constraint.
--   - pgvector / tablas de RAG → Fase B.
--   - Roles líder/equipo → Fase C.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Perfiles de distribuidor ──────────────────────────────
-- Supabase Auth ya gestiona usuarios y sesiones en el schema
-- `auth` (auth.users, auth.sessions). Esta tabla guarda los datos
-- de perfil propios de la app, 1:1 con auth.users.
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text,
  -- 'distribuidor' por ahora; 'lider' y 'admin' se activan en Fase C
  rol text not null default 'distribuidor'
    check (rol in ('distribuidor', 'lider', 'admin')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.perfiles is
  'Perfil de cada distribuidor, 1:1 con auth.users. Fase A.';

-- ── 2. Trigger: crear perfil automáticamente al registrarse ──
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trigger_crear_perfil on auth.users;
create trigger trigger_crear_perfil
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- ── 3. Row Level Security ────────────────────────────────────
-- Cada distribuidor solo ve y edita SU propio perfil.
-- (Regla 4 del skill de cumplimiento: nada de datos entre peers.)
alter table public.perfiles enable row level security;

drop policy if exists "perfil_select_propio" on public.perfiles;
create policy "perfil_select_propio" on public.perfiles
  for select using (auth.uid() = id);

drop policy if exists "perfil_update_propio" on public.perfiles;
create policy "perfil_update_propio" on public.perfiles
  for update using (auth.uid() = id);

-- Nota: no hay policy de INSERT/DELETE para usuarios — el insert
-- lo hace el trigger (security definer) y el delete es cascade
-- desde auth.users.

-- ── 4. Proteger la tabla existente del Mago de Oz ────────────
-- La tabla `objeciones` (Fase 0) se creó sin RLS y el endpoint
-- /api/generar escribe en ella con la anon key desde el servidor.
-- En Fase A no se activó RLS para no romper el flujo desplegado.
-- RESUELTO EN FASE B: ver db/rls_objeciones.sql (RLS activado,
-- insert anónimo preservado, lecturas bloqueadas para la anon key).
