import SwiftUI
import GainsCore

enum ExerciseOrder: String, CaseIterable, Identifiable {
    case recent
    case name
    case movement

    var id: String { rawValue }

    var title: String {
        switch self {
        case .recent: "Recent"
        case .name: "Name"
        case .movement: "Biggest move"
        }
    }
}

struct LogsView: View {
    @ObservedObject var training: TrainingStore
    var openChat: () -> Void
    var ask: (String) -> Bool
    var openSidebar: () -> Void
    @State private var query = ""
    @State private var order = ExerciseOrder.recent

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        BodyweightLogView(training: training)
                    } label: {
                        LabeledContent("Bodyweight", value: bodyweightText)
                    }
                }
                if training.exercises.isEmpty {
                    EmptyStateView(title: "Your exercise log", systemImage: "chart.xyaxis.line", message: "Log your first top set in Chat.")
                    Button("Open Chat", action: openChat)
                } else if query.isEmpty {
                    if order == .recent, !training.suggested.isEmpty {
                        Section("Suggested") { rows(training.suggested) }
                    }
                    Section(order == .recent ? "All Exercises" : order.title) { rows(ordered(training.exercises)) }
                } else {
                    let matches = training.exercises.filter { exercise in
                        ([exercise.name] + exercise.aliases).contains { $0.localizedCaseInsensitiveContains(query) }
                    }
                    if matches.isEmpty {
                        Text("No exercises matching “\(query)”")
                        Button("Clear search") { query = "" }
                    } else { rows(ordered(matches)) }
                }
            }
            .scrollContentBackground(.hidden)
            .background(AppPalette.canvas)
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search exercises")
            .navigationTitle("Log")
            .toolbar { SidebarButton(action: openSidebar) }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Menu("Sort exercises", systemImage: "arrow.up.arrow.down") {
                        Picker("Sort exercises", selection: $order) {
                            ForEach(ExerciseOrder.allCases) { item in
                                Text(item.title).tag(item)
                            }
                        }
                    }
                    .labelStyle(.iconOnly)
                }
            }
            .navigationDestination(for: ExerciseRoute.self) { route in
                ExerciseLogView(exerciseID: route.id, training: training, ask: ask)
                    .toolbar { SidebarButton(action: openSidebar) }
            }
        }
    }

    private var bodyweightText: String {
        guard let reading = training.bodyweight else { return "Not set" }
        let value = OneRepMax.convert(reading.weight, from: reading.unit, to: training.unit)
        return value.formatted(.number.precision(.fractionLength(0...1))) + " " + training.unit.label
    }

    private func ordered(_ exercises: [KnownExercise]) -> [KnownExercise] {
        switch order {
        case .name:
            return exercises.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        case .recent:
            return exercises.sorted { latestDate($0) > latestDate($1) }
        case .movement:
            return exercises.sorted { abs(training.movement(for: $0.id) ?? 0) > abs(training.movement(for: $1.id) ?? 0) }
        }
    }

    private func latestDate(_ exercise: KnownExercise) -> Date {
        training.history(exercise.id).first?.performedAt ?? .distantPast
    }

    private func rows(_ exercises: [KnownExercise]) -> some View {
        ForEach(exercises) { exercise in
            NavigationLink(value: ExerciseRoute(id: exercise.id)) {
                LogsExerciseRow(
                    exercise: exercise,
                    setCount: training.history(exercise.id).count,
                    latest: training.history(exercise.id).first,
                    delta: training.movement(for: exercise.id),
                    unit: training.unit
                )
            }
        }
    }
}
