# Local and cloud data

Two Core Data configurations share one container.

- `Cloud` holds `Exercise` and `Lift` and syncs to `iCloud.com.blackmaskexe.gainschat`.
- `Local` holds `ChatLine` and never syncs.

An exercise has a stable id, a canonical name, and aliases such as `bp` or `mid back row`. A lift has a stable id, exercise id, display name, weight, reps, unit, and performed time. Reps can be a half, such as 6.5. Bare weights are pounds. An explicit kilogram stays kilograms. Estimated one-rep max is `weight × (1 + reps / 30)`.

There is no preloaded exercise list. The shorthand parser expands familiar language (`bp`, `close grip bench`, `incline dumbbell press`, `bicep curls`) and then matches the user's own exercises. A name it has never seen, such as `mid back row`, is created from those words. `bp` does not attach to a dumbbell variation, and `close grip bench` does not attach to a plain bench press. Two equally good matches ask once and do not save.

On first launch the app reads an older `GainsLocalStore/Cloud.sqlite` if it is still on the phone. `LegacyImporter` keeps lift, exercise, and alias rows and ignores goals. New writes use the new entities only.

A local save does not prove the CloudKit export finished. The Chat toolbar shows the iCloud account status.
