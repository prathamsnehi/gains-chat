# Development

Open `ios/GainsChat.xcodeproj` in Xcode 16 or later. The deployment target is iOS 16.4. The app target depends on the local package `ios/GainsCore` and on Firebase Apple SDK 11 for App Check.

Add `ios/GainsChat/GoogleService-Info.plist` from the Firebase project `gains-chat` to the GainsChat target. It is gitignored. Logging works without it. Questions do not, because App Check cannot start.

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
node --test hosting/functions/chatCore.test.js
```

GitHub Actions runs those two checks on Linux. A separate job on a Mac builds `ios/GainsChat.xcodeproj` for the iOS Simulator with signing turned off, and runs `swift test` with the Xcode toolchain. That job does not archive or sign for a device. A signed archive still needs the team certificate on a Mac.

Set the chat key before a deploy. Do not commit it and do not paste it into chat:

```sh
firebase functions:secrets:set TOKENROUTER_API_KEY
firebase deploy --only functions,hosting
```

The default TokenRouter model is `openai/gpt-5-mini`. Change it with the `TOKENROUTER_MODEL` parameter if the credit balance is for a different model.
