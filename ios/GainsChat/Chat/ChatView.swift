import SwiftUI

struct ChatView: View {
    @ObservedObject var chat: ChatStore
    @ObservedObject var training: TrainingStore
    var openSidebar: () -> Void
    @State private var draft = ""

    var body: some View {
        NavigationStack {
            ChatTranscript(chat: chat, training: training)
                .background(LinearGradient(colors: [AppPalette.accent.opacity(0.08), AppPalette.canvas],
                                           startPoint: .topTrailing, endPoint: .center))
                .navigationTitle("Chat")
                .toolbar { SidebarButton(action: openSidebar) }
                .navigationBarTitleDisplayMode(.inline)
                .safeAreaInset(edge: .bottom) {
                    ComposerBar(text: $draft, busy: chat.activity != nil, add: chat.openForm) {
                        let submitted = draft
                        draft = ""
                        chat.send(submitted)
                    }.padding(.horizontal).padding(.bottom, 6)
                }
                .alert("Use the online assistant?", isPresented: $chat.requestingConsent) {
                    Button("Allow") { chat.consent = true; chat.startOnline() }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("Your messages, relevant workout records, and tool results will be sent through Firebase to TokenRouter and its AI provider. You can change this in Settings.")
                }
                .alert("Gains Chat", isPresented: Binding(get: { chat.error != nil }, set: { if !$0 { chat.error = nil } })) {
                    Button("OK") { chat.error = nil }
                } message: { Text(chat.error ?? "") }
        }
    }
}
