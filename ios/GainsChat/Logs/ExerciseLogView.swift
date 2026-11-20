import SwiftUI
import GainsCore

struct ExerciseLogView: View {
    var exerciseID: String
    @ObservedObject var training: TrainingStore
    var ask: (String) -> Bool
    @State private var range = ChartRange.oneMonth
    @State private var editing = false
    @State private var selected: LiftRecord?
    @State private var visited = false
    @State private var failure: String?
    @State private var question = ""

    private var name: String {
        training.exercises.first { $0.id == exerciseID }?.name ?? "Exercise"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                ExerciseChartCard(range: $range, points: training.points(exerciseID, range: range))
                Text("History")
                    .font(.title2)
                    .bold()
                SetHistoryTable(
                    sets: training.history(exerciseID),
                    training: training,
                    edit: { selected = $0 },
                    remove: editing ? { set in
                        do { try training.delete(set) } catch { failure = "Couldn’t delete this set." }
                    } : nil
                )
            }
            .padding()
        }
        .background(AppPalette.canvas)
        .navigationTitle(name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { Button(editing ? "Done" : "Edit") { editing.toggle() } }
        .safeAreaInset(edge: .bottom) { questionField }
        .onAppear { if !visited { visited = true; training.viewed(exerciseID) } }
        .sheet(item: $selected) { set in
            LiftEditorSheet(lift: set, factorsBodyweight: set.bodyweightSnapshot != nil, displayUnit: training.unit, formula: training.formula, onSave: training.update)
        }
        .alert("Save failed", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })) {
            Button("OK") { failure = nil }
        } message: { Text(failure ?? "") }
    }

    private var questionField: some View {
        HStack(spacing: 8) {
            TextField("Ask about \(name)", text: $question, axis: .vertical)
                .lineLimit(1...3)
                .accessibilityIdentifier("askAboutLift")
            Button {
                let trimmed = question.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !trimmed.isEmpty else { return }
                if ask("\(name): \(trimmed)") { question = "" }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
                    .frame(width: 44, height: 44)
            }
            .disabled(question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .accessibilityLabel("Ask about \(name)")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(AppPalette.surface)
    }
}
