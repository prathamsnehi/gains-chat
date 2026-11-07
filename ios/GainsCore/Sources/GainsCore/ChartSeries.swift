import Foundation

public enum ChartSeries {
    public static func points(for exerciseID: String, lifts: [LiftRecord]) -> [ChartPoint] {
        let history = lifts.filter { $0.exerciseID == exerciseID }.sorted { $0.performedAt < $1.performedAt }
        guard let latest = history.last else { return [] }
        return history.map { lift in
            let weight = OneRepMax.convert(lift.weight, from: lift.unit, to: latest.unit)
            return ChartPoint(
                id: lift.id,
                performedAt: lift.performedAt,
                estimatedOneRepMax: OneRepMax.estimate(weight: weight, reps: lift.reps),
                unit: latest.unit
            )
        }
    }
}
