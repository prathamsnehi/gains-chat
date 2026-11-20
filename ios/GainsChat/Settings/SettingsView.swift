import SwiftUI
import GainsCore

struct SettingsView: View {
    @ObservedObject private var training: TrainingStore
    @ObservedObject private var chat: ChatStore
    var openSidebar: () -> Void
    @State private var confirmingDelete = false
    @State private var isDeleting = false
    @State private var statusMessage: String?

    init(training: TrainingStore, chat: ChatStore, openSidebar: @escaping () -> Void) {
        self.openSidebar = openSidebar
        _training = ObservedObject(wrappedValue: training)
        _chat = ObservedObject(wrappedValue: chat)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Preferences") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Weight")
                        Picker("Weight", selection: $training.unit) {
                            Text("Pounds").tag(WeightUnit.lb)
                            Text("Kilograms").tag(WeightUnit.kg)
                        }
                        .pickerStyle(.segmented)
                        .labelsHidden()
                    }
                    .padding(.vertical, 4)
                    Picker("Estimated 1RM formula", selection: $training.formula) {
                        ForEach(MaxFormula.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                }
                Section("Sync") {
                    SyncStatusButton(training: training)
                }
                Section {
                    Toggle("Allow online assistant", isOn: $chat.consent)
                } footer: {
                    Text("The online assistant sends recent conversation and relevant workout records through Firebase to TokenRouter and its model provider. Sets stay on this phone.")
                }
                Section {
                    NavigationLink {
                        BodyweightLogView(training: training)
                    } label: {
                        LabeledContent("Bodyweight", value: bodyweightText)
                    }
                } footer: {
                    Text("Factored lifts use the latest reading.")
                }
                Section {
                    if training.exercises.isEmpty {
                        Text("Exercises appear when you log a set, or when you add one from Chat.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(training.exercises) { exercise in
                        SettingsExerciseRow(
                            exercise: exercise,
                            factorsBodyweight: factorsBinding(exercise)
                        )
                    }
                    .onDelete(perform: deleteExercises)
                } header: {
                    Text("Exercises")
                } footer: {
                    Text("Add an exercise from the chat composer. Edit this list to remove one.")
                }
                Section("Data") {
                    Button("Delete All Data", role: .destructive, action: { confirmingDelete = true })
                        .disabled(isDeleting)
                        .confirmationDialog(
                            "Delete all data?",
                            isPresented: $confirmingDelete,
                            titleVisibility: .visible
                        ) {
                            Button("Delete Everything", role: .destructive, action: deleteEverything)
                            Button("Cancel", role: .cancel) {}
                        } message: {
                            Text("This removes exercises, sets, bodyweight, and chat from this iPhone and from iCloud.")
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
            .toolbar { EditButton() }
        }
    }

    private var bodyweightText: String {
        guard let reading = training.bodyweight else { return "Not set" }
        let value = OneRepMax.convert(reading.weight, from: reading.unit, to: training.unit)
        return value.formatted(.number.precision(.fractionLength(0...1))) + " " + training.unit.label
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

    private func deleteExercises(at offsets: IndexSet) {
        for index in offsets.sorted(by: >) {
            let exercise = training.exercises[index]
            do {
                try training.deleteExercise(id: exercise.id)
                statusMessage = nil
            } catch {
                statusMessage = "That exercise could not be removed."
            }
        }
    }

    private func deleteEverything() {
        isDeleting = true
        Task { await erase() }
    }

    private func erase() async {
        do {
            try await chat.erase()
            statusMessage = nil
        } catch {
            statusMessage = "Data could not be deleted."
        }
        isDeleting = false
    }
}
