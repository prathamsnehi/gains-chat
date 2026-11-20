import SwiftUI
import GainsCore

struct LogsExerciseRow: View {
    var exercise: KnownExercise
    var setCount: Int
    var latest: LiftRecord?

    var body: some View {
        VStack(alignment: .leading, spacing: AppMetrics.tight) {
            Text(exercise.name)
                .font(.headline)
            Text(summary)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: AppMetrics.minimumTap, alignment: .leading)
        .padding(.vertical, AppMetrics.tight)
    }

    private var summary: String {
        let count = setCount == 1 ? "1 set" : "\(setCount) sets"
        guard let latest else { return count }
        let detail = LiftLoad.detail(
            weight: latest.weight,
            reps: latest.reps,
            unit: latest.unit,
            snapshot: latest.bodyweightSnapshot
        )
        return "\(count) · \(detail)"
    }
}
