import SwiftUI
import GainsCore

struct LiftEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var weight: Double
    @State private var reps: Double
    @State private var unit: WeightUnit
    @State private var snapshot: Double
    @State private var performedAt: Date
    private let lift: LiftRecord
    private let showsBodyweight: Bool
    let formula: MaxFormula
    var onSave: (LiftRecord) throws -> Void
    @State private var saveFailed = false

    init(lift: LiftRecord, factorsBodyweight: Bool, displayUnit: WeightUnit? = nil, formula: MaxFormula, onSave: @escaping (LiftRecord) throws -> Void) {
        self.formula = formula
        self.lift = lift
        let lift = lift.converted(to: displayUnit ?? lift.unit)
        self.showsBodyweight = factorsBodyweight || lift.bodyweightSnapshot != nil
        self.onSave = onSave
        _weight = State(initialValue: lift.weight)
        _reps = State(initialValue: lift.reps)
        _unit = State(initialValue: lift.unit)
        _snapshot = State(initialValue: lift.bodyweightSnapshot ?? 0)
        _performedAt = State(initialValue: lift.performedAt)
    }

    var body: some View {
        NavigationStack {
            Form {
                LabeledContent("Exercise", value: lift.exerciseName)
                if showsBodyweight {
                    TextField("Bodyweight", value: $snapshot, format: .number)
                        .keyboardType(.decimalPad)
                    TextField("Added weight", value: $weight, format: .number)
                        .keyboardType(.numbersAndPunctuation)
                } else {
                    TextField("Weight", value: $weight, format: .number)
                        .keyboardType(.decimalPad)
                }
                TextField("Reps", value: $reps, format: .number)
                    .keyboardType(.decimalPad)
                Picker("Unit", selection: Binding(get: { unit }, set: { new in
                    weight = OneRepMax.convert(weight, from: unit, to: new)
                    snapshot = OneRepMax.convert(snapshot, from: unit, to: new)
                    unit = new
                })) {
                    Text("lb").tag(WeightUnit.lb)
                    Text("kg").tag(WeightUnit.kg)
                }
                let effectiveLoad = LiftLoad.effective(weight: weight, snapshot: showsBodyweight ? snapshot : nil)
                let estimate = formula.estimate(load: effectiveLoad, reps: reps)
                LabeledContent("Estimated 1RM", value: estimate.map {
                    $0.formatted(.number.precision(.fractionLength(0...1))) + " " + unit.label
                } ?? "—")
                DatePicker("Date", selection: $performedAt)
                if saveFailed {
                    Text("This set could not be saved.")
                        .foregroundStyle(.red)
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
                        .disabled(!canSave)
                }
            }
        }
    }

    private var canSave: Bool {
        guard reps.isFinite, reps > 0, reps <= 100 else { return false }
        if showsBodyweight {
            return snapshot.isFinite && snapshot > 0 && weight.isFinite && snapshot + weight > 0
        }
        return weight.isFinite && weight > 0
    }

    private func cancel() {
        dismiss()
    }

    private func save() {
        var updated = lift
        let original = lift.converted(to: unit)
        let loadChanged = weight != original.weight || (showsBodyweight && snapshot != original.bodyweightSnapshot)
        updated.weight = loadChanged ? weight : lift.weight
        updated.reps = reps
        updated.unit = loadChanged ? unit : lift.unit
        updated.performedAt = performedAt
        updated.bodyweightSnapshot = loadChanged ? (showsBodyweight ? snapshot : nil) : lift.bodyweightSnapshot
        do {
            try onSave(updated)
            dismiss()
        } catch {
            saveFailed = true
        }
    }
}
