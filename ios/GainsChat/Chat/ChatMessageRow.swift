import SwiftUI

struct ChatMessageRow: View {
    var message: ChatMessage

    var body: some View {
        switch message.role {
        case .user:
            HStack {
                Spacer(minLength: AppMetrics.minimumTap)
                Text(message.text)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color.blue, in: RoundedRectangle(cornerRadius: AppMetrics.bubbleRadius))
            }
        case .assistant:
            Text(message.text)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.trailing, AppMetrics.minimumTap)
        }
    }
}

#Preview {
    VStack {
        ChatMessageRow(message: ChatMessage(id: "1", role: .user, text: "bp 155 5", createdAt: Date()))
        ChatMessageRow(message: ChatMessage(id: "2", role: .assistant, text: "Barbell Bench Press · 155 lb × 5", createdAt: Date()))
    }
    .padding()
}
