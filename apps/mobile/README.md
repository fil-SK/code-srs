# Itera mobile

This workspace is Itera's Expo/React Native presentation and composition app.

It runs in one of two modes.

**Demo (the default).** No configuration, no Supabase project, no sign-in code:
the app opens straight into the product over one deterministic demo workspace,
and Today, Library, Progress and Notifications navigate to each other coherently.
This is the current default because the product is being shown to potential users
before further cloud investment.

Demo data is **deterministic demo data**. It is not synced, not cloud-backed, not
a persisted account and not production data. It lives in memory and resets on a
full app restart, deliberately.

**Cloud (`EXPO_PUBLIC_ITERA_MODE=cloud`).** The real composition root: a native
Supabase client over a chunked SecureStore session, the shared `@itera/core` auth
engine behind six-digit email OTP, `Stack.Protected` route groups, one
`QueryClientProvider`, and the shared `Repository` registered through
`configureRepository`. Profile shows the real account identity and can sign out.
This path is implemented but **has never been run against a live Supabase
project**, and is deferred by product-owner decision until after demand
validation.

Demo mode has a native RichText renderer and a functional local Review session
across all six interaction types. Its grades and canonical ReviewLogs update the
in-memory demo workspace; cloud persistence remains deferred. The Notifications
inbox keeps read state in that same workspace, with separate row navigation and
Read/Unread status actions.

The app uses a custom `index.ts` entry point to install SDK 54's `expo-crypto`
before Expo Router evaluates routes. Keep `expo-router/entry` as the final import
in that file: demo history creates UUIDs during the first render, and Expo Go
does not provide `globalThis.crypto` itself.

See [`docs/CURRENT_STATE.md`](../../docs/CURRENT_STATE.md) §24 for demo mode and
§23 for the cloud foundation, and
[`docs/platform-parity.md`](../../docs/platform-parity.md) for the per-capability
web/native table.

## Configuration

**None is needed to run the app.** With no `.env.local` the build is a demo build
and opens the product immediately.

For cloud mode, copy `.env.local.example` to `.env.local`, set
`EXPO_PUBLIC_ITERA_MODE=cloud`, and fill in your Supabase project URL and
publishable key. With the mode set and those unset the app renders a
configuration notice instead of the product - there is no native local storage
fallback, and a web workspace that only exists in a browser will not appear here.

Only the exact value `cloud` selects cloud mode; anything else is demo, so a
half-configured build is never mistaken for a cloud build.

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
- `src/config/mobileRuntimeMode.ts` and `src/data/supabaseClient.ts` are the only
  modules that read configuration, and both read `process.env.EXPO_PUBLIC_*` as
  static member expressions so Expo can inline them. Core never learns about
  Expo, SecureStore, `AppState` or React Native.
- `src/demo/` is the demo workspace: one dataset, pure selectors, one provider.
  It is mobile-only and is deliberately **not** a `Repository` implementation.
- Never import a backend from a screen, hook or component.

SDK-specific implementation guidance lives in the exact Expo 54 documentation.
The repository-root `AGENTS.md` remains authoritative for Itera architecture and
scope.
