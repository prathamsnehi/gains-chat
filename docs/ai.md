# Logging and questions

Logging does not call the network.

`bp 155 5` is Barbell Bench Press, 155 lb, 5 reps. Leaving out `db` means barbell for bench, squat, deadlift, row, overhead press, and curl. `incline dumbbell press 55s 6 reps` is Incline Dumbbell Bench Press, 55 lb, 6 reps. `close grip bench 135 7 reps` is its own Close-Grip Barbell Bench Press. `bicep curls 32.5s 6.5 reps` keeps the half rep. `mid back row 110 8` is not looked up in a catalog: the phone names it Mid Back Row and remembers that spelling. The next `mid back rows` hits the same exercise. A name the lexicon has never seen still becomes an exercise, as long as the line has a weight and a rep count.

The Core ML file is a 256-bucket character trigram classifier trained by `ios/train_intent.py`. It is a few kilobytes. The same weights ship in `IntentWeights.swift` so the router can be tested without Core ML. The app prefers the compiled model and uses those weights if the model cannot be loaded. The model only answers log versus question. It is trained on shorthand, full names, typos, and invented names so the shape of a log is familiar, and it never has to know which exercises exist on the phone.

A question such as "what was the last weight I did on bp" sends the matching local lifts to `https://gains-chat.web.app/chat`. The iOS app links Firebase only for App Check. Release builds use App Attest. Debug builds use the App Check debug provider. The token goes in `X-Firebase-AppCheck`.

The function calls `https://api.tokenrouter.com/v1/chat/completions`. That is TokenRouter, not OpenRouter. The model id defaults to `openai/gpt-5-mini` and is the Firebase parameter `TOKENROUTER_MODEL`. The key is the Firebase secret `TOKENROUTER_API_KEY`. The prompt may only use the supplied records, says when none match, and must not claim a set was logged.
