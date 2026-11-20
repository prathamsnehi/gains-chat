import SwiftUI

struct SyncStatusButton: View {
    @ObservedObject var training: TrainingStore

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(training.syncSummary)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Button("Refresh iCloud status") {
                Task { await training.refreshSyncStatus() }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 4)
    }
}
