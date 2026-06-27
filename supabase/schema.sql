-- code-srs schema. Run this once in the Supabase SQL editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
-- Design: one table per entity. The full entity object lives in `data` (jsonb),
-- exactly as the app already shapes it, so the repository never maps fields.
-- A few hot query fields are pulled out as generated columns so Postgres can
-- index them. Row Level Security locks every row to its owner.

-- ---------------------------------------------------------------------------
-- Cards
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
  reviewed_at bigint generated always as ((data ->> 'reviewedAt')::bigint) stored
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

create policy "own rows" on public.cards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.decks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.drafts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.review_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
