# Gains Chat

Gains Chat is an iPhone lifting log. It opens to a chat composer, likely exercises for today, and each exercise's last set. Messages appear immediately while offline; a durable queue processes them when the phone reconnects. History has editing and search, Progress has PRs and estimated one rep max trends, and Goals remains a secondary view.

## Repository

- `frontend/` — Expo iOS app and local Swift storage module.
- `functions/` — Firebase callable message service, legacy import endpoint, and temporary legacy HTTP service.
- `docs/` — architecture, data, AI, migration, development, and release procedures.

Start with [development setup](docs/development.md) and [architecture](docs/architecture.md). The workout-only restore is described in [migration](docs/migration.md). Keep the legacy service until the preserved recent workouts have been checked on the iPhone.

## Verification

TypeScript, an iOS Metro export, restore and migration mapping tests, backend tests, a [remote iOS simulator build](https://expo.dev/accounts/blackmaskexe/projects/gains-chat/builds/3e45094e-8fd1-43f2-a1b0-a9a33a6f4855), and an App Store distribution build pass. The signed archive's production CloudKit, App Attest, and APNs entitlements were verified. The iCloud-signed-in simulator opens the app, reports iCloud available, and successfully initializes the development schema. The production schema is deployed and version **2.0.0 (20)** is accepted for internal TestFlight testing; see [release status](docs/release.md). App Check on the iPhone, CloudKit recovery, live Jev/Gemini timings, and workout restoration still require device verification. The warm two-second median is a target, not a measured result.
