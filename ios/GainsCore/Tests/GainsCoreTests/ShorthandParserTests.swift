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

    @Test func benchForRepsUsesTheWordFor() {
        guard case .lift(let draft) = ShorthandParser.parse("Bench 225 for 5") else {
            Issue.record("expected a lift")
            return
        }
        #expect(draft.canonicalName == "Barbell Bench Press")
        #expect(draft.weight == 225)
        #expect(draft.reps == 5)
    }

    @Test func closeGripBenchStaysDistinctFromBench() {
        guard case .lift(let draft) = ShorthandParser.parse("Close grip bench 135 7 reps") else {
            Issue.record("expected a lift")
            return
        }
        #expect(draft.canonicalName == "Close-Grip Barbell Bench Press")
        #expect(draft.weight == 135)
        #expect(draft.reps == 7)
        #expect(draft.modifiers == ["close-grip"])
    }

    @Test func halfRepsAndAGluedPoundMarkStayExact() {
        guard case .lift(let draft) = ShorthandParser.parse("Bicep curls 32.5s 6.5 reps") else {
            Issue.record("expected a lift")
            return
        }
        #expect(draft.canonicalName == "Barbell Curl")
        #expect(draft.weight == 32.5)
        #expect(draft.reps == 6.5)
        #expect(draft.unit == .lb)
    }

    @Test func pushdownsKeepTheUsersName() {
        guard case .lift(let draft) = ShorthandParser.parse("Tricep pushdowns 17.5 7.5 reps") else {
            Issue.record("expected a lift")
            return
        }
        #expect(draft.canonicalName == "Triceps Pushdown")
        #expect(draft.weight == 17.5)
        #expect(draft.reps == 7.5)
        #expect(draft.equipment == .unspecified)
    }

    @Test func aTypoAndGluedTimesNotationStillLogs() {
        guard case .lift(let draft) = ShorthandParser.parse("Batbell row 110x7") else {
            Issue.record("expected a lift")
            return
        }
        #expect(draft.canonicalName == "Barbell Row")
        #expect(draft.weight == 110)
        #expect(draft.reps == 7)
    }

    @Test func anInventedExerciseKeepsItsOwnName() {
        guard case .lift(let draft) = ShorthandParser.parse("Mid back rows 110 8 reps") else {
            Issue.record("expected a lift")
            return
        }
        #expect(draft.canonicalName == "Mid Back Row")
        #expect(draft.shorthand == "mid back row")
        #expect(draft.equipment == .unspecified)
        #expect(draft.weight == 110)
        #expect(draft.reps == 8)
    }

    @Test func inclineDumbbellPressMeansBench() {
        guard case .lift(let draft) = ShorthandParser.parse("Incline dumbbell press 55s 6 reps") else {
            Issue.record("expected a lift")
            return
        }
        #expect(draft.canonicalName == "Incline Dumbbell Bench Press")
        #expect(draft.weight == 55)
        #expect(draft.reps == 6)
    }

    @Test func poundsCanBeWrittenAgainstTheWeight() {
        guard case .lift(let draft) = ShorthandParser.parse("Close grip bench press, 145lbs 6 reps") else {
            Issue.record("expected a lift")
            return
        }
        #expect(draft.canonicalName == "Close-Grip Barbell Bench Press")
        #expect(draft.weight == 145)
        #expect(draft.reps == 6)
        #expect(draft.unit == .lb)
    }
}
