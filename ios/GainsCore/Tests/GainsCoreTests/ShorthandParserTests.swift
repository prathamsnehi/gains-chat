import Foundation
import Testing
@testable import GainsCore

struct ShorthandParserTests {
    @Test func benchShorthandDefaultsToBarbellPounds() {
        let parsed = ShorthandParser.parse("bp 155 5")
        guard case .lift(let draft) = parsed else {
            Issue.record("expected a lift, got \(parsed)")
            return
        }
        #expect(draft.canonicalName == "Barbell Bench Press")
        #expect(draft.weight == 155)
        #expect(draft.reps == 5)
        #expect(draft.unit == .lb)
        #expect(draft.equipment == .barbell)
    }

    @Test func inclineDumbbellBenchKeepsTheRepMarker() {
        let parsed = ShorthandParser.parse("incline db bp 55 7 reps")
        guard case .lift(let draft) = parsed else {
            Issue.record("expected a lift, got \(parsed)")
            return
        }
        #expect(draft.canonicalName == "Incline Dumbbell Bench Press")
        #expect(draft.shorthand == "incline db bp")
        #expect(draft.weight == 55)
        #expect(draft.reps == 7)
        #expect(draft.unit == .lb)
        #expect(draft.equipment == .dumbbell)
        #expect(draft.modifiers == ["incline"])
    }

    @Test func explicitKilogramsStayKilograms() {
        guard case .lift(let draft) = ShorthandParser.parse("bp 60 kg 5") else {
            Issue.record("expected a lift")
            return
        }
        #expect(draft.unit == .kg)
        #expect(draft.weight == 60)
        #expect(draft.reps == 5)
    }

    @Test func timesNotationIsWeightThenReps() {
        guard case .lift(let draft) = ShorthandParser.parse("squat 225 x 5") else {
            Issue.record("expected a lift")
            return
        }
        #expect(draft.canonicalName == "Barbell Squat")
        #expect(draft.weight == 225)
        #expect(draft.reps == 5)
    }

    @Test func missingRepsAsksLocally() {
        #expect(ShorthandParser.parse("bp 155") == .incomplete("Send the weight and reps for that set."))
    }

    @Test func adviceIsNotALog() {
        #expect(ShorthandParser.parse("how should I progress") == .notALog)
    }
}
