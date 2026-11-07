import Foundation
import GainsCore

@MainActor
final class ChatStore: ObservableObject {
    @Published private(set) var messages: [ChatMessage] = []

    private let training: TrainingStore
    private let persistence: PersistenceController
    private let scorer: CoreMLIntentScorer
    private let client: ChatClient
    private let appCheck: AppCheckController

    init(
        training: TrainingStore,
        scorer: CoreMLIntentScorer = CoreMLIntentScorer(),
        client: ChatClient = .live(),
        appCheck: AppCheckController = .shared
    ) {
        self.training = training
        self.persistence = training.persistence
        self.scorer = scorer
        self.client = client
        self.appCheck = appCheck
        messages = training.persistence.loadMessages()
    }

    func send(_ raw: String) {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        append(role: .user, text: text)
        let route = MessageRouter.decide(
            text: text,
            exercises: training.exercises,
            lifts: training.lifts,
            scores: scorer.scores(for:)
        )
        switch route {
        case .log(let command):
            do {
                _ = try training.apply(command)
                append(role: .assistant, text: LogConfirmation.text(for: command))
            } catch {
                append(role: .assistant, text: "That set could not be saved on this iPhone.")
            }
        case .clarify(let message):
            append(role: .assistant, text: message)
        case .question(_, let snippets):
            let placeholder = append(role: .assistant, text: "Checking your lifts…")
            Task { await answer(placeholder: placeholder, text: text, snippets: snippets) }
        }
    }

    private func answer(placeholder: ChatMessage, text: String, snippets: [LiftSnippet]) async {
        guard appCheck.prepare() else {
            replace(placeholder, with: "Questions need the Firebase configuration for App Check. Logging still works on this iPhone.")
            return
        }
        do {
            let reply = try await client.reply(text: text, snippets: snippets)
            replace(placeholder, with: reply)
        } catch {
            replace(placeholder, with: "I couldn’t reach chat. The set you already logged is saved.")
        }
    }

    @discardableResult
    private func append(role: ChatMessage.Role, text: String) -> ChatMessage {
        let message = ChatMessage(id: UUID().uuidString, role: role, text: text, createdAt: Date())
        messages.append(message)
        try? persistence.save(message: message)
        return message
    }

    private func replace(_ message: ChatMessage, with text: String) {
        guard let index = messages.firstIndex(where: { $0.id == message.id }) else { return }
        var updated = messages[index]
        updated.text = text
        messages[index] = updated
        try? persistence.replace(message: updated)
    }
}
