-- ─────────────────────────────────────────────────────────────
-- FASE C2 — CRM de prospectos + resúmenes de WhatsApp
--
-- Ejecutar en el editor SQL de Supabase DESPUÉS de schema_fase_c1.sql.
-- Idempotente: se puede ejecutar más de una vez sin romper nada.
--
-- Contiene:
--   1. Tabla `prospectos` (CRM completo — reemplaza a `prioridades`)
--   2. Migración de datos de `prioridades` → `prospectos`
--   3. Tabla `resumenes_whatsapp` (SOLO resumen + estado confirmado;
--      la conversación cruda pegada NUNCA se persiste — ver regla abajo)
--   4. Columna `prospecto_id` en `historial_objeciones` (vínculo
--      objeción ↔ prospecto)
--
-- REGLA 3 DE CLAUDE.md (consentimiento como gate técnico): igual que
-- en `prioridades` (Fase B), el CHECK de base de datos hace imposible
-- insertar un prospecto sin consentimiento = true.
--
-- REGLA NO NEGOCIABLE (Fase C2): la conversación cruda de WhatsApp
-- que el distribuidor pega en la UI NO tiene columna en ninguna tabla.
-- Este schema no define ningún campo capaz de guardarla — solo el
-- resumen generado (máx. 1500 chars) y el estado que el humano
-- confirma. Si en el futuro alguien propone añadir una columna
-- "conversacion" o "texto_original", la respuesta es NO.
-- ─────────────────────────────────────────────────────────────

-- ─── 1. Tabla prospectos (CRM ligero) ────────────────────────

create table if not exists public.prospectos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Apodo/pseudónimo obligatorio, nunca nombre completo (la UI lo indica).
  apodo text not null check (char_length(apodo) between 1 and 60),
  -- Fase C2 amplía los estados de Fase B con 'cliente' y 'perdido'.
  estado text not null check (estado in ('frio', 'tibio', 'caliente', 'cliente', 'perdido')),
  -- Notas libres del distribuidor sobre el prospecto.
  nota text check (char_length(nota) <= 2000),
  -- Gate técnico de consentimiento: sin default, debe enviarse true.
  consentimiento boolean not null check (consentimiento = true),
  consentimiento_fecha timestamptz not null default now(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.prospectos is
  'CRM ligero de prospectos (Fase C2). Consentimiento como CHECK — Regla 3 de CLAUDE.md. Sustituye a prioridades (Fase B).';

create index if not exists prospectos_user_idx
  on public.prospectos (user_id, estado);

alter table public.prospectos enable row level security;

drop policy if exists "prospectos_select_propio" on public.prospectos;
create policy "prospectos_select_propio" on public.prospectos
  for select using (auth.uid() = user_id);

drop policy if exists "prospectos_insert_propio" on public.prospectos;
create policy "prospectos_insert_propio" on public.prospectos
  for insert with check (auth.uid() = user_id);

drop policy if exists "prospectos_update_propio" on public.prospectos;
create policy "prospectos_update_propio" on public.prospectos
  for update using (auth.uid() = user_id);

-- Derecho de borrado GDPR (proceso manual por ahora — Regla 2 del
-- skill de cumplimiento).
drop policy if exists "prospectos_delete_propio" on public.prospectos;
create policy "prospectos_delete_propio" on public.prospectos
  for delete using (auth.uid() = user_id);

-- ─── 2. Migración de datos: prioridades → prospectos ─────────
-- Se conserva el mismo id para que la migración sea idempotente
-- (on conflict do nothing). Los estados caliente/tibio/frio son
-- válidos tal cual en el CHECK nuevo.
--
-- La tabla `prioridades` NO se borra aquí: queda como respaldo
-- hasta que Alejandro confirme que la migración funcionó en
-- producción. Cuando lo confirme, se puede ejecutar:
--   drop table public.prioridades;

insert into public.prospectos
  (id, user_id, apodo, estado, nota, consentimiento, consentimiento_fecha, creado_en, actualizado_en)
select
  id, user_id, apodo, estado, nota, consentimiento, consentimiento_fecha, creado_en, actualizado_en
from public.prioridades
on conflict (id) do nothing;

-- ─── 3. Tabla resumenes_whatsapp ─────────────────────────────
-- Guarda ÚNICAMENTE el resumen generado por Claude y el estado que
-- el distribuidor confirmó a mano (Regla 1: humano en el loop — la
-- sugerencia no se guarda sola; solo se inserta tras confirmación).
-- El CHECK de longitud (1500) hace además inviable colar una
-- conversación completa por este campo.

create table if not exists public.resumenes_whatsapp (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prospecto_id uuid not null references public.prospectos (id) on delete cascade,
  -- Solo el resumen. NUNCA la conversación cruda (regla de Fase C2).
  resumen text not null check (char_length(resumen) between 1 and 1500),
  -- Lo que sugirió la IA (para poder auditar si sugiere bien)…
  estado_sugerido text not null check (estado_sugerido in ('frio', 'tibio', 'caliente')),
  -- …y lo que el humano decidió (puede diferir — esa es la idea).
  estado_confirmado text not null check (estado_confirmado in ('frio', 'tibio', 'caliente', 'cliente', 'perdido')),
  -- La conversación mencionaba una condición de salud (el detalle
  -- NO se guarda — GDPR art. 9, ver skill de cumplimiento).
  alerta_salud boolean not null default false,
  -- Coste real por llamada (skill de token-optimization, Mecanismo 3).
  tokens_entrada integer,
  tokens_salida integer,
  creado_en timestamptz not null default now()
);

comment on table public.resumenes_whatsapp is
  'Resúmenes de conversaciones de WhatsApp (Fase C2). La conversación cruda NUNCA se persiste — solo el resumen y el estado confirmado por el distribuidor.';

create index if not exists resumenes_whatsapp_prospecto_idx
  on public.resumenes_whatsapp (prospecto_id, creado_en desc);

alter table public.resumenes_whatsapp enable row level security;

drop policy if exists "resumenes_select_propio" on public.resumenes_whatsapp;
create policy "resumenes_select_propio" on public.resumenes_whatsapp
  for select using (auth.uid() = user_id);

drop policy if exists "resumenes_insert_propio" on public.resumenes_whatsapp;
create policy "resumenes_insert_propio" on public.resumenes_whatsapp
  for insert with check (auth.uid() = user_id);

drop policy if exists "resumenes_delete_propio" on public.resumenes_whatsapp;
create policy "resumenes_delete_propio" on public.resumenes_whatsapp
  for delete using (auth.uid() = user_id);

-- ─── 4. Vínculo objeción ↔ prospecto ─────────────────────────
-- Opcional (nullable): las objeciones sueltas siguen funcionando
-- igual. on delete set null: borrar un prospecto no borra el
-- historial del distribuidor, solo lo desvincula.

alter table public.historial_objeciones
  add column if not exists prospecto_id uuid references public.prospectos (id) on delete set null;

create index if not exists historial_objeciones_prospecto_idx
  on public.historial_objeciones (prospecto_id)
  where prospecto_id is not null;
