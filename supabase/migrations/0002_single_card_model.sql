-- Single card model (docs/itera-decisions.md, 2026-08-18). The v1/v2 card
-- split is gone: one `cards` table holds every card as content plus its own
-- embedded FSRS scheduling. `cards_v2` and `card_states` are dropped.
--
-- DESTRUCTIVE. This deletes all existing card and scheduling rows. It was run
-- deliberately: the data it drops was generated prototype content that the
-- project owner explicitly chose not to preserve. Do not run this against a
-- database whose cards you care about.
--
-- Note `card_states.card_id` carried `references public.cards (id) on delete
-- cascade`, so the constraint is dropped before `cards` is — otherwise
-- dropping `cards` would cascade into `card_states` mid-migration.
--
-- Unverified against a live database: written while this project's Supabase
-- instance was deleted (see itera-decisions.md D42). Apply and check
-- RLS/grants before relying on it against a real project.

-- 1. Remove the dependent table first (its FK points at `cards`).
drop table if exists public.card_states;

-- 2. Drop both old card tables.
drop table if exists public.cards_v2;
drop table if exists public.cards;

-- 3. Recreate the one card table. Same one-table, data-jsonb-plus-generated-
--    columns pattern as every other entity.
create table if not exists public.cards (
  id        text primary key,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data      jsonb not null,
  deck_id   text    generated always as (data ->> 'deckId') stored,
  due       bigint  generated always as ((data -> 'scheduling' ->> 'due')::bigint) stored,
  suspended boolean generated always as ((data ->> 'suspended')::boolean) stored
);

create index if not exists cards_user_due_idx on public.cards (user_id, suspended, due);
create index if not exists cards_user_deck_idx on public.cards (user_id, deck_id);

alter table public.cards enable row level security;

drop policy if exists "own rows" on public.cards;
create policy "own rows" on public.cards
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Missing this grant is the exact bug that caused a production 403 earlier in
-- this project (Postgres denies the table before RLS runs) — every migration
-- file re-checks this.
grant select, insert, update, delete on public.cards to authenticated;

-- Rollback:
--   There is none. This migration drops rows rather than moving them, by
--   design (see the header). Restoring the pre-migration state would mean
--   restoring the database from a Supabase backup taken before it ran.
