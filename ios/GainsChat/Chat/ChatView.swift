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
                    VStack(alignment: .leading, spacing: 8) {
                        consentNotice
                        ComposerBar(text: $draft, busy: chat.activity != nil, add: chat.openForm, send: submit, stop: chat.stop)
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 6)
                }
                .alert("Gains Chat", isPresented: Binding(get: { chat.error != nil }, set: { if !$0 { chat.error = nil } })) {
                    Button("OK") { chat.error = nil }
                } message: { Text(chat.error ?? "") }
        }
    }

    @ViewBuilder
    private var consentNotice: some View {
        if chat.requestingConsent {
            VStack(alignment: .leading, spacing: 8) {
                Text("The online assistant sends recent conversation and relevant workout records through Firebase to TokenRouter and its model provider. Sets stay on this phone.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 8) {
                    Button("Not now", action: chat.declineConsent)
                    Button("Allow") {
                        chat.consent = true
                        chat.startOnline()
                    }
                    .buttonStyle(.borderedProminent)
                }
                .frame(minHeight: AppMetrics.minimumTap)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppPalette.surface, in: RoundedRectangle(cornerRadius: 16))
        } else if !chat.consent {
            Text("Questions leave this phone. Sets stay here.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 4)
        }
    }

    private func submit() {
        let submitted = draft
        draft = ""
        chat.send(submitted)
    }
}
