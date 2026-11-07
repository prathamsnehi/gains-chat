import Foundation

struct ExercisePhrase: Equatable, Sendable {
    var canonicalName: String
    var shorthand: String
    var equipment: Equipment
    var modifiers: [String]
}

enum ExercisePhraseBuilder {
    private static let fillers: Set<String> = [
        "for", "of", "the", "a", "an", "was", "did", "on", "my", "i",
        "what", "how", "why", "when", "where", "who", "last", "weight",
        "should", "can", "could", "would", "is", "are", "do", "does",
        "tell", "about", "give", "me", "next", "time", "recent", "best",
    ]
    private static let modifiers: Set<String> = [
        "incline", "decline", "flat", "seated", "sumo", "front", "romanian",
        "close-grip", "hammer", "goblet", "ez-bar", "trap-bar", "stiff-leg",
        "bulgarian", "deficit", "paused", "pin", "landmine", "reverse",
    ]
    private static let classic: Set<String> = [
        "bench", "press", "squat", "deadlift", "row", "overhead", "curl",
    ]
    private static let specializing: Set<String> = [
        "romanian", "sumo", "front", "hammer", "goblet", "ez-bar", "trap-bar",
        "stiff-leg", "bulgarian", "landmine",
    ]
    private static let knownMovements: Set<String> = [
        "bp", "ohp", "rdl", "sldl", "dl", "sq", "cgbp", "pu", "pullup", "chinup",
        "bench", "press", "squat", "deadlift", "row", "curl", "overhead",
        "dip", "fly", "raise", "extension", "pulldown", "pushdown", "clean",
        "snatch", "jerk", "thrust", "lunge", "shrug", "swing", "carry",
        "pull-up", "chin-up", "push-up", "sit-up", "kettlebell",
    ]

    static func phrase(from tokens: [String]) -> ExercisePhrase? {
        let normalized = normalize(tokens)
        var equipment = Equipment.unspecified
        var modifierWords: [String] = []
        var movement: [String] = []

        var index = 0
        while index < normalized.count {
            let token = normalized[index]
            if fillers.contains(token) || token.count < 2 {
                index += 1
                continue
            }
            if token == "close", index + 1 < normalized.count, normalized[index + 1] == "grip" {
                modifierWords.append("close-grip")
                index += 2
                continue
            }
            if token == "ez", index + 1 < normalized.count, normalized[index + 1] == "bar" {
                modifierWords.append("ez-bar")
                index += 2
                continue
            }
            if (token == "trap" || token == "hex"), index + 1 < normalized.count, normalized[index + 1] == "bar" {
                modifierWords.append("trap-bar")
                index += 2
                continue
            }
            if token == "stiff", index + 1 < normalized.count, normalized[index + 1] == "leg" {
                modifierWords.append("stiff-leg")
                index += 2
                continue
            }
            if let namedEquipment = equipmentToken(token) {
                equipment = namedEquipment
                index += 1
                continue
            }
            if modifiers.contains(token) {
                modifierWords.append(token)
                index += 1
                continue
            }
            if let expansion = expansions[token] {
                movement.append(contentsOf: expansion)
                index += 1
                continue
            }
            if token.allSatisfy({ $0.isLetter || $0 == "-" }) {
                movement.append(token)
            }
            index += 1
        }

        movement = rewrite(movement, modifiers: modifierWords)
        let uniqueMovement = deduped(movement)
        guard !uniqueMovement.isEmpty else { return nil }

        if equipment == .unspecified, modifierWords.contains("hammer") {
            equipment = .dumbbell
        }
        if equipment == .unspecified, shouldDefaultToBarbell(uniqueMovement, modifiers: modifierWords) {
            equipment = .barbell
        }

        let recordedModifiers = deduped(modifierWords + uniqueMovement.filter { modifiers.contains($0) || specializing.contains($0) })
        let name = displayName(modifiers: recordedModifiers, equipment: equipment, movement: uniqueMovement.filter { !recordedModifiers.contains($0) })
        let shorthand = normalized.filter { !fillers.contains($0) && $0.count > 1 }.joined(separator: " ")
        return ExercisePhrase(
            canonicalName: name,
            shorthand: shorthand,
            equipment: equipment,
            modifiers: recordedModifiers
        )
    }

    static func containsKnownMovement(_ tokens: [String]) -> Bool {
        normalize(tokens).contains { knownMovements.contains($0) }
    }

    static func tokens(in text: String) -> [String] {
        text.lowercased()
            .split { !$0.isLetter }
            .map(String.init)
    }

