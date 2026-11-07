import Foundation

public struct LiftRecord: Equatable, Identifiable, Sendable {
    public var id: String
    public var exerciseID: String
    public var exerciseName: String
    public var weight: Double
    public var reps: Double
    public var unit: WeightUnit
    public var performedAt: Date

    public init(
        id: String,
        exerciseID: String,
        exerciseName: String,
        weight: Double,
        reps: Double,
        unit: WeightUnit,
        performedAt: Date
    ) {
        self.id = id
        self.exerciseID = exerciseID
        self.exerciseName = exerciseName
        self.weight = weight
        self.reps = reps
        self.unit = unit
        self.performedAt = performedAt
    }
}
