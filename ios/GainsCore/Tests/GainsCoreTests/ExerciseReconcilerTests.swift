import Testing
@testable import GainsCore

struct ExerciseReconcilerTests {
    @Test func firstBenchCreatesBarbellAndRemembersTheAlias() {
        guard case .lift(let draft) = ShorthandParser.parse("bp 155 5") else {
            Issue.record("expected a lift")
            return
        }
        let created = ExerciseReconciler.reconcile(draft, with: [])
        guard case .created(let name, let aliases) = created else {
            Issue.record("expected create, got \(created)")
            return
        }
        #expect(name == "Barbell Bench Press")
        #expect(aliases.contains("bp"))

        let existing = KnownExercise(id: "ex-1", name: name, aliases: aliases)
        guard case .lift(let again) = ShorthandParser.parse("bp 135 3") else {
            Issue.record("expected a lift")
            return
        }
        let matched = ExerciseReconciler.reconcile(again, with: [existing])
        guard case .matched(let id, let matchedName, _) = matched else {
            Issue.record("expected match, got \(matched)")
            return
        }
        #expect(id == "ex-1")
        #expect(matchedName == "Barbell Bench Press")
    }

    @Test func dumbbellBenchDoesNotAttachToBarbell() {
        let barbell = KnownExercise(id: "bar", name: "Barbell Bench Press", aliases: ["bp"])
        guard case .lift(let draft) = ShorthandParser.parse("db bp 50 8") else {
            Issue.record("expected a lift")
            return
        }
        let result = ExerciseReconciler.reconcile(draft, with: [barbell])
        guard case .created(let name, _) = result else {
            Issue.record("expected a new dumbbell exercise, got \(result)")
            return
        }
        #expect(name == "Dumbbell Bench Press")
    }

    @Test func plainBenchDoesNotAttachToDumbbell() {
        let dumbbell = KnownExercise(id: "db", name: "Dumbbell Bench Press", aliases: ["db bp"])
        guard case .lift(let draft) = ShorthandParser.parse("bp 155 5") else {
            Issue.record("expected a lift")
            return
        }
        let result = ExerciseReconciler.reconcile(draft, with: [dumbbell])
        guard case .created(let name, _) = result else {
            Issue.record("expected a new barbell exercise, got \(result)")
            return
        }
        #expect(name == "Barbell Bench Press")
    }
}
