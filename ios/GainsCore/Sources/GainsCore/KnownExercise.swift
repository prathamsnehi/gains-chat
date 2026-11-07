public struct KnownExercise: Equatable, Identifiable, Sendable {
    public var id: String
    public var name: String
    public var aliases: [String]

    public init(id: String, name: String, aliases: [String] = []) {
        self.id = id
        self.name = name
        self.aliases = aliases
    }
}
