import SwiftUI
import UIKit

struct RootNavigationView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @StateObject private var training: TrainingStore
    @StateObject private var chat: ChatStore
    @State private var section = AppSection.chat
    @State private var sidebarOpen = false
    @AccessibilityFocusState private var sidebarHeadingFocused: Bool

    init(training: TrainingStore = TrainingStore(), chat: ChatStore? = nil) {
        _training = StateObject(wrappedValue: training)
        _chat = StateObject(wrappedValue: chat ?? ChatStore(training: training))
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                ZStack {
                    ChatView(chat: chat, training: training, openSidebar: openSidebar)
                        .modifier(SectionVisibility(active: section == .chat))
                    LogsView(training: training, openChat: { select(.chat) }, ask: askAboutLift, openSidebar: openSidebar)
                        .modifier(SectionVisibility(active: section == .logs))
                    SettingsView(training: training, chat: chat, openSidebar: openSidebar)
                        .modifier(SectionVisibility(active: section == .settings))
                }
                .background(AppPalette.canvas.ignoresSafeArea())
                .allowsHitTesting(!sidebarOpen)
                .accessibilityHidden(sidebarOpen)

                if sidebarOpen {
                    Color.black.opacity(0.32)
                        .ignoresSafeArea()
                        .onTapGesture { setSidebar(open: false) }
                        .accessibilityHidden(true)
                        .transition(.opacity)

                    sidebar
                        .frame(width: min(geometry.size.width * 0.86, 340))
                        .frame(maxHeight: .infinity, alignment: .top)
                        .background(AppPalette.surface.ignoresSafeArea(edges: .vertical))
                        .shadow(color: .black.opacity(0.14), radius: 16, x: 4)
                        .transition(reduceMotion ? .opacity : .move(edge: .leading))
                }
            }
        }
        .tint(AppPalette.accent)
    }

    private var sidebar: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Gains Chat")
                        .font(.title2.bold())
                        .accessibilityAddTraits(.isHeader)
                        .accessibilityFocused($sidebarHeadingFocused)
                    Spacer()
                    Button(action: { setSidebar(open: false) }) {
                        Image(systemName: "xmark")
                            .frame(width: 44, height: 44)
                            .background(AppPalette.canvas, in: Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Close navigation")
                }
                .padding(.bottom, 12)

                ForEach(AppSection.allCases, id: \.self) { destination in
                    Button(action: { select(destination) }) {
                        HStack(spacing: 14) {
                            Image(systemName: destination.icon)
                                .frame(width: 24)
                                .accessibilityHidden(true)
                            Text(destination.title)
                            Spacer(minLength: 8)
                            if section == destination {
                                Image(systemName: "checkmark")
                                    .accessibilityHidden(true)
                            }
                        }
                        .font(.body.weight(section == destination ? .semibold : .regular))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .frame(minHeight: 48)
                        .background(section == destination ? AppPalette.accent.opacity(0.15) : .clear,
                                    in: RoundedRectangle(cornerRadius: 14))
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(section == destination ? .isSelected : [])
                    .accessibilityIdentifier("sidebar.\(destination)")
                }
            }
            .padding(16)
        }
        .accessibilityAddTraits(.isModal)
        .accessibilityAction(.escape) { setSidebar(open: false) }
        .onAppear { sidebarHeadingFocused = true }
    }

    private func openSidebar() {
        // Resign the active text input without clearing a draft or search query.
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        setSidebar(open: true)
    }

    private func askAboutLift(_ question: String) -> Bool {
        guard chat.ask(question) else { return false }
        select(.chat)
        return true
    }

    private func select(_ destination: AppSection) {
        section = destination
        setSidebar(open: false)
    }

    private func setSidebar(open: Bool) {
        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.24)) {
            sidebarOpen = open
        }
    }
}

// Keep each navigation stack and its local UI state alive when switching sections.
private struct SectionVisibility: ViewModifier {
    var active: Bool

    func body(content: Content) -> some View {
        content
            .opacity(active ? 1 : 0)
            .allowsHitTesting(active)
            .accessibilityHidden(!active)
            .zIndex(active ? 1 : 0)
    }
}

struct SidebarButton: ToolbarContent {
    var action: () -> Void

    var body: some ToolbarContent {
        ToolbarItem(placement: .navigationBarLeading) {
            Button("Open navigation", systemImage: "sidebar.left", action: action)
        }
    }
}

#Preview {
    RootNavigationView()
}
