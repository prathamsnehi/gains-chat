import SwiftUI

struct ChatView: View {
    @ObservedObject var chat: ChatStore
    @ObservedObject var training: TrainingStore
    @State private var draft = ""

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading) {
                        ForEach(chat.messages) { message in
                            ChatMessageRow(message: message)
                                .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: chat.messages.map(\.text).joined(separator: "\n")) { _ in
                    if let last = chat.messages.last {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
            .navigationTitle("Chat")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    SyncStatusButton(training: training)
                }
            }
            .safeAreaInset(edge: .bottom) {
                ComposerBar(text: $draft, send: send)
            }
        }
    }

    private func send() {
        let text = draft
        draft = ""
        chat.send(text)
    }
}
