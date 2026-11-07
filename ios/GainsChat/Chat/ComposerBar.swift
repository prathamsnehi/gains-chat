import SwiftUI

struct ComposerBar: View {
    @Binding var text: String
    var send: () -> Void

    var body: some View {
        HStack(alignment: .bottom) {
            TextField("Log a set or ask", text: $text, axis: .vertical)
                .lineLimit(1...4)
                .textFieldStyle(.plain)
            Button("Send", action: send)
                .buttonStyle(.borderedProminent)
                .frame(minWidth: AppMetrics.minimumTap, minHeight: AppMetrics.minimumTap)
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.background)
    }
}

#Preview {
    ComposerBar(text: .constant("bp 155 5"), send: {})
}
