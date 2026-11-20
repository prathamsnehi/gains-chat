enum AppSection: CaseIterable {
    case chat
    case logs
    case settings

    var title: String {
        switch self {
        case .chat: "Chat"
        case .logs: "Log"
        case .settings: "Settings"
        }
    }

    var icon: String {
        switch self {
        case .chat: "bubble.left"
        case .logs: "list.bullet"
        case .settings: "gearshape"
        }
    }
}
