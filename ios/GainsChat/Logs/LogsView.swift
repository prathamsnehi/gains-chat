import SwiftUI
import GainsCore

struct LogsView: View {
    @ObservedObject var training: TrainingStore
    var openChat: () -> Void
    var openSidebar: () -> Void
    @State private var query = ""

    var body: some View {
        NavigationStack {
            List {
                if training.exercises.isEmpty {
                    EmptyStateView(title: "Your exercise log", systemImage: "chart.xyaxis.line", message: "Log your first top set in Chat.")
                    Button("Open Chat", action: openChat)
                } else if query.isEmpty {
                    if !training.suggested.isEmpty {
                        Section("Suggested") { rows(training.suggested) }
                    }
                    Section("All Exercises") { rows(training.exercises) }
                } else {
                    let matches = training.exercises.filter { exercise in
                        ([exercise.name] + exercise.aliases).contains { $0.localizedCaseInsensitiveContains(query) }
                    }
                    if matches.isEmpty {
                        Text("No exercises matching “\(query)”")
                        Button("Clear search") { query = "" }
                    } else { rows(matches) }
                }
            }
            .scrollContentBackground(.hidden)
            .background(AppPalette.canvas)
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search exercises")
            .navigationTitle("Log")
            .toolbar { SidebarButton(action: openSidebar) }
            .navigationDestination(for: ExerciseRoute.self) { route in
                ExerciseLogView(exerciseID: route.id, training: training)
                    .toolbar { SidebarButton(action: openSidebar) }
            }
        }
    }

    private func rows(_ exercises: [KnownExercise]) -> some View {
        ForEach(exercises) { exercise in
            NavigationLink(value: ExerciseRoute(id: exercise.id)) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(exercise.name).font(.headline)
                    if let set = training.history(exercise.id).first {
                        Text("\(set.weightText(in: training.unit)) × \(set.reps.formatted()) · \(set.performedAt.formatted(.dateTime.month(.abbreviated).day()))")
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                }.padding(.vertical, 4)
            }
        }
    }
}
