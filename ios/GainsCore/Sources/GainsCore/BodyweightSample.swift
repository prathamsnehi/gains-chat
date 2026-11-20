import Foundation

public struct BodyweightSample: Equatable, Identifiable, Sendable {
    public var id: String
    public var weight: Double
    public var unit: WeightUnit
    public var recordedAt: Date

    public init(id: String, weight: Double, unit: WeightUnit, recordedAt: Date) {
        self.id = id
        self.weight = weight
        self.unit = unit
        self.recordedAt = recordedAt
    }

    public func value(in unit: WeightUnit) -> Double {
        OneRepMax.convert(weight, from: self.unit, to: unit)
    }
}
