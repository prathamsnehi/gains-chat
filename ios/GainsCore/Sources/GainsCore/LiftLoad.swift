import Foundation

public enum LiftLoad {
    public static func effective(weight: Double, snapshot: Double?) -> Double {
        weight + (snapshot ?? 0)
    }

    public static func detail(weight: Double, reps: Double, unit: WeightUnit, snapshot: Double?) -> String {
        let repsText = reps.formatted(.number.precision(.fractionLength(0...1)))
        let unitLabel = unit.label
        if let snapshot {
            let body = snapshot.formatted(.number.precision(.fractionLength(0...1)))
            if weight == 0 {
                return "\(body) \(unitLabel) bodyweight × \(repsText)"
            }
            let added = abs(weight).formatted(.number.precision(.fractionLength(0...1)))
            let sign = weight > 0 ? "+" : "−"
            return "\(body) \(unitLabel) bodyweight \(sign) \(added) \(unitLabel) × \(repsText)"
        }
        let amount = weight.formatted(.number.precision(.fractionLength(0...1)))
        return "\(amount) \(unitLabel) × \(repsText)"
    }
}
