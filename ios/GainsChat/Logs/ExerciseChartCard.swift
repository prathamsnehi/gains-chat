import SwiftUI
import GainsCore

struct ExerciseChartCard: View {
    @Binding var range: ChartRange
    var points: [ChartPoint]
    var showsRanges = true
    @State private var selection: String?

    var body: some View {
        let summary = SeriesSummary.make(values: points.map {
            SeriesValue(date: $0.performedAt, value: $0.estimatedOneRepMax)
        })
        VStack(alignment: .leading, spacing: AppMetrics.stack) {
            if let latest = points.last, let summary {
                SeriesReadout(
                    label: "Estimated 1RM",
                    valueText: formatted(summary.latest, unit: latest.unit.label),
                    sentence: summary.count == 1
                        ? "One top set in this range."
                        : summary.changeSentence(unitLabel: latest.unit.label, comparedWith: "the first set in this range"),
                    summary: summary,
                    unitLabel: latest.unit.label
                )
                ProgressChart(points: points, selection: $selection)
                if let point = points.first(where: { $0.id == selection }) {
                    Text(callout(point))
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(AppPalette.surface, in: Capsule())
                }
            } else {
                Text("Estimated 1RM")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("No top sets in this period")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 140)
            }
            if showsRanges { ChartRangePicker(selection: $range) }
        }
        .onChange(of: range) { _ in selection = nil }
        .onChange(of: points.map(\.id)) { ids in
            if let selection, !ids.contains(selection) { self.selection = nil }
        }
    }

    private func callout(_ point: ChartPoint) -> String {
        let when = point.performedAt.formatted(.dateTime.month(.abbreviated).day())
        return "\(when) · \(formatted(point.estimatedOneRepMax, unit: point.unit.label))"
    }

    private func formatted(_ value: Double, unit: String) -> String {
        value.formatted(.number.precision(.fractionLength(0...1))) + " " + unit
    }
}

struct SeriesReadout: View {
    var label: String
    var valueText: String
    var sentence: String?
    var summary: SeriesSummary
    var unitLabel: String

    var body: some View {
        VStack(alignment: .leading, spacing: AppMetrics.tight) {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text(valueText)
                .font(.largeTitle)
                .bold()
                .monospacedDigit()
            if let sentence {
                Text(sentence)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if summary.count > 1 {
                HStack(alignment: .firstTextBaseline, spacing: 24) {
                    metric("Average", summary.average, signed: false)
                    metric("Difference", summary.difference, signed: true)
                }
                .accessibilityElement(children: .combine)
                Text(span)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var span: String {
        let start = summary.earliest.formatted(.dateTime.month(.abbreviated).day())
        let end = summary.latestDate.formatted(.dateTime.month(.abbreviated).day())
        return "\(start) – \(end)"
    }

    private func metric(_ title: String, _ value: Double, signed: Bool) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text(figure(value, signed: signed))
                .font(.headline)
                .monospacedDigit()
        }
        .frame(minHeight: AppMetrics.minimumTap, alignment: .leading)
    }

    private func figure(_ value: Double, signed: Bool) -> String {
        let number = abs(value).formatted(.number.precision(.fractionLength(0...1)))
        guard signed else { return "\(number) \(unitLabel)" }
        if value > 0.05 { return "+\(number) \(unitLabel)" }
        if value < -0.05 { return "−\(number) \(unitLabel)" }
        return "0 \(unitLabel)"
    }
}
