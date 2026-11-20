import SwiftUI
import GainsCore

struct ChatMessageRow: View {
    let message: ChatMessage
    @ObservedObject var training: TrainingStore
    @ObservedObject var chat: ChatStore
    @State private var editing: LiftRecord?

    var body: some View {
        if message.role == .user {
            HStack {
                Spacer(minLength: 40)
                Text(message.text).padding(.horizontal, 14).padding(.vertical, 9)
                    .foregroundStyle(.primary)
                    .background(AppPalette.accent.opacity(0.16), in: RoundedRectangle(cornerRadius: 19))
            }
        } else {
            VStack(alignment: .leading, spacing: 10) {
                if !message.text.isEmpty { Text(message.text).textSelection(.enabled) }
                switch message.attachment {
                case .record(let id, let before):
                    if let set = training.lifts.first(where: { $0.id == id }) {
                        VStack(alignment: .leading, spacing: 6) {
                            Label(set.exerciseName, systemImage: "checkmark.circle.fill").font(.headline)
                            if let before, before.weightText(in: training.unit) != set.weightText(in: training.unit) {
                                Text("\(before.weightText(in: training.unit)) → \(set.weightText(in: training.unit)) · \(set.reps.formatted()) reps")
                            } else { Text("\(set.weightText(in: training.unit)) × \(set.reps.formatted())") }
                            HStack {
                                Button("Edit") { editing = set }
                                Button("Undo") { chat.undo(message) }
                            }.font(.subheadline).buttonStyle(.bordered).disabled(chat.activity != nil)
                        }.padding().frame(maxWidth: .infinity, alignment: .leading)
                            .background(AppPalette.surface, in: RoundedRectangle(cornerRadius: 16))
                    } else { Text("Top set removed").foregroundStyle(.secondary) }
                case .deleted: Button("Undo") { chat.undo(message) }
                case .form(let name, let bw):
                    InlineExerciseForm(name: name, factors: bw) { value, factors in
                        chat.completeForm(id: message.id, name: value, bodyweight: factors)
                    }
                case .history(let exercise, let ids):
                    let displayed = Set(ids)
                    SetHistoryTable(sets: training.history(exercise).filter { displayed.contains($0.id) }, training: training)
                case .progress(let exercise, let title):
                    let range = ChartRange.allCases.first { $0.title == title } ?? .oneMonth
                    Text(training.exercises.first { $0.id == exercise }?.name ?? "Progress").font(.headline)
                    ExerciseChartCard(range: .constant(range), points: training.points(exercise, range: range), showsRanges: false)
                case .choices(let options):
                    ForEach(options, id: \.self) { option in
                        Button(option) { chat.send(option) }.buttonStyle(.bordered).disabled(chat.activity != nil)
                    }
                case .retry(let turn):
                    if chat.messages.last?.id == message.id {
                        Button("Retry") { chat.retry(turn) }.disabled(chat.activity != nil)
                    }
                case .exercise, nil: EmptyView()
                }
            }.frame(maxWidth: .infinity, alignment: .leading)
                .sheet(item: $editing) { set in
                    LiftEditorSheet(lift: set, factorsBodyweight: set.bodyweightSnapshot != nil, displayUnit: training.unit, formula: training.formula, onSave: training.update)
                }
        }
    }
}

private struct InlineExerciseForm: View {
    @State var name: String
    @State var factors: Bool
    var complete: (String?, Bool) -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Add exercise").font(.headline)
            TextField("Exercise name", text: $name).textFieldStyle(.roundedBorder)
            Toggle("Factors in bodyweight", isOn: $factors)
            HStack {
                Button("Cancel") { complete(nil, false) }
                Spacer()
                Button("Save") { complete(name, factors) }.buttonStyle(.borderedProminent)
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }.padding().background(AppPalette.surface, in: RoundedRectangle(cornerRadius: 16))
    }
}
