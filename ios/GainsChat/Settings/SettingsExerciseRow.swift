import SwiftUI
import GainsCore

struct SettingsExerciseRow: View {
    var exercise: KnownExercise
    @Binding var factorsBodyweight: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: AppMetrics.tight) {
            Text(exercise.name)
                .font(.headline)
            Toggle("Factors bodyweight", isOn: $factorsBodyweight)
        }
        .padding(.vertical, AppMetrics.tight)
    }
}
