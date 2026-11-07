public struct LogCommand: Equatable, Sendable {
    public var exerciseID: String?
    public var name: String
    public var aliases: [String]
    public var weight: Double
    public var reps: Int
    public var unit: WeightUnit

    public init(
        exerciseID: String?,
        name: String,
        aliases: [String],
        weight: Double,
        reps: Int,
        unit: WeightUnit
    ) {
        self.exerciseID = exerciseID
        self.name = name
        self.aliases = aliases
        self.weight = weight
        self.reps = reps
        self.unit = unit
    }
}
