import Foundation
import Testing
@testable import GainsCore

struct SeriesSummaryTests {
    @Test func aRangeReportsAverageAndChangeFromTheFirstValue() {
        let summary = SeriesSummary.make(values: [
            SeriesValue(date: date(1), value: 100),
            SeriesValue(date: date(2), value: 110),
            SeriesValue(date: date(3), value: 106),
        ])
        #expect(summary?.count == 3)
        #expect(summary?.latest == 106)
        #expect(summary?.average == 316.0 / 3)
        #expect(summary?.difference == 6)
        #expect(summary?.changeSentence(unitLabel: "lb", comparedWith: "the first set in this range")?.hasPrefix("Up ") == true)
    }

    @Test func oneValueHasNoComparisonSentence() {
        let summary = SeriesSummary.make(values: [SeriesValue(date: date(1), value: 180)])
        #expect(summary?.difference == 0)
        #expect(summary?.changeSentence(unitLabel: "lb", comparedWith: "the first set in this range") == nil)
    }

    @Test func aLoggedSetComparesWithThePreviousEstimate() {
        let same = RecordComparison.sentence(estimate: 180, previous: 180, unitLabel: "lb")
        #expect(same?.contains("same as the previous top set") == true)
        let higher = RecordComparison.sentence(estimate: 186, previous: 180, unitLabel: "lb")
        #expect(higher?.contains("up ") == true)
        let first = RecordComparison.sentence(estimate: 180, previous: nil, unitLabel: "lb")
        #expect(first == "Estimated 1RM 180 lb.")
    }

    private func date(_ day: TimeInterval) -> Date {
        Date(timeIntervalSince1970: day * 86_400)
    }
}
