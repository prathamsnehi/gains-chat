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
    private static let modifiers: Set<String> = ["incline", "decline", "flat", "seated", "sumo", "front", "romanian", "close"]
    private static let barbellFamily: Set<String> = ["bench", "press", "squat", "deadlift", "row", "overhead"]
    private static let specializing: Set<String> = ["romanian", "sumo", "front"]

    static func phrase(from tokens: [String]) -> ExercisePhrase? {
        var equipment = Equipment.unspecified
        var modifierWords: [String] = []
        var movement: [String] = []

        var index = 0
        while index < tokens.count {
            let token = tokens[index]
            if fillers.contains(token) {
                index += 1
                continue
            }
            if token == "close", index + 1 < tokens.count, tokens[index + 1] == "grip" {
                modifierWords.append("close-grip")
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
            if token.allSatisfy(\.isLetter) {
                movement.append(token)
            }
            index += 1
        }

        if movement.contains("bench"), !movement.contains("press") {
            movement.append("press")
        }
        if movement == ["press"] {
            movement = ["overhead", "press"]
        }

        let uniqueMovement = deduped(movement)
        guard !uniqueMovement.isEmpty else { return nil }

        if equipment == .unspecified, shouldDefaultToBarbell(uniqueMovement) {
            equipment = .barbell
        }

        let name = displayName(modifiers: modifierWords, equipment: equipment, movement: uniqueMovement)
        let shorthand = tokens.filter { !fillers.contains($0) }.joined(separator: " ")
        return ExercisePhrase(
            canonicalName: name,
            shorthand: shorthand,
            equipment: equipment,
            modifiers: modifierWords
        )
    }

    static func containsKnownMovement(_ tokens: [String]) -> Bool {
        let known: Set<String> = [
            "bp", "ohp", "rdl", "dl", "sq", "pu", "pullup", "chinup",
            "bench", "press", "squat", "deadlift", "row", "curl", "overhead",
            "dip", "fly", "raise", "extension", "pulldown",
        ]
        return tokens.contains { known.contains($0) }
    }

    static func tokens(in text: String) -> [String] {
        text.lowercased()
            .split { !$0.isLetter }
            .map(String.init)
    }

    private static func equipmentToken(_ token: String) -> Equipment? {
        switch token {
        case "db", "dumbbell", "dumbbells":
            .dumbbell
        case "bb", "barbell":
            .barbell
        case "cable":
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
        "dl": ["deadlift"],
        "sq": ["squat"],
        "pu": ["pull-up"],
        "pullup": ["pull-up"],
        "chinup": ["chin-up"],
    ]

    private static func shouldDefaultToBarbell(_ movement: [String]) -> Bool {
        let words = Set(movement)
        guard !words.isDisjoint(with: barbellFamily) else { return false }
        return words.isDisjoint(with: specializing)
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
        guard let first = word.first else { return word }
        return first.uppercased() + word.dropFirst()
    }

    private static func deduped(_ words: [String]) -> [String] {
        var seen: Set<String> = []
        return words.filter { seen.insert($0).inserted }
    }
}
