-- ─────────────────────────────────────────────────────────────
-- COPILOTO FUXION — Schema Fase B (aditivo)
--
-- IMPORTANTE: 100% aditivo, igual que schema.sql de Fase A.
-- No toca `objeciones` (eso lo hace db/rls_objeciones.sql) ni
-- `perfiles`. Ejecutar en el SQL Editor del MISMO proyecto de
-- Supabase, después de schema.sql y rls_objeciones.sql.
-- Es idempotente.
--
-- ⚠️ GATE DE NEGOCIO (Fase 0 aún no confirmada): el corpus del RAG
-- se llena con DATOS DE EJEMPLO (scripts/ingest.ts + db/seed/).
-- La columna `es_dato_ejemplo` permite purgarlos de un tiro cuando
-- llegue el contenido real:
--   delete from documentos_rag where es_dato_ejemplo = true;
-- ─────────────────────────────────────────────────────────────

-- ── 0. Extensión pgvector ────────────────────────────────────
create extension if not exists vector;

-- ── 1. Corpus del RAG ────────────────────────────────────────
-- Metadata obligatoria según skills/rag-ingestion/SKILL.md.
-- Dimensión 1024 = voyage-3 (ver lib/embeddings.ts — único archivo
-- que conoce el proveedor de embeddings).
create table if not exists public.documentos_rag (
  id uuid primary key default gen_random_uuid(),
  -- Clave natural para ingestión incremental/idempotente:
  -- el script de ingestión no re-procesa chunks ya cargados.
  fuente_id text not null unique,
  source_type text not null check (
    source_type in ('catalogo', 'transcripcion_diamante', 'objecion_real', 'guion_curso')
  ),
  -- Modos ya definidos en la app. null = aplica a todo.
  product_tag text check (product_tag in ('general', 'peso', 'energia', 'piel')),
  objection_type text check (
    objection_type in ('precio', 'tiempo', 'escepticismo', 'ya_lo_probe', 'salud_seguridad', 'otro')
  ),
  titulo text,
  contenido text not null,
  embedding vector(1024),
  -- Contenido viejo se marca obsoleto, no se borra (histórico).
  obsoleto boolean not null default false,
  es_dato_ejemplo boolean not null default false,
  date_captured timestamptz not null default now()
);

comment on table public.documentos_rag is
  'Corpus del RAG (catálogo, transcripciones, objeciones). Fase B. Corpus pequeño y curado.';

-- Índice vectorial. Con un corpus de 50-200 páginas, lists=10 basta.
create index if not exists documentos_rag_embedding_idx
  on public.documentos_rag
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- RLS sin policies: el corpus NO se lee ni escribe directo con la
-- anon key. Escribe el script de ingestión (service role) y lee la
-- función buscar_documentos (security definer, solo authenticated).
alter table public.documentos_rag enable row level security;

-- ── 2. Función de búsqueda vectorial ─────────────────────────
-- Único camino de lectura del corpus para usuarios autenticados.
-- Filtra primero por product_tag (skill de RAG: no búsqueda pura
-- sobre todo el corpus si hay filtro disponible) y aplica umbral
-- de similitud coseno. Límite por defecto: 4 chunks (skill de
-- optimización de tokens: máx 3-5).
--
-- Umbral default 0.30 (no el 0.7 clásico): voyage-3 en modo
-- asimétrico (query corta vs document largo con metadata) da
-- similitudes en un rango más bajo — matches correctos medidos
-- entre 0.35 y 0.57 con scripts/debug-retrieval.ts; con 0.7 nada
-- pasaba. El valor operativo vive en lib/rag.ts; re-calibrar con
-- ese script al cargar el corpus real.
create or replace function public.buscar_documentos(
  query_embedding vector(1024),
  filtro_producto text default null,
  umbral float default 0.3,
  limite int default 4
)
returns table (
  id uuid,
  contenido text,
  source_type text,
  product_tag text,
  titulo text,
  similitud float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.contenido,
    d.source_type,
    d.product_tag,
    d.titulo,
    1 - (d.embedding <=> query_embedding) as similitud
  from public.documentos_rag d
  where d.obsoleto = false
    and d.embedding is not null
    and (
      filtro_producto is null
      or d.product_tag is null
      or d.product_tag = filtro_producto
      or d.product_tag = 'general'
    )
    and 1 - (d.embedding <=> query_embedding) > umbral
  order by d.embedding <=> query_embedding
  limit least(limite, 5);
$$;

revoke execute on function public.buscar_documentos from public, anon;
grant execute on function public.buscar_documentos to authenticated, service_role;

-- ── 3. Historial personal de objeciones ──────────────────────
-- Cada distribuidor ve SOLO sus consultas (Regla 4: nada entre
-- peers). Sustituye, para usuarios autenticados, el rol que tenía
-- la tabla `objeciones` del Mago de Oz.
create table if not exists public.historial_objeciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  objecion text not null check (char_length(objecion) <= 1000),
  modo text not null check (modo in ('general', 'peso', 'energia', 'piel')),
  -- { emocional, logica, cierre }
  respuestas jsonb not null,
  alerta_salud boolean not null default false,
  contexto_suficiente boolean not null default true,
  -- Auto-reportado por el distribuidor (alimenta métricas de Fase C).
  resultado text check (resultado in ('cerro_venta', 'no_funciono')),
  -- Coste real por llamada desde el día 1 (skill de optimización).
  tokens_entrada int,
  tokens_salida int,
  creado_en timestamptz not null default now()
);

