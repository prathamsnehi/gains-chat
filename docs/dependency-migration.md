# Dependency migration and remaining security work

## Implemented baseline and version policy

The original committed SDK 55 / React Native 0.83.10 dependency trees were restored with npm ci before conversion. That clean baseline passed 21 frontend tests, 18 backend tests and typechecking; the earlier mixed node_modules failures were not reproducible after restoration. npm lockfiles were then replaced with independent Yarn locks. SDK 56.0.23 and patched SDK 57.0.30 each passed retained tests, typechecking, dependency alignment and production iOS bundling before SDK 58.

The frontend, backend and separate CLI tooling project each pin Yarn 4.18.1 and the node-modules linker, vendor its release, use immutable installs, and retain the 1,440-minute release-age gate. EAS CLI lives outside the Expo app because Expo Doctor rejects installing it there. All three graphs are audited. The Functions source needs no sibling project to install, discover or run.

| Component | Installed / decision |
| --- | --- |
| Expo / Router / Font | 58.0.14 / 58.0.23 / 58.0.8: latest eligible patches at implementation |
| React Native / React | 0.88.0 / 19.3.0 |
| React Native Firebase modules | All four 26.4.0; 27.0.0 was published inside the age gate |
| Firebase Apple / JavaScript SDKs | Resolved 12.19.2 via SPM / 12.17.1 |
| Ionicons | Scoped 13.1.0 with static font embedding; 14.0.0 was inside the age gate |
| Firebase Admin / Functions | 14.5.0 / 7.4.0 |
| Functions Framework | Explicit 5.0.5 runtime dependency |
| Google Gen AI / models | SDK 2.30.0; Gemini 2.5 Flash and stable Jev 1.13 retained |
| Firebase CLI / EAS CLI | 15.34.0 / 25.2.0 |
| TypeScript / Babel | 6.0.3 / supported Babel 7 |
| Node / iOS minimum | Local and EAS 24.21.0; managed backend major 24 / iOS 16.4 |

The owner explicitly chose to keep the age gate unchanged. Today's Expo 58.0.16, Router 58.0.24, Font 58.0.9, Ionicons 14 and RNFirebase 27 remain follow-ups. The three Expo patch exceptions are explicit in expo.install.exclude and independently checked by check:sdk; they are not blanket validation suppression. When eligible, update their exact pins and adapter tests, remove those exclusions, and repeat Doctor, export, prebuild and native Release compilation.

TypeScript 7.0.2 passed typechecking, retained tests, Metro startup, configuration generation, typed routes and production export, but Expo Doctor rejected its unsupported major. The final tree retains supported 6.0.3. Babel 8 remains outside Expo's supported preset dependency range.

## Native and protocol measures

The app now has five file routes under one Expo Router JS tab navigator, with local initialization in the root layout. Native strict refs and status-bar usage are updated. iOS minimum 16.4 applies to the app and local podspec. Only the unused bulk-import API was removed from Swift; Core Data entities, attributes, configurations, SQLite URLs and CloudKit identity are unchanged. No data reset or schema deployment occurred.

RNFirebase 26 already resolves Firebase Apple 12 through SPM within the CocoaPods app. Its startup plugins still target pre-scene Expo templates; the local adapter handles Expo 58 and normalizes order/duplicates. Actual prebuild integrations pass with either Firebase plugin order. Upgrade all four modules to 27 together once eligible, inspect the actual generated startup code before simplifying this adapter, retain dynamic frameworks, resolve Firebase Apple 13 and verify archive embedding plus signed-device startup. Do not switch the entire Expo application to experimental SPM tooling. Firebase 13.0.0 and 13.0.1 are identical for SPM, so do not override RNFirebase's native pin merely for the larger patch number. [RNFirebase migration](https://rnfirebase.io/migrating-to-v27), [Apple SDK release notes](https://firebase.google.com/support/release-notes/ios).

The queue now stores a complete immutable wire request and durable initial/history phase before transmission. It rereads storage after success, handles wake-ups during drain completion, preserves follow-up identity across errors/restarts and stops at a failed head instead of spinning. The public callable request/response shape remains unchanged. Requests created by older clients may lack these optional fields; the client freezes them on the next attempt and never silently substitutes a new ID after an already-exists conflict.

Admin imports use getApps/initializeApp/getFirestore subpaths while retaining CommonJS. Jev is bounded to 8 seconds, Gemini to 12 seconds and all provider work to 24 seconds from invocation start. Gemini SDK attempts is explicitly 1. Failed provider attempts remain charged; cached successes replay without another provider call or quota charge.

The first real Linux build revealed that the buildpack injected Functions Framework 3.5.1 using npm, outside the Yarn lock, with a critical advisory and Node 24 engine warning. Pinning 5.0.5 makes the framework part of the audited runtime graph; the rebuilt image reports injected=false and excludes firebase-tools.

## Security results and scoped fixes

The original npm reports contained 44 affected frontend package entries and 43 backend entries, including two critical backend entries. These propagated package counts are not comparable directly to Yarn's leaf advisory counts.

Final recursive Yarn results:

| Project | Full advisory entries | Production advisory entries | Production deprecations |
| --- | --- | --- | --- |
| Frontend | 2 high | 2 high | 0 |
| Functions, including framework | 2 (1 high, 1 moderate), development only | 0 | 2 |
| EAS tooling | 26 (7 high, 12 moderate, 7 low), development only | 0 | 0 |

Frontend production audit includes Expo CLI and Metro because Expo declares build tools as dependencies. The two remaining findings concern that build/development toolchain; these packages are not native iPhone runtime libraries. This distinction does not remove their findings or make the development toolchain safe for untrusted inputs. The backend's remaining production messages are deprecations for glob and node-domexception, not vulnerability advisories. No full container/OS or comprehensive native SCA claim is made.

