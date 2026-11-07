public enum Reconciliation: Equatable, Sendable {
    case matched(exerciseID: String, name: String, aliases: [String])
    case created(name: String, aliases: [String])
    case ambiguous([String])
}
