import SwiftUI
import GainsCore

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var training: TrainingStore
    @ObservedObject private var chat: ChatStore
    var openSidebar: () -> Void
    @State private var weightText: String
    @State private var unit: WeightUnit
    @State private var newName = ""
    @State private var newFactors = false
    @State private var confirmingDelete = false
    @State private var isDeleting = false
    @State private var statusMessage: String?

    init(training: TrainingStore, chat: ChatStore, openSidebar: @escaping () -> Void) {
        self.openSidebar = openSidebar
        _training = ObservedObject(wrappedValue: training)
        _chat = ObservedObject(wrappedValue: chat)
        let reading = training.bodyweight
        _weightText = State(initialValue: reading.map {
            $0.weight.formatted(.number.precision(.fractionLength(0...1)))
        } ?? "")
        _unit = State(initialValue: reading?.unit ?? .lb)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Preferences") {
                    Picker("Measurement of weight", selection: $training.unit) {
                        Text("Pounds (lb)").tag(WeightUnit.lb)
                        Text("Kilograms (kg)").tag(WeightUnit.kg)
                    }
                    Picker("Estimated 1RM formula", selection: $training.formula) {
                        ForEach(MaxFormula.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    SyncStatusButton(training: training)
                }
                Section {
                    Toggle("Allow online assistant", isOn: $chat.consent)
                } footer: {
                    Text("The online assistant sends recent conversation and relevant workout records through Firebase to TokenRouter and its model provider.")
                }
                Section("Bodyweight") {
                    TextField("Bodyweight", text: $weightText)
                        .keyboardType(.decimalPad)
                        .font(.body)
                    Picker("Unit", selection: $unit) {
                        Text("lb").tag(WeightUnit.lb)
                        Text("kg").tag(WeightUnit.kg)
                    }
                    Button("Save Bodyweight", action: saveBodyweight)
                }
                Section("Exercises") {
                    TextField("Exercise name", text: $newName)
                        .font(.body)
                    Toggle("Factors bodyweight", isOn: $newFactors)
                    Button("Add Exercise", action: addExercise)
                        .disabled(newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    ForEach(training.exercises) { exercise in
                        SettingsExerciseRow(
                            exercise: exercise,
                            factorsBodyweight: factorsBinding(exercise)
                        )
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button("Delete", systemImage: "trash", role: .destructive, action: { remove(exercise) })
                        }
                    }
                }
                Section("Data") {
                    Button("Delete All Data", role: .destructive, action: askToDelete)
                        .disabled(isDeleting)
                        .confirmationDialog(
                            "Delete all data?",
                            isPresented: $confirmingDelete,
                            titleVisibility: .visible
                        ) {
                            Button("Delete Everything", role: .destructive, action: deleteEverything)
                            Button("Cancel", role: .cancel) {}
                        } message: {
                            Text("This removes exercises, sets, and chat from this iPhone and from iCloud.")
                        }
                }
                if let statusMessage {
                    Section {
                        Text(statusMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(AppPalette.canvas)
            .navigationTitle("Settings")
            .toolbar { SidebarButton(action: openSidebar) }
            .onAppear { refreshWeight() }
            .onChange(of: training.unit) { _ in refreshWeight() }
            .onChange(of: training.bodyweight) { _ in refreshWeight() }
        }
    }

    private func refreshWeight() {
        unit = training.unit
        weightText = training.bodyweight.map {
            OneRepMax.convert($0.weight, from: $0.unit, to: unit).formatted(.number.precision(.fractionLength(0...2)))
        } ?? ""
    }

    private func saveBodyweight() {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        let trimmed = weightText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let number = formatter.number(from: trimmed), number.doubleValue > 0 else {
            statusMessage = "Enter a bodyweight above zero."
            return
        }
        do {
            try training.save(bodyweight: BodyweightReading(weight: number.doubleValue, unit: unit))
            statusMessage = nil
        } catch {
            statusMessage = "Bodyweight could not be saved."
        }
    }

    private func addExercise() {
        do {
            try training.addExercise(name: newName, factorsBodyweight: newFactors)
            newName = ""
            newFactors = false
            statusMessage = nil
        } catch {
            statusMessage = "That exercise could not be saved."
        }
    }

    private func factorsBinding(_ exercise: KnownExercise) -> Binding<Bool> {
        Binding(
            get: { exercise.factorsBodyweight },
            set: { updateFactors($0, exerciseID: exercise.id) }
        )
    }

    private func updateFactors(_ factors: Bool, exerciseID: String) {
        do {
            try training.setFactorsBodyweight(factors, exerciseID: exerciseID)
            statusMessage = nil
        } catch {
            statusMessage = "That exercise could not be updated."
        }
    }

    private func remove(_ exercise: KnownExercise) {
        do {
            try training.deleteExercise(id: exercise.id)
            statusMessage = nil
        } catch {
            statusMessage = "That exercise could not be removed."
        }
    }

    private func askToDelete() {
        confirmingDelete = true
    }

    private func deleteEverything() {
        isDeleting = true
        Task { await erase() }
    }

    private func erase() async {
        do {
            try await chat.erase()
            statusMessage = nil
            weightText = ""
            unit = .lb
        } catch {
            statusMessage = "Data could not be deleted."
        }
        isDeleting = false
    }
}
