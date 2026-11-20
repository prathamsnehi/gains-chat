import Foundation

public enum MaxFormula: String, CaseIterable, Sendable {
    case epley = "Epley"
    case brzycki = "Brzycki"

    public func estimate(load: Double, reps: Double) -> Double? {
        guard load > 0, reps > 0 else { return nil }
        let value: Double
        switch self {
        case .epley: value = OneRepMax.estimate(weight: load, reps: reps)
        case .brzycki:
            guard reps < 37 else { return nil }
            value = load * 36 / (37 - reps)
        }
        return value.isFinite && value > 0 ? value : nil
    }
}

public extension LiftRecord {
    func converted(to unit: WeightUnit) -> Self {
        var copy = self
        copy.weight = OneRepMax.convert(weight, from: self.unit, to: unit)
        copy.bodyweightSnapshot = bodyweightSnapshot.map { OneRepMax.convert($0, from: self.unit, to: unit) }
        copy.unit = unit
        return copy
    }

    func estimate(unit: WeightUnit, formula: MaxFormula) -> Double? {
        let set = converted(to: unit)
        return formula.estimate(load: LiftLoad.effective(weight: set.weight, snapshot: set.bodyweightSnapshot), reps: reps)
    }

    func weightText(in unit: WeightUnit) -> String {
        let value = converted(to: unit).weight
        let amount = abs(value).formatted(.number.precision(.fractionLength(0...1))) + " " + unit.label
        guard bodyweightSnapshot != nil else { return amount }
        if value == 0 { return "BW" }
        return "BW " + (value > 0 ? "+ " : "− ") + amount
    }
}
