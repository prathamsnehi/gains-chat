import Foundation
import Testing
@testable import GainsCore

struct TopSetTests {
    @Test func bareLoadsUseThePreferenceAndExplicitUnitsWin() {
        for (text, expected) in [("bp 100 5", WeightUnit.kg), ("bp 100 lbs 5", .lb), ("bp 100 kilograms 5", .kg)] {
            guard case .lift(let draft) = ShorthandParser.parse(text, defaultUnit: .kg) else {
                Issue.record("Unrecognized set"); continue
            }
            #expect(draft.unit == expected)
        }
    }

    @Test func changingFormulaOrUnitRecomputesFromTheOriginalSnapshot() {
        let set = LiftRecord(id: "a", exerciseID: "pull", exerciseName: "Pull-up", weight: -20,
                             reps: 8, unit: .kg, performedAt: .now, bodyweightSnapshot: 80)
        #expect(set.estimate(unit: .kg, formula: .epley) == 76)
        #expect(set.estimate(unit: .kg, formula: .brzycki) == 2160.0 / 29)
        #expect(abs((set.estimate(unit: .lb, formula: .epley) ?? 0) - 76 * 2.2046226218) < 1e-7)
        #expect(set.unit == .kg && set.weight == -20 && set.bodyweightSnapshot == 80)
        #expect(MaxFormula.brzycki.estimate(load: 60, reps: 37) == nil)
        #expect(MaxFormula.epley.estimate(load: .infinity, reps: 5) == nil)
    }

    @Test func multipleCandidatesDoNotProduceALog() {
        #expect(ShorthandParser.parse("benched 185 for 8, 7, then 6") == .incomplete("Send one set at a time so I can log it."))
    }
}
