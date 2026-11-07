# Architecture

The iPhone owns workout records. `ios/GainsChat` stores exercises and lifts in Core Data and mirrors them with `NSPersistentCloudKitContainer` to the private database `iCloud.com.blackmaskexe.gainschat`. Chat lines live in a second, local store so sending a message does not wait on iCloud.

Three tabs: Chat, History, and Progress. There is no Goals tab and no Settings tab. iCloud status is the toolbar button on Chat.

A log is parsed and saved before any network call. The Core ML model `IntentRouter` only decides whether the text is a log or a question. A message that already contains an exercise, a weight, and a rep count is a log even if the model disagrees. Questions call Hosting `/chat` with an App Check token and the lifts the phone already selected. The function asks TokenRouter to phrase an answer from those records. It does not write CloudKit.

```text
composer → on-device router
  log → CloudKit + instant confirmation
  question → local snippets → Hosting /chat → TokenRouter
```

Firebase is Hosting plus one function. The project is `gains-chat`. `firebase.json` points `functions.source` at `hosting/functions` and `hosting.public` at `hosting/public`. The privacy policy is the static file `hosting/public/privacy-policy.html`, served at `/privacy-policy`.
