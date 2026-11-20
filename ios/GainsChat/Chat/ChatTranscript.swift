import SwiftUI

struct ChatTranscript: View {
    @ObservedObject var chat: ChatStore
    @ObservedObject var training: TrainingStore
    var body: some View {
        if chat.messages.isEmpty {
            VStack(spacing: 10) {
                Image(systemName: "figure.strengthtraining.traditional").font(.largeTitle).foregroundStyle(.secondary)
                Text("Log a top set").font(.title2.bold())
                Text("Try “bp 155 5” or ask about your progress.").font(.subheadline).foregroundStyle(.secondary)
            }.frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 18) {
                        ForEach(chat.messages) { message in
                            ChatMessageRow(message: message, training: training, chat: chat).id(message.id)
                        }
                        if let activity = chat.activity {
                            HStack(spacing: 10) {
                                ProgressView()
                                Text(activity)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            .accessibilityElement(children: .combine)
                        }
                        Color.clear.frame(height: 1).id("bottom")
                    }.padding()
                }
                .onAppear { proxy.scrollTo("bottom", anchor: .bottom) }
                .onChange(of: chat.messages.last) { _ in proxy.scrollTo("bottom", anchor: .bottom) }
                .onChange(of: chat.activity) { _ in proxy.scrollTo("bottom", anchor: .bottom) }
                .scrollDismissesKeyboard(.interactively)
            }
        }
    }
}
