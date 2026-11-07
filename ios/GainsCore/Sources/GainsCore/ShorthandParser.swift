import Foundation

public enum ShorthandParser {
    public static func parse(_ text: String) -> ParseResult {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return .notALog }

        let numbers = extractNumbers(trimmed)
        let exerciseTokens = exerciseTokens(in: trimmed)
        let phrase = ExercisePhraseBuilder.phrase(from: exerciseTokens)

        if assign(numbers) == nil, isQuestion(trimmed) {
            return .notALog
        }

        guard let assignment = assign(numbers) else {
            if phrase == nil, numbers.isEmpty {
                return .notALog
            }
            if phrase == nil {
                return .incomplete("Which exercise was that?")
            }
            if numbers.count > 2 {
                return .incomplete("Send one set at a time so I can log it.")
            }
            return .incomplete("Send the weight and reps for that set.")
        }

        guard let phrase else {
            return .incomplete("Which exercise was that?")
        }

        return .lift(
            LiftDraft(
                canonicalName: phrase.canonicalName,
                shorthand: phrase.shorthand,
                weight: assignment.weight,
                reps: assignment.reps,
                unit: assignment.unit,
                equipment: phrase.equipment,
                modifiers: phrase.modifiers
            )
        )
    }

    public static func mentionedPhrase(in text: String) -> (name: String, shorthand: String, equipment: Equipment, modifiers: [String])? {
        let tokens = exerciseTokens(in: text)
        guard let phrase = ExercisePhraseBuilder.phrase(from: tokens), ExercisePhraseBuilder.containsKnownMovement(tokens) else {
            return nil
        }
        return (phrase.canonicalName, phrase.shorthand, phrase.equipment, phrase.modifiers)
    }

    private static func isQuestion(_ text: String) -> Bool {
        if text.contains("?") { return true }
        let first = text.lowercased().split(whereSeparator: { !$0.isLetter }).first.map(String.init) ?? ""
        let openers: Set<String> = ["what", "how", "why", "when", "where", "who", "did", "should", "can", "could", "would", "is", "are", "do", "does"]
        return openers.contains(first)
    }

    private struct Assignment {
        var weight: Double
        var reps: Double
        var unit: WeightUnit
    }

    private struct FoundNumber {
        var value: Double
        var marker: String
    }

    private static func assign(_ numbers: [FoundNumber]) -> Assignment? {
        let meaningful = numbers.filter { $0.marker != "set" }
        guard meaningful.count == 2 else { return nil }
        var weight: FoundNumber?
        var reps: FoundNumber?
        for number in meaningful {
            if isRepMarker(number.marker) {
                reps = number
            } else if isWeightMarker(number.marker) {
                weight = number
            }
        }
        if weight == nil, reps == nil {
            weight = meaningful[0]
            reps = meaningful[1]
        } else if let reps, weight == nil {
            weight = meaningful.first { $0.value != reps.value || $0.marker != reps.marker }
        } else if let weight, reps == nil {
            reps = meaningful.first { $0.value != weight.value || $0.marker != weight.marker }
        }
        guard let weight, let reps, weight.value > 0, reps.value > 0, reps.value <= 1000, weight.value <= 2000 else {
            return nil
        }
        let unit: WeightUnit = isKilogram(weight.marker) || meaningful.contains { isKilogram($0.marker) } ? .kg : .lb
        return Assignment(weight: weight.value, reps: reps.value, unit: unit)
    }

    private static func extractNumbers(_ text: String) -> [FoundNumber] {
        guard let regex = try? NSRegularExpression(pattern: #"(^|[^\d.])(\d+(?:\.\d+)?)"#, options: []) else {
            return []
        }
        let range = NSRange(text.startIndex..., in: text)
        var found: [FoundNumber] = []
        regex.enumerateMatches(in: text, range: range) { match, _, _ in
            guard let match, let numberRange = Range(match.range(at: 2), in: text) else { return }
            let raw = String(text[numberRange])
            guard let value = Double(raw) else { return }
            let tailStart = numberRange.upperBound
            let tail = text[tailStart...]
            let marker = marker(in: tail)
            if marker == "set" { return }
            found.append(FoundNumber(value: value, marker: marker))
        }
        return Array(found.prefix(5))
    }

    private static func marker(in tail: Substring) -> String {
        let pattern = #"^\s*(kgs?|kilograms?|lbs?|pounds?|reps?|sets?|s\b|r\b|x\b|×)"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
            return ""
        }
        let text = String(tail)
        let range = NSRange(text.startIndex..., in: text)
        guard let match = regex.firstMatch(in: text, range: range), let markerRange = Range(match.range(at: 1), in: text) else {
            return ""
        }
        let word = text[markerRange].lowercased()
        if word.hasPrefix("set") { return "set" }
        if word == "x" || word == "×" { return "" }
        if word == "r" || word.hasPrefix("rep") { return "reps" }
        if word.hasPrefix("kg") || word.hasPrefix("kilo") { return "kg" }
        if word == "s" || word.hasPrefix("lb") || word.hasPrefix("pound") { return "lb" }
        return ""
    }

    private static func isRepMarker(_ marker: String) -> Bool {
        marker == "reps" || marker == "x"
    }

    private static func isWeightMarker(_ marker: String) -> Bool {
        marker == "kg" || marker == "lb"
    }

    private static func isKilogram(_ marker: String) -> Bool {
        marker == "kg"
    }

    private static func exerciseTokens(in text: String) -> [String] {
        var stripped = text
        if let regex = try? NSRegularExpression(pattern: #"\d+(?:\.\d+)?"#, options: []) {
            let range = NSRange(stripped.startIndex..., in: stripped)
            stripped = regex.stringByReplacingMatches(in: stripped, range: range, withTemplate: " ")
        }
        let unitWords: Set<String> = ["kg", "kgs", "lb", "lbs", "pound", "pounds", "rep", "reps", "set", "sets", "x"]
        return ExercisePhraseBuilder.tokens(in: stripped).filter { !unitWords.contains($0) }
    }
}