    private static func normalize(_ tokens: [String]) -> [String] {
        tokens.flatMap { token -> [String] in
            let corrected = typos[token] ?? token
            if let parts = glued[corrected] {
                return parts
            }
            return [plurals[corrected] ?? corrected]
        }
    }

    private static func rewrite(_ movement: [String], modifiers: [String]) -> [String] {
        var words = movement
        if words.contains("curl") {
            words.removeAll { $0 == "bicep" || $0 == "biceps" }
        }
        words = words.map { $0 == "tricep" ? "triceps" : $0 }
        if words.contains("bench"), !words.contains("press") {
            words.append("press")
        }
        let angled = modifiers.contains("incline") || modifiers.contains("decline") || modifiers.contains("flat")
        if words == ["press"] {
            words = angled ? ["bench", "press"] : ["overhead", "press"]
        }
        let overheadName = words.contains("shoulder") || words.contains("military") || words.contains("strict")
        if words.contains("press"), overheadName {
            words.removeAll { $0 == "shoulder" || $0 == "military" || $0 == "strict" || $0 == "press" }
            words.append(contentsOf: ["overhead", "press"])
        }
        return words
    }

    private static func equipmentToken(_ token: String) -> Equipment? {
        switch token {
        case "db", "dumbbell", "dumbbells":
            .dumbbell
        case "bb", "barbell":
            .barbell
        case "cable", "cables":
            .cable
        case "machine", "smith":
            .machine
        default:
            nil
        }
    }

    private static let expansions: [String: [String]] = [
        "bp": ["bench", "press"],
        "ohp": ["overhead", "press"],
        "rdl": ["romanian", "deadlift"],
        "sldl": ["stiff-leg", "deadlift"],
        "dl": ["deadlift"],
        "sq": ["squat"],
        "cgbp": ["close-grip", "bench", "press"],
        "pu": ["pull-up"],
        "pullup": ["pull-up"],
        "chinup": ["chin-up"],
        "kb": ["kettlebell"],
    ]

    private static let typos: [String: String] = [
        "batbell": "barbell",
        "barbel": "barbell",
        "barble": "barbell",
        "dumbell": "dumbbell",
        "dumbel": "dumbbell",
        "dumbells": "dumbbells",
        "shoudler": "shoulder",
        "shoulders": "shoulder",
        "extention": "extension",
        "extentions": "extension",
        "pulldwn": "pulldown",
    ]

    private static let glued: [String: [String]] = [
        "benchpress": ["bench", "press"],
        "deadlift": ["deadlift"],
        "pushup": ["push-up"],
        "pullup": ["pull-up"],
        "chinup": ["chin-up"],
        "situp": ["sit-up"],
        "cgbp": ["close", "grip", "bench", "press"],
    ]

    private static let plurals: [String: String] = [
        "rows": "row",
        "curls": "curl",
        "presses": "press",
        "squats": "squat",
        "deadlifts": "deadlift",
        "pushdowns": "pushdown",
        "pulldowns": "pulldown",
        "raises": "raise",
        "extensions": "extension",
        "flys": "fly",
        "flies": "fly",
        "flyes": "fly",
        "dips": "dip",
        "shrugs": "shrug",
        "lunges": "lunge",
        "thrusts": "thrust",
        "cleans": "clean",
        "snatches": "snatch",
        "jerks": "jerk",
        "swings": "swing",
        "carries": "carry",
        "crunches": "crunch",
        "situps": "sit-up",
        "pullups": "pull-up",
        "chinups": "chin-up",
        "rdls": "rdl",
    ]

    private static func shouldDefaultToBarbell(_ movement: [String], modifiers: [String]) -> Bool {
        let words = Set(movement)
        guard !words.isEmpty, words.isSubset(of: classic) else { return false }
        let marks = Set(modifiers)
        return marks.isDisjoint(with: specializing)
    }

    private static func displayName(modifiers: [String], equipment: Equipment, movement: [String]) -> String {
        var parts = modifiers.map(title)
        switch equipment {
        case .barbell:
            parts.append("Barbell")
        case .dumbbell:
            parts.append("Dumbbell")
        case .cable:
            parts.append("Cable")
        case .machine:
            parts.append("Machine")
        case .unspecified:
            break
        }
        parts.append(contentsOf: movement.map(title))
        return parts.joined(separator: " ")
    }

    private static func title(_ word: String) -> String {
        if word == "ez-bar" { return "EZ-Bar" }
        return word.split(separator: "-").map { part -> String in
            guard let first = part.first else { return String(part) }
            return first.uppercased() + part.dropFirst()
        }.joined(separator: "-")
    }

    private static func deduped(_ words: [String]) -> [String] {
        var seen: Set<String> = []
        return words.filter { seen.insert($0).inserted }
    }
}
