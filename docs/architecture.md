# Architecture

The iPhone owns workout records. The custom Expo module stores lifts, exercises, aliases and goals in Core Data mirrored through NSPersistentCloudKitContainer to the user's private iCloud database. Chat and the pending queue use a separate local Core Data store. The programmatic model and store identities remain unchanged during the dependency migration.

The five file-based Expo Router tabs are Today, History, Progress, Goals and Settings. Root layout initialization gates all routes until local storage opens. Firebase initialization is lazy so local screens and manual logging remain available offline.

A message is saved locally before networking. The durable queue freezes its complete wire request before sending; request IDs always refer to that same payload. After successful processing the queue rereads storage, including messages enqueued while a request was in flight. A failure preserves the current request and phase and stops at the queue head until a later retry.

The Firebase `processMessage` callable requires Auth and App Check. Jev selects intent, exercise and number roles; server code parses numbers from the original message. Gemini generates conversation or answers from phone-supplied history snippets. Only the phone writes the final workout. History follow-up has its own persisted request ID, payload and phase so a restart does not regenerate the follow-up or revert to its first request.

Firestore stores quota counters and temporary idempotency results, not durable workout history. Hourly and daily identity quotas use `messageLimits`; global daily quotas retain `aiRateLimits` and its scheduled cleanup. A failed provider attempt remains charged but its request marker is removed for retry. Completed responses replay without another provider call or charge.

The `api` HTTP function serves self-contained HTML at the existing `/privacy-policy` path and returns HTTP 410 for former routes. Legacy authentication, MongoDB models, exports, JSON restore and migration code are removed. Release instructions explicitly remove the already deployed export callable; deleting source alone does not retire it in production.

Foregrounding refreshes the local snapshot even when the queue is empty. Native CloudKit events currently update sync status internally without emitting JS record-change events, so a remote change arriving while a screen stays active may require refocusing a tab. This is a recorded existing limitation, not a claim of continuously refreshed CloudKit UI.
