# Itera Mobile — Comprehensive Read-Only Audit (2026-08-24)

**Scope:** `apps/mobile` @ branch `mvp_demo_cleaning`, HEAD `b8ddc87 feat(mobile): add notifications inbox`.
**Method:** every mobile route file, every screen component, every fixture and every type module read in full; web router, settings sections, composition root and card-row actions read directly; canonical docs read in the prescribed order. **No file was modified.**

---

## Context — why this audit exists

The first native GUI pass is finished: six surfaces exist and look like a product. The question this audit answers is whether they *are* a product. They are not yet. Mobile has no composition root — no `configureRepository`, no `QueryClientProvider`, no auth, no Supabase client — so every screen is driven by a hand-written fixture injected at the route file. The gap between "looks finished" and "is finished" is now the single largest risk in the project, because the screens are convincing enough to be mistaken for working software.

---

## 1. Executive assessment

**Mobile is a high-fidelity GUI prototype with a genuinely shared interaction-behavior layer. It is not a partially-functional app.**

| Question | Answer |
|---|---|
| How complete is it really? | **~18% functionally**, **~70% presentationally** for the six surfaces it covers. |
| GUI prototype, partial app, or near parity? | **GUI prototype**, with one real exception: the six Review interaction Views correctly call shared `InteractionBehavior` / graders from `@itera/core`. |
| Biggest blockers? | No repository, no auth, no query client, no native RichText renderer, no Review session machine. |
| Can it be dogfooded cross-device? | **No.** Not a single byte of user data can be read or written from the phone. |

What the percentage measures: of the capability rows in the parity matrix (§4) marked *parity required*, roughly one in five is functional on mobile — and almost all of those are local-only UI state (search filtering over a fixture array, tab switching, a favorite toggle) rather than product behavior. Of the surfaces that *have been designed*, the visual and structural work is largely done and worth preserving.

**The three facts that define the current state:**

1. `apps/mobile` contains **zero** occurrences of `configureRepository`, `getRepository`, `useAuth`, `AuthProvider`, `QueryClient`, `supabase`, `SecureStore`, `AsyncStorage`. (Verified by grep across `app/` and `src/`.) `@tanstack/react-query` is declared as a dependency and never imported. `@supabase/supabase-js` is not a dependency at all.
2. Every route file is of the form `<Screen viewModel={createXFixture()} />`. All ten fixtures are hand-authored literals.
3. The master plan's **Phase 3 (Expo shell + auth)** and **Phase 4 (cross-device Recall vertical slice — "the architecture gate")** were skipped. Work jumped straight to GUI-only versions of Phases 5–8. The gate that was supposed to prove the seams before any additional native screen was written was never run.

**The single most damaging user-visible defect** is not a missing feature: on the Library All Decks screen the deck rows are rendered as a plain `<View>` with no press handler at all (`LibraryDeckRow.tsx:31`). The primary browse surface of the app looks like a list of tappable rows and is completely inert.

---

## 2. Current mobile route map

Expo Router file tree, with reachability and backing.

| Route | File | Reachable from UI | Backing | Status |
|---|---|---|---|---|
| `/` | `app/index.tsx` | app launch | — | `<Redirect href="/today" />`. Functional. |
| `/today` | `app/(tabs)/today.tsx` | tab (center, initial) | `fixtures/today.ts` | Production-looking, **fixture** |
| `/library` | `app/(tabs)/library/index.tsx` | tab + Today "See all" + Today deck rows | `fixtures/library.ts` | Production-looking, **fixture**; deck rows inert |
| `/library/[collectionId]` | `app/(tabs)/library/[collectionId].tsx` | 2 of 6 collection pills only | `fixtures/library.ts` | **Fixture**; param collapses to a boolean (`=== 'fixture-languages-cpp'`), any other id renders "Interview Core" |
| `/library/deck/[deckId]` | `app/(tabs)/library/deck/[deckId].tsx` | 1 deck row, in 1 collection | `fixtures/library.ts` | **Fixture**; param is echoed as `id` only — every deck id renders "Modern C++ & Memory" |
| `/review` | `app/(tabs)/review/index.tsx` | tab + Today Start CTA | `fixtures/reviewWalkthrough.ts` | Walkthrough **preview**, immersive, tab bar hidden |
| `/review/recall` | `app/(tabs)/review/recall.tsx` | **unreachable** | `fixtures/reviewRecall.ts` | Dead route (deep link only) |
| `/review/ordering` | `app/(tabs)/review/ordering.tsx` | **unreachable** | `fixtures/reviewOrdering.ts` | Dead route |
| `/review/matching` | `app/(tabs)/review/matching.tsx` | **unreachable** | `fixtures/reviewMatching.ts` | Dead route |
| `/review/multiple-choice` | `app/(tabs)/review/multiple-choice.tsx` | **unreachable** | `fixtures/reviewMultipleChoice.ts` | Dead route |
| `/review/write-code` | `app/(tabs)/review/write-code.tsx` | **unreachable** | `fixtures/reviewWriteCode.ts` | Dead route |
| `/progress` | `app/(tabs)/progress.tsx` | tab | `fixtures/progress.ts` | Production-looking, **fixture** |
| `/profile` | `app/(tabs)/profile.tsx` | tab + Notifications "Settings" | none (inline consts) | **Visual placeholder**; accepts `?section=` |
| `/notifications` | `app/notifications.tsx` | header bell (present on Today, Library All Decks, Progress, Profile) | `fixtures/notifications.ts` | **Fixture** + local read state; mobile-only |

**Missing routes** (no file exists): sign-in / OTP, card detail, card create, card edit, card study preview, review history, deck-scoped review, deck settings, any modal.

**Equivalent web surface** per row: `/today`→`/`; `/library`→`/decks`; `/library/[collectionId]`→`/decks?collection=`; `/library/deck/[deckId]`→`/decks/:id`; `/review*`→`/review` and `/design-preview/review/*`; `/progress`→`/progress`; `/profile`→`/settings`; `/notifications`→**none (mobile-only)**.

**Navigator shape:** root `_layout.tsx` renders `<SafeAreaProvider><StatusBar/><Slot/></SafeAreaProvider>`. It is a `Slot`, not a `Stack` — see MOB-P1-09.

---

## 3. Web production capability map

Derived from `apps/web/src/app/router.tsx`, `settingsSections.ts`, `CardTable.tsx`, `main.tsx`, and `docs/features.md` / `CURRENT_STATE.md` §2–§11 (verified 2026-08-24).

### REAL (production, real data)

Today (hero with real due queue + deck names + duration estimate, Momentum ×4, Continue Learning, pace chart, Adjust session dialog, three page states) · Library All Decks (real metrics, search/filter/sort, pagination, create/rename/delete deck, Import shortcut) · Collection identity view · Deck page (Cards/Insights, search/type/status/sort toolbar, 7-row pagination, drag reorder, deck settings) · Card row overflow: **Edit / Duplicate / Move / Suspend / Delete** · Card create `/decks/:deckId/cards/new` (all six types) · Card edit `/cards/:id/edit` (all six) · Card study preview `/cards/:id/study` · Deck flip-through `/preview` · Review `/review` with `?deck=` and `?limit=`, two-phase flow, objective grading, FSRS recommendation, manual override, **transactional `commitReview`**, `persistFailed` state + identical-result retry, completion screen + Undo · Progress Overview (5 KPIs, heat map, retention chart, Deck Performance, milestones, date range) · Review History `/progress/history` (range/deck/rating filters, pagination) · Settings **Import / Export** (JSON backup, Merge always, Replace local-only) · Login `/login` (local session mint, Supabase magic-link OTP) · `RequireAuth` guard + `AuthGate` bootstrap · Sign out.

### PLACEHOLDER / SOON — parity NOT required

Progress sidebar: Decks, Activity, Review lag, Milestones, Achievements, Stats, Reports (7 `aria-disabled` "Soon" rows) · Settings: Profile, Email & password, Appearance, Notifications, Privacy, Connected devices (6 inert placeholders) · Account menu: Preferences, Study settings, Spaced repetition (FSRS), Keyboard shortcuts, Help, What's new, About · Login "Forgot password".

### DEFERRED — parity NOT required

Weekly Goal (deleted, not computed) · richer milestones/achievements entity · advanced session controls (time-boxed, weak-cards, new-vs-review, difficulty/interaction/tag filters, custom FSRS) · Collection as a real entity (Phase G migration, not started) · onboarding · dark mode · media in cards · cross-deck full-text card search · tag filter on cards · mid-session undo · flip-back-to-question · due forecast · Drafts UI.

### INTENTIONALLY OUT OF PRIMARY SCOPE

Roadmaps `/roadmaps*` — working, deliberately out of nav, receives no new development, master-plan D15 says **web-only by decision** · `/design-preview/*` — web design infrastructure · marketplace, payments, deck publishing, collaboration, runtime AI, code execution.

---

## 4. Master parity matrix

Statuses: COMPLETE · PARTIAL · VISUAL ONLY · FIXTURE ONLY · MISSING · INTENTIONALLY DIFFERENT · MOBILE ONLY · WEB PLACEHOLDER—NOT REQUIRED · DEFERRED—NOT REQUIRED.

### Foundations

