# Itera mobile bootstrap

This workspace is the Phase 3.0 Expo/React Native infrastructure shell. It is
not an Itera mobile design and contains no product screens yet.

From the repository root:

```bash
npm install
npm run dev:mobile
```

Install or update Expo Go on the phone, keep the phone and PC on the same local
network, then scan Metro's QR code. The temporary screen should report:

```text
Itera mobile bootstrap
Expo runtime: OK
@itera/core: OK
```

On iOS, scan with Camera. On Android, use Expo Go's scanner. If the LAN route is
blocked by the network or Windows firewall, retry from the repository root with:

```bash
npm run start --workspace @itera/mobile -- --tunnel
```

SDK-specific implementation guidance lives in the exact Expo 54 documentation.
The repository-root `AGENTS.md` remains authoritative for Itera architecture and
scope.
