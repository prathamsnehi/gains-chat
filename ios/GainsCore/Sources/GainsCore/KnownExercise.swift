public struct KnownExercise: Equatable, Identifiable, Sendable {
    public var id: String
    public var name: String
    public var aliases: [String]
    public var factorsBodyweight: Bool

    public init(id: String, name: String, aliases: [String] = [], factorsBodyweight: Bool = false) {
        self.id = id
        self.name = name
        self.aliases = aliases
        self.factorsBodyweight = factorsBodyweight
    }
}
