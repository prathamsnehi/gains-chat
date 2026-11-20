import Foundation
import GainsCore

struct ChatMessage: Equatable, Identifiable {
    enum Role: String { case user, assistant }
    enum Attachment: Codable, Equatable {
        case record(String, before: LiftRecord?)
        case deleted(LiftRecord)
        case form(String, Bool)
        case history(String, [String])
        case progress(String, String)
        case choices([String])
        case exercise(String)
        case retry(String)
    }
    var id: String
    var role: Role
    var text: String
    var createdAt: Date
    var attachment: Attachment?
    var operationTurn: String?

    // Keep the original Core Data model readable across app versions.
    private struct Contents: Codable { var text: String; var attachment: Attachment?; var operationTurn: String? }
    private static let prefix = "\u{001e}GainsChat/1:"
    var storedText: String {
        guard role == .assistant, attachment != nil || operationTurn != nil,
              let data = try? JSONEncoder().encode(Contents(text: text, attachment: attachment, operationTurn: operationTurn)) else { return text }
        return Self.prefix + data.base64EncodedString()
    }
    mutating func decodeStoredText() {
        guard role == .assistant, text.hasPrefix(Self.prefix),
              let data = Data(base64Encoded: String(text.dropFirst(Self.prefix.count))),
              let value = try? JSONDecoder().decode(Contents.self, from: data) else { return }
        text = value.text
        attachment = value.attachment
        operationTurn = value.operationTurn
    }
}
