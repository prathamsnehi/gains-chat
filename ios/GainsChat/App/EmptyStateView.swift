import SwiftUI

struct EmptyStateView: View {
    var title: String
    var systemImage: String
    var message: String

    var body: some View {
        if #available(iOS 17, *) {
            ContentUnavailableView(title, systemImage: systemImage, description: Text(message))
        } else {
            VStack {
                Image(systemName: systemImage)
                    .font(.largeTitle)
                    .foregroundStyle(.secondary)
                Text(title)
                    .font(.title2)
                    .bold()
                Text(message)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
        }
    }
}

#Preview {
    EmptyStateView(title: "No history yet", systemImage: "clock", message: "Sets you log in Chat show up here.")
}
