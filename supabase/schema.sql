-- Itera schema. Run this once in the Supabase SQL editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
-- Design: one table per entity. The full entity object lives in `data` (jsonb),
-- exactly as the app already shapes it, so the repository never maps fields.
-- A few hot query fields are pulled out as generated columns so Postgres can
-- index them. Row Level Security locks every row to its owner.

-- ---------------------------------------------------------------------------
-- Cards. One row per card: content plus its own embedded FSRS scheduling.
-- (The former `cards_v2` and `card_states` tables are gone — see
-- supabase/migrations/0002_single_card_model.sql.)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Decks
-- ---------------------------------------------------------------------------
create table if not exists public.decks (
  id      text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data    jsonb not null
);

-- ---------------------------------------------------------------------------
-- Drafts (the quick-capture inbox)
-- ---------------------------------------------------------------------------
create table if not exists public.drafts (
  id      text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data    jsonb not null
);

-- ---------------------------------------------------------------------------
-- Review logs (one row per review; stats derive from these)
-- ---------------------------------------------------------------------------
create table if not exists public.review_logs (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null,
  card_id     text   generated always as (data ->> 'cardId') stored,
  reviewed_at bigint generated always as ((data ->> 'reviewedAt')::bigint) stored,
  constraint review_logs_state_before_check check (
    data ? 'stateBefore'
    and data ->> 'stateBefore' in ('new', 'learning', 'review', 'relearning')
  )
);

create index if not exists reviews_user_card_idx on public.review_logs (user_id, card_id);
create index if not exists reviews_user_time_idx on public.review_logs (user_id, reviewed_at);

-- ---------------------------------------------------------------------------
-- Row Level Security: each row is readable/writable only by its owner.
-- ---------------------------------------------------------------------------
alter table public.cards       enable row level security;
alter table public.decks       enable row level security;
alter table public.drafts      enable row level security;
alter table public.review_logs enable row level security;

-- Each policy is dropped first so this whole script stays re-runnable, the way
-- every `create table if not exists` above it already is. Postgres has no
-- `create policy if not exists`, so an unguarded re-run aborts at the first
-- one with 42710. Same pattern as the roadmaps block below and
-- migrations/0002_single_card_model.sql.
drop policy if exists "own rows" on public.cards;
create policy "own rows" on public.cards
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own rows" on public.decks;
create policy "own rows" on public.decks
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own rows" on public.drafts;
create policy "own rows" on public.drafts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own rows" on public.review_logs;
create policy "own rows" on public.review_logs
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Table privileges. RLS decides *which rows*; these grants decide whether the
-- role may touch the table at all. Without them every request 403s before RLS
-- runs. Only signed-in users get access (anon is intentionally left out).
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.cards, public.decks, public.drafts, public.review_logs
  to authenticated;

-- ---------------------------------------------------------------------------
-- Roadmaps (learning-order graphs whose nodes reference decks). Added after the
-- initial schema; this whole block is a self-contained migration you can paste
-- and run on an existing database. Table + RLS + policy + grant, same pattern
-- as every other entity. The grant is what keeps it from 403ing.
-- ---------------------------------------------------------------------------
create table if not exists public.roadmaps (
  id      text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data    jsonb not null
);

alter table public.roadmaps enable row level security;

drop policy if exists "own rows" on public.roadmaps;
create policy "own rows" on public.roadmaps
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.roadmaps to authenticated;