Compatible scoped resolutions update Firestore's grpc-js, Xcode project UUID generation, CloudEvents IDs, Gaxios multipart IDs, Rudder IDs and Bunyan tracing IDs. All UUID replacements remain on the CommonJS-compatible 11.1.1 release; v1/v4 consumers retain those APIs. EAS's AJV, Joi (including eas-json), minimatch, nanoid, tar and yaml resolve patched compatible releases. Compatibility checks exercise actual EAS profile parsing, schema/ID/archive interfaces, Xcode IDs, Firestore initialization and CloudEvents serialization. No ESM-only UUID major or unrelated glob library is aliased into an old API.

`security/dependency-audit-baseline.json` records the exact remaining advisory IDs, severities and versions for full and production graphs. CI always obtains fresh recursive reports and fails on new/changed findings or any critical finding. Existing findings remain printed and uploaded, rather than being hidden with broad audit exclusions. The tooling baseline now also tracks the newly published deepmerge, fast-uri, Joi, minimatch, glob, and additional node-forge advisory IDs plus the new http-call deprecation report. Remove baseline entries as their owning tools are remediated.

Yarn also reports upstream peer-metadata warnings in Expo/Firebase/Babel packages, and Expo Router's unused drawer-layout path requests Reanimated. This app uses JS tabs and no drawer; its production bundle and native compilation succeed without adding Reanimated/worklets solely to satisfy that unused path. Keep the node-modules linker. A future drawer feature must install Expo-aligned animation dependencies and repeat native validation; these warnings are not being presented as fixed.

## Replacement or maintained-patch work

| Remaining dependency | Owning path and reachability | Concrete follow-up and verification |
| --- | --- | --- |
| braces 3.0.3 | Frontend Metro/micromatch, Functions CLI/chokidar and EAS tool globbing; build/development inputs | Prefer an upstream bounded-parser fix. If unavailable, carry a narrowly maintained Yarn patch enforcing bounded nesting/expansion in braces, with the advisory reproducer, escaped braces, numeric ranges and normal Metro/CLI glob fixtures. A switch to picomatch must adapt each owning caller's match/expansion API and pass those fixtures; do not alias it as braces. |
| node-forge 1.4.0 | Expo CLI certificate handling and EAS signing/certificate tooling | Replace certificate signature verification at owning call sites with Node crypto X509Certificate/public-key verification; separately adapt certificate encoding/PKCS12 operations using an audited supported implementation. Verify valid Apple/dev certificate chains, malformed nested DigestAlgorithm rejection, PEM/DER round trips and real native build/archive handling before replacing Forge throughout signing code. |
| sprintf-js 1.0.3 | EAS's older argparse/YAML tooling, not the iPhone or backend runtime | Upgrade the owning YAML/parser chain to supported js-yaml/argparse versions that remove sprintf. If blocked, maintain a precision/output-bound patch. Exercise CLI help/errors, representative configuration files and oversized precision reproducers. |
| diff 7.0.0 | EAS fingerprint diff helper uses diffLines; the advisory affects patch parsing/application | Upgrade the owner to fixed diff 8.0.3 or newer with an explicit CommonJS API adaptation if needed. Compare current fingerprint line-diff output and run the parsePatch/applyPatch denial-of-service regression before dropping the exception. |
| ts-deepmerge 6.2.0 | EAS new-project configuration generation | Update that caller from the old default export to the fixed v8 named merge API, preserving array/object merge behavior and rejecting prototype-method override inputs. Test generated app/eas configuration and prototype-key reproducers. A resolution alone would break its import contract. |
| OpenTelemetry core 1.30.1 | Firebase CLI's Pub/Sub tooling dependency; pruned from runtime | Upgrade the owning Pub/Sub integration to the supported OpenTelemetry 2.8+ chain, or maintain its upstream bounded-baggage fix without aliasing 2.x into a 1.x API. Test emulator startup/tracing and oversized baggage rejection. |

Deprecated tooling dependencies (including old glob/rimraf/inflight/json-ptr) remain visible in raw reports. Replace their owning CLI integrations alongside the above changes; do not force incompatible global major overrides to obtain an artificially empty report.

## Evidence and release boundary

Clean immutable installs, retained regressions, Expo Doctor 20/20, production bundle, actual prebuild in both plugin orders, the full SDK 58 iOS Release simulator compilation and an unsigned device archive pass. Both app artifacts embed Ionicons.ttf and have MinimumOSVersion 16.4. The unsigned device archive was checked for missing framework links and incorrectly embedded static frameworks; neither was present. Final signed entitlements remain unverified. Local Metro and typed routes work. The host's CoreSimulator service is older than its installed Xcode, so simulator interaction and signed iPhone acceptance are not claimed.

An actual loopback Firestore emulator check passed Admin 14 transaction, Timestamp, replay, quota and fingerprint behavior; CI includes the same demo-only check. The Linux Google Node 24 buildpack selected Yarn 4.18.1, ran immutable installation and production pruning, loaded the expected three endpoints and used the explicit framework. Local image smoke checks returned 401 for unauthenticated callable requests, 200 for GET/HEAD privacy policy, and 410 for a retired account route. Source archive inspection includes all three lockfiles/releases and the Firebase plist while excluding node_modules, caches and generated native projects. Native resolved versions and embedded frameworks are recorded in `security/native-dependencies.json`; primary Firebase/gRPC release/advisory sources were inspected, but that inventory is not a comprehensive vulnerability scan.

Both live provider checks passed with synthetic input and secrets held only in memory. No production deployment, function deletion, credential mutation, CloudKit schema change or app submission was performed. Follow [release acceptance](release.md) for the remaining operator/device checks.
