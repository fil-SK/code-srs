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
