public enum Route: Equatable, Sendable {
    case log(LogCommand)
    case clarify(String)
    case question(text: String, snippets: [LiftSnippet])
}
