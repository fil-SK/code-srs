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

## Icons

Currently icons are looking really ugly. I need clean looking icons, like when GPT generates me in the mockup, and then to have them "standardized" for my app, so that the same ones are used in the web app and in mobile app. No need to try to adapt to some existing ones if they are ugly.

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

## Live verification of Supabase pagination (audit P1-4)

Recorded 2026-08-22 alongside D255-D261. The repository no longer inherits
PostgREST's per-request row cap: every collection read pages to completion, and
the loop is correct whether the project's **Max rows** setting is above or below
the page size it asks for. That is the fix, and it does not depend on any server
configuration — "set Max rows high" was explicitly rejected as an answer.

What is still open is only evidence. The pagination loop has never run against a
live PostgREST service: the project's Supabase instance no longer exists
(`CURRENT_STATE.md` §15), so no real Max rows cap has ever truncated a real
response here. Every assertion comes from the chainable fake client in
`packages/core/src/data/supabase/fakeSupabaseClient.ts`, which models the cap and the
Content-Range total from the PostgREST contract rather than from an observed
response.

Closing it means, on the first real project: run `schema.sql`, then `0002`, then
`0003`; note the project's Max rows value for the record; load one table past
that value; and confirm a full `reviews.all()` and a backup export both come
back complete. Two things only a live service can settle are worth checking
specifically — that `count: 'exact'` is actually returned under RLS on every
paged request, and that ordering by the generated `due` / `reviewed_at` columns
performs acceptably at size.

## Live verification of the review-commit RPC on Supabase (audit §10 item 6)

Recorded 2026-08-22 alongside D270-D280. Review persistence is atomic on both
backends now, but the two guarantees rest on different evidence. Dexie's is a
real `db.transaction('rw', cards, reviewLogs, ...)` exercised by nine tests over
fake-indexeddb, including forced failures at either store, and proven
non-vacuous by removing the transaction and watching them fail. Supabase's rests
on `supabase/migrations/0004_review_commit_rpc.sql`, which **has never run
against a live Postgres** - the project's instance no longer exists
(`CURRENT_STATE.md` §15). The client-side tests assert the RPC contract against
the fake client in `packages/core/src/data/supabase/fakeSupabaseClient.ts`, which models the
function's semantics from the SQL rather than from an observed response.

Run `schema.sql`, then `0002`, `0003` and `0004`, then confirm on the first real
project:

1. **A grade writes both rows.** One `commit_review` call advances the card's
   `data`/`due` and inserts the log; `/progress/history` shows exactly one new
   entry.
2. **A failure writes neither.** Feed a log missing `stateBefore`: the
   `review_logs_state_before_check` constraint must abort the whole call and
   leave the card's `data` at its pre-grade value. This is the one that proves
   the transaction, and it cannot be proven anywhere else.
3. **Ownership is enforced by RLS, not by trust.** From a second account, call
   `commit_review` with the first account's card id: it must raise
   `card ... is not available to this user` and write nothing. `SECURITY
   INVOKER` is what makes that true, so this check is what validates D274.
4. **A retry is a no-op.** Calling `commit_review` twice with the identical
   arguments must leave exactly one log and one scheduling advance
   (`on conflict (id) do nothing`).
5. **`anon` cannot execute either function.** `revoke all ... from public` plus
   the single `grant ... to authenticated` is the whole access model; confirm an
   unauthenticated call is refused.
6. **Undo is the inverse, and is retry-safe.** `revert_review` restores the card
   and removes the log in one call, and calling it again after the log is gone
   still succeeds.

Until then, cloud review persistence is code- and contract-verified but not
service-verified, and `CURRENT_STATE.md` §15 says so. Note that without `0004`
applied, cloud grading fails loudly on every attempt rather than writing
partially - the client has no fallback to the old card-then-log sequence, which
is deliberate.

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

## Focus return for dialogs opened from a row kebab menu (audit P2-A)

Recorded 2026-08-22 alongside D266. `DialogHost` now returns focus to whatever
was focused when the dialog opened, and that works for every dialog opened from
an ordinary button - New deck, Rename, the Import/Export replace confirm, the
card table's delete. It does **not** work for a dialog opened from a deck row's
overflow menu, and the dialog is not the reason.

Those row menus are `FloatingPanel`s rendered **without** `manageFocus`, which
is deliberate (design-system §3: the pointer-driven row kebabs were shipped
without menu keyboard semantics and were left that way). So the panel does not
return focus to its kebab when it closes; clicking a menu item leaves focus on
the removed item, and by the time `DialogHost` mounts and reads
`document.activeElement` it is already `document.body`. There is no opener to
return to, and the dialog correctly declines to invent one. Verified in Chromium
at 1440x900 and 390x844: delete-deck from the row menu, cancel, focus lands on
`body`.

