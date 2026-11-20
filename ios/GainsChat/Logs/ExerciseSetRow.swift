import SwiftUI
import GainsCore

struct SetHistoryTable: View {
    let sets: [LiftRecord]
    @ObservedObject var training: TrainingStore
    var edit: ((LiftRecord) -> Void)?
    var remove: ((LiftRecord) -> Void)?
    @Environment(\.dynamicTypeSize) private var size
    private let labels = ["Date", "Weight", "Reps", "Est. 1RM"]

    var body: some View {
        let months = Dictionary(grouping: sets) {
            Calendar.current.dateInterval(of: .month, for: $0.performedAt)?.start ?? $0.performedAt
        }
        VStack(alignment: .leading, spacing: 18) {
            if sets.isEmpty { Text("No top sets yet").foregroundStyle(.secondary) }
            ForEach(months.keys.sorted(by: >), id: \.self) { month in
                let rows = months[month] ?? []
                Text(month.formatted(.dateTime.month(.wide).year())).font(.headline)
                VStack(spacing: 0) {
                    if !size.isAccessibilitySize { columns(labels).font(.caption.bold()).foregroundStyle(.secondary) }
                    ForEach(rows) { set in
                        Divider()
                        let date = set.performedAt
                        let sameDay = rows.filter { Calendar.current.isDate($0.performedAt, inSameDayAs: date) }.count > 1
                        let dateLabel = date.formatted(.dateTime.day().month(.abbreviated)) + (sameDay ? " " + date.formatted(date: .omitted, time: .shortened) : "")
                        let estimate = set.estimate(unit: training.unit, formula: training.formula)
                        let values = [dateLabel, set.weightText(in: training.unit), set.reps.formatted(),
                                      estimate.map { $0.formatted(.number.precision(.fractionLength(0...1))) + " " + training.unit.label } ?? "—"]
                        Group {
                            if let edit {
                                Button { edit(set) } label: { row(values) }
                                if let remove {
                                    Button("Delete set", role: .destructive) { remove(set) }.font(.caption)
                                }
                            } else { row(values) }
                        }
                    }
                }.padding(.horizontal, 12).background(AppPalette.surface, in: RoundedRectangle(cornerRadius: 16))
            }
        }
    }

    private func row(_ values: [String]) -> some View {
        Group {
            if size.isAccessibilitySize {
                VStack { ForEach(labels.indices, id: \.self) { i in LabeledContent(labels[i], value: values[i]) } }.padding(.vertical, 8)
            } else { columns(values) }
        }.contentShape(Rectangle()).accessibilityElement(children: .ignore)
            .accessibilityLabel(zip(labels, values).map { "\($0.0) \($0.1)" }.joined(separator: ", "))
    }

    private func columns(_ values: [String]) -> some View {
        HStack(spacing: 4) {
            ForEach(values.indices, id: \.self) { i in
                Text(values[i]).monospacedDigit().frame(maxWidth: .infinity, alignment: i == 0 ? .leading : .trailing)
            }
        }.padding(.vertical, 10).frame(maxWidth: .infinity)
    }
}
