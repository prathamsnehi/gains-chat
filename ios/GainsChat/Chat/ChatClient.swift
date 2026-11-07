import Foundation
import GainsCore

struct ChatClient {
    var endpoint: URL
    var token: () async throws -> String
    var session: URLSession = .shared

    static func live() -> ChatClient {
        let endpoint = Bundle.main.object(forInfoDictionaryKey: "ChatEndpoint") as? String
        return ChatClient(
            endpoint: URL(string: endpoint ?? "") ?? URL(string: "https://gains-chat.web.app/chat")!,
            token: { try await AppCheckController.shared.token() }
        )
    }

    func reply(text: String, snippets: [LiftSnippet]) async throws -> String {
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(try await token(), forHTTPHeaderField: "X-Firebase-AppCheck")
        let lifts = snippets.map { snippet in
            [
                "exerciseName": snippet.exerciseName,
                "weight": snippet.weight,
                "reps": snippet.reps,
                "unit": snippet.unit.rawValue,
                "performedAt": ISO8601DateFormatter().string(from: snippet.performedAt),
            ] as [String: Any]
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["text": text, "lifts": lifts])
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let message = object?["message"] as? String, !message.isEmpty else {
            throw URLError(.cannotParseResponse)
        }
        return message
    }
}