| Capability | Web | Mobile | Mobile data source | Functional? | Parity req? | Gap | Recommendation |
|---|---|---|---|---|---|---|---|
| Repository composition (`configureRepository`) | COMPLETE (`main.tsx`) | **MISSING** | none | No | **Yes** | Total | Add a mobile composition root; register `SupabaseRepository` with a native client |
| Supabase client | COMPLETE | **MISSING** | none | No | Yes | No dependency declared | Add `@supabase/supabase-js`; native storage adapter, `detectSessionInUrl:false`, `AppState` refresh |
| TanStack QueryClient + Provider | COMPLETE | **MISSING** | dep declared, never imported | No | Yes | Total | Mount in `app/_layout.tsx`; bind `focusManager`/`onlineManager` |
| Shared hooks (`useDecks`/`useSearchCards`/…) | COMPLETE | **MISSING** | none | No | Yes | Zero call sites | Consume core hooks directly; they are React-not-DOM by design |
| Auth policy (`resolveAuthState`) | COMPLETE | **MISSING** | none | No | Yes | Total | Use shared `createAuthEngine`/`AuthProvider`; native `SessionStore` only |
| Sign-in screen | COMPLETE (magic link) | **MISSING** | none | No | Yes — INTENTIONALLY DIFFERENT impl | No route | 6-digit email OTP per master plan §8 |
| Route protection | COMPLETE (`RequireAuth`) | **MISSING** | none | No | Yes | Every route open | Expo Router `(auth)`/`(app)` groups |
| Session persistence | COMPLETE | **MISSING** | none | No | Yes | Total | SecureStore + chunking adapter (D4) |
| Native RichText renderer | COMPLETE (web renderer) | **MISSING** | pre-tokenized `parts[]` arrays in fixtures | No | Yes | Cannot render a real `Card` | Write a native renderer over `parseRichText` nodes |
| Design tokens | COMPLETE | **COMPLETE** | `iteraColors`/`iteraRadii` from core | Yes | Yes | — | Correct as-is |
| Mobile test suite | n/a | **MISSING** | none | — | Yes | No `jest-expo`, zero test files | Stand up per D10 |

### Today

| Capability | Web | Mobile | Source | Functional? | Parity req? | Gap | Recommendation |
|---|---|---|---|---|---|---|---|
| Greeting | COMPLETE | **COMPLETE** | `pickDashboardMessage()` (core) | Yes | Yes | — | Keep |
| Due today count | COMPLETE | FIXTURE ONLY | `23` literal | No | Yes | Fabricated | `useDueCards` + `todayMetrics` |
| Current streak | COMPLETE | FIXTURE ONLY | `12` literal | No | Yes | Fabricated | `computeStreak` |
| Retention | COMPLETE | FIXTURE ONLY | `89` literal | No | Yes | Fabricated; `null` branch exists but unused | `computeRetention`; em dash on null (already coded) |
| Est. session duration | COMPLETE | FIXTURE ONLY | `32` literal | No | Yes | Fabricated | `todayMetrics` duration estimate |
| Start session CTA | COMPLETE | PARTIAL | navigation only | Nav works, target is a preview | Yes | Opens Walkthrough fixture | Point at a real session route |
| Continue Learning rows | COMPLETE | FIXTURE ONLY | 4 literals | No | Yes | Fabricated | `deckMetrics` leaf decks |
| Continue Learning row tap | COMPLETE (`/review?deck=` or `/decks/:id`) | **PARTIAL — wrong target** | `router.push('/library')` | Nav works, target wrong | Yes | Every row goes to the Library root | Route to the deck / deck-scoped review |
| See all | COMPLETE | COMPLETE | `router.push('/library')` | Yes | Yes | — | Keep |
| Adjust session | COMPLETE | MISSING | — | No | Yes | No control | Native bottom sheet |
| Caught-up state | COMPLETE | MISSING | — | No | Yes | Fixture always has due work | Add |
| New-user state | COMPLETE | MISSING | — | No | Yes | — | Add |
| Loading state | COMPLETE | MISSING | — | No | Yes | Synchronous fixture | Add with hooks |
| Error state | COMPLETE | MISSING | — | No | Yes | — | Add |
| Next milestone row | COMPLETE | MISSING | — | No | Yes | Mobile shows Est. session in that slot | INTENTIONALLY DIFFERENT is acceptable; record it |
| Pace chart | COMPLETE | MISSING | — | No | **No** — mobile hierarchy choice | Deliberate omission | Record as INTENTIONALLY DIFFERENT |
| Notification bell | n/a | MOBILE ONLY | static dot | Nav works; dot is decorative | n/a | Dot never reflects unread | Drive from real unread count or drop it |

### Library

| Capability | Web | Mobile | Source | Functional? | Parity req? | Gap | Recommendation |
|---|---|---|---|---|---|---|---|
| Collection tree | COMPLETE (`collectionTree` from core) | FIXTURE ONLY | 6 literals | No | Yes | Fabricated | Consume core `collectionTree` — do **not** re-derive |
| All Decks list | COMPLETE | FIXTURE ONLY | 8 literals | No | Yes | Fabricated | `useDecks` + `deckMetrics` |
| **Open a deck from All Decks** | COMPLETE | **MISSING** | — | **No — row is a plain `View`** | Yes | Primary browse action is inert | **Highest-priority control fix** |
| Open a collection | COMPLETE | PARTIAL | 2 of 6 pills wired | Partly | Yes | Unfiled/Systems/Research dead | Wire all from real tree |
| Unfiled decks | COMPLETE | MISSING | pill present, disabled | No | Yes | — | Derive from core tree |
| Deck search | COMPLETE | PARTIAL | local filter over fixture array | Yes over fixture | Yes | — | Repoint at real data |
| Filter control | COMPLETE | **VISUAL ONLY** | `disabled` | No | Yes | Decorative | Native filter sheet |
| Sort control | COMPLETE | **VISUAL ONLY** | `disabled`, label lies ("Sort: Last studied") | No | Yes | Decorative | Native sort sheet |
| "Due only" toggle | (covered by filter) | COMPLETE (local) | `useState` | Yes | Yes | — | Keep; repoint |
| New Deck | COMPLETE | **VISUAL ONLY** | `disabled` | No | Yes | Decorative | `useCreateDeck` |
| Import Deck | COMPLETE (links to Import/Export) | **VISUAL ONLY** | `disabled` | No | Yes | Decorative | Route to Profile → Import/Export |
| Deck row overflow | COMPLETE (rename/delete) | **VISUAL ONLY** | `disabled` | No | Yes | Decorative | Native action sheet |
| Collection metrics | COMPLETE (`aggregateMetrics`) | FIXTURE ONLY | summed literals | No | Yes | Fabricated | Core aggregation |
| Collection settings | COMPLETE (deck settings) | **VISUAL ONLY** | `disabled` | No | Yes | Decorative | Deck settings sheet |
| Deck identity + metrics | COMPLETE | FIXTURE ONLY | literals; `deckId` ignored | No | Yes | Every deck shows the same content | `useDecks`/`deckMetrics` |
| Deck favorite | **does not exist on web** | MOBILE ONLY (local, unpersisted) | `useState` | Locally | **No** | Invented concept | Remove, or accept as mobile-only and record it |
| Cards / Insights tabs | COMPLETE | PARTIAL | tab switch works | Yes | Yes | Insights is an honest "not connected" card | Wire Insights later |
| Card list | COMPLETE | FIXTURE ONLY | 5 literals | No | Yes | Fabricated | `useSearchCards` |
| **Open a card** | COMPLETE (→ study preview) | **VISUAL ONLY** | `disabled` | No | Yes | Card rows inert | Route to a native study preview |
| Card search | COMPLETE | PARTIAL (local) | fixture filter | Yes over fixture | Yes | — | Repoint |
| Card type / status / sort filters | COMPLETE | **PARTIAL/NO-OP** | filter button only re-sets `newOnly=true` | Effectively no | Yes | Button promises a filter sheet | Native filter sheet |
| Card row actions (Edit/Duplicate/Move/Suspend/Delete) | COMPLETE | **MISSING** | icon is decorative | No | Yes | Total | Action sheet over existing core mutations |
| Add card | COMPLETE | **VISUAL ONLY** | `disabled` | No | Yes | Decorative | Authoring milestone |
| Study Now (deck-scoped review) | COMPLETE (`/review?deck=`) | **VISUAL ONLY** | `disabled` | No | Yes | Decorative | Wire once Review is live |
| Card drag-reorder | COMPLETE | MISSING | — | No | **No** — master plan excludes it from Phase 6 | — | DEFERRED |
| Pagination | COMPLETE | MISSING | — | No | **No** — infinite scroll is a recorded acceptable divergence | — | INTENTIONALLY DIFFERENT |
| Empty states | COMPLETE | PARTIAL | search-empty only | Yes | Yes | No no-decks/no-cards state | Add |
| Destructive confirmation | COMPLETE (`useDialogs`) | MISSING | — | No | Yes | No destructive action exists yet | Native `Alert`/sheet when CRUD lands |

### Card authoring

| Capability | Web | Mobile | Functional? | Parity req? | Gap |
|---|---|---|---|---|---|
| Create card (all six types) | COMPLETE | **MISSING** — no route, no editor, no chooser | No | Yes (Phase 9; D13 permits shipping web-first if recorded) | Total |
| Edit card (all six types) | COMPLETE | **MISSING** | No | Yes | Total |
| Type chooser, Tip, Explanation, Tags, Deck select, code fields, validation, preview, save/cancel, persistence | COMPLETE | **MISSING** | No | Yes | Total |

### Review

