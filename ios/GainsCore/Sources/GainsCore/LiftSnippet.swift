import Foundation

public struct LiftSnippet: Equatable, Sendable {
    public var exerciseName: String
    public var weight: Double
    public var reps: Int
    public var unit: WeightUnit
    public var performedAt: Date

    public init(exerciseName: String, weight: Double, reps: Int, unit: WeightUnit, performedAt: Date) {
        self.exerciseName = exerciseName
        self.weight = weight
        self.reps = reps
        self.unit = unit
        self.performedAt = performedAt
    }

    public init(_ lift: LiftRecord) {
        self.init(
            exerciseName: lift.exerciseName,
            weight: lift.weight,
            reps: lift.reps,
            unit: lift.unit,
            performedAt: lift.performedAt
        )
    }
}
