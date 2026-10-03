# Development

Requirements: Node 20 or newer, npm, Xcode and iOS signing, an Apple Developer account with `iCloud.com.blackmaskexe.gainschat`, Expo/EAS access, and Firebase project `gains-chat`. The native Core Data module needs a development build; Expo Go cannot run it.

1. In `frontend/`, run `npm ci` and `npm run typecheck`.
2. Put the Firebase Apple config at `frontend/GoogleService-Info.plist` for bundle ID `com.blackmaskexe.gainschat`. This file is ignored by Git but included in the EAS source upload by the root `.easignore`. A **file** environment variable named `GOOGLE_SERVICES_PLIST` can supply an alternate path; `app.config.js` uses it when present.
3. Enable Firebase Anonymous Auth, configure App Check for the iOS app with App Attest, and enable Firestore. SDK 55 targets iOS 15 or later, so this app uses App Attest directly and needs no DeviceCheck private key. Register a debug token for development builds. The app waits for a valid App Check token before Auth/callables; it retries only the brief native provider setup race. The callables require valid App Check tokens.
4. Configure Firebase secrets `TYPESAFE_API_KEY`, `GEMINI_API_KEY`, and `DB_URI`; the temporary HTTP API also uses `JWT_SECRET`. Never commit these. In `functions/`, run `npm test`.
5. Build a signed development client with `eas build --profile development --platform ios`, install it, then run `npm start` in `frontend/`.

Run the additional release initialization checks with `node --import tsx --test data/appCheckReadiness.test.ts plugins/withNativeServiceInitialization.test.js` from `frontend/`. The native transform tests compose the installed RNFirebase Expo plugins in both orders and verify a single Firebase initialization after the App Check factory.

Debug native builds populate the CloudKit development schema when the store loads. Use an iCloud-signed-in device or simulator, then deploy the schema in CloudKit Console before TestFlight. See [release gates](release.md) for signing and production checks. A local schema initialization failure does not block recording lifts.

The callable pins Jev `jev-1.13.0` through TypeSafe's HTTP API. The iOS Metro export and TypeScript check validate JavaScript; a device build is needed for native storage, App Check, and iCloud.
