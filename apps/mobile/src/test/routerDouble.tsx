/**
 * A transparent `expo-router` double for screen tests.
 *
 * The same idea as the one in `RootNavigator.test.tsx`: replace the router with
 * something that records where a screen tried to go, so what is asserted is the
 * screen's decision rather than Expo Router's implementation of it. Screens
 * navigate with the object form (`{ pathname, params }`), and the recorded
 * entries are compared against exactly that.
 *
 * Not a `*.test.ts` file, so the runner does not try to execute it, and it
 * lives under `src/` rather than `app/`, where Expo Router's require.context
 * would pull it into the bundle (itera-decisions D356).
 */

export interface RouterHref {
  pathname: string
  params?: Record<string, string>
}

export const routerCalls: { push: (RouterHref | string)[]; replace: (RouterHref | string)[] } = {
  push: [],
  replace: [],
}

export const routerDouble = {
  push: (href: RouterHref | string) => {
    routerCalls.push.push(href)
  },
  replace: (href: RouterHref | string) => {
    routerCalls.replace.push(href)
  },
  back: () => {},
  canGoBack: () => true,
}

export function resetRouterCalls(): void {
  routerCalls.push.length = 0
  routerCalls.replace.length = 0
}

/** The deckId a screen pushed, for the nth navigation. */
export function pushedDeckIds(): string[] {
  return routerCalls.push
    .filter(
      (href): href is RouterHref =>
        typeof href !== 'string' && href.pathname === '/library/deck/[deckId]',
    )
    .map((href) => href.params?.deckId ?? '')
}

/** The cardId a screen pushed at the card study route, for each navigation. */
export function pushedCardIds(): string[] {
  return routerCalls.push
    .filter(
      (href): href is RouterHref =>
        typeof href !== 'string' && href.pathname === '/card/[cardId]/study',
    )
    .map((href) => href.params?.cardId ?? '')
}

/** The deckId a screen scoped a review session to, for each navigation. */
export function pushedSessionDeckIds(): string[] {
  return routerCalls.push
    .filter(
      (href): href is RouterHref =>
        typeof href !== 'string' && href.pathname === '/review/session',
    )
    .map((href) => href.params?.deckId ?? '')
}

export function pushedCollectionIds(): string[] {
  return routerCalls.push
    .filter(
      (href): href is RouterHref =>
        typeof href !== 'string' && href.pathname === '/library/[collectionId]',
    )
    .map((href) => href.params?.collectionId ?? '')
}
