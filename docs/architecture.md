# Architecture

The iPhone owns workout records. `ios/GainsChat` stores exercises and lifts in Core Data and mirrors them with `NSPersistentCloudKitContainer` to the private database `iCloud.com.blackmaskexe.gainschat`. Chat lines live in a second, local store so sending a message does not wait on iCloud.

The app opens to Chat. The top-left navigation button opens a sidebar with Chat, Log, and Settings. Log contains exercise history, progress, and bodyweight. Settings contains the weight unit, the 1RM formula, iCloud status, the online assistant, the exercise library, and delete-all.

Chat keeps a logged set in the transcript as a record: the load, the estimated 1RM, and the change from the previous top set, with Edit and Undo. A question shows the work in progress (`Working…`, then the tool that is running) and the send button becomes Stop. Follow-up choices are rows. Until the online assistant is allowed, the composer says that questions leave the phone, and the first question asks in place rather than with an alert. Sets are still saved before any network call.

An exercise page leads with the estimated 1RM, a sentence for the selected range, the average and the difference, and a chart. Dragging the chart, or adjusting it with VoiceOver, names one point. History under the chart is a month ledger. A field at the bottom asks about that lift and opens Chat with the exercise name already in the question. The exercise index shows the latest load and whether the estimated 1RM moved.

Bodyweight is a page of readings, reached from Log and from Settings. Each save keeps the current value and appends a sample. Factored lifts still snapshot the current value into the set.

A log is parsed and saved before any network call. The Core ML model `IntentRouter` only decides whether the text is a log or a question. A message that already contains an exercise, a weight, and a rep count is a log even if the model disagrees. Questions call Hosting `/chat` with an App Check token and the lifts the phone already selected. The function asks TokenRouter to phrase an answer from those records. It does not write CloudKit.

```text
composer → on-device router
  log → CloudKit + instant confirmation
  question → local snippets → Hosting /chat → TokenRouter
```

Firebase is Hosting plus one function. The project is `gains-chat`. `firebase.json` points `functions.source` at `hosting/functions` and `hosting.public` at `hosting/public`. The privacy policy is the static file `hosting/public/privacy-policy.html`, served at `/privacy-policy`.