comment on table public.historial_objeciones is
  'Historial por distribuidor de objeciones generadas en /dashboard/objeciones. Fase B.';

create index if not exists historial_objeciones_user_idx
  on public.historial_objeciones (user_id, creado_en desc);

alter table public.historial_objeciones enable row level security;

drop policy if exists "historial_select_propio" on public.historial_objeciones;
create policy "historial_select_propio" on public.historial_objeciones
  for select using (auth.uid() = user_id);

drop policy if exists "historial_insert_propio" on public.historial_objeciones;
create policy "historial_insert_propio" on public.historial_objeciones
  for insert with check (auth.uid() = user_id);

-- Solo para marcar `resultado` (cerró venta / no funcionó).
drop policy if exists "historial_update_propio" on public.historial_objeciones;
create policy "historial_update_propio" on public.historial_objeciones
  for update using (auth.uid() = user_id);

-- ── 4. Prioridades (panel manual caliente/tibio/frío) ────────
-- Fase B intencionalmente simple: apodo + estado, sin scoring
-- automático (eso es Fase D) y sin el CRM completo (Fase C).
--
-- REGLA 3 DE CLAUDE.md (adelantada desde Fase C a propósito):
-- aunque el PRD permite "texto libre" aquí, un apodo de prospecto
-- ya es dato de prospecto → el consentimiento es un CHECK de base
-- de datos, no una nota de UI. No existe forma de insertar una
-- fila sin consentimiento = true.
create table if not exists public.prioridades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Apodo/pseudónimo, nunca nombre completo (la UI lo indica).
  apodo text not null check (char_length(apodo) between 1 and 60),
  estado text not null check (estado in ('caliente', 'tibio', 'frio')),
  nota text check (char_length(nota) <= 500),
  -- Gate técnico de consentimiento: sin default, debe enviarse true.
  consentimiento boolean not null check (consentimiento = true),
  consentimiento_fecha timestamptz not null default now(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.prioridades is
  'Panel manual de priorización de prospectos (Fase B). Consentimiento como CHECK — Regla 3.';

create index if not exists prioridades_user_idx
  on public.prioridades (user_id, estado);

alter table public.prioridades enable row level security;

drop policy if exists "prioridades_select_propio" on public.prioridades;
create policy "prioridades_select_propio" on public.prioridades
  for select using (auth.uid() = user_id);

drop policy if exists "prioridades_insert_propio" on public.prioridades;
create policy "prioridades_insert_propio" on public.prioridades
  for insert with check (auth.uid() = user_id);

drop policy if exists "prioridades_update_propio" on public.prioridades;
create policy "prioridades_update_propio" on public.prioridades
  for update using (auth.uid() = user_id);

-- El distribuidor puede borrar sus prospectos (derecho de borrado
-- si el prospecto lo pide — proceso manual por ahora, ver Regla 2
-- del skill de cumplimiento).
drop policy if exists "prioridades_delete_propio" on public.prioridades;
create policy "prioridades_delete_propio" on public.prioridades
  for delete using (auth.uid() = user_id);
