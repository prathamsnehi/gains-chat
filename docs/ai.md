# Logging and questions

Logging does not call the network.

`bp 155 5` is Barbell Bench Press, 155 lb, 5 reps. Leaving out `db` means barbell for bench, squat, deadlift, row, and press. `incline db bp 55 7 reps` is Incline Dumbbell Bench Press, 55 lb, 7 reps. `225 x 5` is weight then reps. A missing weight or rep count asks for the missing part on the phone.

The Core ML file is a 256-bucket character trigram classifier trained by `ios/train_intent.py`. It is a few kilobytes. The same weights ship in `IntentWeights.swift` so the router can be tested without Core ML. The app prefers the compiled model and uses those weights if the model cannot be loaded. The model does not choose an exercise id, because exercises are created at runtime.

A question such as "what was the last weight I did on bp" sends the matching local lifts to `https://gains-chat.web.app/chat`. The iOS app links Firebase only for App Check. Release builds use App Attest. Debug builds use the App Check debug provider. The token goes in `X-Firebase-AppCheck`.

The function calls `https://api.tokenrouter.com/v1/chat/completions`. That is TokenRouter, not OpenRouter. The model id defaults to `openai/gpt-5-mini` and is the Firebase parameter `TOKENROUTER_MODEL`. The key is the Firebase secret `TOKENROUTER_API_KEY`. The prompt may only use the supplied records, says when none match, and must not claim a set was logged.
