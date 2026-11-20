import Foundation

public enum SnippetSelector {
    public static func select(text: String, exercises: [KnownExercise], lifts: [LiftRecord]) -> [LiftSnippet] {
        let pool = matchingLifts(text: text, exercises: exercises, lifts: lifts)
        let recent = pool.sorted { $0.performedAt > $1.performedAt }.prefix(8)
        return recent.map(LiftSnippet.init)
    }

    private static func matchingLifts(text: String, exercises: [KnownExercise], lifts: [LiftRecord]) -> [LiftRecord] {
        if let mentioned = ShorthandParser.mentionedPhrase(in: text) {
            let draft = LiftDraft(
                canonicalName: mentioned.name,
                shorthand: mentioned.shorthand,
                weight: 1,
                reps: 1,
                unit: .lb,
                equipment: mentioned.equipment,
                modifiers: mentioned.modifiers
            )
            switch ExerciseReconciler.reconcile(draft, with: exercises) {
            case .matched(let exerciseID, _, _):
                return lifts.filter { $0.exerciseID == exerciseID }
            case .created, .ambiguous:
                return []
            }
        }
        let folded = text.lowercased()
        if let exercise = exercises.first(where: { exercise in
            folded.contains(exercise.name.lowercased())
                || exercise.aliases.contains { alias in folded.contains(alias.lowercased()) }
        }) {
            return lifts.filter { $0.exerciseID == exercise.id }
        }
        return lifts
    }
}
