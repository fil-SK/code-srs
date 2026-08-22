-- Atomic review persistence (docs/itera-decisions.md, 2026-08-22; audit
-- §10 items 5 and 6). Grading writes two tables: the card's advanced
-- scheduling and the immutable review log describing the transition. As two
-- PostgREST requests those are two committed statements, so a failure between
-- them leaves a card scheduled forward with no history row - permanently
-- invisible in Progress and unreconstructible, because every stat derives from
-- the logs. This function makes the pair one Postgres transaction. Undo gets
-- the exact inverse for the same reason.
--
-- NOT DESTRUCTIVE. It creates two functions and grants execute on them. No
-- table, column, index, policy or existing grant is touched, and no row is
-- deleted. Re-runnable: both are `create or replace`.
--
-- Unverified against a live database: this project's Supabase instance no
-- longer exists (CURRENT_STATE.md §15). docs/TODO.md records exactly what to
-- check on the first real project.
--
-- Why this function exists when the `replace_workspace` function of D242 was
-- deliberately not written: that one is destructive, spans five tables, and
-- could not be shipped blind. This one is additive, touches two rows, invents
-- no privilege model, and its ownership check is the RLS policy that already
-- guards both tables.
--
-- FSRS is never computed here. Both functions receive the entities the client
-- already computed and store them verbatim.

-- ---------------------------------------------------------------------------
-- commit_review: advance one card's scheduling and record its log, atomically.
--
-- SECURITY INVOKER, deliberately. The body runs as the caller, so the existing
-- `own rows` policies apply unchanged: the update matches zero rows for a card
-- the caller does not own, and the insert's `with check` refuses a log that
-- would not belong to them. That *is* the ownership check - SECURITY DEFINER
-- would mean re-implementing it by hand with nothing gained.
--
-- search_path is pinned so an unqualified name cannot be captured by a
-- caller-controlled schema. The body qualifies everything anyway, and the
-- policies call auth.uid() fully qualified, so nothing depends on the path.
--
-- Atomicity is PostgREST's per-request transaction plus plpgsql exception
-- semantics: any raise, and any constraint violation (including
-- review_logs_state_before_check), rolls both statements back.
-- ---------------------------------------------------------------------------
create or replace function public.commit_review(
  p_card_id text,
  p_card    jsonb,
  p_log_id  text,
  p_log     jsonb
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- Every entity carries its id inline as well as in the row key, and the
  -- repository reads entities out of `data`. A disagreement between the two
  -- would produce a row nothing can find again.
  if p_card ->> 'id' is distinct from p_card_id then
    raise exception 'card payload id % does not match row key %',
      p_card ->> 'id', p_card_id;
  end if;
  if p_log ->> 'id' is distinct from p_log_id then
    raise exception 'review log payload id % does not match row key %',
      p_log ->> 'id', p_log_id;
  end if;

  update public.cards set data = p_card where id = p_card_id;
  if not found then
    -- Zero rows means the card does not exist, or the `own rows` policy hid
    -- someone else's. Either way nothing is written.
    raise exception 'card % is not available to this user', p_card_id;
  end if;

  -- Idempotent on retry. A commit that reached Postgres but whose response was
  -- lost leaves the client believing it failed; re-sending the identical
  -- result must not produce a second log or advance scheduling twice. The card
  -- update is already idempotent (same jsonb), and this makes the insert so.
  insert into public.review_logs (id, data)
  values (p_log_id, p_log)
  on conflict (id) do nothing;

  -- `on conflict do nothing` is resolved by the primary-key index, which RLS
  -- does not filter, so a conflict with a row owned by someone else would look
  -- like success. This select is RLS-scoped and therefore proves the log that
  -- is now there is ours.
  if not exists (select 1 from public.review_logs where id = p_log_id) then
    raise exception 'review log % is not available to this user', p_log_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- revert_review: the exact inverse - restore the pre-grade card and remove the
-- log that grade produced. Same security model, same transaction guarantee.
-- ---------------------------------------------------------------------------
create or replace function public.revert_review(
  p_card_id text,
  p_card    jsonb,
  p_log_id  text
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_card ->> 'id' is distinct from p_card_id then
    raise exception 'card payload id % does not match row key %',
      p_card ->> 'id', p_card_id;
  end if;

  update public.cards set data = p_card where id = p_card_id;
  if not found then
    raise exception 'card % is not available to this user', p_card_id;
  end if;

  -- RLS-scoped, and deliberately not checked for a match. An undo retried
  -- after the delete already committed must succeed, not fail on a row that is
  -- already gone.
  delete from public.review_logs where id = p_log_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute privilege. Signed-in users only; anon is intentionally left out,
-- exactly as it is for every table grant. Missing grants are the recurring
-- 403 in this project, so every migration file re-checks them.
-- ---------------------------------------------------------------------------
revoke all on function public.commit_review(text, jsonb, text, jsonb) from public;
revoke all on function public.revert_review(text, jsonb, text) from public;
grant execute on function public.commit_review(text, jsonb, text, jsonb) to authenticated;
grant execute on function public.revert_review(text, jsonb, text) to authenticated;

-- Rollback:
--   drop function if exists public.commit_review(text, jsonb, text, jsonb);
--   drop function if exists public.revert_review(text, jsonb, text);
-- Safe at any time: dropping them writes nothing and loses no data. The client
-- calls these functions, so a rollback must be paired with reverting
-- src/data/supabase/SupabaseRepository.ts to a build that does not.