| Capability | Web | Mobile | Source | Functional? | Parity req? | Gap |
|---|---|---|---|---|---|---|
| Queue creation / snapshot (`useSessionQueue`) | COMPLETE | **MISSING** | — | No | Yes | One hard-coded card per route |
| Due ordering / `?deck=` / `?limit=` scoping | COMPLETE | **MISSING** | — | No | Yes | Total |
| Entry from Today | COMPLETE | PARTIAL | nav only | Nav works | Yes | Lands on a fixture |
| Entry from Review tab | COMPLETE | PARTIAL | nav only | Nav works | Yes | Always Walkthrough |
| Deck-scoped entry | COMPLETE | MISSING | — | No | Yes | Study Now disabled |
| Question phase | COMPLETE | COMPLETE (per type) | fixture | Yes | Yes | Content is fixture |
| Tip | COMPLETE | COMPLETE (Recall, Walkthrough incl. per-step) | fixture | Yes | Yes | — |
| Explanation | COMPLETE | PARTIAL (Write Code, Walkthrough) | fixture | Yes | Yes | Absent on MC / Ordering / Matching |
| Submit / reveal | COMPLETE | COMPLETE | local | Yes | Yes | — |
| Objective grading | COMPLETE | **COMPLETE — shared** | `gradeMultipleChoice`, `gradeOrdering`, `gradeMatching`, `writeCodeBehavior.autoGrade`, `gradeWalkthroughStep`, `walkthroughBehavior.autoGrade` | Yes | Yes | **Correctly shared. Preserve.** |
| Readiness gating | COMPLETE | **COMPLETE — shared** | `*.isResponseReady` | Yes | Yes | Correctly shared |
| Width intent | COMPLETE | COMPLETE — shared | `matchingBehavior.widthFor` | Yes | Yes | Correctly shared |
| Rating recommendation from result | COMPLETE | **MISSING** | — | No | Yes | Grade computed, never mapped to a suggested rating |
| Manual FSRS override | COMPLETE | VISUAL ONLY | local `useState` | No | Yes | Selection is cosmetic |
| Real next-interval labels | COMPLETE | **FIXTURE ONLY** | hard-coded `'<1m'/'6m'/'10m'/'8d'` | No | Yes | Fabricated scheduling claim |
| Persistence (`commitReview`) | COMPLETE, transactional | **MISSING** | — | No | Yes | Total |
| Persist-pending / failure / retry | COMPLETE (`persistFailed` + identical-result retry) | **MISSING** | — | No | Yes | Total |
| Session progress (`X of Y`) | COMPLETE | VISUAL ONLY | fixture `current`/`total` (e.g. `6 of 10`) | No | Yes | Fabricated |
| Advance to next card | COMPLETE | **MISSING** | — | No | Yes | Session is one card |
| Completion screen | COMPLETE | **MISSING** | — | No | Yes | Total |
| Undo | COMPLETE (completion-screen only) | **MISSING** | — | No | Yes | Total |
| Session exit | COMPLETE | PARTIAL | `router.replace('/today')` | Yes | Yes | Always exits to Today, not to the origin |
| Caught-up / empty state | COMPLETE | MISSING | — | No | Yes | — |
| Tab bar hidden during Review | n/a | COMPLETE | `IteraTabBar` returns `null` for `review` | Yes | Yes (mobile-specific) | Correct |

### Progress

| Capability | Web | Mobile | Source | Functional? | Parity req? | Gap |
|---|---|---|---|---|---|---|
| Learned / Due / Reviews / Retention / Streak | COMPLETE | FIXTURE ONLY | 5 literals | No | Yes | All five fabricated |
| Date range (30D/3M/1Y) | COMPLETE | **VISUAL ONLY** | 30D static, 3M/1Y `disabled` | No | Yes | Range control decorative |
| Date-range label | COMPLETE | FIXTURE ONLY | `'Aug 24 – Sep 23, 2026'` | No | Yes | Not pressable, not computed |
| Activity heat map | COMPLETE (DST-safe) | FIXTURE ONLY | 30 literal levels | No | Yes | Fabricated |
| Retention chart | COMPLETE (gap-aware, points for isolated buckets) | FIXTURE ONLY | 18 literals; hard-coded axis labels; y-scale assumes ≥50% | No | Yes | Fabricated **and** a value <50% renders off-chart |
| Deck Performance | COMPLETE (leaf-only, ordered by due work) | FIXTURE ONLY | 3 literals; row styling keyed on `retentionLabel.startsWith('89')` | No | Yes | Fabricated; **rows not pressable** |
| Navigate from Deck Performance | COMPLETE (`/review?deck=` or deck) | **MISSING** | plain `View` | No | Yes | Dead |
| Recent milestones | COMPLETE (derived) | FIXTURE ONLY | 3 literals | No | Yes | Fabricated |
| Review History | COMPLETE (`/progress/history`, range/deck/rating filters) | **MISSING** | — | No | Yes | No route, no entry point |
| 7 "Soon" sidebar rows | WEB PLACEHOLDER | absent | — | — | **No** | Correctly not copied |
| Empty / long-history states | COMPLETE | MISSING | — | No | Yes | — |

### Profile / Settings

| Capability | Web | Mobile | Functional? | Parity req? | Gap |
|---|---|---|---|---|---|
| Account identity | COMPLETE (real email / "Demo workspace" + storage line) | VISUAL ONLY ("Demo workspace / Mobile presentation preview", honest) | No | Yes | No identity source |
| **Sign out** | COMPLETE | **MISSING — no row at all** | No | Yes | Total |
| Import (JSON) | COMPLETE | VISUAL ONLY (`disabled`, honest notice) | No | Yes | Needs `expo-document-picker` |
| Export (JSON) | COMPLETE | VISUAL ONLY (`disabled`, honest notice) | No | Yes | Needs `expo-file-system` + `expo-sharing` |
| Merge / Replace mode | COMPLETE (Replace disabled in cloud mode) | **live radio, inert target** | Toggles, does nothing | Yes | Live control on a dead action |
| Profile / Email & password / Appearance / Notifications / Privacy / Connected devices | WEB PLACEHOLDER | VISUAL ONLY, honest "Not available yet" + PLANNED list | n/a | **No** | Mobile is more honest than web here; leave |

### Notifications

| Capability | Web | Mobile | Functional? | Parity req? |
|---|---|---|---|---|
| Notifications inbox | **none** | MOBILE ONLY — FIXTURE + local state | Partly | n/a |
| All/Unread filter | none | COMPLETE (local) | Yes | n/a |
| Mark read / Mark all as read | none | COMPLETE (local, resets on remount) | Yes | n/a |
| Row → destination | none | **MISSING** — tapping only marks read | No | n/a |
| Empty state | none | COMPLETE | Yes | n/a |
| Persistence / push / scheduler | none | MISSING | No | n/a (deferred product work per `TODO.md`) |

### Not required on mobile

Roadmaps (D15: web-only by decision) · `/design-preview/*` · `/preview` deck flip-through (web-specific affordance; deck-scoped study covers the need) · all web "Soon" rows · all `features.md` "Planned" and "Out of scope" rows.

---

## 5. Static / fixture inventory

Ten fixture modules plus in-component literals. Every one is currently the sole data source for its screen.

| Source | Feeds | Classification | Replace with |
|---|---|---|---|
| `fixtures/today.ts` | due 23, streak 12, retention 89, est 32 min, 4 decks | **Replace with real shared data** | `useDueCards`, `useDecks`, `useReviewLogs` → `todayMetrics`/`streak`/`progressMetrics`/`deckMetrics` |
| `fixtures/library.ts` — `collections[]` (6) | Collection rail | **Replace** | `collectionTree` (core) over `useDecks` |
| `fixtures/library.ts` — `decks[]` (8) | All Decks + Collection lists | **Replace** | `useDecks` + `deckMetrics` |
| `fixtures/library.ts` — `createMobileCollectionFixture` | Collection screen; **id collapses to one boolean** | **Replace** | real collection resolution |
| `fixtures/library.ts` — `createMobileDeckFixture` | Deck screen; **ignores `deckId`**, 5 literal cards | **Replace** | `useDecks` + `useSearchCards` |
| `fixtures/progress.ts` | all 5 KPIs, 30 heat cells, 18 retention points, 3 decks, 3 milestones, range label | **Replace** | `progressMetrics`, `learned`, `computeStreak`, `computeRetention`, `reviewHistory`, `retentionChartPath`, `dateRange` |
| `fixtures/notifications.ts` (7 items) | Notifications inbox | **Deliberate example content** — no notification entity exists in the product | Decide product intent first (`TODO.md` "Notifications") |
| `fixtures/reviewRecall.ts` | `/review/recall` | Safe temporary presentation fixture (unreachable route) | Real `Card` + native RichText |
| `fixtures/reviewOrdering.ts` | `/review/ordering` | Safe temporary fixture | ditto |
| `fixtures/reviewMatching.ts` | `/review/matching` | Safe temporary fixture | ditto |
| `fixtures/reviewMultipleChoice.ts` | `/review/multiple-choice` | Safe temporary fixture | ditto |
| `fixtures/reviewWriteCode.ts` | `/review/write-code` | Safe temporary fixture | ditto |
| `fixtures/reviewWalkthrough.ts` | `/review` (reachable) | **Replace** — this is the route the Start CTA lands on | Real queue |
| `ratingIntervals` in all six review fixtures | Rating buttons' "next interval" copy | **Replace — actively misleading** | `formatInterval` over a real FSRS preview |
| `current`/`total` in all six review fixtures | `X of 10` position | **Replace — fabricated progress** | Real queue index |
| `ProfileSettingsScreen.tsx` — `sections`, `unavailableSections` | Settings list + detail panels | Safe presentation constants (honest copy) | Keep; add identity + sign out |
| `ProgressScreen.tsx:113` — `retentionLabel.startsWith('89')` | Success-color styling | **Fixture-coupled hack; dead once data is real** | Compare a numeric retention value |
| `ProgressScreen.tsx` — `'Aug 24' / 'Sep 7' / 'Sep 23'` | Retention chart axis | **Replace** | Derive from the selected range |
| `ProgressScreen.tsx` — `(100 - value) / 50` | Retention y-scale | **Latent bug** — clips any retention below 50% | Data-derived axis, as web does |
| `OrderingPreviewScreen.tsx:58` — `const code = 'size() == capacity()'` | Inline-code styling inside an item | **Fixture-coupled hack** | Native RichText over `item.content` |
| `MobileHeader.tsx` — `notificationDot` | Bell badge | **Decorative, always on** | Drive from unread count or remove |
| `IteraTabBar` — no due badge | Today tab | Web has a real `useNavBadges` count | Add once data is real |
| `LibraryDeckScreen` — `interactionVisuals` colors | Card type tiles | Safe presentation constant | Keep (align with web `rowVisuals.ts` if desired) |

---

## 6. Dead / no-op control inventory

Every user-visible action that does nothing or is placeholder-only. **Flagged rows visually promise functionality.**

