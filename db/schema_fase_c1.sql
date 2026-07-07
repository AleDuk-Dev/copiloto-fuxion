-- ─────────────────────────────────────────────────────────────
-- COPILOTO FUXION — Schema Fase C1: monetización + roles (aditivo)
--
-- IMPORTANTE: 100% aditivo, igual que las fases anteriores.
-- Ejecutar en el SQL Editor del MISMO proyecto de Supabase,
-- después de schema.sql, rls_objeciones.sql y schema_fase_b.sql.
-- Es idempotente.
--
-- Qué agrega:
--   1. Columnas de suscripción (Stripe) y de equipo en `perfiles`.
--   2. Grants por columna: el usuario autenticado solo puede
--      actualizar `nombre` directamente. Todo lo demás (plan,
--      estado, lider_id, código) cambia SOLO vía webhook de Stripe
--      (service role) o funciones security definer — así nadie se
--      "auto-asciende" a líder editando su fila.
--   3. Funciones de equipo: generar código de invitación, canjear
--      código, y métricas AGREGADAS del equipo (Regla 4 del skill
--      de cumplimiento: nunca datos individuales de otro
--      distribuidor).
-- ─────────────────────────────────────────────────────────────

-- ── 0. pgcrypto (gen_random_bytes para códigos de invitación) ─
-- En Supabase suele venir activa en el schema `extensions`.
create extension if not exists pgcrypto;

-- ── 1. Columnas nuevas en perfiles ───────────────────────────
alter table public.perfiles
  add column if not exists plan text not null default 'gratis'
    check (plan in ('gratis', 'individual', 'lider')),
  -- null = nunca tuvo suscripción. 'pago_fallido' no corta el
  -- acceso de inmediato: Stripe reintenta (dunning) y el webhook
  -- actualiza cuando se resuelva o cancele.
  add column if not exists estado_suscripcion text
    check (estado_suscripcion in ('activa', 'pago_fallido', 'cancelada')),
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  -- Código que un líder comparte con su línea. Solo tiene valor
  -- si el perfil es líder (lo genera la función de abajo).
  add column if not exists codigo_invitacion text unique,
  -- Relación jerárquica explícita (Regla 4): miembro → su líder.
  add column if not exists lider_id uuid references public.perfiles (id) on delete set null;

create index if not exists perfiles_lider_idx on public.perfiles (lider_id);

comment on column public.perfiles.plan is
  'Tier de suscripción (Fase C1). Lo actualiza SOLO el webhook de Stripe (service role).';
comment on column public.perfiles.lider_id is
  'Líder de la línea del distribuidor. Se asigna SOLO vía canjear_invitacion().';

-- ── 2. Grants por columna ────────────────────────────────────
-- RLS ya limita a "su propia fila"; esto limita QUÉ columnas puede
-- tocar el propio usuario. Sin esto, un usuario podría hacer
-- update de su propio plan/rol/lider_id con la anon key.
revoke update on public.perfiles from authenticated;
grant update (nombre, actualizado_en) on public.perfiles to authenticated;

-- ── 3. Generar código de invitación (solo líderes) ───────────
-- El líder lo llama desde /dashboard/equipo. Idempotente: si ya
-- tiene código, devuelve el existente (no invalida el repartido).
create or replace function public.generar_codigo_invitacion()
returns text
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_perfil public.perfiles%rowtype;
  v_codigo text;
begin
  select * into v_perfil from public.perfiles where id = auth.uid();

  if v_perfil.id is null then
    raise exception 'Perfil no encontrado.';
  end if;

  if not (v_perfil.rol in ('lider', 'admin') and v_perfil.plan = 'lider'
          and v_perfil.estado_suscripcion in ('activa', 'pago_fallido')) then
    raise exception 'Necesitas el plan Líder activo para invitar a tu equipo.';
  end if;

  if v_perfil.codigo_invitacion is not null then
    return v_perfil.codigo_invitacion;
  end if;

  -- Código corto legible: FX- + 8 hex (suficiente entropía para
  -- este volumen; unique constraint evita colisiones).
  v_codigo := 'FX-' || upper(encode(gen_random_bytes(4), 'hex'));
  update public.perfiles set codigo_invitacion = v_codigo, actualizado_en = now()
    where id = v_perfil.id;
  return v_codigo;
end;
$$;

revoke execute on function public.generar_codigo_invitacion from public, anon;
grant execute on function public.generar_codigo_invitacion to authenticated;

-- ── 4. Canjear código de invitación ──────────────────────────
-- Un distribuidor entra a la línea de un líder. No expone ningún
-- dato del líder salvo su nombre (para confirmar a quién se une).
create or replace function public.canjear_invitacion(p_codigo text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_lider public.perfiles%rowtype;
begin
  select * into v_lider
    from public.perfiles
    where codigo_invitacion = upper(trim(p_codigo));

  if v_lider.id is null then
    raise exception 'Código de invitación no válido.';
  end if;

  if v_lider.id = auth.uid() then
    raise exception 'No puedes unirte a tu propio equipo.';
  end if;

  if not (v_lider.plan = 'lider'
          and v_lider.estado_suscripcion in ('activa', 'pago_fallido')) then
    raise exception 'Este código pertenece a un líder sin plan activo.';
  end if;

  update public.perfiles
    set lider_id = v_lider.id, actualizado_en = now()
    where id = auth.uid();

  return coalesce(v_lider.nombre, 'tu líder');
end;
$$;

revoke execute on function public.canjear_invitacion from public, anon;
grant execute on function public.canjear_invitacion to authenticated;

-- ── 5. Salir de un equipo ────────────────────────────────────
-- Derecho básico del miembro: dejar la línea cuando quiera.
create or replace function public.salir_de_equipo()
returns void
language sql
security definer set search_path = public
as $$
  update public.perfiles set lider_id = null, actualizado_en = now()
    where id = auth.uid();
$$;

revoke execute on function public.salir_de_equipo from public, anon;
grant execute on function public.salir_de_equipo to authenticated;

-- ── 6. Métricas agregadas del equipo (Regla 4) ───────────────
-- Devuelve UNA fila de agregados. Nunca filas por miembro, nunca
-- contenido de objeciones/prospectos de otros. Solo el líder de
-- la línea puede llamarla sobre SU línea (auth.uid()).
create or replace function public.metricas_equipo()
returns table (
  total_miembros bigint,
  activos_ultimos_7d bigint,
  generaciones_mes bigint,
  promedio_generaciones_mes numeric
)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_rol text;
begin
  select rol into v_rol from public.perfiles where id = auth.uid();
  if v_rol not in ('lider', 'admin') then
    raise exception 'Solo un líder puede ver métricas de equipo.';
  end if;

  return query
  with miembros as (
    select id from public.perfiles where lider_id = auth.uid()
  ),
  uso as (
    select h.user_id, count(*) as n
      from public.historial_objeciones h
      join miembros m on m.id = h.user_id
      where h.creado_en >= date_trunc('month', now())
      group by h.user_id
  )
  select
    (select count(*) from miembros),
    (select count(distinct h.user_id)
       from public.historial_objeciones h
       join miembros m on m.id = h.user_id
       where h.creado_en >= now() - interval '7 days'),
    coalesce((select sum(n) from uso), 0)::bigint,
    case when (select count(*) from miembros) = 0 then 0
         else round(coalesce((select sum(n) from uso), 0)::numeric
                    / (select count(*) from miembros), 1)
    end;
end;
$$;

revoke execute on function public.metricas_equipo from public, anon;
grant execute on function public.metricas_equipo to authenticated;
