import Foundation

public struct ChartPoint: Equatable, Identifiable, Sendable {
    public var id: String
    public var performedAt: Date
    public var estimatedOneRepMax: Double
    public var unit: WeightUnit

    public init(id: String, performedAt: Date, estimatedOneRepMax: Double, unit: WeightUnit) {
        self.id = id
        self.performedAt = performedAt
        self.estimatedOneRepMax = estimatedOneRepMax
        self.unit = unit
    }
}