| # | Screen | Control | Behavior | Classification |
|---|---|---|---|---|
| 1 | Library All Decks | **Deck row** | **No press handler — plain `View`** | **⚠ Silent dead control (worst offender)** |
| 2 | Library All Decks | New Deck | `disabled` | Wired to placeholder (honest) |
| 3 | Library All Decks | Import | `disabled` | Wired to placeholder |
| 4 | Library All Decks | Filter | `disabled` | Wired to placeholder |
| 5 | Library All Decks | "Sort: Last studied" | `disabled`; **label asserts an active sort that is not applied** | ⚠ Misleading |
| 6 | Library All Decks | Collection pills — Unfiled, Systems, Research | No `onPress` → `disabled` | Wired to placeholder |
| 7 | Library All Decks | All-collections grid button | `disabled` | Wired to placeholder |
| 8 | Library All Decks | Deck row kebab | `disabled` | Wired to placeholder |
| 9 | Library Collection | New Deck / Collection settings / overflow | `disabled` | Wired to placeholder |
| 10 | Library Collection | "Sort: Name" | `disabled`, label asserts a sort | ⚠ Misleading |
| 11 | Library Collection | Deck rows other than `fixture-modern-cpp` | `disabled` | ⚠ **Interview Core contains zero openable decks** |
| 12 | Library Collection | Kebab icon inside deck row | Decorative glyph inside the row Pressable — tapping it opens the deck | ⚠ Misleading |
| 13 | Library Deck | **Study Now** (primary orange CTA) | `disabled` | ⚠ Primary action inert |
| 14 | Library Deck | Add card (+) | `disabled` | Wired to placeholder |
| 15 | Library Deck | Deck actions (⋯) | `disabled` | Wired to placeholder |
| 16 | Library Deck | **Card rows** | `disabled` | ⚠ Card list is inert |
| 17 | Library Deck | Card row ⋯ glyph | Decorative | ⚠ Misleading |
| 18 | Library Deck | Filter button (tune icon) | `onPress={() => setNewOnly(true)}` — re-asserts the already-active filter | **⚠ Effective no-op** |
| 19 | Library Deck | Favorite star | Local `useState`, never persisted, no web concept | ⚠ Invented + non-durable |
| 20 | Today | Continue Learning rows | `router.push('/library')` for every row | ⚠ **Wrong destination** |
| 21 | Today | Start session | Opens the Walkthrough fixture | Navigation-only |
| 22 | Progress | Date-range label chip | Not pressable at all | ⚠ Looks like a control |
| 23 | Progress | 3M / 1Y | `disabled` | Wired to placeholder |
| 24 | Progress | Deck Performance rows | Plain `View` | ⚠ Web equivalents navigate |
| 25 | Progress | "Overview" label in Deck Performance header | Static text styled as a control | ⚠ Misleading |
| 26 | Profile | Export JSON / Import JSON | `disabled` | Wired to placeholder (honest) |
| 27 | Profile | Merge / Replace radio | Live toggle on a dead action | **⚠ Live control, no effect** |
| 28 | Profile | Workspace card | Selects the Profile section (which is a placeholder) | Navigation to placeholder |
| 29 | Profile | — | **No Sign out control exists** | Missing target |
| 30 | Notifications | Notification rows | Marks read only; never navigates to the deck/session named | ⚠ Partial |
| 31 | Notifications | "Mark all as read" | Only rendered under the *Today* heading, gated on the **global** unread count | Edge-case bug |
| 32 | Header (all screens) | Bell unread dot | Always rendered | ⚠ Decorative, reads as state |
| 33 | Review ×6 | Rating buttons | Local `useState` only; intervals are fixture strings | ⚠ **Promises scheduling, records nothing** |
| 34 | Review ×6 | Exit | `router.replace('/today')` regardless of origin | Partial |

---

## 7. Today audit

**Real:** the greeting only. `pickDashboardMessage()` is core's shared time-bucketed pool, snapshotted per mount via `useState(createMobileTodayFixture)`.

**Visual/fixture:** Due today, Current streak, Retention, Est. session, all four Continue Learning rows and their progress bars.

**Working navigation:** header bell → `/notifications`; See all → `/library`; Start session → `/review`.

**Broken navigation:** every Continue Learning row pushes `/library` (accessibility hint literally says "Opens the temporary Library destination" — honest in the a11y layer, invisible to a sighted user).

**States:** no loading, no error, no caught-up, no new-user, no zero-value path. The `retention: number | null` type and `TodayHero`'s `retention === null ? '—'` branch are already correct for the em-dash rule but unreachable with the current fixture. Long deck names are handled (`numberOfLines={1}` + `adjustsFontSizeToFit` on metrics). No session scoping exists.

**Omitted desktop elements, classified:**
- **Pace chart** — genuinely unnecessary on a phone at this hierarchy. INTENTIONALLY DIFFERENT; record it.
- **Next milestone row** — replaced by "Est. session". Acceptable INTENTIONALLY DIFFERENT; record it.
- **Adjust session** — **functionality gap.** Web treats it as part of Today's session-start semantics.
- **Weekly Goal** — correctly absent (deleted from the product).

---

## 8. Library audit

The largest remaining area, and structurally the most misleading.

**Hierarchy.** Three depths exist as separate routes and read correctly as a stack. The collection set is a 6-item literal; the real derivation (`collectionTree` in core, over `Deck.parentId`) is not consumed. This is the exact divergence risk the master plan flags for Phase 6 — it has not happened yet, but the fixture shape (`kind: 'all' | 'collection' | 'unfiled'`) is a parallel model and must not harden.

**Navigation reachability is the core problem.** From All Decks: 2 of 6 collection pills navigate, 0 of 8 deck rows navigate. From a collection: 1 deck row navigates, and only in "Languages & C++" — **"Interview Core" is a fully reachable screen with zero openable decks.** The deck route ignores `deckId` entirely: `createMobileDeckFixture(deckId)` returns "Modern C++ & Memory" for every value, so a deep link to any deck shows the same content under a different id.

**Working:** deck search (All Decks + Collection), card search (Deck), "Due only" checkbox ×2, Cards/Insights tabs, favorite star (local), New-status filter chip and its dismiss, back buttons on both nested depths, search-empty states ×3, Insights honest-unavailable card.

**Not working:** everything in §6 rows 1–19.

**Missing entirely:** create/edit/delete deck, create/open/edit/delete card, move card, move deck, deck-scoped review, card study preview, deck settings, Unfiled scope, destructive confirmation UX, no-decks and no-cards empty states, loading, error.

**Long content:** consistently guarded with `numberOfLines` + `adjustsFontSizeToFit`. No overflow risk found by inspection; device confirmation still warranted.

---

## 9. Card authoring / editing audit

| Type | Create | Edit | Validation | Tip | Explanation | Tags | Deck select | Code fields | Type-specific fields | Save | Cancel | Preview | Persistence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Recall | MISSING | MISSING | — | — | — | — | — | — | — | — | — | — | — |
| Multiple Choice | MISSING | MISSING | — | — | — | — | — | — | — | — | — | — | — |
| Write Code | MISSING | MISSING | — | — | — | — | — | — | — | — | — | — | — |
| Ordering | MISSING | MISSING | — | — | — | — | — | — | — | — | — | — | — |
| Matching | MISSING | MISSING | — | — | — | — | — | — | — | — | — | — | — |
| Walkthrough | MISSING | MISSING | — | — | — | — | — | — | — | — | — | — | — |

**Classification: MISSING and NOT REACHABLE for all six.** No route, no editor shell, no type chooser, no form module consumption. Web has all six on both axes with per-type pure form/save modules already in `packages/core/src/domain/cards/` (`saveRecallCard`, `saveMultipleChoiceCard`, `saveWriteCodeCard`, `saveOrderingCard`, `saveMatchingCard`, `saveWalkthroughCard`) and matching `useSaveXCard` hooks in core — so when this is built, **no native save path may be written**.

Per master plan D13, shipping mobile before authoring parity is a legitimate recorded decision. It should be made explicitly, not by drift.

---

## 10. Review audit

**Session machinery: entirely absent.** No queue, no snapshot, no phase machine, no advance, no completion, no Undo, no persistence, no failure path, no retry, no scoping. Each of the six routes is a single hard-coded card with a fabricated `X of 10` position and fabricated interval labels.

**Per-interaction status:**

| Type | Route | Reachable | Shared behavior used | Local reimplementation? | Verdict |
|---|---|---|---|---|---|
| Recall | `/review/recall` | **No** | `recallBehavior.type` (identity only — correct: Recall is self-graded and carries no grader) | None | Visual preview, semantics correct |
| Multiple Choice | `/review/multiple-choice` | **No** | `multipleChoiceBehavior.isResponseReady`, `gradeMultipleChoice` | None | **Correct** |
| Write Code | `/review/write-code` | **No** | `writeCodeBehavior.isResponseReady`, `writeCodeBehavior.autoGrade` | None | **Correct** |
| Ordering | `/review/ordering` | **No** | `orderingBehavior.isResponseReady`, `gradeOrdering` | None | **Correct** |
| Matching | `/review/matching` | **No** | `matchingBehavior.isResponseReady`, `matchingBehavior.widthFor`, `gradeMatching` | None | **Correct** |
| Walkthrough | `/review` | **Yes** | `initialWalkthroughState`, `gradeWalkthroughStep`, `walkthroughBehavior.isResponseReady`, `walkthroughBehavior.autoGrade` | None | **Correct** |

**This is the one genuinely good result in the audit.** No grading, readiness, width or FSRS logic is duplicated in `apps/mobile`. The behavior/View split from Step 1.7 is being honored.

**But the Views cannot render a real card.** Every screen renders from pre-tokenized `parts[]` / `codeLines[]` arrays hand-authored in the fixture (`MobileMultipleChoiceTextPart`, `MobileWriteCodeCodeLine`, `MobileWalkthroughStepPresentation`, …). The `RichContent` on the interaction objects is used for grading identity and as a raw `.value` accessibility label, never as the render source. **There is no native RichText renderer**, and the `parts[]` view-model shape is a parallel content model that will not survive contact with real data. Replacing it is a prerequisite for live Review, not a follow-up.

**Also missing vs web:** grade → suggested-rating mapping (grades are computed and discarded), real next-interval labels, Explanation panels on MC / Ordering / Matching, exit-to-origin.

---

## 11. Progress audit

Every concept is present visually; none is computed.

