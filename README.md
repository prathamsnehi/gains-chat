# Gains Chat

Gains Chat is an iPhone lifting log. Logging stays on the phone. Questions go to TokenRouter through Firebase Hosting, protected by App Check.

- `ios/`: the SwiftUI app and the `GainsCore` package. Open `ios/GainsChat.xcodeproj`.
- `hosting/`: the Firebase Hosting site and the `chat` function.
- `docs/`: architecture, data, the on-device router, development, and release.

The app is iOS 16.4 or later. There is no exercise catalog. The first time you log `bp 155 5`, the phone creates Barbell Bench Press and remembers `bp`. `incline db bp 55 7 reps` is a separate Incline Dumbbell Bench Press. Pounds are the default.

Workouts sync through the private CloudKit container `iCloud.com.blackmaskexe.gainschat`. Chat text stays on the phone. The bundle identifier is `com.blackmaskexe.gainschat`.