Closing it means turning `manageFocus` on for the row kebab menus (and passing
`returnFocusTo`), which changes menu keyboard behaviour across the Library -
focus enters the menu, arrows walk it, Tab closes it. That is a deliberate
interaction change for those rows, not a bug fix, so it was left out of a pass
scoped to six specific findings. Before this pass no dialog returned focus at
all, so nothing regressed; this is the one path the improvement does not reach.

## Magic-link send: raw error text, and a "Sending…" that can never end

Noticed during the 2026-08-22 P2 pass and recorded here on 2026-08-23, during
the Step 1.5 auth extraction, because it is still open and was not written down
anywhere but a parenthetical in D263.

`sendMagicLink` in `apps/web/src/features/login/SignInPanel.tsx` has two gaps, and they
are the two things D262/D263 closed on the *bootstrap* path but not on the
*sign-in* path:

1. It renders `error.message` verbatim, which is the raw GoTrue/transport
   string. D263 deliberately refused that for the bootstrap message on the
   grounds that "TypeError: Failed to fetch" tells a learner nothing they can
   act on; the same argument applies here.
2. There is no `try`/`catch`, and it is invoked as `void sendMagicLink(...)`.
   `signInWithOtp` **returns** some failures and **throws** others (the same
   split D262 had to handle). On a throw the rejection is swallowed, `magicLink`
   stays `'sending'` forever, and the submit button stays disabled reading
   "Sending…" with no way back but a reload.

Deliberately not fixed in Step 1.5: that step was a structural extraction that
moved no Login behaviour and changed no Login copy, and the shared boundary is
correct without touching this - initiating a magic link is a web sign-in action
with a web redirect URL (`window.location.origin`), which is exactly the kind of
thing the auth split leaves platform-side. A future native client will call
`signInWithOtp`/`verifyOtp` through its own flow without going near this code.

Closing it means: wrap the call, treat a throw and a returned error identically,
end in a decided state on every path, and show a written sentence rather than
the transport's. That is Login polish and wants its own small pass.

## Content security for a future native renderer

Step 1.6's audit covers the **web** content boundary and found no stored-XSS
defect there; that finding is enforced by
`apps/web/src/components/text/renderingSinks.test.ts`, so this is deliberately **not** a
standing "audit XSS someday" item and the web side needs no follow-up.

What is genuinely open is only what does not exist yet. A native renderer will
inherit the shared parser in `packages/core/src/content/` - which is the point
of the split, since it cannot then invent a different interpretation of the
syntax - but inheriting a safe *tree* is not the same as rendering it safely.
Its own renderer needs the equivalent regression pass when it is written: no
raw-markup API on that platform, code blocks literal, and the same
malicious-content fixture (`packages/core/src/test/attackPayloads.ts`) driven
through it. The image rule travels with the parser already, because
`isSafeImageSource` is shared rather than living in the web renderer.

Not actionable until a native renderer exists. Recorded here so it is not
rediscovered as a gap.

## Verify Vercel deployment after workspace migration

Before the next public deployment, confirm the Vercel dashboard still uses repository root as Root Directory and that apps/web/dist is the configured/recognized output. If Root Directory is apps/web, reconcile the repository/dashboard settings and use dist instead. Perform one production deployment and verify SPA routing/PWA assets.

## Gamify

How to improve Itera with better UX, using famification? For both web and mobile or just mobile?

## LeetCode usage

How to use Itera for SRS in regards to LeetCode? How to market it in that regards as well

## Shareable results

A button that, when clicked, generates something which could then be shared on e.g. Instagram story.

## Revert the root Expo tsconfig edit and the root `.expo/` (noted 2026-08-24)

Starting Expo from the repository root instead of through `npm run dev:mobile`
(which runs inside `apps/mobile`) makes the Expo CLI adopt the root as its own
project. It added `"extends": "expo/tsconfig.base"` and an empty
`"compilerOptions"` to the root `tsconfig.json`, and created an untracked root
`.expo/`. Neither belongs there: the root is workspace orchestration only, and
mobile deliberately keeps Expo's generated non-composite config outside the root
TypeScript solution (`architecture.md`, "Workspace layout").

Harmless for now, and verified so: `npx tsc -b --force` still exits 0, because
the root is a solution file with `"files": []`, which makes the injected options
inert. It is left in place on purpose while a second agent's Expo workflow may
depend on starting from the root.

At the end of mobile development: restore `tsconfig.json` to the four bare
`references`, delete the root `.expo/`, and add `.expo/` to the **root**
`.gitignore` - only `apps/mobile/.gitignore` covers it today, so the root copy is
currently committable. Re-verify with `npx tsc -b --force` and one
`npm run dev:mobile` start.
