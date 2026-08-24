# Platform parity

Status of every learner-visible capability on each platform.

Status is one of: `implemented` · `web-only (decision)` · `native-only (decision)` · `deferred`.
Every non-`implemented` status carries a reason; every `deferred` names the milestone that owns it.

The shared-logic column names a module in `packages/core` or is empty. A wrong entry is a broken link.

**This file owns the table and nothing else.** Why a decision was made → [`itera-decisions.md`](itera-decisions.md). Web implementation status → [`CURRENT_STATE.md`](CURRENT_STATE.md). What the product does → [`features.md`](features.md). How it is built → [`architecture.md`](architecture.md). Future work → `CURRENT_STATE.md` §17 and [`TODO.md`](TODO.md).

Update it in the same commit as any change to a listed capability.

## Foundation

| Capability | Shared logic (packages/core) | Web | Native | Status / reason |
|---|---|---|---|---|
| Runtime mode (demo / cloud) | — | n/a | demo default, cloud opt-in | native-only (decision) — market validation before live cloud; D364, D366 |
| Repository composition | data/registry | yes | cloud mode only | implemented — demo mode registers no backend on purpose; D366 |
| Cloud backend | data/supabase/SupabaseRepository | yes | yes | implemented |
| Local backend | — | Dexie | no | web-only (decision) — mobile is cloud-only; master plan D11 |
| Auth mode rule | auth/resolveAuthState | yes | yes | implemented |
| Auth engine / provider | auth/authEngine, auth/AuthProvider | yes | yes | implemented |
| Session storage | auth/types (LocalSessionStore) | localStorage/sessionStorage | SecureStore, chunked | implemented |
| Sign-in interaction | — | magic link | six-digit email OTP | implemented — platforms differ by design; D8 §8 |
| Local / demo sign-in | auth/localSession | yes | demo mode only | implemented — demo mode is core's local mode over a pre-seeded record; D367 |
| Route protection | — | RequireAuth layout route | Stack.Protected groups | implemented |
| Sign out | auth/authEngine | yes | cloud mode only | implemented — hidden in demo mode, where there is no account; D364 |
| Shared data hooks | hooks/* | yes | yes | implemented |
| Query keys | hooks/queryKeys | yes | yes | implemented |
| Design tokens | design/tokens | yes | yes | implemented |
| Content parsing | content/parseRichText | yes | no | deferred — M1B native renderer |
| Content rendering | — | RichText.tsx | no | deferred — M1B native renderer |
| Interaction behavior | interactions/* | yes | yes | implemented |

## Today

| Capability | Shared logic (packages/core) | Web | Native | Status / reason |
|---|---|---|---|---|
| Greeting | today/greetings | yes | yes | implemented |
| Due count, streak, retention | domain/stats/* | yes | demo workspace | deferred — master plan Phase 5; due totals are derived from demo cards, streak and retention are authored constants (D368) |
| Continue Learning | domain/stats/deckMetrics | yes | demo workspace | deferred — master plan Phase 5; each row now opens its own deck (D374) |
| Session start | — | yes | navigates to preview | deferred — M1C Review gate |
| Adjust session | — | yes | no | deferred — master plan Phase 5 |
| Pace chart | — | yes | no | web-only (decision) — native hierarchy omits it; not a functionality gap |
| Next milestone row | domain/stats/progressMetrics | yes | no | web-only (decision) — native slot shows estimated session length instead |
| Weekly goal | — | no | no | deferred — no goal concept exists; features.md "Planned" |

## Library

| Capability | Shared logic (packages/core) | Web | Native | Status / reason |
|---|---|---|---|---|
| Collection tree | library/collectionTree | yes | demo workspace | deferred — master plan Phase 6; navigation is functional over the mobile demo workspace (D368) |
| Deck list and metrics | domain/stats/deckMetrics | yes | demo workspace | deferred — master plan Phase 6; navigation is functional over the mobile demo workspace (D368) |
| Open a deck | — | yes | demo workspace | deferred — master plan Phase 6; every deck row, Today row, Progress row and deck notification resolves its own deckId over demo data, and an unknown id gets a not-found state; D370, D374 |
| Card list | hooks/useCards | yes | demo workspace | deferred — master plan Phase 6; navigation is functional over the mobile demo workspace (D368) |
| Open a card | — | study preview | no | deferred — master plan Phase 6 |
| Deck create / rename / delete | hooks/useDecks | yes | no | deferred — master plan Phase 6 |
| Card edit / duplicate / move / suspend / delete | hooks/useCards | yes | no | deferred — master plan Phase 6 |
| Search | domain/search/searchableText | yes | over the demo workspace | deferred — master plan Phase 6; navigation is functional over the mobile demo workspace (D368) |
| Filter and sort | library/sortDecks | yes | over the demo workspace | deferred — master plan Phase 6; the control is functional and calls core's sortDecks verbatim, so the four keys match web, but it orders demo data; D371, D372 |
| List paging | — | pagination | infinite scroll intended | native-only (decision) — pagination is a desktop affordance; master plan Phase 6 |
| Card drag-reorder | hooks/useCards (useReorderCards) | yes | no | web-only (decision) — desktop authoring affordance |

## Review

| Capability | Shared logic (packages/core) | Web | Native | Status / reason |
|---|---|---|---|---|
| Queue snapshot and scoping | — | yes | no | deferred — M1C Review gate |
| Two-phase flow | — | yes | preview only | deferred — M1C Review gate |
| Recall | interactions/recall | yes | preview only | deferred — M1C Review gate |
| Multiple Choice | interactions/multipleChoice, domain/grading/multipleChoice | yes | preview only | deferred — M1C Review gate |
| Write Code | interactions/writeCode, domain/grading/writeCode | yes | preview only | deferred — M1C Review gate |
| Ordering | interactions/ordering, domain/grading/ordering | yes | preview only | deferred — M1C Review gate |
| Matching | interactions/matching, domain/grading/matching | yes | preview only | deferred — M1C Review gate |
| Walkthrough | interactions/walkthrough, domain/grading/walkthrough | yes | preview only | deferred — M1C Review gate |
| FSRS scheduling | domain/scheduling/* | yes | no | deferred — M1C Review gate |
| Transactional review persistence | data/repository (commitReview) | yes | no | deferred — M1C Review gate |
| Persist-failure retry | domain/review/reviewPersistFailure | yes | no | deferred — M1C Review gate |
| Undo on completion | hooks/useReview (useUndoGrade) | yes | no | deferred — M1C Review gate |
| Matching at three columns | interactions/matching (widthFor) | full board | horizontal scroll | native-only (decision) — three columns do not lay out at 390px; master plan D6 |
| Code editing surface | — | CodeMirror 6 | native multiline input | native-only (decision) — master plan D5 |

## Progress

| Capability | Shared logic (packages/core) | Web | Native | Status / reason |
|---|---|---|---|---|
| Five headline KPIs | domain/stats/progressMetrics, learned, streak | yes | demo workspace | deferred — master plan Phase 8 |
| Activity heat map | domain/stats/calendarDay | yes | demo workspace | deferred — master plan Phase 8 |
| Retention chart | charts/retentionChartPath | yes | demo workspace | deferred — master plan Phase 8 |
| Deck performance | domain/stats/deckMetrics | yes | demo workspace | deferred — master plan Phase 8; each row now opens its deck, metrics stay demo values (D368, D374) |
| Recent milestones | domain/stats/progressMetrics | yes | demo workspace | deferred — master plan Phase 8 |
| Date range selection | domain/stats/dateRange | yes | 30D only | deferred — master plan Phase 8 |
| Review history | domain/stats/reviewHistory | yes | no | deferred — master plan Phase 8 |
| Progress sub-pages | — | "Soon" placeholders | no | deferred — unbuilt on both; features.md "Planned" |

## Account and data

| Capability | Shared logic (packages/core) | Web | Native | Status / reason |
|---|---|---|---|---|
| Account identity | auth/resolveAuthState | yes | yes | implemented |
| Import / Export backup | data/backup, hooks/useBackup | yes | no | deferred — master plan Phase 10 |
| Replace-mode import | data/backup (canReplaceImport) | local only | no | web-only (decision) — refused on the cloud backend; no cross-request transaction |
| Settings sections (Profile, Email, Appearance, Notifications, Privacy, Devices) | — | inert placeholders | honest placeholders | deferred — unbuilt on both; features.md "Planned" |
| Card authoring, all six types | domain/cards/save*Card | yes | no | deferred — master plan Phase 9; ship decision D13 not yet taken |

## Platform-specific

| Capability | Shared logic (packages/core) | Web | Native | Status / reason |
|---|---|---|---|---|
| Notifications inbox | — | no | demo workspace | native-only (decision) — read state and deck destinations work over demo data; still no notification entity; TODO.md "Notifications"; D375 |
| Push notifications / reminders | — | no | no | deferred — product decision open; TODO.md "Notifications" |
| Offline review and sync | — | Dexie local mode | no | deferred — master plan Phase 11 |
| Roadmaps | — | yes | no | web-only (decision) — features.md "out of scope"; D17, master plan D15 |
| Installable PWA | — | yes | n/a | web-only (decision) — native ships as an app |
