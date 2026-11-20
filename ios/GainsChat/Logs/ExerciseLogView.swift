import SwiftUI
import GainsCore

struct ExerciseLogView: View {
    var exerciseID: String
    @ObservedObject var training: TrainingStore
    @State private var range = ChartRange.oneMonth
    @State private var editing = false
    @State private var selected: LiftRecord?
    @State private var visited = false
    @State private var failure: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                ExerciseChartCard(range: $range, points: training.points(exerciseID, range: range))
                Text("History").font(.title2.bold())
                SetHistoryTable(sets: training.history(exerciseID), training: training,
                                edit: editing ? { selected = $0 } : nil,
                                remove: editing ? { set in
                                    do { try training.delete(set) } catch { failure = "Couldn’t delete this set." }
                                } : nil)
            }.padding()
        }
        .background(AppPalette.canvas)
        .navigationTitle(training.exercises.first { $0.id == exerciseID }?.name ?? "Exercise")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { Button(editing ? "Done" : "Edit") { editing.toggle() } }
        .onAppear { if !visited { visited = true; training.viewed(exerciseID) } }
        .sheet(item: $selected) { set in
            LiftEditorSheet(lift: set, factorsBodyweight: set.bodyweightSnapshot != nil, displayUnit: training.unit, formula: training.formula, onSave: training.update)
        }
        .alert("Save failed", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })) {
            Button("OK") { failure = nil }
        } message: { Text(failure ?? "") }
    }
}
