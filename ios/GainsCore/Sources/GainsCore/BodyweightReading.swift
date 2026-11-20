import Foundation

public struct BodyweightReading: Equatable, Sendable {
    public var weight: Double
    public var unit: WeightUnit

    public init(weight: Double, unit: WeightUnit) {
        self.weight = weight
        self.unit = unit
    }
}
