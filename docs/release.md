# Release acceptance

This dependency migration is implemented locally. It has not been deployed, submitted to TestFlight, or published. The previous version 2.0.0 (20) was accepted for internal TestFlight testing; [its EAS build](https://expo.dev/accounts/blackmaskexe/projects/gains-chat/builds/a237492f-6158-4cbc-b402-19e8ee5036e1) is historical evidence, not verification of the new dependencies.

## Before release

Run all three immutable Yarn installs and CI checks. Run Expo Doctor and the native configuration integration check. Generate a fresh iOS production bundle and inspect the EAS source archive (`yarn eas build:inspect --platform ios --stage archive --output /tmp/gainschat-source --profile production` from frontend). It must include the independent locks, vendored Yarn releases and Firebase plist, while excluding node_modules, .yarn/cache and generated native projects.

Use the pinned EAS production profile: stable `macos-tahoe-26.6-xcode-27.0`, Node 24.21.0, Corepack, dynamic frameworks and iOS 16.4 minimum. Both the local Xcode 27.1 RC simulator Release build and an unsigned device archive compiled, including the Swift store. The device archive embeds 26 dynamic frameworks with no unresolved framework links or embedded static frameworks. Local CoreSimulator service version mismatch prevents claiming simulator interaction on this host. The final app contains Ionicons.ttf and MinimumOSVersion 16.4.

A newly signed release archive must verify bundle `com.blackmaskexe.gainschat`, team `T296YJXC87`, container `iCloud.com.blackmaskexe.gainschat`, production CloudKit/App Attest/APNs environments, `get-task-allow=false` and embedded dynamically linked Firebase frameworks. The app.json APNs value is build input, not proof of final signing permissions. Do not regenerate credentials or deploy a CloudKit schema simply for this dependency change; the Core Data model is unchanged.

Test on a signed iPhone: App Attest and anonymous Auth; real lift confirmation and correction; history with and without records; manual CRUD and all tabs; offline enqueue and reconnect; app termination during an initial request and a history follow-up; multiple messages during a slow request; iCloud unavailable; background/foreground refresh; second-device recovery. Confirm no duplicated lifts after retry. Current live provider availability checks used only synthetic input and do not establish signed-device operation or end-to-end latency.

## Backend cutover and retirement

Read-only deployed inventory during implementation:

| Function | Region | Existing runtime |
| --- | --- | --- |
| api | us-central1 | nodejs20 |
| cleanupRateLimits | us-central1 | nodejs20 |
| processMessage | us-central1 | nodejs22 |

`exportLegacyData` was absent from that inventory. Recheck immediately before release; if it exists in any environment, explicitly delete that named callable in its listed region. Do not assume a targeted processMessage deployment will remove it. Firebase documents [explicit function retirement](https://firebase.google.com/docs/functions/manage-functions#delete_functions).

The approved deployment should update **all three retained functions** to Node 24. Deploy the replacement api handler as well as processMessage and cleanupRateLimits; otherwise old unauthenticated HTTP account/workout routes remain live. Preserve the existing api `/privacy-policy` URL and confirm GET returns 200, HEAD is supported, and old HTTP routes return 410. The obsolete DB_URI/JWT_SECRET bindings are removed from source; do not delete secret resources or the MongoDB database automatically.

Keep scheduled aiRateLimits cleanup because processMessage still uses its global daily counter. Deploy reviewed Firestore rules and the messageRequests/messageLimits expiresAt TTL configuration. The obsolete legacyExportLimits field override is removed from source; inspect any existing policy and residual counters before changing deployed retention. This repository does not automatically delete stored data.

The Node 24 Linux build must use the repository's pinned Functions Framework 5.0.5, not a buildpack-injected framework. Verify production pruning, endpoint discovery, unauthenticated rejection, replay accounting and no secret values or private prompts in logs. Test the backend against the previous client wire format before rolling out the new iOS binary.

## Publication

Only after the backend and signed-device checks pass should an operator create a production EAS build and submit it to the existing App Store Connect app `6744004900`. Recheck Apple's accepted version/build requirements and record the new build URL, final signed entitlements and TestFlight acceptance. Submission and publication remain separate actions.
