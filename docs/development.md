# Development

Open `ios/GainsChat.xcodeproj` in Xcode 16 or later. The deployment target is iOS 16.4. The app target depends on the local package `ios/GainsCore` and on Firebase Apple SDK 11 for App Check.

Add `ios/GainsChat/GoogleService-Info.plist` from the Firebase project `gains-chat` in the indicated directory. The build copies it into the app when present. It is gitignored. Logging works without it. Questions do not, because App Check cannot start.

Register the App Check debug token for debug builds. Release builds use App Attest. The bundle id is `com.blackmaskexe.gainschat` and the team is `T296YJXC87`.

Run the logic tests from `ios/GainsCore`:

```sh
swift test
```

Retrain the intent model from `ios/` when the shorthand examples change:

```sh
python3 train_intent.py
```

That rewrites `GainsCore/Sources/GainsCore/IntentWeights.swift` and `GainsChat/IntentRouter.mlmodel`. Core ML prediction itself runs on a Mac.

Function tests:

```sh
node --test hosting/functions/*.test.js
```

GitHub Actions runs those two checks on Linux. A separate job on a Mac builds `ios/GainsChat.xcodeproj` for the iOS Simulator with signing turned off, and runs `swift test` with the Xcode toolchain. That job does not archive or sign for a device. A signed archive still needs the team certificate on a Mac.

Set the chat key before a deploy. Do not commit it and do not paste it into chat:

```sh
firebase functions:secrets:set TOKENROUTER_API_KEY
firebase deploy --only functions,hosting
```

The server selects `openai/gpt-6-luna` and streams Responses events through the HTTPS function. The iPhone executes workout tools locally after consent.

### Live simulator benchmark

On November 19, 2026, an iPhone simulator ran two passes through the deployed Firebase chat function with App Check enabled. Each pass used a synthetic local bench record, corrected its weight, requested its history, and requested its progress. The assertions checked the committed record ID and weight, the table row ID, and the chart exercise ID. Times below are arithmetic means in seconds from the start of each online turn.

| Request | First complete tool request | First reply text | Reply complete |
| --- | ---: | ---: | ---: |
| Correct the top set | 2.78 | 3.74 | 3.84 |
| Show exercise history | 1.58 | 3.03 | 3.42 |
| Show exercise progress | 1.56 | 3.11 | 3.80 |
| All six requests | 1.97 | 3.29 | 3.69 |

The correction committed at 2.79 seconds on average. The app set its pending state synchronously on Send. These timings measure client events. Display-frame timing and physical-device network performance were outside this run.
