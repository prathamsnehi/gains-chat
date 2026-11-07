import SwiftUI
import GainsCore

struct LiftEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var weight: Double
    @State private var reps: Int
    @State private var unit: WeightUnit
    private let lift: LiftRecord
    var onSave: (LiftRecord) -> Void

    init(lift: LiftRecord, onSave: @escaping (LiftRecord) -> Void) {
        self.lift = lift
        self.onSave = onSave
        _weight = State(initialValue: lift.weight)
        _reps = State(initialValue: lift.reps)
        _unit = State(initialValue: lift.unit)
    }

    var body: some View {
        NavigationStack {
            Form {
                LabeledContent("Exercise", value: lift.exerciseName)
                TextField("Weight", value: $weight, format: .number)
                    .keyboardType(.decimalPad)
                TextField("Reps", value: $reps, format: .number)
                    .keyboardType(.numberPad)
                Picker("Unit", selection: $unit) {
                    Text("lb").tag(WeightUnit.lb)
                    Text("kg").tag(WeightUnit.kg)
                }
            }
            .navigationTitle("Edit set")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel, action: cancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save)
                        .disabled(weight <= 0 || reps <= 0)
                }
            }
        }
    }

    private func cancel() {
        dismiss()
    }

    private func save() {
        var updated = lift
        updated.weight = weight
        updated.reps = reps
        updated.unit = unit
        onSave(updated)
        dismiss()
    }
}
