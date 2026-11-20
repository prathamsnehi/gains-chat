import SwiftUI
import GainsCore

struct LogsExerciseRow: View {
    var exercise: KnownExercise
    var setCount: Int
    var latest: LiftRecord?
    var delta: Double?
    var unit: WeightUnit

    var body: some View {
        VStack(alignment: .leading, spacing: AppMetrics.tight) {
            Text(exercise.name)
                .font(.headline)
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer(minLength: 8)
                if let delta {
                    Text(Self.deltaText(delta, unit: unit))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: AppMetrics.minimumTap, alignment: .leading)
        .padding(.vertical, AppMetrics.tight)
        .accessibilityElement(children: .combine)
    }

    private var summary: String {
        let count = setCount == 1 ? "1 set" : "\(setCount) sets"
        guard let latest else { return count }
        let when = latest.performedAt.formatted(.dateTime.month(.abbreviated).day())
        return "\(count) · \(latest.weightText(in: unit)) × \(latest.reps.formatted()) · \(when)"
    }

    private static func deltaText(_ delta: Double, unit: WeightUnit) -> String {
        let amount = abs(delta).formatted(.number.precision(.fractionLength(0...1)))
        if delta > 0.05 { return "↑ \(amount) \(unit.label)" }
        if delta < -0.05 { return "↓ \(amount) \(unit.label)" }
        return "→ 0 \(unit.label)"
    }
}
