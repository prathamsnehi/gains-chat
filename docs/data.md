# Local and cloud data

Two Core Data configurations share one container.

- `Cloud` holds `Exercise` and `Lift` and syncs to `iCloud.com.blackmaskexe.gainschat`.
- `Local` holds `ChatLine` and never syncs.

An exercise has a stable id, a canonical name, and aliases such as `bp`. A lift has a stable id, exercise id, display name, weight, reps, unit, and performed time. Bare weights are pounds. An explicit kilogram stays kilograms. Estimated one-rep max is `weight × (1 + reps / 30)`.

There is no preloaded exercise list. The shorthand parser expands language (`bp`, `db`, `ohp`, `rdl`) and then matches the user's own exercises. A new name creates an exercise. `bp` does not attach to a dumbbell variation. Two equally good matches ask once and do not save.

On first launch the app reads an older `GainsLocalStore/Cloud.sqlite` if it is still on the phone. `LegacyImporter` keeps lift, exercise, and alias rows and ignores goals. New writes use the new entities only.

A local save does not prove the CloudKit export finished. The Chat toolbar shows the iCloud account status.
