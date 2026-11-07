public enum ParseResult: Equatable, Sendable {
    case lift(LiftDraft)
    case incomplete(String)
    case notALog
}
