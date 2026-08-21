-- Progress correctness clean break (docs/itera-decisions.md, 2026-08-21).
-- ReviewLogs written before this milestone do not record the card's scheduling
-- state before grading, so mature retention cannot be reconstructed honestly.
-- The prototype history is explicitly disposable: clear it instead of mixing
-- old post-state heuristics with the current contract.
--
-- DESTRUCTIVE. This deletes every existing review log. It preserves cards,
-- decks, drafts, and roadmaps. Unverified against a live database; apply it in
-- the Supabase SQL editor before relying on cloud Progress analytics.

delete from public.review_logs;

alter table public.review_logs
  drop constraint if exists review_logs_state_before_check;

alter table public.review_logs
  add constraint review_logs_state_before_check check (
    data ? 'stateBefore'
    and data ->> 'stateBefore' in ('new', 'learning', 'review', 'relearning')
  );

-- Reassert the privilege required before RLS can evaluate row ownership.
grant select, insert, update, delete on public.review_logs to authenticated;

-- Rollback:
--   alter table public.review_logs
--     drop constraint if exists review_logs_state_before_check;
-- Deleted prototype rows can only be recovered from a database backup taken
-- before this migration.
