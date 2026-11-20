public struct LiftDraft: Equatable, Sendable {
    public var canonicalName: String
    public var shorthand: String
    public var weight: Double
    public var reps: Double
    public var unit: WeightUnit
    public var equipment: Equipment
    public var modifiers: [String]

    public init(
        canonicalName: String,
        shorthand: String,
        weight: Double,
        reps: Double,
        unit: WeightUnit,
        equipment: Equipment,
        modifiers: [String]
    ) {
        self.canonicalName = canonicalName
        self.shorthand = shorthand
        self.weight = weight
        self.reps = reps
        self.unit = unit
        self.equipment = equipment
        self.modifiers = modifiers
    }
}
