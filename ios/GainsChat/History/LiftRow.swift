import SwiftUI
import GainsCore

struct LiftRow: View {
    var lift: LiftRecord

    var body: some View {
        LabeledContent {
            Text(value)
                .foregroundStyle(.primary)
        } label: {
            Text(lift.exerciseName)
        }
    }

    private var value: String {
        let weight = lift.weight.formatted(.number.precision(.fractionLength(0...1)))
        let reps = lift.reps.formatted(.number.precision(.fractionLength(0...1)))
        return "\(weight) \(lift.unit.label) × \(reps)"
    }
}

#Preview {
    List {
        LiftRow(lift: LiftRecord(
            id: "1",
            exerciseID: "bench",
            exerciseName: "Barbell Bench Press",
            weight: 155,
            reps: 5,
            unit: .lb,
            performedAt: Date()
        ))
    }
}