| Concept | Present | Real | Interactive | Notes |
|---|---|---|---|---|
| Learned | Yes | No | — | `'19'` / `'19 of 39 active'` |
| Due | Yes | No | — | `'20'` |
| Reviews | Yes | No | — | `'81'` |
| Retention | Yes | No | — | `'85%'` |
| Current streak | Yes | No | — | `'6 days'` / `'Best: 7 days'`; duplicates core's `formatDayCount` semantics by literal |
| Activity heat map | Yes | No | No | 30 literal levels; correct 5-step legend |
| Retention over time | Yes | No | No | 18 literals; **axis labels hard-coded**; **y-scale clips below 50%**; no gap handling (web draws gaps and isolated points) |
| Deck Performance | Yes | No | **No** | 3 literals; **rows not pressable**; styling keyed on `startsWith('89')` |
| Recent milestones | Yes | No | No | 3 literals |
| Range selection | Yes | No | **Partly** | 30D static; 3M/1Y `disabled`; label chip inert |
| Deck scope | **No** | — | — | Web's retention chart is deck-scopable |
| Review History | **No** | — | — | No route, no entry point, no filters |
| Empty / long-history states | **No** | — | — | — |

Correctly **not** copied: the seven "Soon" web sidebar rows.

---

## 12. Profile / Settings audit

The most honest screen in the app — and the one with the most consequential omission.

**Honest and correct:** the workspace card says "Demo workspace / Mobile presentation preview / Profile and sync are not connected". All six unavailable sections carry an explicit warning notice plus a PLANNED list. Import/Export buttons are visibly `disabled` with a stated reason. Mobile is *more* candid here than web, which renders the same six sections as inert grey blocks.

**Parity assessment:** Profile, Email & password, Appearance, Notifications, Privacy, Connected devices are all **WEB PLACEHOLDER — NOT REQUIRED**. Mobile need not implement them.

**Required and missing:**
- **Sign out.** Web has it in the account menu and enables it whenever the active mode has a session. Mobile has no such control anywhere. Once auth lands this is mandatory.
- **Account identity.** No source; the "Demo workspace" string is a literal.
- **Import / Export.** Web's only real settings section. Mobile needs `expo-document-picker` (import) and `expo-file-system` + `expo-sharing` (export), plus Replace hidden in cloud mode exactly as web does.

**Flagged:** the Merge/Replace radio group is fully interactive and attached to nothing (§6 row 27).

---

## 13. Notifications audit

**Classification: DESIGN-ONLY CURRENTLY.**

Exists: the `/notifications` route (outside `(tabs)`), bell navigation from the shared header, a grouped Today/Earlier list of 7 fixture items across 7 `kind`s, All/Unread segmented filter, per-row mark-as-read, Mark all as read, an honest "You're all caught up" empty state, a back affordance with a `canGoBack()` fallback to `/today`, and a link to the Notifications settings placeholder.

Not real: read state is component-local `useState` seeded from the fixture and resets on every remount; there is no notification entity, repository, scheduler, push registration or event source anywhere in the product; notification rows do not navigate to what they name; the bell's unread dot is a static decoration.

**`docs/TODO.md` lists notifications as deferred product work** ("Notifications that some cards are pending to be done etc."). The mobile inbox is therefore *ahead of* product scope. Per the audit brief, do not propose push, APNs or backend jobs. The open question is a product one — decide whether a notification concept exists at all — and it should be answered before the inbox is wired to anything.

---

## 14. Authentication audit

**Mobile authentication does not exist in any form.** It is not real, not mocked, not bypassed, and not fixture-authenticated — there is simply no auth layer and no gate, so every route is public.

| Item | Status |
|---|---|
| Expo auth configuration | **MISSING.** `app.json` has no `scheme`, no `bundleIdentifier`, no `package`. |
| Supabase client | **MISSING.** `@supabase/supabase-js` is not a mobile dependency. |
| Session persistence | **MISSING.** No SecureStore/AsyncStorage dependency; no `SessionStore` adapter. |
| Six-digit email OTP | **MISSING.** No sign-in route or screen. |
| Verify OTP | **MISSING.** |
| Bootstrap loading / error | **MISSING.** No `AuthGate` equivalent. |
| Sign out | **MISSING.** |
| Authenticated route protection | **MISSING.** No `(auth)`/`(app)` groups. |
| Stale-session behavior | **N/A** — nothing is stored. |
| Local/demo mode | **MISSING.** Also a product question: master plan D11 states plainly that a learner using web in local mode will see nothing on mobile, and that this must eventually be surfaced in the UI. |

**Compliance with `@itera/core` auth policy:** vacuously clean — nothing is duplicated because nothing exists. When built it must use shared `resolveAuthState` / `createAuthEngine` / `AuthProvider` and supply only a native `LocalSessionStore` + `AuthConfig`. The master plan's "may NOT be stubbed" list names `resolveAuthState` explicitly.

This is the top P0. Without it cross-device use is impossible by construction.

---

## 15. Repository / Supabase / cross-device audit

**There is no repository composition root in `apps/mobile`.** `app/_layout.tsx` renders `SafeAreaProvider → StatusBar → Slot` and nothing else.

| Item | Status |
|---|---|
| `configureRepository` call | **Unimplemented** |
| `SupabaseRepository` usage | **Unimplemented** (available in core, unused) |
| Mobile Supabase client | **Unimplemented**; dependency absent |
| Authenticated client | **Blocked** on auth |
| Real hooks | **Unimplemented**; core hooks have zero mobile call sites |
| Cloud reads | **Unimplemented** |
| Cloud writes | **Unimplemented** |
| `QueryClientProvider` | **Unimplemented** |

**The cross-device chain, link by link:**

