import SwiftUI
import GainsCore

struct HistoryView: View {
    @ObservedObject var training: TrainingStore
    @State private var editing: LiftRecord?

    var body: some View {
        NavigationStack {
            Group {
                if training.lifts.isEmpty {
                    EmptyStateView(
                        title: "No history yet",
                        systemImage: "clock",
                        message: "Sets you log in Chat show up here."
                    )
                } else {
                    List {
                        ForEach(sections) { section in
                            Section(section.title) {
                                ForEach(section.lifts) { lift in
                                    Button {
                                        editing = lift
                                    } label: {
                                        LiftRow(lift: lift)
                                    }
                                    .buttonStyle(.plain)
                                }
                                .onDelete { offsets in
                                    delete(section.lifts, at: offsets)
                                }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("History")
            .sheet(item: $editing) { lift in
                LiftEditorSheet(lift: lift, onSave: training.update)
            }
        }
    }

    private var sections: [HistorySection] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: training.lifts) { lift in
            calendar.startOfDay(for: lift.performedAt)
        }
        return grouped.keys.sorted(by: >).map { day in
            HistorySection(
                id: day,
                title: day.formatted(date: .abbreviated, time: .omitted),
                lifts: (grouped[day] ?? []).sorted { $0.performedAt > $1.performedAt }
            )
        }
    }

    private func delete(_ lifts: [LiftRecord], at offsets: IndexSet) {
        for index in offsets {
            try? training.delete(lifts[index])
        }
    }
}
