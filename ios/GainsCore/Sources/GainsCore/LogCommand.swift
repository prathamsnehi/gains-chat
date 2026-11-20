public struct LogCommand: Equatable, Sendable {
    public var exerciseID: String?
    public var name: String
    public var aliases: [String]
    public var weight: Double
    public var reps: Double
    public var unit: WeightUnit
    public var bodyweightSnapshot: Double?

    public init(
        exerciseID: String?,
        name: String,
        aliases: [String],
        weight: Double,
        reps: Double,
        unit: WeightUnit,
        bodyweightSnapshot: Double? = nil
    ) {
        self.exerciseID = exerciseID
        self.name = name
        self.aliases = aliases
        self.weight = weight
        self.reps = reps
        self.unit = unit
        self.bodyweightSnapshot = bodyweightSnapshot
    }
}
