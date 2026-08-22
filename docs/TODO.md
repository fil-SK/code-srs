# TODO — deferred product work

Scratch list of things deliberately **not** built, kept so they are not
re-derived from scratch each time. Anything here that a milestone has since
decided on is recorded properly in `itera-decisions.md`; this file is the
holding pen, not a source of truth.

## Adjust session — advanced controls

Deferred by D214 (Milestone 2). Adjust session ships with deck scope + card
count only, and **nothing is abstracted in anticipation of these**:

- "15 minute session" / time-boxed sessions
- weak cards only
- new cards vs. reviews
- difficulty filters
- interaction-type filters
- tag filters
- custom FSRS options

## Weekly goal

Deferred by D209 (Milestone 2), which removed the fabricated
"4 of 5 sessions" row rather than computing it. A real one needs a persisted
target, a settings surface to set it, and a definition of what counts toward
it (sessions? reviews? days studied?).

## Milestones and achievements

Deferred by D210 (Milestone 2). Today's Next milestone is a *derived*
in-progress-deck continuation, recomputed each render — there is no milestone
or achievement entity. A real system would cover mastery milestones, topic
completion, streak and review-volume awards, custom goals, and unlocking as
the app is used.

## Deck identity

Icons for decks, specific backgrounds with SVG to place above, or to use text.
Today and the Library currently derive a 1-3 character monogram from the deck
name (`markLabelFor`), which is deterministic but not chosen.

## Roadmaps

## Deck marketplace

## Advanced session controls

## Dark mode

## Onboarding demo in the app

## Notifications

Notifications that some cards are pending to be done etc.

## How WriteCode currently works

Write Code currently compares against accepted complete answers, so semantically equivalent code written differently can be marked objectively wrong. That's already a known product constraint, not a reason to change this dataset.

This is now okay. I write the cards and I know which answer I expect, so I test myself on it. For production, this might not be the best approach to do it.

## Browser-local learning data when an origin moves to the cloud

Deferred by D251 (2026-08-22, audit P1-3). Fixing the auth-mode bug settled what
happens to the stale *session* when a local-first origin gains `VITE_SUPABASE_*`:
it is cleared, and the user must sign in with Supabase. It deliberately did not
answer what happens to their **workspace** - the decks, cards and review logs
still sitting in that browser's IndexedDB, which the app no longer reads because
`getRepository()` now returns `SupabaseRepository`.

That data is left exactly where it is: not deleted, not uploaded. Auto-migrating
it would silently write a whole workspace into a cloud account the user had not
signed into at the time, and deleting it would discard data the app has no right
to discard. The honest interim answer is the existing export/import path - the
user can export before the switch and merge afterwards - but nothing in the UI
tells them their local data is now unreachable, which is the real gap.

Closing it means a deliberate product decision, not a refactor: at minimum a
detected-local-data notice on the Supabase-mode login or account surface, and an
explicit, user-initiated one-way upload built on the existing backup format and
`importBackup` merge semantics. It is not an auth concern and should not be
attached to `AuthProvider`.

## Transactional replace-import on Supabase

Deferred by D242 (2026-08-22, audit P1-1). Replace-import is all-or-nothing on
the local backend because Dexie gives a real transaction across all five stores;
PostgREST gives no equivalent, so `SupabaseRepository.replaceAll` refuses rather
than clearing tables it could not restore, and the Import / Export section shows
Replace as an `aria-disabled` option with the reason. Merge is unaffected.

Closing it needs a database-side function — one transaction doing the delete +
insert for cards, decks, drafts, review_logs and roadmaps for `auth.uid()` —
shipped as a new sequential `supabase/migrations/` file with its RLS/GRANT
implications and rollback notes, then `SupabaseRepository` calling it and
reporting `importGuarantee: 'transactional'`. It was not written blind: the
project's Supabase instance no longer exists, so the SQL could not be executed
or verified, and untested destructive SQL is a worse trade than a stated
limitation.

## Remaining risk after the replace-import fix (audit P1-1)

Recorded 2026-08-22 alongside D237-D243, so the parts of the P1-1 report that
were *not* closed are not re-derived later. The local Replace path is genuinely
all-or-nothing; these are what that guarantee does not cover.

1. **Supabase Replace is unavailable, not fixed.** A cloud user has no one-step
   restore. Merge is the workaround and cannot remove entities the backup no
   longer contains, so a cloud workspace cannot be rolled back to an earlier
   state at all. See "Transactional replace-import on Supabase" above for what
   closing it requires.
2. **Supabase Merge stays best-effort.** Five sequential upserts, so a failure
   part-way leaves some entities applied and others not. Additive only, so
   nothing is destroyed, and `importGuarantee: 'best-effort'` already makes the
   UI say "may now be incomplete" rather than claiming safety. Unchanged by the
   P1-1 pass and only worth revisiting together with item 1 - the same RPC could
   carry merge.
3. **The local guarantee is IndexedDB's guarantee.** The transaction protects
   against a failed write, not against the browser evicting the origin's
   storage, a corrupted database, or a user clearing site data. No
   application-level change helps; the answer is the export file, which is why
   `Settings -> Export JSON` stays the documented backup story.
4. **The intermittent single-run test flake is still unidentified.** Not
   observed in either full run of the P1-1 pass and not investigated there; it
   belongs to the audit's own §9, and `CURRENT_STATE.md` §16 carries the
   standing instruction to capture the complete output when it next appears.
