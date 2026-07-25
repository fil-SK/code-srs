-- CardState extraction (Itera redesign Phase D, docs/itera-migration-plan.md
-- §4). Additive only — nothing existing changes. One row per Card, holding
-- the CardV2 CardState shape (src/types/cardV2.ts): scheduling fields plus
-- `suspended`, folded together per that type's own design (unlike v1, where
-- `suspended` lives directly on Card, not inside `scheduling`).
--
-- Card.scheduling keeps being both written and read as the source of truth
-- until a later, separate read-cutover step — this table is dual-written
-- alongside it, not yet read from anywhere.
--
-- Unverified against a live database: written while this project's Supabase
-- instance was deleted (see itera-decisions.md). Apply and check RLS/grants
-- before relying on it against a real project.

create table if not exists public.card_states (
  card_id text primary key references public.cards (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data    jsonb not null
);

create index if not exists card_states_user_idx on public.card_states (user_id);

alter table public.card_states enable row level security;

create policy "own rows" on public.card_states
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Missing this grant is the exact bug that caused a production 403 earlier
-- in this project (Postgres denies the table before RLS runs) — every new
-- migration file re-checks this.
grant select, insert, update, delete on public.card_states to authenticated;

-- Rollback:
--   drop table if exists public.card_states;
-- Safe only while nothing reads from this table yet (i.e. before the
-- corresponding read-cutover step ships) — true today, since Phase D stops
-- at dual-write in this milestone. Card.scheduling was never stopped or
-- modified, so dropping this table loses nothing.
