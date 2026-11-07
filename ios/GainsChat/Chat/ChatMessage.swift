import Foundation

struct ChatMessage: Equatable, Identifiable {
    enum Role: String {
        case user
        case assistant
    }

    var id: String
    var role: Role
    var text: String
    var createdAt: Date
}
