import Foundation

public enum MessageRouter {
    public static func decide(
        text: String,
        exercises: [KnownExercise],
        lifts: [LiftRecord],
        bodyweight: BodyweightReading? = nil,
        defaultUnit: WeightUnit = .lb,
        scores: (String) -> IntentScores
    ) -> Route {
        switch ShorthandParser.parse(text, defaultUnit: defaultUnit) {
        case .lift(let draft):
            switch ExerciseReconciler.reconcile(draft, with: exercises) {
            case .matched(let exerciseID, let name, let aliases):
                let factors = exercises.first { $0.id == exerciseID }?.factorsBodyweight ?? false
                return logged(
                    draft: draft,
                    exerciseID: exerciseID,
                    name: name,
                    aliases: aliases,
                    factorsBodyweight: factors,
                    bodyweight: bodyweight
                )
            case .created(let name, let aliases):
                return logged(
                    draft: draft,
                    exerciseID: nil,
                    name: name,
                    aliases: aliases,
                    factorsBodyweight: false,
                    bodyweight: bodyweight
                )
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

    private static func logged(
        draft: LiftDraft,
        exerciseID: String?,
        name: String,
        aliases: [String],
        factorsBodyweight: Bool,
        bodyweight: BodyweightReading?
    ) -> Route {
        if factorsBodyweight {
            guard let bodyweight, bodyweight.weight > 0 else {
                return .clarify("Set your bodyweight from Log or Settings before logging that exercise.")
            }
            let snapshot = OneRepMax.convert(bodyweight.weight, from: bodyweight.unit, to: draft.unit)
            guard snapshot + draft.weight > 0 else {
                return .clarify("Assistance can’t be more than your bodyweight.")
            }
            return .log(LogCommand(
                exerciseID: exerciseID,
                name: name,
                aliases: aliases,
                weight: draft.weight,
                reps: draft.reps,
                unit: draft.unit,
                bodyweightSnapshot: snapshot
            ))
        }
        guard draft.weight > 0 else {
            return .clarify("Send a weight above zero for that exercise.")
        }
        return .log(LogCommand(
            exerciseID: exerciseID,
            name: name,
            aliases: aliases,
            weight: draft.weight,
            reps: draft.reps,
            unit: draft.unit
        ))
    }
}
