import SwiftUI

struct SyncStatusButton: View {
    @ObservedObject var training: TrainingStore
    @State private var isShowingStatus = false

    var body: some View {
        Button(action: showStatus) {
            Label("iCloud", systemImage: "icloud")
        }
        .frame(minWidth: AppMetrics.minimumTap, minHeight: AppMetrics.minimumTap)
            .alert("iCloud", isPresented: $isShowingStatus) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(training.syncSummary)
            }
    }

    private func showStatus() {
        training.refreshSyncStatus()
        isShowingStatus = true
    }
}
