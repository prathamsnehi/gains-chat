# Release

This repository builds the native app and the Hosting function. A release is still an operator step. Do not treat a green `swift test` run as a signed-device acceptance.

## Archive

Archive `ios/GainsChat.xcodeproj` with team `T296YJXC87`. Confirm the archive bundle is `com.blackmaskexe.gainschat`, the deployment target is 16.4, the CloudKit container is `iCloud.com.blackmaskexe.gainschat`, and App Attest is the production environment. The installed app should stay under 200 MB. `IntentRouter.mlmodel` is a few kilobytes. Firebase is linked for App Check only.

On a signed iPhone, log `bp 155 5` in airplane mode and confirm the set appears in History and Progress without a network call. Ask "what was the last weight I did on bp" and confirm the reply uses that set. Confirm `incline db bp 55 7 reps` does not attach to the barbell exercise.

## CloudKit

Deploy the development schema before a TestFlight build if the new `Exercise` and `Lift` record types are not already in the production container. Existing `CloudRecord` rows on a phone that already has the previous build are imported once. A reinstall does not replay that SQLite file.

## Hosting

```sh
firebase functions:secrets:set TOKENROUTER_API_KEY
firebase deploy --only functions,hosting
```

After deploy, `GET /privacy-policy` on the Hosting site returns the preserved policy and `HEAD /privacy-policy` returns an empty body. `POST /chat` without an App Check token is rejected. The previous Cloud Functions `api` URL is not updated by this repository. Point the App Store privacy link at the Hosting `/privacy-policy` URL when you deploy.

Do not delete the TokenRouter secret from the Firebase project as part of a code change.
