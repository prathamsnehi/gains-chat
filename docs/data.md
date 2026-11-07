# Local and cloud data

The native module has two Core Data configurations. `Cloud` holds lifts, exercises, aliases, and goals and mirrors to `iCloud.com.blackmaskexe.gainschat`. `Local` holds chat and the durable pending queue. Core Data works without network; CloudKit sync runs separately. Settings shows iCloud account and sync phase. A local save does not prove remote sync completed.

Each lift has a stable ID, exercise identity and name, numeric weight and reps, unit, performed timestamp, and an optional request ID. Bare weights are pounds; explicit kilograms remain kilograms. Multiple sets for one exercise are separate records. The latest entry is the displayed last set. PRs use historical maximum weight, reps, and estimated one rep max (`weight × (1 + reps / 30)`).

Built-in exercises live in `frontend/data/catalog.ts`; custom exercises and corrected aliases are mirrored. Similar variations have distinct identities. Today's suggestions use recent weekday and exercise patterns. The conversation feed and queue remain on the phone. Firestore temporarily caches callable responses for retry deduplication, including lift drafts and chat replies, with a 48-hour expiration; it does not hold the durable workout history. TTL deletion is asynchronous. Rate-limit counters also expire.

The native module needs an iOS development build; Expo Go does not include it. The Apple account must have the private CloudKit container capability and a production CloudKit schema before release. Verify restore on another signed-in device or after reinstall.

Pending-message JSON can also contain an immutable `request` and `phase` (`message` or `history`). These are payload fields in the existing LocalRecord entity, so no Core Data model or CloudKit schema change is required. Older unsent items acquire these fields before their next transmission. The client does not silently replace an ID that the server rejects as already used for different input.
