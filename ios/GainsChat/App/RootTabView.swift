import SwiftUI

struct RootTabView: View {
    @StateObject private var training: TrainingStore
    @StateObject private var chat: ChatStore
    @State private var tab = AppTab.chat

    init(training: TrainingStore = TrainingStore(), chat: ChatStore? = nil) {
        let training = training
        _training = StateObject(wrappedValue: training)
        _chat = StateObject(wrappedValue: chat ?? ChatStore(training: training))
    }

    var body: some View {
        TabView(selection: $tab) {
            ChatView(chat: chat, training: training)
                .tabItem { Label("Chat", systemImage: "bubble.left") }
                .tag(AppTab.chat)
            HistoryView(training: training)
                .tabItem { Label("History", systemImage: "clock") }
                .tag(AppTab.history)
            ProgressView(training: training)
                .tabItem { Label("Progress", systemImage: "chart.line.uptrend.xyaxis") }
                .tag(AppTab.progress)
        }
    }
}
