# Gains Chat

Gains Chat is an iPhone lifting log. It opens to a chat composer, likely exercises for today, and each exercise's last set. Messages appear immediately while offline; a durable queue processes them when the phone reconnects. History has editing and search, Progress has PRs and estimated one rep max trends, and Goals remains a secondary view.

## Repository

- `frontend/` — Expo iOS app and local Swift storage module.
- `functions/` — Firebase callable message service, legacy import endpoint, and temporary legacy HTTP service.
- `docs/` — architecture, data, AI, migration, development, and release procedures.

Start with [development setup](docs/development.md) and [architecture](docs/architecture.md). The one-time import is described in [migration](docs/migration.md). Do not remove the legacy service or publish an update until the backup and on-device import have been checked.

## Verification

TypeScript, an iOS Metro export, migration mapping tests, backend tests, and a [remote iOS simulator build](https://expo.dev/accounts/blackmaskexe/projects/gains-chat/builds/66daff6b-88f0-4f8f-a09e-60cff769921f) pass. App Check, CloudKit sync, live Jev/Gemini timings, and legacy import still require a signed device build and production credentials. The warm two-second median is a target, not a measured result.
