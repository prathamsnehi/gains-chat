import Foundation

@MainActor
struct ChatClient {
    typealias Item = [String: Any]
    var endpoint: URL
    var token: @MainActor () async throws -> String
    var session: URLSession = .shared

    static func live() -> Self {
        let url = Bundle.main.object(forInfoDictionaryKey: "ChatEndpoint") as? String
        return Self(endpoint: URL(string: url ?? "https://us-central1-gains-chat.cloudfunctions.net/chat")!,
                    token: { try await AppCheckController.shared.token() })
    }

    func stream(input: [Item], unit: String, event: (String, Item) throws -> Void) async throws -> [Item] {
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = 65
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(try await token(), forHTTPHeaderField: "X-Firebase-AppCheck")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["input": input, "displayUnit": unit])
        let (bytes, response) = try await session.bytes(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        for try await line in bytes.lines where line.hasPrefix("data:") {
            try Task.checkCancellation()
            let payload = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
            guard payload != "[DONE]", let item = try JSONSerialization.jsonObject(with: Data(payload.utf8)) as? Item,
                  let type = item["type"] as? String else { continue }
            try event(type, item)
            if type == "response.completed", let response = item["response"] as? Item,
               let output = response["output"] as? [Item] { return output }
            if ["response.failed","error","response.incomplete"].contains(type) { throw URLError(.badServerResponse) }
        }
        throw URLError(.networkConnectionLost)
    }
}