| Link | Status |
|---|---|
| Desktop creates/edits a card | **Working** (web, cloud mode, when `VITE_SUPABASE_*` is set) |
| → cloud | **Unverified.** `supabase/schema.sql` + migrations `0002`, `0003`, `0004` have never been applied to a live project (the owner's project was deleted mid-development). |
| Mobile sees the same card | **Blocked** — no client, no repository, no auth |
| Mobile reviews the card | **Blocked** — no session, no `commitReview` |
| → cloud | **Blocked** |
| Desktop Review History / Today / Progress reflect it | **Working on the web side**, but unreachable because the preceding links are blocked |

**Hard prerequisite:** `0004_review_commit_rpc.sql` must be applied before any cloud grading works at all — `SupabaseRepository` has no fallback to a card-then-log sequence and fails loudly by design.

---

## 16. Local / offline behavior audit

Honest classification of what happens today:

| Scenario | Current behavior |
|---|---|
| Phone loses network | **Nothing changes.** No network request is ever made. Every screen renders identically. |
| User opens previously loaded data | **N/A.** Nothing is loaded or cached; fixtures are compiled into the bundle. |
| Review persistence fails | **Cannot occur.** Nothing is persisted. Rating selection is local state. |
| App killed and reopened | All local state resets: notification read state, deck favorite, review selections, search queries, filters. Nothing was ever durable. |

**No user-facing breakage today** — the app does not currently pretend offline support exists. But it does not pretend online support exists either; it simply shows fabricated data unconditionally, which is a different and larger honesty problem.

**Deferred sync architecture is not a bug.** Master plan Phase 11 (`ExpoSqliteRepository` + `SyncingRepository` decorator + outbound queue) is an explicit later milestone and must not be treated as a gap now. The first mobile client is intended to be **cloud-only** (D11), and that is a mobile decision, not a product-wide one.

**One thing to watch:** once real data lands, a cloud-only mobile client with no offline layer will show empty/failing screens on a subway. The UI must say so honestly rather than showing a caught-up state.

---

## 17. Navigation audit

**Working:** the five-item tab bar with a raised center Today control; `initialRouteName="today"`; nested Library stack with back affordances at both depths; nested Review stack; `IteraTabBar` returning `null` on the `review` route (correct immersive-mode hiding); bell → `/notifications` with a `canGoBack()` → `/today` fallback; `/` → `/today` redirect; `?section=` deep-link handling into Profile.

**Problems:**

| Issue | Detail |
|---|---|
| **Five dead routes** | `/review/{recall,ordering,matching,multiple-choice,write-code}` are reachable only by deep link. The Review tab always opens Walkthrough. |
| **Root uses `Slot`, not `Stack`** | `app/_layout.tsx` renders `<Slot/>`. `/notifications` therefore gets no native stack presentation — no iOS swipe-back gesture, no transition. The screen compensates with an in-content back button, which is why this is easy to miss. |
| **Deck route param is ignored** | Any `deckId` renders the same deck. |
| **Collection route param collapses to a boolean** | Any id other than `fixture-languages-cpp` renders "Interview Core", including `unfiled` and `all`. |
| **Buttons pointing at nothing** | 19 disabled/decorative controls (§6). |
| **Wrong-target navigation** | Today's Continue Learning rows → `/library`. |
| **Exit always goes to Today** | `router.replace('/today')` from all six review screens, regardless of where the session was entered. |
| **Missing routes** | sign-in, card detail/create/edit/study, review history, deck-scoped review, deck settings. |
| No circular or genuinely broken routes were found. |

---

## 18. State / error / empty-state audit

| Screen | Loading | Populated | Empty | Error | Zero values | Long content | Offline |
|---|---|---|---|---|---|---|---|
| Today | ✗ | ✓ | ✗ | ✗ | ✗ (`retention: null` branch coded but unreachable) | ✓ | ✗ |
| Library All Decks | ✗ | ✓ | ✓ (search-empty only) | ✗ | ✓ (fixture has 0-card decks) | ✓ | ✗ |
| Library Collection | ✗ | ✓ | ✓ (search-empty only) | ✗ | ✗ | ✓ | ✗ |
| Library Deck | ✗ | ✓ | ✓ (search-empty only) + honest Insights-unavailable | ✗ | ✓ (0% mastery) | ✓ | ✗ |
| Review ×6 | ✗ | ✓ | ✗ | ✗ | n/a | partial — device check needed | ✗ |
| Progress | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Profile | n/a | ✓ | n/a | ✗ | n/a | ✓ | n/a |
| Notifications | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |

No screen has a loading state, an error state, or a network-failure state — a direct consequence of synchronous fixtures. Every one becomes necessary the moment hooks are introduced.

---

## 19. Shared-core compliance

**Overall: strong.** The high-risk duplications the architecture exists to prevent have not occurred.

| Concern | Duplicated in mobile? |
|---|---|
| FSRS / scheduler | **No** — and not referenced at all |
| `ReviewLog` construction | **No** |
| Grading | **No** — all five graders imported from core |
| Readiness (`isResponseReady`) | **No** |
| Semantic width (`widthFor`) | **No** |
| Retention | **No** — fixture literal, not a second calculation |
| Streak | **No** — fixture literal |
| Calendar-day logic | **No** — no date arithmetic anywhere in mobile |
| Due filtering | **No** |
| Query keys | **No** |
| Auth policy | **No** |
| RichText parsing | **No** — but see below |
| Safe image policy | **No** — no image sink exists |
| Interaction auto-grade | **No** |
| Collection tree | **No re-derivation** — but a parallel *shape* exists (`MobileLibraryCollectionViewModel.kind`) that must not harden into one |

**The three real findings:**

1. **A parallel content model.** `src/types/review.ts` defines `MobileWalkthroughTextPart`, `MobileWriteCodeCodeLine`, `MobileMultipleChoiceTextPart`, `MobileWalkthroughStepPresentation` and friends — a hand-tokenized presentation format that stands in for `parseRichText`'s node tree. It is not a duplicated *parser* (nothing re-tokenizes the syntax), so it is not yet an architecture defect, but it is a second content representation that real data cannot produce. **Priority: high**, because every review screen is built on it.
2. **Duplicated day pluralization.** `TodayHero.tsx:207` — `suffix={streak === 1 ? 'day' : 'days'}` re-implements core's `formatDayCount` (`packages/core/src/domain/stats/streak.ts:56`), which `CURRENT_STATE.md` §9 names as the one shared implementation. Small, but exactly the class of drift the rule exists to stop.
3. **Fixture-coupled presentation logic.** `OrderingPreviewScreen.tsx:58` hard-codes `'size() == capacity()'` to decide what renders as inline code, and `ProgressScreen.tsx:113` branches on `retentionLabel.startsWith('89')`. Both are stand-ins for shared behavior (RichText parsing; a numeric retention comparison).

---

## 20. Content-security audit (native)

**There is no real native RichText/content renderer.** Every review screen renders hand-authored `parts[]` arrays with per-token `tone` values; `RichContent` reaches the Views only as grading input and as a raw `.value` accessibility string.

**Therefore the existing TODO — "Content security for a future native renderer" (`docs/TODO.md`) — is NOT yet actionable and must be preserved verbatim.** It becomes actionable the moment a renderer over `parseRichText` nodes is written, at which point it needs its own regression pass: no raw-markup API on the platform, code blocks literal, and `packages/core/src/test/attackPayloads.ts` driven through it. The `isSafeImageSource` rule travels with the shared parser and needs no native re-implementation.

No security remediation was performed or is recommended in this pass.

---

## 21. End-to-end journeys

| # | Journey | Score | Broken / incomplete steps |
|---|---|---|---|
| 1 | Learn from Today | **BROKEN** | Today shows fabricated due count → Start opens a single fixture Walkthrough → grading computes a shared result but discards it → rating is cosmetic → no next card, no completion, no Undo → exit replaces to Today → nothing updates anywhere. |
| 2 | Browse a deck | **BROKEN** | All Decks rows are inert (cannot start the journey at all). Via a collection: 2 of 6 pills work → 1 deck row works in 1 collection ("Interview Core" has none) → deck screen ignores `deckId` → card rows are disabled → no card detail, no study, no edit. |
| 3 | Create a card | **NOT IMPLEMENTED** | No New Card control (disabled), no route, no chooser, no editors, no save. Zero of eight steps exist. |
| 4 | Edit an existing card | **NOT IMPLEMENTED** | No way to open a card; no edit route. |
| 5 | Deck-scoped study | **NOT IMPLEMENTED** | Study Now is `disabled`; no `?deck=` scoping; no deck metrics to update. |
| 6 | Progress inspection | **BROKEN** | All values fixture → 3M/1Y disabled, range label inert → charts static, retention axis hard-coded → Deck Performance rows not pressable → **no Review History route at all** → no filters. |
| 7 | Account / data | **BROKEN** | Identity is a literal → Export disabled → Import disabled (Merge/Replace radio live but inert) → **no Sign out control exists**. |
| 8 | Cross-device | **NOT IMPLEMENTED** | No auth, no Supabase client, no repository, no hooks. Additionally the cloud schema and migrations `0002`–`0004` are unverified against any live database. |

**Zero journeys are WORKING or PARTIAL.**

---

## 22. Findings — P0 / P1 / P2 / P3

### P0 — blocks real mobile use

**MOB-P0-01 — No repository composition root**
*Location:* `apps/mobile/app/_layout.tsx`. *Current:* renders `SafeAreaProvider → StatusBar → Slot`; `configureRepository` is never called anywhere in the workspace. *Expected:* one composition point, mirroring `apps/web/src/main.tsx`, registering `SupabaseRepository` with a native client before render. *Web:* `main.tsx` reads `isSupabaseConfigured` once into `cloudEnabled` and configures repository **and** auth from that one value. *Fix:* add a mobile composition root reading `EXPO_PUBLIC_SUPABASE_*` via `expo-constants`; never import a backend from a screen.

**MOB-P0-02 — No `QueryClientProvider`**
*Location:* `apps/mobile/app/_layout.tsx`; `@tanstack/react-query` declared in `package.json` and never imported. *Current:* no shared hook can run. *Expected:* provider mounted at the root, with `focusManager`/`onlineManager` bound to `AppState`/NetInfo. *Web:* `apps/web/src/app/providers.tsx` + `queryClient.ts`. *Fix:* mount in the root layout alongside the repository registration.

**MOB-P0-03 — No authentication**
*Location:* whole workspace — zero hits for `useAuth`/`AuthProvider`/`resolveAuthState`/`supabase`. *Current:* every route is public; no identity; no session. *Expected:* shared `createAuthEngine`/`AuthProvider` over a native `AuthConfig`, six-digit email OTP sign-in, session in SecureStore, `AppState` token refresh. *Web:* `webAuthConfig.ts` + `AuthGate` + `RequireAuth`; policy lives in `packages/core/src/auth/`. *Fix:* build the native adapter only. Do **not** add a second mode decision — that was audit P1-3.

**MOB-P0-04 — No authenticated route protection**
*Location:* `app/_layout.tsx`, `app/(tabs)/_layout.tsx`. *Current:* no guard. *Expected:* Expo Router `(auth)` / `(app)` groups with a redirect carrying the requested route. *Web:* `RequireAuth` as one pathless layout route. *Fix:* group split at the root layout.

**MOB-P0-05 — Every screen is fixture-backed; no real data path exists**
*Location:* all ten `src/fixtures/*.ts`, injected at every route file. *Current:* fabricated counts, streaks, retention, decks, cards, milestones, history. *Expected:* core hooks + core stats functions. *Web:* `TodayPage` is its route's only fetcher; panels are presentational — the same shape mobile already has. *Fix:* replace each `createXFixture()` call with a hook-backed view-model builder; the screen components need no change.

**MOB-P0-06 — Review cannot persist**
*Location:* all six `src/components/review/*PreviewScreen.tsx`. *Current:* grade computed via shared graders, then discarded; rating is local `useState`; no `reviewService.submit`, no `commitReview`, no `buildReviewLog`. *Expected:* the shared review pipeline end to end, with `stateBefore` recorded and the write transactional. *Web:* `reviewService.submit` returns `{after, log}` and writes nothing; `usePersistReviewResult` hands that exact pair to `repo.commitReview`. *Fix:* per master plan §18, none of `reviewService.submit`, `repo.commitReview`, `buildReviewLog` or `useSessionQueue` may be stubbed.

**MOB-P0-07 — No native RichText renderer; a parallel content model is in its place**
*Location:* `src/types/review.ts` (`*TextPart`, `*CodeLine`, `MobileWalkthroughStepPresentation`) consumed by all six review screens. *Current:* screens render hand-tokenized `parts[]`; `RichContent` is used only for grading and raw a11y labels. *Expected:* a native renderer over `parseRichText`'s node tree, exactly as `RichText.tsx` is on web. *Web:* `apps/web/src/components/text/RichText.tsx` parses nothing and maps shared nodes. *Fix:* write the renderer **before** wiring live Review — the current view-models cannot be produced from a real `Card`. Then re-open the native content-security TODO.

**MOB-P0-08 — Library All Decks deck rows are completely inert**
*Location:* `src/components/library/LibraryDeckRow.tsx:31`. *Current:* the row is a plain `<View>` with an `accessibilityLabel` and no `Pressable`, no `onPress`. *Expected:* opens the deck. *Web:* `/decks` rows navigate to `/decks/:id`. *Fix:* make the row a `Pressable` routing to `/library/deck/[deckId]`. **This is the single highest-value control fix in the report.**

**MOB-P0-09 — Deck and Collection routes ignore their params**
*Location:* `src/fixtures/library.ts:102` and `:126`. *Current:* `createMobileDeckFixture(deckId)` echoes the id and returns "Modern C++ & Memory" for every value; `createMobileCollectionFixture` collapses the id to `=== 'fixture-languages-cpp'`. *Expected:* resolve the real entity; show a not-found state otherwise. *Web:* `/decks/:id` resolves the real deck and redirects a deck-with-children to the Collection view. *Fix:* falls out of MOB-P0-05.

**MOB-P0-10 — Supabase schema and migrations unverified against a live database**
*Location:* `supabase/schema.sql`, `migrations/0002`–`0004`. *Current:* never applied; `0004_review_commit_rpc.sql` is a hard prerequisite for cloud grading and `SupabaseRepository` has no fallback. *Expected:* applied and verified. *Fix:* apply during the auth/repository milestone, which is the first point at which a live project exists (master plan D12). Closes three `TODO.md` items and two `CURRENT_STATE.md` §15 caveats.

### P1 — major functional parity gaps

**MOB-P1-01 — Rating controls promise scheduling and record nothing.** All six review screens + `PreviewRatingControls.tsx`. Intervals are fixture strings (`'<1m'`, `'6m'`, `'10m'`, `'8d'`); selection is `useState`. Web shows the real FSRS next interval per rating and persists the grade. Fix: derive intervals from the scheduler; persist through the shared pipeline.

**MOB-P1-02 — Five review routes are unreachable.** `/review/{recall,ordering,matching,multiple-choice,write-code}` have no inbound navigation; the Review tab always opens Walkthrough. Web reaches every type through one queue. Fix: subsume all six into one session that dispatches on `interaction.type`; delete the per-type routes once live.

**MOB-P1-03 — Filter and sort controls are decorative, and their labels assert state.** `LibraryAllDecksScreen` ("Filter", "Sort: Last studied"), `LibraryCollectionScreen` ("Sort: Name"), `LibraryDeckScreen` filter button (`setNewOnly(true)` — a no-op when already true), `ProgressScreen` (3M/1Y disabled, range chip not pressable). Web has working search/type/status/sort toolbars and a real date range. Fix: native filter/sort sheets over real data.

**MOB-P1-04 — All deck and card CRUD is missing.** New Deck ×2, Collection settings, deck overflow, card row overflow, Add card, Study Now — all `disabled`. Web has create/rename/delete deck and Edit/Duplicate/Move/Suspend/Delete per card. Fix: native action sheets over the existing core mutations (`useCreateDeck`, `useSaveDeck`, `useDeleteDeck`, `useSaveCard`, `useDeleteCard`, `useMoveCard`); add destructive confirmation.

**MOB-P1-05 — Card rows cannot be opened.** `LibraryDeckScreen.CardRow` is `disabled`. Web opens `/cards/:id/study`. Fix: add a native study-preview route; per web decision D69 that surface *is* the card detail.

**MOB-P1-06 — Progress is entirely fixture-backed and non-interactive.** All five KPIs, heat map, retention chart, Deck Performance and milestones are literals; Deck Performance rows are plain `View`s where web rows navigate. Fix: consume `progressMetrics` / `learned` / `computeStreak` / `computeRetention` / `retentionChartPath` / `dateRange`.

**MOB-P1-07 — No Review History on mobile.** No route, no entry point, no range/deck/rating filters. Web `/progress/history` is a live production destination. Fix: add the route with the same three filters.

**MOB-P1-08 — No Sign out anywhere.** `ProfileSettingsScreen.tsx` `sections[]` has no such row. Web enables sign out whenever the active mode has a session. Fix: add once auth exists.

**MOB-P1-09 — Root layout is a `Slot`, not a `Stack`.** `app/_layout.tsx`. `/notifications` gets no native stack presentation — no iOS swipe-back, no transition. Fix: use `Stack` at the root and give `/notifications` an explicit presentation.

**MOB-P1-10 — Today's Continue Learning rows navigate to the wrong place.** `TodayScreen.tsx:62` pushes `/library` for every row. Web links `/review?deck=<id>` when due work exists and `/decks/<id>` otherwise. Fix: route per row.

**MOB-P1-11 — Import / Export are unavailable and the mode radio is live but inert.** `ProfileSettingsScreen.ImportExportDetail`. Web's Import/Export is the only real settings section. Fix: `expo-document-picker` + `expo-file-system` + `expo-sharing`; reuse the shared validator; hide Replace in cloud mode as web does.

**MOB-P1-12 — No native test suite.** Zero test files; no `jest-expo`. `vitest.config.ts` covers only `apps/web` and `packages/core`. Master plan D10 specifies `jest-expo` + RNTL with zero overlapping assertions. Fix: stand it up with the auth/repository milestone.

**MOB-P1-13 — Ordering has no visible reorder controls.** `OrderingPreviewScreen.tsx` exposes move-up/down only as `accessibilityActions` on an `adjustable` role. Master plan D7 specifies drag **plus always-visible up/down controls**, because native has no keyboard-drag equivalent to web's Space→arrows→Space. Fix: render the controls.

**MOB-P1-14 — Ordering drag assumes a fixed row height.** `OrderingPreviewScreen.tsx:28` — `DRAG_ROW_STEP = 82` drives target-index math and the drag placement offset. Any item wrapping past one line makes the drop target wrong. Real card content will wrap. Fix: measure rows via `onLayout`.

**MOB-P1-15 — Retention chart y-scale clips real data.** `ProgressScreen.tsx:74` — `y = 14 + ((100 - value) / 50) * usableHeight` assumes retention ≥ 50%. A 40% bucket renders below the plot area. Axis labels are hard-coded strings. Web uses a data-derived axis and draws gaps and isolated points. Fix: data-derived axis; consume `retentionChartPath`.

### P2 — completeness / edge-state gaps

**MOB-P2-01** — No loading, error or network-failure state on any screen (§18). Becomes mandatory with hooks.
**MOB-P2-02** — Today has no caught-up, new-user or zero-value state; `retention === null` renders an em dash correctly but is unreachable.
**MOB-P2-03** — Library has no no-decks / no-cards empty state (only search-empty).
**MOB-P2-04** — Progress has no empty or long-history state.
**MOB-P2-05** — Notification rows never navigate to the deck or session they name.
**MOB-P2-06** — "Mark all as read" renders only under the *Today* heading but is gated on the **global** unread count; with unread items only in "Earlier", the control is unreachable.
**MOB-P2-07** — The header bell's unread dot is always rendered, independent of state.
**MOB-P2-08** — No due-count badge on the Today tab; web's `useNavBadges` has always been a real count.
**MOB-P2-09** — Review exit always `router.replace('/today')` regardless of origin.
**MOB-P2-10** — Explanation panels are absent on Multiple Choice, Ordering and Matching; present on Write Code and Walkthrough. Web shows Explanation after reveal for every type that has one.
**MOB-P2-11** — Objective results are computed and discarded; no suggested-rating mapping. Web pre-selects an overridable recommendation.
**MOB-P2-12** — Deck favorite is a mobile-only, non-persisted concept with no web equivalent. Remove, or record deliberately.
**MOB-P2-13** — `PlaceholderScreen.tsx` has no importers (dead code).
**MOB-P2-14** — Duplicated day pluralization in `TodayHero.tsx:207`; use core's `formatDayCount`.
**MOB-P2-15** — Fixture-coupled logic: `OrderingPreviewScreen.tsx:58` (`'size() == capacity()'`) and `ProgressScreen.tsx:113` (`startsWith('89')`).
**MOB-P2-16** — `app.json` lacks `scheme`, `bundleIdentifier` and `package`; required before OTP redirects or deep linking.
**MOB-P2-17** — Root `tsconfig.json` Expo edit and untracked root `.expo/` (already recorded in `TODO.md`, dated 2026-08-24). Root `.gitignore` does not cover `.expo/`.
**MOB-P2-18** — Bottom-padding inconsistency across screens (Progress `142`, others `38`–`44`). Verify tab-bar clearance on device.

### P3 — visual / polish only

Not to be worked before P0/P1 are closed. Recorded only: `InteractionLabel` grey-vs-orange (an existing cross-platform web debt), heat-map cell density at small widths, spacing/rhythm refinements, animation tuning, icon standardization (`TODO.md` "Icons" — a cross-platform product item, not mobile-specific).

---

## 23. Things explicitly NOT to implement

These are web placeholders, deferred product work, or out-of-scope. **None of them is mobile work, and none should enter a mobile milestone.**

| Item | Why not |
|---|---|
| Progress sub-pages: Decks, Activity, Review lag, Milestones, Achievements, Stats, Reports | 7 `aria-disabled` "Soon" rows on web. Mobile correctly omits them. |
| Settings: Profile, Email & password, Appearance, Notifications, Privacy, Connected devices | Inert placeholders on web. Mobile's honest "Not available yet" panels are already *better*. Do not build. |
| Account-menu rows: Preferences, Study settings, Spaced repetition (FSRS), Keyboard shortcuts, Help, What's new, About | Web "Soon" rows. |
| "Forgot password" | No reset backend anywhere; deliberate placeholder. |
| Weekly Goal | Removed from the product rather than computed. No goal entity exists. |
| Milestone / achievement **entity** | Both platforms derive milestones from `ReviewLog` thresholds. Do not introduce an entity. |
| Advanced session controls (time-boxed, weak-cards, new-vs-review, difficulty/interaction/tag filters, custom FSRS) | Deferred in `TODO.md`; nothing is abstracted in anticipation. |
| Collection as a real entity (Phase G migration) | Not started, and explicitly must not be folded into mobile work. Mobile consumes the UI-only `parentId` derivation from core. |
| **Roadmaps** | Master plan D15: web-only by decision. `features.md` places it out of scope. Its absence on mobile is never a gap. |
| `/design-preview/*` | Web design infrastructure. |
| `/preview` deck flip-through | Web-specific affordance; deck-scoped study covers the need. |
| Dark mode | Deferred; no dark palette exists in the shared tokens. |
| Onboarding flow | None exists on either platform. |
| Media in cards beyond the existing Walkthrough image | Not developed. |
| Cross-deck full-text card search · tag filter on cards · mid-session undo · flip-back-to-question · due forecast · Drafts UI | Capabilities removed with the v1 surface; deliberately not reimplemented, recorded as later candidates. Do not resurrect them on mobile first. |
| **Push notifications, APNs, notification scheduler, backend jobs** | No notification concept exists in the product; `TODO.md` lists it as deferred product work. The mobile inbox is already ahead of scope. |
| Mobile offline persistence / `ExpoSqliteRepository` / sync | Master plan Phase 11 — a real later milestone, not a bug. First mobile client is cloud-only (D11). |
| Supabase Realtime | D14: invalidation + `AppState` focus refetch first. |
| Pixel/layout parity with desktop | Explicit product direction: parity is behavioral, not visual. |

---

## 24. Web capabilities mobile should NOT copy literally

### PARITY REQUIRED (behavior must match; implementation must not)

| Capability | Web implementation | Native implementation |
|---|---|---|
| Section navigation | Local sidebars (`LibraryShell`/`CollectionNav`, `ProgressShell`, `SettingsNav`) | Stack navigation + tab bar (already done) |
| Filter / sort / Adjust session | Inline dropdowns, centered modal | Bottom sheets |
| Ordering reorder | Pointer drag + Space→arrows→Space keyboard flow | Touch drag **plus visible up/down controls** (D7) — native has no keyboard-drag equivalent |
| Matching board | Up to 3 columns with drawn connectors | 2-column board; 3-column stepwise or horizontal scroll (D6) |
| Code display | CodeMirror 6, lazy-loaded | Shared tokenizer → `<Text>` spans (D5a); WebView CodeMirror is a named escape hatch only |
| Code editing | `LazyCodeEditor` | Plain multiline `TextInput` with keyboard avoidance (D5a) |
| Export | Browser download via anchor + object URL | `expo-file-system` + `expo-sharing` |
| Import | `<input type="file">` | `expo-document-picker` |
| Sign-in | Magic link (URL redirect) | Six-digit email OTP — already an explicit product decision |
| List paging | Always-on pagination (10 decks / 7 cards) | Infinite scroll — a recorded deliberate divergence |
| Confirmation | `useDialogs()` (never `window.confirm`) | Native `Alert` / action sheet |
| Deck-scoped review | `/review?deck=&limit=` query params | Router params carrying the same semantics |
| Card detail | No detail screen; the row opens study preview (D69) | Same decision; do not invent a detail screen |

### SAME IMPLEMENTATION NOT REQUIRED (and mobile omission is not a gap)

Desktop `grid-template-areas` Today layout · the 4-layer pixel-tuned `SuggestedSessionHero` · `FloatingPanel` popovers · hover states · keyboard shortcuts (1–4, Escape, Space, arrow keys) · the 1280px centered frame · the Today pace chart at phone hierarchy · Progress's 7 "Soon" sidebar rows · the `/preview` flip-through strip.

---

## 25. Recommended implementation sequence

Derived from repository reality: the master plan's Phases 3 and 4 were skipped, so the sequence must back up to them before any further surface work. Each milestone is a coherent vertical slice a coding model can execute alone.

**M1 — Native production data & auth composition** *(the skipped Phase 3 + 4 gate)*
Goal: a signed-in phone reads and writes real cloud data, and one Recall card is reviewed end to end against a live Supabase project.
Routes/components: `app/_layout.tsx`, new `app/(auth)/sign-in.tsx`, `(auth)`/`(app)` group split, a new composition module, a native `SessionStore`.
Core used: `configureRepository`, `SupabaseRepository`, `resolveAuthState`, `createAuthEngine`, `AuthProvider`, `useDueCards`, `useSessionQueue` semantics, `reviewService.submit`, `usePersistReviewResult`, `buildReviewLog`, `formatInterval`.
Deps: `@supabase/supabase-js`, `expo-secure-store` (**requires approval** — the no-new-dependency rule applies).
Tests: `jest-expo` + RNTL stood up; sign-in screen, guard, phase-machine binding, persist-failure/retry.
Device: real 6-digit OTP; force-quit and relaunch; 10-minute background then resume; sign out; airplane mode at launch; `Intl` smoke check; `newId()` UUID validity.
DoD: all nine success criteria from master plan §18; migrations `0002`–`0004` applied and verified; `packages/core` and `apps/web` untouched.
Excluded: every other screen, every other interaction, styling polish, offline, notifications.

**M2 — Native RichText renderer + Review session wiring**
Goal: one live session over the real due queue renders and grades all six interaction types from real `Card` data.
Components: a new native renderer over `parseRichText` nodes; all six `*PreviewScreen` files converted from `parts[]` to `RichContent`; the five per-type routes collapsed into one dispatching session; `src/types/review.ts` `*TextPart`/`*CodeLine` types deleted.
Core used: `parseRichText`, `stripInlineMarkers`, `isSafeImageSource`, all six behaviors and graders (already correct), `reviewPhase` semantics, `commitReview`/`revertReview`.
Tests: the native content-security regression pass with `attackPayloads.ts` (this is the point at which the `TODO.md` item becomes actionable); RNTL per interaction.
Device: keyboard on Write Code and Walkthrough; Matching at 390px; Walkthrough with a 40-line block; Ordering drag with wrapping items.
DoD: identical `ObjectiveResult` to web for the same responses; real FSRS intervals on the rating controls; completion + Undo; persist-failure retry; five dead routes gone.
Excluded: authoring, Progress, visual polish.

**M3 — Today real-data conversion**
Goal: every Today number matches web for the same account.
Core used: `todayMetrics`, `computeStreak`, `formatDayCount`, `computeRetention`, `deckMetrics`, `progressMetrics`.
DoD: numbers identical side-by-side; caught-up / new-user / loading / error states; Continue Learning rows route per deck; em dash never `0%`; `fixtures/today.ts` deleted; the `TodayHero` pluralization duplication removed.
Excluded: pace chart, Adjust session (M4), Weekly Goal, achievements.

**M4 — Library functional parity (read) + deck/card CRUD**
Goal: browse the real deck tree, open any deck, open any card, and manage decks and cards.
Components: all three Library screens, `LibraryDeckRow` (make it pressable), a new native study-preview route, filter/sort/action sheets.
Core used: `collectionTree` (**consume, never re-derive**), `useDecks`, `useSearchCards`, `useDueCards`, `deckMetrics`, `sortDecks`, `useCreateDeck`/`useSaveDeck`/`useDeleteDeck`, `useSaveCard`/`useDeleteCard`/`useMoveCard`.
DoD: identical deck tree, due counts, mastery and last-studied as web; every §6 Library control either functional or removed; destructive confirmations; empty/loading/error states; deck-scoped Study Now live; Adjust session sheet.
Excluded: authoring, card drag-reorder, pagination (infinite scroll instead, recorded).

**M5 — Progress real-data parity + Review History**
Core used: `progressMetrics`, `learned`, `computeStreak`, `computeRetention`, `reviewHistory`, `retentionChartPath`, `dateRange`, `cardDeckIndex`, `calendarDay`.
DoD: every KPI, chart point and history row identical to web for the same account and range; working range selection; data-derived retention axis with gaps and isolated points; Deck Performance rows navigate; Review History with range/deck/rating filters.
Excluded: the seven web "Soon" rows; any new Progress feature.

**M6 — Profile / account / import-export**
DoD: real identity; **Sign out**; export round-trips into web and vice versa through the shared validator; Replace hidden in cloud mode; failure copy never shows raw backend text; the six placeholder panels stay honest and unbuilt.

**M7 — Authoring parity (all six types)** — or an explicit, recorded decision to ship web-first (D13).
DoD: every field the web editors expose is authorable; `saveXCard` reused verbatim with **no native save path**; edit preserves id/createdAt/scheduling/suspended.

**M8 — Notifications product decision**
Not an implementation milestone. Decide whether a notification concept exists. If not, the inbox is either removed or explicitly labeled a design preview. Do not wire it to fabricated events.

**M9 — Final functional regression, then visual polish**
All eight journeys re-scored; only then P3 work.

---

## 26. First recommended milestone

**M1 — Native production data & auth composition (the skipped Phase 3 + 4 architecture gate).**

Everything else in this report is downstream of it. Today, Library, Progress and Review cannot stop being fixtures until a repository exists, and a repository cannot exist until authentication does. The master plan is unambiguous that this gate comes first and that **if identical FSRS, atomic write, `stateBefore` recording, or failure honesty fails, work stops until the shared boundary is fixed** — writing more native screens on top of an unproven seam is precisely what has happened so far.

It also closes three standing `TODO.md` items and two `CURRENT_STATE.md` §15 caveats for free, because it is the first moment a live Supabase project exists.

**Do not perform it in this pass.** This audit is the map; M1 is the next commit.

---

## 27. Documentation / TODO recommendations *(do not edit now)*

**`docs/CURRENT_STATE.md`**
- §1 already says "auth, repository composition, real data/sync, push registration and a live Review session are not connected" — accurate. Add that **no mobile composition root, QueryClient or auth layer exists at all**, so the gap is structural rather than pending wiring.
- §3 mobile rows: add the reachability facts — All Decks rows are inert, 2 of 6 collection pills navigate, 1 deck row navigates in 1 collection, deck/collection route params are ignored, five review routes are unreachable.
- §3 Mobile Profile row: state explicitly that **no Sign out control exists**.
- §16: record that mobile has **zero tests** and no `jest-expo`.
- §17 "Exact recommended next milestone": replace the physical-device Walkthrough review with M1.
- Add a mobile route table mirroring §18.

**Platform parity tracking (`docs/platform-parity.md`, proposed in master plan §21 and still not created)**
Create it, seeded from §4 of this report. It should carry, as first-class recorded rows: Roadmaps = web-only by decision (D15); Today pace chart and Next milestone = intentionally different mobile hierarchy; pagination → infinite scroll; magic link → six-digit OTP; deck favorite = mobile-only or removed; and the authoring-parity decision (D13) once made.

**`docs/TODO.md`**
- **Preserve** "Content security for a future native renderer" verbatim — still not actionable; note that it becomes actionable at M2.
- Add: mobile has no composition root, no auth, no tests.
- Add: `app.json` needs `scheme` / `bundleIdentifier` / `package` before OTP redirects.
- Note that the "Notifications" entry now has a mobile inbox built ahead of it, and that the product question is open.
- The 2026-08-24 root-`tsconfig`/`.expo` revert item stays as written.

**`docs/itera-decisions.md`** (append-only) — a new dated entry recording that the native GUI pass deliberately preceded the Phase 3/4 architecture gate, and that the gate is now being taken up before further surface work.

---

## 28. Final answer

# MOBILE NEEDS CORE FUNCTIONAL WIRING FIRST

The native GUI is substantially designed and, in the review layer, architecturally correct — the six interaction Views consume shared `InteractionBehavior` and shared graders with no duplication, which is the hardest thing to get right and the easiest to get wrong. That work should be preserved.

But no mobile screen touches user data. There is no repository, no query client, no authentication, no session, no persistence and no native content renderer. All ten fixtures are fabrications, all eight end-to-end journeys score BROKEN or NOT IMPLEMENTED, and the primary browse control of the app — the deck row on Library All Decks — has no press handler at all.

The correct next action is not polish and not another screen. It is the architecture gate that was skipped: **M1, native production data and auth composition**, verified against a live Supabase project end to end.
