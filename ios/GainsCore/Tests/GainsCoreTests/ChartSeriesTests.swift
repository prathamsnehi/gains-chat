import Foundation
import Testing
@testable import GainsCore

struct ChartSeriesTests {
    @Test func estimatedOneRepMaxUsesTheEpleyFormula() {
        let lifts = [
            LiftRecord(id: "1", exerciseID: "bench", exerciseName: "Barbell Bench Press", weight: 150, reps: 5, unit: .lb, performedAt: date(1)),
            LiftRecord(id: "2", exerciseID: "bench", exerciseName: "Barbell Bench Press", weight: 60, reps: 3, unit: .kg, performedAt: date(2)),
        ]
        let points = ChartSeries.points(for: "bench", lifts: lifts)
        #expect(points.count == 2)
        #expect(points[0].unit == .kg)
        #expect(abs(points[1].estimatedOneRepMax - (60 * (1 + 3.0 / 30))) < 0.001)
        let poundsAsKilos = OneRepMax.convert(150, from: .lb, to: .kg)
        #expect(abs(points[0].estimatedOneRepMax - OneRepMax.estimate(weight: poundsAsKilos, reps: 5)) < 0.001)
    }

    private func date(_ day: TimeInterval) -> Date {
        Date(timeIntervalSince1970: day * 86_400)
    }
}
