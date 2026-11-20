import SwiftUI
import GainsCore

struct SetHistoryTable: View {
    let sets: [LiftRecord]
    @ObservedObject var training: TrainingStore
    var edit: ((LiftRecord) -> Void)?
    var remove: ((LiftRecord) -> Void)?
    @Environment(\.dynamicTypeSize) private var size

    var body: some View {
        let months = Dictionary(grouping: sets) {
            Calendar.current.dateInterval(of: .month, for: $0.performedAt)?.start ?? $0.performedAt
        }
        VStack(alignment: .leading, spacing: 18) {
            if sets.isEmpty {
                Text("No top sets yet")
                    .foregroundStyle(.secondary)
            }
            ForEach(months.keys.sorted(by: >), id: \.self) { month in
                let rows = months[month] ?? []
                Text(month.formatted(.dateTime.month(.wide).year()))
                    .font(.headline)
                VStack(spacing: 0) {
                    ForEach(rows) { set in
                        if set.id != rows.first?.id { Divider() }
                        row(set, among: rows)
                    }
                }
                .padding(.horizontal, 12)
                .background(AppPalette.surface, in: RoundedRectangle(cornerRadius: 16))
            }
        }
    }

    @ViewBuilder
    private func row(_ set: LiftRecord, among rows: [LiftRecord]) -> some View {
        let date = set.performedAt
        let sameDay = rows.filter { Calendar.current.isDate($0.performedAt, inSameDayAs: date) }.count > 1
        let dateLabel = date.formatted(.dateTime.day().month(.abbreviated))
            + (sameDay ? " " + date.formatted(date: .omitted, time: .shortened) : "")
        let estimate = set.estimate(unit: training.unit, formula: training.formula)
        let estimateLabel = estimate.map {
            $0.formatted(.number.precision(.fractionLength(0...1))) + " " + training.unit.label
        } ?? "—"
        let load = "\(set.weightText(in: training.unit)) × \(set.reps.formatted())"
        VStack(alignment: .leading, spacing: 4) {
            if let edit {
                Button { edit(set) } label: { ledger(dateLabel, load: load, estimate: estimateLabel) }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(dateLabel), \(load), estimated 1RM \(estimateLabel)")
            } else {
                ledger(dateLabel, load: load, estimate: estimateLabel)
                    .accessibilityElement(children: .combine)
            }
            if let remove {
                Button("Delete set", role: .destructive) { remove(set) }
                    .font(.subheadline)
            }
        }
    }

    @ViewBuilder
    private func ledger(_ date: String, load: String, estimate: String) -> some View {
        if size.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 4) {
                LabeledContent("Date", value: date)
                LabeledContent("Load", value: load)
                LabeledContent("Est. 1RM", value: estimate)
            }
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, minHeight: AppMetrics.minimumTap, alignment: .leading)
        } else {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(date)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(load)
                        .font(.body)
                }
                Spacer(minLength: 8)
                Text(estimate)
                    .font(.body)
                    .monospacedDigit()
            }
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, minHeight: AppMetrics.minimumTap, alignment: .leading)
            .contentShape(Rectangle())
        }
    }
}
