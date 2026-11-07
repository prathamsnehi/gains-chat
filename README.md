# Gains Chat

Gains Chat is an iPhone lifting log with a chat composer, manual workout editing, History, Progress and Goals. Core Data saves workouts locally; private CloudKit mirrors lifts, exercises, aliases and goals. Chat and the durable pending queue stay on the phone.

- `frontend/`: Expo SDK 58, React Native 0.88, React 19.3, Expo Router and the custom Swift storage module.
- `functions/`: authenticated, App Check protected message processing on Firebase Functions / Node 24, quota cleanup and the existing privacy-policy URL.
- `tooling/`: separately pinned EAS CLI and its security compatibility checks.
- `docs/`: [development](docs/development.md), [architecture](docs/architecture.md), [dependency migration and security follow-ups](docs/dependency-migration.md), and [release acceptance](docs/release.md).

Each package directory is an independent Yarn 4.18.1 project with a committed lockfile and vendored runtime. Use Node 24.21.0, then run `node .yarn/releases/yarn-4.18.1.cjs install --immutable` inside each directory. Corepack-enabled Yarn can also run the same commands.

Legacy accounts, HTTP workout routes, import/migration tools and JSON workout restore have been retired from this source. Existing modern Core Data / CloudKit records are preserved. Production removal of the old callable and replacement of the HTTP service remain explicit release actions.

The SDK 58 native simulator Release build, JavaScript bundle and regression tests pass locally. The current migration has not been deployed or submitted. Signed-iPhone App Attest and CloudKit recovery remain release acceptance checks; earlier TestFlight build 2.0.0 (20) is the previous release, not this migration.
