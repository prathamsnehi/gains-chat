# TestFlight and release gates

1. Export and verify a private MongoDB backup of users, exercises, and logs. Record the counts and manifest hash.
2. Provision CloudKit, Firebase Anonymous Auth, App Check, Firestore, and callable secrets. Verify the EAS source archive includes the local Firebase plist or supply it through a file environment variable.
3. Build and install a development client. Test offline queue order, retry deduplication, correction, backdated sets, similar exercises, CloudKit upload, and recovery.
4. Measure pending feedback, function total, Jev, Gemini, and warm and cold latency separately. Investigate a warm median above two seconds.
5. Release through TestFlight with the existing bundle ID. Import the account on the owner's iPhone; compare count and sample timestamps, exercises, goals, and chat against the backup. Verify iCloud restore.
6. Retire the old user and admin HTTP routes after verification, then publish the in-place App Store update. Keep the recoverable backup until the new release is established.

A remote iOS simulator build compiled successfully. No TestFlight build or production deploy has been performed. Native signing, live data, and service keys are required for those gates.
