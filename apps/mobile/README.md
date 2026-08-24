# Itera mobile

This workspace is Itera's Expo/React Native presentation and composition app.
Phase 3.0 proved Expo Go and ordinary `@itera/core` workspace resolution on a
physical iOS device. The native product screens built since are fixture-backed
Today, Notifications, Progress, Profile & Settings, the three Library depths
(All Decks, Collection, Deck), and immersive previews of all six interaction
types, each awaiting project-owner device review.

From the repository root:

```bash
npm install
npm run dev:mobile
```

Install or update Expo Go on the phone, keep the phone and PC on the same local
network, then scan Metro's QR code. Today opens by default. The Review tab opens
the interaction previews, which are fixture-backed: nothing is graded, scheduled
or persisted yet.

On iOS, scan with Camera. On Android, use Expo Go's scanner. If the LAN route is
blocked by the network or Windows firewall, retry from the repository root with:

```bash
npm run start --workspace @itera/mobile -- --tunnel
```

SDK-specific implementation guidance lives in the exact Expo 54 documentation.
The repository-root `AGENTS.md` remains authoritative for Itera architecture and
scope.
