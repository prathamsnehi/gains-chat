import Foundation

public enum MessageRouter {
    public static func decide(
        text: String,
        exercises: [KnownExercise],
        lifts: [LiftRecord],
        scores: (String) -> IntentScores
    ) -> Route {
        switch ShorthandParser.parse(text) {
        case .lift(let draft):
            switch ExerciseReconciler.reconcile(draft, with: exercises) {
            case .matched(let exerciseID, let name, let aliases):
                return .log(LogCommand(
                    exerciseID: exerciseID,
                    name: name,
                    aliases: aliases,
                    weight: draft.weight,
                    reps: draft.reps,
                    unit: draft.unit
                ))
            case .created(let name, let aliases):
                return .log(LogCommand(
                    exerciseID: nil,
                    name: name,
                    aliases: aliases,
                    weight: draft.weight,
                    reps: draft.reps,
                    unit: draft.unit
                ))
            case .ambiguous(let names):
                return .clarify("Which exercise did you mean: \(names.joined(separator: ", "))?")
            }
        case .incomplete(let message):
            return .clarify(message)
        case .notALog:
            let intent = scores(text)
            if intent.log > intent.question, intent.log >= 0.6 {
                return .clarify("Send the exercise, weight, and reps.")
            }
            return .question(
                text: text.trimmingCharacters(in: .whitespacesAndNewlines),
                snippets: SnippetSelector.select(text: text, exercises: exercises, lifts: lifts)
            )
        }
    }
}
