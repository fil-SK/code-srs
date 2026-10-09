# TODO — deferred product work

Scratch list of things deliberately **not** built, kept so they are not
re-derived from scratch each time. Anything here that a milestone has since
decided on is recorded properly in `fliptap-decisions.md`; this file is the
holding pen, not a source of truth.

## Publishing readiness priorities (2026-10-08)

The owner asked to record the release advice and worthwhile omissions (D474).
This is pending work, not a claim that anything below has shipped. A limited
browser-local web beta and a dependable native release have different gates.
Recording a candidate does not choose native storage, enable cloud work, or
undo the existing Demo and market-validation deferrals.

**Recommended first milestone:** useful first-use content plus honest local
entry. Then protect authored work, make recovery visible and rehearse the
production release before inviting a small group of target developers.

| Scope / priority | Work | Existing entry or new detail |
|---|---|---|
| Before web beta | First review without manual setup, followed by creating a personal card | Expand [web demo seeding](#seed-the-web-demo-workspace-deferred-2026-08-28) and [onboarding](#onboarding-demo-in-the-app); acceptance below |
| Before web beta | Honest local entry instead of a password that is never checked | New: [Local entry](#local-entry-and-storage-expectations) |
| Before web beta | Unsaved-work protection, actionable validation and recoverable save failures | New: [Protect authored work](#protect-authored-work) |
| Before web beta | Visible backup guidance and a fresh-browser restore rehearsal | Extend [existing backup risks](#remaining-risk-after-the-replace-import-fix-audit-p1-1); acceptance below |
| Before public exposure | Contact/feedback and an accurate data-handling explanation | New: [Support and feedback](#support-and-feedback) |
| Before web beta | Finished public navigation, accessible core journeys and production lifecycle checks | New: [Release acceptance](#release-surface-and-verification) |
| Before advertising code grading | Explain accepted-answer comparison and preserve learner control over ratings | Existing [Write Code constraint](#how-writecode-currently-works); clarify it in authoring and Review |
| Before publishing the marketing signup form | Verify a genuinely stored submission and actionable failure behavior | Existing [capture blocker](#early-access-capture-is-not-connected-found-2026-08-28) |
| Before dependable native release | Durable learning data, a recovery path and physical-device acceptance | Existing [M1A checkpoint](#live-supabase-project-for-mobile-and-the-m1a-checkpoint-noted-2026-08-24) covers one candidate backend; requirements below |
| Conditional on account/cloud release | Authentication recovery, account isolation and live backend evidence | Existing magic-link, pagination, RPC and import entries remain prerequisites; cloud stays deferred |
| During small beta | Observe first-use success and unaided return; resolve actual friction | New: [Beta validation](#beta-validation-and-follow-up-candidates) |
| After evidence from beta | Easier content intake, a manageable return after a gap and an optional reminder | Conditional candidates below; reuse existing session-control and notification entries |

### First-use acceptance

The empty web demo remains unseeded; its earlier deferral is not implemented.
The first-use milestone should let a new visitor:

- Start a short technical review within roughly two minutes, without creating
  a deck or supplying an import file first.
- Experience a small, accurate starter deck that demonstrates the value of
  code-first cards. Prefer reviewed original examples; verify permission and
  attribution for any redistributed content.
- Understand Again / Hard / Good / Easy through contextual help, then create,
  preview and save one useful card about their own material.
- Distinguish sample content from personal learning. Illustrative demo history
  must stay explicitly sample history, never the new user's earned progress
  or achievements.
- Skip guidance and return to it later. No mandatory multi-screen tour.

### Local entry and storage expectations

`apps/web/src/features/login/SignInPanel.tsx` requires a local email/password,
but `signInLocal` never verifies the password. Before public exposure of local
mode, replace the account implication with a clear local-workspace entry. Keep
real account sign-in distinct if and when a cloud mode is released.

Explain where decks and history live, whether another device can see them, and
what clearing browser data does. About already explains storage by mode; first
entry should not require finding About to learn this. Before an eventual
local-to-cloud transition, use the existing explicit migration entry below
instead of silently changing which workspace is read.

### Protect authored work

Source review finds form state in the six web editor shells, direct Cancel
navigation, and a keyed card-type switch that remounts the editor. There is no
dirty-form guard in that path. `CardEditorShell` accepts saving state but no
save-error presentation; for example, `RecallEditorShell` awaits `mutateAsync`
without presenting its rejection. `RecallFields` also does not render the
shared validator's required-field reasons.

Before web beta:

- Warn before a dirty form is discarded by Cancel, route/back navigation or
  changing interaction type. Cover reload/close where permitted; a browser
  prompt cannot guarantee protection against a crash.
- Show actionable field validation, especially why Recall cannot be saved.
- Keep content intact after a failed write, explain the failure and offer
  retry. Navigate only after success; retry must not create duplicate cards.
- Verify all six types, including code, images and Preview.

Recoverable editor autosave is a worthwhile follow-up if the guard does not
cover observed loss. The retained quick-capture `Draft` inbox is a separate
feature, not proof that unfinished editor forms are recoverable. Choose that
recovery storage deliberately; do not reshape the entity by assumption.

### Backup and durability acceptance

Web export/import already exists. This is discoverability and verification,
not a replacement backup engine:

- Explain browser-local storage at entry, keep Export easy to find, and consider
  a small backup reminder after meaningful authoring rather than every visit.
- Request persistent browser storage where supported; handle denial or lack
  of support honestly and surface actionable storage/write failures. Persistence
  reduces eviction risk; it is not another copy of the workspace.
  [MDN documents the storage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
- Restore a real export into a fresh browser profile. Verify decks, all six
  types, scheduling, history, icons and achievement evidence. Test failure
  without damaging the destination; retain the existing local transaction and
  cloud import limitations.
- For native release, require authored cards and history to survive force-quit,
  restart, backgrounding and upgrades, with an explicit export or recovery route.
  Current in-memory Demo does not satisfy this.
- Promise desktop-to-phone continuity only after transfer or shared-account
  data works end to end. Full native editor parity cannot replace durability.

### Support and feedback

Add an obvious contact/report-a-problem path and an accurate explanation of what
the released configuration stores or sends. A contact link is sufficient for a
small beta; no in-app ticketing system is needed.

A useful report can include version, platform, steps and an optional screenshot.
Do not attach card contents, code, exported workspaces or account tokens
automatically. Diagnostic collection, if introduced, needs an explicit data
boundary and appropriate disclosure. Verify that a report reaches the intended
inbox; a success message alone is not evidence.

### Release surface and verification

Route errors, safe content rendering, atomic local review writes, retry and Undo
already exist. Preserve them; this is production acceptance, not a claim that
those systems are missing.

- Review public navigation/settings for prototype placeholders and misleading
  account/device claims. Land Settings on useful functionality. Remove or
  honestly mark unavailable destinations; do not build every mockup section.
  Preserve Roadmap data and the policy for locked references.
- Reuse [Vercel verification](#verify-vercel-deployment-after-workspace-migration),
  [Remove /dev](#remove-the-dev-scenario-switcher-before-publishing),
  [PWA prompts](#pwa-prompts) and pending tooltip/menu-focus entries below.
  Review `/design-preview` separately: its fixture routes are not gated like
  `/dev`. Do not silently expose development/demo tools as product features.
- Verify the deployed HTTPS build: direct-route reload, install, local offline
  cold start, connection loss, failed-write retry, reopen, and an update during
  authoring or Review. Updates must not silently discard unsaved work or corrupt
  committed history. Cloud mode must state its connection requirement.
- Run the core journey with keyboard and a screen reader, at phone/desktop
  widths in Light/Dark: navigation, authoring, all six reviews, dialogs, grading
  and recovery. Check contrast, zoom, focus return, touch alternatives to
  dragging and reduced motion. Native behavior needs physical-device evidence.
- Make release checks repeatable: automated gates, a small production smoke
  test, and a deployment/recovery checklist. No repository CI workflow is present
  at this review; configure one when choosing the release workflow. Keep rollback
  compatible with already-written learner data.

### Beta validation and follow-up candidates

Invite roughly 5-10 target developers to use their own material over two weeks.
This is a practical research cohort, not a statistical success threshold.
Observe first review, useful card authoring, unaided return and recovery from
problems. Record friction and abandonment, not just feature requests or badge
clicks. Start with direct observation and voluntary feedback; no analytics SDK
or collection of card/code contents is implied.

Worthwhile follow-ups only if real use exposes the problem:

- **Lower-friction content intake:** document a path from notes or existing decks
  into useful cards. JSON import and the external AI prompt already exist.
  Consider CSV or Anki import if the cohort needs it; do not silently commit to
  APKG compatibility, a marketplace or runtime AI generation.
- **Returning after a gap:** offer an understandable, bounded session and humane
  overdue-work guidance. The existing card-count limit may suffice initially.
  Use deferred controls only when needed; never rewrite FSRS history or fabricate
  streak recovery.
- **One opt-in reminder:** scope the existing Notifications item to a useful
  review reminder with permission, timezone, quiet-hour and cancellation behavior.
  Native inbox previews are not OS reminders. Validate demand before a push backend.

More awards, weekly targets, marketplaces, billing, richer reports and a full
native editor set do not become web-beta blockers through this list.

## Early-access capture is not connected (found 2026-08-28)

`apps/marketing/src/earlyAccess.ts` — `submitEarlyAccessInterest` is
`Promise.reject(new EarlyAccessCaptureUnavailableError())`, unconditionally.
The marketing form validates the address, then discards it: the UI says
"Preview form: submissions are not stored yet" and, on submit,
"Email capture is not connected yet. Your details have not been sent or
stored." The honesty is deliberate (D451/D452 refused a mocked success state),
but the outcome is that **every interested visitor is lost**.

This is a hard blocker the moment `apps/marketing` is linked publicly, and a
non-issue until then. Closing it means connecting one provider behind the
existing seam — that file is written as "the only persistence boundary for the
marketing form" — then removing the "not stored yet" line and adding a **real**
success state. A real success state does not contradict D452, which refused a
*mocked* one.

Found by the pre-publish UX audit; ranked P0-1 in
[`pre-publish-plan.md`](pre-publish-plan.md).

## Seed the web demo workspace (deferred 2026-08-28)

`signInDemo()` (`packages/core/src/auth/authEngine.ts`) mints a session and
nothing else — there is no content seeding anywhere in `apps/web/src`. So
`/login`'s **"Continue with demo workspace"** lands a first-time visitor on an
empty Today with a dashed "No decks yet" box, and the six interaction types
(the whole differentiation) are invisible unless that visitor authors a card
first. Mobile does have real demo content:
`apps/mobile/src/demo/demoCardContent.ts` holds 18 reviewable cards.

**Deferred by product-owner decision, not by oversight.** The consequence to
plan around in the meantime: a public link should land on the marketing site,
not on the demo button.

Closing it means seeding on `signInDemo()` in web from the mobile content — 2–3
decks, ~18 cards covering all six interaction types, and backdated ReviewLogs so
Today, the streak, the heat map and retention have something true to show —
clearly labelled as a demo workspace (the account menu already says "Demo
workspace") and disposable in the local backend. Pairs naturally with the
"Onboarding demo in the app" item below.

Found by the pre-publish UX audit; ranked P2-1 in
[`pre-publish-plan.md`](pre-publish-plan.md).

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

D473 (2026-10-08) implements four evidence-based study achievements on web and
native Demo, superseding the blanket deferral under D210 for this bounded set.
Progress shows lifetime progress and earned dates; completion acknowledges new
unlocks. D475 replaces web Momentum's deck milestone with one pending shared achievement and a link to Progress; native Today keeps its existing presentation.

D500 adds the separate web Achievements view; native retains its Progress panel.
Still deferred: mastery/topic awards, custom goals,
XP, currency, levels and leaderboards. No achievement entity or scoring subsystem
was introduced. Native physical-device verification is pending.

## Deck identity

Web's generic-icon portion is complete (D468, refined by D488): 15 searchable choices in New
Deck and Deck/Collection settings, saved as shared `Deck.iconId`, rendered on
Library, Today and Progress. Remaining work: a native renderer and chooser
over the same catalog, and any fuller deck-cover/background system. Native
still uses its existing generated marks. Company-logo choices are excluded
by the owner's decision.

## Roadmaps

## Deck marketplace

## Advanced session controls

## Dark mode

## Onboarding demo in the app

## Icons

D472 implements the reviewed metric, navigation and card-interaction subset with shared artwork. Remaining utility/action icons need their own incremental artwork review. Deck icons are explicitly skipped for now by the owner; do not extend this pass to them. Physical-device review of the native SVG presentation is pending.

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

## Live Supabase project for mobile, and the M1A checkpoint (noted 2026-08-24)

M1A implemented the whole native cloud/auth/data foundation but **stopped before
touching any database**, because this repository has no Supabase project: the
previous one was deleted mid-development (`CURRENT_STATE.md` §15) and there is no
`.env.local` anywhere in the tree. Everything below needs a project to exist.

**Create a fresh, dedicated FlipTap development project** rather than reusing one
with data worth keeping. Two of the migrations are destructive by design.

Bootstrap, in order:

1. In the Supabase SQL editor, run **`supabase/schema.sql` on its own**. It is
   already the post-0004 state - the single `cards` table, the required
   `stateBefore` check inline in `review_logs`, and both `commit_review` /
   `revert_review` functions with their revoke-then-grant - and it is
   re-runnable. Do **not** run `0001`-`0004` on a fresh project: `0001` creates a
   table `0002` drops, and `0002`/`0003` only delete rows that do not exist yet.
   Those files are the upgrade path for a database that already exists (D362).
2. Copy `apps/mobile/.env.local.example` to `apps/mobile/.env.local` and fill in
   the project URL and the **publishable** key (`sb_publishable_…`). Never the
   secret key: it bypasses RLS, and `EXPO_PUBLIC_*` values are inlined into the
   app bundle. Restart Metro with `--clear`; Expo caches inlined env values.
3. For the same account to be visible on both platforms, set the matching
   `VITE_SUPABASE_*` values in the repository-root `.env.local` too. A web
   install left in local Dexie mode shares nothing with the phone (D353).

Then verify, on the project and on a physical device:

- **Schema.** Tables `cards`, `decks`, `drafts`, `review_logs`, `roadmaps` exist;
  RLS is enabled on each; each has an `own rows` policy; `authenticated` has
  select/insert/update/delete on all five and `usage` on `public`; the generated
  `deck_id` / `due` / `suspended` / `card_id` / `reviewed_at` columns and their
  indexes exist. Confirm `commit_review` and `revert_review` exist, that
  `authenticated` has `execute`, and that **`anon` does not**.
- **Auth.** Email OTP is enabled in the project's auth settings and mail is
  actually delivered.
- **Device.** Sign in with a real six-digit code; the protected tabs appear;
  Profile shows the real account email; the `__DEV__` diagnostics probe reads
  decks and creates then deletes a disposable one; the created row carries the
  session's `user_id` in the table editor; force-quit and reopen keeps the
  session; background past a token expiry and resume stays authenticated; sign
  out returns to the auth screen and protected routes are unreachable. Also try
  a wrong code and airplane mode, and confirm the copy is friendly and the
  button never stays spinning.

This does **not** close the three live-verification items below. Those concern
pagination, the review-commit RPC and `0003`'s constraint under real Postgres,
and M1A exercises none of them: mobile does not review, does not persist a grade
and does not page a large table. Close them when the work that uses them lands.

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

## Verify Vercel deployment after workspace migration

Before the next public deployment, confirm the Vercel dashboard still uses repository root as Root Directory and that apps/web/dist is the configured/recognized output. If Root Directory is apps/web, reconcile the repository/dashboard settings and use dist instead. Perform one production deployment and verify SPA routing/PWA assets.

## Gamify

How to improve FlipTap with better UX, using famification? For both web and mobile or just mobile?

**Answered 2026-08-28 (owner).** The distinction that governs this, and the two halves must
not be conflated:

> Don't add a gamification **subsystem**. Make the existing learning loop more **rewarding**.

D473 now ships four evidence-based study achievements within the existing loop. Out of scope before validation: XP, currency, levels, leaderboards, arbitrary achievements
— each invents a second scoring model that competes with FSRS and needs a persisted entity
and a settings surface behind it. A Weekly Goal is in this half too (D209/D210 refused to
fabricate goal and achievement entities, and were right).

**In scope, and treated as real product work:** streak feedback, mastery moments, session
summaries, progress celebration, daily-consistency signals, and a satisfying end to a
review. These are light gamification and FlipTap currently has almost none of them — every
mechanic it already computes is unmarked. The four moments worth designing, in order:
session completion, the streak increment, deck mastery, and returning after a gap. All are
feedback on numbers that are already true, so nothing is fabricated, and the form stays
governed by `design-system.md` §11 (quiet momentum; no confetti, no spectacle).

Specified as P1-10 in [`pre-publish-plan.md`](pre-publish-plan.md).

## LeetCode usage

How to use FlipTap for SRS in regards to LeetCode? How to market it in that regards as well

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

## Progress

Da odabereš i koliko si napredovao u mesecu. Tamo gde mi stoji datum, da mogu da odaberem datum i da mi se za konkretno njega prikaže

## Color

Web complete (2026-10-05, D462-D467): one shared soft orange wave background across
web pages. Translating the treatment to the native mobile app remains deferred
until the owner requests it.

## Scrollbar styling.

## PWA prompts.

## Dark mode.

## Deck identity.

See the scoped remaining work under "Deck identity" above; generic web icons
are implemented by D468.

## Route transitions.

## Custom icon sets.

## Mobile navigation.

## Share cards.

## Onboarding.

## Responsive table redesign.

## Milestones

## Remove the /dev scenario switcher before publishing

A development-only page at `/dev` (`apps/web/src/dev/`, the lazy route in `apps/web/src/app/router.tsx`, and the `apps/web/src/dev/*.test.ts` tests) replaces the local workspace with generated starting points (a brand-new user, a long-time user). It is excluded from production builds, but the code itself is not meant to ship: delete the directory, the route block, and the related test file before the app is published. Recorded in `CLAUDE.md` and `docs/fliptap-decisions.md` (D461).


## Check heat map tooltips in the other ranges and on mobile

The Activity heat map labels (`apps/web/src/features/progress/components/ActivityHeatmap.tsx`) were checked in headless Chromium only in the 30D range at 1440x900: the left, middle and right cells of the top row, and the last cell of the grid. Still unchecked: the 7D, 3M and 1Y ranges (the grid has different column counts, so edge detection and the top-row flip should be re-verified), and the 390x844 layout, where the scroll container is narrower.
