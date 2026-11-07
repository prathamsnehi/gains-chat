import Foundation

public enum OneRepMax {
    public static func estimate(weight: Double, reps: Int) -> Double {
        weight * (1 + Double(reps) / 30)
    }

    public static func convert(_ weight: Double, from source: WeightUnit, to destination: WeightUnit) -> Double {
        guard source != destination else { return weight }
        switch (source, destination) {
        case (.kg, .lb):
            return weight * 2.2046226218
        case (.lb, .kg):
            return weight / 2.2046226218
        default:
            return weight
        }
    }
}
