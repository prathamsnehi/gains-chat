import Foundation

public enum ExerciseReconciler {
    public static func reconcile(_ draft: LiftDraft, with exercises: [KnownExercise]) -> Reconciliation {
        let aliases = proposedAliases(for: draft)
        let candidates = exercises.compactMap { exercise -> (KnownExercise, Double)? in
            guard compatible(draft, with: exercise) else { return nil }
            let score = matchScore(draft, aliases: aliases, exercise: exercise)
            guard score >= 0.6 else { return nil }
            return (exercise, score)
        }
        .sorted { $0.1 > $1.1 }

        guard let best = candidates.first else {
            return .created(name: draft.canonicalName, aliases: aliases)
        }
        let close = candidates.filter { best.1 - $0.1 < 0.15 }
        if close.count > 1 {
            return .ambiguous(close.map { $0.0.name })
        }
        let merged = merge(aliases, into: best.0.aliases)
        return .matched(exerciseID: best.0.id, name: best.0.name, aliases: merged)
    }

    private static func proposedAliases(for draft: LiftDraft) -> [String] {
        var values = [draft.shorthand, draft.canonicalName.lowercased()]
        values = values.map { normalize($0) }.filter { !$0.isEmpty }
        var seen: Set<String> = []
        return values.filter { seen.insert($0).inserted }
    }

    private static func compatible(_ draft: LiftDraft, with exercise: KnownExercise) -> Bool {
        let haystack = ([exercise.name] + exercise.aliases).map(normalize).joined(separator: " ")
        let tokens = Set(haystack.split(separator: " ").map(String.init))
        let looksDumbbell = tokens.contains("dumbbell") || tokens.contains("db") || haystack.contains("dumbbell")
        switch draft.equipment {
        case .dumbbell:
            guard looksDumbbell else { return false }
        case .barbell:
            guard !looksDumbbell else { return false }
        case .cable:
            guard tokens.contains("cable") else { return false }
        case .machine:
            guard tokens.contains("machine") || tokens.contains("smith") else { return false }
        case .unspecified:
            break
        }
        let draftModifiers = Set(draft.modifiers)
        let nameModifiers = modifiers(in: haystack)
        return draftModifiers == nameModifiers
    }

    private static func modifiers(in text: String) -> Set<String> {
        let tokens = Set(text.split(separator: " ").map(String.init))
        let known: Set<String> = ["incline", "decline", "flat", "seated", "sumo", "front", "romanian", "close-grip"]
        return tokens.intersection(known)
    }

    private static func matchScore(_ draft: LiftDraft, aliases proposed: [String], exercise: KnownExercise) -> Double {
        let known = ([normalize(exercise.name)] + exercise.aliases.map(normalize))
        if known.contains(where: { proposed.contains($0) }) {
            return 1
        }
        let left = Set(normalize(draft.canonicalName).split(separator: " ").map(String.init))
        let right = Set(normalize(exercise.name).split(separator: " ").map(String.init))
        guard !left.isEmpty, !right.isEmpty else { return 0 }
        let intersection = left.intersection(right).count
        let union = left.union(right).count
        return Double(intersection) / Double(union)
    }

    private static func merge(_ incoming: [String], into existing: [String]) -> [String] {
        var seen = Set(existing.map(normalize))
        var result = existing
        for alias in incoming where seen.insert(normalize(alias)).inserted {
            result.append(alias)
        }
        return result
    }

    private static func normalize(_ value: String) -> String {
        value.lowercased()
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
    }
}
