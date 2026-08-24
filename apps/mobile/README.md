# Itera mobile

This workspace is Itera's Expo/React Native presentation and composition app.

It now has a real composition root: a native Supabase client over a chunked
SecureStore session, the shared `@itera/core` auth engine behind six-digit email
OTP, `Stack.Protected` route groups, one `QueryClientProvider`, and the shared
`Repository` registered through `configureRepository`. Profile shows the real
account identity and can sign out.

The product screens above that foundation are still **fixture-backed**: Today,
Notifications, Progress, Profile & Settings, the three Library depths (All Decks,
Collection, Deck), and immersive previews of all six interaction types. There is
no native RichText renderer and no live Review session yet.

See [`docs/CURRENT_STATE.md`](../../docs/CURRENT_STATE.md) §23 for exactly what
is real, and [`docs/platform-parity.md`](../../docs/platform-parity.md) for the
per-capability web/native table.

## Configuration

Mobile is **cloud-only**. Copy `.env.local.example` to `.env.local` and fill in
your Supabase project URL and publishable key. Without them the app renders a
configuration notice instead of the product - there is no native local storage
fallback, and a web workspace that only exists in a browser will not appear here.

Expo inlines `EXPO_PUBLIC_*` at build time and caches the result, so restart
Metro with `--clear` after changing them.

## Running

From the repository root:

```bash
npm install
npm run dev:mobile
```

Install or update Expo Go on the phone, keep the phone and PC on the same local
network, then scan Metro's QR code. On iOS, scan with Camera. On Android, use
Expo Go's scanner.

If the LAN route is blocked by the network or Windows firewall:

```bash
npm run start --workspace @itera/mobile -- --tunnel
```

Everything this workspace depends on is available in Expo Go for SDK 54, so no
development build is required.

## Checks

```bash
npm run test:mobile                              # from the repository root
npm run test    --workspace @itera/mobile        # jest-expo + RNTL
npx tsc --noEmit                                 # from apps/mobile
npx expo lint
npx expo-doctor
npx expo export --platform ios --output-dir .expo-export   # proves the Metro graph
```

The mobile suite is deliberately separate from the root `npx vitest run`, which
covers `apps/web` and `packages/core` only and never sees these files.

## Conventions

- `src/composition/` holds the composition modules. **Do not rename it to
  `src/app/`**: Expo Router treats `src/app` as an alternative app directory and
  will build a second route root there, pulling test files into the bundle.
- `src/data/supabaseClient.ts` is the only module that reads configuration. Core
  never learns about Expo, SecureStore, `AppState` or React Native.
- Never import a backend from a screen, hook or component.

SDK-specific implementation guidance lives in the exact Expo 54 documentation.
The repository-root `AGENTS.md` remains authoritative for Itera architecture and
scope.
